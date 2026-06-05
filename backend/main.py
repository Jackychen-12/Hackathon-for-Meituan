# ============================================================
# main.py · 城脉 LU · FastAPI 入口
# ------------------------------------------------------------
#   GET  /api/health        → 健康检查（前端据 has_key 决定走真实 / mock）
#   POST /api/llm           → LLM 中转（body: {method, payload}）
#   POST /api/dianping/...  → 数据源中转占位（暂未实现，返回 501）
#   /                       → 托管整个前端静态站点
# 启动：uvicorn backend.main:app --reload --port 8000
# ============================================================
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

load_dotenv()  # 读取 .env（ANTHROPIC_API_KEY 等）

from . import llm_service  # noqa: E402  （load_dotenv 之后再 import，确保读到 env）
from . import planner  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent  # 仓库根目录（含 index.html）

app = FastAPI(title="城脉 LU Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class LLMRequest(BaseModel):
    method: str
    payload: dict = {}


class PlanRequest(BaseModel):
    query: str


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "has_key": llm_service.has_key(),
        "model": llm_service.MODEL,
        "provider": "deepseek",
        "methods": list(llm_service.DISPATCH.keys()),
    }


@app.post("/api/llm")
def llm(req: LLMRequest):
    fn = llm_service.DISPATCH.get(req.method)
    if not fn:
        raise HTTPException(status_code=400, detail=f"unknown method: {req.method}")
    try:
        return {"result": fn(req.payload)}
    except Exception as e:  # 真实调用失败时给前端明确信号 → 前端回退 mock
        raise HTTPException(status_code=502, detail=f"llm call failed: {e}")


@app.post("/api/plan")
def plan(req: PlanRequest):
    try:
        result = planner.plan_route(req.query)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"plan failed: {e}")


# ---------- 数据源中转占位（dianping / amap / meituan） ----------
# 真实接入时在这里实现 RPC / OpenAPI 中转；当前返回 501，前端各 service 仍走自带 mock。
@app.api_route("/api/dianping/{path:path}", methods=["GET", "POST"])
@app.api_route("/api/amap/{path:path}", methods=["GET", "POST"])
@app.api_route("/api/meituan/{path:path}", methods=["GET", "POST"])
def datasource_stub(path: str):
    raise HTTPException(status_code=501, detail="datasource proxy not implemented yet; frontend uses local mock")


# ---------- 静态站点（必须最后挂，"/" 会兜住其余路径） ----------
app.mount("/", StaticFiles(directory=str(ROOT), html=True), name="static")
