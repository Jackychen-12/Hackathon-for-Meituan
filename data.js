// ====================================================
// 城脉 LU · Demo Mock Data
// 三个 demo case · 每个 case 三条 Pareto 方案
// ====================================================

const PERSONA_MAP = {
  photographer: '摄影师',
  foodie:       '美食家',
  value:        '性价比党',
  parent:       '带 娃 党',
  literary:     '文 青',
  local:        '本地老饕',
};

const CASES = [

  // ============================================================
  // CASE 1 · 周末 上海漫游
  // ============================================================
  {
    id: 'shanghai_weekend',
    cat: 'CASE 01 · WEEKEND',
    title: '周末 · 上海漫游',
    poem: '光与街拍的城里日子 ── 拍一些好看的，吃几口本帮味，<br/>不被人潮裹挟。',
    metaCity: '上海 · 衡复',
    metaSeason: '春末 · 周六',
    query: '周末在上海，喜欢拍照不想排队，预算 500 上下，想感受一点烟火气',
    activePersonas: ['photographer', 'literary', 'value', 'foodie'],
    mapKey: 'wukang',

    plans: [
      {
        id: 'photo',
        volume: '壹',
        title: '《武康路出片之旅》',
        subtitle: 'a day of light, lens, and lanes',
        dominant: ['photographer', 'literary'],
        secondary: ['value'],
        stance: '以「光与机位」为骨，把街拍金时段排在头尾。每一处都有 UGC 反复提到的最佳角度。',
        time: '8 小时',
        budget: '¥420',
        chapters: 5,
        debate: [
          { who: '摄影师', text: '夕阳金时段必须留给安福路，无可商量。' },
          { who: '性价比党', text: '外滩源那杯 68 的咖啡能不能换？' },
          { who: '文青', text: '换。武康庭也有院落感，38。' },
        ],
        debateFinal: '通过 ── 价值: 出片为王, 性价为辅。',
        narrativeArc: '从晨光的武康路出发，午后落入院落咖啡的慢时段，黄昏止于安福路的金时，夜里收笔在巨鹿路的微醺。',
        chaptersData: [
          {
            num: '壹',
            time: '09:30',
            mood: '活力探索章',
            energy: 5,
            title: '武康路 · 晨光街拍',
            place: 'Wukang Road · morning',
            highlight: '200 余条评论提到 9-10 点光线最柔，武康大楼侧面无人潮',
            pitfall: '已避 11:00 旅游团高峰',
            coords: { x: 28, y: 22 },
            type: 'photo',
          },
          {
            num: '贰',
            time: '11:00',
            mood: '治愈过渡章',
            energy: 3,
            title: '武康庭 · 院落咖啡',
            place: 'Ferguson Lane',
            highlight: '60+ UGC 提到「藤蔓院落最适合慢拍」 · 一杯手冲约 ¥38',
            pitfall: '已避 14:30 后客满 ',
            pitfallExtras: [
              { type: 'context', text: '下雨天露天位无遮挡' },
            ],
            coords: { x: 32, y: 32 },
            type: 'rest',
          },
          {
            num: '叁',
            time: '12:30',
            mood: '沉浸章',
            energy: 3,
            title: '兰心餐厅 · 本帮浓油',
            place: 'Lan Xin · Shanghainese',
            highlight: '本帮浓油赤酱代表 · 评论提到「红烧肉切小块更入味」',
            pitfall: '已避 13:30 排队 90min 高峰',
            pitfallExtras: [
              { type: 'menu', text: '避雷「八宝鸭」 · 30+ 评论说太甜' },
              { type: 'ops',  text: '20:30 后停止加菜' },
            ],
            coords: { x: 38, y: 42 },
            type: 'eat',
          },
          {
            num: '肆',
            time: '15:30',
            mood: '缓行章',
            energy: 4,
            title: '五原路 · 藏在梧桐里',
            place: 'Wuyuan Road',
            highlight: 'UGC 关键词「梧桐光斑」「小众店面」 · 周末 16 点光线最佳',
            pitfall: '已避周末 17 点后游客密集时段',
            coords: { x: 48, y: 50 },
            type: 'photo',
          },
          {
            num: '伍',
            time: '17:30',
            mood: '黄昏浪漫章',
            energy: 4,
            title: '安福路 · 夕阳金时',
            place: 'Anfu Road · golden hour',
            highlight: '300+ 评论列其为「上海夕阳街拍 No.1」 · 17:45-18:30',
            pitfall: '已避 19:00 后多家网红店排队',
            coords: { x: 56, y: 60 },
            type: 'photo',
          },
          {
            num: '陆',
            time: '19:30',
            mood: '烟火气尾声',
            energy: 5,
            title: '巨鹿路 · 微醺收笔',
            place: 'Julu Road · night',
            highlight: '本地常客评论「露天位最舒服」 · ¥80 一杯精酿',
            pitfall: '已避 21 点后噪音投诉时段（部分店 21:30 收边）',
            pitfallExtras: [
              { type: 'menu', text: '避雷「招牌特调」 · 评论说偏甜' },
              { type: 'context', text: '冬季室外冷，建议选室内位' },
            ],
            coords: { x: 66, y: 70 },
            type: 'rest',
          },
        ],
      },

      {
        id: 'foodie',
        volume: '贰',
        title: '《本帮菜深度局》',
        subtitle: 'a sit-down with old Shanghai flavors',
        dominant: ['foodie', 'local'],
        secondary: ['literary'],
        stance: '以「滋味」为先 ── 宁可超预算一点，也要吃透一条街的几家压舱店。',
        time: '7 小时',
        budget: '¥580',
        chapters: 5,
        debate: [
          { who: '美食家', text: '老吉士的油爆河虾必须排进去，技艺活化石。' },
          { who: '本地老饕', text: '红宝石小方下午茶，外地人都不知道。' },
          { who: '性价比党', text: '这单 580 超了，要不要砍一家？' },
          { who: '美食家', text: '不砍。一顿少喝两杯酒就回来了。' },
        ],
        debateFinal: '通过 ── 价值: 滋味为先, 节奏为骨。',
        narrativeArc: '醒胃从黄鱼面起步，本帮主菜在老馆铺开，茶歇用红宝石小方收纳，夜里回到葱油拌面的烟火气。',
        chaptersData: [
          {
            num: '壹', time: '10:00', mood: '开胃', energy: 3,
            title: '阿娘面馆 · 黄鱼面醒胃',
            place: 'A-Niang noodle',
            highlight: '老饕评论「面汤要喝完，浇头单独问老板加」',
            pitfall: '已避 12:00 后排队 40min',
            coords: { x: 22, y: 28 }, type: 'eat',
          },
          {
            num: '贰', time: '12:30', mood: '本帮正餐', energy: 3,
            title: '老克勒 · 红烧肉是底色',
            place: 'Lao Kele',
            highlight: '50+ 评论强调「招牌四喜烤麸要趁热」 · 浓油赤酱标杆',
            pitfall: '已避周末 13:00 满座（提前订）',
            coords: { x: 36, y: 38 }, type: 'eat',
          },
          {
            num: '叁', time: '15:00', mood: '茶歇章', energy: 2,
            title: '红宝石 · 老牌奶油小方',
            place: 'Red Rose · since 1986',
            highlight: '本地阿姨高频词「上海老味道」 · ¥18 一块小方',
            pitfall: '已避周末下午队伍（错峰到 15:00）',
            coords: { x: 44, y: 46 }, type: 'rest',
          },
          {
            num: '肆', time: '17:30', mood: '沉浸章', energy: 4,
            title: '老吉士 · 油爆河虾活化石',
            place: 'Lao Ji Shi',
            highlight: 'UGC 反复出现「火候是真功夫」「需提前一周订」',
            pitfall: '已避招牌「八宝鸭」 — 30+ 评论说太甜',
            pitfallExtras: [
              { type: 'time', text: '需要提前 1 周订位' },
              { type: 'ops',  text: '不收信用卡，请准备现金' },
            ],
            coords: { x: 56, y: 56 }, type: 'eat',
          },
          {
            num: '伍', time: '20:00', mood: '收笔章', energy: 3,
            title: '兰桂坊 · 葱油拌面醒酒',
            place: 'Lan Gui Fang',
            highlight: '本帮宵夜代表 · 评论关键词「葱花香气一掀盖就出来」',
            pitfall: '已避 22 点后停止外带',
            coords: { x: 64, y: 66 }, type: 'eat',
          },
        ],
      },

      {
        id: 'value',
        volume: '叁',
        title: '《二百块吃透五原路》',
        subtitle: 'two hundred kuai, one road, one day',
        dominant: ['value', 'literary'],
        secondary: ['foodie'],
        stance: '把每一块钱花在巧处 ── 路口的市井、藏在巷子的咖啡、站着喝的酒。',
        time: '9 小时',
        budget: '¥185',
        chapters: 6,
        debate: [
          { who: '性价比党', text: '永康路那家美式 35 无限续杯，必须进。' },
          { who: '文青', text: '同意。再加一家旧书店。' },
          { who: '美食家', text: '... 这单是不是太克制了？' },
          { who: '性价比党', text: '是。题目就是克制。' },
        ],
        debateFinal: '通过 ── 价值: 性价为重, 韵味为辅。',
        narrativeArc: '二百块走透五原路 ── 黄鱼面早食，菜场水果姐间歇，永康路一杯续到底，夜里站着喝杯精酿。',
        chaptersData: [
          {
            num: '壹', time: '10:00', mood: '早食章', energy: 3,
            title: '阿娘面 · 28 元封顶',
            place: 'A-Niang noodle',
            highlight: '老式黄鱼面 ¥28 含汤 · 评论「比新派店朴实」',
            pitfall: '已避周末 11:30 后排队',
            coords: { x: 24, y: 30 }, type: 'eat',
          },
          {
            num: '贰', time: '12:00', mood: '市井章', energy: 4,
            title: '五原路菜场 · 现切水果',
            place: 'Wuyuan market',
            highlight: '本地居民日常 · 现切菠萝 ¥10、现做生煎 ¥9 / 四只',
            pitfall: '已避 14 点后菜场闭门',
            coords: { x: 40, y: 38 }, type: 'eat',
          },
          {
            num: '叁', time: '14:00', mood: '慢饮', energy: 2,
            title: '永康路 · 老咖啡续杯',
            place: 'Yongkang Cafe',
            highlight: '老板说「美式 35，喝一下午都行」 · 100+ UGC 验证',
            pitfall: '已避周末 15:30 后吵闹',
            coords: { x: 48, y: 48 }, type: 'rest',
          },
          {
            num: '肆', time: '16:30', mood: '甜点', energy: 3,
            title: '无问 · 提拉米苏 ¥18',
            place: 'Wu-Wen Bakery',
            highlight: '价格友好的小店 · 评论「不像网红，更像家里的味道」',
            pitfall: '已避招牌「咸蛋黄塔」 — 反映偏腻',
            coords: { x: 54, y: 54 }, type: 'rest',
          },
          {
            num: '伍', time: '18:30', mood: '主餐章', energy: 4,
            title: '老虎灶 · 蟹粉小笼三两',
            place: 'Tiger Stove',
            highlight: '三两 ¥36 · 评论「皮薄汁浓，比鼎泰丰实在」',
            pitfall: '已避周末 19:00-20:00 高峰',
            coords: { x: 60, y: 62 }, type: 'eat',
          },
          {
            num: '陆', time: '20:30', mood: '尾声章', energy: 4,
            title: '安福路 · 站立精酿 ¥30',
            place: 'Anfu Standing Bar',
            highlight: '工业风站立位，一杯 ¥30 · 「本地年轻人收尾必选」',
            pitfall: '已避周五 22 点后客满',
            coords: { x: 68, y: 70 }, type: 'rest',
          },
        ],
      },
    ],
  },

  // ============================================================
  // CASE 2 · 本地 周末带娃
  // ============================================================
  {
    id: 'family_weekend',
    cat: 'CASE 02 · FAMILY',
    title: '周末 · 携子郊游',
    poem: '停在草地上的星期天 ── 让孩子奔跑，<br/>让大人慢下来。',
    metaCity: '上海 · 浦东',
    metaSeason: '初夏 · 周日',
    query: '周日带 5 岁孩子，避开人多的地方，午饭儿童友好，最好有点自然',
    activePersonas: ['parent', 'foodie', 'literary'],
    mapKey: 'pudong',

    plans: [
      {
        id: 'outdoor',
        volume: '壹',
        title: '《草地与小溪的一日》',
        subtitle: 'grass, stream, slow afternoon',
        dominant: ['parent', 'literary'],
        secondary: [],
        stance: '上午在世博后滩公园放电，午后回到亲子餐厅慢吃，傍晚回家不堵车。',
        time: '7 小时',
        budget: '¥460/家',
        chapters: 4,
        debate: [
          { who: '带娃党', text: '11 点必须坐下吃饭，不然娃饿哭。' },
          { who: '文青', text: '后滩有片野草地，10 点的光特别好。' },
          { who: '美食家', text: '亲子餐厅菜单我看过，可以接受。' },
        ],
        debateFinal: '通过 ── 价值: 孩子优先, 节奏松散。',
        narrativeArc: '上午在后滩公园放电，午后去亲子餐厅慢吃，下午图书馆童书区静静，傍晚一颗冰沙回家。',
        chaptersData: [
          {
            num: '壹', time: '09:30', mood: '奔跑章', energy: 5,
            title: '后滩公园 · 野草地',
            place: 'Houtan Park',
            highlight: '亲子家庭 200+ 评论「免费、人少、有溪流」',
            pitfall: '已避周末下午 14:00 后日晒强',
            coords: { x: 30, y: 30 }, type: 'photo',
          },
          {
            num: '贰', time: '12:00', mood: '坐下章', energy: 2,
            title: '亲子日料 · 小份儿童餐',
            place: 'Kid-friendly Sushi',
            highlight: 'UGC 频繁提及「有儿童椅、有玩具角」',
            pitfall: '已避招牌生鱼 — 不建议幼龄',
            coords: { x: 42, y: 42 }, type: 'eat',
          },
          {
            num: '叁', time: '14:30', mood: '小憩章', energy: 1,
            title: '上海图书馆东馆 · 童书区',
            place: 'SH Library East',
            highlight: '免费、空调、童书 5 万册 · 评论「孩子能安静一下午」',
            pitfall: '已避周末 16:00 后人多',
            coords: { x: 54, y: 54 }, type: 'rest',
          },
          {
            num: '肆', time: '16:30', mood: '回家章', energy: 3,
            title: '世纪大道地铁 · 顺道甜品',
            place: 'Century Ave',
            highlight: '回程路上 · 评论「酸奶冰沙是孩子奖励」',
            pitfall: '已避 17:00 高峰前一站换乘',
            coords: { x: 66, y: 66 }, type: 'rest',
          },
        ],
      },
      {
        id: 'indoor',
        volume: '贰',
        title: '《室内的星期天》',
        subtitle: 'when rain meets a curious child',
        dominant: ['parent'],
        secondary: ['literary'],
        stance: '雨天备选 ── 全程室内、有空调、有娃娃乐园，避开商场的网红坑。',
        time: '6 小时',
        budget: '¥520/家',
        chapters: 4,
        debate: [
          { who: '带娃党', text: '商场餐厅要选有儿童椅的。' },
          { who: '美食家', text: '我标了 3 家，全 UGC 验证过儿童友好。' },
        ],
        debateFinal: '通过 ── 价值: 全室内, 备雨天。',
        narrativeArc: '雨天的室内一日 ── 科技馆放电，亲子餐厅慢吃，绘本馆静静，回程顺手晚餐。',
        chaptersData: [
          { num: '壹', time: '10:00', mood: '探索章', energy: 4, title: '科技馆 · 儿童乐园', place: 'STM · Kids', highlight: '本地家庭高频词「能玩三小时不嫌」', pitfall: '已避周末 11 点排队 40min', coords: { x: 28, y: 30 }, type: 'photo' },
          { num: '贰', time: '12:30', mood: '坐下章', energy: 2, title: '商场亲子餐厅 · 半份起', place: 'Mall Restaurant', highlight: 'UGC「半份意面 ¥28，分量足够」', pitfall: '已避网红甜品 — 等位 60min', coords: { x: 42, y: 44 }, type: 'eat' },
          { num: '叁', time: '14:30', mood: '小憩章', energy: 1, title: '商场绘本馆 · 静静', place: 'Picture Book', highlight: '免费 · 评论「氛围好，娃自动安静」', pitfall: '已避商场 5 楼游乐场（吵）', coords: { x: 54, y: 56 }, type: 'rest' },
          { num: '肆', time: '16:00', mood: '回家章', energy: 3, title: '回程顺手晚餐', place: 'Take-away', highlight: '本地外带评分高 · 半份儿童套餐', pitfall: '已避商场出口拥堵', coords: { x: 66, y: 68 }, type: 'eat' },
        ],
      },
      {
        id: 'culture',
        volume: '叁',
        title: '《一个小小的展览》',
        subtitle: 'a museum, a snack, a nap',
        dominant: ['literary', 'parent'],
        secondary: ['foodie'],
        stance: '美术馆 + 户外野餐 + 早归。文化、自然、轻松 ── 三个都要一点。',
        time: '6 小时',
        budget: '¥390/家',
        chapters: 4,
        debate: [
          { who: '文青', text: '余德耀美术馆有亲子动线，娃也能看。' },
          { who: '带娃党', text: '动线我查了，可行。' },
        ],
        debateFinal: '通过 ── 价值: 文化, 但不勉强。',
        narrativeArc: '美术馆儿童导览开启，滨江草坪野餐与午睡，傍晚一支冰淇淋走回家。',
        chaptersData: [
          { num: '壹', time: '10:00', mood: '入馆章', energy: 3, title: '美术馆亲子动线', place: 'Yuz Museum', highlight: '评论「儿童导览册免费拿」', pitfall: '已避周末 14 点后排队', coords: { x: 30, y: 30 }, type: 'photo' },
          { num: '贰', time: '12:00', mood: '野餐章', energy: 3, title: '徐汇滨江野餐', place: 'Xuhui Riverside', highlight: '本地家庭「自带便当最香」', pitfall: '已避草坪边骑行道（危险）', coords: { x: 44, y: 44 }, type: 'eat' },
          { num: '叁', time: '14:00', mood: '午憩章', energy: 1, title: '滨江草坪小睡', place: 'Riverside lawn', highlight: '免费 · 评论「带毯子最舒服」', pitfall: '已避日晒最强 13-14 点 — 选树荫位', coords: { x: 56, y: 56 }, type: 'rest' },
          { num: '肆', time: '15:30', mood: '回家章', energy: 2, title: '滨江小食 + 回程', place: 'Riverside snack', highlight: '冰淇淋评分高 · ¥18', pitfall: '已避 17 点后地铁人流', coords: { x: 68, y: 68 }, type: 'rest' },
        ],
      },
    ],
  },

  // ============================================================
  // CASE 3 · 出差 陆家嘴四小时
  // ============================================================
  {
    id: 'business_lujiazui',
    cat: 'CASE 03 · BUSINESS',
    title: '出差 · 陆家嘴下午',
    poem: '四小时的本帮密语 ── 工作之外，<br/>留给自己的一段慢。',
    metaCity: '上海 · 陆家嘴',
    metaSeason: '梅雨 · 工作日',
    query: '明天下午 3-7 点在陆家嘴空闲，想吃本帮菜 + 看夜景',
    activePersonas: ['foodie', 'local', 'literary'],
    mapKey: 'lujiazui',

    plans: [
      {
        id: 'food_view',
        volume: '壹',
        title: '《本帮菜与夜景之间》',
        subtitle: 'flavor first, skyline next',
        dominant: ['foodie', 'local'],
        secondary: ['literary'],
        stance: '先吃，再喝，再上去 ── 把胃口、酒杯、视野依次摆好。',
        time: '4 小时',
        budget: '¥780',
        chapters: 4,
        debate: [
          { who: '美食家', text: '上海老饭店浦东店，老派但稳。' },
          { who: '本地老饕', text: '同意。再加个屋顶酒吧收尾。' },
          { who: '文青', text: '酒吧选 SOC 那家，氛围更克制。' },
        ],
        debateFinal: '通过 ── 价值: 滋味, 微醺, 远眺。',
        narrativeArc: '下午茶醒神，本帮老馆主菜，顶层酒吧远眺浦江，最后在滨江步道散步收尾。',
        chaptersData: [
          { num: '壹', time: '15:00', mood: '前奏章', energy: 2, title: '杜美兰咖啡 · 醒神', place: 'Du Mei Lan Cafe', highlight: '评论「下午无吵闹团客 · 浓缩稳定」', pitfall: '已避雷区甜品「焦糖布丁」', coords: { x: 28, y: 32 }, type: 'rest' },
          { num: '贰', time: '17:30', mood: '本帮正餐', energy: 3, title: '上海老饭店 · 本帮浦东店', place: 'Old Shanghai Restaurant', highlight: '本地老饕「酒酿圆子和八宝鸭值得」', pitfall: '已避周五 18:30 后排队 · 已订位', coords: { x: 44, y: 46 }, type: 'eat' },
          { num: '叁', time: '19:30', mood: '微醺章', energy: 3, title: 'SOC 顶层酒吧 · 远眺浦江', place: 'SOC Rooftop', highlight: '评论「视野最好 · 8 点后不需要预约」', pitfall: '已避日落点 — 灯光更稳', coords: { x: 56, y: 58 }, type: 'rest' },
          { num: '肆', time: '20:30', mood: '尾声章', energy: 2, title: '滨江步道 · 静静', place: 'Riverwalk', highlight: '本地常客「夜跑或散步都好」', pitfall: '已避周末晚游船泊岸时段', coords: { x: 68, y: 70 }, type: 'photo' },
        ],
      },
      {
        id: 'slow',
        volume: '贰',
        title: '《一个人的下午茶局》',
        subtitle: 'slow tea, slower thoughts',
        dominant: ['literary'],
        secondary: ['foodie'],
        stance: '不急 ── 给自己一段不用回邮件的时光。',
        time: '4 小时',
        budget: '¥520',
        chapters: 3,
        debate: [
          { who: '文青', text: '一个人就不需要排场，茶馆就好。' },
          { who: '美食家', text: '茶馆配点心也行，不过分。' },
        ],
        debateFinal: '通过 ── 价值: 慢, 一个人。',
        narrativeArc: '茶馆一壶云南慢起，一人日料套餐落座，书店里一杯红酒收笔。',
        chaptersData: [
          { num: '壹', time: '15:00', mood: '入席章', energy: 2, title: '茶馆 · 一壶云南', place: 'Tea House', highlight: '本地评论「下午无客噪 · 单人最舒服」', pitfall: '已避周末 17 点后家庭聚会时段', coords: { x: 30, y: 34 }, type: 'rest' },
          { num: '贰', time: '17:00', mood: '坐下章', energy: 3, title: '日料 · 一人套餐', place: 'Solo Sushi Set', highlight: '"一人套餐 ¥380 含三贯三品"', pitfall: '已避招牌海胆 — 当季不新鲜', coords: { x: 48, y: 48 }, type: 'eat' },
          { num: '叁', time: '19:00', mood: '收笔章', energy: 2, title: '书店 · 一杯红酒', place: 'Bookstore + Wine', highlight: '评论「书店里的酒吧 · 灯光暖」', pitfall: '已避周五 20 点后人多', coords: { x: 64, y: 64 }, type: 'rest' },
        ],
      },
      {
        id: 'energetic',
        volume: '叁',
        title: '《摩天与人潮》',
        subtitle: 'go high, go bright',
        dominant: ['local'],
        secondary: ['foodie'],
        stance: '出差的人也值得一次"全开" ── 上塔、吃、喝、看夜景，一气呵成。',
        time: '5 小时',
        budget: '¥980',
        chapters: 5,
        debate: [
          { who: '本地老饕', text: '上塔要趁日落前 30 分钟，最美。' },
          { who: '美食家', text: 'J Hotel 86 楼餐厅必须订。' },
          { who: '性价比党', text: '980 一个人下午 — 算了，听你们的。' },
        ],
        debateFinal: '通过 ── 价值: 一次, 全开。',
        narrativeArc: '上塔看日落变夜景，IFC 咖啡短歇，86 楼餐厅主菜，Bar Rouge 夜场，安静走回酒店。',
        chaptersData: [
          { num: '壹', time: '14:30', mood: '入塔章', energy: 4, title: '上海中心 · 118 层', place: 'SH Tower 118F', highlight: '本地常客「日落前 30 分钟上去」', pitfall: '已避周末 16 点后排队 60min', coords: { x: 26, y: 30 }, type: 'photo' },
          { num: '贰', time: '16:30', mood: '咖啡章', energy: 3, title: 'IFC 咖啡 · 短暂歇', place: 'IFC Cafe', highlight: '评论「拿铁稳定 · 视野好」', pitfall: '已避顶层观景咖啡 — 噪音大', coords: { x: 38, y: 40 }, type: 'rest' },
          { num: '叁', time: '18:00', mood: '正餐', energy: 3, title: 'J Hotel 86 楼餐厅', place: 'J Hotel 86F', highlight: '评论「窗边位日落最美 · 必须订」', pitfall: '已避招牌「松露牛肉」 — 评论说咸', coords: { x: 52, y: 52 }, type: 'eat' },
          { num: '肆', time: '20:00', mood: '夜景', energy: 4, title: 'BAR ROUGE · 露台', place: 'Bar Rouge', highlight: '本地夜场「外滩对岸最佳露台」', pitfall: '已避 22 点后入场费翻倍', coords: { x: 62, y: 60 }, type: 'rest' },
          { num: '伍', time: '21:30', mood: '尾声章', energy: 2, title: '步行回酒店', place: 'Walk back', highlight: 'UGC「夜里 22 点的陆家嘴最安静」', pitfall: '已避地铁末班车焦虑', coords: { x: 72, y: 72 }, type: 'rest' },
        ],
      },
    ],
  },
];

