# ============================================================
# planner.py · 城脉 LU · 完整路线规划编排
# 用户输入 → 意图识别 → 大众点评搜索 → LLM 路线规划
# ============================================================
import json
import os

from . import llm_service
from .dianping_scraper import search_multi, get_city_id
from .logger_util import log


def plan_route(user_query: str) -> dict:
    log(f"[planner] start: {user_query}")

    # Step 1: 意图识别（LLM 优先，失败用本地规则）
    intent = _parse_intent(user_query)
    log(f"[planner] intent: {json.dumps(intent, ensure_ascii=False)}")

    city = intent.get("city", "上海")
    keywords = intent.get("keywords", [])
    personas = intent.get("personas", ["foodie", "photographer"])
    constraints = intent.get("constraints", {})

    if not keywords:
        keywords = ["美食", "景点", "咖啡"]

    # Step 2: 搜索大众点评
    pois = search_multi(keywords, city, per_keyword=3)
    log(f"[planner] searched {len(pois)} POIs")

    if not pois:
        return {"error": "no_pois", "message": f"未能在{city}搜索到相关商户，请检查 cookie 或换个关键词"}

    # Step 3: 路线规划（LLM 优先，失败用本地模板）
    plans = _generate_plans(user_query, city, pois, personas, constraints)
    if not plans:
        log("[planner] LLM plan failed, using local template")
        plans = _local_template_plans(user_query, city, pois, personas)
    log(f"[planner] generated {len(plans)} plans")

    # Step 4: 组装返回
    return {
        "query": user_query,
        "city": city,
        "intent": intent,
        "candidatePOIs": pois,
        "plans": plans,
    }


def _parse_intent(query: str) -> dict:
    system = """你是「城脉 LU」的意图识别引擎。解析用户的路线规划需求。

输出 JSON：
{
  "city": "城市名（如上海、成都、北京）",
  "keywords": ["搜索关键词数组，用于搜索大众点评，3-6个，如：火锅、太古里、咖啡馆、春熙路"],
  "time_range": "时间段如 周末/今天/下午，可为null",
  "budget": "预算如 500，可为null",
  "personas": ["匹配的persona_id数组，从 photographer/foodie/value/literary/local/parent 中选2-4个"],
  "constraints": {"不排队": true等用户显式约束},
  "mood": "用户期望的氛围，如 烟火气/文艺/亲子"
}

规则：
- city 必填，从用户输入中推断，默认"上海"
- keywords 是用于搜索大众点评的关键词，要具体（如"火锅""武康路咖啡"而非"好吃的"）
- 如果用户提到具体店名/地标，直接作为 keyword
- personas 根据用户偏好推断"""

    try:
        return llm_service._call_json(system, f"用户输入：{query}")
    except Exception as e:
        log(f"[planner] LLM intent failed, using local parse: {e}")
        return _local_parse_intent(query)


def _local_parse_intent(query: str) -> dict:
    import re
    q = query.strip()

    city = "上海"
    for c in ["北京", "上海", "广州", "深圳", "成都", "重庆", "杭州", "南京",
              "武汉", "西安", "长沙", "厦门", "苏州", "青岛", "大连", "昆明",
              "三亚", "丽江", "哈尔滨", "天津", "拉萨", "福州", "济南", "合肥",
              "无锡", "宁波", "郑州", "佛山", "东莞", "珠海", "贵阳", "南宁", "海口"]:
        if c in q:
            city = c
            break

    keywords = []
    food_kw = re.findall(r"(火锅|烤肉|川菜|粤菜|本帮菜|日料|海鲜|小龙虾|烧烤|面馆|咖啡|奶茶|甜品|早茶|茶餐厅|串串|冒菜|酸菜鱼|烤鸭|饺子|小吃|夜宵|brunch)", q)
    place_kw = re.findall(r"(太古里|春熙路|宽窄巷子|锦里|武侯祠|武康路|外滩|南京路|西湖|鼓浪屿|故宫|长城|天安门|三里屯|后海|鼓楼|颐和园|圆明园|陆家嘴|豫园|田子坊|新天地|人民广场|滨江|世纪公园|迪士尼|东方明珠|城隍庙|思南路|安福路|巨鹿路|五原路|永康路|衡山路|淮海路|天府广场|九眼桥|玉林路|解放碑|洪崖洞|磁器口|朝天门|观音桥)", q)
    act_kw = re.findall(r"(拍照|街拍|出片|逛街|购物|看展|美术馆|博物馆|书店|酒吧|夜景|骑行|徒步|野餐|遛娃|亲子|约会|探店)", q)

    keywords = list(dict.fromkeys(food_kw + place_kw + act_kw))
    if not keywords:
        words = re.findall(r'[一-龥]{2,}', q)
        keywords = [w for w in words if w not in [city, "周末", "今天", "明天", "想去", "想要", "喜欢", "不想", "不要", "预算", "上下", "左右"]][:5]
    if not keywords:
        keywords = ["美食", "景点", "咖啡"]

    personas = []
    if any(w in q for w in ["拍照", "出片", "街拍", "摄影"]):
        personas.append("photographer")
    if any(w in q for w in ["吃", "火锅", "美食", "餐", "面", "菜", "海鲜", "烤", "早茶"]):
        personas.append("foodie")
    if any(w in q for w in ["便宜", "省钱", "性价比", "预算"]):
        personas.append("value")
    if any(w in q for w in ["文艺", "书店", "咖啡", "美术馆", "看展"]):
        personas.append("literary")
    if any(w in q for w in ["本地", "地道", "老字号", "烟火气"]):
        personas.append("local")
    if any(w in q for w in ["带娃", "亲子", "小孩", "儿童"]):
        personas.append("parent")
    if not personas:
        personas = ["foodie", "photographer"]

    budget = None
    bm = re.search(r'(\d{2,5})\s*(?:元|块|预算|上下|左右)', q)
    if bm:
        budget = int(bm.group(1))

    return {
        "city": city,
        "keywords": keywords[:6],
        "time_range": None,
        "budget": budget,
        "personas": personas[:4],
        "constraints": {},
        "mood": "",
    }


