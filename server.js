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

if (!ARK_API_KEY) {
    console.warn('[warn] ARK_API_KEY 未设置，/api/vision 将返回 500。请先在 .env 中配置。');
}

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js':   'text/javascript; charset=utf-8',
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
    serveStatic(req, res);
});

server.listen(PORT, () => {
    console.log(`[citywalk] server running at http://localhost:${PORT}`);
    console.log(`  open http://localhost:${PORT}/app.html`);
});