// ============================================================
// MAP DEFINITIONS · AMap 占位地图
// ------------------------------------------------------------
// 每个 case 一张底图，目前用 SVG mock。
// 接入高德 AMap JS SDK 后：
//   - 用 amap.center + amap.zoom 初始化地图
//   - 章节 chapter.coords 字段从 {x, y}（百分比）切换为 {lng, lat}
//   - roads/parks 字段可丢弃（AMap 自动渲染真实底图）
//   - 数字针 pin / 路线 polyline 仍然由我们叠加在 AMap 上
// ============================================================
const MAPS = {
  wukang: {
    amap:  { center: [121.4253, 31.2161], zoom: 16, name: '上海·衡复' },
    roads: [
      // arterials (主干道)
      { d: 'M 0,15 L 100,15',          name: '淮海中路', class: 'arterial', labelX: 80, labelY: 12 },
      { d: 'M 0,88 L 100,88',          name: '复兴中路', class: 'arterial', labelX: 80, labelY: 92 },
      { d: 'M 82,0 L 84,100',          name: '常熟路',   class: 'arterial', vertical: true, labelX: 88, labelY: 10 },
      // streets (次干道)
      { d: 'M 18,15 Q 22,40 26,60 T 30,88', name: '武康路', class: 'street', labelX: 13, labelY: 50 },
      { d: 'M 0,35 L 100,35',          name: '安福路',   class: 'street', labelX: 70, labelY: 32 },
      { d: 'M 0,50 L 100,50',          name: '五原路',   class: 'street', labelX: 70, labelY: 47 },
      { d: 'M 0,65 L 100,65',          name: '巨鹿路',   class: 'street', labelX: 70, labelY: 62 },
      { d: 'M 0,77 L 100,77',          name: '长乐路',   class: 'street', labelX: 70, labelY: 74 },
      // alleys (支路)
      { d: 'M 44,15 L 46,77',          name: '永福路',   class: 'alley',  vertical: true, labelX: 48, labelY: 22 },
      { d: 'M 62,35 L 64,88',          name: '高安路',   class: 'alley',  vertical: true, labelX: 66, labelY: 82 },
    ],
    parks: [
      { points: '70,67 90,67 90,82 70,82', name: '复兴公园' },
      { points: '4,38 14,38 14,46 4,46',   name: '兴国宾馆' },
    ],
  },

  pudong: {
    amap:  { center: [121.5180, 31.2196], zoom: 14, name: '上海·浦东' },
    roads: [
      { d: 'M 0,42 Q 50,40 100,44',    name: '世纪大道', class: 'arterial', labelX: 75, labelY: 39 },
      { d: 'M 0,18 L 100,20',          name: '世博大道', class: 'street',   labelX: 75, labelY: 16 },
      { d: 'M 0,68 L 100,70',          name: '滨江大道', class: 'street',   labelX: 75, labelY: 65 },
      { d: 'M 20,0 L 22,100',          name: '高科西路', class: 'street',   vertical: true, labelX: 26, labelY: 80 },
      { d: 'M 80,18 L 82,100',         name: '云台路',   class: 'alley',    vertical: true, labelX: 84, labelY: 75 },
      // 黄浦江 (water)
      { d: 'M 50,0 Q 46,30 52,60 T 56,100', name: '黄浦江', class: 'water', vertical: true, labelX: 58, labelY: 90 },
    ],
    parks: [
      { points: '28,28 48,28 48,40 28,40', name: '后滩公园' },
      { points: '60,52 76,52 76,66 60,66', name: '世纪公园北区' },
    ],
  },

  lujiazui: {
    amap:  { center: [121.5057, 31.2384], zoom: 15, name: '上海·陆家嘴' },
    roads: [
      { d: 'M 0,52 Q 50,50 100,55',    name: '陆家嘴环路', class: 'arterial', labelX: 75, labelY: 48 },
      { d: 'M 30,0 Q 34,50 30,100',    name: '世纪大道',   class: 'arterial', vertical: true, labelX: 36, labelY: 10 },
      { d: 'M 0,28 L 100,30',          name: '富城路',     class: 'street',   labelX: 75, labelY: 25 },
      { d: 'M 0,75 L 100,78',          name: '滨江大道',   class: 'street',   labelX: 75, labelY: 72 },
      { d: 'M 65,28 L 68,100',         name: '银城中路',   class: 'street',   vertical: true, labelX: 71, labelY: 90 },
      // 黄浦江
      { d: 'M 90,0 Q 86,40 92,80 T 95,100', name: '黄浦江', class: 'water', vertical: true, labelX: 97, labelY: 90 },
    ],
    parks: [
      { points: '40,42 60,42 60,55 40,55', name: '陆家嘴中心绿地' },
    ],
  },
};


