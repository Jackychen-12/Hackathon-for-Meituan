/**
 * 极简后端：
 *  - 托管前端静态资源（同目录下的 app.html 等）
 *  - 提供 /api/vision 代理调用豆包 ARK Vision API
 *  - API Key 仅保存在服务端 .env，不会下发到浏览器
 *
 * 启动：
 *   1) 复制 .env.example 为 .env，填入真实 ARK_API_KEY
 *   2) npm install
 *   3) npm start    （或 node server.js）
 *   4) 浏览器访问 http://localhost:3000/app.html
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

// 加载 .env（不依赖 dotenv 包，自己解析一下，避免增加依赖）
(function loadEnv() {
    try {
        const envPath = path.join(__dirname, '.env');
        if (!fs.existsSync(envPath)) return;
        const txt = fs.readFileSync(envPath, 'utf8');
        txt.split(/\r?\n/).forEach(line => {
            const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
            if (!m) return;
            const k = m[1];
            let v = m[2];
            if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
                v = v.slice(1, -1);
            }
            if (!(k in process.env)) process.env[k] = v;
        });
    } catch (e) {
        console.warn('[env] load failed:', e.message);
    }
})();

process.on('unhandledRejection', (err) => { console.error('[unhandledRejection]', err); });
process.on('uncaughtException', (err) => { console.error('[uncaughtException]', err); });

const FETCH_TIMEOUT = 30000;
function fetchWithTimeout(url, opts = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeout || FETCH_TIMEOUT);
    return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(timer));
}

const PORT = parseInt(process.env.PORT || '3000', 10);
const ARK_API_KEY = process.env.ARK_API_KEY || '';
const ARK_API_URL = process.env.ARK_API_URL || 'https://ark.cn-beijing.volces.com/api/v3/responses';
const ARK_MODEL  = process.env.ARK_MODEL  || 'doubao-seed-1-6-vision-250815';
const ARK_API_URL_TEXT = process.env.ARK_API_URL_TEXT || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const ARK_TEXT_MODEL   = process.env.ARK_TEXT_MODEL   || 'doubao-seed-1-6-250615';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL   = 'deepseek-chat';

const HAS_LLM = !!(ARK_API_KEY || DEEPSEEK_API_KEY);
if (!ARK_API_KEY) {
    console.warn('[warn] ARK_API_KEY 未设置，/api/vision 将返回 500。请先在 .env 中配置。');
}
if (!HAS_LLM) {
    console.warn('[warn] 无可用 LLM Key（ARK_API_KEY 和 DEEPSEEK_API_KEY 均未设置）');
} else if (DEEPSEEK_API_KEY && !ARK_API_KEY) {
    console.log('[info] 使用 DeepSeek API 作为 LLM 后端');
}

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js':   'text/javascript; charset=utf-8',
    '.ts':   'text/plain; charset=utf-8',
    '.tsx':  'text/plain; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif':  'image/gif',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.webp': 'image/webp',
    '.txt':  'text/plain; charset=utf-8'
};

function send(res, status, body, headers = {}) {
    res.writeHead(status, { 'Cache-Control': 'no-store', ...headers });
    res.end(body);
}

function sendJson(res, status, obj) {
    send(res, status, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8' });
}

function readBody(req, limit = 20 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let total = 0;
        req.on('data', c => {
            total += c.length;
            if (total > limit) {
                reject(new Error('payload too large'));
                req.destroy();
                return;
            }
            chunks.push(c);
        });
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

/* ============== /api/vision ============== */
async function handleVision(req, res) {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'method not allowed' });
    if (!ARK_API_KEY) return sendJson(res, 500, { error: 'server missing ARK_API_KEY' });

    let payload;
    try {
        const buf = await readBody(req);
        payload = JSON.parse(buf.toString('utf8'));
    } catch (e) {
        return sendJson(res, 400, { error: 'invalid json body: ' + e.message });
    }

    const imageUrl = payload && payload.image_url;
    const prompt   = payload && payload.prompt;
    if (!imageUrl || !prompt) {
        return sendJson(res, 400, { error: 'missing image_url or prompt' });
    }

    const arkBody = {
        model: ARK_MODEL,
        input: [
            {
                role: 'user',
                content: [
                    { type: 'input_image', image_url: imageUrl },
                    { type: 'input_text',  text: prompt }
                ]
            }
        ]
    };

    try {
        const r = await fetchWithTimeout(ARK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + ARK_API_KEY
            },
            body: JSON.stringify(arkBody)
        });
        const text = await r.text();
        if (!r.ok) {
            console.error('[vision] upstream error', r.status, text.slice(0, 500));
            return sendJson(res, 502, { error: 'upstream ' + r.status, detail: text });
        }
        let data;
        try { data = JSON.parse(text); } catch { data = { raw: text }; }

        // 抽取文字内容，前端少处理
        let outText = '';
        if (Array.isArray(data.output)) {
            for (const o of data.output) {
                if (Array.isArray(o.content)) {
                    for (const c of o.content) {
                        if (typeof c.text === 'string') outText += c.text;
                    }
                }
            }
        }
        if (!outText && typeof data.output_text === 'string') outText = data.output_text;

        sendJson(res, 200, { text: outText, raw: data });
    } catch (e) {
        console.error('[vision] fetch failed:', e);
        sendJson(res, 500, { error: 'fetch failed: ' + e.message });
    }
}

