/**
 * Chungju Eurasian Otter Monitoring Platform Application Logic
 */

// Global State
let map = null;
let currentBaseMap = 'esri';
let baseMapLayers = {};
let layerGroups = {
  cameras: null,
  traces: null,
  lhos: null,
  core: null
};

let dataStore = {
  cameras: [],
  traces: [],
  lhos: null,
  stats: null,
  coreAreas: []
};

let activeFilters = {
  type: 'ALL',
  ws: 'ALL'
};

let currentModalCamera = null;
let currentModalVideoIndex = 0;
let chartsInitialized = false;

// Initialization on DOM Ready
document.addEventListener('DOMContentLoaded', async () => {
  initMap();
  await loadAllData();
  renderQuickCameraButtons();
  renderVideoGallery();
  renderCoreAreas();
  populateLayers();
});

// ==================== 1. MAP INITIALIZATION ====================
function initMap() {
  // Center around Chungju City center
  map = L.map('map', {
    center: [37.000, 127.890],
    zoom: 11.5,
    minZoom: 9,
    maxZoom: 18,
    zoomControl: false
  });

  // Custom Zoom Control at Top-Right
  L.control.zoom({ position: 'topright' }).addTo(map);

  // Basemap Tile Providers
  baseMapLayers = {
    esri: L.layerGroup([
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 18
      }),
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CartoDB',
        maxZoom: 18
      })
    ]),
    carto_pos: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CartoDB',
      maxZoom: 18
    }),
    carto_dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CartoDB',
      maxZoom: 18
    }),
    osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18
    })
  };

  // Add default satellite basemap
  baseMapLayers.esri.addTo(map);

  // Initialize Layer Groups
  layerGroups.cameras = L.layerGroup().addTo(map);
  layerGroups.traces = L.layerGroup().addTo(map);
  layerGroups.lhos = L.layerGroup().addTo(map);
  layerGroups.core = L.layerGroup().addTo(map);
}

function setBaseMap(type) {
  if (currentBaseMap === type) return;
  map.removeLayer(baseMapLayers[currentBaseMap]);
  baseMapLayers[type].addTo(map);
  currentBaseMap = type;

  // Update button UI
  ['esri', 'carto_pos', 'carto_dark', 'osm'].forEach(t => {
    const btn = document.getElementById(`bm-${t}`);
    if (btn) {
      if (t === type) {
        btn.className = "p-1.5 border rounded-lg text-center font-medium bg-sky-50 text-sky-700 border-sky-300";
      } else {
        btn.className = "p-1.5 border rounded-lg text-center font-medium bg-white text-slate-700 border-slate-200 hover:bg-slate-50";
      }
    }
  });
}

function resetMapView() {
  map.setView([37.000, 127.890], 11.5);
}

// ==================== 2. DATA LOADING ====================
async function loadAllData() {
  try {
    const [camsRes, tracesRes, lhosRes, statsRes, coreRes] = await Promise.all([
      fetch('/data/camera_sites.json'),
      fetch('/data/traces.json'),
      fetch('/data/lhos_polygons.geojson'),
      fetch('/data/statistics.json'),
      fetch('/data/core_areas.json')
    ]);

    dataStore.cameras = await camsRes.json();
    dataStore.traces = await tracesRes.json();
    dataStore.lhos = await lhosRes.json();
    dataStore.stats = await statsRes.json();
    dataStore.coreAreas = await coreRes.json();

    console.log('All data loaded successfully:', {
      cameras: dataStore.cameras.length,
      traces: dataStore.traces.length,
      lhos: dataStore.lhos.features.length,
      core: dataStore.coreAreas.length
    });
  } catch (err) {
    console.error('Error loading data:', err);
  }
}

// ==================== 3. POPULATE MAP LAYERS ====================
function populateLayers() {
  renderCameraMarkers();
  renderTracesLayer();
  renderLhosLayer();
  renderCoreAreasLayer();
}

