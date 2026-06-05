# 城脉 LU · 真实数据接入指南

本文档说明：**当真实的大众点评 / 高德 / 美团 / Claude 数据接入后，如何把当前 demo 平滑切到生产**。

> TL;DR 改动只发生在 `services/*.js` 的方法体内，UI 代码（`app.js`、HTML、CSS）和 Adapter 层基本不动。

---

## 目录与层级

```
Hackathon/
├── index.html / styles.css / app.js     ← UI 层（只调 Adapter）
├── adapter.js                           ← 适配层（组合 service 调用为 UI 形态 + 缓存）
├── services/
│   ├── dianping.js                      ← 大众点评（POI + 评论）
│   ├── amap.js                          ← 高德地图（路径、经纬度、地图渲染）
│   ├── meituan.js                       ← 美团（团购、排队、预约）
│   └── llm.js                           ← Claude API（抽取、总结、Agent 辩论）
└── data.js                              ← Mock 数据（生产环境可删）
```

依赖方向：`app.js → adapter.js → services/*.js → data.js (mock) | 真实 API`

---

## 切换总流程（生产上线检查清单）

| # | 改动点 | 文件 | 说明 |
|---|--------|------|------|
| 1 | 部署后端中转 | （新） | 不要在前端裸调 Claude / 大众点评 API（暴露 key）。建一个 `/api/{dianping,amap,meituan,llm}` 中转 |
| 2 | 替换 `services/dianping.js` 方法体 | `services/dianping.js` | 把每个 `_mockXxx` 调用换成 `fetch('/api/dianping/...')` |
| 3 | 替换 `services/amap.js` 方法体 | `services/amap.js` | 同上；地图渲染需要在 `index.html` 引入 AMap JS SDK |
| 4 | 替换 `services/meituan.js` 方法体 | `services/meituan.js` | 内部接口直接走 RPC，不走中转 |
| 5 | 替换 `services/llm.js` 方法体 | `services/llm.js` | 配 Anthropic Key + 开 prompt cache |
| 6 | UI 层适配（仅 1 处） | `app.js` 中的 `renderMap(cfg)` | `cfg.provider === 'amap'` 时改走 AMap JS SDK 渲染（注释里已经留位） |
| 7 | 删除 `data.js` 和 services 里的 `_mock*` | 多处 | 真实数据接入后清理 |

---

## 数据源 ① 大众点评（核心）