/* ============== /api/refine ============== */
const REFINE_SYSTEM_PROMPT = `你是 CityWalk 路线规划助手的输入精炼模块。
用户会用一段口语化的中文描述自己想要的城市漫步路线，你需要从中提炼出以下字段：

- time   ：时间安排（如"周末下午"、"晚上 6 点之后"、"半天"等；找不到就为空字符串）
- place  ：出发地 / 想去的地点 / 商圈 / 景点的数组（最多 5 个，按出现顺序，去重；找不到就为空数组）
- food   ：美食 / 想吃什么（如"粤式早茶"、"咖啡甜品"；找不到就为空字符串）
- people ：游玩人数 / 同行者（如"一个人"、"闺蜜两人"、"带娃 3 口之家"；找不到就为空字符串）
- style  ：风格 / 偏好（如"出片打卡"、"小众安静"、"夜景微醺"；找不到就为空字符串）
- other  ：以上都装不下、但用户明确强调的其它要求（找不到就为空字符串）

【输出要求】
1. 只输出一个合法 JSON 对象，键名严格为上述 6 个，不要加任何解释、Markdown、代码块。
2. 不要编造没说过的内容：用户没提就给空字符串 / 空数组。
3. 字段值要简练（每个字段控制在 12 字以内，place 单项 8 字以内）。
4. place 数组里只放具体地名，不要放"附近、市中心"这种泛指。`;

function extractJson(text) {
    if (!text) return null;
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fence ? fence[1] : text;
    const a = candidate.indexOf('{');
    const b = candidate.lastIndexOf('}');
    if (a < 0 || b < 0 || b <= a) return null;
    try { return JSON.parse(candidate.slice(a, b + 1)); } catch { return null; }
}

function getLLMProviders() {
    const providers = [];
    if (DEEPSEEK_API_KEY) providers.push({ url: DEEPSEEK_API_URL, key: DEEPSEEK_API_KEY, model: DEEPSEEK_MODEL, name: 'DeepSeek' });
    if (ARK_API_KEY) providers.push({ url: ARK_API_URL_TEXT, key: ARK_API_KEY, model: ARK_TEXT_MODEL, name: 'ARK' });
    return providers;
}

async function chatJson(systemPrompt, userPayload, { temperature = 0.4 } = {}) {
    const providers = getLLMProviders();
    if (!providers.length) throw new Error('server missing LLM API key');
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: typeof userPayload === 'string' ? userPayload : JSON.stringify(userPayload) }
    ];
    for (const provider of providers) {
        try {
            const r = await fetchWithTimeout(provider.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + provider.key },
                body: JSON.stringify({
                    model: provider.model,
                    messages,
                    temperature,
                    response_format: { type: 'json_object' }
                })
            });
            const text = await r.text();
            if (!r.ok) {
                console.error(`[llm] ${provider.name} json error ${r.status}:`, text.slice(0, 300));
                continue;
            }
            let data;
            try { data = JSON.parse(text); } catch { continue; }
            let outText = '';
            if (data && Array.isArray(data.choices) && data.choices[0]?.message?.content) {
                outText = data.choices[0].message.content;
            } else if (typeof data.output_text === 'string') {
                outText = data.output_text;
            }
            const parsed = extractJson(outText);
            if (parsed && typeof parsed === 'object') return parsed;
        } catch (e) {
            console.error(`[llm] ${provider.name} json failed:`, e.message);
        }
    }
    throw new Error('all LLM providers failed');
}

async function chatText(systemPrompt, userPayload, { temperature = 0.3 } = {}) {
    const providers = getLLMProviders();
    if (!providers.length) throw new Error('server missing LLM API key');
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: typeof userPayload === 'string' ? userPayload : JSON.stringify(userPayload) }
    ];
    for (const provider of providers) {
        try {
            const r = await fetchWithTimeout(provider.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + provider.key },
                body: JSON.stringify({ model: provider.model, messages, temperature })
            });
            const text = await r.text();
            if (!r.ok) {
                console.error(`[llm] ${provider.name} text error ${r.status}:`, text.slice(0, 300));
                continue;
            }
            let data;
            try { data = JSON.parse(text); } catch { return text; }
            if (data && Array.isArray(data.choices) && data.choices[0]?.message?.content) {
                return data.choices[0].message.content;
            }
            if (typeof data.output_text === 'string') return data.output_text;
        } catch (e) {
            console.error(`[llm] ${provider.name} text failed:`, e.message);
        }
    }
    throw new Error('all LLM providers failed');
}