// --- 3.1 Camera Markers ---
function renderCameraMarkers() {
  layerGroups.cameras.clearLayers();

  dataStore.cameras.forEach(site => {
    const hasVideo = site.has_video && site.videos.length > 0;
    
    // Custom Pulsing HTML Icon
    const iconHtml = `
      <div class="camera-pulse-marker" title="${site.name}">
        <div class="pulse-ring ${hasVideo ? 'has-video' : ''}"></div>
        <div class="pulse-dot ${hasVideo ? 'has-video' : ''}">
          ${hasVideo ? '🎥' : '📷'}
        </div>
      </div>
    `;

    const customIcon = L.divIcon({
      html: iconHtml,
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -22]
    });

    const marker = L.marker([site.lat, site.lon], { icon: customIcon });

    // Build Popup Content
    const popupContent = `
      <div class="w-72 bg-slate-900 text-white p-4 text-xs">
        <div class="flex items-center justify-between pb-2 border-b border-slate-700">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${hasVideo ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' : 'bg-slate-700 text-slate-300'}">
            ${hasVideo ? '🎬 무인카메라 영상 보유 (' + site.videos.length + '편)' : '📷 모니터링 고정거점'}
          </span>
          <span class="text-slate-400 text-[10px]">${site.watershed}</span>
        </div>
        
        <h4 class="font-bold text-sm text-white mt-2 mb-1">${site.name}</h4>
        <p class="text-[11px] text-slate-400 mb-2">${site.location}</p>
        <p class="text-[11px] text-slate-300 line-clamp-3 mb-3">${site.description}</p>
        
        ${hasVideo ? `
          <button onclick="openVideoModal('${site.id}', 0)" class="w-full py-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition text-xs">
            <span>▶</span> <span>무인센서카메라 영상 재생</span>
          </button>
        ` : `
          <div class="text-[11px] text-slate-400 italic bg-slate-800 p-2 rounded-lg text-center">
            장기 스마트 모니터링 설치 권고 거점 (보고서)
          </div>
        `}
      </div>
    `;

    marker.bindPopup(popupContent, { maxWidth: 320 });
    marker.addTo(layerGroups.cameras);
  });
}

// --- 3.2 Otter Traces Layer ---
function renderTracesLayer() {
  layerGroups.traces.clearLayers();

  let count = 0;
  dataStore.traces.forEach(t => {
    // Apply filters
    if (activeFilters.type !== 'ALL' && t.type !== activeFilters.type) return;
    if (activeFilters.ws !== 'ALL' && t.ws !== activeFilters.ws) return;

    count++;

    // Color code by trace type
    let color = '#3B82F6'; // 배설물 기본 (파랑)
    let radius = 4;
    if (t.type === '발자국') {
      color = '#F59E0B'; // 주황
      radius = 5;
    } else if (t.type === '목견') {
      color = '#10B981'; // 초록
      radius = 7;
    } else if (t.type === '섭식흔적') {
      color = '#EC4899'; // 분홍
      radius = 6;
    } else if (t.type === '기타흔적') {
      color = '#94A3B8'; // 회색
      radius = 4;
    }

    const circle = L.circleMarker([t.lat, t.lon], {
      radius: radius,
      fillColor: color,
      color: '#ffffff',
      weight: 1,
      opacity: 0.9,
      fillOpacity: 0.85
    });

    const popupHtml = `
      <div class="p-3 text-xs text-slate-800 max-w-xs">
        <div class="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-slate-200">
          <span class="font-bold text-sky-700">${t.id}</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold" style="background:${color}20; color:${color}">
            ${t.type}
          </span>
        </div>
        <div class="space-y-1 text-[11px] text-slate-600">
          <div><b class="text-slate-700">유역권:</b> ${t.ws}</div>
          <div><b class="text-slate-700">조사일자:</b> ${t.date || '2026년 봄 조사'}</div>
          <div><b class="text-slate-700">하천폭 / 수심:</b> ${t.w ? t.w + 'm' : '미측정'} / ${t.d ? t.d + '급' : '미기재'}</div>
          <div><b class="text-slate-700">수계와의 거리:</b> ${t.dw ? t.dw + 'm' : '수변'}</div>
          ${t.memo ? `<div><b class="text-slate-700">특이사항:</b> <span class="text-rose-600 font-medium">${t.memo}</span></div>` : ''}
        </div>
      </div>
    `;

    circle.bindPopup(popupHtml);
    circle.addTo(layerGroups.traces);
  });

  // Update count label in filter panel
  const countLabel = document.getElementById('filter-count-label');
  if (countLabel) {
    countLabel.innerText = `현재 ${count.toLocaleString()}개 지점 표시 중`;
  }
}

