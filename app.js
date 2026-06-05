// ====================================================
// 城脉 LU · App Logic
// ====================================================
// 所有数据通过 Adapter.* 异步获取。
// UI 不直接读 CASES / UGC_DATA / MAPS 全局。
// ----------------------------------------------------
// 协作所有权见 AGENTS.md。本文件按视图分区，每区 banner 标 @owner Tx：
//   T1 = Landing + 全局壳  ·  T2 = Compare + Profile  ·  T3 = Detail 整页
// 只改自己 owner 的区域；改 adapter.js / data.js 等 SHARED 核心需先周知。
// ====================================================

const STATE = {
  caseIdx: 0,
  planIdx: 0,
  view:    'landing',
  previousView: 'landing',  // 保存上一个非 profile 的 view，用于从 profile 返回
  _cases:  null,            // 客户端 case 列表缓存（id ↔ idx）

  // —— 详情页本地编辑态（独立于 Adapter 返回的原始数据）——
  _detailKey:    null,       // 当前 caseId#planId，切方案时重置 draft
  draftChapters: null,       // 章节列表本地副本（用户编辑后的）
  pitfallStates: {},         // chapterIdx → 'avoid' | 'ignore' | 'earlier' | 'later'
  debateEndorsed:{},         // lineIdx → true/false
  debateUserVoices: [],      // 用户加入的发言 [{who, text}]
  chatHistory:   [],         // [{role:'user'|'ai', text}]
  chatExpanded:  false,      // chat 历史是否展开
  draftHistory:  [],         // 撤销栈（每次 mutation 前 push 快照）
  draftFuture:   [],         // 重做栈
};

const MAX_HISTORY = 25;

// 保存当前 draftChapters 快照到 history（mutation 前调用）
function _pushDraftSnapshot() {
  if (!STATE.draftChapters) return;
  STATE.draftHistory.push({
    chapters:      JSON.parse(JSON.stringify(STATE.draftChapters)),
    pitfallStates: JSON.parse(JSON.stringify(STATE.pitfallStates)),
  });
  if (STATE.draftHistory.length > MAX_HISTORY) STATE.draftHistory.shift();
  STATE.draftFuture = []; // 新操作清空 redo
  _refreshUndoRedoBtns();
}

async function _undoDraft() {
  if (!STATE.draftHistory.length) return;
  // 把当前推入 future
  STATE.draftFuture.push({
    chapters:      JSON.parse(JSON.stringify(STATE.draftChapters)),
    pitfallStates: JSON.parse(JSON.stringify(STATE.pitfallStates)),
  });
  const prev = STATE.draftHistory.pop();
  STATE.draftChapters = prev.chapters;
  STATE.pitfallStates = prev.pitfallStates;
  await _rerenderAfterDraftChange();
  _refreshUndoRedoBtns();
  showToast('已撤销');
}

async function _redoDraft() {
  if (!STATE.draftFuture.length) return;
  STATE.draftHistory.push({
    chapters:      JSON.parse(JSON.stringify(STATE.draftChapters)),
    pitfallStates: JSON.parse(JSON.stringify(STATE.pitfallStates)),
  });
  const nxt = STATE.draftFuture.pop();
  STATE.draftChapters = nxt.chapters;
  STATE.pitfallStates = nxt.pitfallStates;
  await _rerenderAfterDraftChange();
  _refreshUndoRedoBtns();
  showToast('已重做');
}

function _refreshUndoRedoBtns() {
  const u = document.getElementById('btn-undo');
  const r = document.getElementById('btn-redo');
  if (u) u.disabled = !STATE.draftHistory.length;
  if (r) r.disabled = !STATE.draftFuture.length;
}

function _resetDetailDrafts() {
  STATE.draftChapters = null;
  STATE.pitfallStates = {};
  STATE.debateEndorsed = {};
  STATE.debateUserVoices = [];
  STATE.chatHistory = [];
  STATE.chatExpanded = false;
  STATE.draftHistory = [];
  STATE.draftFuture  = [];
}