function normalizeRefine(raw) {
    const f = raw && typeof raw === 'object' ? raw : {};
    const str = (v) => (typeof v === 'string' ? v.trim() : '');
    let place = [];
    if (Array.isArray(f.place)) place = f.place;
    else if (typeof f.place === 'string' && f.place.trim()) place = f.place.split(/[、,，\/\s]+/);
    place = place.map(x => String(x).trim()).filter(Boolean);
    const seen = new Set();
    place = place.filter(x => (seen.has(x) ? false : (seen.add(x), true))).slice(0, 5);
    return {
        time:   str(f.time),
        place,
        food:   str(f.food),
        people: str(f.people),
        style:  str(f.style),
        other:  str(f.other),
    };
}

const HIGHLIGHT_SYSTEM_PROMPT = `你是点评文本高亮助手。
你会收到一条用户评论，以及可选的路线上下文。

任务：
1. 从评论里提取一个最值得高亮的短语。
2. 短语必须直接摘自原评论，不要改写。
3. 控制在 2-16 个汉字或等价短文本。
4. 只输出合法 JSON：{"phrase":"..."}。`;

const SUMMARY_SYSTEM_PROMPT = `你是 CityWalk 方案总结助手。
给定一个路线方案和若干用户评论，输出简洁、可信、面向用户的总结。

只输出合法 JSON：
{
  "digest": "1句总结，18-40字",
  "fitFor": ["适合人群1", "适合人群2", "适合人群3"],
  "notFor": ["不适合人群1", "不适合人群2"],
  "basedOn": "基于X条评论"
}

要求：
1. 不要夸张，不要编造评论里没有体现的偏好。
2. fitFor 最多 3 项，notFor 最多 2 项。
3. 语言自然、简练。`;

const MEMORY_SYSTEM_PROMPT = `你是本地生活用户画像分析助手。
请根据用户基础资料、收藏、评论，生成一个稳定、克制的 MemoryImage JSON。

只输出合法 JSON，结构必须为：
{
  "version": 1,
  "generated_at": "ISO_DATETIME",
  "summary": "一句话画像",
  "dominantPersonas": [{"persona_id":"literary|foodie|value|photographer|local|parent","weight":0.75,"evidence":"证据"}],
  "priceSensitivity": 0.5,
  "preferredCategories": [{"name":"咖啡","weight":0.8}],
  "dislikeSignals": ["信号1", "信号2", "信号3"],
  "timePatterns": {"favorite_window":"14:00-19:00","weekend_active":true},
  "sourceStats": {"favorites_count": 0, "reviews_count": 0, "since": "2026-01"}
}

规则：
1. 只在以下 persona_id 中选择：literary、foodie、value、photographer、local、parent。
2. dominantPersonas 返回 2-3 项，weight 为 0-1 的数字。
3. preferredCategories 返回 3-5 项。
4. 结合显式证据，不要编造过强结论。
5. generated_at 用 ISO 时间字符串。`;

function sanitizeMemoryImage(raw, fallbackStats = {}) {
    const personas = ['literary', 'foodie', 'value', 'photographer', 'local', 'parent'];
    const num = (v, d = 0) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : d;
    };
    const str = (v, d = '') => (typeof v === 'string' && v.trim() ? v.trim() : d);
    const dominantPersonas = Array.isArray(raw?.dominantPersonas)
        ? raw.dominantPersonas
            .map(p => ({
                persona_id: personas.includes(p?.persona_id) ? p.persona_id : null,
                weight: Math.max(0, Math.min(1, num(p?.weight, 0.5))),
                evidence: str(p?.evidence, '基于近期行为推断')
            }))
            .filter(p => p.persona_id)
            .slice(0, 3)
        : [];
    const preferredCategories = Array.isArray(raw?.preferredCategories)
        ? raw.preferredCategories
            .map(x => ({
                name: str(x?.name),
                weight: Math.max(0, Math.min(1, num(x?.weight, 0.5)))
            }))
            .filter(x => x.name)
            .slice(0, 5)
        : [];
    const dislikeSignals = Array.isArray(raw?.dislikeSignals)
        ? raw.dislikeSignals.map(x => str(x)).filter(Boolean).slice(0, 3)
        : [];
    return {
        version: Math.max(1, Math.round(num(raw?.version, fallbackStats.version || 1))),
        generated_at: str(raw?.generated_at, new Date().toISOString()),
        summary: str(raw?.summary, '一个偏好城市探索的本地生活用户'),
        dominantPersonas: dominantPersonas.length ? dominantPersonas : [
            { persona_id: 'local', weight: 0.6, evidence: '基于近期浏览与互动推断' },
            { persona_id: 'foodie', weight: 0.5, evidence: '收藏与评论中存在美食相关线索' }
        ],
        priceSensitivity: Math.max(0, Math.min(1, num(raw?.priceSensitivity, 0.5))),
        preferredCategories: preferredCategories.length ? preferredCategories : [
            { name: '本地生活', weight: 0.7 },
            { name: 'CityWalk', weight: 0.6 },
            { name: '咖啡', weight: 0.5 }
        ],
        dislikeSignals: dislikeSignals.length ? dislikeSignals : ['不爱拥挤', '偏好真实体验'],
        timePatterns: {
            favorite_window: str(raw?.timePatterns?.favorite_window, '14:00-19:00'),
            weekend_active: !!raw?.timePatterns?.weekend_active,
        },
        sourceStats: {
            favorites_count: Math.max(0, Math.round(num(raw?.sourceStats?.favorites_count, fallbackStats.favorites_count || 0))),
            reviews_count: Math.max(0, Math.round(num(raw?.sourceStats?.reviews_count, fallbackStats.reviews_count || 0))),
            since: str(raw?.sourceStats?.since, fallbackStats.since || '—'),
        }
    };
}