// --- 3.3 LHOS Polygons Layer ---
function renderLhosLayer() {
  layerGroups.lhos.clearLayers();
  if (!dataStore.lhos) return;

  const getLhosColor = (cls) => {
    if (cls.includes('가능')) return '#10B981'; // 서식가능 (초록)
    if (cls.includes('잠재')) return '#84CC16'; // 서식잠재 (연두)
    if (cls.includes('필요')) return '#F59E0B'; // 서식필요 (주황)
    return '#EF4444'; // 서식불가 (빨강)
  };

  const lhosGeoJson = L.geoJSON(dataStore.lhos, {
    style: (feature) => {
      const cls = feature.properties.lhos_class || '';
      return {
        fillColor: getLhosColor(cls),
        weight: 1,
        opacity: 0.7,
        color: '#ffffff',
        fillOpacity: 0.55
      };
    },
    onEachFeature: (feature, layer) => {
      const p = feature.properties;
      const color = getLhosColor(p.lhos_class);

      const tooltipContent = `
        <div class="text-xs">
          <div class="font-bold mb-0.5" style="color: ${color}">${p.lhos_class}</div>
          <div><b>LHOS 적합도 점수:</b> ${p.lhos} / 5.0</div>
          <div><b>비오톱/현존식생:</b> ${p.biotope || '-'} (${p.veg || '-'})</div>
          <div><b>면적:</b> ${p.area ? p.area.toLocaleString() + ' ㎡' : '-'}</div>
        </div>
      `;

      layer.bindTooltip(tooltipContent, { sticky: true, className: 'glass-panel p-2 text-xs rounded-xl shadow-md' });

      layer.on({
        mouseover: (e) => {
          const l = e.target;
          l.setStyle({ weight: 2.5, fillOpacity: 0.85 });
        },
        mouseout: (e) => {
          lhosGeoJson.resetStyle(e.target);
        }
      });
    }
  });

  lhosGeoJson.addTo(layerGroups.lhos);
}

// --- 3.4 Core Areas Layer ---
function renderCoreAreasLayer() {
  layerGroups.core.clearLayers();

  dataStore.coreAreas.forEach(area => {
    const iconHtml = `
      <div class="core-area-marker" title="${area.name}">
        <span>🛡️</span>
        <span>${area.name.replace(/^\d+\.\s*/, '')}</span>
      </div>
    `;

    const icon = L.divIcon({
      html: iconHtml,
      className: '',
      iconAnchor: [30, 15]
    });

    const marker = L.marker([area.lat, area.lon], { icon: icon });

    const popupHtml = `
      <div class="w-72 bg-slate-900 text-white p-4 text-xs">
        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
          보호관리 핵심지역
        </span>
        <h4 class="font-bold text-sm text-white mt-1.5 mb-1">${area.name}</h4>
        <div class="text-[11px] text-sky-400 mb-2 font-medium">${area.category}</div>
        
        <div class="space-y-1.5 text-[11px] text-slate-300 mb-3">
          ${area.features.map(f => `<div>• ${f}</div>`).join('')}
        </div>
        
        <button onclick="switchTab('report'); scrollToCoreArea('${area.id}')" class="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 font-semibold rounded-lg text-xs transition">
          상세 관리 가이드라인 보기 →
        </button>
      </div>
    `;

    marker.bindPopup(popupHtml, { maxWidth: 300 });
    marker.addTo(layerGroups.core);
  });
}

// ==================== 4. LAYER & FILTER CONTROLS ====================
function toggleLayer(layerName) {
  const checkbox = document.getElementById(`layer-${layerName}`);
  if (!checkbox) return;

  if (checkbox.checked) {
    map.addLayer(layerGroups[layerName]);
  } else {
    map.removeLayer(layerGroups[layerName]);
  }
}

function applyFilters() {
  activeFilters.type = document.getElementById('filter-type').value;
  activeFilters.ws = document.getElementById('filter-ws').value;
  renderTracesLayer();
}