// ====================================================
// 时空约束识别 (从 query 文本里解析时间/预算/位置)   @owner T1
// ====================================================
function _extractConstraints(text = '') {
  const t = (text || '').toString();
  const out = [];

  // 时段：N点-M点 / 上午/下午/晚上 / 周末/工作日
  const rangeMatch = t.match(/(\d{1,2})\s*[点时]\s*[-到~至]\s*(\d{1,2})/);
  if (rangeMatch) {
    out.push({ type: 'time',   label: '时段', value: `${rangeMatch[1]}-${rangeMatch[2]}时` });
  } else if (/早上|清晨|上午/.test(t)) {
    out.push({ type: 'time',   label: '时段', value: '上午' });
  } else if (/下午|午后/.test(t)) {
    out.push({ type: 'time',   label: '时段', value: '下午' });
  } else if (/傍晚|黄昏|夜里|晚上|夜晚/.test(t)) {
    out.push({ type: 'time',   label: '时段', value: '傍晚/夜' });
  }

  // 周几 / 日期
  if (/周末|周六|周日|星期六|星期天/.test(t)) {
    out.push({ type: 'day',    label: '日期', value: '周末' });
  } else if (/工作日|周一|周二|周三|周四|周五/.test(t)) {
    out.push({ type: 'day',    label: '日期', value: '工作日' });
  } else if (/今天|今晚/.test(t)) {
    out.push({ type: 'day',    label: '日期', value: '今天' });
  } else if (/明天/.test(t)) {
    out.push({ type: 'day',    label: '日期', value: '明天' });
  }

  // 预算
  const budgetMatch = t.match(/(?:预算|人均|花费|约|大概)?\s*(?:¥|RMB)?\s*(\d{2,5})\s*(?:元|块|RMB)?(?:上下|左右|以内)?/);
  if (budgetMatch && /预算|人均|花费|块|元|¥|RMB/.test(t)) {
    out.push({ type: 'budget', label: '预算', value: `¥${budgetMatch[1]}` });
  }

  // 地点
  const places = ['武康路','陆家嘴','外滩','南京路','静安寺','徐汇','黄浦','浦东','虹口',
                  '衡复','五原路','安福路','巨鹿路','永康路','新天地','田子坊','豫园'];
  places.forEach(p => {
    if (t.includes(p)) out.push({ type: 'area', label: '区域', value: p });
  });

  // 人群
  if (/带娃|小孩|孩子|宝宝|儿童/.test(t)) out.push({ type: 'who', label: '同行', value: '带娃' });
  if (/约会|情侣/.test(t))                  out.push({ type: 'who', label: '同行', value: '约会' });
  if (/一个人|独处|独自/.test(t))            out.push({ type: 'who', label: '同行', value: '一个人' });

  // 偏好动作
  if (/不(想|要|爱)?\s*排队|避\s*排队/.test(t)) out.push({ type: 'pref', label: '偏好', value: '避开排队' });
  if (/拍照|出片|街拍/.test(t))                 out.push({ type: 'pref', label: '偏好', value: '出片' });
  if (/便宜|性价比|省钱/.test(t))               out.push({ type: 'pref', label: '偏好', value: '性价比' });
  if (/烟火气|本地|地道/.test(t))               out.push({ type: 'pref', label: '偏好', value: '本地烟火' });

  // 去重（按 value）
  const seen = new Set();
  return out.filter(c => {
    const k = c.type + ':' + c.value;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// 工具：根据 idx 拿 caseId（不重新 fetch）
async function _ensureCases() {
  if (!STATE._cases) STATE._cases = await Adapter.listCases();
  return STATE._cases;
}
async function _currentCaseId()  { return (await _ensureCases())[STATE.caseIdx].id; }
async function _currentPlanId() {
  const cv = await Adapter.getCompareView(await _currentCaseId());
  return cv.plans[STATE.planIdx].id;
}

function stripBookmarks(s) { return s.replace(/^《|》$/g, ''); }


// ====================================================
// 方案 5 维雷达图 (基于 dominant + secondary personas 推分数)   @owner T2
// ====================================================
const RADAR_AXES = [
  { key: 'photo', label: '出片', weights: { photographer: 1.0, literary: 0.4 } },
  { key: 'taste', label: '滋味', weights: { foodie: 1.0, local: 0.7 } },
  { key: 'value', label: '性价', weights: { value: 1.0 } },
  { key: 'cult',  label: '文化', weights: { literary: 1.0, local: 0.5 } },
  { key: 'easy',  label: '便捷', weights: { parent: 1.0, value: 0.3, local: 0.3 } },
];
function _computeRadarScores(plan) {
  const personaScore = {};
  (plan.dominant || []).forEach(p => personaScore[p] = (personaScore[p] || 0) + 1.0);
  (plan.secondary || []).forEach(p => personaScore[p] = (personaScore[p] || 0) + 0.5);
  // 把激活的 persona 分布到 5 个维度上
  return RADAR_AXES.map(axis => {
    let s = 0;
    Object.entries(axis.weights).forEach(([p, w]) => {
      s += (personaScore[p] || 0) * w;
    });
    // 归一化到 0-1：每个 persona 最多贡献 ~1.5（dominant×weight），假设 4 个 persona 全打满 = 6
    return Math.min(1, s / 1.5);
  });
}
function _renderPersonaRadar(plan) {
  const scores = _computeRadarScores(plan);
  const size = 130, cx = size/2, cy = size/2, R = 42;
  const n = RADAR_AXES.length;
  // 顶点角度（从顶部开始，顺时针）
  const angle = i => (-Math.PI/2) + (i * 2 * Math.PI / n);
  // 网格 (3 层)
  let grid = '';
  for (let k = 1; k <= 3; k++) {
    const r = R * k / 3;
    const pts = Array.from({length: n}, (_, i) => {
      const a = angle(i);
      return `${(cx + r*Math.cos(a)).toFixed(1)},${(cy + r*Math.sin(a)).toFixed(1)}`;
    }).join(' ');
    grid += `<polygon points="${pts}" fill="none" stroke="rgba(126,109,92,0.18)" stroke-width="0.8"/>`;
  }
  // 轴线 + label
  let axes = '', labels = '';
  RADAR_AXES.forEach((axis, i) => {
    const a = angle(i);
    const x2 = cx + R * Math.cos(a);
    const y2 = cy + R * Math.sin(a);
    axes += `<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="rgba(126,109,92,0.2)" stroke-width="0.6"/>`;
    const lx = cx + (R + 11) * Math.cos(a);
    const ly = cy + (R + 11) * Math.sin(a) + 3;
    labels += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-family="'Noto Serif SC',serif" font-size="10" fill="#7E6D5C" font-weight="500">${axis.label}</text>`;
  });
  // 数据多边形
  const dataPts = scores.map((s, i) => {
    const a = angle(i);
    const r = R * s;
    return `${(cx + r*Math.cos(a)).toFixed(1)},${(cy + r*Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  return `
    <svg class="persona-radar" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" aria-label="方案画像雷达图">
      <g>${grid}</g>
      <g>${axes}</g>
      <polygon points="${dataPts}" fill="rgba(216,85,64,0.22)" stroke="#D85540" stroke-width="1.5" stroke-linejoin="round"/>
      <g>
        ${scores.map((s, i) => {
          const a = angle(i);
          const r = R * s;
          return `<circle cx="${(cx + r*Math.cos(a)).toFixed(1)}" cy="${(cy + r*Math.sin(a)).toFixed(1)}" r="2.5" fill="#D85540"/>`;
        }).join('')}
      </g>
      <g>${labels}</g>
    </svg>
  `;
}


// ====================================================
// VIEW SWITCHING   @owner T1 (全局壳)
// ====================================================
async function switchView(view) {
  // 进 profile / settings 之前记住来时的 view，"返回"会回到这里
  if ((view === 'profile' || view === 'settings') && STATE.view !== view) {
    STATE.previousView = STATE.view;
  }
  STATE.view = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('view-active'));
  const target = document.getElementById('view-' + view);
  if (target) target.classList.add('view-active');
  document.querySelectorAll('.nav-link').forEach(a => {
    a.classList.toggle('active', a.dataset.nav === view);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (view === 'compare')  await renderCompare();
  if (view === 'detail')   await renderDetail();
  if (view === 'profile')  await renderProfile();
  if (view === 'settings') await renderSettings();
}

document.querySelectorAll('[data-nav]').forEach(el => {
  el.addEventListener('click', async e => {
    e.preventDefault();
    await switchView(el.dataset.nav);
  });
});


// ====================================================
// LANDING · case cards + persona chips + cta   @owner T1
// ====================================================
async function renderLanding() {
  const cases = await Adapter.listCases();
  STATE._cases = cases;

  const grid = document.getElementById('case-grid');
  grid.innerHTML = cases.map((c, i) => `
    <article class="case-card" data-case-idx="${i}">
      <div class="case-num">${['壹','贰','叁'][i]}</div>
      <div class="case-cat">${c.cat}</div>
      <h3 class="case-title">${c.title}</h3>
      <div class="case-poem">${c.poem}</div>
      <div class="case-meta">
        <span>${c.metaCity}</span>
        <span>${c.metaSeason}</span>
      </div>
      <div class="case-card-cta">
        生成方案 <span class="arrow">→</span>
      </div>
    </article>
  `).join('');

  document.querySelectorAll('.case-card').forEach(card => {
    card.addEventListener('click', async () => {
      STATE.caseIdx = parseInt(card.dataset.caseIdx);
      STATE.planIdx = 0;
      STATE._livePlan = null;
      document.getElementById('user-query').value = cases[STATE.caseIdx].query;
      await _handleGenerate();
    });
  });

  // 横向拖拽
  enableDragScroll(grid);
}

async function _handleGenerate() {
  const query = document.getElementById('user-query').value.trim();
  await runGenerateRitual();
  if (query) {
    const realPlan = await Adapter.planFromQuery(query);
    if (realPlan?.plans?.length) {
      STATE._livePlan = realPlan;
      await switchView('compare');
      return;
    }
  }
  STATE._livePlan = null;
  await switchView('compare');
}

document.getElementById('cta-go').addEventListener('click', _handleGenerate);

document.getElementById('user-query').addEventListener('keydown', async (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    await _handleGenerate();
  }
});

// 输入框文字变化时实时识别时空约束 → chips
document.getElementById('user-query').addEventListener('input', _refreshIntentChips);
function _refreshIntentChips() {
  const text = document.getElementById('user-query').value || '';
  const constraints = _extractConstraints(text);
  const el = document.getElementById('intent-chips');
  _renderIntentChips(el, constraints);
}
function _renderIntentChips(el, constraints) {
  if (!el) return;
  if (!constraints.length) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  el.innerHTML = `<span class="ic-lead">已识别</span>` +
    constraints.map(c => `
      <span class="ic-chip t-${c.type}">
        <span class="ic-key">${c.label}</span>
        <span class="ic-val">${c.value}</span>
      </span>
    `).join('');
}

document.querySelectorAll('.persona-chip').forEach(chip => {
  chip.addEventListener('click', () => chip.classList.toggle('active'));
});


// ====================================================
// 卡片横向滑动 · 鼠标拖拽 + 圆点指示器   @owner T1
// ====================================================
function enableDragScroll(track) {
  let isDown = false, startX = 0, startScroll = 0, moved = false;
  track.addEventListener('mousedown', e => {
    isDown = true; moved = false;
    startX = e.pageX - track.offsetLeft;
    startScroll = track.scrollLeft;
    track.classList.add('dragging');
  });
  ['mouseleave', 'mouseup'].forEach(evt =>
    track.addEventListener(evt, () => {
      isDown = false;
      track.classList.remove('dragging');
    })
  );
  track.addEventListener('mousemove', e => {
    if (!isDown) return;
    const x = e.pageX - track.offsetLeft;
    const walk = (x - startX);
    if (Math.abs(walk) > 4) moved = true;
    track.scrollLeft = startScroll - walk;
  });
  // 拖完后如果有移动，阻止下一次 click 触发（防误进 case/plan）
  track.addEventListener('click', e => {
    if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
  }, true);
}

function setupPlansDots() {
  const track = document.getElementById('plans-stage');
  const dots  = document.getElementById('plans-dots');
  if (!track || !dots) return;
  const cards = track.querySelectorAll('.plan-card');
  if (!cards.length) { dots.innerHTML = ''; return; }

  // Mobile 才显示圆点（桌面三列已经一眼看完）
  const showDots = window.innerWidth <= 900;
  dots.innerHTML = showDots ? Array.from(cards).map((_, i) =>
    `<button class="plans-dot ${i === 0 ? 'active' : ''}" data-dot="${i}" aria-label="方案 ${i+1}"></button>`
  ).join('') : '';
  if (!showDots) return;

  const onScroll = () => {
    const center = track.scrollLeft + track.clientWidth / 2;
    let nearest = 0, minD = Infinity;
    cards.forEach((c, i) => {
      const mid = c.offsetLeft + c.clientWidth / 2;
      const d = Math.abs(mid - center);
      if (d < minD) { minD = d; nearest = i; }
    });
    dots.querySelectorAll('.plans-dot').forEach((d, i) =>
      d.classList.toggle('active', i === nearest)
    );
  };
  track.addEventListener('scroll', onScroll, { passive: true });

  dots.querySelectorAll('.plans-dot').forEach(d => {
    d.addEventListener('click', () => {
      const idx = +d.dataset.dot;
      const card = cards[idx];
      if (card) track.scrollTo({ left: card.offsetLeft - (track.clientWidth - card.clientWidth) / 2, behavior: 'smooth' });
    });
  });
}


// ====================================================
// COMPARE · 3 plan cards   @owner T2
// ====================================================
async function renderCompare() {
  // 如果有真实规划结果 → 优先使用
  if (STATE._livePlan?.plans?.length) {
    return _renderLiveCompare(STATE._livePlan);
  }

  const caseId = await _currentCaseId();
  const view   = await Adapter.getCompareView(caseId);
  if (!view) return;

  document.getElementById('compare-query').textContent = view.query;
  // 优先用 Settings 里用户自定义的 Agent 团；否则用 case 默认
  const userAgents = Settings.get('profile.activePersonas') || [];
  const personasToShow = userAgents.length ? userAgents : view.activePersonas;
  const personasEl = document.getElementById('compare-personas');
  personasEl.textContent = personasToShow.map(p => PERSONA_MAP[p]).join(' · ');
  if (userAgents.length) personasEl.title = '已应用你在「设置 · 画像」里配置的 Agent 团';

  // 时空约束识别（用 hero 输入框的内容；若空则用 case.query）
  const queryText = document.getElementById('user-query')?.value?.trim() || view.query;
  _renderIntentChips(
    document.getElementById('compare-intent-chips'),
    _extractConstraints(queryText)
  );

  // 个性化提示（登录且有 image 才出现）
  const hint = document.getElementById('compare-personal-hint');
  if (hint) hint.remove();
  if (view.personalized) {
    const div = document.createElement('div');
    div.id = 'compare-personal-hint';
    div.className = 'compare-personal-hint';
    div.innerHTML = `🌟 我记得你 ── <em>${view.userSummary || ''}</em> ── 顺序已经帮你排过`;
    document.querySelector('.compare-header').appendChild(div);
  }

  const stage = document.getElementById('plans-stage');
  stage.innerHTML = view.plans.map((p, i) => {
    const dominantTags = p.dominant.map(d =>
      `<span class="plan-persona-tag dominant">${PERSONA_MAP[d]}</span>`
    ).join('');
    const secondaryTags = p.secondary.map(s =>
      `<span class="plan-persona-tag">${PERSONA_MAP[s]}</span>`
    ).join('');

    const chaptersPreview = p.chaptersPreview.map(ch => `
      <div class="plan-chapter-item">
        <span class="pci-num">${ch.num}</span>
        <span class="pci-time">${ch.time}</span>
        <span class="pci-name">${stripBookmarks(ch.title)}</span>
        <span class="pci-tag">${ch.mood}</span>
      </div>
    `).join('');

    const more = p.chaptersCount > p.chaptersPreview.length
      ? `<div class="plan-chapter-item" style="opacity:.5; margin-top:4px;"><span class="pci-num"></span><span class="pci-time"></span><span class="pci-name">…还有 ${p.chaptersCount - p.chaptersPreview.length} 个节点</span></div>`
      : '';

    const debateLines = p.debate.map(d => `
      <div class="debate-line"><span class="debate-speaker">${d.who}：</span>${d.text}</div>
    `).join('');

    const bestBadge = p.bestFit
      ? `<div class="plan-card-best"><span class="plan-card-best-star">🌟</span>最 适 合 你</div>`
      : '';

    return `
      <article class="plan-card" data-plan-idx="${i}">
        ${bestBadge}
        <div class="plan-card-top">
          <div class="plan-volume">
            <span>方 案 ${['一','二','三'][i]}</span>
            <span class="plan-vol-num">${p.volume}</span>
          </div>
          <h3 class="plan-title">${p.title}</h3>
          <div class="plan-personas">
            ${dominantTags}${secondaryTags}
          </div>
        </div>
        <div class="plan-card-body">
          <div class="plan-stance">${p.stance}</div>
          <div class="plan-stats">
            <div class="plan-stat">
              <div class="plan-stat-num">${p.time}</div>
              <div class="plan-stat-label">时 长</div>
            </div>
            <div class="plan-stat">
              <div class="plan-stat-num">${p.budget}</div>
              <div class="plan-stat-label">花 费</div>
            </div>
            <div class="plan-stat">
              <div class="plan-stat-num">${p.chaptersCount}</div>
              <div class="plan-stat-label">节 点</div>
            </div>
          </div>
          <div class="plan-radar-wrap">${_renderPersonaRadar(p)}</div>
          <div class="plan-chapters">${chaptersPreview}${more}</div>
          <div class="plan-debate">
            <div class="plan-debate-label">他们怎么说</div>
            ${debateLines}
          </div>
        </div>
        <div class="plan-card-foot">
          <span>翻开看看</span>
          <span class="arrow">→</span>
        </div>
      </article>
    `;
  }).join('');

  document.querySelectorAll('.plan-card').forEach(card => {
    card.addEventListener('click', async () => {
      STATE.planIdx = parseInt(card.dataset.planIdx);
      await switchView('detail');
    });
  });

  // 启用拖拽 + 指示器（每次重渲染都重新挂）
  enableDragScroll(stage);
  setupPlansDots();
}


// ====================================================
// LIVE PLAN RENDERING (真实规划数据)
// ====================================================
function _renderLiveCompare(lp) {
  document.getElementById('compare-query').textContent = lp.query;
  const personasEl = document.getElementById('compare-personas');
  const pIds = lp.intent?.personas || [];
  personasEl.textContent = pIds.map(p => PERSONA_MAP[p] || p).join(' · ');

  _renderIntentChips(
    document.getElementById('compare-intent-chips'),
    _extractConstraints(lp.query)
  );

  const stage = document.getElementById('plans-stage');
  stage.innerHTML = lp.plans.map((p, i) => {
    const dominantTags = (p.dominant || []).map(d =>
      `<span class="plan-persona-tag dominant">${PERSONA_MAP[d] || d}</span>`
    ).join('');
    const secondaryTags = (p.secondary || []).map(s =>
      `<span class="plan-persona-tag">${PERSONA_MAP[s] || s}</span>`
    ).join('');

    const chapters = (p.chaptersData || []).slice(0, 4).map(ch => `
      <div class="plan-chapter-item">
        <span class="pci-num">${ch.num || ''}</span>
        <span class="pci-time">${ch.time || ''}</span>
        <span class="pci-name">${stripBookmarks(ch.title || '')}</span>
        <span class="pci-tag">${ch.mood || ''}</span>
      </div>
    `).join('');

    const debateLines = (p.debate || []).map(d => `
      <div class="debate-line"><span class="debate-speaker">${d.who}：</span>${d.text}</div>
    `).join('');

    return `
      <article class="plan-card" data-plan-idx="${i}">
        <div class="plan-card-top">
          <div class="plan-volume">
            <span>方 案 ${['一','二','三'][i] || i+1}</span>
            <span class="plan-vol-num">${p.volume || ['壹','贰','叁'][i]}</span>
          </div>
          <h3 class="plan-title">${p.title || ''}</h3>
          <div class="plan-personas">${dominantTags}${secondaryTags}</div>
        </div>
        <div class="plan-card-body">
          <div class="plan-stance">${p.stance || ''}</div>
          <div class="plan-stats">
            <div class="plan-stat">
              <div class="plan-stat-num">${p.time || '—'}</div>
              <div class="plan-stat-label">时 长</div>
            </div>
            <div class="plan-stat">
              <div class="plan-stat-num">${p.budget || '—'}</div>
              <div class="plan-stat-label">花 费</div>
            </div>
            <div class="plan-stat">
              <div class="plan-stat-num">${(p.chaptersData || []).length}</div>
              <div class="plan-stat-label">节 点</div>
            </div>
          </div>
          <div class="plan-chapters">${chapters}</div>
          ${debateLines ? `<div class="plan-debate"><div class="plan-debate-label">他们怎么说</div>${debateLines}</div>` : ''}
        </div>
        <div class="plan-card-foot">
          <span>翻开看看</span><span class="arrow">→</span>
        </div>
      </article>
    `;
  }).join('');

  document.querySelectorAll('.plan-card').forEach(card => {
    card.addEventListener('click', async () => {
      STATE.planIdx = parseInt(card.dataset.planIdx);
      await switchView('detail');
    });
  });
  enableDragScroll(stage);
  setupPlansDots();
}

async function _renderLiveDetail() {
  const lp = STATE._livePlan;
  const plan = lp.plans[STATE.planIdx];
  if (!plan) return;

  document.getElementById('detail-volume-num').textContent = plan.volume || '壹';
  document.getElementById('detail-stance').textContent     = plan.stance || '';
  document.getElementById('detail-title').innerHTML        = plan.title || '';
  document.getElementById('detail-subtitle').textContent   = plan.subtitle || '';
  document.getElementById('stat-time').textContent         = plan.time || '—';
  document.getElementById('stat-budget').textContent       = plan.budget || '—';

  const chapters = (plan.chaptersData || []).map((ch, idx) => ({
    ...ch,
    idx,
    num: ch.num || ['壹','贰','叁','肆','伍','陆'][idx] || `${idx+1}`,
    mood: (ch.mood || '').replace(/章$/, ''),
    lngLat: ch.coords ? AMapAPI.pctToLngLat(ch.coords, 'wukang') : { lng: 121.43, lat: 31.21 },
    poi: ch._poi || null,
    queue: ch.queue || null,
    deals: ch.deals || [],
    reservable: ch.type === 'eat',
  }));

  document.getElementById('stat-chapters').textContent = chapters.length + ' 章';

  const narEl = document.getElementById('detail-narrative');
  if (narEl) narEl.textContent = plan.narrativeArc ? '"' + plan.narrativeArc + '"' : '—';

  STATE.draftChapters = JSON.parse(JSON.stringify(chapters));
  STATE._detailKey = 'live#' + STATE.planIdx;
  _poiSheetUGC = null;

  renderDebate({ debate: plan.debate || [], debateFinal: plan.debateFinal || '' });
  renderChatHistory();

  const mapCfg = await _patchMapWithDraft({
    provider: !!(window.LU_CONFIG?.amapKey) ? 'amap' : 'mock',
    amap: { center: [121.43, 31.21], zoom: 14 },
    mock: { roads: [], parks: [], mapKey: 'wukang', chapters },
  }, chapters, 'live');

  await renderMap(mapCfg);
  renderChapters(chapters);
  _bindUndoRedoOnce();
  _refreshUndoRedoBtns();
}


// ====================================================
// DETAIL · cover + map + chapters + ugc (并行加载)   @owner T3 (整页含 map/chapters/pitfall/meituan/ugc/ai-chat)
// ====================================================
async function renderDetail() {
  if (STATE._livePlan?.plans?.length) {
    return _renderLiveDetail();
  }
  const caseId = await _currentCaseId();
  const planId = await _currentPlanId();
  const detailKey = `${caseId}#${planId}`;
  // 切到新方案时清理本地编辑态
  if (STATE._detailKey !== detailKey) {
    STATE._detailKey = detailKey;
    _resetDetailDrafts();
  }

  // 并行拉所有数据
  const [detail, ugc, mapCfg] = await Promise.all([
    Adapter.getPlanDetail(caseId, planId),
    Adapter.getPlanUGC(caseId, planId),
    Adapter.getMapConfig(caseId, planId),
  ]);
  if (!detail) return;

  // 章节：优先用 draft，否则用 adapter 返回
  if (!STATE.draftChapters) {
    STATE.draftChapters = JSON.parse(JSON.stringify(detail.chapters));
  }
  const chapters = STATE.draftChapters;

  // ---- Cover ----
  document.getElementById('detail-volume-num').textContent = detail.volume;
  document.getElementById('detail-stance').textContent     = detail.stance;
  document.getElementById('detail-title').innerHTML        = detail.title;
  document.getElementById('detail-subtitle').textContent   = detail.subtitle;
  document.getElementById('stat-time').textContent         = detail.time;
  document.getElementById('stat-budget').textContent       = detail.budget;
  document.getElementById('stat-chapters').textContent     = chapters.length + ' 章';

  // ---- 叙事弧（在 cover 左侧）----
  const narEl = document.getElementById('detail-narrative');
  if (narEl) {
    narEl.textContent = detail.narrativeArc ? '"' + detail.narrativeArc + '"' : '—';
  }

  renderDebate(detail);
  renderChatHistory();

  // 缓存 UGC 数据供 POI Sheet 使用
  _poiSheetUGC = ugc;

  // mapCfg 需要按当前 draft 更新（节点变了）
  const updatedMapCfg = await _patchMapWithDraft(mapCfg, chapters, caseId);
  await renderMap(updatedMapCfg);
  renderChapters(chapters);
  _bindUndoRedoOnce();
  _refreshUndoRedoBtns();
}

let _undoRedoBound = false;
function _bindUndoRedoOnce() {
  if (_undoRedoBound) return;
  _undoRedoBound = true;
  document.getElementById('btn-undo')?.addEventListener('click', () => _undoDraft());
  document.getElementById('btn-redo')?.addEventListener('click', () => _redoDraft());
  // 键盘快捷键 (仅在 detail view 触发)
  document.addEventListener('keydown', e => {
    if (STATE.view !== 'detail') return;
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return; // 输入框里不拦
    const cmd = e.metaKey || e.ctrlKey;
    if (!cmd) return;
    if (e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      _undoDraft();
    } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
      e.preventDefault();
      _redoDraft();
    }
  });
}

async function _patchMapWithDraft(cfg, chapters, caseId) {
  if (!cfg) return cfg;
  const newCfg = JSON.parse(JSON.stringify(cfg));
  if (newCfg.mock) newCfg.mock.chapters = chapters;
  const mapKey = newCfg.mock?.mapKey || 'wukang';
  newCfg.markers = await Promise.all(chapters.map(async (ch, i) => ({
    idx: i + 1,
    ...(await AMapAPI.resolveLngLat(ch, mapKey)),
    type: ch.type,
    label: ch.title.split(' · ')[0],
  })));
  const route = await AMapAPI.planRoute(
    newCfg.markers.map(m => ({ lng: m.lng, lat: m.lat })), 'walking'
  ).catch(() => null);
  newCfg.route = route;
  return newCfg;
}


// ----------------------------------------------------
// MAP · cfg.provider 决定走真实 AMap 还是 SVG 占位
// ----------------------------------------------------
let _currentMapHandle = null; // 缓存 AMap 实例以便 destroy
async function renderMap(cfg) {
  const container = document.getElementById('map-container');
  if (!cfg) { container.innerHTML = ''; return; }

  // 切换前清理上一个 AMap 实例
  if (_currentMapHandle?.destroy) {
    _currentMapHandle.destroy();
    _currentMapHandle = null;
  }

  // ===== 真实 AMap 分支 =====
  if (cfg.provider === 'amap' && cfg.amap) {
    container.innerHTML = ''; // 清空旧 SVG
    container.classList.add('amap-active');
    _currentMapHandle = await AMapAPI.renderInteractiveMap(container, {
      center:   cfg.amap.center,
      zoom:     cfg.amap.zoom,
      markers:  cfg.markers,
      polyline: cfg.route?.polyline,
    });
    if (_currentMapHandle) return; // 成功 → 直接返回
    // 失败 → 落到 SVG 兜底
    container.classList.remove('amap-active');
  } else {
    container.classList.remove('amap-active');
  }

  // ===== SVG 占位分支 =====
  const mock = cfg.mock;
  const W = 600, H = 750;
  const sx = v => (v / 100) * W;
  const sy = v => (v / 100) * H;

  const ROAD_STYLE = {
    arterial: { fill: '#EEE3CB', casing: '#D6C8A6', w: 14, cw: 18, font: 13, lc: '#7A6852' },
    street:   { fill: '#F2E8D2', casing: '#DCCFAE', w: 9,  cw: 12, font: 11, lc: '#8A7860' },
    alley:    { fill: '#F5EEDC', casing: null,      w: 5,  cw: 0,  font: 10, lc: '#9A8870' },
    water:    { fill: '#BFD1DA', casing: null,      w: 20, cw: 0,  font: 12, lc: '#5C7A85' },
  };

  let casings = '', fills = '', labels = '';
  mock.roads.forEach(r => {
    const st = ROAD_STYLE[r.class] || ROAD_STYLE.street;
    const d  = scalePath(r.d, W, H);
    if (st.casing) casings += `<path d="${d}" fill="none" stroke="${st.casing}" stroke-width="${st.cw}" stroke-linecap="round" stroke-linejoin="round"/>`;
    fills += `<path d="${d}" fill="none" stroke="${st.fill}" stroke-width="${st.w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (r.name) {
      const lx = sx(r.labelX != null ? r.labelX : 50);
      const ly = sy(r.labelY != null ? r.labelY : 50);
      const trans = r.vertical ? `rotate(-90 ${lx} ${ly})` : '';
      labels += `<text x="${lx}" y="${ly}" transform="${trans}" font-family="'Noto Sans SC',sans-serif" font-size="${st.font}" fill="${st.lc}" text-anchor="middle" letter-spacing="0.06em" font-weight="500" paint-order="stroke" stroke="#F5EFE0" stroke-width="3">${r.name}</text>`;
    }
  });

  let parks = '';
  (mock.parks || []).forEach(p => {
    const pts = p.points.split(' ').map(pt => {
      const [x, y] = pt.split(',').map(Number);
      return `${sx(x).toFixed(0)},${sy(y).toFixed(0)}`;
    });
    const xs = p.points.split(' ').map(pt => parseFloat(pt.split(',')[0]));
    const ys = p.points.split(' ').map(pt => parseFloat(pt.split(',')[1]));
    const cx = sx(xs.reduce((a,b)=>a+b,0)/xs.length);
    const cy = sy(ys.reduce((a,b)=>a+b,0)/ys.length);
    parks += `<polygon points="${pts.join(' ')}" fill="#D8E4CB" stroke="#B5C5A6" stroke-width="0.5"/>`;
    parks += `<text x="${cx}" y="${cy+4}" text-anchor="middle" font-family="'Noto Sans SC',sans-serif" font-size="10" fill="#5C7050" letter-spacing="0.05em" paint-order="stroke" stroke="#D8E4CB" stroke-width="2">${p.name}</text>`;
  });

  // 路线 + 节点
  const pts = mock.chapters.map(ch => ({ x: sx(ch.coords.x), y: sy(ch.coords.y) }));
  let routePath = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i-1], b = pts[i];
    routePath += ` Q ${(a.x+b.x)/2},${(a.y+b.y)/2} ${b.x},${b.y}`;
  }

  const PIN_COLOR = { eat: '#2C5F4A', rest: '#B8893A', photo: '#C8462C' };
  let pins = '';
  mock.chapters.forEach((ch, i) => {
    const c = PIN_COLOR[ch.type] || PIN_COLOR.photo;
    const isIgnoreState = STATE.pitfallStates && STATE.pitfallStates[i] === 'ignore';
    // 不避节点：在针下方加红色虚线警示晕圈 + 脉冲
    const warningHalo = isIgnoreState ? `
      <g class="warn-halo">
        <circle cx="0" cy="-12" r="22" fill="none" stroke="#A33B28" stroke-width="1.5" stroke-dasharray="3,2" opacity="0.85"/>
        <circle cx="0" cy="-12" r="28" fill="none" stroke="#A33B28" stroke-width="1" opacity="0.45" class="warn-halo-pulse"/>
        <g transform="translate(14,-26)">
          <circle r="7" fill="#A33B28" stroke="#FBF6E9" stroke-width="1.5"/>
          <text y="3" text-anchor="middle" font-family="serif" font-weight="900" font-size="10" fill="#FBF6E9">!</text>
        </g>
      </g>
    ` : '';
    pins += `
      <g transform="translate(${pts[i].x},${pts[i].y})" class="pin-group" data-pin-idx="${i}" style="cursor:pointer">
        ${warningHalo}
        <g class="pin" style="animation-delay:${0.2 + i*0.1}s">
          <ellipse cx="0" cy="3" rx="10" ry="2.5" fill="rgba(20,15,10,0.22)"/>
          <path d="M 0,2 L -12,-20 A 14 14 0 1 1 12,-20 Z" fill="${c}" stroke="#1A1410" stroke-width="1"/>
          <circle cx="0" cy="-22" r="9" fill="#FBF6E9" stroke="#1A1410" stroke-width="0.6"/>
          <text x="0" y="-18" text-anchor="middle" font-family="'EB Garamond',serif" font-weight="700" font-size="14" fill="#1A1410">${i+1}</text>
        </g>
      </g>
    `;
  });

  const eta = cfg.route
    ? `${Math.round(cfg.route.total_distance_m)} m · 步行约 ${Math.round(cfg.route.total_duration_s / 60)} 分钟`
    : '路径估算中…';

  // 建筑色块（在路面之间填充淡灰色矩形，让地图更像真实底图）
  const buildings = _generateMockBuildings(W, H);

  // 当前位置（蓝点，靠近第一个 pin）
  const curLoc = pts[0]
    ? { x: pts[0].x - 36, y: pts[0].y + 20 }
    : { x: W/2, y: H/2 };

  container.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="mapGrid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(60,40,20,0.025)" stroke-width="1"/>
        </pattern>
        <radialGradient id="curLocPulse" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#4A90E2" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#4A90E2" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="#F5EFE0"/>
      <rect width="${W}" height="${H}" fill="url(#mapGrid)"/>
      <g class="buildings">${buildings}</g>
      <g class="parks">${parks}</g>
      <g class="road-casings">${casings}</g>
      <g class="road-fills">${fills}</g>
      <g class="road-labels">${labels}</g>
      <path d="${routePath}" fill="none" stroke="rgba(255,255,255,0.75)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${routePath}" fill="none" stroke="#C8462C" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" class="route-line"/>
      <g class="pins">${pins}</g>

      <!-- 当前位置（蓝点 + 呼吸光晕 · 模仿 AMap "我在这里"） -->
      <g transform="translate(${curLoc.x},${curLoc.y})" class="cur-loc">
        <circle r="28" fill="url(#curLocPulse)" class="cur-loc-pulse"/>
        <circle r="6" fill="#4A90E2" stroke="#FFFFFF" stroke-width="2"/>
      </g>

      <!-- 指北针（top-left） -->
      <g transform="translate(28,32)">
        <circle r="13" fill="rgba(255,255,255,0.92)" stroke="#998871" stroke-width="0.6"/>
        <polygon points="0,-9 -3,3 0,0 3,3" fill="#C8462C"/>
        <text y="-15" text-anchor="middle" font-family="'EB Garamond',serif" font-style="italic" font-size="10" fill="#1A1410">N</text>
      </g>

      <!-- 比例尺 + attribution -->
      <g transform="translate(12,${H-14})">
        <text font-family="'Noto Sans SC',sans-serif" font-size="9" fill="#998871" letter-spacing="0.05em">
          地图占位 · 待接 ${cfg.amap?.name || '高德 AMap'} · ${eta}
        </text>
      </g>
      <g transform="translate(${W-130},${H-14})">
        <line x1="0" y1="0" x2="40" y2="0" stroke="#1A1410" stroke-width="1.5"/>
        <line x1="0" y1="-3" x2="0" y2="3" stroke="#1A1410" stroke-width="1.2"/>
        <line x1="40" y1="-3" x2="40" y2="3" stroke="#1A1410" stroke-width="1.2"/>
        <text x="44" y="3" font-family="'EB Garamond',serif" font-size="10" fill="#1A1410">200 m</text>
      </g>
    </svg>

    <!-- AMap mock 控件（DOM 层，覆盖在 SVG 上） -->
    <div class="amap-mock-controls">
      <button class="amap-mock-ctrl" data-zoom="in" title="放大">+</button>
      <button class="amap-mock-ctrl" data-zoom="out" title="缩小">−</button>
    </div>
    <button class="amap-mock-locate" title="回到我的位置">⊙</button>
    <style>
      .route-line { stroke-dasharray: 2500; stroke-dashoffset: 2500; animation: drawRoute 2s ease-out 0.2s forwards; }
      @keyframes drawRoute { to { stroke-dashoffset: 0; } }
      .pin { animation: pinDrop 0.55s cubic-bezier(0.16,1,0.3,1) backwards; transform-box: fill-box; transform-origin: center 100%; }
      @keyframes pinDrop { from { opacity: 0; transform: translateY(-22px) scale(0.6); } to { opacity: 1; transform: translateY(0) scale(1); } }
      .cur-loc-pulse { animation: locPulse 2s ease-in-out infinite; transform-origin: center; }
      @keyframes locPulse { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.4); } }
      .warn-halo-pulse { transform-origin: center; transform-box: fill-box; animation: warnPulse 1.6s ease-in-out infinite; }
      @keyframes warnPulse { 0%, 100% { opacity: 0.45; transform: scale(1); } 50% { opacity: 0.15; transform: scale(1.18); } }
      .pin-group .pin { transition: transform .25s var(--ease-out), filter .25s; transform-origin: center bottom; transform-box: fill-box; }
      .pin-group.linked-hover .pin { transform: scale(1.35); filter: drop-shadow(0 6px 14px rgba(216, 85, 64, 0.6)); }
      .pin-group.linked-hover .warn-halo { opacity: 0.5; }
    </style>
  `;

  // 绑定 mock 控件
  container.querySelectorAll('[data-zoom]').forEach(b => {
    b.addEventListener('click', () => {
      showToast(b.dataset.zoom === 'in' ? '已放大（待接真实 AMap）' : '已缩小（待接真实 AMap）');
    });
  });
  container.querySelector('.amap-mock-locate')?.addEventListener('click', () => {
    showToast('已定位到「这里」（mock）');
  });

  // —— 联动 ↔ 章节卡：地图针 hover → 高亮对应章节 ——
  container.querySelectorAll('.pin-group').forEach(pg => {
    const i = pg.dataset.pinIdx;
    pg.addEventListener('mouseenter', () => _linkHover(i, true));
    pg.addEventListener('mouseleave', () => _linkHover(i, false));
    pg.addEventListener('click', () => openPOISheet(+i));
  });
}

function scalePath(d, W, H) {
  return d.replace(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/g, (m, x, y) =>
    `${(parseFloat(x) / 100 * W).toFixed(1)},${(parseFloat(y) / 100 * H).toFixed(1)}`
  );
}

// 生成模拟建筑色块 ── 在路网网格里随机填充淡灰色矩形
function _generateMockBuildings(W, H) {
  const cells = [];
  const cols = 6, rows = 8;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // 60% 概率有建筑
      if (Math.random() > 0.4) {
        const cellW = W / cols;
        const cellH = H / rows;
        const margin = 4 + Math.random() * 6;
        const x = c * cellW + margin;
        const y = r * cellH + margin;
        const w = cellW - margin * 2 - Math.random() * 8;
        const h = cellH - margin * 2 - Math.random() * 8;
        const opacity = 0.35 + Math.random() * 0.25;
        cells.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="#EBE0C5" opacity="${opacity.toFixed(2)}" rx="2"/>`);
      }
    }
  }
  return cells.join('');
}


// ----------------------------------------------------
// CHAPTERS · compact cards (click to open bottom sheet)
// ----------------------------------------------------
function renderChapters(chapters) {
  const scroll = document.getElementById('chapter-scroll');
  if (!chapters.length) {
    scroll.innerHTML = `<div style="padding:30px;text-align:center;color:var(--ink-light);font-family:var(--f-serif);">所有章节都被你删完了 ── 用上方的 AI 输入框重新生成一条吧</div>`;
    return;
  }
  scroll.innerHTML = chapters.map((ch, i) => {
    const real = _findRealPOIForSheet(ch.title);
    const rating = real?.avg_rating || ch.poi?.avg_rating || 0;
    const reviewCount = real?.review_count || 0;

    let queuePill = '';
    if (ch.type !== 'photo' && ch.queue) {
      const wait = ch.queue.wait_minutes_est || 0;
      const len = ch.queue.queue_length || 0;
      if (wait >= 30) queuePill = `<span class="ch-queue-pill busy">排${len}人·${wait}min</span>`;
      else if (wait <= 5) queuePill = `<span class="ch-queue-pill empty">免排队</span>`;
      else queuePill = `<span class="ch-queue-pill">${len}人·${wait}min</span>`;
    }

    const ratingPill = rating > 0
      ? `<span class="ch-queue-pill" style="color:var(--vermilion);border-color:var(--vermilion);font-weight:600;">${Number(rating).toFixed(1)}★${reviewCount ? ' ' + (reviewCount > 1000 ? (reviewCount/1000).toFixed(1) + 'k' : reviewCount) + '评' : ''}</span>`
      : '';

    return `
      <div class="chapter" data-ch-idx="${i}" style="animation: chapterIn 0.4s var(--ease-out) ${0.05 + i*0.05}s backwards;">
        <div class="chapter-num">${ch.num}</div>
        <div class="chapter-compact-body">
          <span class="ch-time">${ch.time}</span>
          <span class="ch-title-compact">${ch.title.split(' · ')[0]}</span>
          <span class="ch-mood">${ch.mood}</span>
          ${ratingPill}
          ${queuePill}
        </div>
        <span class="ch-arrow">›</span>
      </div>
    `;
  }).join('');

  _bindChapterClick();
  _bindChapterMapLink();
}

function _bindChapterClick() {
  document.querySelectorAll('.chapter[data-ch-idx]').forEach(card => {
    card.addEventListener('click', () => {
      const idx = +card.dataset.chIdx;
      openPOISheet(idx);
    });
  });
}

// —— 章节卡 ↔ 地图针 联动 ——
function _bindChapterMapLink() {
  document.querySelectorAll('.chapter[data-ch-idx]').forEach(card => {
    const i = card.dataset.chIdx;
    card.addEventListener('mouseenter', () => _linkHover(i, true));
    card.addEventListener('mouseleave', () => _linkHover(i, false));
  });
}
function _linkHover(i, on) {
  const chapter = document.querySelector(`.chapter[data-ch-idx="${i}"]`);
  const pin     = document.querySelector(`.pin-group[data-pin-idx="${i}"]`);
  chapter?.classList.toggle('linked-hover', on);
  pin?.classList.toggle('linked-hover', on);
}
function _scrollChapterIntoView(i) {
  const ch = document.querySelector(`.chapter[data-ch-idx="${i}"]`);
  if (ch) ch.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ----------------------------------------------------
// 多类避坑徽章 (time / menu / ops / context)
// ----------------------------------------------------
const PITFALL_TYPE = {
  time:    { label: '时段', icon: '⏱' },
  menu:    { label: '菜单', icon: '🥢' },
  ops:     { label: '门店', icon: '⚙' },
  context: { label: '场景', icon: '☂' },
};
function _renderPitfallExtras(extras) {
  if (!extras || !extras.length) return '';
  const chips = extras.map(p => {
    const meta = PITFALL_TYPE[p.type] || { label: '提示', icon: '·' };
    return `<span class="pf-extra pf-${p.type}" title="${meta.label}">
      <span class="pf-icon">${meta.icon}</span>
      <span class="pf-label">${meta.label}</span>
      <span class="pf-text">${p.text}</span>
    </span>`;
  }).join('');
  return `<div class="pf-extras-row">${chips}</div>`;
}

// ----------------------------------------------------
// MEITUAN 转化条 渲染
// ----------------------------------------------------
function _renderMeituanRow(ch, i) {
  // 拍照类 / 没有 Meituan 数据 → 不显示
  if (ch.type === 'photo' || !ch.queue) return '';

  // 排队（peak periods 配合预测）
  const wait = ch.queue.wait_minutes_est || 0;
  const len  = ch.queue.queue_length || 0;
  let queueClass = 'mt-queue';
  let queueText;
  if (wait >= 30) { queueClass += ' busy'; queueText = `排队 ${len} 人 · 约 ${wait}min`; }
  else if (wait <= 5) { queueClass += ' empty'; queueText = '现在不排队'; }
  else { queueText = `排队 ${len} 人 · 约 ${wait}min`; }

  // 团购券
  const deal = ch.deals && ch.deals[0];
  const dealTag = deal ? `
    <button class="mt-tag mt-deal" data-deal-i="${i}" title="${deal.title}">
      <span class="mt-icon">¥</span>
      <span class="mt-price-strike">${deal.list_price}</span>
      <span><strong>${deal.sale_price}</strong></span>
      <span class="mt-save">省 ${deal.list_price - deal.sale_price}</span>
    </button>
  ` : '';

  // 预约（餐厅类）
  const reserveTag = ch.reservable ? `
    <button class="mt-tag mt-reserve" data-reserve-i="${i}">+ 一键预约</button>
  ` : '';

  return `
    <div class="meituan-row">
      <span class="mt-tag ${queueClass}"><span class="mt-icon">⏱</span>${queueText}</span>
      ${dealTag}
      ${reserveTag}
      <span class="mt-source">美团</span>
    </div>
  `;
}

function _bindMeituanActions() {
  document.querySelectorAll('.mt-deal').forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation();
      const i = +b.dataset.dealI;
      const ch = STATE.draftChapters[i];
      const deal = ch?.deals?.[0];
      if (deal) {
        showToast(`已加入美团购物车 · 「${deal.title}」 立省 <em>¥${deal.list_price - deal.sale_price}</em>`);
      }
    });
  });
  document.querySelectorAll('.mt-reserve').forEach(b => {
    b.addEventListener('click', async e => {
      e.stopPropagation();
      const i = +b.dataset.reserveI;
      const ch = STATE.draftChapters[i];
      // 拉真实时段（mock）
      const slots = await Meituan.getReservationSlots(`${ch.title}#${ch.num}`);
      const earliest = slots?.[0];
      if (earliest) {
        const t = earliest.slot_time.slice(11, 16);
        showToast(`「${ch.title}」最早可订 <em>${t}</em> · 已为你保留座位（demo）`);
      } else {
        showToast('已为你查询美团预约时段');
      }
    });
  });
}

function _pitfallConsequence(pitfall = '') {
  if (pitfall.includes('排队')) return '到场后排队 60-90 分钟';
  if (pitfall.includes('客满') || pitfall.includes('满')) return '到场后无法入座';
  if (pitfall.includes('停止') || pitfall.includes('停')) return '到时无法点单 / 外带';
  if (pitfall.includes('客流') || pitfall.includes('高峰') || pitfall.includes('人多')) return '人流密集，拍照体验下降';
  return '体验大幅下降';
}

function _bindChapterMenus() {
  document.querySelectorAll('.ch-menu-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const idx = btn.dataset.chMenu;
      const menu = document.querySelector(`.ch-menu[data-ch-menu-content="${idx}"]`);
      const isOpen = menu.classList.contains('open');
      // 关闭其他
      document.querySelectorAll('.ch-menu').forEach(m => m.classList.remove('open'));
      document.querySelectorAll('.ch-menu-btn').forEach(b => b.classList.remove('open'));
      if (!isOpen) {
        menu.classList.add('open');
        btn.classList.add('open');
      }
    });
  });
  document.querySelectorAll('.ch-menu button').forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation();
      const action = b.dataset.chAction;
      const i = +b.dataset.chI;
      handleChapterAction(action, i);
    });
  });
  // 点空白关闭所有菜单
  document.addEventListener('click', _closeAllChMenus);
}
function _closeAllChMenus() {
  document.querySelectorAll('.ch-menu').forEach(m => m.classList.remove('open'));
  document.querySelectorAll('.ch-menu-btn').forEach(b => b.classList.remove('open'));
}

