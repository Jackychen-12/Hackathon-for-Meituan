// ============================================================
// memory.js · 用户记忆飞轮
// ------------------------------------------------------------
// 持久化（localStorage）的用户记忆状态：
//   - profile: Dianping OAuth 拿回的基础用户信息
//   - image:   LLM 分析 + 用户确认的"记忆形象"（核心字段，决定个性化推荐）
//   - interactions: 每次方案/章节交互的日志（飞轮燃料）
//   - version: 记忆形象的版本号（每次重新分析 +1）
//
// 提供发布/订阅，UI 任何模块可以 Memory.subscribe(fn) 监听变更。
// ============================================================

const Memory = (() => {
  const KEY = (window.LU_CONFIG?.memoryStorageKey) || 'lu_memory_v1';
  const AUTO_BUMP_EVERY = (window.LU_CONFIG?.memoryAutoBumpEvery) || 5;

  // 默认空状态
  const _empty = () => ({
    loggedIn:      false,
    profile:       null,
    image:         null,
    interactions:  [],
    version:       0,
    pendingBump:   false, // 是否积累到下次需要重分析
  });

  let _state = _load();
  const _listeners = new Set();

  function _load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ..._empty(), ...JSON.parse(raw) } : _empty();
    } catch {
      return _empty();
    }
  }
  function _save() {
    try { localStorage.setItem(KEY, JSON.stringify(_state)); }
    catch { /* private mode etc. */ }
  }
  function _emit(event = 'change') {
    _listeners.forEach(fn => { try { fn(_state, event); } catch (e) { console.error(e); } });
  }

  return {

    // ---------- 读 ----------
    get state()     { return _state; },
    get loggedIn()  { return _state.loggedIn; },
    get profile()   { return _state.profile; },
    get image()     { return _state.image; },
    get version()   { return _state.version; },
    get interactionCount() { return _state.interactions.length; },

    // ---------- 订阅 ----------
    subscribe(fn) {
      _listeners.add(fn);
      return () => _listeners.delete(fn);
    },

    // ---------- 登录 / 登出 ----------
    login(profile) {
      _state.loggedIn = true;
      _state.profile  = profile;
      _save();
      _emit('login');
    },
    logout() {
      _state = _empty();
      _save();
      _emit('logout');
    },

    // ---------- 记忆形象 ----------
    /**
     * 保存 / 更新记忆形象（用户在编辑画像 modal 里点"保存"时调）
     * @param {MemoryImage} image  来自 LLM.analyzeUserMemory + 用户编辑后的成品
     */
    setImage(image) {
      _state.image       = image;
      _state.version     = image.version || (_state.version + 1);
      _state.pendingBump = false;
      _save();
      _emit('image:set');
    },

    // ---------- 飞轮：互动日志 ----------
    /**
     * 记录一次互动事件（每次方案 view / 章节点击 / 收藏 都可调）
     * @param {string} type   'view_plan' | 'view_detail' | 'like_chapter' | 'save_plan' | ...
     * @param {object} payload
     */
    recordInteraction(type, payload = {}) {
      _state.interactions.push({
        type, payload,
        at: new Date().toISOString(),
      });
      // 累积到一定阈值，标记 pending（提示用户去刷新画像）
      if (_state.interactions.length > 0 &&
          _state.interactions.length % AUTO_BUMP_EVERY === 0) {
        _state.pendingBump = true;
      }
      _save();
      _emit('interaction');
    },

    /**
     * 飞轮统计（给 UI 浮动卡用）
     */
    getStats() {
      return {
        loggedIn:        _state.loggedIn,
        nickname:        _state.profile?.nickname,
        avatarLetter:    _state.profile?.avatar_letter || _state.profile?.nickname?.[0],
        version:         _state.version,
        interactions:    _state.interactions.length,
        pendingBump:     _state.pendingBump,
        topPersonas:     (_state.image?.dominantPersonas || []).slice(0, 3).map(p => p.persona_id),
        summary:         _state.image?.summary,
        since:           _state.image?.generated_at,
      };
    },

    /**
     * 把每条交互按类型归类（飞轮 modal 用）
     */
    getInteractionBreakdown() {
      const map = {};
      _state.interactions.forEach(i => map[i.type] = (map[i.type] || 0) + 1);
      return map;
    },

    /**
     * 调试 / 重置
     */
    _debug_dump() { return JSON.parse(JSON.stringify(_state)); },
    _debug_reset() { _state = _empty(); _save(); _emit('reset'); },
  };
})();