// Quick Camera Buttons at Bottom
function renderQuickCameraButtons() {
  const container = document.getElementById('quick-camera-buttons');
  if (!container) return;

  container.innerHTML = '';
  dataStore.cameras.filter(c => c.has_video).forEach(site => {
    const btn = document.createElement('button');
    btn.className = "px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-pink-600 text-white text-xs font-semibold whitespace-nowrap transition flex items-center gap-1 shadow-sm";
    btn.innerHTML = `<span>🎥</span> <span>${site.name.split(' ').slice(-1)[0]}</span>`;
    btn.onclick = () => {
      map.flyTo([site.lat, site.lon], 14, { duration: 1.2 });
      openVideoModal(site.id, 0);
    };
    container.appendChild(btn);
  });
}

// ==================== 5. VIDEO PLAYER MODAL ====================
function openVideoModal(siteId, videoIndex = 0) {
  const site = dataStore.cameras.find(c => c.id === siteId);
  if (!site || !site.videos || site.videos.length === 0) return;

  currentModalCamera = site;
  currentModalVideoIndex = videoIndex;

  const currentVideo = site.videos[videoIndex];
  const modal = document.getElementById('video-modal');
  const player = document.getElementById('modal-video-player');
  const source = document.getElementById('modal-video-source');
  const title = document.getElementById('modal-video-title');
  const location = document.getElementById('modal-video-location');
  const tag = document.getElementById('modal-meta-tag');
  const count = document.getElementById('modal-meta-count');
  const behavior = document.getElementById('modal-meta-behavior');
  const desc = document.getElementById('modal-meta-desc');
  const playlistTabs = document.getElementById('modal-playlist-tabs');

  title.innerText = `${site.name} - ${currentVideo.title}`;
  location.innerText = `위치: ${site.location} (${site.watershed} 수계) | 모드: ${currentVideo.duration}`;
  tag.innerText = currentVideo.duration;
  count.innerText = `관찰 개체수: ${currentVideo.otter_count}`;
  behavior.innerText = currentVideo.behavior;
  desc.innerText = `${site.description} (${site.ecology_note})`;

  // Playlist tabs if multiple videos
  if (site.videos.length > 1) {
    playlistTabs.classList.remove('hidden');
    playlistTabs.innerHTML = site.videos.map((v, idx) => `
      <button onclick="changeModalVideo(${idx})" class="px-3 py-1 rounded-lg text-xs font-semibold transition ${idx === videoIndex ? 'bg-pink-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}">
        ${v.title.split('(')[1]?.replace(')', '') || `영상 ${idx+1}`}
      </button>
    `).join('');
  } else {
    playlistTabs.classList.add('hidden');
  }

  // Load and play video
  source.src = currentVideo.url;
  player.load();
  player.play().catch(e => console.log('Autoplay deferred:', e));

  // Show modal
  modal.classList.remove('hidden');
  setTimeout(() => modal.classList.remove('opacity-0'), 10);
}

function changeModalVideo(index) {
  if (!currentModalCamera) return;
  openVideoModal(currentModalCamera.id, index);
}

function closeVideoModal() {
  const modal = document.getElementById('video-modal');
  const player = document.getElementById('modal-video-player');
  player.pause();
  modal.classList.add('opacity-0');
  setTimeout(() => modal.classList.add('hidden'), 300);
}

function zoomToCurrentCamera() {
  if (!currentModalCamera) return;
  closeVideoModal();
  switchTab('map');
  map.flyTo([currentModalCamera.lat, currentModalCamera.lon], 15, { duration: 1.2 });
}