// ============================================================
// UGC DATA · 每个方案对应的「大众点评 / 小红书」精选评论 + AI 总结
// key = `${case.id}.${plan.id}`
// ------------------------------------------------------------
// 接入真实数据时（未来步骤）：
//   - 评论由后端从大众点评 OpenAPI / 内部 UGC 库拉取并缓存
//   - aiSummary.digest / fitFor / notFor 由 Claude Haiku 4.5 批量生成
//   - highlight 字段标记 LLM 从评论里抽出的关键洞察短语
// ============================================================
const UGC_DATA = {

  'shanghai_weekend.photo': {
    aiSummary: {
      digest: '6 个 POI 在评论中反复被「光线 / 出片 / 错峰」三组关键词标注，已自动规避 13:30 和 19:00 两个高频投诉的排队时段。预算 ¥420 略低于同类路线均值（¥510），主要省在咖啡与酒水。',
      fitFor: [
        '认真想出片，愿意为光线让步时间的人',
        '周末错峰出行，不赶 9 点开门',
        '对本帮菜没强烈执念，但不抗拒',
      ],
      notFor: [
        '赶时间打卡每一站都想拍照的游客',
        '想吃一顿压舱大餐的美食党',
      ],
      basedOn: '1,247 条大众点评 · 386 条小红书 (近 90 天)',
    },
    ugc: [
      { author: '小麦不甜', avatar: '麦', rating: 5, date: '2025-04-12', poi: '武康路', text: '早上 9 点半到武康大楼侧面，光线最柔人最少，拍出来特别通透。穿浅色衣服效果更好。', highlight: '九点半光最柔' },
      { author: 'Charlie L', avatar: 'C', rating: 5, date: '2025-05-03', poi: '武康庭', text: '院子里藤蔓特别好看，二楼座位刚好能拍到全景。咖啡稳定但不惊艳，主要是氛围。', highlight: '院落氛围' },
      { author: '阿七', avatar: '七', rating: 4, date: '2025-03-28', poi: '兰心餐厅', text: '红烧肉真的浓油赤酱，但要提前订，13:30 我们到的时候已经排到门外了，建议早点或晚点去。', highlight: '需要错峰' },
      { author: 'sky_fish', avatar: 'S', rating: 4, date: '2025-04-21', poi: '五原路', text: '梧桐树下的小店真好看，光斑落在墙上像在画里。但下午 4 点后游客变多，建议早一点。', highlight: '梧桐光斑' },
      { author: 'lulu', avatar: 'L', rating: 5, date: '2025-05-08', poi: '安福路', text: '夕阳金时段必去！五点半到六点这半小时，整条街都是金色，随手拍都好看。', highlight: '17:30 金时' },
      { author: '晚风', avatar: '风', rating: 3, date: '2025-04-15', poi: '巨鹿路酒吧', text: '露天位舒服，但 21 点以后有点吵，对面居民楼会投诉，店家就开始催收摊了。', highlight: '21 点后催收' },
    ],
  },

  'shanghai_weekend.foodie': {
    aiSummary: {
      digest: '沿路 5 家全部为「老饕评分 4.6+」的本帮经典，其中 3 道招牌已根据 UGC 反馈替换（例如八宝鸭被点评反复说过甜）。整体偏老派，节奏宽松，吃为主、看为辅。',
      fitFor: [
        '真心想体验本帮菜的人',
        '不抠预算的吃货，能为味让步预算',
        '有老上海情结，喜欢老饭店氛围',
      ],
      notFor: [
        '节食 / 不爱浓油赤酱口味',
        '第一次到上海赶景点的游客',
      ],
      basedOn: '983 条大众点评 · 200 条小红书 (近 90 天)',
    },
    ugc: [
      { author: '王老饕', avatar: '王', rating: 5, date: '2025-04-08', poi: '阿娘面', text: '黄鱼面要喝完汤，老板说浇头单独问可以加，懂的都懂，是真本帮味道。', highlight: '浇头单独加' },
      { author: 'Lucia', avatar: 'L', rating: 5, date: '2025-05-12', poi: '老克勒', text: '四喜烤麸一定要趁热吃，凉了大打折扣。红烧肉是这家的底色，闭眼点。', highlight: '趁热吃' },
      { author: '晨曦', avatar: '晨', rating: 4, date: '2025-03-19', poi: '红宝石', text: '奶油小方还是那个味道，但下午茶时间真的太挤，下次试试 15 点前去。', highlight: '15 点前去' },
      { author: 'tom77', avatar: 'T', rating: 5, date: '2025-04-25', poi: '老吉士', text: '油爆河虾火候真是一绝，必须提前一周订位。八宝鸭就别点了，真的太甜。', highlight: '提前一周订' },
      { author: '静夜思', avatar: '静', rating: 4, date: '2025-05-19', poi: '兰桂坊', text: '葱油拌面醒酒神器，10 点后还有，但 22 点以后停止外带，要赶时间。', highlight: '醒酒神器' },
    ],
  },

  'shanghai_weekend.value': {
    aiSummary: {
      digest: '全程 6 个 POI 客单价中位数 ¥30，但人均评分中位数 4.5 ──「便宜不等于将就」由 UGC 验证。这条路线走得多，建议穿舒服的鞋。',
      fitFor: [
        '真正想体验本地烟火气的旅行者',
        '学生 / 刚工作的年轻人',
        '性价比强迫症（每一块钱都要花在刀刃）',
      ],
      notFor: [
        '追求精致体验或就餐档次',
        '节奏快、不喜欢慢逛的游客',
      ],
      basedOn: '614 条大众点评 · 421 条小红书 (近 90 天)',
    },
    ugc: [
      { author: '小江', avatar: '江', rating: 5, date: '2025-04-29', poi: '阿娘面', text: '比新派网红面馆实在多了，28 块带汤，老上海早餐就该这个味。坐窗边看路人。', highlight: '老上海早餐' },
      { author: '胖虎', avatar: '胖', rating: 4, date: '2025-05-02', poi: '五原路菜场', text: '现切菠萝 10 块满满一袋，水果姐刀工像表演。生煎 9 块四只皮脆汁多。', highlight: '水果姐' },
      { author: 'YY', avatar: 'Y', rating: 5, date: '2025-04-17', poi: '永康路咖啡', text: '老板说美式 35 能续杯一下午是真的，老社区氛围松弛，写东西很合适。', highlight: '续杯一下午' },
      { author: '喵酱', avatar: '喵', rating: 3, date: '2025-03-22', poi: '无问', text: '提拉米苏 18 块对得起价格，但咸蛋黄塔有点腻，下次不点了。', highlight: '咸蛋黄塔避开' },
      { author: '老饕新手', avatar: '新', rating: 5, date: '2025-05-15', poi: '老虎灶汤包', text: '蟹粉小笼三两 36 块，比鼎泰丰朴实但味道更扎实，皮薄汁浓。', highlight: '皮薄汁浓' },
      { author: '微醺', avatar: '醺', rating: 4, date: '2025-04-30', poi: '安福路站立酒吧', text: '站着喝 30 块的精酿，年轻人很多，氛围松弛但 10 点后实在挤。', highlight: '10 点前去' },
    ],
  },

  'family_weekend.outdoor': {
    aiSummary: {
      digest: '4 个 POI 全部「亲子友好」标签认证（来自 1800+ 条家庭用户评论的投票），动线 90% 在户外有遮阴，已规避周末 13-15 点强日照时段。请带充足饮用水。',
      fitFor: ['3-8 岁孩子的家庭', '想让大人也能慢下来的周末', '不赶时间的轻松出行'],
      notFor: ['3 岁以下推车不便（部分草地不平）', '极怕日晒的家庭'],
      basedOn: '624 条点评 (亲子标签) · 180 条小红书',
    },
    ugc: [
      { author: '元宝妈', avatar: '宝', rating: 5, date: '2025-04-20', poi: '后滩公园', text: '免费、人少、有小溪，娃可以脱了鞋玩水。带帐篷的家庭很多，周日下午像野餐节。', highlight: '免费 + 溪流' },
      { author: 'Ken家', avatar: 'K', rating: 4, date: '2025-05-10', poi: '亲子日料', text: '有儿童椅、有玩具角，菜单分量也合适。可惜招牌生鱼片不建议给幼龄孩子。', highlight: '儿童椅' },
      { author: '团团爸', avatar: '团', rating: 5, date: '2025-04-26', poi: '图书馆东馆', text: '童书 5 万册，娃能安静一下午，大人也能坐下来歇腿。空调凉爽。', highlight: '安静一下午' },
      { author: '小盆友', avatar: '友', rating: 4, date: '2025-05-04', poi: '世纪大道地铁', text: '酸奶冰沙是孩子奖励，回程路上一杯解决。周末傍晚地铁人不算太多。', highlight: '回程奖励' },
    ],
  },

  'family_weekend.indoor': {
    aiSummary: {
      digest: '雨天备选方案 ── 全程室内、空调、儿童友好。已规避商场 5 楼游乐场（评论反映过吵）和网红甜品（等位过长）。',
      fitFor: ['下雨天 / 高温日', '不想跑远的本地家庭', '想让孩子稍微动一动的下午'],
      notFor: ['想要户外开阔感的家庭', '预算非常紧（商场餐饮偏贵）'],
      basedOn: '512 条点评 (商场亲子) · 92 条小红书',
    },
    ugc: [
      { author: '橙子妈', avatar: '橙', rating: 5, date: '2025-05-08', poi: '科技馆儿童区', text: '能玩三小时不嫌烦，娃出来眼睛都是亮的。建议带水和零食，里面贵。', highlight: '玩三小时不烦' },
      { author: 'Mike父', avatar: 'M', rating: 4, date: '2025-04-15', poi: '商场亲子餐厅', text: '半份意面 28 块分量足够，有专门的儿童菜单，环境也安静。', highlight: '半份分量足' },
      { author: '糖糖', avatar: '糖', rating: 5, date: '2025-05-16', poi: '商场绘本馆', text: '免费看绘本，氛围让娃自动安静，二宝睡着了。书种类很全。', highlight: '免费安静' },
      { author: '小米', avatar: '米', rating: 3, date: '2025-04-30', poi: '商场餐厅外带', text: '半份儿童套餐 38 块，但出门口拥堵，建议错峰 16 点前拿。', highlight: '错峰取餐' },
    ],
  },

  'family_weekend.culture': {
    aiSummary: {
      digest: '美术馆 + 滨江野餐 + 早归 ── 三个都要一点。已确认美术馆周日上午有专门的儿童动线和免费导览册。',
      fitFor: ['想让孩子接触艺术的家庭', '喜欢户外野餐的人', '想早归不耗到天黑'],
      notFor: ['娃对静态展览没耐心', '不爱自己准备食物的家庭'],
      basedOn: '380 条点评 · 145 条小红书',
    },
    ugc: [
      { author: '艺爸', avatar: '艺', rating: 5, date: '2025-04-22', poi: '余德耀美术馆', text: '儿童导览册免费拿，娃可以一边看一边盖章，对艺术启蒙挺好。', highlight: '盖章式导览' },
      { author: '野餐控', avatar: '餐', rating: 5, date: '2025-05-05', poi: '徐汇滨江', text: '自带便当最香，草坪边上树荫位最舒服，午后小睡一下很治愈。', highlight: '树荫位' },
      { author: 'Eric爹', avatar: 'E', rating: 4, date: '2025-04-29', poi: '滨江草坪', text: '记得带毯子，草坪硬，孩子骑滑板车的多要小心。', highlight: '带毯子' },
      { author: '小糕点', avatar: '糕', rating: 4, date: '2025-05-13', poi: '滨江冰淇淋', text: '18 块的草莓口味性价比不错，娃吃完心满意足回家。', highlight: '草莓口味' },
    ],
  },

  'business_lujiazui.food_view': {
    aiSummary: {
      digest: '出差党 4 小时的高效局：先吃、后喝、再上塔，节奏紧凑但每站都有错峰策略。预算 780 是「招待客户级」配置。',
      fitFor: ['出差希望体验本帮 + 夜景', '请客户的轻商务局', '一个人不想委屈但又不超预算的晚餐'],
      notFor: ['想极致 fine dining 的纯美食党', '行李多不便上塔的人'],
      basedOn: '728 条点评 · 156 条小红书 (近 60 天)',
    },
    ugc: [
      { author: 'James', avatar: 'J', rating: 5, date: '2025-05-02', poi: '杜美兰咖啡', text: '下午没有吵闹的团客，浓缩稳定，是商务下午茶的好去处。', highlight: '商务下午茶' },
      { author: '老程', avatar: '程', rating: 5, date: '2025-04-18', poi: '上海老饭店', text: '酒酿圆子和八宝鸭值得，本帮浦东店比黄浦店清净。一定要订位。', highlight: '比黄浦店清净' },
      { author: 'Sky', avatar: 'S', rating: 4, date: '2025-05-09', poi: 'SOC 顶层酒吧', text: '视野最好的露台之一，8 点后不需要预约。日落后灯光更稳。', highlight: '8 点后免预约' },
      { author: '夜行人', avatar: '夜', rating: 5, date: '2025-04-26', poi: '滨江步道', text: '夜跑或散步都好，22 点后特别安静，比白天舒服。', highlight: '22 点后安静' },
    ],
  },

  'business_lujiazui.slow': {
    aiSummary: {
      digest: '一个人的下午茶局 ── 节奏放慢、单点单品。茶馆 + 一人套餐 + 书店酒，全程不打扰别人。',
      fitFor: ['出差独处时刻', '想脱离工作的下午', '不爱热闹的人'],
      notFor: ['想体验热闹氛围', '需要快速完成任务'],
      basedOn: '430 条点评 · 87 条小红书',
    },
    ugc: [
      { author: '茶客', avatar: '茶', rating: 5, date: '2025-04-30', poi: '茶馆', text: '下午时段没人吵，一壶云南可以喝两小时，老板不会赶。', highlight: '不会赶人' },
      { author: 'Cindy', avatar: 'C', rating: 5, date: '2025-05-11', poi: '一人日料', text: '一人套餐 380 含 3 贯 3 品，主厨配的，省得自己纠结。', highlight: '主厨搭配' },
      { author: '书虫', avatar: '书', rating: 4, date: '2025-04-22', poi: '书店 + 酒', text: '书店里的酒吧，灯光暖，红酒一杯 88 不算贵。周五人会多。', highlight: '灯光暖' },
    ],
  },

  'business_lujiazui.energetic': {
    aiSummary: {
      digest: '出差的人也值得一次「全开」── 上塔、吃、喝、看夜景一气呵成。预算 980 是「奖励自己」级，主要花在 86 楼餐厅。',
      fitFor: ['出差结束想犒劳自己', '陪重要客户的正式局', '第一次来上海工作'],
      notFor: ['节俭模式 / 预算敏感', '不爱拥挤场合'],
      basedOn: '850 条点评 · 220 条小红书',
    },
    ugc: [
      { author: 'tower_fan', avatar: 'T', rating: 5, date: '2025-05-06', poi: '上海中心 118 层', text: '日落前 30 分钟上去，看日落变夜景，整个城市从橙到紫。', highlight: '日落前 30 分钟' },
      { author: '商旅', avatar: '商', rating: 4, date: '2025-04-19', poi: 'IFC 咖啡', text: '拿铁稳定，视野好，比顶层观景咖啡安静。', highlight: '安静选择' },
      { author: 'M.', avatar: 'M', rating: 5, date: '2025-05-14', poi: 'J Hotel 86 楼', text: '窗边位日落最美，必须提前订。松露牛肉评论说咸，我选的牛排没踩坑。', highlight: '避开松露牛肉' },
      { author: '夜场达人', avatar: '达', rating: 4, date: '2025-04-28', poi: 'Bar Rouge', text: '外滩对岸最佳露台之一，但 22 点后入场费翻倍，要赶时间。', highlight: '22 点前入场' },
    ],
  },

};
