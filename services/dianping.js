// ============================================================
// services/dianping.js · 大众点评 数据源
// ------------------------------------------------------------
// 真实接入：
//   - 公开 OpenAPI: https://openapi.dianping.com (B2B 申请)
//   - 美团内部接口: 通过美团数据中台 / 商家服务 RPC (优先)
//   - 备选：大众点评公开页 + 反爬代理 (仅限离线/Demo)
//
// 当前实现：从 data.js 的 mock 数据（CASES + UGC_DATA）合成
//          点评 API 风格的返回结构，便于 Adapter 层无差别消费。
//
// 切换到真实 API 的步骤（每个方法）：
//   1. 把方法体的 `return _mock*(...)` 替换为 fetch / RPC 调用
//   2. 真实返回字段不必完全一致，但 Adapter 的字段映射保持稳定
//   3. mock 数据 + _* 私有函数可以删除
// ============================================================

const Dianping = {

  /**
   * 关键词 + 地理位置搜索 POI
   * Real API: GET /v1/business/find_businesses
   *   query: { keyword, city, category, region, lng, lat, radius, limit, offset }
   *   resp:  { businesses: POI[], total_count }
   *
   * @returns {Promise<DianpingPOI[]>}
   *
   * DianpingPOI shape:
   * {
   *   poi_id:        "B0FFG3OXJZ",       // 大众点评 shop_id
   *   name:          "兰心餐厅",
   *   branch_name:   "进贤路总店",
   *   address:       "上海市徐汇区进贤路 130 号",
   *   telephone:     "021-...",
   *   city:          "上海",
   *   regions:       ["徐汇区", "衡复"],
   *   categories:    ["上海菜", "本帮菜"],
   *   longitude:     121.4521,
   *   latitude:      31.2168,
   *   avg_price:     120,
   *   avg_rating:    4.6,            // 1-5
   *   taste_rating:  4.7,
   *   env_rating:    4.0,
   *   service_rating:4.3,
   *   review_count:  2341,
   *   business_hours:["11:00-14:00", "17:00-21:30"],
   *   photo_url:     "https://...",
   *   url:           "https://www.dianping.com/shop/...",
   *   has_takeaway:  false,
   *   tags:          ["招牌菜:红烧肉", "本帮菜代表"],
   * }
   */
  async searchPOI({ keyword, city = '上海', category, location, limit = 20 } = {}) {
    await _delay(30);
    // TODO[real-api]: replace with `await fetch(DIANPING_BASE + '/find_businesses?' + qs(...))`
    return _mockSearchPOI({ keyword, city, category, location, limit });
  },

  /**
   * 拉取 POI 详情（招牌菜、营业、图片等）
   * Real API: GET /v1/business/get_single_business?business_id=
   */
  async getPOIDetail(poiId) {
    await _delay(40);
    // TODO[real-api]: replace with real fetch
    return _mockPOIDetail(poiId);
  },

  /**
   * 拉取一家 POI 的评论
   * Real API: GET /v1/review/get_reviews
   *   query: { business_id, sort=newest|hottest|good|bad, limit, offset, since }
   *
   * @returns {Promise<DianpingReview[]>}
   *
   * DianpingReview shape:
   * {
   *   review_id:        "...",
   *   shop_id:          "...",
   *   user_id:          "...",
   *   user_nickname:    "小麦不甜",
   *   user_avatar_url:  "https://...",
   *   user_level:       "v5",
   *   rating:           5,           // 总评
   *   taste_rating:     5,
   *   env_rating:       4,
   *   service_rating:   5,
   *   text:             "完整评论...",
   *   text_excerpt:     "评论摘录 ~80 字",
   *   photos:           ["https://...", ...],
   *   total_helpful:    12,
   *   total_reply:      2,
   *   created_time:     "2025-04-12T09:30:00+08:00",
   *   visit_time:       "lunch|dinner|afternoon|night",
   *   per_capita_cost:  138,
   * }
   */
  async getReviews(poiId, { sort = 'newest', limit = 50, since } = {}) {
    await _delay(50);
    // TODO[real-api]: replace with real fetch + pagination
    return _mockReviews(poiId, { sort, limit, since });
  },

  /**
   * 仅返回该 POI 评论的"差评 / 中评"集合 (用于 LLM 抽取避坑约束)
   * Real API: getReviews(..., { sort: 'bad' }) 或 内部接口直接传 score<=3
   */
  async getNegativeReviews(poiId, { limit = 30 } = {}) {
    await _delay(50);
    // TODO[real-api]: real API supports score filter
    const all = await this.getReviews(poiId, { limit: 100 });
    return all.filter(r => r.rating <= 3).slice(0, limit);
  },

  // ========================================================
  // 用户 OAuth 登录 + 用户行为数据（用于记忆飞轮）
  // ========================================================

  /**
   * OAuth 登录（mock）
   * Real flow:
   *   1. 前端跳 `LU_CONFIG.dianpingOAuthURL` (后端起 OAuth)
   *   2. 后端拿 code → 换 access_token → 拉用户基础信息
   *   3. 前端收到 callback 后再调 getUserProfile/getUserFavorites 等
   * 这里 mock 把整个过程压缩成一个调用。
   *
   * @returns {Promise<{
   *   access_token: string,
   *   user_id: string,
   *   profile: {
   *     user_id, nickname, avatar_letter, avatar_url,
   *     level, city, join_date, review_count, favorite_count
   *   }
   * }>}
   */
  async loginOAuth({ scope = ['favorites', 'reviews', 'profile'] } = {}) {
    await _delay(120);
    if (!window.LU_CONFIG?.mockLogin) {
      // TODO[real-api]: window.location.href = LU_CONFIG.dianpingOAuthURL
      throw new Error('真实 OAuth 未配置 (set LU_CONFIG.mockLogin=true 走 mock)');
    }
    return _mockLogin();
  },

  /**
   * 拉用户的收藏 (Dianping "我的收藏")
   * Real API: GET /v1/user/get_favorites?access_token=
   */
  async getUserFavorites(userId, { limit = 200 } = {}) {
    await _delay(90);
    // TODO[real-api]: fetch real favorites
    return _mockUserFavorites(userId, limit);
  },

  /**
   * 拉用户发布过的评论
   * Real API: GET /v1/user/get_reviews?access_token=
   */
  async getUserReviews(userId, { limit = 100 } = {}) {
    await _delay(100);
    return _mockUserReviews(userId, limit);
  },
};