async function handleHealth(req, res) {
    if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed' });
    const providers = getLLMProviders().map(x => x.name);
    sendJson(res, 200, {
        ok: true,
        has_key: providers.length > 0,
        providers
    });
}

async function handleLLM(req, res) {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'method not allowed' });
    if (!HAS_LLM) return sendJson(res, 503, { error: 'server missing LLM API key' });

    let payload;
    try {
        const buf = await readBody(req, 2 * 1024 * 1024);
        payload = JSON.parse(buf.toString('utf8'));
    } catch (e) {
        return sendJson(res, 400, { error: 'invalid json body: ' + e.message });
    }

    const method = String(payload?.method || '').trim();
    const input = payload?.payload || {};
    if (!method) return sendJson(res, 400, { error: 'missing method' });

    try {
        if (method === 'highlightReviewKeyPhrase') {
            const reviewText = String(input?.reviewText || '').trim();
            if (!reviewText) return sendJson(res, 400, { error: 'missing reviewText' });
            const parsed = await chatJson(HIGHLIGHT_SYSTEM_PROMPT, {
                reviewText,
                planContext: String(input?.planContext || '').trim()
            }, { temperature: 0.2 });
            const phrase = String(parsed?.phrase || '').trim() || reviewText.slice(0, 8);
            return sendJson(res, 200, { result: phrase.slice(0, 32) });
        }

        if (method === 'summarizePlan') {
            const plan = input?.plan || {};
            const reviews = Array.isArray(input?.reviews) ? input.reviews.slice(0, 12) : [];
            const result = await chatJson(SUMMARY_SYSTEM_PROMPT, {
                plan: {
                    id: plan?.id,
                    title: plan?.title,
                    subtitle: plan?.subtitle,
                    stance: plan?.stance,
                },
                reviews
            }, { temperature: 0.4 });
            return sendJson(res, 200, {
                result: {
                    digest: String(result?.digest || '这是一条节奏均衡、适合城市漫游的路线。').trim(),
                    fitFor: Array.isArray(result?.fitFor) ? result.fitFor.map(x => String(x).trim()).filter(Boolean).slice(0, 3) : [],
                    notFor: Array.isArray(result?.notFor) ? result.notFor.map(x => String(x).trim()).filter(Boolean).slice(0, 2) : [],
                    basedOn: String(result?.basedOn || `基于${reviews.length}条评论`).trim(),
                }
            });
        }

        if (method === 'analyzeUserMemory') {
            const profile = input?.profile || {};
            const favorites = Array.isArray(input?.favorites) ? input.favorites.slice(0, 60) : [];
            const reviews = Array.isArray(input?.reviews) ? input.reviews.slice(0, 60) : [];
            const previousImage = input?.previousImage || null;
            const raw = await chatJson(MEMORY_SYSTEM_PROMPT, {
                profile,
                favorites,
                reviews,
                previousImage
            }, { temperature: 0.35 });
            const result = sanitizeMemoryImage(raw, {
                version: Number(previousImage?.version || 0) + 1,
                favorites_count: favorites.length,
                reviews_count: reviews.length,
                since: profile?.join_date || '—',
            });
            return sendJson(res, 200, { result });
        }

        if (method === 'extractPitfalls' || method === 'extractImplicitTags' || method === 'personaDebate' || method === 'narrateChapters') {
            return sendJson(res, 501, { error: `method not implemented: ${method}` });
        }

        return sendJson(res, 400, { error: `unsupported method: ${method}` });
    } catch (e) {
        console.error(`[llm] ${method} failed:`, e.message);
        return sendJson(res, 502, { error: e.message || 'llm failed' });
    }
}