async function handleChapterAction(action, i) {
  const arr = STATE.draftChapters;
  if (action === 'delete') {
    if (!confirm(`确定删除"${arr[i].title}"这一站？`)) return;
    _pushDraftSnapshot();
    arr.splice(i, 1);
    _renumberChapters();
  } else if (action === 'up' && i > 0) {
    _pushDraftSnapshot();
    [arr[i-1], arr[i]] = [arr[i], arr[i-1]];
    _renumberChapters();
  } else if (action === 'down' && i < arr.length - 1) {
    _pushDraftSnapshot();
    [arr[i], arr[i+1]] = [arr[i+1], arr[i]];
    _renumberChapters();
  } else if (action === 'replace') {
    _showReplacePanel(i);
    return;
  }
  await _rerenderAfterDraftChange();
}

function _renumberChapters() {
  const NUMS = ['壹','贰','叁','肆','伍','陆','柒','捌','玖','拾'];
  STATE.draftChapters.forEach((ch, i) => {
    ch.num = NUMS[i] || `第${i+1}`;
  });
  // pitfallStates 也按新 idx 重映射（删除/移动后简单清空）
  STATE.pitfallStates = {};
}

function _showReplacePanel(i) {
  const alternates = _mockAlternateAt(i);
  const overlay = document.getElementById('poi-sheet-overlay');
  const sheet = document.getElementById('poi-sheet');
  const content = document.getElementById('poi-sheet-content');

  content.innerHTML = `
    <div class="ps-header">
      <div class="ps-header-icon">${STATE.draftChapters[i].num}</div>
      <div class="ps-header-info">
        <div class="ps-name">替换「${STATE.draftChapters[i].title}」</div>
        <div class="ps-meta"><span>选一家替代的</span></div>
      </div>
      <button class="ps-close" id="ps-close-btn">×</button>
    </div>
    <div class="ps-section">
      <div class="ps-section-title">推 荐 替 代</div>
      <div class="ps-deals">
        ${alternates.map((alt, j) => `
          <div class="ps-deal-card" data-replace-alt="${j}" style="background: var(--bone);">
            <div>
              <div class="ps-deal-title">${alt.title}</div>
              <div style="font-size:12px;color:var(--ink-light);margin-top:2px;">${alt.mood} · ${(alt.highlight || '').slice(0, 30)}…</div>
            </div>
            <span style="color:var(--vermilion);font-size:18px;">→</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  overlay.classList.add('open');
  sheet.classList.add('open');
  sheet.scrollTop = 0;

  document.getElementById('ps-close-btn')?.addEventListener('click', closePOISheet);
  overlay.onclick = closePOISheet;

  content.querySelectorAll('[data-replace-alt]').forEach(opt => {
    opt.addEventListener('click', async () => {
      const j = +opt.dataset.replaceAlt;
      const newCh = alternates[j];
      newCh.num = STATE.draftChapters[i].num;
      newCh.time = STATE.draftChapters[i].time;
      _pushDraftSnapshot();
      STATE.draftChapters[i] = newCh;
      closePOISheet();
      await _rerenderAfterDraftChange();
    });
  });
}