// ==================== 6. VIDEO GALLERY TAB ====================
function renderVideoGallery() {
  const container = document.getElementById('video-cards-grid');
  if (!container) return;

  container.innerHTML = '';

  dataStore.cameras.filter(c => c.has_video).forEach(site => {
    site.videos.forEach((video, vIdx) => {
      const card = document.createElement('div');
      card.className = "bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 flex flex-col hover:shadow-xl transition-all duration-300";

      card.innerHTML = `
        <div class="relative bg-slate-900 aspect-video flex items-center justify-center group cursor-pointer overflow-hidden" onclick="openVideoModal('${site.id}', ${vIdx})">
          <!-- Video preview thumbnail or video element -->
          <video class="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" preload="metadata" muted>
            <source src="${video.url}#t=2.0" type="video/mp4">
          </video>
          
          <!-- Play Overlay Button -->
          <div class="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition">
            <div class="w-14 h-14 rounded-full bg-pink-500 group-hover:bg-pink-600 text-white flex items-center justify-center text-xl shadow-xl transform group-hover:scale-110 transition">
              ▶
            </div>
          </div>

          <!-- Top Badge -->
          <div class="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-900/80 backdrop-blur-sm text-pink-300 border border-slate-700">
            ${video.duration}
          </div>

          <!-- Bottom Watershed Badge -->
          <div class="absolute bottom-3 left-3 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900/80 backdrop-blur-sm text-sky-300">
            ${site.watershed} 수계
          </div>
        </div>

        <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
          <div>
            <h3 class="font-bold text-base text-slate-900 mb-1 leading-snug">${video.title}</h3>
            <p class="text-xs text-slate-500 mb-3">${site.location}</p>
            <p class="text-xs text-slate-600 leading-relaxed">${video.description}</p>
          </div>

          <div class="pt-3 border-t border-slate-100 space-y-2">
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-slate-500 font-semibold">확인 개체:</span>
              <span class="font-bold text-sky-700">${video.otter_count}</span>
            </div>
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-slate-500 font-semibold">행동 특성:</span>
              <span class="font-bold text-emerald-700 text-right truncate ml-2">${video.behavior}</span>
            </div>

            <div class="grid grid-cols-2 gap-2 pt-2">
              <button onclick="openVideoModal('${site.id}', ${vIdx})" class="py-2 px-3 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-xs font-bold shadow transition flex items-center justify-center gap-1">
                <span>▶ 영상 재생</span>
              </button>
              <button onclick="switchTab('map'); map.flyTo([${site.lat}, ${site.lon}], 14, {duration: 1.2})" class="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1">
                <span>📍 위치 보기</span>
              </button>
            </div>
          </div>
        </div>
      `;

      container.appendChild(card);
    });
  });
}

// ==================== 7. REPORT & CORE AREAS TAB ====================
function renderCoreAreas() {
  const container = document.getElementById('core-areas-grid');
  if (!container) return;

  container.innerHTML = '';

  dataStore.coreAreas.forEach(area => {
    const card = document.createElement('div');
    card.id = `core-${area.id}`;
    card.className = "bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4 hover:shadow-md transition";

    card.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div>
          <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
            핵심 관리구역
          </span>
          <h4 class="font-bold text-lg text-slate-900 mt-1.5">${area.name}</h4>
          <p class="text-xs font-medium text-sky-700">${area.category}</p>
        </div>
        <button onclick="switchTab('map'); map.flyTo([${area.lat}, ${area.lon}], 14, {duration: 1.2})" class="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl text-xs font-bold transition flex items-center gap-1 whitespace-nowrap">
          <span>📍</span> <span>지도 이동</span>
        </button>
      </div>

      <div class="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1.5 text-xs text-slate-700">
        <div class="font-bold text-slate-900 mb-1">📌 생태적 기능 및 현황:</div>
        ${area.features.map(f => `<div class="flex items-start gap-1.5"><span class="text-sky-500 font-bold">•</span> <span>${f}</span></div>`).join('')}
      </div>

      <div class="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-100 space-y-1.5 text-xs text-slate-700">
        <div class="font-bold text-emerald-900 mb-1">🌿 보고서 기본 관리 방향 및 대책:</div>
        ${area.management.map(m => `<div class="flex items-start gap-1.5"><span class="text-emerald-600 font-bold">✔</span> <span>${m}</span></div>`).join('')}
      </div>
    `;

    container.appendChild(card);
  });
}

function scrollToCoreArea(areaId) {
  setTimeout(() => {
    const el = document.getElementById(`core-${areaId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-sky-500');
      setTimeout(() => el.classList.remove('ring-2', 'ring-sky-500'), 2000);
    }
  }, 100);
}

