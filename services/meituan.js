// ============================================================
// services/meituan.js · 美团 数据源
// ------------------------------------------------------------
// 真实接入：
//   - 美团开放平台 OpenAPI（B2B 商家服务）
//   - 美团内部接口（推荐，数据维度更全）：
//       团购券、套餐价、到店预约时段、实时排队人数、外卖菜单、订单转化
//
// 当前实现：返回 mock 数据，提示"接入后能展示"
// 切换到真实 API 的步骤：
//   1. 公司内部权限 / 开发者注册
//   2. 替换每个 async 方法体的 fetch
//   3. 推荐先做的高价值字段：实时排队 + 团购券 + 到店预约
// ============================================================

const Meituan = {

  /**
   * 取一家 POI 的团购券 / 套餐
   * Real: GET /v1/deal/list?poi_id=&channel=meituan|dianping
   * @returns {Promise<MeituanDeal[]>}
   *
   * MeituanDeal shape:
   * {
   *   deal_id, poi_id,
   *   title:          "双人套餐 A",
   *   list_price:     368,
   *   sale_price:     288,
   *   sold_count:     1240,
   *   rating:         4.7,
   *   includes:       ["招牌红烧肉 1 份", "酒酿圆子 1 份", ...],
   *   valid_period:   ["2026-01-01", "2026-12-31"],
   *   used_period:    ["周一至周日 11:00-21:00"],
   *   refundable:     true,
   *   url:            "https://www.meituan.com/deal/...",
   * }
   */
  async getDeals(poiId, { channel = 'meituan' } = {}) {
    await _delay(40);
    // TODO[real-api]: replace with real fetch
    return _mockDeals(poiId);
  },

  /**
   * 实时排队 (排号 / 候位)
   * Real: GET /v1/queue/status?poi_id=
   * 内部接口刷新频率 ~30s
   * @returns {Promise<{
   *   poi_id, wait_minutes_est, queue_length, last_called_number,
   *   accepts_remote_queue,    // 是否支持手机远程拿号
   *   peak_periods:            // ["周末12:00-14:00"]
   *   updated_at,
   * }>}
   */
  async getQueueStatus(poiId) {
    await _delay(30);
    // TODO[real-api]: replace
    return _mockQueue(poiId);
  },

  /**
   * 到店预约可用时段
   * Real: GET /v1/reservation/slots?poi_id=&date=
   * @returns {Promise<Array<{
   *   slot_time:    "2026-05-26T18:00:00+08:00",
   *   capacity:     12,
   *   available:    3,
   *   min_party:    1,
   *   max_party:    8,
   *   deposit_req:  0,
   * }>>}
   */
  async getReservationSlots(poiId, date) {
    await _delay(40);
    // TODO[real-api]: replace
    return _mockSlots(poiId, date);
  },

  /**
   * 外卖菜单（外卖履约场景，可用于"懒得出门"备选路线）
   * Real: GET /v1/waimai/menu?poi_id=
   */
  async getDeliveryMenu(poiId) {
    await _delay(50);
    return _mockMenu(poiId);
  },
};


// ============================================================
// === mock helpers ============================================
// ============================================================
function _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function _mockDeals(poiId) {
  // 优先从 real_pois.json 查找团购
  if (window.REAL_POIS?.pois) {
    for (const p of window.REAL_POIS.pois) {
      if (p.deals?.length && poiId.includes(p.name?.charAt(0))) {
        return p.deals.map(d => ({
          deal_id: d.deal_id, poi_id: poiId, title: d.title,
          list_price: d.list_price, sale_price: d.sale_price,
          sold_count: d.sold_count || 500, rating: 4.7,
          includes: [], valid_period: ['2026-01-01', '2026-12-31'],
          used_period: ['周一至周日 11:00-21:00'], refundable: true,
          url: 'https://www.meituan.com/deal/' + d.deal_id,
        }));
      }
    }
  }
  return [
    {
      deal_id:     `deal_${poiId}_1`,
      poi_id:      poiId,
      title:       '双人本帮经典套餐',
      list_price:  368,
      sale_price:  288,
      sold_count:  1240,
      rating:      4.7,
      includes:    ['招牌菜 1 份', '凉菜 1 份', '主食 2 份', '饮品 2 杯'],
      valid_period:['2026-05-01', '2026-12-31'],
      used_period: ['周一至周日 11:00-21:00'],
      refundable:  true,
      url:         'https://www.meituan.com/deal/MOCK',
    },
  ];
}

function _mockQueue(poiId) {
  // 给一个伪随机但稳定的等位数（基于 poiId 哈希）
  const h = _hash(poiId);
  return {
    poi_id:               poiId,
    wait_minutes_est:     h % 60,
    queue_length:         h % 20,
    last_called_number:   100 + (h % 200),
    accepts_remote_queue: h % 3 === 0,
    peak_periods:         ['周末 12:00-14:00', '周末 18:00-20:00'],
    updated_at:           new Date().toISOString(),
  };
}

function _mockSlots(poiId, dateStr) {
  // 给晚饭时段 17:30 / 18:00 / 18:30 / 19:00
  const base = dateStr || new Date().toISOString().slice(0, 10);
  return ['17:30', '18:00', '18:30', '19:00', '19:30'].map((t, i) => ({
    slot_time:   `${base}T${t}:00+08:00`,
    capacity:    12,
    available:   Math.max(0, 8 - i * 2),
    min_party:   1,
    max_party:   8,
    deposit_req: 0,
  }));
}

function _mockMenu(poiId) {
  return [
    { item_id: 'm1', name: '示例菜品 A', price: 38, monthly_sales: 320 },
    { item_id: 'm2', name: '示例菜品 B', price: 28, monthly_sales: 210 },
  ];
}

function _hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