// ============================================================
// === mock helpers (REMOVE WHEN REAL API IS WIRED) ===========
// ============================================================
function _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function _findRealPOI(name) {
  if (!window.REAL_POIS?.pois) return null;
  const clean = (name || '').split(' · ')[0].trim();
  return window.REAL_POIS.pois.find(p =>
    p.name === clean || clean.includes(p.name) || p.name.includes(clean)
  ) || null;
}

function _mockSearchPOI({ keyword }) {
  const matches = [];
  CASES.forEach(c => c.plans.forEach(p => p.chaptersData.forEach((ch, idx) => {
    if (!keyword || ch.title.includes(keyword)) {
      matches.push(_chapterToPOI(c, p, ch, idx));
    }
  })));
  return matches.slice(0, 20);
}

function _mockPOIDetail(poiId) {
  for (const c of CASES) {
    for (const p of c.plans) {
      for (let idx = 0; idx < p.chaptersData.length; idx++) {
        const ch = p.chaptersData[idx];
        if (`${p.id}#${ch.num}` === poiId) {
          return _chapterToPOI(c, p, ch, idx);
        }
      }
    }
  }
  return null;
}

function _mockReviews(poiId, { limit }) {
  const detail = _mockPOIDetail(poiId);
  if (!detail) return [];

  // 优先用 real_pois.json 中的评论
  const real = _findRealPOI(detail.name);
  if (real?.reviews?.length) {
    return real.reviews.slice(0, limit).map((r, i) => _ugcToReview({
      author: r.author, avatar: r.avatar, rating: r.rating,
      text: r.text, date: r.date, highlight: r.highlight, poi: real.name,
    }, poiId, i, real.poi_id));
  }

  const all = [];
  Object.entries(UGC_DATA).forEach(([key, bundle]) => {
    bundle.ugc.forEach((u, ui) => {
      if (u.poi && (detail.name.includes(u.poi) || u.poi.includes(detail.name.split(' ')[0]))) {
        all.push(_ugcToReview(u, key, ui, detail.poi_id));
      }
    });
  });
  return all.slice(0, limit);
}

