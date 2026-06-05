// ============================================================
// services/llm.js · 大模型调用（Claude API）
// ------------------------------------------------------------
// 真实接入：
//   - Claude API (Anthropic): https://api.anthropic.com/v1/messages
//   - 推荐模型分工：
//       * Sonnet 4.6 — 多 Persona Agent 辩论、生成方案、Tool Use
//       * Haiku 4.5  — 批量 UGC 抽取（避坑约束、关键词、隐式标签），便宜快
//
// 当前实现：直接从 mock 数据（UGC_DATA + CASES）返回。
// 切换到真实 API 的步骤：
//   1. 准备 Anthropic API Key（环境变量 ANTHROPIC_API_KEY）
//   2. 后端代理（不要在前端裸调，会暴露 key）：建一个 /api/llm 中转
//   3. 把每个方法体改为 fetch('/api/llm', { body: JSON.stringify({...}) })
//   4. 开启 prompt cache（每条 prompt 加 cache_control: { type: 'ephemeral' }）
//      ── 多 POI 批量抽取场景命中率非常高
// ============================================================

// ============================================================
// === 后端中转（带 mock 兜底） ===============================
// 行为：
//   - 启动时探一次 /api/health，只有后端可达且 has_key 为真时才走真实 Claude
//   - 任何失败（无后端 / 无 key / 接口报错）都回退到本文件的 _mock*，demo 永不崩
//   - 直接 open index.html（file://）时 fetch 失败 → 全程 mock
// ============================================================
const _LLM_BACKEND = (typeof LU_CONFIG !== 'undefined' && LU_CONFIG.llmBackendURL) || '/api/llm';
let _backendReady = null; // null=未探测, true/false=已探测

async function _backendHealthy() {
  if (_backendReady !== null) return _backendReady;
  try {
    const healthURL = _LLM_BACKEND.replace(/\/llm\/?$/, '/health');
    const r = await fetch(healthURL, { cache: 'no-store' });
    const j = await r.json();
    _backendReady = !!(r.ok && j.has_key);
  } catch {
    _backendReady = false;
  }
  return _backendReady;
}

// 统一调用入口：能走后端走后端，否则回退 mockFn()
async function _callLLM(method, payload, mockFn) {
  if (await _backendHealthy()) {
    try {
      const r = await fetch(_LLM_BACKEND, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, payload }),
      });
      if (r.ok) {
        const { result } = await r.json();
        // personaDebate 后端返回空数组 → 视为无效，回退本地 CASES mock
        if (Array.isArray(result) && result.length === 0) return mockFn();
        if (result !== null && result !== undefined) return result;
      }
    } catch {
      /* 落到 mock */
    }
  }
  return mockFn();
}

