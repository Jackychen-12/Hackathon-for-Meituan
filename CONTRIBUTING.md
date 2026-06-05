# 协作规范（三人黑客松）

为了避免互相覆盖代码、main 分支随时可跑，请大家遵守下面的流程。

## 一、第一次开工

```bash
git clone https://github.com/keyuchen-del/Hackathon-for-Meituan.git
cd Hackathon-for-Meituan
cp .env.example .env      # 填入自己的 key
```

## 二、每次开始写代码前

```bash
git checkout main
git pull                  # 先拉最新，避免基于旧代码开分支
git checkout -b <类型>/<简短描述>
```

## 三、分支命名约定

| 前缀        | 用途             | 示例                          |
| ----------- | ---------------- | ----------------------------- |
| `feature/`  | 新功能           | `feature/route-planner`       |
| `fix/`      | 修 bug           | `fix/poi-empty-result`        |
| `refactor/` | 重构/整理        | `refactor/adapter-cleanup`    |
| `docs/`     | 文档             | `docs/readme-deploy`          |

> 一人一分支、一个功能一分支。**不要直接往 `main` push。**

## 四、提交 & 合并

```bash
git add .
git commit -m "简明说清改了什么"   # 例：feat: 接入高德 POI 检索
git push -u origin <你的分支名>
```

然后到 GitHub 发起 **Pull Request → 合并到 main**，@ 另一个人扫一眼再 merge。

## 五、分工：按页面整块分（不是前后端）

每人负责**一整块页面 + 它的设计 + 支撑逻辑**，页面之间零重叠，这样最不容易撞车。
完整的页面所有权地图（精确到函数 / CSS 区块 / 后端文件）见 **[AGENTS.md](./AGENTS.md)**。

| 代号 | 姓名（填） | 负责页面 | 承接创新 |
| ---- | ---------- | -------- | -------- |
| **T1** | ＿＿ | **Landing 输入页 + 全局壳**（登录/设置/路线生成 overlay/记忆飞轮） | 意图识别入口 |
| **T2** | ＿＿ | **Compare 方案对比页 + Profile 画像页**（雷达图/3 方案/辩论/画像） | #2 Pareto 方案、#3 Persona 辩论 |
| **T3** | ＿＿ | **Detail 路线详情页（整页）**（地图/章节叙事/避坑/美团/UGC/AI 对话） | #1 避坑挖掘、#4 能量曲线叙事 |

**共享核心**（`adapter.js` / `data.js` / `backend/` / `services/llm.js` 等）没有单一 owner，
改动前群里说一声、PR 里写清影响面，并请另一人 review。详见 AGENTS.md 的「SHARED 共享核心」。

> 提示：在代码里搜 `@owner T3` 就能定位某人的全部地盘。

## 六、冲突了怎么办

```bash
git checkout main && git pull
git checkout <你的分支>
git merge main            # 把最新 main 合进来，解决冲突后再 push
```

冲突别慌，打开冲突文件保留正确的部分，删掉 `<<<<<<<` `=======` `>>>>>>>` 标记即可。拿不准就群里喊一声一起看。
