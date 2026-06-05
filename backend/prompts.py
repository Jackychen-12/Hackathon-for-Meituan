# ============================================================
# prompts.py · 城脉 LU · 各 LLM 方法的 system prompt + Tool Schema
# ------------------------------------------------------------
# system prompt 设计为静态（与具体 POI / 用户无关），便于 prompt cache 命中。
# 变量部分全部放进 user message。
# ============================================================

# ---------- 创新点 1：UGC 负面信号 → 结构化避坑约束 ----------
EXTRACT_PITFALLS_SYSTEM = """你是本地生活避坑分析师。给你一个 POI 名称和它的若干条用户评论，
你要从中挖掘"负面信号"，归纳成结构化的避坑约束。只输出工具调用，不要解释。
- time_pitfalls：时段类坑（排队高峰、停止点单时间等）
- ops_pitfalls：运营类坑（营业时间陷阱、需预约、不收现金等）
- menu_pitfalls：菜品/项目类坑（踩雷菜、性价比低的项目）
- context_pitfalls：场景类坑（不适合带娃、雨天体验差等）
每条尽量给出依据；置信度 confidence 按评论数量与一致性给 0~1。"""

EXTRACT_PITFALLS_TOOL = {
    "name": "emit_pitfalls",
    "description": "输出结构化避坑约束",
    "input_schema": {
        "type": "object",
        "properties": {
            "summary": {"type": "string"},
            "time_pitfalls": {
                "type": "array",
                "items": {"type": "object", "properties": {
                    "window": {"type": "string"}, "issue": {"type": "string"}}},
            },
            "ops_pitfalls": {
                "type": "array",
                "items": {"type": "object", "properties": {
                    "type": {"type": "string"}, "detail": {"type": "string"}}},
            },
            "menu_pitfalls": {
                "type": "array",
                "items": {"type": "object", "properties": {
                    "avoid_item": {"type": "string"}, "reason": {"type": "string"}}},
            },
            "context_pitfalls": {
                "type": "array",
                "items": {"type": "object", "properties": {
                    "when": {"type": "string"}, "issue": {"type": "string"}}},
            },
            "confidence": {"type": "number"},
        },
        "required": ["summary", "confidence"],
    },
}

# ---------- 创新点 3 数据底座：隐式标签 ----------
EXTRACT_TAGS_SYSTEM = """你是本地生活体验标注师。根据 POI 评论，输出该地点的隐式体验标签。
photogenic 拍照度 0~1；energy_demand 体力/精力需求 1~5；mood_tags 情绪氛围词数组；
best_window 最佳到访时段；kid_friendly 是否适合带娃。只输出工具调用。"""

EXTRACT_TAGS_TOOL = {
    "name": "emit_tags",
    "description": "输出隐式体验标签",
    "input_schema": {
        "type": "object",
        "properties": {
            "photogenic": {"type": "number"},
            "energy_demand": {"type": "integer"},
            "mood_tags": {"type": "array", "items": {"type": "string"}},
            "best_window": {"type": "string"},
            "kid_friendly": {"type": "boolean"},
        },
        "required": ["photogenic", "energy_demand", "mood_tags", "best_window", "kid_friendly"],
    },
}

# ---------- 创新点 2：多 Persona Agent 辩论 → Pareto 方案 ----------
PERSONA_DEBATE_SYSTEM = """你是路线方案主持人，统筹多个 Persona Agent（如美食家、摄影师、性价比党、文艺青年）辩论。
输入：用户诉求、激活的 personas、候选 POI 列表、硬约束。
流程：每个 persona 站在自己立场提路线 → 互相批评 → 你汇总出 2~3 条"差异化(Pareto)"方案。
每条方案要立场鲜明、彼此不重复，并给出章节序列。只输出工具调用。"""