const LLM = {

  /**
   * 后端是否就绪且配了真实 key（调用方据此决定走真模型还是预制 mock）
   * @returns {Promise<boolean>}
   */
  backendReady() {
    return _backendHealthy();
  },

  /**
   * 从 N 条评论里抽取结构化「避坑约束」(创新点 1 的核心)
   *
   * Real call (Haiku 4.5):
   *   POST https://api.anthropic.com/v1/messages
   *   model: 'claude-haiku-4-5-20251001'
   *   system: <见 prompts/extract_pitfalls.md>
   *   messages: [{
   *     role: 'user',
   *     content: 'POI: 兰心餐厅\n评论:\n1. ...\n2. ...\n...'
   *   }]
   *   tools: [{ name: 'emit_pitfalls', input_schema: <JSON Schema> }]
   *
   * @returns {Promise<{
   *   poi_id, summary: string,
   *   time_pitfalls:    [{ window, issue, source_review_ids: [] }],
   *   ops_pitfalls:     [{ type, detail }],
   *   menu_pitfalls:    [{ avoid_item, reason }],
   *   context_pitfalls: [{ when, issue }],
   *   confidence: 0..1,
   * }>}
   */
  async extractPitfalls(reviews, { poi } = {}) {
    return _callLLM('extractPitfalls', { reviews, poi }, async () => {
      await _delay(60);
      return _mockPitfalls(reviews, poi);
    });
  },

  /**
   * 从 N 条评论里抽取「隐式标签」(创新点 3 的数据底座)
   *   - 拍照度 / 拥挤度 / 能量需求 / 情绪标签 / 最佳时段 / 亲子友好等
   *
   * Real call (Haiku 4.5 + Tool Use):
   *   同上，schema 输出 { tags: { photogenic: 0-1, energy_demand: 1-5, mood: [...], best_window: '...', kid_friendly: bool } }
   */
  async extractImplicitTags(reviews, { poi } = {}) {
    return _callLLM('extractImplicitTags', { reviews, poi }, async () => {
      await _delay(50);
      return _mockTags(reviews, poi);
    });
  },

  /**
   * 多 Persona Agent 辩论 → 生成 2-3 条 Pareto 方案 (创新点 2 的核心)
   *
   * Real impl (Sonnet 4.6, 多轮):
   *   阶段 1 — 用户画像 → 激活的 Personas (1 次 call)
   *   阶段 2 — 每个 Persona 并行出方案 (N 次 parallel call, 每次给候选 POI + 偏好打分函数)
   *   阶段 3 — Critic 阶段：每个 Persona 批评其他人方案
   *   阶段 4 — 主持人 Agent 汇总 Pareto-front
   *
   * @returns {Promise<Plan[]>}
   *
   * 重度使用 prompt cache：
   *   - system + 候选 POI 列表 + 全部评论 → 缓存
   *   - 每个 Persona 的偏好 prompt 不缓存（变量）
   */
  async personaDebate({ userQuery, personas, candidatePOIs, constraints }) {
    return _callLLM('personaDebate', { userQuery, personas, candidatePOIs, constraints }, async () => {
      await _delay(150);
      return _mockPlans({ userQuery, personas, candidatePOIs, constraints });
    });
  },

  /**
   * 给一条评论高亮 LLM 觉得最重要的短语（路线上下文相关）
   * Real call (Haiku 4.5): 单 prompt，返回 highlighted_phrase: string
   */
  async highlightReviewKeyPhrase(reviewText, { planContext } = {}) {
    return _callLLM('highlightReviewKeyPhrase', { reviewText, planContext }, async () => {
      await _delay(20);
      return _mockHighlight(reviewText);
    });
  },

  /**
   * 生成方案级别的 AI 总结 (适合谁 / 不适合谁 / digest)
   * Real call (Sonnet 4.6):
   *   input: 方案 + 全部章节 POI + 抽样评论
   *   output: { digest, fitFor: [], notFor: [], basedOn: '...' }
   */
  async summarizePlan(plan, { reviews } = {}) {
    return _callLLM('summarizePlan', { plan, reviews }, async () => {
      await _delay(80);
      return _mockSummary(plan, reviews);
    });
  },

  /**
   * 故事化生成路线章节标题 (创新点 3 的呈现层)
   * Real call (Sonnet 4.6):
   *   把章节列表 + 隐式标签 → 章节名 + 总叙事弧
   */
  async narrateChapters(chapters) {
    return _callLLM('narrateChapters', { chapters }, async () => {
      await _delay(50);
      return _mockNarrate(chapters);
    });
  },

  /**
   * 用户记忆分析 (创新点延伸：记忆飞轮的心脏)
   *
   * Real call (Sonnet 4.6, 单次或滚动多轮):
   *   input:
   *     - 用户 profile (Dianping 拉的基础信息)
   *     - 用户最近 100-200 条 favorites
   *     - 用户全部 reviews（含评分 / 价格 / 时段）
   *     - 历史 image (如果有，则做 delta 分析)
   *   output: MemoryImage JSON
   *
   * @returns {Promise<MemoryImage>}
   *
   * MemoryImage shape:
   * {
   *   version:           1,                       // 飞轮版本号
   *   generated_at:      ISO string,
   *   summary:           "一句话画像",
   *   dominantPersonas:  [{persona_id, weight: 0..1, evidence: '...'}],
   *   priceSensitivity:  0..1,
   *   preferredCategories: [{name, weight: 0..1}],
   *   dislikeSignals:    [string],
   *   timePatterns:      { favorite_window, weekend_active, ... },
   *   sourceStats:       { favorites_count, reviews_count, since },
   * }
   */
  async analyzeUserMemory({ profile, favorites, reviews, previousImage } = {}) {
    return _callLLM('analyzeUserMemory', { profile, favorites, reviews, previousImage }, async () => {
      await _delay(280);
      return _mockAnalyzeMemory({ profile, favorites, reviews, previousImage });
    });
  },
};


// ============================================================
// === mock helpers ============================================
// ============================================================
function _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function _mockPitfalls(reviews, poi) {
  return {
    poi_id:           poi?.poi_id || 'mock',
    summary:          'mock：N 条评论中提取的避坑提示。',
    time_pitfalls:    [{ window: '周末 13:00-14:00', issue: '排队 60min+', source_review_ids: [] }],
    ops_pitfalls:     [{ type: '营业时间陷阱', detail: '21:30 停止点单' }],
    menu_pitfalls:    [],
    context_pitfalls: [],
    confidence:       0.62,
  };
}