function _mockAlternateAt(i) {
  // 从其他方案里挑两个类型相同的章节当候选
  const cur = STATE.draftChapters[i];
  const pool = [];
  CASES.forEach(c => c.plans.forEach(p => p.chaptersData.forEach(ch => {
    if (ch.type === cur.type && ch.title !== cur.title) pool.push(ch);
  })));
  // 随机挑 2 条
  return pool.sort(() => Math.random() - 0.5).slice(0, 2)
    .map(ch => JSON.parse(JSON.stringify(ch)));
}

function _bindPitfallInteract() {
  document.querySelectorAll('.ch-pitfall').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      const i = el.dataset.chPitfall;
      const expand = document.querySelector(`.ch-pitfall-expand[data-pitfall-expand="${i}"]`);
      const isOpen = expand?.classList.contains('open');
      // 收掉所有
      document.querySelectorAll('.ch-pitfall-expand').forEach(e => e.classList.remove('open'));
      document.querySelectorAll('.ch-pitfall').forEach(p => p.classList.remove('expanded'));
      if (!isOpen) {
        expand?.classList.add('open');
        el.classList.add('expanded');
      }
    });
  });
  document.querySelectorAll('[data-pitfall-action]').forEach(b => {
    b.addEventListener('click', async e => {
      e.stopPropagation();
      const action = b.dataset.pitfallAction;
      const i = +b.dataset.chI;
      _pushDraftSnapshot();
      if (action === 'ignore') {
        STATE.pitfallStates[i] = 'ignore';
        showToast('好，已为你保留这站 ── 注意可能会等位');
      } else if (action === 'earlier') {
        const ch = STATE.draftChapters[i];
        ch.time = _shiftTime(ch.time, -60);
        delete STATE.pitfallStates[i];
        showToast(`时间已提前到 ${ch.time}`);
      } else if (action === 'later') {
        const ch = STATE.draftChapters[i];
        ch.time = _shiftTime(ch.time, 60);
        delete STATE.pitfallStates[i];
        showToast(`时间已推后到 ${ch.time}`);
      } else if (action === 'avoid') {
        delete STATE.pitfallStates[i];
        showToast('好，仍然帮你避开');
      }
      await _rerenderAfterDraftChange();
    });
  });
}

