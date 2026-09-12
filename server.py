import os
import sys
import re
import functools
import mimetypes
from http.server import HTTPServer, SimpleHTTPRequestHandler

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

class RangeRequestHandler(SimpleHTTPRequestHandler):
    """HTTP Request Handler supporting Range requests (HTTP 206) for video streaming."""

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Range, Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def send_head(self):
        path = self.translate_path(self.path)
        f = None
        if os.path.isdir(path):
            parts = [p for p in self.path.split('/') if p]
            if not self.path.endswith('/'):
                self.send_response(301)
                self.send_header("Location", self.path + "/")
                self.end_headers()
                return None
            for index in "index.html", "index.htm":
                index = os.path.join(path, index)
                if os.path.exists(index):
                    path = index
                    break
            else:
                return self.list_directory(path)
                
        ctype = self.guess_type(path)
        if path.endswith('.geojson'):
            ctype = 'application/geo+json'
        elif path.endswith('.json'):
            ctype = 'application/json'
        elif path.endswith('.mp4') or path.endswith('.MP4'):
            ctype = 'video/mp4'

        try:
            f = open(path, 'rb')
        except OSError:
            self.send_error(404, "File not found")
            return None

        fs = os.fstat(f.fileno())
        size = fs[6]
        
        # Check for Range header
        range_header = self.headers.get('Range')
        if range_header:
            match = re.search(r'bytes=(\d*)-(\d*)', range_header)
            if match:
                start, end = match.groups()
                start = int(start) if start else 0
                end = int(end) if end else size - 1
                if start >= size or end >= size or start > end:
                    self.send_error(416, "Requested Range Not Satisfiable")
                    f.close()
                    return None
                
                self.send_response(206)
                self.send_header("Content-Type", ctype)
                self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
                self.send_header("Content-Length", str(end - start + 1))
                self.send_header("Accept-Ranges", "bytes")
                self.end_headers()
                
                f.seek(start)
                return _RangeFile(f, end - start + 1)

        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(size))
        self.send_header("Accept-Ranges", "bytes")
        self.end_headers()
        return f

class _RangeFile:
    def __init__(self, file, length):
        self.file = file
        self.length = length
        self.remaining = length

    def read(self, size=-1):
        if self.remaining <= 0:
            return b""
        if size < 0 or size > self.remaining:
            size = self.remaining
        data = self.file.read(size)
        self.remaining -= len(data)
        return data

    def close(self):
        self.file.close()

def run(port=8080):
    server_address = ('', port)
    handler = functools.partial(RangeRequestHandler, directory=BASE_DIR)
    httpd = HTTPServer(server_address, handler)
    print(f"Otter GIS & Video Streaming Server running on http://localhost:{port} (serving {BASE_DIR})")
    sys.stdout.flush()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        httpd.server_close()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    run(port)
