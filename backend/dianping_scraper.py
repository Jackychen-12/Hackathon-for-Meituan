# ============================================================
# dianping_scraper.py · 大众点评搜索页实时爬取
# ============================================================
import os
import time
import requests
from bs4 import BeautifulSoup
from .logger_util import log

CITY_MAP = {
    "上海": 1, "北京": 2, "广州": 4, "深圳": 7, "杭州": 5,
    "成都": 52, "重庆": 146, "武汉": 48, "南京": 17, "西安": 57,
    "长沙": 56, "厦门": 27, "苏州": 6, "天津": 3, "青岛": 18,
    "大连": 8, "昆明": 104, "三亚": 131, "丽江": 355, "拉萨": 394,
    "哈尔滨": 15, "沈阳": 9, "济南": 19, "福州": 26, "合肥": 85,
    "无锡": 10, "宁波": 11, "郑州": 35, "佛山": 183, "东莞": 184,
    "珠海": 186, "中山": 187, "贵阳": 107, "南宁": 58, "海口": 125,
}

HEADERS_TEMPLATE = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9",
    "Referer": "https://www.dianping.com/",
}


def get_city_id(city_name: str) -> int:
    for name, cid in CITY_MAP.items():
        if name in city_name or city_name in name:
            return cid
    return 1


def search_pois(keyword: str, city: str = "上海", limit: int = 5) -> list[dict]:
    cookie = os.getenv("DIANPING_COOKIE", "")
    if not cookie:
        log(f"[scraper] no cookie, skip search for '{keyword}'")
        return []

    city_id = get_city_id(city)
    url = f"https://www.dianping.com/search/keyword/{city_id}/0_{requests.utils.quote(keyword)}"

    headers = {**HEADERS_TEMPLATE, "Cookie": cookie}

    try:
        r = requests.get(url, headers=headers, timeout=10, allow_redirects=False)
        if r.status_code != 200:
            log(f"[scraper] search '{keyword}' in {city}({city_id}): HTTP {r.status_code}")
            return []

        html = BeautifulSoup(r.text, "lxml")
        shops = html.select(".shop-list li")
        results = []

        for shop in shops[:limit]:
            info = _parse_shop(shop)
            if info.get("name"):
                results.append(info)

        log(f"[scraper] search '{keyword}' in {city}: found {len(results)} POIs")
        return results
    except Exception as e:
        log(f"[scraper] search error: {e}")
        return []


def search_multi(keywords: list[str], city: str = "上海", per_keyword: int = 3) -> list[dict]:
    all_pois = []
    seen_ids = set()
    for kw in keywords[:8]:
        pois = search_pois(kw, city, limit=per_keyword)
        for p in pois:
            if p["shop_id"] not in seen_ids:
                seen_ids.add(p["shop_id"])
                all_pois.append(p)
        if len(keywords) > 1:
            time.sleep(2)
    return all_pois


def _parse_shop(shop_el) -> dict:
    info = {}
    try:
        info["shop_id"] = shop_el.select(".txt .tit a")[0].get("data-shopid", "")
    except:
        info["shop_id"] = ""
    try:
        info["name"] = shop_el.select(".txt .tit a")[0].text.strip()
    except:
        info["name"] = ""
    try:
        info["url"] = shop_el.select(".txt .tit a")[0].get("href", "")
    except:
        info["url"] = ""
    try:
        info["image"] = shop_el.select(".pic img")[0].get("src", "")
    except:
        info["image"] = ""

    try:
        info["star"] = float(shop_el.select(".comment .star_score")[0].text.strip())
    except:
        try:
            cls = shop_el.select(".comment .star_icon span")[0]["class"][1]
            info["star"] = float(cls.split("_")[1]) / 10
        except:
            info["star"] = 0

    try:
        rt = shop_el.select(".comment .review-num")[0].text.strip()
        info["review_count"] = int("".join(filter(str.isdigit, rt)))
    except:
        info["review_count"] = 0

    try:
        pt = shop_el.select(".comment .mean-price b")[0].text
        info["avg_price"] = int("".join(filter(str.isdigit, pt)))
    except:
        info["avg_price"] = 0

    try:
        info["tags"] = [
            t.text.strip().replace("\n", " ").strip()
            for t in shop_el.select(".tag-addr .tag")
        ]
    except:
        info["tags"] = []

    try:
        info["recommend"] = (
            shop_el.select(".recommend")[0].text.strip().replace("\n", " ").strip()
        )
    except:
        info["recommend"] = ""

    return info
