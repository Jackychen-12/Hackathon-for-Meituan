# ============================================================
# llm_service.py · 城脉 LU · DeepSeek API 调用层
# ------------------------------------------------------------
# 使用 DeepSeek API（OpenAI 兼容协议）
# 模型：deepseek-chat（主力推理）
# ============================================================
from __future__ import annotations

import json
import os

from . import prompts

MODEL = os.getenv("LU_MODEL", "deepseek-chat")

_CLIENT = None


def has_key() -> bool:
    return bool(os.getenv("DEEPSEEK_API_KEY") or os.getenv("ANTHROPIC_API_KEY"))


def _client():
    global _CLIENT
    if _CLIENT is None:
        from openai import OpenAI
        _CLIENT = OpenAI(
            api_key=os.getenv("DEEPSEEK_API_KEY"),
            base_url="https://api.deepseek.com",
        )
    return _CLIENT


def _call_json(system: str, user_text: str, max_tokens: int = 2000) -> dict:
    resp = _client().chat.completions.create(
        model=MODEL,
        max_tokens=max_tokens,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system + "\n\n请严格以 JSON 格式输出，不要包含任何其他文本。"},
            {"role": "user", "content": user_text},
        ],
    )
    text = resp.choices[0].message.content.strip()
    return json.loads(text)


def _call_text(system: str, user_text: str, max_tokens: int = 200) -> str:
    resp = _client().chat.completions.create(
        model=MODEL,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_text},
        ],
    )
    return resp.choices[0].message.content.strip()


# ============================================================
# 7 个对外方法（与前端 services/llm.js 一一对应）
# ============================================================

def extract_pitfalls(payload: dict) -> dict:
    reviews = payload.get("reviews") or []
    poi = payload.get("poi") or {}
    if not has_key():
        return _mock_pitfalls(poi)

    system = """你是「城脉 LU」的避坑分析师 Agent。
你的职责是从大众点评/小红书用户评论中挖掘「负面信号」，转化为结构化的避坑约束。

## 输出 JSON 格式
{
  "summary": "一句话总结避坑要点",
  "time_pitfalls": [{"window": "时段描述", "issue": "具体问题"}],
  "ops_pitfalls": [{"type": "问题类型", "detail": "具体描述"}],
  "menu_pitfalls": [{"avoid_item": "不推荐项目", "reason": "原因"}],
  "context_pitfalls": [{"when": "什么情况下", "issue": "会遇到什么问题"}],
  "confidence": 0.0到1.0之间的置信度
}

## 规则
- time_pitfalls：排队高峰时段、停止营业/点单时间、客满高峰
- ops_pitfalls：营业时间陷阱、需提前预约、不收现金等
- menu_pitfalls：性价比低的菜品、口碑差的项目
- context_pitfalls：不适合带娃、雨天体验差、噪音大等
- confidence 根据评论数量和一致性判断，评论越多越一致则越高"""

    body = f"POI：{poi.get('name', '未知')}\n\n用户评论：\n{_join_reviews(reviews)}"
    return _call_json(system, body)


def extract_implicit_tags(payload: dict) -> dict:
    reviews = payload.get("reviews") or []
    poi = payload.get("poi") or {}
    if not has_key():
        return {"photogenic": 0.7, "energy_demand": 3, "mood_tags": ["治愈", "沉浸"],
                "best_window": "17:30-19:00", "kid_friendly": False}

    system = """你是「城脉 LU」的体验标注师 Agent。从评论中提取隐式体验标签。

输出 JSON：
{
  "photogenic": 0到1的拍照适合度,
  "energy_demand": 1到5的体力需求(1=完全放松, 5=暴走),
  "mood_tags": ["情绪氛围词", "最多4个"],
  "best_window": "最佳到访时段如 09:00-11:00",
  "kid_friendly": true或false
}"""

    body = f"POI：{poi.get('name', '未知')}\n\n评论：\n{_join_reviews(reviews)}"
    return _call_json(system, body)