function _shiftTime(hhmm, deltaMin) {
  const [h, m] = hhmm.split(':').map(Number);
  let t = h * 60 + m + deltaMin;
  if (t < 0) t = 0;
  if (t > 23 * 60 + 59) t = 23 * 60 + 59;
  return String(Math.floor(t/60)).padStart(2,'0') + ':' + String(t%60).padStart(2,'0');
}

async function _rerenderAfterDraftChange() {
  // 只重渲 chapters + map（debate/cover 不变）
  const caseId = await _currentCaseId();
  const planId = await _currentPlanId();
  const mapCfg = await Adapter.getMapConfig(caseId, planId);
  const updated = await _patchMapWithDraft(mapCfg, STATE.draftChapters, caseId);
  document.getElementById('stat-chapters').textContent = STATE.draftChapters.length + ' 章';
  await renderMap(updated);
  renderChapters(STATE.draftChapters);
}

const chapterStyleEl = document.createElement('style');
chapterStyleEl.textContent = `
  @keyframes chapterIn {
    from { opacity: 0; transform: translateX(12px); }
    to   { opacity: 1; transform: translateX(0); }
  }
`;
document.head.appendChild(chapterStyleEl);


// ----------------------------------------------------
// POI BOTTOM SHEET
// ----------------------------------------------------
let _poiSheetUGC = null;

function _findRealPOIForSheet(title) {
  if (!window.REAL_POIS?.pois) return null;
  const clean = (title || '').split(' · ')[0].trim();
  return window.REAL_POIS.pois.find(p =>
    p.name === clean || clean.includes(p.name) || p.name.includes(clean)
  ) || null;
}

function openPOISheet(idx) {
  const ch = STATE.draftChapters[idx];
  if (!ch) return;
  const overlay = document.getElementById('poi-sheet-overlay');
  const sheet = document.getElementById('poi-sheet');
  const content = document.getElementById('poi-sheet-content');

  const real = _findRealPOIForSheet(ch.title);
  const typeClass = ch.type === 'eat' ? 'type-eat' : ch.type === 'rest' ? 'type-rest' : '';
  const typeLabel = ch.type === 'eat' ? '餐饮' : ch.type === 'rest' ? '休憩' : '拍照';

  // --- Header with real DP data ---
  const dpName = real?.dp_name || ch.title;
  const dpRating = real?.avg_rating || ch.poi?.avg_rating || 0;
  const dpReviewCount = real?.review_count || ch.poi?.review_count || 0;
  const dpPrice = real?.avg_price || ch.poi?.avg_price || 0;
  const dpImage = real?.dp_image || '';
  const dpUrl = real?.dp_url || '';
  const dpTags = real?.dp_tags || real?.categories || [];
  const dpAddr = real?.address || ch.place || '';
  const dpHours = real?.business_hours || [];

  const starsHTML = dpRating > 0 ? Array.from({ length: 5 }, (_, k) =>
    `<span style="color:${k < Math.round(dpRating) ? 'var(--vermilion)' : 'var(--ink-faint)'}; font-size:14px;">★</span>`
  ).join('') + ` <span style="font-weight:700;color:var(--vermilion);margin-left:2px;">${Number(dpRating).toFixed(1)}</span>` : '';

  // --- Hero image ---
  let heroHTML = '';
  if (dpImage) {
    heroHTML = `<div style="width:100%;height:160px;border-radius:var(--radius);overflow:hidden;margin-bottom:16px;">
      <img src="${dpImage}" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.parentElement.style.display='none'" />
    </div>`;
  }

  // --- Info bar ---
  let infoHTML = `<div class="ps-section" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
    ${dpReviewCount ? `<span class="ps-meta-tag" style="font-weight:600;">${dpReviewCount.toLocaleString()} 条评价</span>` : ''}
    ${dpPrice ? `<span class="ps-meta-tag">人均 ¥${dpPrice}</span>` : ''}
    ${dpHours.length ? `<span class="ps-meta-tag">🕐 ${dpHours.join(' / ')}</span>` : ''}
    ${dpAddr ? `<span class="ps-meta-tag" style="max-width:100%;">📍 ${dpAddr}</span>` : ''}
  </div>`;

  // --- Queue ---
  let queueHTML = '';
  if (ch.type !== 'photo' && ch.queue) {
    const wait = ch.queue.wait_minutes_est || 0;
    const len = ch.queue.queue_length || 0;
    let cls = '', text = '';
    if (wait >= 30) { cls = 'busy'; text = `排队 ${len} 人 · 约 ${wait} 分钟`; }
    else if (wait <= 5) { cls = 'empty'; text = '现在不排队'; }
    else { text = `排队 ${len} 人 · 约 ${wait} 分钟`; }
    queueHTML = `
      <div class="ps-section">
        <div class="ps-section-title">实 时 排 队</div>
        <div class="ps-queue ${cls}"><span class="ps-queue-icon">⏱</span> ${text}</div>
      </div>`;
  }

  // --- Deals ---
  let dealsHTML = '';
  const dealsToShow = ch.deals?.length ? ch.deals : (real?.deals || []);
  if (dealsToShow.length) {
    const cards = dealsToShow.map((d, di) => `
      <div class="ps-deal-card" data-sheet-deal="${di}">
        <div><div class="ps-deal-title">${d.title}</div></div>
        <div class="ps-deal-price">
          <span class="ps-deal-original">¥${d.list_price}</span>
          <span class="ps-deal-sale">¥${d.sale_price}</span>
          <span class="ps-deal-save">省${d.list_price - d.sale_price}</span>
        </div>
      </div>
    `).join('');
    dealsHTML = `
      <div class="ps-section">
        <div class="ps-section-title" style="display:flex;justify-content:space-between;align-items:center;">
          团 购 优 惠
          ${dpUrl ? `<a href="${dpUrl}" target="_blank" style="font-size:12px;color:var(--vermilion);font-weight:400;letter-spacing:0;text-decoration:none;">在大众点评购买 →</a>` : ''}
        </div>
        <div class="ps-deals">${cards}</div>
      </div>`;
  }

  // --- UGC reviews (from real_pois + ugcBundle) ---
  let ugcHTML = '';
  const realReviews = real?.reviews || [];
  const ugcBundle = _poiSheetUGC;
  const poiName = ch.title.split(' · ')[0];
  let reviewsToShow = realReviews.slice(0, 5);
  if (!reviewsToShow.length && ugcBundle) {
    const related = ugcBundle.ugc.filter(u =>
      u.poi === poiName || u.poi?.includes(poiName) || poiName.includes(u.poi || '')
    );
    reviewsToShow = (related.length ? related : ugcBundle.ugc.slice(0, 3)).map(u => ({
      author: u.author, avatar: u.avatar, rating: u.rating, text: u.text, date: u.date, highlight: u.highlight,
    }));
  }
  if (reviewsToShow.length) {
    const ugcCards = reviewsToShow.map(r => {
      const stars = Array.from({ length: 5 }, (_, k) =>
        `<span style="color:${k < r.rating ? 'var(--vermilion)' : 'var(--ink-faint)'}">★</span>`
      ).join('');
      return `
        <div class="ps-ugc-card">
          <div class="ps-ugc-card-head">
            <span class="ps-ugc-avatar">${r.avatar || r.author?.[0] || '?'}</span>
            <span class="ps-ugc-author">${r.author}</span>
            <span class="ps-ugc-rating">${stars}</span>
            ${r.date ? `<span style="margin-left:auto;font-size:11px;color:var(--ink-faint);">${r.date}</span>` : ''}
          </div>
          <div class="ps-ugc-text">${r.text}</div>
          ${r.highlight ? `<div style="margin-top:4px;font-size:11px;color:var(--gold);font-family:var(--f-serif);">💡 ${r.highlight}</div>` : ''}
        </div>`;
    }).join('');
    ugcHTML = `
      <div class="ps-section">
        <div class="ps-section-title" style="display:flex;justify-content:space-between;align-items:center;">
          用 户 评 价
          ${dpUrl ? `<a href="${dpUrl}/review_all" target="_blank" style="font-size:12px;color:var(--vermilion);font-weight:400;letter-spacing:0;text-decoration:none;">查看全部评论 →</a>` : ''}
        </div>
        <div class="ps-ugc-cards">${ugcCards}</div>
      </div>`;
  }

  // --- Pitfall ---
  let pitfallHTML = '';
  if (ch.pitfall) {
    const extrasChips = (ch.pitfallExtras || []).map(p => {
      const meta = PITFALL_TYPE[p.type] || { label: '提示', icon: '·' };
      return `<span class="pf-extra pf-${p.type}"><span class="pf-icon">${meta.icon}</span><span class="pf-label">${meta.label}</span><span class="pf-text">${p.text}</span></span>`;
    }).join('');
    pitfallHTML = `
      <div class="ps-section">
        <div class="ps-section-title">避 坑 提 示</div>
        <div class="ps-pitfall">
          <span class="ps-pitfall-seal">避</span>
          <div>
            <div class="ps-pitfall-text">${ch.pitfall}</div>
            ${extrasChips ? `<div class="ps-pitfall-extras">${extrasChips}</div>` : ''}
          </div>
        </div>
      </div>`;
  }

  // --- Actions ---
  let actionsHTML = `
    <div class="ps-section">
      <div class="ps-actions">
        ${ch.reservable ? `<button class="ps-action-btn ps-action-primary" data-sheet-reserve="${idx}">一键预约</button>` : ''}
        ${dealsToShow.length ? `<button class="ps-action-btn ps-action-primary" data-sheet-buy="${idx}">立即购买</button>` : ''}
        ${dpUrl ? `<button class="ps-action-btn ps-action-secondary" data-sheet-dp-link="${idx}">大众点评</button>` : ''}
        <button class="ps-action-btn ps-action-secondary" data-sheet-replace="${idx}">换一家</button>
        <button class="ps-action-btn ps-action-secondary" data-sheet-delete="${idx}">删除此站</button>
      </div>
    </div>`;

  content.innerHTML = `
    ${heroHTML}
    <div class="ps-header">
      <div class="ps-header-icon ${typeClass}">${ch.num}</div>
      <div class="ps-header-info">
        <div class="ps-name">${dpName}</div>
        <div class="ps-meta">
          ${starsHTML ? `<span>${starsHTML}</span>` : ''}
          ${dpTags.slice(0, 3).map(t => `<span class="ps-meta-tag">${t}</span>`).join('')}
          <span style="color:var(--ink-faint)">·</span>
          <span>${ch.time}</span>
        </div>
      </div>
      <button class="ps-close" id="ps-close-btn">×</button>
    </div>
    ${infoHTML}
    ${ch.highlight ? `
    <div class="ps-section">
      <div class="ps-section-title">路 线 亮 点</div>
      <div class="ps-ugc-summary">${ch.highlight}</div>
    </div>` : ''}
    ${queueHTML}
    ${dealsHTML}
    ${ugcHTML}
    ${pitfallHTML}
    ${actionsHTML}
  `;

  overlay.classList.add('open');
  sheet.classList.add('open');
  sheet.scrollTop = 0;

  document.getElementById('ps-close-btn')?.addEventListener('click', closePOISheet);
  overlay.onclick = closePOISheet;
  _bindSheetActions(idx);
  _bindSheetGesture();
}