PERSONA_DEBATE_TOOL = {
    "name": "emit_plans",
    "description": "输出 2~3 条差异化路线方案",
    "input_schema": {
        "type": "object",
        "properties": {
            "plans": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "title": {"type": "string"},
                        "subtitle": {"type": "string"},
                        "stance": {"type": "string"},
                        "dominant": {"type": "array", "items": {"type": "string"}},
                        "chapters": {
                            "type": "array",
                            "items": {"type": "object", "properties": {
                                "num": {"type": "string"}, "time": {"type": "string"},
                                "title": {"type": "string"}, "place": {"type": "string"}}},
                        },
                    },
                    "required": ["id", "title", "stance", "chapters"],
                },
            }
        },
        "required": ["plans"],
    },
}

# ---------- 单评论关键短语高亮 ----------
HIGHLIGHT_SYSTEM = """从给定评论里挑出最值得高亮的一个短语（不超过 12 字），
要能体现该地点的独特价值或风险。只回复这个短语本身，不要引号、不要解释。"""

# ---------- 方案级 AI 总结 ----------
SUMMARIZE_PLAN_SYSTEM = """你是路线点评编辑。根据一个路线方案及其相关评论，输出方案级总结。
digest：一句话精华；fitFor：适合谁（数组）；notFor：不适合谁（数组）；basedOn：基于多少条评论。
只输出工具调用。"""

SUMMARIZE_PLAN_TOOL = {
    "name": "emit_summary",
    "description": "输出方案级总结",
    "input_schema": {
        "type": "object",
        "properties": {
            "digest": {"type": "string"},
            "fitFor": {"type": "array", "items": {"type": "string"}},
            "notFor": {"type": "array", "items": {"type": "string"}},
            "basedOn": {"type": "string"},
        },
        "required": ["digest", "fitFor", "notFor", "basedOn"],
    },
}

# ---------- 章节叙事文案 ----------
NARRATE_SYSTEM = """你是路线叙事作者。给你一组章节（含时间、地点、氛围），
为每个章节起一个富有故事感、东方编辑气质的章节标题，让整条路线像一卷可读的故事。
只输出工具调用，按输入顺序返回等长的标题数组。"""

NARRATE_TOOL = {
    "name": "emit_titles",
    "description": "按输入顺序输出等长的章节标题数组",
    "input_schema": {
        "type": "object",
        "properties": {"titles": {"type": "array", "items": {"type": "string"}}},
        "required": ["titles"],
    },
}

# ---------- 记忆飞轮：用户画像分析 ----------
ANALYZE_MEMORY_SYSTEM = """你是用户偏好分析引擎（记忆飞轮的心脏）。
输入：用户 profile、收藏列表、评论列表，以及可选的历史画像（做增量更新）。
输出一个 MemoryImage：summary 一句话画像；dominantPersonas（persona_id/weight/evidence）；
priceSensitivity 0~1；preferredCategories（name/weight）；dislikeSignals 数组；
timePatterns（favorite_window/weekend_active）；sourceStats（favorites_count/reviews_count/since）。
version 在历史 previousImage.version 基础上 +1。只输出工具调用。"""

ANALYZE_MEMORY_TOOL = {
    "name": "emit_memory_image",
    "description": "输出用户画像 MemoryImage",
    "input_schema": {
        "type": "object",
        "properties": {
            "version": {"type": "integer"},
            "summary": {"type": "string"},
            "dominantPersonas": {
                "type": "array",
                "items": {"type": "object", "properties": {
                    "persona_id": {"type": "string"}, "weight": {"type": "number"},
                    "evidence": {"type": "string"}}},
            },
            "priceSensitivity": {"type": "number"},
            "preferredCategories": {
                "type": "array",
                "items": {"type": "object", "properties": {
                    "name": {"type": "string"}, "weight": {"type": "number"}}},
            },
            "dislikeSignals": {"type": "array", "items": {"type": "string"}},
            "timePatterns": {
                "type": "object",
                "properties": {"favorite_window": {"type": "string"},
                               "weekend_active": {"type": "boolean"}},
            },
            "sourceStats": {
                "type": "object",
                "properties": {"favorites_count": {"type": "integer"},
                               "reviews_count": {"type": "integer"},
                               "since": {"type": "string"}},
            },
        },
        "required": ["version", "summary", "dominantPersonas", "priceSensitivity"],
    },
}