// ==================== 8. ANALYTICS & CHARTS ====================
function initCharts() {
  if (chartsInitialized || !dataStore.stats) return;
  chartsInitialized = true;

  const stats = dataStore.stats;

  // Chart 1: Watersheds (Horizontal Bar)
  const ctxWs = document.getElementById('chart-watershed');
  if (ctxWs) {
    new Chart(ctxWs, {
      type: 'bar',
      data: {
        labels: stats.watershed_breakdown.map(w => w.name),
        datasets: [{
          label: '흔적 발견 개소',
          data: stats.watershed_breakdown.map(w => w.count),
          backgroundColor: stats.watershed_breakdown.map(w => w.color + 'CC'),
          borderColor: stats.watershed_breakdown.map(w => w.color),
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.raw}개소 (${stats.watershed_breakdown[ctx.dataIndex].ratio}%)`
            }
          }
        },
        scales: {
          x: { grid: { color: '#f1f5f9' } },
          y: { grid: { display: false } }
        }
      }
    });
  }

  // Chart 2: Trace Types (Doughnut)
  const ctxType = document.getElementById('chart-types');
  if (ctxType) {
    new Chart(ctxType, {
      type: 'doughnut',
      data: {
        labels: stats.trace_type_breakdown.map(t => t.type),
        datasets: [{
          data: stats.trace_type_breakdown.map(t => t.count),
          backgroundColor: stats.trace_type_breakdown.map(t => t.color),
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${ctx.raw}건 (${stats.trace_type_breakdown[ctx.dataIndex].ratio}%)`
            }
          }
        },
        cutout: '65%'
      }
    });
  }

  // Chart 3: LHOS Classes (Bar)
  const ctxLhos = document.getElementById('chart-lhos');
  if (ctxLhos) {
    new Chart(ctxLhos, {
      type: 'bar',
      data: {
        labels: stats.lhos_summary.classes.map(c => c.name.split(' (')[0]),
        datasets: [{
          label: '구간 수',
          data: stats.lhos_summary.classes.map(c => c.polygon_count),
          backgroundColor: stats.lhos_summary.classes.map(c => c.color + 'DD'),
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.raw}개 구간 (${((ctx.raw/1426)*100).toFixed(1)}%)`
            }
          }
        },
        scales: {
          y: { grid: { color: '#f1f5f9' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // Chart 4: River Width Histogram
  const ctxWidth = document.getElementById('chart-width');
  if (ctxWidth) {
    const widthRanges = ['5m 미만', '5~15m', '15~30m', '30~50m', '50~100m', '100m 이상'];
    const widthCounts = [180, 520, 680, 410, 320, 170];

    new Chart(ctxWidth, {
      type: 'line',
      data: {
        labels: widthRanges,
        datasets: [{
          label: '흔적 수',
          data: widthCounts,
          borderColor: '#0284c7',
          backgroundColor: '#0284c720',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#0284c7',
          pointRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: '#f1f5f9' } },
          x: { grid: { display: false } }
        }
      }
    });
  }
}

// ==================== 9. TAB SWITCHING ====================
function switchTab(tabId) {
  // Hide all tabs
  ['map', 'videos', 'analytics', 'report'].forEach(t => {
    const tabEl = document.getElementById(`tab-${t}`);
    const btnEl = document.getElementById(`tab-btn-${t}`);
    if (tabEl) tabEl.classList.add('hidden');
    if (btnEl) {
      btnEl.classList.remove('active', 'text-sky-400');
      btnEl.classList.add('text-slate-300');
    }
  });

  // Show selected tab
  const activeTab = document.getElementById(`tab-${tabId}`);
  const activeBtn = document.getElementById(`tab-btn-${tabId}`);
  if (activeTab) activeTab.classList.remove('hidden');
  if (activeBtn) {
    activeBtn.classList.add('active', 'text-sky-400');
    activeBtn.classList.remove('text-slate-300');
  }

  // If map tab, trigger invalidateSize so Leaflet recalculates dimensions
  if (tabId === 'map' && map) {
    setTimeout(() => map.invalidateSize(), 150);
  }

  // If analytics tab, initialize Chart.js
  if (tabId === 'analytics') {
    setTimeout(() => initCharts(), 150);
  }
}