async function handleRefine(req, res) {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'method not allowed' });
    if (!HAS_LLM) return sendJson(res, 500, { error: 'server missing LLM API key' });

    let payload;
    try {
        const buf = await readBody(req, 1 * 1024 * 1024);
        payload = JSON.parse(buf.toString('utf8'));
    } catch (e) {
        return sendJson(res, 400, { error: 'invalid json body: ' + e.message });
    }
    const userText = (payload && payload.text || '').toString().trim();
    if (!userText) return sendJson(res, 400, { error: 'missing text' });

    const providers = [];
    if (DEEPSEEK_API_KEY) providers.push({ url: DEEPSEEK_API_URL, key: DEEPSEEK_API_KEY, model: DEEPSEEK_MODEL, name: 'DeepSeek' });
    if (ARK_API_KEY) providers.push({ url: ARK_API_URL_TEXT, key: ARK_API_KEY, model: ARK_TEXT_MODEL, name: 'ARK' });

    const messages = [
        { role: 'system', content: REFINE_SYSTEM_PROMPT },
        { role: 'user',   content: userText }
    ];

    for (const provider of providers) {
        try {
            const r = await fetchWithTimeout(provider.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + provider.key },
                body: JSON.stringify({ model: provider.model, messages, temperature: 0.2, response_format: { type: 'json_object' } })
            });
            const text = await r.text();
            if (!r.ok) { console.error(`[refine] ${provider.name} error ${r.status}`); continue; }
            let data;
            try { data = JSON.parse(text); } catch { continue; }
            let outText = '';
            if (data && Array.isArray(data.choices) && data.choices[0]) {
                const m = data.choices[0].message;
                if (m && typeof m.content === 'string') outText = m.content;
            }
            if (!outText && typeof data.output_text === 'string') outText = data.output_text;
            const parsed = extractJson(outText);
            const fields = normalizeRefine(parsed || {});
            return sendJson(res, 200, { fields, rawText: outText, raw: data });
        } catch (e) {
            console.error(`[refine] ${provider.name} failed:`, e.message);
            continue;
        }
    }
    sendJson(res, 502, { error: 'all LLM providers failed' });
}

/* ============== /api/plan ============== */
const PLAN_SYSTEM_PROMPT = `你是 CityWalk 多 Agent 路线规划师。你的团队有 6 个 Agent 角色：
- photographer（拍照党）：偏爱出片地点、光线好的时段
- foodie（美食家）：偏爱高分餐厅、地道小吃
- value（性价比党）：偏爱免费/低消景点
- literary（文青）：偏爱书店、咖啡馆、艺术展
- local（本地老饕）：偏爱本地人常去的隐藏好店
- parent（带娃党）：偏爱安全、有趣、亲子友好的地点

根据用户需求，生成 2 条差异化路线方案，每条由不同 Agent 主导。

【输出要求】只输出合法 JSON：
{
  "plans": [
    {
      "title": "路线标题",
      "dayTitle": "副标题",
      "summary": "1句路线简介",
      "personas": ["主导agent_id", "辅助agent_id"],
      "stance": "这条线的核心理念（一句话）",
      "stops": [
        {
          "poi_id": "选中的POI ID",
          "stayMin": 预计停留分钟数,
          "reason": "安排理由（1句话）",
          "transitMode": "walk|metro|taxi",
          "transitMin": 交通分钟数
        }
      ]
    }
  ]
}

【规则】
1. 只从候选 POI 列表中选择。
2. 2 条方案要有明显差异（不同的 POI 组合或不同的侧重）。
3. 每条路线 4-5 个 stops。
4. 第一个 stop 省略 transitMode/transitMin。
5. 只输出纯 JSON。`;

function loadCandidatePois() {
    try {
        const filePath = path.join(__dirname, 'data', 'real_pois.json');
        const raw = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(raw);
        return Array.isArray(data.pois) ? data.pois : [];
    } catch (e) {
        console.error('[plan] failed to load real_pois.json:', e.message);
        return [];
    }
}

function buildFallbackPlan(pois) {
    const selected = pois.slice(0, 5);
    return {
        title: '默认城市漫步路线',
        dayTitle: '精选地点半日游',
        summary: '由系统自动编排的默认路线，涵盖周边热门地点。',
        stops: selected.map((p, i) => {
            const stop = {
                poi_id: p.poi_id,
                stayMin: 30,
                reason: `热门地点：${p.name}`,
            };
            if (i > 0) {
                stop.transitMode = 'walk';
                stop.transitMin = 10;
            }
            return stop;
        }),
    };
}

