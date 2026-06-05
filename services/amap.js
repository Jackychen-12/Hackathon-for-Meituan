// ============================================================
// services/amap.js · 高德地图 数据源
// ------------------------------------------------------------
// 真实接入：
//   - Web Service API: https://restapi.amap.com/v3/... (申请 Key)
//   - JS API for map render: https://webapi.amap.com/maps?v=2.0&key=YOUR_KEY
//   - 路径规划 / 距离矩阵 / POI 搜索 / 静态地图均有
//
// 当前实现：从 data.js 的 MAPS 配置返回 mock 数据。
// 切换到真实 API 的步骤：
//   1. 注册高德开放平台，获取 Web Service Key + JS API Key（推荐两个不同的）
//   2. 把每个 async 方法体替换为真实 fetch
//   3. renderInteractiveMap 切换为 new AMap.Map(...) （需要在 index.html 引入 JS SDK）
//   4. chapter.coords 字段从 {x, y} 改为 {lng, lat}（adapter 层会处理向后兼容）
// ============================================================

const AMapAPI = {

  /**
   * 地址 → 经纬度
   * Real: GET /v3/geocode/geo?address=&city=
   * @returns {Promise<{lng, lat, formatted_address, level} | null>}
   */
  async geocode(address, city = '上海') {
    await _delay(20);
    // TODO[real-api]: replace
    return _mockGeocode(address, city);
  },

  /**
   * 周边 POI 搜索
   * Real: GET /v3/place/around?location=lng,lat&radius=&types=
   */
  async nearbyPOIs({ lng, lat, radius = 1000, types, limit = 20 } = {}) {
    await _delay(30);
    // TODO[real-api]: replace
    return _mockNearby({ lng, lat, radius, types, limit });
  },

  /**
   * 步行 / 驾车 / 公交路径规划
   * Real: GET /v3/direction/{walking|driving|transit/integrated}?origin=&destination=&waypoints=
   * @param {Array<{lng, lat}>} points  必须 >=2
   * @param {'walking'|'driving'|'transit'} mode
   * @returns {Promise<{
   *   total_distance_m: number,
   *   total_duration_s: number,
   *   polyline: Array<{lng, lat}>,   // 用于在地图上画线
   *   legs:     Array<{from, to, distance_m, duration_s, steps: string[]}>
   * }>}
   */
  async planRoute(points, mode = 'walking') {
    if (!points || points.length < 2) {
      throw new Error('planRoute: 至少需要 2 个点');
    }
    // 真实：SDK 就绪且为步行 → 用 AMap.Walking 逐段沿路网规划
    if (typeof AMap !== 'undefined' && mode === 'walking') {
      try {
        await _waitForAMap(3000);
        return await _amapWalkingRoute(points);
      } catch (e) {
        console.warn('[AMap] 步行路径规划失败，回退直线占位：', e?.message || e);
      }
    }
    // 兜底：直线 + haversine 估算
    await _delay(60);
    return _mockRoute(points, mode);
  },

  /**
   * 静态地图图片 URL
   * Real: https://restapi.amap.com/v3/staticmap?location=&zoom=&markers=&paths=&size=
   * @returns {string} image URL
   */
  staticMapURL({ center, zoom = 15, markers = [], path, size = '600*400' }) {
    // TODO[real-api]: 真实 URL 拼接
    return `https://restapi.amap.com/v3/staticmap?key=YOUR_KEY&location=${center.join(',')}&zoom=${zoom}&size=${size}&_mock=true`;
  },

  /**
   * 交互地图 (浏览器内 SDK 渲染)
   * @param {HTMLElement|string} container DOM 节点或 id
   * @param {{center: [lng, lat], zoom, mapKey?, markers?, polyline?}} opts
   * @returns {Promise<{instance, destroy}>}
   *
   * 真实接入：index.html 在 LU_CONFIG.amapKey 非空时已经注入 SDK <script>
   * 这里只需等待 window.AMap 就绪，然后 new AMap.Map(...)。
   */
  async renderInteractiveMap(container, opts) {
    await _waitForAMap();
    if (typeof AMap === 'undefined') {
      // SDK 还没就绪（key 没配 / 加载失败）→ 调用方应该提前已经检查 cfg.provider
      console.warn('[AMap] SDK 未就绪，无法渲染真实地图');
      return null;
    }

    const el = typeof container === 'string' ? document.getElementById(container) : container;
    const map = new AMap.Map(el, {
      center:   opts.center,
      zoom:     opts.zoom || 15,
      mapStyle: 'amap://styles/light',
      viewMode: '2D',
      pitch:    0,
      scrollWheel: true,
      doubleClickZoom: true,
      touchZoom: true,
      zoomEnable: true,
      dragEnable: true,
    });

    // 自定义针：复用 CSS .lu-amap-pin
    const markerObjs = (opts.markers || []).map((m, i) => {
      const div = document.createElement('div');
      div.className = `lu-amap-pin lu-amap-pin-${m.type || 'photo'}`;
      div.innerHTML = `<span class="lap-num">${m.idx}</span>`;
      div.title = m.label || '';
      div.style.cursor = 'pointer';
      div.style.pointerEvents = 'auto';
      div.dataset.poiIdx = i;
      const marker = new AMap.Marker({
        position: [m.lng, m.lat],
        content:  div,
        offset:   new AMap.Pixel(-16, -36),
        anchor:   'bottom-center',
        clickable: true,
      });
      marker.on('click', () => {
        if (typeof openPOISheet === 'function') openPOISheet(i);
      });
      return marker;
    });
    markerObjs.forEach(m => m.setMap(map));

    // Fallback: delegate click on map container for pin clicks
    el.addEventListener('click', (e) => {
      const pin = e.target.closest('.lu-amap-pin');
      if (pin && pin.dataset.poiIdx != null) {
        if (typeof openPOISheet === 'function') openPOISheet(+pin.dataset.poiIdx);
      }
    });

    // 路线
    let polyObj;
    if (opts.polyline && opts.polyline.length >= 2) {
      polyObj = new AMap.Polyline({
        path:          opts.polyline.map(p => [p.lng, p.lat]),
        strokeColor:   '#C8462C',
        strokeWeight:  5,
        strokeOpacity: 0.85,
        lineJoin:      'round',
        lineCap:       'round',
        showDir:       true,
      });
      polyObj.setMap(map);
    }

    // 自动调整视图把所有节点和路线框进去
    const overlays = [...markerObjs, polyObj].filter(Boolean);
    if (overlays.length) map.setFitView(overlays, false, [60, 60, 60, 60]);

    return {
      instance: map,
      destroy() { try { map.destroy(); } catch {} },
    };
  },

  /**
   * 把当前 demo 用的「百分比坐标 {x:0..100, y:0..100}」转换成「经纬度 {lng, lat}」
   * 占位转换，真实数据接入后这一层可以删除（直接给 lng/lat）
   */
  pctToLngLat({ x, y }, mapKey) {
    const map = MAPS[mapKey];
    if (!map?.amap?.center) return { lng: 0, lat: 0 };
    const [clng, clat] = map.amap.center;
    return {
      lng: clng + (x - 50) * 0.0012,
      lat: clat - (y - 50) * 0.0010,
    };
  },

  /**
   * 按地名搜真实经纬度（AMap.PlaceSearch，浏览器内）。
   * 结果按 city|keyword 缓存（缓存 Promise，避免并发重复请求）。
   * @returns {Promise<{lng, lat, name, address} | null>}
   */
  async geocodeByName(keyword, city = '上海') {
    if (!keyword || typeof AMap === 'undefined') return null;
    const ck = city + '|' + keyword;
    if (_geocodeCache.has(ck)) return _geocodeCache.get(ck);
    const task = (async () => {
      try {
        await _ensurePlugin('AMap.PlaceSearch');
        return await new Promise(resolve => {
          const ps = new AMap.PlaceSearch({ city, citylimit: true, pageSize: 1, pageIndex: 1 });
          ps.search(keyword, (status, result) => {
            const poi = status === 'complete' && result.poiList?.pois?.[0];
            resolve(poi?.location
              ? { lng: poi.location.lng, lat: poi.location.lat, name: poi.name, address: poi.address }
              : null);
          });
        });
      } catch {
        return null;
      }
    })();
    _geocodeCache.set(ck, task);
    return task;
  },

  /**
   * 解析章节的经纬度：优先用真实地名搜（title 里 ' · ' 前的中文），
   * 搜不到 / 没 SDK 时回退到占位百分比坐标。调用方 await 即可。
   */
  async resolveLngLat(ch, mapKey) {
    // 优先从 real_pois.json 拿真实经纬度
    if (window.REAL_POIS?.pois) {
      const clean = ((ch.title || '').split(' · ')[0] || '').trim();
      const real = window.REAL_POIS.pois.find(p =>
        p.name === clean || clean.includes(p.name) || p.name.includes(clean)
      );
      if (real?.longitude && real?.latitude) {
        return { lng: real.longitude, lat: real.latitude };
      }
    }
    if (typeof AMap !== 'undefined') {
      const city = (MAPS[mapKey]?.amap?.name || '上海').split('·')[0].trim() || '上海';
      const kw = ((ch.title || '').split(' · ')[0] || ch.place || '').trim();
      const hit = await this.geocodeByName(kw, city);
      if (hit) return { lng: hit.lng, lat: hit.lat };
    }
    return this.pctToLngLat(ch.coords, mapKey);
  },
};

