# AGENTS.md · 城脉 LU 协作标准（人类 & AI Agent 通用）

> 这是本仓库的**权威协作规范**。任何 coding agent（Claude Code / Cursor / Copilot 等）
> 在改动本仓库前 **必须先读本文件**，并严格遵守「页面所有权」与「黄金法则」。
> 人类协作流程见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 项目一句话

城脉 LU（CityVein）= POI × UGC × LLM 的本地出行路线规划 SPA（美团黑客松）。
前端是 **Vanilla JS 单页应用**（`index.html` + `app.js` + `styles.css`），
后端是 **FastAPI**（`backend/`），数据统一经 `adapter.js` 的 `Adapter.*` 异步获取，
无 key 时由 `data.js` 提供 mock 兜底。

## 跑起来

```bash
cp .env.example .env          # 可留空，mock 兜底
./run.sh                      # 或 docker-compose up
./smoke.sh                    # 冒烟测试
```

---

## 成员名单（开工前填）

| 代号 | 真实姓名 | GitHub | 负责页面 |
| ---- | -------- | ------ | -------- |
| **T1** | ＿＿＿ | @＿＿ | Landing 输入页 + 全局壳 |
| **T2** | ＿＿＿ | @＿＿ | Compare 方案对比页 + Profile 画像页 |
| **T3** | ＿＿＿ | @＿＿ | Detail 路线详情页（整页） |

---

## 黄金法则（给 agent 的硬规则）

1. **只改自己 owner 的页面区域。** 动手前先 grep 你的代号（如 `@owner T3`）定位边界。
2. **不确定归属时，查下方「页面所有权地图」**；仍不确定 → 视为 SHARED，先在 PR 里 @ 另外两人。
3. **改 `SHARED 共享核心` 必须谨慎**：这些文件人人依赖，改动要在 PR 描述里写清影响面，且需另一人 review。
4. **绝不跨页面"顺手重构"。** 修 Detail 的 bug 不要去动 Landing 的代码，即使看起来更优雅。
5. **一人一分支、一功能一分支**，分支名 `feature/<页面>-<描述>`，如 `feature/detail-map-cluster`。
6. **不要把 `.env` / 任何 key 提交进来。**
7. 改完跑 `./smoke.sh`，本地能起、目标页面能用，再发 PR。

---

## 页面所有权地图

> 列出每个页面对应的 `index.html` 锚点、`app.js` 函数、`styles.css` 区块、后端文件。
> Agent 改某页面时，**只在该行所列的范围内活动**。

### T1 · Landing 输入页 + 全局壳

| 维度 | 归属范围 |
| ---- | -------- |
| index.html | `MASTHEAD`、`<section id="view-landing">`（VIEW 1） |
| app.js | `_extractConstraints`（时空约束识别）、`switchView`（VIEW SWITCHING）、`renderLanding` / `_renderIntentChips`、`enableDragScroll`、`AUTH BUTTON` 区、`路线生成仪式感 overlay`(GR_STEPS)、`renderSettings`(SETTINGS PAGE)、`MEMORY FLYWHEEL` 浮窗 |
| styles.css | `RESET`、`MASTHEAD`、`VIEW SWITCHING`、`VIEW 1 — LANDING`、`INTENT CHIPS`、`MASTHEAD ACTIONS`、`AUTH BUTTON`、`ROUTE GENERATION RITUAL` |
| 后端/服务 | `settings.js`、`config.js`（与 SHARED 共管，改前知会） |
| 承接创新 | 意图识别入口（query → 时空约束 + 意图 chips） |

### T2 · Compare 方案对比页 + Profile 画像页

| 维度 | 归属范围 |
| ---- | -------- |
| index.html | `<section id="view-compare">`（VIEW 2）、`<section id="view-profile">`（VIEW 4） |
| app.js | `RADAR_AXES` / `_renderPersonaRadar`（5 维雷达图）、`renderCompare`、`PROFILE MODAL`、`renderProfile`（VIEW · PROFILE） |
| styles.css | `VIEW 2 — COMPARE`、`DEBATE 可互动`、`PROFILE / MEMORY MODAL` |
| 后端/服务 | `services/llm.js` 的 persona/debate 编排（与 SHARED 共管）、`backend/prompts.py` 中 persona 相关 prompt |
| 承接创新 | #2 Pareto 差异化方案、#3 Persona 辩论 |

### T3 · Detail 路线详情页（整页）

| 维度 | 归属范围 |
| ---- | -------- |
| index.html | `<section id="view-detail">`（VIEW 3，含 map / chapters / ai-chat-dock / ugc） |
| app.js | `renderDetail`、`_patchMapWithDraft`、`renderMap`、`renderChapters` / `_bindChapterMapLink` / `_scrollChapterIntoView`、`_renderPitfallExtras`、`_renderMeituanRow`、`_rerenderAfterDraftChange`、`renderUGCSection` / `_inferUGCCategory`、AI 对话 dock(acd) |
| styles.css | `VIEW 3 — DETAIL`、`NARRATIVE ARC`、`PITFALL EXTRAS`、`MEITUAN 转化条`、`AI CHAT DOCK`、`CHAPTER ACTIONS MENU`、`PITFALL 可交互`、`UGC 简化版` |
| 后端/服务 | `services/amap.js`（地图/POI）、`services/dianping.js`（UGC）、`services/meituan.js`（团购） |
| 承接创新 | #1 避坑挖掘、#4 能量曲线叙事 |

---

## SHARED · 共享核心（改动需谨慎 + 另一人 review）

这些文件**所有页面都依赖**，没有单一 owner。改动前在群里说一声，PR 里写清影响面：

| 文件 | 作用 | 改动注意 |
| ---- | ---- | -------- |
| `adapter.js` | 统一数据层，前端只经 `Adapter.*` 取数 | 改接口签名会波及三个页面，必须周知 |
| `data.js` | mock 数据（无 key 兜底，演示靠它） | 改字段结构前确认三页都不受影响 |
| `app.js` 顶部 header + `TOAST` 工具 | 公共工具 | 只增不改，避免破坏现有调用 |
| `backend/main.py` / `llm_service.py` / `prompts.py` | FastAPI 编排 + LLM 服务 | 路由/返回结构变更需周知 |
| `services/llm.js` | LLM 调用底座 | T2/T3 都用，改底座要 review |
| `README.md` / `Dockerfile` / `render.yaml` / `docker-compose.yml` / `Procfile` | 文档与部署 | 部署相关改动谨慎，别在 demo 前动 |

---

## 如何快速定位归属

```bash
# 看某段代码归谁：在 app.js / styles.css / index.html 里搜 @owner 标记
grep -n "@owner" app.js styles.css index.html

# 找自己（如 T3）的全部地盘
grep -rn "@owner T3" .
```

每个页面区块的起始 banner 注释都带 `@owner Tx` 标记，是归属的**单一事实来源**；
本文件的「页面所有权地图」是其人类可读索引，两者冲突以本文件为准（并请修正代码标记）。

## 提交与 PR

分支命名、提交、合并、冲突处理全部遵循 [CONTRIBUTING.md](./CONTRIBUTING.md)。
PR 模板见 `.github/PULL_REQUEST_TEMPLATE.md`。