def persona_debate(payload: dict) -> list:
    if not has_key():
        return []
    user_query = payload.get("userQuery", "")
    personas = payload.get("personas") or []
    candidate = payload.get("candidatePOIs") or []
    constraints = payload.get("constraints") or {}

    system = """你是「城脉 LU」的路线方案主持人 Agent。你统筹多个 Persona Agent 进行辩论式路线规划。

## 你的 Agent 团队
- 📷 photographer（摄影师）：追求出片、光线、机位，偏好黄金时段和低人流
- 🥢 foodie（美食家）：追求味道正宗、食材新鲜，不太在乎价格
- 💰 value（性价比党）：每一分钱都要花在刀刃上，追求高性价比
- 📖 literary（文青）：偏好书店、美术馆、独立咖啡馆，追求慢节奏和氛围
- 🏮 local（本地老饕）：只去本地人去的店，拒绝网红打卡
- 👶 parent（带娃党）：安全第一、节奏松散、需要儿童友好设施

## 辩论流程
1. 每个激活的 Persona 站在自己立场提出路线建议
2. Personas 互相批评对方方案的不足
3. 你作为主持人汇总出 3 条差异化(Pareto)方案

## 方案要求
- 每条方案必须立场鲜明，彼此有明显差异
- 每条包含 4-6 个章节节点
- 每个章节有时间、地点名、氛围标签

## 输出 JSON
{
  "plans": [
    {
      "id": "方案id如plan_photo",
      "title": "方案标题用书名号如《出片之旅》",
      "subtitle": "英文副标题",
      "stance": "一句话说明这个方案的核心立场",
      "dominant": ["主导persona_id"],
      "secondary": ["辅助persona_id"],
      "chapters": [
        {"num": "壹", "time": "09:30", "title": "地点名 · 活动描述", "place": "英文地名", "mood": "氛围词", "type": "photo/eat/rest"}
      ]
    }
  ]
}"""

    body = (
        f"用户诉求：{user_query}\n"
        f"激活 Personas：{', '.join(personas)}\n"
        f"硬约束：{json.dumps(constraints, ensure_ascii=False)}\n"
        f"候选 POI（{len(candidate)} 个）：\n{_poi_list_block(candidate)}"
    )
    out = _call_json(system, body, max_tokens=3000)
    return out.get("plans", [])


def highlight_review(payload: dict) -> str:
    text = payload.get("reviewText", "")
    if not has_key():
        return text[:8]
    return _call_text(
        "从给定评论里挑出最值得高亮的一个短语（不超过 12 字），体现该地点的独特价值或风险。只回复短语本身，不要引号不要解释。",
        text,
        max_tokens=30,
    )


def summarize_plan(payload: dict) -> dict:
    plan = payload.get("plan") or {}
    reviews = payload.get("reviews") or []
    if not has_key():
        return {"digest": "mock 总结", "fitFor": ["mock"], "notFor": ["mock"], "basedOn": "0 条评论"}

    system = """你是「城脉 LU」的路线点评编辑。根据路线方案和相关评论，输出精准总结。

输出 JSON：
{
  "digest": "一句话精华总结（30字以内）",
  "fitFor": ["适合的人群，2-3个"],
  "notFor": ["不适合的人群，1-2个"],
  "basedOn": "基于多少条评论分析"
}"""

    body = f"方案：{plan.get('title', '')} / {plan.get('subtitle', '')}\n相关评论（{len(reviews)} 条）：\n{_join_reviews(reviews)}"
    return _call_json(system, body)


def narrate_chapters(payload: dict) -> list:
    chapters = payload.get("chapters") or []
    if not has_key():
        return [c.get("title", "") for c in chapters]

    system = """你是「城脉 LU」的路线叙事作者。用现代东方编辑风格为每个章节起标题。

要求：
- 每个标题都像一卷故事的名字
- 融合地点特色和时间氛围
- 让整条路线读起来像一段可读的旅程
- 中文标题，可以用「·」分隔地点和动作

输出 JSON：{"titles": ["标题1", "标题2", ...]}
数量必须与输入章节数相同。"""

    body = "章节列表：\n" + "\n".join(
        f"{i+1}. {c.get('time','')} {c.get('place', c.get('title',''))} 氛围:{c.get('mood','')}"
        for i, c in enumerate(chapters)
    )
    out = _call_json(system, body)
    titles = out.get("titles", [])
    if len(titles) != len(chapters):
        titles = (titles + [c.get("title", "") for c in chapters])[:len(chapters)]
    return titles