def _generate_plans(query: str, city: str, pois: list, personas: list, constraints: dict) -> list:
    poi_text = "\n".join(
        f"- {p['name']}（{', '.join(p.get('tags', []))}，{p['star']}星，{p['review_count']}评，人均¥{p['avg_price']}）"
        for p in pois
    )

    system = """你是「城脉 LU」的路线规划主持人。根据用户需求和候选 POI，生成 3 条差异化路线方案。

## Agent 团队
- 📷 photographer：出片优先
- 🥢 foodie：味道为先
- 💰 value：性价比至上
- 📖 literary：文艺慢节奏
- 🏮 local：本地人视角
- 👶 parent：亲子友好

## 输出 JSON
{
  "plans": [
    {
      "id": "plan_1",
      "volume": "壹",
      "title": "《方案标题》",
      "subtitle": "英文副标题",
      "dominant": ["主导persona"],
      "secondary": ["辅助persona"],
      "stance": "一句话核心立场",
      "time": "总时长如 6小时",
      "budget": "人均预算如 ¥300",
      "debate": [
        {"who": "角色名", "text": "辩论发言"}
      ],
      "debateFinal": "主持人总结",
      "narrativeArc": "一句话叙事弧",
      "chaptersData": [
        {
          "num": "壹",
          "time": "10:00",
          "mood": "氛围词",
          "title": "店名 · 活动描述",
          "place": "地点英文名",
          "highlight": "一句话亮点，从评论中提炼",
          "pitfall": "避坑提示",
          "type": "eat/photo/rest",
          "coords": {"x": 50, "y": 30}
        }
      ]
    }
  ]
}

## 规则
- 3 条方案立场鲜明、彼此不重复
- 每条方案 4-6 个章节
- 只使用候选 POI 中的店铺，不要编造
- chaptersData 中的 highlight 和 pitfall 基于真实评论数据推断
- debate 中 2-3 条有趣的 Agent 辩论
- coords 用 0-100 的百分比坐标均匀分布
- num 用中文数字：壹贰叁肆伍陆"""

    user_text = (
        f"用户需求：{query}\n"
        f"城市：{city}\n"
        f"激活 Personas：{', '.join(personas)}\n"
        f"约束：{json.dumps(constraints, ensure_ascii=False)}\n\n"
        f"候选 POI（{len(pois)} 个）：\n{poi_text}"
    )

    try:
        result = llm_service._call_json(system, user_text, max_tokens=4000)
        plans = result.get("plans", [])
        for i, p in enumerate(plans):
            p.setdefault("id", f"plan_{i+1}")
            p.setdefault("volume", ["壹", "贰", "叁"][i] if i < 3 else str(i+1))
            for j, ch in enumerate(p.get("chaptersData", [])):
                ch.setdefault("coords", {"x": 20 + j * 12, "y": 20 + j * 12})
                ch.setdefault("type", "eat")
                ch.setdefault("pitfallExtras", [])
                _enrich_chapter_from_poi(ch, pois)
        return plans
    except Exception as e:
        log(f"[planner] plan generation failed: {e}")
        return []