**真实接入选项**：
- **优先**：美团数据中台内部 RPC（数据更全、字段更多、无 OpenAPI 配额限制）
- **公开**：[openapi.dianping.com](https://openapi.dianping.com) — 需 B2B 申请
- **离线**：从大众点评公开页爬取 + 本地缓存（仅离线 demo 用，注意合规）

**关键映射**：

| Adapter 需要的字段 | services/dianping.js 方法 | 真实 API 字段（OpenAPI 风格） |
|---|---|---|
| POI 列表（按城市/区/品类筛） | `Dianping.searchPOI()` | `GET /v1/business/find_businesses` → `businesses[]` |
| 单 POI 详情 | `Dianping.getPOIDetail(poiId)` | `GET /v1/business/get_single_business?business_id=` |
| 评论列表 | `Dianping.getReviews(poiId, opts)` | `GET /v1/review/get_reviews?business_id=&sort=` |
| 差评/中评（避坑用） | `Dianping.getNegativeReviews(poiId)` | 同上，参数 `sort=bad`；或内部接口加 `rating_max=3` 过滤 |

**字段对齐**：`services/dianping.js` 每个方法的 JSDoc 已写明返回字段的 schema，照抄即可。

**切换步骤**：
1. 申请 OpenAPI Key 或拿到内部 RPC stub
2. 把 `_mockSearchPOI` / `_mockReviews` 等私有函数删掉
3. 每个 `async` 方法体改为：
   ```js
   async searchPOI(params) {
     const r = await fetch(`/api/dianping/find_businesses?${new URLSearchParams(params)}`);
     return (await r.json()).businesses;
   }
   ```
4. **关键**：返回结构尽量保持 schema 一致；如果真实字段名不同，在 Adapter 层做映射（不要改 UI）

---

## 数据源 ② 高德 AMap

**真实接入选项**：
- **Web Service API**：`https://restapi.amap.com/v3/...`（路径规划、POI 搜索、地理编码、静态地图）
- **JS API**：`https://webapi.amap.com/maps?v=2.0&key=KEY`（浏览器内交互地图）
- **两个 Key 分开申请**：Web Service Key 和 JS API Key 是两套配额

**关键映射**：

| Adapter 需要 | services/amap.js 方法 | 真实 API |
|---|---|---|
| 地址 → 经纬度 | `AMapAPI.geocode(addr, city)` | `GET /v3/geocode/geo` |
| 周边 POI 搜索 | `AMapAPI.nearbyPOIs({lng,lat,radius})` | `GET /v3/place/around` |
| 路径规划（步行/驾车/公交） | `AMapAPI.planRoute(points, mode)` | `GET /v3/direction/{walking|driving|transit/integrated}` |
| 静态地图图片 | `AMapAPI.staticMapURL({center, markers, path})` | `https://restapi.amap.com/v3/staticmap` |
| 交互地图渲染 | `AMapAPI.renderInteractiveMap(container, opts)` | `new AMap.Map(container, opts)` |

**最关键的改动**：地图从「SVG mock」切到「真实 AMap」

1. 在 `index.html` 引入 SDK：
   ```html
   <script src="https://webapi.amap.com/maps?v=2.0&key=YOUR_KEY"></script>
   ```
2. 在 `services/amap.js` 实现 `renderInteractiveMap`：
   ```js
   async renderInteractiveMap(container, opts) {
     const map = new AMap.Map(container, {
       center: opts.center,
       zoom:   opts.zoom,
       mapStyle: 'amap://styles/light',
     });
     opts.markers.forEach((m, i) => {
       new AMap.Marker({
         position: [m.lng, m.lat],
         content: `<div class="lu-pin lu-pin-${m.type}">${m.idx}</div>`,
       }).setMap(map);
     });
     if (opts.polyline) {
       new AMap.Polyline({
         path: opts.polyline.map(p => [p.lng, p.lat]),
         strokeColor: '#C8462C', strokeWeight: 4,
       }).setMap(map);
     }
     return map;
   }
   ```
3. 在 `app.js` `renderMap()` 顶部加分支（已留位）：
   ```js
   if (cfg.provider === 'amap') {
     return AMapAPI.renderInteractiveMap(container, {
       center: cfg.amap.center, zoom: cfg.amap.zoom,
       markers: cfg.markers, polyline: cfg.route?.polyline,
     });
   }
   ```
4. 在 `adapter.js` `getMapConfig()` 把 `provider` 改成 `'amap'`

**关于 chapter 坐标**：
- 当前 demo `chapter.coords = {x: 0..100, y: 0..100}` 是百分比
- 真实数据接入后改为 `{lng, lat}`，并删除 `AMapAPI.pctToLngLat()` 的占位转换
- `adapter.js` 已经在每个 chapter 上挂了 `ch.lngLat` —— UI 直接消费这个字段

---

## 数据源 ③ 美团

**真实接入**：内部数据中台（公开 OpenAPI 覆盖有限，主要走内部 RPC）

**关键映射**：

| Adapter 需要 | services/meituan.js 方法 | 内部接口 |
|---|---|---|
| 团购券 / 套餐 | `Meituan.getDeals(poiId)` | `meituan-deal-rpc.getDealsByPoi` |
| 实时排队 | `Meituan.getQueueStatus(poiId)` | `meituan-queue-rpc.getStatus`（缓存 30s） |
| 到店预约时段 | `Meituan.getReservationSlots(poiId, date)` | `meituan-reservation-rpc.getSlots` |
| 外卖菜单 | `Meituan.getDeliveryMenu(poiId)` | `meituan-waimai-rpc.getMenu` |

**未来 UI 接入价值**（demo 暂未渲染，但 Adapter 已经预留字段）：
- chapter 节点上加「**实时排队 12 人 · 约 25 分钟**」徽章（来自 `chapter.queue`）
- chapter 节点上加「**美团团购券 ¥288 / 原价 ¥368**」CTA（来自 deals）
- 详情页加「**一键预约**」按钮（slots → 拉起小程序/链接）

这是和美团比赛最贴合的转化点 ── 建议黑客松后期重点做。

---

## 数据源 ④ Claude API

**接入方式**：
- 前端绝不裸调，建后端 `/api/llm` 中转
- 后端引 `@anthropic-ai/sdk` 或 `anthropic` (Python)
- Model 分工：
  - **Sonnet 4.6** (`claude-sonnet-4-6`) — Persona Agent 辩论、方案生成、章节叙事
  - **Haiku 4.5** (`claude-haiku-4-5-20251001`) — 批量 UGC 抽取（避坑/标签/亮点）

**关键映射**：

| Adapter 需要 | services/llm.js 方法 | Claude 调用模式 |
|---|---|---|
| 评论 → 结构化避坑 JSON | `LLM.extractPitfalls(reviews, {poi})` | Haiku + Tool Use（schema 已写在 JSDoc） |
| 评论 → 隐式标签（拍照度/能量/情绪） | `LLM.extractImplicitTags(reviews, {poi})` | Haiku + Tool Use |
| 多 Agent 辩论 → 3 个方案 | `LLM.personaDebate({...})` | Sonnet × 4-stage orchestration |
| 单评论 → 关键短语高亮 | `LLM.highlightReviewKeyPhrase(text)` | Haiku 单次 |
| 方案级 AI 总结 | `LLM.summarizePlan(plan, {reviews})` | Sonnet |
| 章节叙事文案 | `LLM.narrateChapters(chapters)` | Sonnet |

**Prompt Cache 配置（关键省钱点）**：
- 候选 POI 列表 + 用户偏好画像 → 命中率高，加 `cache_control: { type: 'ephemeral' }`
- 多 Persona 调用时，system + POI 上下文 prompt 一定要缓存
- 参考 `claude-api` skill 的详细配置

---

## 切换前后对照表

| 项 | 当前 (mock) | 真实接入后 |
|---|---|---|
| 数据来源 | `data.js` 写死 | 三个 API + Claude |
| UI 代码 | 不变 | 不变 |
| Adapter | 直接读 `CASES` 等全局 | 调 `services/*.*` |
| Services 方法体 | `return _mockXxx()` | `return fetch(...)` |
| Service 方法签名 | **不变** | **不变** |
| 地图 | SVG 占位 | AMap JS SDK |
| 章节坐标字段 | `{x: 0..100, y: 0..100}` | `{lng, lat}` |
| 加载延迟 | 30-60ms 模拟 | 真实网络 100-500ms |

---

## 切换后必做的额外事项

1. **环境变量管理**：API keys 走 `.env`，不进 git
2. **请求限流 + 缓存**：Adapter 的 `_memo` 应改成带 TTL 的 SWR
3. **错误降级**：service 调用失败时，UI 退化到模板化展示（不要白屏）
4. **数据合规**：大众点评/小红书的爬取要遵守 robots + 用户协议
5. **performance**：所有 service 调用并行（`Promise.all`），且开 prompt cache

---

## 如何验证 mock 切真实没问题

写一组「**契约测试**」，固定输入断言输出 schema：

```js
// test/contracts.test.js
test('Dianping.getPOIDetail returns expected schema', async () => {
  const poi = await Dianping.getPOIDetail('test_id');
  expect(poi).toMatchObject({
    poi_id: expect.any(String),
    name: expect.any(String),
    longitude: expect.any(Number),
    latitude: expect.any(Number),
    avg_rating: expect.any(Number),
  });
});
```

这套测试在 mock 和真实接口下都应该通过 ── 是切换的 safety net。