def analyze_user_memory(payload: dict) -> dict:
    profile = payload.get("profile") or {}
    favorites = payload.get("favorites") or []
    reviews = payload.get("reviews") or []
    previous = payload.get("previousImage") or {}
    if not has_key():
        return _mock_memory(profile, favorites, reviews, previous)

    system = """你是「城脉 LU」记忆飞轮的核心引擎——用户偏好分析 Agent。

## 你的任务
分析用户在大众点评的收藏和评论行为，生成精准的用户画像（MemoryImage）。

## Persona 体系（persona_id 必须使用以下值）
- photographer：拍照党（出片优先，光线敏感）
- foodie：美食家（滋味为先，不抠预算）
- value：性价比党（每块钱花在刀刃上）
- literary：文青（书店咖啡馆，慢节奏）
- local：本地老饕（藏在巷子里的店）
- parent：带娃党（儿童友好，节奏松散）

## 分析维度
1. 从收藏品类分布推断偏好类别
2. 从评论关键词推断人格类型和权重
3. 从人均消费推断价格敏感度
4. 从评论情绪推断雷区/不喜欢的东西

## 输出 JSON
{
  "version": 历史版本+1,
  "summary": "一句话画像描述",
  "dominantPersonas": [
    {"persona_id": "使用上面的id", "weight": 0到1, "evidence": "推断依据"}
  ],
  "priceSensitivity": 0到1(0=不在乎价格, 1=极度敏感),
  "preferredCategories": [{"name": "品类名", "weight": 0到1}],
  "dislikeSignals": ["不喜欢的东西"],
  "timePatterns": {"favorite_window": "偏好时段", "weekend_active": true或false},
  "sourceStats": {"favorites_count": 数字, "reviews_count": 数字, "since": "加入时间"}
}"""

    body = (
        f"用户 profile：{json.dumps(profile, ensure_ascii=False)}\n"
        f"历史画像版本：{previous.get('version', 0)}\n"
        f"收藏（{len(favorites)} 条）：{_favorites_block(favorites)}\n"
        f"评论（{len(reviews)} 条）：\n{_join_reviews(reviews)}"
    )
    out = _call_json(system, body)
    out["version"] = (previous.get("version", 0) or 0) + 1
    out.setdefault("generated_at", _now())
    return out


DISPATCH = {
    "extractPitfalls": extract_pitfalls,
    "extractImplicitTags": extract_implicit_tags,
    "personaDebate": persona_debate,
    "highlightReviewKeyPhrase": highlight_review,
    "summarizePlan": summarize_plan,
    "narrateChapters": narrate_chapters,
    "analyzeUserMemory": analyze_user_memory,
}

# Keep old model name references for health endpoint
MODEL_SONNET = MODEL
MODEL_HAIKU = MODEL


# ============================================================
# helpers
# ============================================================
def _now() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


def _join_reviews(reviews: list) -> str:
    lines = []
    for i, r in enumerate(reviews[:40]):
        txt = r.get("text", "") if isinstance(r, dict) else str(r)
        rating = r.get("rating", "") if isinstance(r, dict) else ""
        lines.append(f"{i+1}. [{rating}] {txt}")
    return "\n".join(lines)


def _poi_list_block(pois: list) -> str:
    return "\n".join(
        f"- {p.get('name','')}（{p.get('category','')}，评分{p.get('avg_rating','')}，人均¥{p.get('avg_price','')}）"
        for p in pois[:30]
    )


def _favorites_block(favs: list) -> str:
    cats = {}
    for f in favs:
        c = f.get("poi_category", "其他")
        cats[c] = cats.get(c, 0) + 1
    return ", ".join(f"{k}×{v}" for k, v in sorted(cats.items(), key=lambda x: -x[1])[:8])


def _mock_pitfalls(poi: dict) -> dict:
    return {
        "poi_id": poi.get("poi_id", "mock"),
        "summary": "mock：N 条评论中提取的避坑提示。",
        "time_pitfalls": [{"window": "周末 13:00-14:00", "issue": "排队 60min+"}],
        "ops_pitfalls": [{"type": "营业时间陷阱", "detail": "21:30 停止点单"}],
        "menu_pitfalls": [],
        "context_pitfalls": [],
        "confidence": 0.62,
    }


def _mock_memory(profile: dict, favorites: list, reviews: list, previous: dict) -> dict:
    ver = (previous.get("version", 0) or 0) + 1
    return {
        "version": ver,
        "generated_at": _now(),
        "summary": "一个偏好本地探索 + 中等预算的用户",
        "dominantPersonas": [{"persona_id": "local", "weight": 0.55, "evidence": "上海本地用户"}],
        "priceSensitivity": 0.5,
        "preferredCategories": [{"name": "本地", "weight": 0.8}],
        "dislikeSignals": ["避开节假日人流高峰"],
        "timePatterns": {"favorite_window": "14:00-19:00", "weekend_active": True},
        "sourceStats": {
            "favorites_count": len(favorites),
            "reviews_count": len(reviews),
            "since": profile.get("join_date", "—"),
        },
    }