function closePOISheet() {
  const overlay = document.getElementById('poi-sheet-overlay');
  const sheet = document.getElementById('poi-sheet');
  overlay.classList.remove('open');
  sheet.classList.remove('open');
  sheet.style.transform = '';
  overlay.onclick = null;
}

function _bindSheetActions(idx) {
  const content = document.getElementById('poi-sheet-content');
  content.querySelectorAll('[data-sheet-deal]').forEach(b => {
    b.addEventListener('click', () => {
      const ch = STATE.draftChapters[idx];
      const deal = ch?.deals?.[+b.dataset.sheetDeal];
      if (deal) showToast(`已加入美团购物车 · 「${deal.title}」 立省 <em>¥${deal.list_price - deal.sale_price}</em>`);
    });
  });
  content.querySelector('[data-sheet-reserve]')?.addEventListener('click', async () => {
    const ch = STATE.draftChapters[idx];
    const slots = await Meituan.getReservationSlots(`${ch.title}#${ch.num}`);
    const earliest = slots?.[0];
    if (earliest) {
      showToast(`「${ch.title}」最早可订 <em>${earliest.slot_time.slice(11, 16)}</em> · 已保留座位（demo）`);
    } else {
      showToast('已查询美团预约时段');
    }
    closePOISheet();
  });
  content.querySelector('[data-sheet-buy]')?.addEventListener('click', () => {
    const ch = STATE.draftChapters[idx];
    const deal = ch?.deals?.[0];
    if (deal) showToast(`已加入购物车 · 「${deal.title}」`);
    closePOISheet();
  });
  content.querySelector('[data-sheet-dp-link]')?.addEventListener('click', () => {
    const real = _findRealPOIForSheet(STATE.draftChapters[idx]?.title);
    const url = real?.dp_url || 'https://www.dianping.com';
    window.open(url, '_blank');
  });
  content.querySelector('[data-sheet-replace]')?.addEventListener('click', async () => {
    closePOISheet();
    _showReplacePanel(idx);
  });
  content.querySelector('[data-sheet-delete]')?.addEventListener('click', async () => {
    const arr = STATE.draftChapters;
    if (!confirm(`确定删除"${arr[idx].title}"这一站？`)) return;
    _pushDraftSnapshot();
    arr.splice(idx, 1);
    _renumberChapters();
    closePOISheet();
    await _rerenderAfterDraftChange();
  });
}

let _sheetGestureBound = false;
function _bindSheetGesture() {
  if (_sheetGestureBound) return;
  _sheetGestureBound = true;
  const sheet = document.getElementById('poi-sheet');
  let startY = 0, currentY = 0, isDragging = false;

  sheet.addEventListener('touchstart', e => {
    if (sheet.scrollTop > 0) return;
    startY = e.touches[0].clientY;
    isDragging = false;
  }, { passive: true });

  sheet.addEventListener('touchmove', e => {
    const dy = e.touches[0].clientY - startY;
    if (dy > 0 && sheet.scrollTop <= 0) {
      isDragging = true;
      currentY = dy;
      sheet.classList.add('dragging');
      sheet.style.transform = `translateY(${dy}px)`;
    }
  }, { passive: true });

  sheet.addEventListener('touchend', () => {
    if (!isDragging) return;
    sheet.classList.remove('dragging');
    if (currentY > 80) {
      closePOISheet();
    } else {
      sheet.style.transform = '';
    }
    isDragging = false;
    currentY = 0;
  });
}

function _inferUGCCategory(poi) {
  const p = (poi || '').toString();
  if (/面|餐厅|饭店|菜|吉士|宝石|小方|包|饭|食/.test(p))      return { name: '餐饮',     color: 'eat'   };
  if (/咖啡|酒吧|茶|站立|微醺|wine|bar|cafe/i.test(p))         return { name: '咖啡·酒',  color: 'rest'  };
  if (/路|公园|美术|图书|塔|寺|滨江|江|大楼|庭|院/.test(p))    return { name: '景点',     color: 'photo' };
  return { name: '本地',     color: 'photo' };
}


// ----------------------------------------------------
// DEBATE · 可互动（认同 + 用户发言）
// ----------------------------------------------------
function renderDebate(detail) {
  const el = document.getElementById('detail-debate');
  if (!el) return;

  const baseLines = detail.debate.map((d, i) => {
    const endorsed = STATE.debateEndorsed[i];
    const count = endorsed ? 1 : 0;
    return `
      <div class="debate-line" data-debate-line="${i}">
        <span class="debate-line-text"><span class="debate-speaker">${d.who}：</span>${d.text}</span>
        <button class="debate-endorse ${endorsed ? 'active' : ''}" data-endorse="${i}">
          <span class="de-icon">${endorsed ? '♥' : '♡'}</span><span class="de-count">${count}</span>
        </button>
      </div>
    `;
  });

  // 用户加入的发言
  const userLines = STATE.debateUserVoices.map(v => `
    <div class="debate-line user-voice">
      <span class="debate-line-text"><span class="debate-speaker">${v.who}：</span>${v.text}</span>
    </div>
  `);

  el.innerHTML = baseLines.concat(userLines).join('')
    + `<div class="debate-final">${detail.debateFinal}</div>`
    + `<div class="debate-user">
        <input type="text" class="du-input" id="du-input" placeholder="你怎么看？加一句..."/>
        <button class="du-send" id="du-send">发</button>
      </div>`;

  // 绑定事件
  el.querySelectorAll('.debate-endorse').forEach(b => {
    b.addEventListener('click', () => {
      const i = +b.dataset.endorse;
      STATE.debateEndorsed[i] = !STATE.debateEndorsed[i];
      renderDebate(detail);
    });
  });
  document.getElementById('du-send')?.addEventListener('click', () => _userVoiceSubmit(detail));
  document.getElementById('du-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') _userVoiceSubmit(detail);
  });
}

function _userVoiceSubmit(detail) {
  const inp = document.getElementById('du-input');
  const text = inp?.value.trim();
  if (!text) return;
  STATE.debateUserVoices.push({ who: '你', text });
  // 自动 mock 主持人回应
  setTimeout(() => {
    STATE.debateUserVoices.push({ who: '主持人', text: _mockModerator(text) });
    renderDebate(detail);
  }, 400);
  renderDebate(detail);
}
function _mockModerator(text) {
  if (text.includes('便宜') || text.includes('省'))   return '收到，会在排序时把性价比权重加上。';
  if (text.includes('好吃') || text.includes('味'))   return '懂了，会更看重口味维度。';
  if (text.includes('快') || text.includes('赶'))     return '好，让我把节奏紧凑些。';
  if (text.includes('拍') || text.includes('景'))     return '加分项 —— 出片角度优先。';
  if (text.includes('不'))                             return '好，下次会主动避开类似的。';
  return '收到，下一卷帮你考虑进去。';
}


// ----------------------------------------------------
// AI CHAT DOCK · 路线调整
// ----------------------------------------------------
function renderChatHistory() {
  const el = document.getElementById('acd-history');
  if (!el) return;
  const all = STATE.chatHistory;
  if (!all.length) {
    el.classList.remove('has-content');
    el.innerHTML = '';
    return;
  }
  el.classList.add('has-content');

  const COLLAPSE_THRESHOLD = 5;
  const SHOW_LATEST = 3;
  const shouldCollapse = all.length > COLLAPSE_THRESHOLD && !STATE.chatExpanded;
  const visible = shouldCollapse ? all.slice(-SHOW_LATEST) : all;
  const hiddenCount = all.length - visible.length;

  const collapseHeader = shouldCollapse
    ? `<button class="acd-collapse-toggle" data-acd-toggle="expand">
         ↕ 展开前 ${hiddenCount} 条对话
       </button>`
    : (all.length > COLLAPSE_THRESHOLD
        ? `<button class="acd-collapse-toggle" data-acd-toggle="collapse">
             ↑ 收起，只看最近 ${SHOW_LATEST} 条
           </button>`
        : '');

  el.innerHTML = collapseHeader + visible.map(m =>
    m.role === 'user'
      ? `<div class="acd-msg user">${m.text}</div>`
      : `<div class="acd-msg ai"><div class="acd-msg-label">「路」</div>${m.text}</div>`
  ).join('');

  el.querySelectorAll('[data-acd-toggle]').forEach(b => {
    b.addEventListener('click', () => {
      STATE.chatExpanded = b.dataset.acdToggle === 'expand';
      renderChatHistory();
    });
  });

  el.scrollTop = el.scrollHeight;
}

async function handleChatSubmit(text) {
  if (!text || !text.trim()) return;
  STATE.chatHistory.push({ role: 'user', text: text.trim() });
  renderChatHistory();
  // mock AI 响应（带轻微延迟模拟思考）
  await _sleep(420);
  const { reply, action } = _mockChatAI(text);
  STATE.chatHistory.push({ role: 'ai', text: reply });
  renderChatHistory();
  // 应用操作
  if (action) await action();
}

function _mockChatAI(text) {
  const arr = STATE.draftChapters || [];
  const t = text.trim();
  // pattern matching
  if (/重置|恢复|原方案/.test(t)) {
    return {
      reply: '好，已恢复到原始方案。',
      action: async () => {
        _resetDetailDrafts();
        await renderDetail();
      }
    };
  }
  if (/便宜|省/.test(t)) {
    const idx = arr.findIndex(c => c.type === 'rest' || c.type === 'eat');
    if (idx >= 0) {
      const alts = _mockAlternateAt(idx);
      if (alts.length) {
        const newCh = alts[0];
        newCh.num = arr[idx].num; newCh.time = arr[idx].time;
        return {
          reply: `把第 ${idx+1} 站「${arr[idx].title}」换成了「<em>${newCh.title}</em>」 ── 客单价更友好。`,
          action: async () => {
            _pushDraftSnapshot();
            STATE.draftChapters[idx] = newCh;
            await _rerenderAfterDraftChange();
          }
        };
      }
    }
    return { reply: '没找到能换的便宜替代，要不要直接删掉一站？' };
  }
  if (/删|去掉|减/.test(t)) {
    if (arr.length <= 1) return { reply: '只剩一站了，再删就没有路线啦。' };
    return {
      reply: `好，删掉最后一站「${arr[arr.length-1].title}」。`,
      action: async () => {
        _pushDraftSnapshot();
        STATE.draftChapters.pop();
        _renumberChapters();
        await _rerenderAfterDraftChange();
      }
    };
  }
  if (/加|多.*杯|多.*一/.test(t)) {
    const alts = _mockAlternateAt(arr.length - 1);
    if (alts.length) {
      const newCh = alts[0];
      newCh.time = _shiftTime(arr[arr.length-1].time, 60);
      newCh.num = '新';
      return {
        reply: `加了一站「<em>${newCh.title}</em>」在 ${newCh.time}。`,
        action: async () => {
          _pushDraftSnapshot();
          STATE.draftChapters.push(newCh);
          _renumberChapters();
          await _rerenderAfterDraftChange();
        }
      };
    }
  }
  if (/快|紧|短|赶/.test(t)) {
    if (arr.length <= 2) return { reply: '已经够紧凑了。' };
    return {
      reply: `已经把中间那一站去掉，路线缩短到 ${arr.length-1} 站。`,
      action: async () => {
        _pushDraftSnapshot();
        STATE.draftChapters.splice(Math.floor(arr.length/2), 1);
        _renumberChapters();
        await _rerenderAfterDraftChange();
      }
    };
  }
  if (/拍|景|出片/.test(t)) {
    const idx = arr.findIndex(c => c.type !== 'photo');
    if (idx >= 0) {
      const alts = _mockAlternateAt(idx).filter(a => a.type === 'photo');
      if (alts.length) {
        const newCh = alts[0];
        newCh.num = arr[idx].num; newCh.time = arr[idx].time;
        return {
          reply: `把第 ${idx+1} 站换成了拍照点「<em>${newCh.title}</em>」。`,
          action: async () => {
            _pushDraftSnapshot();
            STATE.draftChapters[idx] = newCh;
            await _rerenderAfterDraftChange();
          }
        };
      }
    }
    return { reply: '路线里已经有拍照点了，再加一站？' };
  }
  return { reply: '收到，我帮你微调了一下。' };
}

// 绑定 chat dock 事件（只绑一次）
let _chatBound = false;
function bindChatDock() {
  if (_chatBound) return;
  _chatBound = true;
  const inp = document.getElementById('acd-input');
  const send = document.getElementById('acd-send');
  send?.addEventListener('click', async () => {
    await handleChatSubmit(inp.value);
    inp.value = '';
  });
  inp?.addEventListener('keydown', async e => {
    if (e.key === 'Enter') {
      await handleChatSubmit(inp.value);
      inp.value = '';
    }
  });
  document.querySelectorAll('.acd-chip').forEach(c => {
    c.addEventListener('click', async () => {
      const q = c.dataset.quick;
      const tmap = {
        cheaper:    '换成便宜点的',
        shorten:    '时间紧一点，去掉一站',
        'add-coffee': '加一杯咖啡',
        'more-photo': '多一点拍照点',
        reset:      '恢复原方案',
      };
      await handleChatSubmit(tmap[q] || q);
    });
  });
}