function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function enrichPlanWithPois(plan, poisMap) {
    if (!plan || !Array.isArray(plan.stops)) return plan;
    plan.stops = plan.stops.map(stop => {
        const poi = poisMap[stop.poi_id];
        if (poi) {
            stop.name = poi.name;
            stop.branch_name = poi.branch_name || '';
            stop.address = poi.address;
            stop.longitude = poi.longitude;
            stop.latitude = poi.latitude;
            stop.categories = poi.categories;
            stop.avg_rating = poi.avg_rating;
            stop.avg_price = poi.avg_price;
            stop.review_count = poi.review_count;
            stop.business_hours = poi.business_hours;
            stop.type = poi.type;
            stop.dp_image = poi.dp_image || '';
            stop.dp_url = poi.dp_url || '';
            stop.reviews = poi.reviews || [];
            stop.regions = poi.regions || [];
        }
        return stop;
    });
    // 计算相邻站点间的直线距离
    let totalDistKm = 0;
    for (let i = 1; i < plan.stops.length; i++) {
        const prev = plan.stops[i-1];
        const curr = plan.stops[i];
        if (prev.latitude && prev.longitude && curr.latitude && curr.longitude) {
            const d = haversineKm(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
            curr.distanceKm = Math.round(d * 10) / 10;
            totalDistKm += d;
        }
    }
    plan.totalDistanceKm = Math.round(totalDistKm * 10) / 10;
    return plan;
}

async function handlePlan(req, res) {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'method not allowed' });

    let payload;
    try {
        const buf = await readBody(req, 2 * 1024 * 1024);
        payload = JSON.parse(buf.toString('utf8'));
    } catch (e) {
        return sendJson(res, 400, { error: 'invalid json body: ' + e.message });
    }

    const userText = (payload && payload.text || '').toString().trim();
    if (!userText) return sendJson(res, 400, { error: 'missing text' });

    const city = (payload && payload.city || '').toString().trim();
    const userPois = payload && Array.isArray(payload.pois) ? payload.pois : [];
    const profile = payload && payload.profile || {};

    // 加载候选 POI 池
    let allPois = loadCandidatePois(); // 默认上海
    if (city) {
        const cityShort = city.replace(/市$/, '');
        const cacheFile = path.join(__dirname, 'data', `cache_${cityShort}.json`);
        try {
            if (fs.existsSync(cacheFile)) {
                const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
                if (Array.isArray(cached.pois) && cached.pois.length > 0) {
                    allPois = cached.pois;
                }
            }
        } catch {}
    }
    if (allPois.length === 0) {
        return sendJson(res, 500, { error: 'no candidate POIs available' });
    }

    // 构建 POI 索引
    const poisMap = {};
    allPois.forEach(p => { poisMap[p.poi_id] = p; });

    if (!HAS_LLM) {
        const fallback = buildFallbackPlan(allPois);
        const enriched = enrichPlanWithPois(fallback, poisMap);
        return sendJson(res, 200, {
            plans: [enriched],
            fallback: true,
            reason: 'server missing LLM API key'
        });
    }

    // 构建候选 POI 摘要（精简信息发给 LLM，避免 token 过多）
    const poiSummaries = allPois.map(p => ({
        poi_id: p.poi_id,
        name: p.name,
        address: p.address,
        categories: p.categories,
        avg_rating: p.avg_rating,
        review_count: p.review_count,
        type: p.type,
        longitude: p.longitude,
        latitude: p.latitude,
    }));

    // 组装用户消息
    let userMessage = `用户需求：${userText}`;
    if (city) userMessage += `\n城市：${city}`;
    if (userPois.length > 0) {
        userMessage += `\n用户指定想去的地点：${userPois.map(p => p.name).join('、')}`;
    }
    if (profile && Object.keys(profile).length > 0) {
        const parts = [];
        if (profile.time) parts.push(`时间：${profile.time}`);
        if (profile.food) parts.push(`美食偏好：${profile.food}`);
        if (profile.people) parts.push(`同行者：${profile.people}`);
        if (profile.style) parts.push(`风格：${profile.style}`);
        if (profile.other) parts.push(`其它：${profile.other}`);
        if (parts.length) userMessage += `\n用户画像：${parts.join('；')}`;
    }
    userMessage += `\n\n候选 POI 列表：\n${JSON.stringify(poiSummaries, null, 0)}`;

    const llmProviders = [];
    if (DEEPSEEK_API_KEY) llmProviders.push({ url: DEEPSEEK_API_URL, key: DEEPSEEK_API_KEY, model: DEEPSEEK_MODEL, name: 'DeepSeek' });
    if (ARK_API_KEY) llmProviders.push({ url: ARK_API_URL_TEXT, key: ARK_API_KEY, model: ARK_TEXT_MODEL, name: 'ARK' });

    const messages = [
        { role: 'system', content: PLAN_SYSTEM_PROMPT },
        { role: 'user',   content: userMessage }
    ];

    let llmSuccess = false;
    let fallbackReason = 'all LLM providers failed';
    for (const provider of llmProviders) {
        try {
            console.log(`[plan] trying ${provider.name}...`);
            const r = await fetchWithTimeout(provider.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + provider.key },
                body: JSON.stringify({ model: provider.model, messages, temperature: 0.7, response_format: { type: 'json_object' } })
            });
            const text = await r.text();
            if (!r.ok) {
                console.error(`[plan] ${provider.name} error ${r.status}:`, text.slice(0, 300));
                if (r.status === 402 && /Insufficient Balance/i.test(text)) {
                    fallbackReason = `${provider.name} insufficient balance`;
                } else {
                    fallbackReason = `${provider.name} error ${r.status}`;
                }
                continue;
            }
            let data;
            try { data = JSON.parse(text); } catch { data = { raw: text }; }
            let outText = '';
            if (data && Array.isArray(data.choices) && data.choices[0]) {
                const m = data.choices[0].message;
                if (m && typeof m.content === 'string') outText = m.content;
            }
            if (!outText && typeof data.output_text === 'string') outText = data.output_text;
            const parsed = extractJson(outText);
            if (parsed && Array.isArray(parsed.plans) && parsed.plans.length > 0) {
                const enrichedPlans = parsed.plans.map(p => enrichPlanWithPois(p, poisMap));
                sendJson(res, 200, { plans: enrichedPlans, fallback: false });
                llmSuccess = true; break;
            } else if (parsed && Array.isArray(parsed.stops) && parsed.stops.length > 0) {
                const enriched = enrichPlanWithPois(parsed, poisMap);
                sendJson(res, 200, { plans: [enriched], fallback: false });
                llmSuccess = true; break;
            } else {
                console.warn(`[plan] ${provider.name} returned unparseable, trying next...`);
                fallbackReason = `${provider.name} returned unparseable`;
                continue;
            }
        } catch (e) {
            console.error(`[plan] ${provider.name} fetch failed:`, e.message);
            fallbackReason = `${provider.name} fetch failed`;
            continue;
        }
    }
    if (!llmSuccess) {
        const fallback = buildFallbackPlan(allPois);
        const enriched = enrichPlanWithPois(fallback, poisMap);
        sendJson(res, 200, { plans: [enriched], fallback: true, reason: fallbackReason });
    }
}