def _local_template_plans(query: str, city: str, pois: list, personas: list) -> list:
    NUMS = ["壹", "贰", "叁", "肆", "伍", "陆"]
    TIMES = ["09:30", "11:00", "12:30", "14:30", "16:30", "18:30", "20:00"]
    TYPE_MOODS = {"eat": "觅食时刻", "rest": "小憩片刻", "photo": "出片时刻"}

    def _guess_type(p):
        tags = " ".join(p.get("tags", []))
        if any(k in tags for k in ["餐饮", "火锅", "菜", "面", "小吃", "烤", "海鲜", "饭"]):
            return "eat"
        if any(k in tags for k in ["咖啡", "茶", "酒吧", "甜品", "书店", "图书"]):
            return "rest"
        return "photo"

    def _make_plan(title, subtitle, stance, sel_pois, dom, sec, vol_idx):
        chapters = []
        for i, p in enumerate(sel_pois[:6]):
            t = _guess_type(p)
            chapters.append({
                "num": NUMS[i] if i < len(NUMS) else str(i + 1),
                "time": TIMES[i] if i < len(TIMES) else f"{10 + i * 2}:00",
                "mood": TYPE_MOODS.get(t, "探索"),
                "title": p["name"],
                "place": ", ".join(p.get("tags", [])[:2]),
                "highlight": f"{p['star']}星 · {p['review_count']}条评价{' · 人均¥' + str(p['avg_price']) if p.get('avg_price') else ''}",
                "pitfall": "",
                "pitfallExtras": [],
                "type": t,
                "coords": {"x": 20 + i * 12, "y": 20 + i * 10},
            })
            _enrich_chapter_from_poi(chapters[-1], pois)
        total_price = sum(p.get("avg_price", 0) for p in sel_pois[:6])
        return {
            "id": f"plan_{vol_idx + 1}",
            "volume": NUMS[vol_idx] if vol_idx < len(NUMS) else str(vol_idx + 1),
            "title": title,
            "subtitle": subtitle,
            "dominant": dom,
            "secondary": sec,
            "stance": stance,
            "time": f"{len(chapters) * 1.5:.0f} 小时",
            "budget": f"¥{total_price}" if total_price else "—",
            "debate": [
                {"who": "美食家", "text": f"这几家在{city}口碑都不错，值得一试。"},
                {"who": "摄影师", "text": "氛围不错，适合出片。"},
            ],
            "debateFinal": f"综合多位 Agent 意见，为你在{city}规划了这条路线。",
            "narrativeArc": f"在{city}的一天，从味蕾到视觉的完整体验。",
            "chaptersData": chapters,
        }

    sorted_by_rating = sorted(pois, key=lambda p: p.get("star", 0), reverse=True)
    sorted_by_reviews = sorted(pois, key=lambda p: p.get("review_count", 0), reverse=True)
    sorted_by_price = sorted(pois, key=lambda p: p.get("avg_price", 999))

    plans = []
    plans.append(_make_plan(
        f"《{city}人气之选》", "top rated picks",
        f"按口碑排序，选{city}评分最高的几家。",
        sorted_by_rating[:5], ["foodie"], ["local"], 0,
    ))
    plans.append(_make_plan(
        f"《{city}热门探店》", "most reviewed spots",
        f"选评论最多的热门店，跟着大众走不容易踩坑。",
        sorted_by_reviews[:5], ["local"], ["foodie"], 1,
    ))
    if len(pois) >= 4:
        plans.append(_make_plan(
            f"《{city}性价比路线》", "best value for money",
            "人均最友好的几家，花最少的钱体验最多。",
            sorted_by_price[:5], ["value"], ["foodie"], 2,
        ))

    return plans


def _enrich_chapter_from_poi(chapter: dict, pois: list):
    title_clean = chapter.get("title", "").split(" · ")[0].split("·")[0].strip()
    for p in pois:
        if title_clean in p["name"] or p["name"] in title_clean:
            chapter["_poi"] = p
            chapter.setdefault("queue", {
                "wait_minutes_est": max(0, (hash(p["name"]) % 40)),
                "queue_length": max(0, (hash(p["name"]) % 15)),
            })
            if p.get("avg_price", 0) > 50:
                chapter.setdefault("deals", [{
                    "deal_id": f"deal_{p['shop_id']}",
                    "title": f"{p['name']}精选套餐",
                    "list_price": int(p["avg_price"] * 2.2),
                    "sale_price": int(p["avg_price"] * 1.6),
                    "sold_count": p.get("review_count", 0) // 5,
                }])
            chapter["reservable"] = chapter.get("type") == "eat"
            break
