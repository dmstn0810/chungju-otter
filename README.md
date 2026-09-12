# 🦦 충주시 멸종위기종 수달(Lutra lutra) 서식현황 & 서식적합도(LHOS) 인터랙티브 모니터링 시스템

> **Chungju Eurasian Otter Habitat Suitability (LHOS) & Sensor-Camera Monitoring Platform**  
> 충주시 수달 서식현황 조사 및 관리방안 연구의 공간분석 데이터와 무인센서카메라 영상을 인터랙티브하게 탐색할 수 있는 통합 웹 GIS 플랫폼입니다.

---

## 📸 주요 스크린샷 및 구성

* **인터랙티브 GIS 지도**: 충주시 전역 위성/일반 지도, 2,280건의 흔적 포인트, 도심 1,426개 식생·적합도 폴리곤 시각화
* **무인센서카메라 영상관 (총 9편)**: 영평교(성체 3개체 동시 출현), 하청교, 논강리, 호암지(붕어 섭식 주간 목견), 달천 본류 등 클릭 시 영상 즉시 스트리밍 재생
* **서식환경 & LHOS 종합 평가**: 27개 지점 어류 먹이자원 분석, 6대 기능적 환경요인(바위 피도 79.7%, 사양토 79.5%), LHOS 산정식 및 면적분포(표 4-24)
* **공간분석 & 통계 대시보드 (Chart.js)**: 10개 유역권별 출현 통계, 서식지 등급별 면적 분석
* **5대 보호관리 핵심지역 가이드라인**: 호암지·대제지, 충주천-교현천 합수부 등 현장 특성 및 건식 이동로(dry ledge) 정책 제언 수록

---

## 🚀 빠른 시작 (Local Execution)

### 1. 저장소 클론
```bash
git clone https://github.com/dmstn0810/chungju-otter.git
cd chungju-otter
```

### 2. 대용량 미디어 파일 다운로드 (Git LFS)
```bash
git lfs pull
```

### 3. 스트리밍 서버 실행
```bash
# Python 3.10+ 환경
python server.py 8765
```

### 4. 웹 브라우저 접속
웹 브라우저에서 아래 주소로 접속합니다:
👉 **`http://localhost:8765`**

---

## 📁 디렉토리 구조

```
├── index.html                               # 반응형 단일 페이지 대시보드
├── app.js                                   # Leaflet GIS, Chart.js, 비디오 모달 제어 로직
├── style.css                                # 현대적 UI 및 펄스 마커 애니메이션 스타일
├── server.py                                # HTTP 206 부분 전송 지원 비디오 스트리밍 웹 서버
├── data/
│   ├── camera_sites.json                    # 무인카메라 8개 지점 및 9개 영상 메타데이터
│   ├── traces.json                          # 수달 흔적 2,280건 정밀 좌표 및 속성 (경량화)
│   ├── traces.geojson                       # 표준 GeoJSON 흔적 레이어
│   ├── lhos_polygons.geojson                # 도심 1,426개 LHOS 서식적합도 폴리곤 레이어
│   ├── statistics.json                      # 10대 유역권 및 환경요인 통계 지표
│   └── core_areas.json                      # 5대 보호관리 핵심지역 가이드라인
├── videos/                                  # 스트리밍용 비디오 링크
│   ├── yeongpyeong_1.mp4                    # 요도천 영평교 2편
│   ├── yeongpyeong_2.mp4                    # 요도천 영평교 3편 (3개체 출현)
│   ├── hacheong_1.mp4                       # 목계수위표 하청교 1편
│   ├── hacheong_2.mp4                       # 목계수위표 하청교 2편
│   ├── nongang_1.mp4                        # 목계수위표 논강리
│   ├── hoamji_night.mp4                     # 달천하류 호암지 야간
│   ├── hoamji_citizen_1.mp4                 # 호암지 붕어 섭식
│   ├── hoamji_citizen_2.mp4                 # 호암지 유영·잠수
│   └── dalcheon_sighting.mp4                # 달천 본류 목견
├── assets/images/                           # 보고서 주요 도면 및 현장 사진 에셋
│   ├── camera_captures_grid.png             # 보고서 그림 3-4 (출현 현황)
│   ├── sightings_grid.png                   # 보고서 그림 3-5 (목견 사진)
│   ├── field_installation_photos.png        # 보고서 그림 3-2 (카메라 설치)
│   ├── report_lhos_score_map.png            # 보고서 그림 4-44 (LHOS 도면)
│   ├── report_lhos_type_map.png             # 보고서 그림 4-45 (서식적합유형)
│   └── report_core_habitat_map.png          # 보고서 그림 5-2 (핵심지역 도면)
├── 수달 조사 데이터 (7)/                     # 현장 조사 및 식생 Shapefile 원본
└── 최종_충주시 수달 최종보고서_합본_260822.pdf # 원본 연구보고서 PDF (149MB)
```

---

## 🌿 주요 연구 및 데이터 결과

| 유역권 | 흔적 발견 지점 (개소) | 구성 비율 (%) | 주요 특성 |
|:---|:---:|:---:|:---|
| **목계수위표** | 650 | 27.1% | 영덕천·원곡천 합류, 남한강 본류 최다 출현 구역 |
| **운계천합류전** | 436 | 18.2% | 자연형 수변생태계 발달 |
| **요도천** | 409 | 17.0% | 하류 보 및 바위 지대, 3개체 동시 출현 확인 |
| **달천하류** | 313 | 13.0% | 호암지 붕어 섭식 등 도심 핵심 서식지 |
| **석문동천** | 176 | 7.3% | 계곡형 지류 서식지 |
| **기타 5개 수계** | 418 | 17.4% | 충주댐, 조정지댐, 섬강합류전 등 |
| **합계** | **2,402** | **100.0%** | 충주시 전역 광범위한 서식 확인 |