function _chapterToPOI(caseObj, plan, ch, idx) {
  const real = _findRealPOI(ch.title);
  if (real) {
    return {
      poi_id:         real.poi_id,
      name:           real.name,
      branch_name:    real.branch_name || '',
      address:        real.address,
      city:           real.city || '上海',
      regions:        real.regions || [],
      categories:     real.categories || [_typeToCategory(ch.type)],
      longitude:      real.longitude,
      latitude:       real.latitude,
      avg_price:      real.avg_price,
      avg_rating:     real.avg_rating,
      review_count:   real.review_count,
      business_hours: real.business_hours || ['10:00-22:00'],
      photo_url:      '',
      url:            'https://www.dianping.com/shop/' + real.poi_id,
      tags:           [ch.mood.replace(/章$/, '')],
      _meta: { caseId: caseObj.id, planId: plan.id, chapterIdx: idx },
    };
  }
  const center = (MAPS[caseObj.mapKey] || MAPS.wukang).amap?.center || [121.43, 31.21];
  return {
    poi_id:         `${plan.id}#${ch.num}`,
    name:           ch.title.split(' · ')[0],
    branch_name:    ch.title.split(' · ')[1] || '',
    address:        `${caseObj.metaCity} · ${ch.place}`,
    city:           caseObj.metaCity.split(' · ')[0] || '上海',
    regions:        [caseObj.metaCity.split(' · ')[1] || ''],
    categories:     [_typeToCategory(ch.type)],
    longitude:      center[0] + (ch.coords.x - 50) * 0.0012,
    latitude:       center[1] - (ch.coords.y - 50) * 0.0010,
    avg_price:      _guessPrice(ch),
    avg_rating:     4.5 + Math.random() * 0.5,
    review_count:   Math.floor(200 + Math.random() * 2000),
    business_hours: ['10:00-22:00'],
    photo_url:      '',
    url:            'https://www.dianping.com/shop/MOCK',
    tags:           [ch.mood.replace(/章$/, '')],
    _meta: { caseId: caseObj.id, planId: plan.id, chapterIdx: idx },
  };
}

function _ugcToReview(u, planKey, ui, poiId) {
  return {
    review_id:       `${planKey}#u${ui}`,
    shop_id:         poiId,
    user_id:         `mock_${u.author}`,
    user_nickname:   u.author,
    user_avatar_url: '',                            // 真实接入后回填
    user_level:      'v4',
    rating:          u.rating,
    taste_rating:    u.rating,
    env_rating:      u.rating,
    service_rating:  u.rating,
    text:            u.text,
    text_excerpt:    u.text,
    photos:          [],
    total_helpful:   Math.floor(Math.random() * 80),
    total_reply:     Math.floor(Math.random() * 8),
    created_time:    `${u.date}T12:00:00+08:00`,
    visit_time:      'lunch',
    per_capita_cost: 0,
    _meta: { avatar: u.avatar, highlight: u.highlight, poi: u.poi }, // demo 用
  };
}

function _typeToCategory(type) {
  return { eat: '餐饮', rest: '咖啡 · 酒吧', photo: '景点 · 拍照' }[type] || '其他';
}
function _guessPrice(ch) {
  if (ch.type === 'eat')  return 60 + Math.floor(Math.random() * 200);
  if (ch.type === 'rest') return 35 + Math.floor(Math.random() * 80);
  return 0;
}

// === 用户行为 mock 数据 ===
function _mockLogin() {
  return {
    access_token: 'mock_tok_' + Date.now(),
    user_id:      'u_mock_xs',
    profile: {
      user_id:        'u_mock_xs',
      nickname:       '小溪',
      avatar_letter:  '溪',
      avatar_url:     '',
      level:          'v5',
      city:           '上海',
      join_date:      '2018-09',
      review_count:   47,
      favorite_count: 132,
    },
  };
}

