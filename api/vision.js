/**
 * Vercel Serverless Function: /api/vision
 * 代理调用豆包 ARK Vision API。
 * API Key 从 Vercel 项目环境变量读取，不会下发到浏览器。
 *
 * 需要在 Vercel Project Settings → Environment Variables 配置：
 *   ARK_API_KEY  （必填）
 *   ARK_API_URL  （可选，默认 https://ark.cn-beijing.volces.com/api/v3/responses）
 *   ARK_MODEL    （可选，默认 doubao-seed-1-6-vision-250815）
 */

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'method not allowed' });
        return;
    }

    const ARK_API_KEY = process.env.ARK_API_KEY || '';
    const ARK_API_URL = process.env.ARK_API_URL || 'https://ark.cn-beijing.volces.com/api/v3/responses';
    const ARK_MODEL   = process.env.ARK_MODEL   || 'doubao-seed-1-6-vision-250815';

    if (!ARK_API_KEY) {
        res.status(500).json({ error: 'server missing ARK_API_KEY' });
        return;
    }

    // Vercel 默认会自动解析 JSON body 到 req.body；为了兼容也手动兜底一下
    let payload = req.body;
    if (!payload || typeof payload === 'string') {
        try { payload = JSON.parse(payload || '{}'); } catch (e) {
            res.status(400).json({ error: 'invalid json body' });
            return;
        }
    }

    const imageUrl = payload && payload.image_url;
    const prompt   = payload && payload.prompt;
    if (!imageUrl || !prompt) {
        res.status(400).json({ error: 'missing image_url or prompt' });
        return;
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
            res.status(502).json({ error: 'upstream ' + r.status, detail: text });
            return;
        }
        let data;
        try { data = JSON.parse(text); } catch { data = { raw: text }; }

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

        res.status(200).json({ text: outText, raw: data });
    } catch (e) {
        console.error('[vision] fetch failed:', e);
        res.status(500).json({ error: 'fetch failed: ' + e.message });
    }
};

// 让 Vercel 把 body 解析成 JSON
module.exports.config = {
    api: {
        bodyParser: { sizeLimit: '20mb' }
    }
};