// 地名 → 经纬度 缓存（Promise 级）
const _geocodeCache = new Map();


// ============================================================
// === 真实 AMap.Walking 路径规划 =============================
// 多节点逐段规划后拼接 polyline（高德步行 API 是点到点）。
// ============================================================
function _ensurePlugin(name) {
  return new Promise((resolve, reject) => {
    if (typeof AMap === 'undefined') return reject(new Error('AMap SDK 未加载'));
    const short = name.split('.')[1];
    if (AMap[short]) return resolve();
    AMap.plugin(name, () => {
      AMap[short] ? resolve() : reject(new Error(name + ' 插件加载失败'));
    });
  });
}

function _walkSegment(walking, a, b) {
  return new Promise((resolve, reject) => {
    walking.search([a.lng, a.lat], [b.lng, b.lat], (status, result) => {
      const route = status === 'complete' && result.routes && result.routes[0];
      if (!route) return reject(new Error('walking status: ' + status + ' info: ' + (result?.info || 'none')));
      const path = [];
      route.steps.forEach(st => st.path.forEach(p => path.push({ lng: p.lng, lat: p.lat })));
      resolve({
        path,
        distance: route.distance,
        time: route.time,
        steps: route.steps.map(s => s.instruction),
      });
    });
  });
}

let _walkingLock = null;
async function _amapWalkingRoute(points) {
  while (_walkingLock) await _walkingLock;
  let unlock;
  _walkingLock = new Promise(r => { unlock = r; });
  try {
    await _ensurePlugin('AMap.Walking');
    let polyline = [];
    let totalDist = 0, totalDur = 0;
    const legs = [];
    for (let i = 1; i < points.length; i++) {
      const walking = new AMap.Walking({ hideMarkers: true, isOutline: false });
      try {
        const seg = await _walkSegment(walking, points[i - 1], points[i]);
        polyline = polyline.concat(i === 1 ? seg.path : seg.path.slice(1));
        totalDist += seg.distance;
        totalDur += seg.time;
        legs.push({
          from: points[i - 1], to: points[i],
          distance_m: Math.round(seg.distance),
          duration_s: Math.round(seg.time),
          steps: seg.steps,
        });
      } catch {
        polyline.push(points[i - 1], points[i]);
        const d = _haversine(points[i - 1], points[i]);
        totalDist += d;
        totalDur += d / 1.2;
        legs.push({ from: points[i - 1], to: points[i], distance_m: Math.round(d), duration_s: Math.round(d / 1.2), steps: [] });
      }
    }
    return {
      total_distance_m: Math.round(totalDist),
      total_duration_s: Math.round(totalDur),
      polyline,
      legs,
    };
  } finally {
    _walkingLock = null;
    unlock();
  }
}


