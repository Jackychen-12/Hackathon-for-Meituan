/**
 * Vercel Serverless Function: /api/refine
 * 把用户语音 / 自由文本输入交给豆包大模型，按固定字段精炼成结构化 JSON。
 *
 * 入参： { "text": "用户原始的一段话" }
 * 出参： {
 *   "fields": {
 *     "time":   "周末下午",
 *     "place":  ["华侨城", "海上世界"],
 *     "food":   "粤式早茶",
 *     "people": "闺蜜两人",
 *     "style":  "出片打卡",
 *     "other":  ""
 *   },
 *   "raw": <模型原始返回>
 * }
 *
 * Vercel 项目环境变量：
 *   ARK_API_KEY      （必填）
 *   ARK_API_URL_TEXT （可选，默认 https://ark.cn-beijing.volces.com/api/v3/chat/completions）
 *   ARK_TEXT_MODEL   （可选，默认 doubao-seed-1-6-250615 或 doubao-1-5-pro-32k-250115）
 */

const SYSTEM_PROMPT = `你是 CityWalk 路线规划助手的输入精炼模块。
用户会用一段口语化的中文描述自己想要的城市漫步路线，你需要从中提炼出以下字段：

- time   ：时间安排（如"周末下午"、"晚上 6 点之后"、"半天"等；找不到就为空字符串）
- place  ：出发地 / 想去的地点 / 商圈 / 景点的数组（最多 5 个，按出现顺序，去重；找不到就为空数组）
- food   ：美食 / 想吃什么（如"粤式早茶"、"咖啡甜品"；找不到就为空字符串）
- people ：游玩人数 / 同行者（如"一个人"、"闺蜜两人"、"带娃 3 口之家"；找不到就为空字符串）
- style  ：风格 / 偏好（如"出片打卡"、"小众安静"、"夜景微醺"；找不到就为空字符串）
- other  ：以上都装不下、但用户明确强调的其它要求（如"避开人多"、"步行不要太累"；找不到就为空字符串）

【输出要求】
1. 只输出一个合法 JSON 对象，键名严格为上述 6 个，不要加任何解释、Markdown、代码块。
2. 不要编造没说过的内容：用户没提就给空字符串 / 空数组。
3. 字段值要简练（每个字段控制在 12 字以内，place 单项 8 字以内）。
4. place 数组里只放具体地名，不要放"附近、市中心"这种泛指。`;

function extractJson(text) {
    if (!text) return null;
    // 去掉可能的 ```json ... ``` 包裹
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fence ? fence[1] : text;
    // 找第一个 { 到最后一个 } 之间的子串
    const a = candidate.indexOf('{');
    const b = candidate.lastIndexOf('}');
    if (a < 0 || b < 0 || b <= a) return null;
    try { return JSON.parse(candidate.slice(a, b + 1)); }
    catch { return null; }
}

function normalize(raw) {
    const f = raw && typeof raw === 'object' ? raw : {};
    const str = (v) => (typeof v === 'string' ? v.trim() : '');
    let place = [];
    if (Array.isArray(f.place)) place = f.place;
    else if (typeof f.place === 'string' && f.place.trim()) place = f.place.split(/[、,，\/\s]+/);
    place = place.map(x => String(x).trim()).filter(Boolean);
    // 去重保序
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

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'method not allowed' });
        return;
    }

    const ARK_API_KEY = process.env.ARK_API_KEY || '';
    const ARK_API_URL = process.env.ARK_API_URL_TEXT
        || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
    const ARK_MODEL   = process.env.ARK_TEXT_MODEL || 'doubao-seed-1-6-250615';

    if (!ARK_API_KEY) {
        res.status(500).json({ error: 'server missing ARK_API_KEY' });
        return;
    }

    let payload = req.body;
    if (!payload || typeof payload === 'string') {
        try { payload = JSON.parse(payload || '{}'); }
        catch { res.status(400).json({ error: 'invalid json body' }); return; }
    }
    const userText = (payload && payload.text || '').toString().trim();
    if (!userText) {
        res.status(400).json({ error: 'missing text' });
        return;
    }

    const arkBody = {
        model: ARK_MODEL,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user',   content: userText }
        ],
        temperature: 0.2,
        // 部分豆包文本模型支持 response_format=json_object，开启更稳；不支持也不会报错
        response_format: { type: 'json_object' }
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
            console.error('[refine] upstream error', r.status, text.slice(0, 500));
            res.status(502).json({ error: 'upstream ' + r.status, detail: text });
            return;
        }
        let data;
        try { data = JSON.parse(text); } catch { data = { raw: text }; }

        // 兼容 chat/completions 的标准结构
        let outText = '';
        if (data && Array.isArray(data.choices) && data.choices[0]) {
            const m = data.choices[0].message;
            if (m && typeof m.content === 'string') outText = m.content;
        }
        if (!outText && typeof data.output_text === 'string') outText = data.output_text;

        const parsed = extractJson(outText);
        const fields = normalize(parsed || {});

        res.status(200).json({ fields, rawText: outText, raw: data });
    } catch (e) {
        console.error('[refine] fetch failed:', e);
        res.status(500).json({ error: 'fetch failed: ' + e.message });
    }
};

module.exports.config = {
    api: {
        bodyParser: { sizeLimit: '1mb' }
    }
};