// ====================================================
// AUTH BUTTON · 登录/已登录 两态   @owner T1
// ====================================================
const PERSONA_CN_FROM_ID = {
  photographer: '拍照党', foodie: '美食家', value: '性价比党',
  parent: '带娃党',     literary: '文青',   local: '本地老饕',
};

function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function refreshAuthBtn() {
  const btn = document.getElementById('auth-btn');
  if (!btn) return;
  const s = Memory.getStats();
  if (s.loggedIn) {
    btn.classList.remove('auth-state-out');
    btn.classList.add('auth-state-in');
    document.getElementById('auth-avatar').textContent = s.avatarLetter || '?';
    document.getElementById('auth-name').textContent   = s.nickname || '已登录';
    document.getElementById('auth-tag').textContent    =
      `记忆 v${s.version} · ${s.topPersonas.map(p => PERSONA_CN_FROM_ID[p] || p).join('·') || '待画像'}`;
  } else {
    btn.classList.add('auth-state-out');
    btn.classList.remove('auth-state-in');
  }
}

document.getElementById('auth-btn').addEventListener('click', async () => {
  if (Memory.loggedIn && Memory.image) {
    // 已登录且有画像 → 直接进入 profile 页面
    _draftImage = JSON.parse(JSON.stringify(Memory.image));
    await switchView('profile');
  } else {
    // 未登录或画像缺失 → 走登录流程
    openLoadingModal();
    await runLoginPipeline();
  }
});


// ====================================================
// 路线生成仪式感 overlay   @owner T1
// ====================================================
const GR_STEPS = [
  { key: 'intent',  title: '读懂你的意图 ──',                   text: '解析中...',                                     ms: 550 },
  { key: 'agents',  title: '召集 5 位 Persona Agent...',         text: '摄影师 / 美食家 / 性价比党 / 文青 / 本地老饕', ms: 650 },
  { key: 'poi',     title: '扫描 POI 与 UGC 评论...',            text: '1,268 个 POI · 47,238 条评论 · 取候选 32 个',  ms: 700 },
  { key: 'pitfall', title: '抽取避坑约束...',                    text: '已识别 132 条时段/菜单/营业/场景陷阱',         ms: 650 },
  { key: 'solve',   title: 'Pareto 求解差异化路径...',           text: '已生成 3 条立场不同的方案',                    ms: 700 },
];

async function runGenerateRitual() {
  const overlay = document.getElementById('gen-ritual');
  const titleEl = document.getElementById('gr-title-text');
  const ticker  = document.getElementById('gr-ticker');
  if (!overlay) return;
  // 重置
  document.querySelectorAll('#gr-steps li').forEach(li => {
    li.classList.remove('done', 'doing');
  });
  overlay.hidden = false;
  overlay.classList.remove('fading-out');

  for (const s of GR_STEPS) {
    const li = document.querySelector(`#gr-steps li[data-gr-step="${s.key}"]`);
    li?.classList.add('doing');
    titleEl.textContent = s.title;
    ticker.textContent = '> ' + s.text;
    await _sleep(s.ms);
    li?.classList.remove('doing');
    li?.classList.add('done');
  }

  titleEl.textContent = '完成 ✓';
  ticker.textContent = '> 已为你准备好 3 条路线';
  await _sleep(380);

  // 淡出
  overlay.classList.add('fading-out');
  await _sleep(380);
  overlay.hidden = true;
  overlay.classList.remove('fading-out');
}


// ====================================================
// PROFILE MODAL (只剩 loading 阶段)   @owner T2
// ====================================================
const $modal = document.getElementById('profile-modal');

let _draftImage = null; // 编辑中的草稿（profile view 用）

function openLoadingModal() {
  $modal.hidden = false;
  // 重置步骤
  document.querySelectorAll('.ms-steps li').forEach(el => {
    el.classList.remove('done', 'doing');
  });
}
function closeLoadingModal() {
  $modal.hidden = true;
}

document.getElementById('profile-modal-close').addEventListener('click', closeLoadingModal);
$modal.querySelector('.lu-modal-backdrop').addEventListener('click', closeLoadingModal);

// --- Loading 动画 ---
async function runLoginPipeline() {
  console.log('[LU] runLoginPipeline: start');
  const steps = ['login', 'favorites', 'reviews', 'analyze'];
  let result;
  try {
    const pipelinePromise = Adapter.loginAndAnalyze()
      .then(r => { result = r; console.log('[LU] loginAndAnalyze: resolved', r); })
      .catch(e => { console.error('[LU] loginAndAnalyze 失败:', e); throw e; });

    for (const s of steps) {
      const el = document.querySelector(`.ms-steps li[data-step=${s}]`);
      el?.classList.add('doing');
      await _sleep(420);
      el?.classList.remove('doing');
      el?.classList.add('done');
    }
    console.log('[LU] step animation done, awaiting pipelinePromise...');
    await pipelinePromise;
    console.log('[LU] pipelinePromise done. result:', !!result, 'image:', !!result?.image);

    if (!result || !result.image) throw new Error('loginAndAnalyze 返回空 image');

    // 回填真实数量
    const favEl = document.querySelector('.ms-steps li[data-step=favorites]');
    if (favEl) favEl.lastChild.nodeValue = `读取 ${result.favorites.length} 条收藏`;
    const revEl = document.querySelector('.ms-steps li[data-step=reviews]');
    if (revEl) revEl.lastChild.nodeValue = `读取 ${result.reviews.length} 条评论`;

    refreshAuthBtn();
    refreshMemoryWidget();

    await _sleep(400);

    _draftImage = JSON.parse(JSON.stringify(result.image));
    console.log('[LU] draftImage 已设置，准备 switchView profile');
    closeLoadingModal();
    await switchView('profile');
    console.log('[LU] switchView(profile) 完成');
  } catch (e) {
    console.error('[LU] runLoginPipeline 异常:', e);
    closeLoadingModal();
    alert('登录画像分析失败：' + (e?.message || e) + '\n详情请看浏览器控制台');
  }
}

async function runRebuildPipeline() {
  openLoadingModal();
  const steps = ['login', 'favorites', 'reviews', 'analyze'];
  document.querySelectorAll('.ms-steps li').forEach(el => el.classList.remove('done', 'doing'));
  let newImage;
  const p = Adapter.rebuildMemoryFromInteractions().then(img => { newImage = img; });
  for (const s of steps) {
    const el = document.querySelector(`.ms-steps li[data-step=${s}]`);
    el?.classList.add('doing');
    await _sleep(280);
    el?.classList.remove('doing'); el?.classList.add('done');
  }
  await p;
  await _sleep(300);
  _draftImage = JSON.parse(JSON.stringify(newImage));
  closeLoadingModal();
  await switchView('profile');
}


// ====================================================
// VIEW · PROFILE 渲染（独立页面）   @owner T2
// ====================================================
async function renderProfile() {
  console.log('[LU] renderProfile: start, draftImage =', !!_draftImage, 'memory.image =', !!Memory.image);
  // 进入时如果没有 draft → 用 Memory.image 作为起点（已登录但从导航点击进入）
  if (!_draftImage) {
    if (Memory.image) {
      _draftImage = JSON.parse(JSON.stringify(Memory.image));
    } else {
      console.warn('[LU] renderProfile: 没有 draftImage 也没有 Memory.image，回 landing');
      await switchView('landing');
      return;
    }
  }
  const image = _draftImage;

  // Header
  document.getElementById('profile-version-badge').textContent = 'v' + (image.version || 1);
  document.getElementById('profile-digest').textContent       = image.summary || '—';
  document.getElementById('profile-source-fav').textContent   = `${image.sourceStats?.favorites_count || 0} 条收藏`;
  document.getElementById('profile-source-rev').textContent   = `${image.sourceStats?.reviews_count || 0} 条评论`;
  document.getElementById('profile-interactions').textContent = Memory.interactionCount;

  // [一] Personas
  const $p = document.getElementById('profile-personas');
  $p.innerHTML = (image.dominantPersonas || []).map((p, idx) => {
    const cn  = PERSONA_CN_FROM_ID[p.persona_id] || p.persona_id;
    const pct = Math.round((p.weight || 0) * 100);
    return `
      <div class="persona-card">
        <div class="pc-name">${cn}</div>
        <div class="pc-evi">${p.evidence || ''}</div>
        <div class="pc-slider">
          <input type="range" min="0" max="100" value="${pct}" data-prof-persona="${idx}"/>
          <span class="pc-val" data-prof-persona-val="${idx}">${pct}</span>
        </div>
      </div>
    `;
  }).join('');
  $p.querySelectorAll('input[type=range]').forEach(inp => {
    inp.addEventListener('input', e => {
      const idx = +e.target.dataset.profPersona;
      const v   = +e.target.value;
      image.dominantPersonas[idx].weight = v / 100;
      document.querySelector(`[data-prof-persona-val="${idx}"]`).textContent = v;
    });
  });

  // [二] Price
  const pricePct = Math.round((image.priceSensitivity || 0.5) * 100);
  document.getElementById('profile-price').value = pricePct;
  document.getElementById('profile-price-val').textContent = pricePct;
  document.getElementById('profile-price').oninput = e => {
    image.priceSensitivity = +e.target.value / 100;
    document.getElementById('profile-price-val').textContent = e.target.value;
  };

  // [三] Provenance grid
  const $prov = document.getElementById('profile-provenance');
  const topPersona = image.dominantPersonas?.[0];
  const topCat = image.preferredCategories?.[0];
  $prov.innerHTML = `
    <div class="prov-item">
      <div class="prov-num">${image.sourceStats?.favorites_count || 0}</div>
      <div class="prov-label">条 收 藏</div>
      <div class="prov-detail">最常收藏的品类 · <em style="color:var(--vermilion)">${topCat?.name || '—'}</em></div>
    </div>
    <div class="prov-item">
      <div class="prov-num">${image.sourceStats?.reviews_count || 0}</div>
      <div class="prov-label">条 评 论</div>
      <div class="prov-detail">关键证据 · <em style="color:var(--vermilion)">${(topPersona?.evidence || '').slice(0, 24) || '—'}…</em></div>
    </div>
  `;

  // [四] Categories
  const $c = document.getElementById('profile-cats');
  const knownExtras = ['本帮菜','咖啡','美术馆','拍照','酒吧','面馆','茶','书店','烘焙','日料','江浙菜'];
  $c.innerHTML = (image.preferredCategories || []).map(c =>
    `<button class="cat-chip active" data-cat="${c.name}">${c.name}</button>`
  ).join('') + knownExtras.map(extra => {
    const existing = (image.preferredCategories || []).some(c => c.name === extra);
    return existing ? '' : `<button class="cat-chip" data-cat="${extra}">+ ${extra}</button>`;
  }).join('');
  $c.querySelectorAll('.cat-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
      const name = chip.dataset.cat;
      if (chip.classList.contains('active')) {
        if (!image.preferredCategories.some(c => c.name === name))
          image.preferredCategories.push({ name, weight: 0.7 });
      } else {
        image.preferredCategories = image.preferredCategories.filter(c => c.name !== name);
      }
    });
  });

  // [五] Dislikes
  function renderDis() {
    const $d = document.getElementById('profile-dis');
    $d.innerHTML = (image.dislikeSignals || []).map((s, idx) =>
      `<span class="dis-chip">${s}<span class="dis-chip-x" data-rm-dis="${idx}">×</span></span>`
    ).join('');
    $d.querySelectorAll('[data-rm-dis]').forEach(x => {
      x.addEventListener('click', () => {
        image.dislikeSignals.splice(+x.dataset.rmDis, 1);
        renderDis();
      });
    });
  }
  renderDis();
  document.getElementById('profile-dis-input').onkeydown = e => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      image.dislikeSignals = image.dislikeSignals || [];
      image.dislikeSignals.push(e.target.value.trim());
      e.target.value = '';
      renderDis();
    }
  };

  // [六] Wheel stats
  const s = Memory.getStats();
  document.getElementById('profile-wheel-stats').innerHTML = `
    <div class="wheel-stat"><div class="ws-num">v${s.version}</div><div class="ws-lbl">版 本</div></div>
    <div class="wheel-stat"><div class="ws-num">${s.interactions}</div><div class="ws-lbl">累 计 互 动</div></div>
    <div class="wheel-stat"><div class="ws-num">${(image.dominantPersonas || []).length}</div><div class="ws-lbl">画 像 数</div></div>
    <div class="wheel-stat"><div class="ws-num">${(image.preferredCategories || []).length}</div><div class="ws-lbl">品 类</div></div>
  `;
}

// --- Profile view 按钮 ---
document.getElementById('profile-back').addEventListener('click', async () => {
  _draftImage = null;
  await switchView(STATE.previousView || 'landing');
});

document.getElementById('profile-cancel').addEventListener('click', async () => {
  _draftImage = null;
  showToast('已取消');
  await switchView(STATE.previousView || 'landing');
});

document.getElementById('profile-save').addEventListener('click', async () => {
  if (!_draftImage) return;
  Adapter.confirmMemoryImage(_draftImage);
  refreshAuthBtn();
  refreshMemoryWidget();
  refreshHeroGreeting();
  _draftImage = null;
  showToast(`已保存 · 记忆 <em>v${Memory.version}</em>`);
  await switchView(STATE.previousView || 'landing');
});

document.getElementById('profile-rebuild').addEventListener('click', async () => {
  if (!Memory.loggedIn) return;
  await runRebuildPipeline();
});

document.getElementById('profile-logout').addEventListener('click', async () => {
  if (!confirm('退出登录会清空当前记忆形象，确定吗？')) return;
  Memory.logout();
  _draftImage = null;
  refreshAuthBtn();
  refreshMemoryWidget();
  refreshHeroGreeting();
  showToast('已退出登录');
  await switchView('landing');
});