function _mockTags(reviews, poi) {
  return {
    photogenic:    0.7,
    energy_demand: 3,
    mood_tags:     ['治愈', '沉浸'],
    best_window:   '17:30-19:00',
    kid_friendly:  false,
  };
}

function _mockPlans({ userQuery }) {
  // 直接从 mock CASES 里找匹配 query 的 case，返回它的 3 个 plans
  const c = CASES.find(c => c.query && c.query.includes((userQuery || '').slice(0, 4))) || CASES[0];
  return c.plans;
}

function _mockHighlight(text) {
  // 简单返回第一句的前 8 字符
  return text.slice(0, 8);
}

function _mockSummary(plan) {
  // 从 UGC_DATA 找已经预生成的 summary（demo 用）
  for (const [key, bundle] of Object.entries(UGC_DATA)) {
    if (key.endsWith('.' + plan.id)) return bundle.aiSummary;
  }
  return {
    digest:   'mock 总结',
    fitFor:   ['mock'],
    notFor:   ['mock'],
    basedOn:  '0 条评论',
  };
}

function _mockNarrate(chapters) {
  return chapters.map(c => c.title);
}

function _mockAnalyzeMemory({ profile, favorites, reviews, previousImage }) {
  // 简单基于 favorites 的 category 分布 + reviews 评分推一个画像
  const catCount = {};
  (favorites || []).forEach(f => {
    catCount[f.poi_category] = (catCount[f.poi_category] || 0) + 1;
  });
  const sortedCats = Object.entries(catCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const avgPrice = (reviews || []).reduce((s, r) => s + (r.per_capita_cost || 0), 0) / (reviews?.length || 1);
  const priceSensitivity = avgPrice ? Math.max(0, Math.min(1, 1 - avgPrice / 250)) : 0.5;

  // 收藏 + 评论关键词触发 persona 推断
  const allText = (reviews || []).map(r => r.text).join(' ') +
                  (favorites || []).map(f => (f.tag_from_user || []).join(' ')).join(' ');
  const has = (s) => allText.includes(s);
  const personas = [];
  if (has('拍') || has('美术馆') || has('图书馆') || has('展览'))
    personas.push({ persona_id: 'literary', weight: 0.88, evidence: '收藏中文艺类 POI 占比高（美术馆/书店/咖啡馆）' });
  if (has('本帮') || has('红烧') || has('八宝') || has('面'))
    personas.push({ persona_id: 'foodie', weight: 0.74, evidence: '评论里反复出现本帮菜关键词（红烧肉/八宝鸭/老克勒）' });
  if (priceSensitivity > 0.55)
    personas.push({ persona_id: 'value', weight: priceSensitivity, evidence: `近期人均消费中位 ¥${Math.round(avgPrice)}，明显避开 fine dining` });
  if (has('光') || has('黄昏') || has('街拍') || has('梧桐'))
    personas.push({ persona_id: 'photographer', weight: 0.66, evidence: '评论高频提及"光/黄昏/街拍/梧桐"等拍照语境' });

  // 至少给两个 persona
  if (personas.length < 2) personas.push({ persona_id: 'local', weight: 0.55, evidence: '上海本地用户，覆盖多区域' });
  personas.sort((a, b) => b.weight - a.weight);

  const ver = (previousImage?.version || 0) + 1;
  return {
    version:       ver,
    generated_at:  new Date().toISOString(),
    summary:       `一个偏好${sortedCats[0]?.[0] || '本地'} + ${personas[0]?.persona_id === 'literary' ? '文艺氛围' : personas[0]?.persona_id === 'foodie' ? '本帮味道' : '性价比'} + ${priceSensitivity > 0.55 ? '节俭' : '中等预算'}的探索型用户`,
    dominantPersonas:    personas.slice(0, 3),
    priceSensitivity:    Number(priceSensitivity.toFixed(2)),
    preferredCategories: sortedCats.map(([name, n]) => ({ name, weight: Math.min(1, n / 8) })),
    dislikeSignals: [
      has('排队') ? '排队 > 30min 必避' : '避开节假日人流高峰',
      has('辣') ? '反感辣口味' : '不爱拥挤打卡景点',
      '反感官方包装的"网红"标签',
    ],
    timePatterns: {
      favorite_window: '14:00-19:00',
      weekend_active:  true,
    },
    sourceStats: {
      favorites_count: favorites?.length || 0,
      reviews_count:   reviews?.length || 0,
      since:           profile?.join_date || '—',
    },
  };
}