function _mockUserFavorites(userId, limit) {
  // 用 CASES 里的 POI 凑 132 条收藏，加上分类倾向（偏文艺 + 本帮 + 咖啡）
  const pool = [];
  CASES.forEach(c => c.plans.forEach(p => p.chaptersData.forEach((ch, idx) => {
    pool.push({
      favorite_id:   `fav_${p.id}_${ch.num}`,
      poi_id:        `${p.id}#${ch.num}`,
      poi_name:      ch.title.split(' · ')[0],
      poi_category:  _typeToCategory(ch.type),
      favorited_at:  _randomDate('2023-01-01', '2026-05-20'),
      tag_from_user: [_randomTag()],
    });
  })));
  // 增加权重让结果偏向文艺 + 本帮
  while (pool.length < limit) {
    pool.push({
      favorite_id:  `fav_x_${pool.length}`,
      poi_id:       `extra_${pool.length}`,
      poi_name:     _randomPick(['永康路咖啡', '武康庭', '红宝石', '兰心餐厅', '老吉士', '安福路', '武康路', '五原路菜场', '上海图书馆东馆', '余德耀美术馆']),
      poi_category: _randomPick(['餐饮', '咖啡 · 酒吧', '景点 · 拍照', '本帮菜', '美术馆 · 书店']),
      favorited_at: _randomDate('2023-01-01', '2026-05-20'),
      tag_from_user:[_randomTag()],
    });
  }
  return pool.slice(0, limit);
}

function _mockUserReviews(userId, limit) {
  // 拼 47 条，混合各家
  const reviews = [];
  const samples = [
    { poi: '武康庭',       rating: 5, text: '院子里的藤蔓我能拍一天。咖啡稳定，价格比新派友好。', visit: 'afternoon' },
    { poi: '老吉士',       rating: 5, text: '老派本帮的味道。八宝鸭确实太甜，下次不点。',         visit: 'dinner' },
    { poi: '红宝石',       rating: 4, text: '奶油小方是回忆。周末挤，建议工作日来。',             visit: 'afternoon' },
    { poi: '永康路咖啡',   rating: 5, text: '美式 35 续杯一下午，老板特别老克勒。',                 visit: 'afternoon' },
    { poi: '余德耀美术馆', rating: 5, text: '展览节奏好，下次还想再来一次。',                       visit: 'morning' },
    { poi: '安福路',       rating: 4, text: '黄昏的光太好。但 19 点后人潮拥挤。',                   visit: 'evening' },
    { poi: '武康路',       rating: 5, text: '早上九点是最好的时段，拍照基本不用 P。',               visit: 'morning' },
    { poi: '兰心餐厅',     rating: 4, text: '排队真的久，建议提前订位。红烧肉很正。',               visit: 'lunch' },
    { poi: '五原路菜场',   rating: 5, text: '比商场里那种菜场真实多了，水果姐切水果是艺术。',       visit: 'morning' },
    { poi: '上海图书馆东馆', rating: 5, text: '免费、安静、有空调。学生时代回不去的福利。',         visit: 'afternoon' },
  ];
  while (reviews.length < limit) {
    const s = samples[reviews.length % samples.length];
    reviews.push({
      review_id:       `rv_${userId}_${reviews.length}`,
      poi_id:          `mock_poi_${reviews.length % 10}`,
      poi_name:        s.poi,
      rating:          s.rating,
      text:            s.text,
      visit_time:      s.visit,
      per_capita_cost: 30 + Math.floor(Math.random() * 200),
      created_time:    _randomDate('2023-06-01', '2026-05-20') + 'T12:00:00+08:00',
    });
  }
  return reviews.slice(0, limit);
}

function _randomTag() {
  return _randomPick(['想去', '已去', '收藏拍照', '宝藏小店', '安静下来', '老上海', '人少地方', '便宜大碗']);
}
function _randomPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function _randomDate(start, end) {
  const s = +new Date(start), e = +new Date(end);
  const d = new Date(s + Math.random() * (e - s));
  return d.toISOString().slice(0, 10);
}