// ====================================================
// TOAST 提示   @owner SHARED (公共工具，只增不改)
// ====================================================
function showToast(html) {
  const old = document.querySelector('.lu-toast');
  if (old) old.remove();
  const t = document.createElement('div');
  t.className = 'lu-toast';
  t.innerHTML = html;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}


// ====================================================
// SETTINGS PAGE   @owner T1
// ====================================================
async function renderSettings() {
  // 把所有持久化值同步到 UI 控件
  document.querySelectorAll('#view-settings [data-setting]').forEach(el => {
    const path = el.dataset.setting;
    const val  = Settings.get(path);
    if (el.tagName === 'INPUT') {
      if (el.type === 'checkbox')      el.checked = !!val;
      else if (el.type === 'range')    el.value   = val;
    } else if (el.classList.contains('radio-group')) {
      // for radio groups: set checked on matching child
      el.querySelectorAll('input[type=radio]').forEach(r => {
        const matched = r.value === val;
        r.checked = matched;
        r.parentElement.classList.toggle('checked', matched);
      });
    }
  });

  // 同步显示值（如滑条数值）
  const rebVal = document.getElementById('ss-auto-rebuild-val');
  if (rebVal) rebVal.textContent = Settings.get('profile.autoRebuildEvery');

  // 缓存大小
  const cacheEl = document.getElementById('settings-cache-size');
  if (cacheEl) {
    try {
      let total = 0;
      for (const k in localStorage) {
        if (localStorage.hasOwnProperty(k)) total += (localStorage[k] || '').length;
      }
      cacheEl.textContent = (total / 1024).toFixed(1) + ' KB';
    } catch { cacheEl.textContent = '—'; }
  }

  refreshVoicePreview();
  refreshAgentGrid();
}

function refreshAgentGrid() {
  const active = Settings.get('profile.activePersonas') || [];
  document.querySelectorAll('[data-agent-cb]').forEach(cb => {
    cb.checked = active.includes(cb.dataset.agentCb);
  });
  const countEl = document.getElementById('agent-active-count');
  if (countEl) countEl.textContent = active.length;
}

// 绑定 agent chip 变更
(function bindAgentChips() {
  document.querySelectorAll('[data-agent-cb]').forEach(cb => {
    cb.addEventListener('change', () => {
      const key = cb.dataset.agentCb;
      const cur = Settings.get('profile.activePersonas') || [];
      const next = cb.checked
        ? Array.from(new Set([...cur, key]))
        : cur.filter(k => k !== key);
      Settings.set('profile.activePersonas', next);
      const countEl = document.getElementById('agent-active-count');
      if (countEl) countEl.textContent = next.length;
    });
  });
})();

// 风格预览：根据当前 voice 设置生成示例句
const VOICE_SAMPLES = {
  // [formality][tone][length] => 示例
  'formal-literary-concise':  '三卷已成，请览。',
  'formal-literary-standard': '为君之意，已成三卷 ── 各自一径，请择其一。',
  'formal-literary-detailed': '依据君之偏好与近期足迹，臣已为君拟就三条可行之径，各执一议，请细阅而择之。',
  'formal-direct-concise':    '已生成 3 个方案。',
  'formal-direct-standard':   '根据您的偏好，已生成 3 个差异化方案，请选择。',
  'formal-direct-detailed':   '基于您的近期行为与显式偏好，系统已生成 3 个差异化方案，分别对应不同的优化目标，请审阅并选择。',
  'formal-playful-concise':   '三条任选。',
  'formal-playful-standard':  '认真做了三个方案，您随意挑。',
  'formal-playful-detailed':  '严肃地说 ── 系统真的认真做了三个方案，每个都对应不同的小心思，请您细品。',
  'neutral-literary-concise': '为你写了三卷。',
  'neutral-literary-standard':'为你写了三卷故事，看看哪一卷更像今天的你？',
  'neutral-literary-detailed':'依你今日心境，写了三卷不同节奏的故事 ── 一卷拍照、一卷吃喝、一卷慢逛 ── 任你择一展开。',
  'neutral-direct-concise':   '三个方案，选一个。',
  'neutral-direct-standard':  '生成了 3 个方案，挑一个最合你心意的。',
  'neutral-direct-detailed':  '根据你的偏好与避坑信号，生成了 3 个方案：拍照线、美食线、性价比线，详情请展开任一卡片。',
  'neutral-playful-concise':  '三套路子，挑一个。',
  'neutral-playful-standard': '帮你想了三个玩法 ── 你最像哪种人？',
  'neutral-playful-detailed': '咳咳，认真凑了三个方案 ── 一个适合出片的"装比派"，一个适合吃货的"扎根派"，一个适合精打细算的"硬核派"。任你挑。',
  'casual-literary-concise':  '三条路，看你心情。',
  'casual-literary-standard': 'Hey，今天为你写了三卷，看你想走哪一条 ──',
  'casual-literary-detailed': '今天给你写了三个故事开头 ── 武康路的光、巨鹿路的味、安福路的人 ── 三条路，三种你，选一个走入。',
  'casual-direct-concise':    '三选一。',
  'casual-direct-standard':   'Hi，三个方案我都准备好啦，看你心情选一个。',
  'casual-direct-detailed':   'Hi，今天给你准备了三个方案：第一条出片好、第二条好吃、第三条便宜。三个都不错，看你今天心情！',
  'casual-playful-concise':   '三选一，别犹豫！',
  'casual-playful-standard':  'Yo～三个玩法已就位，pick 一个？',
  'casual-playful-detailed':  '叮咚！今天的三个 menu 都好玩：① 拍照党天堂 ② 吃货圣地 ③ 抠门同学专享，选不出来就掷骰子吧～',
};

function refreshVoicePreview() {
  const el = document.getElementById('voice-preview-content');
  if (!el) return;
  const f   = Settings.get('voice.formality') || 'neutral';
  const t   = Settings.get('voice.tone')      || 'literary';
  const len = Settings.get('voice.length')    || 'standard';
  const lang = Settings.get('voice.language') || 'zh-CN';

  let sample = VOICE_SAMPLES[`${f}-${t}-${len}`] || VOICE_SAMPLES['neutral-literary-standard'];
  if (lang === 'en') sample = '[EN preview] Three different plans are ready, pick the one that feels most like you today.';
  if (lang === 'bilingual') sample = sample + '\n— Three different plans are ready —';

  el.textContent = sample;
}

// 绑定所有 [data-setting] 控件的变更事件（用事件委托一次性绑定）
(function bindSettingsControls() {
  const root = document.getElementById('view-settings');
  if (!root) return;

  function _markSaved() {
    const hint = document.getElementById('settings-saved-hint');
    if (!hint) return;
    hint.textContent = '✓ 已保存';
    hint.classList.add('changed');
    setTimeout(() => {
      hint.textContent = '设 置 自 动 保 存';
      hint.classList.remove('changed');
    }, 1500);
  }

  // checkbox / range
  root.addEventListener('change', e => {
    const el = e.target.closest('[data-setting]');
    const t = e.target;
    if (el && (t.type === 'checkbox' || t.type === 'range')) {
      const val = t.type === 'checkbox' ? t.checked : (+t.value || t.value);
      Settings.set(el.dataset.setting, val);
      _markSaved();
      if (t.type === 'range' && el.dataset.setting === 'profile.autoRebuildEvery') {
        const rv = document.getElementById('ss-auto-rebuild-val');
        if (rv) rv.textContent = t.value;
      }
    }
    // radio: parent is .radio-group with data-setting
    if (t.type === 'radio') {
      const group = t.closest('.radio-group[data-setting]');
      if (group) {
        Settings.set(group.dataset.setting, t.value);
        group.querySelectorAll('label').forEach(l => l.classList.toggle('checked', l.contains(t)));
        _markSaved();
        if (group.dataset.setting.startsWith('voice.')) refreshVoicePreview();
      }
    }
  });

  // 滑条的 input 事件（实时回显数字）
  root.addEventListener('input', e => {
    if (e.target.type === 'range' && e.target.dataset.setting === 'profile.autoRebuildEvery') {
      const rv = document.getElementById('ss-auto-rebuild-val');
      if (rv) rv.textContent = e.target.value;
    }
  });
})();

// 操作按钮
document.getElementById('settings-back').addEventListener('click', async () => {
  await switchView(STATE.previousView || 'landing');
});
document.getElementById('settings-done').addEventListener('click', async () => {
  showToast('已保存');
  await switchView(STATE.previousView || 'landing');
});

document.getElementById('settings-refetch').addEventListener('click', () => {
  Adapter._debugCacheKeys?.();
  showToast('已重新拉取（demo 数据无需联网）');
});

document.getElementById('settings-clear-all').addEventListener('click', async () => {
  if (!confirm('将清空所有本地数据（记忆形象 + 设置 + 缓存），无法撤销，确定吗？')) return;
  try {
    Memory.logout();
    Settings.reset();
    localStorage.clear();
  } catch (e) { console.error(e); }
  refreshAuthBtn();
  refreshMemoryWidget();
  refreshHeroGreeting();
  showToast('所有本地数据已清空');
  await switchView('landing');
});

document.getElementById('settings-rebuild-now').addEventListener('click', async () => {
  if (!Memory.loggedIn) {
    showToast('请先登录大众点评');
    return;
  }
  await runRebuildPipeline();
});

document.getElementById('settings-export').addEventListener('click', () => {
  const dump = Settings.debugDump();
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `lu-diagnostics-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('诊断数据已下载');
});

document.getElementById('settings-reset').addEventListener('click', async () => {
  if (!confirm('恢复所有设置到默认值？记忆形象不会被改动。')) return;
  Settings.reset();
  showToast('设置已恢复默认');
  await renderSettings();
});

// Tab 切换
document.querySelectorAll('.st-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    document.querySelectorAll('.st-tab').forEach(t => t.classList.toggle('active', t === tab));
    document.querySelectorAll('.st-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === target));
  });
});

// 齿轮按钮入口
document.getElementById('settings-btn').addEventListener('click', async () => {
  await switchView('settings');
});


// ====================================================
// MEMORY FLYWHEEL FLOATING WIDGET   @owner T1
// ====================================================
function refreshMemoryWidget() {
  const widget = document.getElementById('memory-widget');
  const s = Memory.getStats();
  if (!s.loggedIn || !Memory.image || STATE.view === 'landing' || STATE.view === 'compare') {
    widget.hidden = true;
    return;
  }
  widget.hidden = false;

  document.getElementById('mw-avatar').textContent = s.avatarLetter || '?';
  document.getElementById('mw-name').textContent   = s.nickname || '—';
  document.getElementById('mw-sub').textContent    =
    `记忆 v${s.version} · ${s.topPersonas.map(p => PERSONA_CN_FROM_ID[p] || p).join(' · ')}`;
  document.getElementById('mw-summary').textContent = s.summary || '—';
  document.getElementById('mws-version').textContent = s.version;
  document.getElementById('mws-count').textContent   = s.interactions;
  document.getElementById('mws-pers').textContent    = s.topPersonas.length;

  document.getElementById('mw-refresh').hidden = !s.pendingBump;
}

document.getElementById('mw-open-modal').addEventListener('click', async () => {
  _draftImage = JSON.parse(JSON.stringify(Memory.image));
  await switchView('profile');
});
document.getElementById('mw-refresh').addEventListener('click', async () => {
  await runRebuildPipeline();
});

// 订阅 memory 变化自动刷新 widget
Memory.subscribe(() => {
  refreshAuthBtn();
  refreshMemoryWidget();
});


// ====================================================
// LANDING · 个性化问候（已登录时显示）
// ====================================================
function refreshHeroGreeting() {
  let g = document.querySelector('.hero-greeting');
  const s = Memory.getStats();
  if (s.loggedIn && Memory.image) {
    const text = `Hi ${s.nickname}，根据你的记忆形象 ── ${s.summary?.slice(0, 26)}…`;
    if (!g) {
      g = document.createElement('span');
      g.className = 'hero-greeting';
      document.querySelector('.hero-title').before(g);
    }
    g.textContent = text;
  } else if (g) {
    g.remove();
  }
}


// ====================================================
// 飞轮：每次进入 detail / compare 记录互动
// ====================================================
const _originalSwitchView = switchView;
switchView = async function patchedSwitchView(view) {
  await _originalSwitchView(view);
  refreshMemoryWidget();
  if (view === 'detail' && Memory.loggedIn) {
    const caseId = await _currentCaseId();
    const planId = await _currentPlanId();
    Memory.recordInteraction('view_detail', { caseId, planId });
  } else if (view === 'compare' && Memory.loggedIn) {
    const caseId = await _currentCaseId();
    Memory.recordInteraction('view_compare', { caseId });
  }
};


// ====================================================
// INIT
// ====================================================
// 数据源模式徽章：探测后端 has_key + 高德 key，告诉评委「真在调」还是「演示 mock」
async function initModeBadge() {
  const el = document.getElementById('mode-badge');
  if (!el) return;
  let claudeReal = false;
  try {
    const healthURL = ((window.LU_CONFIG?.llmBackendURL) || '/api/llm').replace(/\/llm\/?$/, '/health');
    const r = await fetch(healthURL, { cache: 'no-store' });
    const j = await r.json();
    claudeReal = !!(r.ok && j.has_key);
  } catch { /* 无后端 → mock */ }
  const amapReal = !!(window.LU_CONFIG?.amapKey);
  const pill = (label, real) =>
    `<span class="mode-pill ${real ? 'real' : 'mock'}" title="${label}${real ? ' · 已接入真实 API' : ' · 当前演示 mock 数据'}">${label} ${real ? '真实' : 'mock'}</span>`;
  el.innerHTML = pill('DeepSeek', claudeReal) + pill('高德', amapReal);
}

(async function init() {
  await renderLanding();
  refreshAuthBtn();
  refreshMemoryWidget();
  refreshHeroGreeting();
  bindChatDock();
  initModeBadge();
})();
