// ============================================================
// config.js · 城脉 LU 全局配置
// ------------------------------------------------------------
// 把所有"接真实数据需要的 key / 开关"集中在这里。
// 演示模式下保持默认值即可（全用 mock）。
// ============================================================

window.LU_CONFIG = {

  // ---------- 高德地图 ----------
  // JS API Key 申请地址: https://console.amap.com/dev/key/app
  // 选择 "Web 端 (JS API)" 类型；同时建议开启 "安全密钥" (securityJsCode)
  // 留空时降级为 SVG 占位地图（当前默认）
  amapKey: '6f73fab73ee2df39d1476ec92436a542',
  amapSecurityCode: 'ef586227f730ac06d8c75d02f379ecf0',

  // ---------- 大众点评登录 ----------
  // true: 走 mock 登录流程（点击 → 假装 OAuth → 拿 mock 用户数据）
  // false: 走真实 OAuth（需要后端 /api/dianping/oauth/* 中转）
  mockLogin: true,
  dianpingOAuthURL: '/api/dianping/oauth/start',

  // ---------- LLM ----------
  // 后端中转地址，前端永远不直连 Anthropic
  llmBackendURL: '/api/llm',  // 本地开发：http://localhost:8000/api/llm

  // ---------- 记忆飞轮 ----------
  memoryStorageKey: 'lu_memory_v1',
  memoryAutoBumpEvery: 5,    // 每 N 次互动自动升级一版记忆（demo 用）
};
