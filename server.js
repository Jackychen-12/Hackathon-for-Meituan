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

const PORT = parseInt(process.env.PORT || '3000', 10);
const ARK_API_KEY = process.env.ARK_API_KEY || '';
const ARK_API_URL = process.env.ARK_API_URL || 'https://ark.cn-beijing.volces.com/api/v3/responses';
const ARK_MODEL  = process.env.ARK_MODEL  || 'doubao-seed-1-6-vision-250815';
const ARK_API_URL_TEXT = process.env.ARK_API_URL_TEXT || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const ARK_TEXT_MODEL   = process.env.ARK_TEXT_MODEL   || 'doubao-seed-1-6-250615';

if (!ARK_API_KEY) {
    console.warn('[warn] ARK_API_KEY 未设置，/api/vision 将返回 500。请先在 .env 中配置。');
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
        const r = await fetch(ARK_API_URL, {
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

async function handleRefine(req, res) {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'method not allowed' });
    if (!ARK_API_KEY) return sendJson(res, 500, { error: 'server missing ARK_API_KEY' });

    let payload;
    try {
        const buf = await readBody(req, 1 * 1024 * 1024);
        payload = JSON.parse(buf.toString('utf8'));
    } catch (e) {
        return sendJson(res, 400, { error: 'invalid json body: ' + e.message });
    }
    const userText = (payload && payload.text || '').toString().trim();
    if (!userText) return sendJson(res, 400, { error: 'missing text' });

    const arkBody = {
        model: ARK_TEXT_MODEL,
        messages: [
            { role: 'system', content: REFINE_SYSTEM_PROMPT },
            { role: 'user',   content: userText }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
    };

    try {
        const r = await fetch(ARK_API_URL_TEXT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + ARK_API_KEY
            },
            body: JSON.stringify(arkBody)
        });
        const text = await r.text();
        if (!r.ok) {
            console.error('[refine] upstream error', r.status, text.slice(0, 500));
            return sendJson(res, 502, { error: 'upstream ' + r.status, detail: text });
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
        const fields = normalizeRefine(parsed || {});
        sendJson(res, 200, { fields, rawText: outText, raw: data });
    } catch (e) {
        console.error('[refine] fetch failed:', e);
        sendJson(res, 500, { error: 'fetch failed: ' + e.message });
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
    if (req.url.startsWith('/api/vision')) return handleVision(req, res);
    if (req.url.startsWith('/api/refine')) return handleRefine(req, res);
    serveStatic(req, res);
});

server.listen(PORT, () => {
    console.log(`[citywalk] server running at http://localhost:${PORT}`);
    console.log(`  open http://localhost:${PORT}/app.html`);
});