/* ============== /api/search (大众点评搜索) ============== */
const DIANPING_COOKIE = process.env.DIANPING_COOKIE || '';
const CITY_MAP = {
    '上海':1,'北京':2,'广州':4,'深圳':7,'杭州':5,'成都':52,'重庆':146,
    '武汉':48,'南京':17,'西安':57,'长沙':56,'厦门':27,'苏州':6,'天津':3
};
function getCityId(name) {
    for (const [k, v] of Object.entries(CITY_MAP)) {
        if (name.includes(k) || k.includes(name.replace(/市$/, ''))) return v;
    }
    return 1;
}

const _searchCache = {};

async function scrapeDianping(keyword, city, limit = 5) {
    const cid = getCityId(city);
    const url = `https://www.dianping.com/search/keyword/${cid}/0_${encodeURIComponent(keyword)}`;
    try {
        const r = await fetchWithTimeout(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9',
                'Referer': 'https://www.dianping.com/',
                'Cookie': DIANPING_COOKIE
            }
        });
        if (!r.ok) return [];
        const html = await r.text();
        const pois = [];
        const blocks = html.match(/<li[^>]*>[\s\S]*?<\/li>/g) || [];
        for (const block of blocks) {
            if (!block.includes('shopname') && !block.includes('shop-list')) continue;
            const imgTitle = block.match(/<img[^>]+title="([^"]{2,50})"/);
            const h4Title = block.match(/<h4>[\s\S]*?title="([^"]{2,50})"[\s\S]*?<\/h4>/);
            const name = (imgTitle?.[1] || h4Title?.[1] || '').trim();
            if (!name || name.length < 2) continue;
            const star = block.match(/star\s+star_(\d+)\s+star_sml/);
            const price = block.match(/mean-price[^>]*>[^<]*<b>([^<]+)<\/b>/);
            const comment = block.match(/review-num[^>]*>\s*(\d+)/);
            const commentB = block.match(/review-num[^>]*>[^<]*<b>(\d+)<\/b>/);
            const imgMatch = block.match(/data-src="([^"]+)"/);
            const tagMatches = block.match(/<span class="tag">([^<]+)<\/span>/g) || [];
            const tags = tagMatches.map(t => { const v = t.match(/>([^<]+)</); return v ? v[1] : ''; }).filter(Boolean);
            if (!tags.length) {
                const h4Tag = block.match(/<h4>([^<]*)<a/);
                if (h4Tag && h4Tag[1].trim()) tags.push(h4Tag[1].trim());
            }
            pois.push({
                poi_id: `dp_${name.replace(/[\s()（）·]/g, '_').toLowerCase()}`,
                name,
                city,
                categories: tags.slice(0, 3),
                avg_rating: star ? (parseInt(star[1]) / 10) : 4.0,
                review_count: (commentB ? parseInt(commentB[1]) : comment ? parseInt(comment[1]) : 0),
                avg_price: price ? parseInt(price[1].replace(/[¥￥]/g, '')) : 0,
                dp_image: imgMatch ? imgMatch[1] : '',
                type: /咖啡|茶|甜|饮|面包|书/.test(name + tags.join('')) ? 'rest' : /餐|菜|面|火锅|烧|串|小吃|粉|饭|食/.test(name + tags.join('')) ? 'food' : 'photo',
                reviews: []
            });
            if (pois.length >= limit) break;
        }
        return pois;
    } catch (e) {
        console.error('[search] scrape failed:', e.message);
        return [];
    }
}

