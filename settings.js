// ============================================================
// settings.js · 用户设置持久化
// ------------------------------------------------------------
// 与 Memory 平级的独立模块。
//   - data:    哪些数据源开启
//   - privacy: 上行 / 本地 / 匿名 / 日志 等
//   - profile: 自动重分析阈值 / 深度 / 是否包含负评
//   - voice:   对话风格（措辞 / 调性 / 篇幅 / 语言）
//
// 提供 get / set / subscribe / reset。UI 改动后自动 _save 到 localStorage。
// ============================================================

const Settings = (() => {
  const KEY = 'lu_settings_v1';

  const DEFAULT = {
    data: {
      enableDianpingFavorites: true,
      enableDianpingReviews:   true,
      enableOthersReviews:     true,
      enableAMapRoute:         true,
      enableMeituanQueue:      true,
      enableMeituanDeals:      true,
    },
    privacy: {
      localOnly:        false,
      anonymize:        true,
      logInteractions:  true,
      allowAnalytics:   false,
    },
    profile: {
      autoRebuildEvery: 5,
      depth:            'standard',  // light / standard / deep
      includeNegative:  true,
      activePersonas:   ['photographer', 'foodie', 'literary'], // 默认激活的 Agent 团
    },
    voice: {
      formality: 'neutral',  // formal / neutral / casual
      tone:      'literary', // literary / direct / playful
      length:    'standard', // concise / standard / detailed
      language:  'zh-CN',    // zh-CN / en / bilingual
    },
  };

  function _deepMerge(target, src) {
    for (const k of Object.keys(src)) {
      if (typeof src[k] === 'object' && src[k] && !Array.isArray(src[k])) {
        target[k] = _deepMerge(target[k] || {}, src[k]);
      } else {
        target[k] = src[k];
      }
    }
    return target;
  }

  let _state = (() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT));
      return _deepMerge(JSON.parse(JSON.stringify(DEFAULT)), JSON.parse(raw));
    } catch { return JSON.parse(JSON.stringify(DEFAULT)); }
  })();

  const _listeners = new Set();
  function _save() { try { localStorage.setItem(KEY, JSON.stringify(_state)); } catch {} }
  function _emit(path, value) { _listeners.forEach(fn => { try { fn(_state, path, value); } catch (e) { console.error(e); } }); }

  return {
    /** 完整 state（只读，请不要直接 mutate） */
    get state() { return _state; },

    /** 按点分路径取值，如 "voice.tone" */
    get(path) {
      return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), _state);
    },

    /** 按点分路径设值，自动持久化 + emit */
    set(path, value) {
      const parts = path.split('.');
      const last  = parts.pop();
      let cur = _state;
      for (const k of parts) {
        if (typeof cur[k] !== 'object' || cur[k] === null) cur[k] = {};
        cur = cur[k];
      }
      cur[last] = value;
      _save();
      _emit(path, value);
    },

    /** 订阅任何 set 的变化 */
    subscribe(fn) { _listeners.add(fn); return () => _listeners.delete(fn); },

    /** 重置到默认 */
    reset() {
      _state = JSON.parse(JSON.stringify(DEFAULT));
      _save();
      _emit('*', null);
    },

    /** 调试：导出诊断 JSON */
    debugDump() {
      return {
        settings:   JSON.parse(JSON.stringify(_state)),
        memory:     (typeof Memory !== 'undefined') ? Memory._debug_dump?.() : null,
        config:     (typeof LU_CONFIG !== 'undefined') ? { ...LU_CONFIG, amapKey: LU_CONFIG.amapKey ? '***' : '' } : null,
        timestamp:  new Date().toISOString(),
      };
    },

    DEFAULT,
  };
})();
