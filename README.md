<div align="center">

# 城脉 LU · 一条会讲故事的本地路线

**POI × UGC × LLM Agents · 美团黑客松 Demo**

[![Live Demo](https://img.shields.io/badge/Live_Demo-在线体验-2ea44f?style=for-the-badge)](https://jackychen-12.github.io/Hackathon-for-Meituan/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Claude AI](https://img.shields.io/badge/Claude_AI-Agent-7C3AED?logo=anthropic&logoColor=white)](https://anthropic.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

</div>

---

## 这是什么

> "周末在上海，喜欢拍照不想排队，预算 500，想感受一点烟火气。"

说一句话，**6 位 AI Persona Agent** 帮你协商生成 **3 条差异化路线**，每一站都从大众点评 UGC 里挖过避坑信号，越用越懂你。

城脉 LU（CityVein）是一个面向本地出行场景的 **LLM 路线规划系统**，核心思路：

- **POI 数据** 提供目的地候选
- **UGC 评论** 提取负面信号转化为避坑约束
- **多 Agent 协商** 生成个性化差异方案

---

## 功能一览

| 页面 | 功能 | 说明 |
|------|------|------|
| **输入** | 自然语言 + Persona 选择 | 说一句话描述需求，选"拍照党/美食家/性价比党/带娃/文青/本地老饕"偏好 |
| **方案对比** | 3 条差异化路线 | 多 Persona Agent 协商后输出三个方案，雷达图对比五维评分 |
| **路线详情** | 地图 + 时间线 + 避坑 | 高德地图渲染、章节式行程、每站标注避坑信号和美团团购 |
| **AI 对话** | 路线实时调整 | "便宜一点""加杯咖啡""把第三站换掉"——对话式修改路线 |
| **用户画像** | 记忆飞轮 | 从大众点评收藏/评论构建偏好画像，越用越准 |
| **设置** | 隐私 + Agent 团 + 语气 | 数据源开关、隐私控制、Agent 选择、对话风格调节 |

---

## 三大创新点

### 1. UGC 负面信号 → 避坑约束

传统路线规划只看评分和距离。城脉 LU 从大众点评/小红书评论中 **抽取负面信号**（排队 2 小时、周末闭馆、停车难...），自动转化为路径规划的**硬约束条件**。

```
评论: "周六去排了 40 分钟队，菜上得也慢"
  → 约束: 周末避开 / 错峰到达 / 标注「避」徽章
```

### 2. 多 Persona Agent 协商 → Pareto 差异化方案

不是给一个"最优解"，而是让 6 位 Persona Agent（拍照党、美食家、性价比党、文青、本地老饕、带娃党）**先辩论、再妥协**，输出 3 条在不同维度各有取舍的路线。

```
拍照党: "外滩必须黄金时段去"
性价比党: "那时候附近餐厅全溢价，换个角度拍也行"
→ 方案 A: 拍照优先（外滩日落）
→ 方案 B: 性价比优先（苏州河替代）
→ 方案 C: 折中（外滩早去 + 平价午餐）
```

### 3. 用户记忆飞轮 → 越用越懂你

授权大众点评后，从你的 **收藏和评论** 中构建偏好画像（口味、价格敏感度、品类偏好、雷区），每次浏览和调整路线都会悄悄记录，攒够后自动刷新画像版本。

---

## 架构

```
┌────────────────────────────────────────────────────────────┐
│                        用户浏览器                           │
│                                                            │
│  index.html ─── app.js ─── styles.css                      │
│       │                                                    │
│       └── adapter.js  （统一数据层，缓存 + mock 兜底）        │
│              │                                             │
│    ┌─────────┼─────────┬──────────┐                        │
│    │         │         │          │                        │
│ services/ services/ services/ services/                    │
│ dianping  amap      meituan   llm                         │
│ (评论/POI) (地图)    (团购)    (Agent)                      │
└────┼─────────┼─────────┼──────────┼────────────────────────┘
     │         │         │          │
     ▼         ▼         ▼          ▼
┌─────────────────────────────────────────┐
│           FastAPI 后端 (backend/)        │
│  /api/health · /api/llm · /api/plan     │
│  Claude AI · DeepSeek · 数据源中转       │
└─────────────────────────────────────────┘
```

**前端**：Vanilla JS 单页应用（5 个视图）+ 两个 React 子应用（POI 探索 + 路线规划移动端）

**后端**：FastAPI + Claude AI（Sonnet/Haiku），提供 LLM 中转和路线规划 API

**数据兜底**：无 API Key 时自动降级到 mock 数据，demo 始终可完整运行

---

## 快速开始

### Docker（推荐）

```bash
git clone https://github.com/Jackychen-12/Hackathon-for-Meituan.git
cd Hackathon-for-Meituan
cp .env.example .env          # 可留空，mock 兜底
docker-compose up
# 打开 http://localhost:8000
```

### 本地开发

```bash
# 后端
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000

# 或仅前端（纯 mock 模式）
npx serve .
# 打开 http://localhost:3000
```

### 环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| `ANTHROPIC_API_KEY` | Claude API Key（留空走 mock） | 否 |
| `LU_MODEL_SONNET` | Sonnet 模型 ID | 否 |
| `LU_MODEL_HAIKU` | Haiku 模型 ID | 否 |

---

## 项目结构

```
├── index.html              # 主入口（现代东方编辑风 SPA）
├── app.js                  # UI 逻辑（2662 行，按视图分区 @owner）
├── styles.css              # 样式（4273 行）
├── adapter.js              # 统一数据层（组合 services，缓存 + mock 兜底）
├── data.js                 # Mock 数据
├── memory.js               # 用户记忆（localStorage 持久化）
├── settings.js             # 用户设置
├── config.js               # 全局配置（API Key / 开关）
├── services/
│   ├── dianping.js          # 大众点评（POI + 评论）
│   ├── amap.js              # 高德地图（路径 + 经纬度）
│   ├── meituan.js           # 美团（团购 + 排队）
│   └── llm.js               # LLM 调用底座
├── backend/
│   ├── main.py              # FastAPI 入口
│   ├── llm_service.py       # LLM 中转服务
│   ├── planner.py           # 路线规划编排
│   └── prompts.py           # Prompt 模板
├── data/                    # 真实 POI 数据（北京/上海/广州/深圳/杭州）
├── explore-route.tsx        # React 子应用：POI 探索
├── route-plan.tsx           # React 子应用：路线规划（移动端）
├── app.html                 # 移动端版本入口
├── docker-compose.yml
├── Dockerfile
├── AGENTS.md                # 协作规范（三人分工 + AI Agent 规则）
├── CONTRIBUTING.md          # 贡献指南
└── INTEGRATION.md           # 真实数据接入指南
```

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Vanilla JS · React 19 · Tailwind CSS · AMap JS SDK |
| 后端 | FastAPI · Uvicorn · OpenAI SDK |
| AI | Claude Sonnet/Haiku · DeepSeek（failover） |
| 数据 | 大众点评 · 高德地图 · 美团 |
| 部署 | Docker Compose · Render · GitHub Pages |

---

## 协作设计

本项目为三人黑客松，采用**页面所有权制度**：

- **T1**：Landing 输入页 + 全局壳
- **T2**：Compare 方案对比页 + Profile 画像页
- **T3**：Detail 路线详情页

详见 [AGENTS.md](./AGENTS.md)（AI Agent 也遵守同一规范）和 [CONTRIBUTING.md](./CONTRIBUTING.md)。

---

<div align="center">
<sub>城脉 LU · 美团黑客松 2026</sub>
</div>
