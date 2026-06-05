// ============================================================
// adapter.js · 数据适配层
// ------------------------------------------------------------
// 职责：把 services/* 的"接近真实 API 形态"的数据
//      组合 + 转换成 UI 模块直接消费的形态。
//
// UI 永远只调 Adapter.*，不直接读 services/* 或全局 CASES/UGC_DATA/MAPS。
// 这样真实 API 接入时：
//   1) services/*.js 改方法体（fetch 真接口）
//   2) adapter.js 视字段差异微调
//   3) app.js 几乎不动
//
// 缓存：UI 切换视图频繁，简单 Map<key, Promise> 内存缓存。
//      生产环境可以加 TTL / IndexedDB / SWR 模式。
// ============================================================

const Adapter = (() => {
  // ----- 内部缓存 -----
  const _cache = new Map();
  function _memo(key, factory) {
    if (_cache.has(key)) return _cache.get(key);
    const p = factory();
    _cache.set(key, p);
    return p;
  }
  function _invalidate(prefix) {
    [..._cache.keys()].forEach(k => { if (k.startsWith(prefix)) _cache.delete(k); });
  }

  return {

    /**
     * UI 形态 · CaseSummary[]
     * 用于 Landing 页面的「示例场景」卡片
     *
     * @returns {Promise<Array<{
     *   id, cat, title, poem, metaCity, metaSeason, query
     * }>>}
     */
    async listCases() {
      return _memo('cases', async () => {
        // 当前直接读 CASES (mock fixture)
        // TODO[real-api]: 这一层将来从配置中心 / B 端管理后台拉
        return CASES.map(c => ({
          id:         c.id,
          cat:        c.cat,
          title:      c.title,
          poem:       c.poem,
          metaCity:   c.metaCity,
          metaSeason: c.metaSeason,
          query:      c.query,
        }));
      });
    },

    /**
     * UI 形态 · CompareView
     * Compare 页面顶部摘要 + 3 张 plan 卡片
     *
     * 个性化：登录且有 image 时，对每个方案算一个 personalScore，
     *        最高分打 bestFit 标记，UI 渲染"🌟 最适合你"徽章。
     */
    async getCompareView(caseId) {
      return _memo(`compare:${caseId}:v${Memory.version || 0}`, async () => {
        const c = CASES.find(x => x.id === caseId);
        if (!c) return null;

        const userImage = Memory.image;
        const userPersonaWeights = {};
        (userImage?.dominantPersonas || []).forEach(p => {
          userPersonaWeights[p.persona_id] = p.weight;
        });

        const planCards = c.plans.map((p, i) => {
          // personalScore = 方案 dominant + secondary 对应的用户偏好权重之和
          let score = 0;
          p.dominant.forEach(d  => score += (userPersonaWeights[d] || 0) * 1.0);
          (p.secondary || []).forEach(s => score += (userPersonaWeights[s] || 0) * 0.5);
          return {
            idx:           i,
            id:            p.id,
            volume:        p.volume,
            title:         p.title,
            subtitle:      p.subtitle,
            dominant:      p.dominant,
            secondary:     p.secondary || [],
            stance:        p.stance,
            time:          p.time,
            budget:        p.budget,
            chaptersCount: p.chaptersData.length,
            chaptersPreview: p.chaptersData.slice(0, 4).map(ch => ({
              num:   ch.num,
              time:  ch.time,
              title: ch.title,
              mood:  (ch.mood || '').replace(/章$/, ''),
            })),
            debate:        p.debate,
            debateFinal:   p.debateFinal,
            personalScore: score,
          };
        });

        // 仅在登录有 image 时打 bestFit
        if (userImage) {
          const best = planCards.reduce((a, b) => (b.personalScore > a.personalScore ? b : a));
          if (best.personalScore > 0.3) best.bestFit = true;
        }

        return {
          query:           c.query,
          activePersonas:  c.activePersonas,
          plans:           planCards,
          personalized:    !!userImage,
          userSummary:     userImage?.summary,
        };
      });
    },

    /**
     * UI 形态 · PlanDetail
     * Detail 页面完整数据：cover + 章节 (含 POI 增强) + 地图 + 路径
     *
     * 这是 Adapter 最"重"的方法，真实环境会做：
     *   - 并行 Dianping.getPOIDetail 拉每个 POI 详情
     *   - LLM 调用获取每个 POI 的避坑约束、隐式标签
     *   - AMap.planRoute 拉真实步行路径
     *   - Meituan.getQueueStatus 实时排队
     * 然后合并成 chapters + 地图 + 路径 polyline。
     */
    async getPlanDetail(caseId, planId) {
      return _memo(`detail:${caseId}.${planId}`, async () => {
        const c = CASES.find(x => x.id === caseId);
        const p = c?.plans.find(x => x.id === planId);
        if (!p) return null;

        // ------ 并行拉每个 POI 的真实数据（demo 里全 mock）------
        const chapters = await Promise.all(p.chaptersData.map(async (ch, idx) => {
          const poiId = `${p.id}#${ch.num}`;
          // 拍照点不查美团转化（团购/预约），其他类型并行查
          const showMeituan = ch.type !== 'photo';
          const [poi, queue, deals] = await Promise.all([
            Dianping.getPOIDetail(poiId),
            showMeituan ? Meituan.getQueueStatus(poiId)      : Promise.resolve(null),
            showMeituan ? Meituan.getDeals(poiId)            : Promise.resolve([]),
          ]);
          const lngLat = await AMapAPI.resolveLngLat(ch, c.mapKey);
          return {
            idx,
            num:           ch.num,
            time:          ch.time,
            mood:          (ch.mood || '').replace(/章$/, ''),
            energy:        ch.energy,
            title:         ch.title,
            place:         ch.place,
            highlight:     ch.highlight,
            pitfall:       ch.pitfall,
            pitfallExtras: ch.pitfallExtras || [],
            type:          ch.type,
            coords:    ch.coords,                            // 占位 {x, y}
            lngLat:    lngLat,
            poi:       poi,                                  // Dianping POI（完整）
            queue:     queue,                                // Meituan 实时排队
            deals:     deals,                                // Meituan 团购券（数组）
            reservable: showMeituan && ch.type === 'eat',    // 餐厅可预约
          };
        }));

        // ------ AMap 路径规划 ------
        const route = await AMapAPI.planRoute(chapters.map(ch => ch.lngLat), 'walking')
          .catch(() => null);

        return {
          id:           p.id,
          volume:       p.volume,
          title:        p.title,
          subtitle:     p.subtitle,
          stance:       p.stance,
          time:         p.time,
          budget:       p.budget,
          debate:       p.debate,
          debateFinal:  p.debateFinal,
          narrativeArc: p.narrativeArc,   // 叙事弧一句话
          chapters:     chapters,
          mapKey:       c.mapKey,
          route:        route,
        };
      });
    },

    /**
     * UI 形态 · PlanUGCBundle (AI 总结 + 真实评论卡片)
     *
     * 真实环境步骤：
     *   1. 对方案内每个 POI 调 Dianping.getReviews → 聚合
     *   2. LLM.summarizePlan(plan, reviews) → digest / fitFor / notFor
     *   3. 选 6-8 条 top 评论，逐条 LLM.highlightReviewKeyPhrase → 高亮短语
     */
    async getPlanUGC(caseId, planId) {
      return _memo(`ugc:${caseId}.${planId}`, async () => {
        const key = `${caseId}.${planId}`;
        const bundle = UGC_DATA[key];
        if (!bundle) return null;

        const mapUGC = (highlights) => bundle.ugc.map((u, i) => ({
          author:    u.author,
          avatar:    u.avatar,
          rating:    u.rating,
          date:      u.date,
          poi:       u.poi,
          text:      u.text,
          highlight: (highlights && highlights[i]) || u.highlight,
        }));

        // 有真实后端（配了 key）→ 用真模型重算总结 + 评论高亮，让「真 Claude」可见
        // 否则用预制数据（无 key 时不调模型，保留预制高亮，体验不降级）
        if (await LLM.backendReady()) {
          const c = CASES.find(x => x.id === caseId);
          const p = c?.plans.find(x => x.id === planId);
          try {
            const reviews = bundle.ugc.map(u => ({
              text: u.text, rating: u.rating, poi: u.poi, author: u.author,
            }));
            const [aiSummary, ...highlights] = await Promise.all([
              LLM.summarizePlan(p || { id: planId }, { reviews }),
              ...bundle.ugc.map(u => LLM.highlightReviewKeyPhrase(u.text, { planContext: p?.title })),
            ]);
            return { aiSummary, ugc: mapUGC(highlights) };
          } catch (e) {
            console.warn('[UGC] 真实模型重算失败，回退预制：', e?.message || e);
          }
        }

        return { aiSummary: bundle.aiSummary, ugc: mapUGC(null) };
      });
    },

    /**
     * UI 形态 · MapConfig
     * 当前 demo 用 SVG mock。真实环境直接返回 AMap 初始化配置。
     *
     * @returns {Promise<{
     *   provider: 'mock' | 'amap',
     *   amap?:   { center: [lng, lat], zoom, name },
     *   mock?:   { roads, parks, mapKey },
     *   markers: Array<{ idx, lng, lat, type, label }>,
     *   route:   { polyline: Array<{lng, lat}>, ... }
     * }>}
     */
    async getMapConfig(caseId, planId) {
      return _memo(`map:${caseId}.${planId}`, async () => {
        const c = CASES.find(x => x.id === caseId);
        const p = c?.plans.find(x => x.id === planId);
        if (!p) return null;

        const mapMock = MAPS[c.mapKey];

        const markers = await Promise.all(p.chaptersData.map(async (ch, i) => ({
          idx:   i + 1,
          ...(await AMapAPI.resolveLngLat(ch, c.mapKey)),
          type:  ch.type,
          label: ch.title.split(' · ')[0],
        })));

        const route = await AMapAPI.planRoute(markers.map(m => ({ lng: m.lng, lat: m.lat })), 'walking')
          .catch(() => null);

        // provider 判定：config.js 里配了 amapKey → 真实 AMap；否则 SVG 占位
        const useAMap = !!(window.LU_CONFIG && LU_CONFIG.amapKey);
        return {
          provider: useAMap ? 'amap' : 'mock',
          amap:     mapMock?.amap,            // { center, zoom, name }
          mock:     {                         // SVG 渲染用
            roads:    mapMock?.roads || [],
            parks:    mapMock?.parks || [],
            mapKey:   c.mapKey,
            chapters: p.chaptersData,         // coords {x, y}
          },
          markers:  markers,                  // {lng, lat, idx, type, label}
          route:    route,
        };
      });
    },

    /**
     * 清空缓存（用户切 case / 触发新对话时调用）
     */
    invalidateCase(caseId) {
      _invalidate(`compare:${caseId}`);
      _invalidate(`detail:${caseId}`);
      _invalidate(`ugc:${caseId}`);
      _invalidate(`map:${caseId}`);
    },

    // ========================================================
    // 用户登录 + 记忆飞轮
    // ========================================================

    /**
     * 一站式：登录 → 拉收藏/评论 → LLM 分析 → 返回初版画像
     * （UI 一般把这个 Promise 包到一个"分析中..." loading)
     *
     * @returns {Promise<{ profile, image }>}
     */
    async loginAndAnalyze() {
      // 1. OAuth 登录
      const { profile } = await Dianping.loginOAuth();
      Memory.login(profile);

      // 2. 并行拉收藏 / 评论
      const [favorites, reviews] = await Promise.all([
        Dianping.getUserFavorites(profile.user_id),
        Dianping.getUserReviews(profile.user_id),
      ]);

      // 3. LLM 分析
      const image = await LLM.analyzeUserMemory({
        profile, favorites, reviews,
        previousImage: Memory.image,   // 增量分析
      });

      return { profile, favorites, reviews, image };
    },

    /**
     * 用户在 modal 里编辑过画像之后，调用这里持久化
     */
    confirmMemoryImage(image) {
      Memory.setImage(image);
      // 用户偏好改了 → 旧的 compare 缓存失效（重新打 bestFit 标签）
      [..._cache.keys()].forEach(k => { if (k.startsWith('compare:')) _cache.delete(k); });
    },

    /**
     * 飞轮重分析：用最新的 interaction 日志 + 历史数据重新走一遍 LLM
     */
    async rebuildMemoryFromInteractions() {
      const profile = Memory.profile;
      if (!profile) throw new Error('未登录');

      const [favorites, reviews] = await Promise.all([
        Dianping.getUserFavorites(profile.user_id),
        Dianping.getUserReviews(profile.user_id),
      ]);
      const newImage = await LLM.analyzeUserMemory({
        profile, favorites, reviews,
        previousImage: Memory.image,
      });
      // 注：这里返回，不直接 setImage。UI 决定是否提示用户确认。
      return newImage;
    },

    /**
     * 飞轮统计
     */
    getMemoryStats() { return Memory.getStats(); },

    /**
     * 真实动态规划：用户输入 → 后端意图识别+搜索+LLM规划
     * @returns {Promise<{query, city, plans, candidatePOIs} | null>}
     */
    async planFromQuery(query) {
      try {
        const backendURL = (window.LU_CONFIG?.llmBackendURL || '/api/llm').replace(/\/llm\/?$/, '/plan');
        const r = await fetch(backendURL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        if (!r.ok) return null;
        const data = await r.json();
        if (data.error || !data.plans?.length) return null;
        return data;
      } catch {
        return null;
      }
    },

    /**
     * 调试用：导出 service 调用统计
     */
    _debugCacheKeys() { return [..._cache.keys()]; },
  };
})();