// ============================================================
// === mock helpers ============================================
// ============================================================
function _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function _mockGeocode(address) {
  // 简单匹配 MAPS center 数据
  for (const [, m] of Object.entries(MAPS)) {
    if (m.amap?.name && address.includes(m.amap.name.split('·')[1]?.trim() || '__no__')) {
      return { lng: m.amap.center[0], lat: m.amap.center[1], formatted_address: address, level: '区域' };
    }
  }
  return { lng: 121.4737, lat: 31.2304, formatted_address: address, level: '城市' }; // 上海
}

function _mockNearby({ lng, lat, types, limit }) {
  // 占位：返回空数组（demo 不依赖此方法）
  return [];
}

function _mockRoute(points, mode) {
  // 估算距离/时长 + 直线 polyline
  let totalDist = 0;
  const legs = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i-1], b = points[i];
    const d = _haversine(a, b);
    totalDist += d;
    legs.push({
      from: a, to: b,
      distance_m: Math.round(d),
      duration_s: Math.round(d / _speed(mode)),
      steps: [`从 (${a.lng?.toFixed(4)},${a.lat?.toFixed(4)}) 步行至 (${b.lng?.toFixed(4)},${b.lat?.toFixed(4)})`],
    });
  }
  return {
    total_distance_m: Math.round(totalDist),
    total_duration_s: Math.round(totalDist / _speed(mode)),
    polyline: points.slice(),
    legs,
  };
}

function _speed(mode) {
  return { walking: 1.2, driving: 8.0, transit: 4.0 }[mode] || 1.2; // m/s
}
function _haversine(a, b) {
  const R = 6371000, toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat/2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng/2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// 等待 window.AMap 就绪（最多 5s），无 key 时直接返回
function _waitForAMap(timeoutMs = 5000) {
  return new Promise(resolve => {
    if (typeof window === 'undefined') return resolve();
    if (typeof AMap !== 'undefined') return resolve();
    if (!window.LU_CONFIG?.amapKey) return resolve(); // 没配 key，根本不会加载
    const t0 = Date.now();
    const tick = () => {
      if (typeof AMap !== 'undefined') return resolve();
      if (Date.now() - t0 > timeoutMs) return resolve();
      setTimeout(tick, 80);
    };
    tick();
  });
}