async function handleSearch(req, res) {
    if (req.method === 'GET') {
        const u = new URL(req.url, `http://localhost`);
        const city = u.searchParams.get('city') || '上海';
        const keywords = (u.searchParams.get('keywords') || '景点,美食,咖啡').split(',');

        const cacheKey = `${city}:${keywords.sort().join(',')}`;
        if (_searchCache[cacheKey]) {
            return sendJson(res, 200, { pois: _searchCache[cacheKey], cached: true });
        }

        const cityShort = city.replace(/市$/, '');
        const cacheFile = path.join(__dirname, 'data', `cache_${cityShort}.json`);
        try {
            if (fs.existsSync(cacheFile)) {
                const d = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
                return sendJson(res, 200, { pois: d.pois || [], cached: true, source: 'cache' });
            }
        } catch {}
        if (cityShort === '上海') {
            const localFile = path.join(__dirname, 'data', 'real_pois.json');
            try {
                const d = JSON.parse(fs.readFileSync(localFile, 'utf8'));
                return sendJson(res, 200, { pois: d.pois || [], cached: true, source: 'local' });
            } catch {}
        }
        if (!DIANPING_COOKIE) {
            return sendJson(res, 200, { pois: [], cached: false, source: 'none' });
        }

        const allPois = [];
        for (const kw of keywords) {
            const pois = await scrapeDianping(kw.trim(), city, 5);
            allPois.push(...pois);
            if (keywords.indexOf(kw) < keywords.length - 1) {
                await new Promise(r => setTimeout(r, 1500));
            }
        }
        const seen = new Set();
        const deduped = allPois.filter(p => {
            if (seen.has(p.name)) return false;
            seen.add(p.name);
            return true;
        });

        _searchCache[cacheKey] = deduped;
        try {
            fs.writeFileSync(
                path.join(__dirname, 'data', `cache_${city.replace(/市$/, '')}.json`),
                JSON.stringify({ city, pois: deduped, scraped_at: new Date().toISOString() }, null, 2),
                'utf8'
            );
        } catch {}

        sendJson(res, 200, { pois: deduped, cached: false });
    } else {
        sendJson(res, 405, { error: 'use GET' });
    }
}

/* ============== 静态文件 ============== */
function serveStatic(req, res) {
    let pathname = decodeURIComponent(req.url.split('?')[0]);
    if (pathname === '/' || pathname === '') pathname = '/app.html';

    // 防越狱
    const safe = path.normalize(pathname).replace(/^([/\\]+)/, '');
    const filePath = path.join(__dirname, safe);
    if (!filePath.startsWith(__dirname)) return send(res, 403, 'forbidden');

    fs.stat(filePath, (err, st) => {
        if (err || !st.isFile()) return send(res, 404, 'not found');
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
    });
}

/* ============== 入口 ============== */
const server = http.createServer((req, res) => {
    if (req.url.startsWith('/api/health')) return handleHealth(req, res);
    if (req.url.startsWith('/api/llm'))    return handleLLM(req, res);
    if (req.url.startsWith('/api/vision')) return handleVision(req, res);
    if (req.url.startsWith('/api/refine')) return handleRefine(req, res);
    if (req.url.startsWith('/api/plan'))   return handlePlan(req, res);
    if (req.url.startsWith('/api/search')) return handleSearch(req, res);
    serveStatic(req, res);
});

server.listen(PORT, () => {
    console.log(`[citywalk] server running at http://localhost:${PORT}`);
    console.log(`  open http://localhost:${PORT}/app.html`);
});
