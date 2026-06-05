import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BedDouble,
  Check,
  CheckCircle2,
  ChevronDown,
  Coffee,
  ExternalLink,
  Heart,
  Navigation,
  Plus,
  Search,
  ShoppingBag,
  TreePine,
  UserRound,
  UtensilsCrossed,
  X
} from 'lucide-react';

type CategoryId = 'sight' | 'food' | 'drink' | 'shopping' | 'stay';

type Spot = {
  id: string;
  title: string;
  category: CategoryId;
  topTag: string;
  planTag: string;
  distanceTag: string;
  desc: string;
  image: string;
  lng?: number;
  lat?: number;
  gallery?: string[];
  intro?: string;
  hours?: string;
  dianpingPosts?: Array<{ title: string; desc: string; url: string }>;
  reviews?: Array<{ author: string; avatar: string; rating: number; text: string; date: string; highlight: string }>;
  x: number;
  y: number;
  labelOffsetX?: number;
  labelOffsetY?: number;
};

const categories: Array<{
  id: CategoryId;
  label: string;
  emoji: string;
  icon: React.ComponentType<any>;
  color: string;
  markerColor: string;
}> = [
  { id: 'sight', label: '景点', emoji: '🌳', icon: TreePine, color: '#8BCF8B', markerColor: '#90D36E' },
  { id: 'food', label: '美食', emoji: '🍴', icon: UtensilsCrossed, color: '#FDBA74', markerColor: '#F5B04B' },
  { id: 'drink', label: '饮品', emoji: '🧋', icon: Coffee, color: '#D8B4FE', markerColor: '#C78AFF' },
  { id: 'shopping', label: '购物', emoji: '🛍️', icon: ShoppingBag, color: '#F9A8D4', markerColor: '#ED6FD1' },
  { id: 'stay', label: '住宿', emoji: '💤', icon: BedDouble, color: '#C4B5FD', markerColor: '#A78BFA' }
];

const makeDataUri = (svg: string) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

const scenicPhoto = (title: string, palette: { top: string; bottom: string; accent: string; accent2: string }) =>
  makeDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
      <defs>
        <linearGradient id="bg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="${palette.top}"/>
          <stop offset="100%" stop-color="${palette.bottom}"/>
        </linearGradient>
      </defs>
      <rect width="192" height="192" rx="30" fill="url(#bg)"/>
      <rect width="192" height="192" rx="30" fill="rgba(255,255,255,0.06)"/>
      <path d="M0 126 C36 112, 64 114, 92 126 S148 154, 192 134 L192 192 L0 192 Z" fill="${palette.accent}"/>
      <path d="M0 146 C26 130, 56 136, 84 148 S144 174, 192 160 L192 192 L0 192 Z" fill="${palette.accent2}" opacity="0.88"/>
      <circle cx="150" cy="42" r="18" fill="rgba(255,255,255,0.26)"/>
      <path d="M22 104 C42 72, 62 62, 86 62 C113 62, 136 74, 168 108" stroke="rgba(255,255,255,0.24)" stroke-width="10" fill="none" stroke-linecap="round"/>
      <rect x="18" y="18" width="82" height="24" rx="12" fill="rgba(255,255,255,0.22)"/>
      <text x="28" y="35" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="white">${title}</text>
    </svg>
  `);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const AMapView = React.memo(function AMapView({
  spots,
  activeCategory,
  onSpotClick,
}: {
  spots: Spot[];
  activeCategory: CategoryId;
  onSpotClick: (id: string) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (mapInstance.current || !mapRef.current || !(window as any).AMap) return;

    const tryInit = () => {
      const el = mapRef.current;
      if (!el || el.offsetWidth === 0) return false;
      const AMap = (window as any).AMap;
      const center = spots.length > 0 && spots[0].lng
        ? [spots[0].lng, spots[0].lat]
        : [121.4365, 31.2084];

      const map = new AMap.Map(el, {
        zoom: 15,
        center,
        mapStyle: 'amap://styles/light',
        resizeEnable: true,
        touchZoom: true,
        dragEnable: true,
        zoomEnable: true,
        showIndoorMap: false,
      });
      map.addControl(new AMap.Scale());
      mapInstance.current = map;

      AMap.plugin('AMap.Geolocation', () => {
        const geo = new AMap.Geolocation({ enableHighAccuracy: true, timeout: 5000, showCircle: true, showMarker: true, markerOptions: { offset: new AMap.Pixel(-8, -8), content: '<div style="width:16px;height:16px;border-radius:50%;background:#5b9eff;border:3px solid white;box-shadow:0 2px 8px rgba(91,158,255,0.4);"></div>' } });
        map.addControl(geo);
        geo.getCurrentPosition();
      });
      return true;
    };

    if (!tryInit()) {
      const observer = new MutationObserver(() => {
        if (tryInit()) observer.disconnect();
      });
      observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class', 'style'] });
      const fallback = setInterval(() => { if (tryInit()) clearInterval(fallback); }, 300);
      return () => { observer.disconnect(); clearInterval(fallback); };
    }

    return () => {
      if (mapInstance.current) { mapInstance.current.destroy(); mapInstance.current = null; }
    };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    const AMap = (window as any).AMap;
    if (!map || !AMap) return;

    markersRef.current.forEach(m => map.remove(m));
    markersRef.current = [];

    const catConfig: Record<string, { color: string; emoji: string }> = {
      sight: { color: '#5b9eff', emoji: '\u{1F333}' },
      food: { color: '#f59e0b', emoji: '\u{1F374}' },
      drink: { color: '#a78bfa', emoji: '☕' },
      shopping: { color: '#f472b6', emoji: '\u{1F6CD}' },
      stay: { color: '#818cf8', emoji: '\u{1F3E8}' },
    };

    spots.forEach(spot => {
      if (!spot.lng || !spot.lat) return;
      const cc = catConfig[spot.category] || catConfig.sight;
      const highlighted = spot.category === activeCategory;
      const marker = new AMap.Marker({
        position: [spot.lng, spot.lat],
        offset: new AMap.Pixel(-18, -18),
        content: `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
          <div style="width:36px;height:36px;border-radius:50%;background:${cc.color};border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 4px 12px ${cc.color}40;opacity:${highlighted ? 1 : 0.5};transform:scale(${highlighted ? 1 : 0.85});transition:all 0.2s;">${cc.emoji}</div>
          <div style="margin-top:2px;padding:2px 6px;border-radius:8px;background:white;box-shadow:0 2px 6px rgba(0,0,0,0.1);font-size:11px;font-weight:600;color:#1a1a2e;white-space:nowrap;max-width:80px;overflow:hidden;text-overflow:ellipsis;">${spot.title}</div>
        </div>`,
      });
      marker.on('click', () => onSpotClick(spot.id));
      map.add(marker);
      markersRef.current.push(marker);
    });

    if (markersRef.current.length > 1) {
      map.setFitView(markersRef.current, false, [60, 120, 60, 60]);
    }
  }, [spots, activeCategory]);

  return <div ref={mapRef} className="absolute inset-0" />;
});

const defaultSpots: Spot[] = [
  // POI 1: 武康路
  {
    id: 'dp_wukang_road',
    title: '武康路',
    category: 'sight',
    topTag: '5分',
    planTag: '6728条评价',
    distanceTag: '免费',
    desc: '武康大楼侧面 9 点左右光线最柔，人少到可以随便站位。推荐用长焦拍建筑弧线。',
    image: 'http://p0.meituan.net/tdctraveldark/f13f09278bb0752dd65b42fd9668ec68364043.jpg@340w_255h_1e_1c_1l|watermark=0',
    lng: 121.4365,
    lat: 31.2084,
    gallery: ['http://p0.meituan.net/tdctraveldark/f13f09278bb0752dd65b42fd9668ec68364043.jpg@340w_255h_1e_1c_1l|watermark=0'],
    intro: '武康大楼侧面 9 点左右光线最柔，人少到可以随便站位。推荐用长焦拍建筑弧线。 梧桐叶子最好看是四月底五月初，整条路金绿交织。建议从南往北走，逆光拍人像绝了。 11 点之后旅游团就来了，整条路都是举旗子的。要拍照一定趁早。 住在附近三十年了，最近被各种博主发掘，人确实多了。但清晨的武康路依然属于邻居们。 武康大楼拍过几百次了，最好的机位是对面花店门口，用 35mm 焦段刚好框住整栋楼的弧线。',
    hours: '全天开放',
    dianpingPosts: [
      { title: '9点光线最柔', desc: '武康大楼侧面 9 点左右光线最柔，人少到可以随便站位。推荐用长焦拍建筑弧线。', url: 'https://www.dianping.com/shop/F59WYsbOXVUQ1l9U' },
      { title: '梧桐逆光拍人像', desc: '梧桐叶子最好看是四月底五月初，整条路金绿交织。建议从南往北走，逆光拍人像绝了。', url: 'https://www.dianping.com/shop/F59WYsbOXVUQ1l9U' },
    ],
    reviews: [
      { author: '街拍小王', avatar: '王', rating: 5, text: '武康大楼侧面 9 点左右光线最柔，人少到可以随便站位。推荐用长焦拍建筑弧线。', date: '2026-04-15', highlight: '9点光线最柔' },
      { author: '沪上散步', avatar: '散', rating: 5, text: '梧桐叶子最好看是四月底五月初，整条路金绿交织。建议从南往北走，逆光拍人像绝了。', date: '2026-05-02', highlight: '梧桐逆光拍人像' },
      { author: '周末探路', avatar: '探', rating: 4, text: '11 点之后旅游团就来了，整条路都是举旗子的。要拍照一定趁早。', date: '2026-03-22', highlight: '11点后旅游团高峰' },
      { author: '本地阿姨', avatar: '阿', rating: 5, text: '住在附近三十年了，最近被各种博主发掘，人确实多了。但清晨的武康路依然属于邻居们。', date: '2026-04-01', highlight: '清晨属于邻居' },
      { author: '摄影老法师', avatar: '法', rating: 5, text: '武康大楼拍过几百次了，最好的机位是对面花店门口，用 35mm 焦段刚好框住整栋楼的弧线。', date: '2026-02-18', highlight: '花店门口35mm最佳机位' },
    ],
    x: 0, y: 0,
  },
  // POI 2: 武康庭
  {
    id: 'dp_wukangting',
    title: '武康庭',
    category: 'drink',
    topTag: '4分',
    planTag: '7566条评价',
    distanceTag: '人均¥147',
    desc: '藤蔓爬满整面墙的时候最好看，一杯手冲坐一下午。安静到能听见鸟叫。',
    image: 'https://p0.meituan.net/biztone/048af115194e074a444915dda89df9f4271701.jpg@340w_255h_1e_1c_1l|watermark=0',
    lng: 121.4358,
    lat: 31.2075,
    gallery: ['https://p0.meituan.net/biztone/048af115194e074a444915dda89df9f4271701.jpg@340w_255h_1e_1c_1l|watermark=0'],
    intro: '藤蔓爬满整面墙的时候最好看，一杯手冲坐一下午。安静到能听见鸟叫。 手冲 38-45 不等，品质稳定。但下午两点半以后几乎没座位了，建议早来。 全上海最像欧洲小院子的地方。拍照比网红店强一百倍，而且不用排队。 下雨天露天区完全没法坐，室内就四五个位子。建议看天气再来。 院子里的光影从 10 点开始最美，带本书坐到下午。是我在上海最喜欢的「第三空间」。',
    hours: '09:00-22:00',
    dianpingPosts: [
      { title: '藤蔓院落最适合慢拍', desc: '藤蔓爬满整面墙的时候最好看，一杯手冲坐一下午。安静到能听见鸟叫。', url: 'https://www.dianping.com/shop/H4XolSQ0auDdNY2L' },
      { title: '14:30后客满', desc: '手冲 38-45 不等，品质稳定。但下午两点半以后几乎没座位了，建议早来。', url: 'https://www.dianping.com/shop/H4XolSQ0auDdNY2L' },
    ],
    reviews: [
      { author: '院子控', avatar: '院', rating: 5, text: '藤蔓爬满整面墙的时候最好看，一杯手冲坐一下午。安静到能听见鸟叫。', date: '2026-04-20', highlight: '藤蔓院落最适合慢拍' },
      { author: '咖啡测评', avatar: '咖', rating: 4, text: '手冲 38-45 不等，品质稳定。但下午两点半以后几乎没座位了，建议早来。', date: '2026-03-15', highlight: '14:30后客满' },
      { author: '安静星人', avatar: '安', rating: 5, text: '全上海最像欧洲小院子的地方。拍照比网红店强一百倍，而且不用排队。', date: '2026-05-10', highlight: '像欧洲小院不用排队' },
      { author: '雨天来客', avatar: '雨', rating: 3, text: '下雨天露天区完全没法坐，室内就四五个位子。建议看天气再来。', date: '2026-04-05', highlight: '下雨天露天无遮挡' },
      { author: '文青一号', avatar: '文', rating: 5, text: '院子里的光影从 10 点开始最美，带本书坐到下午。是我在上海最喜欢的「第三空间」。', date: '2026-03-28', highlight: '光影10点起最美' },
    ],
    x: 0, y: 0,
  },
  // POI 3: 老吉士
  {
    id: 'dp_laojishi',
    title: '老吉士',
    category: 'food',
    topTag: '4分',
    planTag: '11143条评价',
    distanceTag: '人均¥180',
    desc: '油爆河虾是镇店之宝，虾壳酥脆到不用吐。但只有午市才有，晚上来就没了。',
    image: 'https://p0.meituan.net/biztone/b3ea40e3bc770698d3f18cc17bfea0d0377604.jpg@340w_255h_1e_1c_1l|watermark=0',
    lng: 121.4412,
    lat: 31.2095,
    gallery: ['https://p0.meituan.net/biztone/b3ea40e3bc770698d3f18cc17bfea0d0377604.jpg@340w_255h_1e_1c_1l|watermark=0'],
    intro: '油爆河虾是镇店之宝，虾壳酥脆到不用吐。但只有午市才有，晚上来就没了。 红烧肉入口即化，酱汁挂面一绝。人均 130-150，在这个地段算性价比很高了。 周末 11 点到的，还是等了 40 分钟。建议工作日来或者提前电话订位。 二十年了味道没变过。八宝辣酱偏甜是老吉士的风格，别说不正宗——这就是上海味道。 糖醋小排偏甜了一点，但酱汁比例很讲究。蟹粉豆腐真的鲜到掉眉毛。建议避开 21:00 后去，停止点单。',
    hours: '11:00-14:00, 17:00-21:30',
    dianpingPosts: [
      { title: '油爆河虾午市限定', desc: '油爆河虾是镇店之宝，虾壳酥脆到不用吐。但只有午市才有，晚上来就没了。', url: 'https://www.dianping.com/shop/k175tm2mcNdosVCq' },
      { title: '红烧肉入口即化', desc: '红烧肉入口即化，酱汁挂面一绝。人均 130-150，在这个地段算性价比很高了。', url: 'https://www.dianping.com/shop/k175tm2mcNdosVCq' },
    ],
    reviews: [
      { author: '本帮菜迷', avatar: '帮', rating: 5, text: '油爆河虾是镇店之宝，虾壳酥脆到不用吐。但只有午市才有，晚上来就没了。', date: '2026-04-28', highlight: '油爆河虾午市限定' },
      { author: '外地食客', avatar: '外', rating: 5, text: '红烧肉入口即化，酱汁挂面一绝。人均 130-150，在这个地段算性价比很高了。', date: '2026-05-05', highlight: '红烧肉入口即化' },
      { author: '排队选手', avatar: '排', rating: 4, text: '周末 11 点到的，还是等了 40 分钟。建议工作日来或者提前电话订位。', date: '2026-03-18', highlight: '周末排队40分钟' },
      { author: '老上海', avatar: '老', rating: 5, text: '二十年了味道没变过。八宝辣酱偏甜是老吉士的风格，别说不正宗——这就是上海味道。', date: '2026-02-25', highlight: '二十年味道不变' },
      { author: '尝鲜党', avatar: '尝', rating: 4, text: '糖醋小排偏甜了一点，但酱汁比例很讲究。蟹粉豆腐真的鲜到掉眉毛。建议避开 21:00 后去，停止点单。', date: '2026-04-12', highlight: '21:00停止点单' },
    ],
    x: 0, y: 0,
  },
  // POI 4: 安福路
  {
    id: 'dp_anfu_road',
    title: '安福路',
    category: 'sight',
    topTag: '5分',
    planTag: '5644条评价',
    distanceTag: '免费',
    desc: '17:00-18:30 的光是金色的，打在老洋房立面上特别温柔。这条路就是为黄昏存在的。',
    image: 'https://img.meituan.net/kylisean/f196bf4d7c5424819db649418a00a35f15270335.jpg@340w_255h_1e_1c_1l|watermark=0',
    lng: 121.4408,
    lat: 31.2125,
    gallery: ['https://img.meituan.net/kylisean/f196bf4d7c5424819db649418a00a35f15270335.jpg@340w_255h_1e_1c_1l|watermark=0'],
    intro: '17:00-18:30 的光是金色的，打在老洋房立面上特别温柔。这条路就是为黄昏存在的。 好看是真好看，但周五晚上人流恐怖。建议工作日下午来，安静得像私人花园。 安福路 288 号话剧中心门口是全路最好的拍照点，有台阶有光影有质感。 路边有家站立精酿 bar，一杯 IPA 才 30 块。端着酒杯看夕阳是安福路的正确打开方式。 19 点以后人潮涌入，整条路变成步行街了。想安静体验一定要赶在 18 点前。',
    hours: '全天开放',
    dianpingPosts: [
      { title: '17-18:30黄金时段', desc: '17:00-18:30 的光是金色的，打在老洋房立面上特别温柔。这条路就是为黄昏存在的。', url: 'https://www.dianping.com/shop/G6Q03iCRQqaUI5uZ' },
      { title: '周五晚人流拥挤', desc: '好看是真好看，但周五晚上人流恐怖。建议工作日下午来，安静得像私人花园。', url: 'https://www.dianping.com/shop/G6Q03iCRQqaUI5uZ' },
    ],
    reviews: [
      { author: '黄昏猎手', avatar: '猎', rating: 5, text: '17:00-18:30 的光是金色的，打在老洋房立面上特别温柔。这条路就是为黄昏存在的。', date: '2026-04-22', highlight: '17-18:30黄金时段' },
      { author: '周末漫步', avatar: '漫', rating: 4, text: '好看是真好看，但周五晚上人流恐怖。建议工作日下午来，安静得像私人花园。', date: '2026-05-08', highlight: '周五晚人流拥挤' },
      { author: '话剧迷', avatar: '话', rating: 5, text: '安福路 288 号话剧中心门口是全路最好的拍照点，有台阶有光影有质感。', date: '2026-03-30', highlight: '话剧中心门口最佳拍照点' },
      { author: '精酿爱好者', avatar: '精', rating: 5, text: '路边有家站立精酿 bar，一杯 IPA 才 30 块。端着酒杯看夕阳是安福路的正确打开方式。', date: '2026-04-18', highlight: '站立精酿30元看夕阳' },
      { author: '本地居民', avatar: '居', rating: 4, text: '19 点以后人潮涌入，整条路变成步行街了。想安静体验一定要赶在 18 点前。', date: '2026-05-15', highlight: '19点后人潮拥挤' },
    ],
    x: 0, y: 0,
  },
  // POI 5: 巨鹿路
  {
    id: 'dp_julu_road',
    title: '巨鹿路',
    category: 'drink',
    topTag: '4分',
    planTag: '989条评价',
    distanceTag: '人均¥134',
    desc: '几家小酒馆都不错，人均 80-100 就能喝到很好的鸡尾酒。适合周末收尾。',
    image: 'http://p0.meituan.net/dpmerchantpic/ebc2bccded1bf3a8b02adcf28f163674410216.jpg@340w_255h_1e_1c_1l|watermark=0',
    lng: 121.4485,
    lat: 31.2198,
    gallery: ['http://p0.meituan.net/dpmerchantpic/ebc2bccded1bf3a8b02adcf28f163674410216.jpg@340w_255h_1e_1c_1l|watermark=0'],
    intro: '几家小酒馆都不错，人均 80-100 就能喝到很好的鸡尾酒。适合周末收尾。 周末 22 点以后才有氛围。工作日去太冷清了。 巨鹿路 758 号那家 wine bar 很适合约会，灯光暗到恰好，音乐不吵。',
    hours: '17:00-02:00',
    dianpingPosts: [
      { title: '人均80小酒馆', desc: '几家小酒馆都不错，人均 80-100 就能喝到很好的鸡尾酒。适合周末收尾。', url: 'https://www.dianping.com/shop/H2Jno7LygctM5U46' },
      { title: '周末22点后有氛围', desc: '周末 22 点以后才有氛围。工作日去太冷清了。', url: 'https://www.dianping.com/shop/H2Jno7LygctM5U46' },
    ],
    reviews: [
      { author: '微醺选手', avatar: '醺', rating: 5, text: '几家小酒馆都不错，人均 80-100 就能喝到很好的鸡尾酒。适合周末收尾。', date: '2026-04-25', highlight: '人均80小酒馆' },
      { author: '夜猫子', avatar: '猫', rating: 4, text: '周末 22 点以后才有氛围。工作日去太冷清了。', date: '2026-05-12', highlight: '周末22点后有氛围' },
      { author: '约会达人', avatar: '约', rating: 5, text: '巨鹿路 758 号那家 wine bar 很适合约会，灯光暗到恰好，音乐不吵。', date: '2026-03-20', highlight: '758号wine bar适合约会' },
    ],
    x: 0, y: 0,
  },
  // POI 6: 红宝石
  {
    id: 'dp_hongbaoshi',
    title: '红宝石',
    category: 'food',
    topTag: '3.5分',
    planTag: '3650条评价',
    distanceTag: '人均¥28',
    desc: '奶油小方永远的神！3.5 一块的时代虽然回不去了，但现在 8 块也值得。奶油是动物奶油，不腻。',
    image: 'http://p0.meituan.net/biztone/28d68accfb17606ee01a6e1c82a22236367582.jpg@340w_255h_1e_1c_1l|watermark=0',
    lng: 121.4355,
    lat: 31.2135,
    gallery: ['http://p0.meituan.net/biztone/28d68accfb17606ee01a6e1c82a22236367582.jpg@340w_255h_1e_1c_1l|watermark=0'],
    intro: '奶油小方永远的神！3.5 一块的时代虽然回不去了，但现在 8 块也值得。奶油是动物奶油，不腻。 周末排队能排到门口马路上。建议工作日下午来，基本不用等。 除了奶油小方，拿破仑也很出色。栗子蛋糕季节限定，遇到一定要买。',
    hours: '07:00-21:00',
    dianpingPosts: [
      { title: '奶油小方经典不腻', desc: '奶油小方永远的神！3.5 一块的时代虽然回不去了，但现在 8 块也值得。', url: 'https://www.dianping.com/shop/l9X83hRiNxzywpno' },
      { title: '周末排到马路上', desc: '周末排队能排到门口马路上。建议工作日下午来，基本不用等。', url: 'https://www.dianping.com/shop/l9X83hRiNxzywpno' },
    ],
    reviews: [
      { author: '奶油控', avatar: '奶', rating: 5, text: '奶油小方永远的神！3.5 一块的时代虽然回不去了，但现在 8 块也值得。奶油是动物奶油，不腻。', date: '2026-04-10', highlight: '奶油小方经典不腻' },
      { author: '怀旧党', avatar: '旧', rating: 4, text: '周末排队能排到门口马路上。建议工作日下午来，基本不用等。', date: '2026-03-25', highlight: '周末排到马路上' },
      { author: '甜品猎人', avatar: '猎', rating: 4, text: '除了奶油小方，拿破仑也很出色。栗子蛋糕季节限定，遇到一定要买。', date: '2026-05-01', highlight: '拿破仑和栗子蛋糕' },
    ],
    x: 0, y: 0,
  },
  // POI 7: 兰心餐厅
  {
    id: 'dp_lanxin',
    title: '兰心餐厅',
    category: 'food',
    topTag: '3.5分',
    planTag: '11552条评价',
    distanceTag: '人均¥92',
    desc: '排队是真的久，周末至少 1 小时起步。但红烧肉真的值得等，肥而不腻入口化渣。',
    image: 'https://img.meituan.net/msmerchant/8ffa80bfeddca02f554d990d09f35d0117229.jpg@340w_255h_1e_1c_1l|watermark=0',
    lng: 121.4521,
    lat: 31.2168,
    gallery: ['https://img.meituan.net/msmerchant/8ffa80bfeddca02f554d990d09f35d0117229.jpg@340w_255h_1e_1c_1l|watermark=0'],
    intro: '排队是真的久，周末至少 1 小时起步。但红烧肉真的值得等，肥而不腻入口化渣。 草头圈子是进贤路一绝。建议 11 点开门就到，第一轮不用等。 蟹粉豆腐、红烧肉、油爆虾三件套永远不出错。人均 100 出头，本帮菜天花板。 20:30 停止点单，我 20:15 到的只能点两个菜就催单了。务必提前到。',
    hours: '11:00-13:30, 17:00-20:30',
    dianpingPosts: [
      { title: '周末排队1小时起步', desc: '排队是真的久，周末至少 1 小时起步。但红烧肉真的值得等，肥而不腻入口化渣。', url: 'https://www.dianping.com/shop/l4tAieMmQdQiuHLA' },
      { title: '11点开门第一轮免排', desc: '草头圈子是进贤路一绝。建议 11 点开门就到，第一轮不用等。', url: 'https://www.dianping.com/shop/l4tAieMmQdQiuHLA' },
    ],
    reviews: [
      { author: '排队专家', avatar: '专', rating: 4, text: '排队是真的久，周末至少 1 小时起步。但红烧肉真的值得等，肥而不腻入口化渣。', date: '2026-04-08', highlight: '周末排队1小时起步' },
      { author: '老饕', avatar: '饕', rating: 5, text: '草头圈子是进贤路一绝。建议 11 点开门就到，第一轮不用等。', date: '2026-03-12', highlight: '11点开门第一轮免排' },
      { author: '上海胃', avatar: '胃', rating: 5, text: '蟹粉豆腐、红烧肉、油爆虾三件套永远不出错。人均 100 出头，本帮菜天花板。', date: '2026-05-20', highlight: '三件套人均100' },
      { author: '失望一次', avatar: '失', rating: 3, text: '20:30 停止点单，我 20:15 到的只能点两个菜就催单了。务必提前到。', date: '2026-04-30', highlight: '20:30停止点单' },
    ],
    x: 0, y: 0,
  },
  // POI 8: 永康路咖啡
  {
    id: 'dp_yongkang_coffee',
    title: '永康路咖啡',
    category: 'drink',
    topTag: '4分',
    planTag: '4163条评价',
    distanceTag: '人均¥56',
    desc: '美式 35 可以续杯一下午。老板是个特别老克勒的爷叔，偶尔会跟你聊聊老上海。',
    image: 'http://p1.meituan.net/merchant/aa20f9b671354897ba4ac673a202de02934486.jpg@340w_255h_1e_1c_1l|watermark=0',
    lng: 121.4475,
    lat: 31.2105,
    gallery: ['http://p1.meituan.net/merchant/aa20f9b671354897ba4ac673a202de02934486.jpg@340w_255h_1e_1c_1l|watermark=0'],
    intro: '美式 35 可以续杯一下午。老板是个特别老克勒的爷叔，偶尔会跟你聊聊老上海。 没有网红打卡的喧闹，就是一个安安静静喝咖啡的地方。位子不多但翻台快。 来了三年了，每周至少一次。拿铁拉花虽然一般，但豆子烘焙度刚好，不酸不苦。',
    hours: '08:30-18:00',
    dianpingPosts: [
      { title: '美式35续杯一下午', desc: '美式 35 可以续杯一下午。老板是个特别老克勒的爷叔，偶尔会跟你聊聊老上海。', url: 'https://www.dianping.com/shop/H1i49HzO1nxLgK2c' },
      { title: '安静不网红', desc: '没有网红打卡的喧闹，就是一个安安静静喝咖啡的地方。位子不多但翻台快。', url: 'https://www.dianping.com/shop/H1i49HzO1nxLgK2c' },
    ],
    reviews: [
      { author: '咖啡续命', avatar: '续', rating: 5, text: '美式 35 可以续杯一下午。老板是个特别老克勒的爷叔，偶尔会跟你聊聊老上海。', date: '2026-04-15', highlight: '美式35续杯一下午' },
      { author: '安静角落', avatar: '角', rating: 5, text: '没有网红打卡的喧闹，就是一个安安静静喝咖啡的地方。位子不多但翻台快。', date: '2026-03-08', highlight: '安静不网红' },
      { author: '常客', avatar: '常', rating: 5, text: '来了三年了，每周至少一次。拿铁拉花虽然一般，但豆子烘焙度刚好，不酸不苦。', date: '2026-05-18', highlight: '豆子烘焙度刚好' },
    ],
    x: 0, y: 0,
  },
  // POI 9: 五原路
  {
    id: 'dp_wuyuan_road',
    title: '五原路',
    category: 'sight',
    topTag: '4.5分',
    planTag: '4300条评价',
    distanceTag: '免费',
    desc: '五原路菜场旁边的水果摊是全上海最有烟火气的角落。阿姨切水果的刀法是艺术。',
    image: scenicPhoto('五原路', { top: '#A7F3D0', bottom: '#059669', accent: '#FDE68A', accent2: '#99F6E4' }),
    lng: 121.4382,
    lat: 31.2098,
    gallery: [],
    intro: '五原路菜场旁边的水果摊是全上海最有烟火气的角落。阿姨切水果的刀法是艺术。 藏在梧桐树下的小路，游客很少。有几家独立设计师店值得逛。 无问西东那家甜品店，提拉米苏才 18 块，味道不输大牌甜品店。',
    hours: '全天开放',
    dianpingPosts: [
      { title: '菜场水果摊烟火气', desc: '五原路菜场旁边的水果摊是全上海最有烟火气的角落。阿姨切水果的刀法是艺术。', url: 'https://www.dianping.com/search/keyword/1/0_%E4%BA%94%E5%8E%9F%E8%B7%AF' },
      { title: '游客少独立设计师店', desc: '藏在梧桐树下的小路，游客很少。有几家独立设计师店值得逛。', url: 'https://www.dianping.com/search/keyword/1/0_%E4%BA%94%E5%8E%9F%E8%B7%AF' },
    ],
    reviews: [
      { author: '烟火气猎手', avatar: '烟', rating: 5, text: '五原路菜场旁边的水果摊是全上海最有烟火气的角落。阿姨切水果的刀法是艺术。', date: '2026-04-20', highlight: '菜场水果摊烟火气' },
      { author: '遛弯达人', avatar: '遛', rating: 5, text: '藏在梧桐树下的小路，游客很少。有几家独立设计师店值得逛。', date: '2026-03-15', highlight: '游客少独立设计师店' },
      { author: '性价比王', avatar: '价', rating: 5, text: '无问西东那家甜品店，提拉米苏才 18 块，味道不输大牌甜品店。', date: '2026-05-05', highlight: '提拉米苏18元' },
    ],
    x: 0, y: 0,
  },
  // POI 10: 阿娘面馆
  {
    id: 'dp_aniang_noodle',
    title: '阿娘面馆',
    category: 'food',
    topTag: '4.4分',
    planTag: '6500条评价',
    distanceTag: '人均¥28',
    desc: '黄鱼面 28 块，汤头浓到可以拿来拌饭。早上 7 点来基本不排队。',
    image: scenicPhoto('阿娘面馆', { top: '#FCA5A5', bottom: '#DC2626', accent: '#FDE68A', accent2: '#BBF7D0' }),
    lng: 121.4682,
    lat: 31.2185,
    gallery: [],
    intro: '黄鱼面 28 块，汤头浓到可以拿来拌饭。早上 7 点来基本不排队。 11 点以后排队二三十分钟是常态。面条偏软，喜欢硬面的可以跟老板说。 大肠面和辣肉面也不错。下午 2 点就关门了，别踩空。',
    hours: '06:30-14:00',
    dianpingPosts: [
      { title: '黄鱼面28元汤头浓', desc: '黄鱼面 28 块，汤头浓到可以拿来拌饭。早上 7 点来基本不排队。', url: 'https://www.dianping.com/search/keyword/1/0_%E9%98%BF%E5%A8%98%E9%9D%A2%E9%A6%86' },
      { title: '11点后排队半小时', desc: '11 点以后排队二三十分钟是常态。面条偏软，喜欢硬面的可以跟老板说。', url: 'https://www.dianping.com/search/keyword/1/0_%E9%98%BF%E5%A8%98%E9%9D%A2%E9%A6%86' },
    ],
    reviews: [
      { author: '面食控', avatar: '面', rating: 5, text: '黄鱼面 28 块，汤头浓到可以拿来拌饭。早上 7 点来基本不排队。', date: '2026-04-12', highlight: '黄鱼面28元汤头浓' },
      { author: '上班族', avatar: '班', rating: 4, text: '11 点以后排队二三十分钟是常态。面条偏软，喜欢硬面的可以跟老板说。', date: '2026-03-28', highlight: '11点后排队半小时' },
      { author: '本地推荐', avatar: '推', rating: 5, text: '大肠面和辣肉面也不错。下午 2 点就关门了，别踩空。', date: '2026-05-10', highlight: '14点关门别踩空' },
    ],
    x: 0, y: 0,
  },
  // POI 11: 老虎灶
  {
    id: 'dp_laohuza',
    title: '老虎灶',
    category: 'food',
    topTag: '4.5分',
    planTag: '3200条评价',
    distanceTag: '人均¥22',
    desc: '蟹粉小笼三两 48，汤汁真的鲜。先咬个小口吸汤，别直接一口闷。',
    image: scenicPhoto('老虎灶', { top: '#F59E0B', bottom: '#B45309', accent: '#BBF7D0', accent2: '#93C5FD' }),
    lng: 121.4815,
    lat: 31.2125,
    gallery: [],
    intro: '蟹粉小笼三两 48，汤汁真的鲜。先咬个小口吸汤，别直接一口闷。 7 点半到刚好不排队。锅贴也值得一试，底部煎得焦脆。 环境确实一般，苍蝇馆子风格。但味道是真的好，别在意装修。',
    hours: '06:00-13:00',
    dianpingPosts: [
      { title: '蟹粉小笼吸汤', desc: '蟹粉小笼三两 48，汤汁真的鲜。先咬个小口吸汤，别直接一口闷。', url: 'https://www.dianping.com/search/keyword/1/0_%E8%80%81%E8%99%8E%E7%81%B6' },
      { title: '7:30到免排队', desc: '7 点半到刚好不排队。锅贴也值得一试，底部煎得焦脆。', url: 'https://www.dianping.com/search/keyword/1/0_%E8%80%81%E8%99%8E%E7%81%B6' },
    ],
    reviews: [
      { author: '包子党', avatar: '包', rating: 5, text: '蟹粉小笼三两 48，汤汁真的鲜。先咬个小口吸汤，别直接一口闷。', date: '2026-04-18', highlight: '蟹粉小笼吸汤' },
      { author: '早起鸟', avatar: '鸟', rating: 5, text: '7 点半到刚好不排队。锅贴也值得一试，底部煎得焦脆。', date: '2026-03-20', highlight: '7:30到免排队' },
      { author: '食评人', avatar: '评', rating: 4, text: '环境确实一般，苍蝇馆子风格。但味道是真的好，别在意装修。', date: '2026-05-08', highlight: '环境一般味道好' },
    ],
    x: 0, y: 0,
  },
  // POI 12: 徐汇滨江
  {
    id: 'dp_binjiang',
    title: '徐汇滨江',
    category: 'sight',
    topTag: '4.5分',
    planTag: '2688条评价',
    distanceTag: '人均¥97',
    desc: '草坪超大，铺毯子野餐完全不会挤。周末有时有集市，氛围很好。',
    image: 'https://img.meituan.net/content/e7e05be59f019d8d82feb1d75bdfbb52166809.jpg@340w_255h_1e_1c_1l|watermark=0',
    lng: 121.4545,
    lat: 31.1825,
    gallery: ['https://img.meituan.net/content/e7e05be59f019d8d82feb1d75bdfbb52166809.jpg@340w_255h_1e_1c_1l|watermark=0'],
    intro: '草坪超大，铺毯子野餐完全不会挤。周末有时有集市，氛围很好。 对小朋友特别友好，有专门的儿童游乐区。厕所也很干净。旁边就有便利店补给。 骑行道和步行道分开的，不用担心被自行车吓到。落日时分面朝浦江骑一圈太治愈了。',
    hours: '全天开放',
    dianpingPosts: [
      { title: '草坪野餐不挤', desc: '草坪超大，铺毯子野餐完全不会挤。周末有时有集市，氛围很好。', url: 'https://www.dianping.com/shop/k4Cd6dTAE9XIkppx' },
      { title: '儿童游乐区+便利店', desc: '对小朋友特别友好，有专门的儿童游乐区。厕所也很干净。旁边就有便利店补给。', url: 'https://www.dianping.com/shop/k4Cd6dTAE9XIkppx' },
    ],
    reviews: [
      { author: '野餐族', avatar: '餐', rating: 5, text: '草坪超大，铺毯子野餐完全不会挤。周末有时有集市，氛围很好。', date: '2026-04-22', highlight: '草坪野餐不挤' },
      { author: '带娃妈妈', avatar: '妈', rating: 5, text: '对小朋友特别友好，有专门的儿童游乐区。厕所也很干净。旁边就有便利店补给。', date: '2026-05-15', highlight: '儿童游乐区+便利店' },
      { author: '骑行客', avatar: '骑', rating: 5, text: '骑行道和步行道分开的，不用担心被自行车吓到。落日时分面朝浦江骑一圈太治愈了。', date: '2026-03-30', highlight: '落日骑行治愈' },
    ],
    x: 0, y: 0,
  },
  // POI 13: 后滩公园
  {
    id: 'dp_houtan_park',
    title: '后滩公园',
    category: 'sight',
    topTag: '5分',
    planTag: '372条评价',
    distanceTag: '免费',
    desc: '野草地和小溪是全上海最治愈的角落。春天有一片油菜花，适合带小朋友认识植物。',
    image: 'https://p0.meituan.net/ugcpic/0030524cd95677bbe684a6d265f584f2@340w_255h_1e_1c_1l|watermark=0',
    lng: 121.4685,
    lat: 31.1845,
    gallery: ['https://p0.meituan.net/ugcpic/0030524cd95677bbe684a6d265f584f2@340w_255h_1e_1c_1l|watermark=0'],
    intro: '野草地和小溪是全上海最治愈的角落。春天有一片油菜花，适合带小朋友认识植物。 小溪可以脱鞋踩水，娃开心到不肯走。记得带换洗衣服和防晒。 傍晚的后滩芦苇地拍剪影特别好看。湿地生态修复得很好，偶尔能看到白鹭。',
    hours: '06:00-18:00',
    dianpingPosts: [
      { title: '野草地小溪治愈', desc: '野草地和小溪是全上海最治愈的角落。春天有一片油菜花，适合带小朋友认识植物。', url: 'https://www.dianping.com/shop/G22KM4oz8Jnjnb51' },
      { title: '小溪踩水带换洗衣服', desc: '小溪可以脱鞋踩水，娃开心到不肯走。记得带换洗衣服和防晒。', url: 'https://www.dianping.com/shop/G22KM4oz8Jnjnb51' },
    ],
    reviews: [
      { author: '自然系', avatar: '然', rating: 5, text: '野草地和小溪是全上海最治愈的角落。春天有一片油菜花，适合带小朋友认识植物。', date: '2026-04-05', highlight: '野草地小溪治愈' },
      { author: '亲子达人', avatar: '亲', rating: 5, text: '小溪可以脱鞋踩水，娃开心到不肯走。记得带换洗衣服和防晒。', date: '2026-05-20', highlight: '小溪踩水带换洗衣服' },
      { author: '摄影师', avatar: '影', rating: 5, text: '傍晚的后滩芦苇地拍剪影特别好看。湿地生态修复得很好，偶尔能看到白鹭。', date: '2026-03-18', highlight: '芦苇地剪影白鹭' },
    ],
    x: 0, y: 0,
  },
  // POI 14: 上海图书馆东馆
  {
    id: 'dp_shanghai_lib',
    title: '上海图书馆东馆',
    category: 'drink',
    topTag: '4.5分',
    planTag: '5607条评价',
    distanceTag: '人均¥37',
    desc: '免费、安静、有空调。童书区设计得特别好，绘本种类超多。可以待一整天。',
    image: 'http://qcloud.dpfile.com/pc/yzWzRsN3dRnagQ-PFtEqT9LJfUEc6Hc2Qu0cQD6WEwczT_DHfqHPpoJ3fKALjcNcbKcq9vnEaGy3xLEf-_v_oA.jpg',
    lng: 121.5505,
    lat: 31.2185,
    gallery: ['http://qcloud.dpfile.com/pc/yzWzRsN3dRnagQ-PFtEqT9LJfUEc6Hc2Qu0cQD6WEwczT_DHfqHPpoJ3fKALjcNcbKcq9vnEaGy3xLEf-_v_oA.jpg'],
    intro: '免费、安静、有空调。童书区设计得特别好，绘本种类超多。可以待一整天。 二楼有专门的儿童阅读区，还有不定期的绘本剧场活动。周末记得提前预约。 建筑本身就值得来看。七楼的阅读露台可以看到世纪公园，太惬意了。',
    hours: '09:00-20:30（周一闭馆）',
    dianpingPosts: [
      { title: '免费安静童书区', desc: '免费、安静、有空调。童书区设计得特别好，绘本种类超多。可以待一整天。', url: 'https://www.dianping.com/shop/G3O8MNdyq5o4gDbg' },
      { title: '二楼儿童区需预约', desc: '二楼有专门的儿童阅读区，还有不定期的绘本剧场活动。周末记得提前预约。', url: 'https://www.dianping.com/shop/G3O8MNdyq5o4gDbg' },
    ],
    reviews: [
      { author: '书虫', avatar: '虫', rating: 5, text: '免费、安静、有空调。童书区设计得特别好，绘本种类超多。可以待一整天。', date: '2026-04-15', highlight: '免费安静童书区' },
      { author: '带娃爸爸', avatar: '爸', rating: 5, text: '二楼有专门的儿童阅读区，还有不定期的绘本剧场活动。周末记得提前预约。', date: '2026-05-08', highlight: '二楼儿童区需预约' },
      { author: '建筑控', avatar: '建', rating: 5, text: '建筑本身就值得来看。七楼的阅读露台可以看到世纪公园，太惬意了。', date: '2026-03-22', highlight: '七楼露台看世纪公园' },
    ],
    x: 0, y: 0,
  },
  // POI 15: 上海中心大厦
  {
    id: 'dp_shanghai_center',
    title: '上海中心大厦',
    category: 'sight',
    topTag: '5分',
    planTag: '21588条评价',
    distanceTag: '人均¥180',
    desc: '632 米俯瞰全上海，天气好能看到长江入海口。下午 4 点来可以看到日落渐变。',
    image: 'http://p0.meituan.net/tdctraveldark/4371fd08e5831f3ffa4ba6a71cd215c71188656.jpg@340w_255h_1e_1c_1l|watermark=0',
    lng: 121.5055,
    lat: 31.2355,
    gallery: ['http://p0.meituan.net/tdctraveldark/4371fd08e5831f3ffa4ba6a71cd215c71188656.jpg@340w_255h_1e_1c_1l|watermark=0'],
    intro: '632 米俯瞰全上海，天气好能看到长江入海口。下午 4 点来可以看到日落渐变。 门票 180 有点贵，但确实壮观。建议买下午票，能同时看到白天和夜景。 透明玻璃走廊不建议恐高的人尝试。但普通观光区完全没问题，玻璃很厚安全感足。',
    hours: '08:30-21:30（20:30停止售票）',
    dianpingPosts: [
      { title: '下午4点看日落', desc: '632 米俯瞰全上海，天气好能看到长江入海口。下午 4 点来可以看到日落渐变。', url: 'https://www.dianping.com/shop/EGX6t4BF86mu2rEt' },
      { title: '门票180建议下午票', desc: '门票 180 有点贵，但确实壮观。建议买下午票，能同时看到白天和夜景。', url: 'https://www.dianping.com/shop/EGX6t4BF86mu2rEt' },
    ],
    reviews: [
      { author: '打卡选手', avatar: '卡', rating: 5, text: '632 米俯瞰全上海，天气好能看到长江入海口。下午 4 点来可以看到日落渐变。', date: '2026-04-28', highlight: '下午4点看日落' },
      { author: '节俭族', avatar: '俭', rating: 3, text: '门票 180 有点贵，但确实壮观。建议买下午票，能同时看到白天和夜景。', date: '2026-05-12', highlight: '门票180建议下午票' },
      { author: '恐高者', avatar: '恐', rating: 4, text: '透明玻璃走廊不建议恐高的人尝试。但普通观光区完全没问题，玻璃很厚安全感足。', date: '2026-03-25', highlight: '透明走廊不适合恐高' },
    ],
    x: 0, y: 0,
  },
];


function ExploreRouteApp() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{ startY: number; startTop: number; moved: boolean } | null>(null);
  const drawerTopRef = useRef(0);
  const toastTimer = useRef<number | null>(null);
  const suppressTapRef = useRef(false);

  const spots = defaultSpots;

  const cityOptions = [
    { name: '上海市', weather: '多云 24° - 29°' },
    { name: '深圳市', weather: '雷暴 28° - 34°' },
    { name: '广州市', weather: '多云 27° - 33°' },
    { name: '北京市', weather: '晴 22° - 31°' },
  ];
  const [city, setCity] = useState(cityOptions[0]);
  const [showCityPanel, setShowCityPanel] = useState(false);
  const [dynamicSpots, setDynamicSpots] = useState<Spot[]>(defaultSpots);

  const loadCityData = (cityName: string) => {
    const short = cityName.replace(/市$/, '');
    fetch(`/api/search?city=${encodeURIComponent(short)}&keywords=景点,美食,咖啡,购物`)
      .then(r => r.json())
      .then(data => {
        if (!data?.pois?.length) return;
        const palettes = [
          { top: '#89CFF0', bottom: '#4E87B7', accent: '#B9D98D', accent2: '#E7C97F' },
          { top: '#D9C3A4', bottom: '#A16207', accent: '#FDE68A', accent2: '#A3E635' },
          { top: '#7D8D9F', bottom: '#334155', accent: '#D8B4FE', accent2: '#C084FC' },
          { top: '#1E3A8A', bottom: '#0F172A', accent: '#F5D061', accent2: '#F59E0B' },
          { top: '#B6E0FE', bottom: '#7DD3FC', accent: '#93C5FD', accent2: '#FDE68A' },
          { top: '#A7F3D0', bottom: '#059669', accent: '#FDE68A', accent2: '#99F6E4' },
        ];
        const loaded: Spot[] = data.pois.map((p: any, i: number) => {
          const realImg = p.dp_image ? decodeURIComponent(p.dp_image) : '';
          return {
            id: p.poi_id, title: p.name,
            category: (p.type === 'food' ? 'food' : p.type === 'rest' ? 'drink' : p.categories?.some((c:string) => /购|商/.test(c)) ? 'shopping' : 'sight') as CategoryId,
            topTag: p.avg_rating ? `${p.avg_rating}分` : '热门',
            planTag: p.review_count ? `${p.review_count}条评价` : '',
            distanceTag: p.avg_price ? `人均¥${p.avg_price}` : '免费',
            desc: p.reviews?.[0]?.text?.slice(0, 60) || p.categories?.join(' · ') || '',
            image: realImg || scenicPhoto(p.name.slice(0, 6), palettes[i % palettes.length]),
            reviews: p.reviews || [],
            gallery: realImg ? [realImg] : [],
            intro: p.reviews?.map((r: any) => r.text).join(' ') || '',
            hours: p.business_hours?.join(', ') || '以门店实际为准',
            dianpingPosts: (p.reviews || []).slice(0, 2).map((r: any) => ({
              title: r.highlight || r.text?.slice(0, 15) || p.name,
              desc: r.text?.slice(0, 50) || '',
              url: `https://www.dianping.com/search/keyword/1/0_${encodeURIComponent(p.name)}`
            })),
            lng: p.longitude, lat: p.latitude,
            x: 50, y: 50,
          };
        });
        setDynamicSpots(loaded);
      })
      .catch(() => {});
  };

  const areaMap: Record<string, string> = { '上海市': '衡复/徐汇', '深圳市': '南山区', '广州市': '天河/荔湾', '北京市': '东城/西城' };
  const areaName = areaMap[city.name] || city.name.replace(/市$/, '');
  const descMap: Record<string, string> = {
    '上海市': '梧桐掩映的小马路上，咖啡香混着法式面包的甜味，走几步就是一个惊喜。\n基于用户真实数据，已为你梳理当前区域热门去处。',
    '深圳市': '科技与创意交融的年轻城市，步行之间总能遇见意想不到的惊喜。\n基于用户真实数据，已为你梳理当前区域热门去处。',
    '广州市': '骑楼与老巷里藏着地道烟火气，每条街都有属于自己的味道。\n基于用户真实数据，已为你梳理当前区域热门去处。',
    '北京市': '红墙灰瓦与胡同咖啡交织，古都韵味中透着新鲜劲儿。\n基于用户真实数据，已为你梳理当前区域热门去处。',
  };

  const [activeCategory, setActiveCategory] = useState<CategoryId>('sight');
  const [expanded, setExpanded] = useState(false);
  const [drawerTop, setDrawerTop] = useState(500);
  const [containerHeight, setContainerHeight] = useState(844);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [addedIds, setAddedIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('cw_added_pois') || '[]'); } catch { return []; }
  });
  const [toastText, setToastText] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [detailSpotId, setDetailSpotId] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('cw_favorites') || '[]'); } catch { return []; }
  });
  const [checkedInIds, setCheckedInIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('cw_checkins') || '[]'); } catch { return []; }
  });

  const expandedTop = 56;
  const collapsedTop = Math.max(containerHeight * 0.68, 500);

  const filteredSpots = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return dynamicSpots.filter((spot) => {
      const byKeyword = !keyword || `${spot.title}${spot.desc}${spot.topTag}`.toLowerCase().includes(keyword);
      return byKeyword;
    });
  }, [activeCategory, searchText, dynamicSpots]);

  const detailSpot = useMemo(
    () => filteredSpots.find((spot) => spot.id === detailSpotId) || dynamicSpots.find((spot) => spot.id === detailSpotId) || null,
    [detailSpotId, filteredSpots, dynamicSpots]
  );

  useEffect(() => {
    const measure = () => {
      const h = containerRef.current?.getBoundingClientRect().height || window.innerHeight || 844;
      setContainerHeight(Math.max(760, Math.round(h)));
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    drawerTopRef.current = drawerTop;
  }, [drawerTop]);

  useEffect(() => {
    setDrawerTop(expanded ? expandedTop : collapsedTop);
  }, [collapsedTop, expanded]);

  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === '#route') {
        setExpanded(false);
        setSearchOpen(false);
        setSearchText('');
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const snapTo = (nextExpanded: boolean) => {
    setExpanded(nextExpanded);
    const nextTop = nextExpanded ? expandedTop : collapsedTop;
    drawerTopRef.current = nextTop;
    setDrawerTop(nextTop);
  };

  const showToastMessage = (text: string) => {
    setToastText(text);
    setShowToast(true);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setShowToast(false), 1700);
  };

  const addToPlan = (spotId: string) => {
    setAddedIds((prev) => {
      if (prev.includes(spotId)) {
        showToastMessage('已加入行程');
        return prev;
      }
      const next = [...prev, spotId];
      localStorage.setItem('cw_added_pois', JSON.stringify(next));
      showToastMessage('已加入行程');
      return next;
    });
  };

  const toggleFavorite = (spotId: string) => {
    setFavoriteIds((prev) => {
      const next = prev.includes(spotId) ? prev.filter((id) => id !== spotId) : [...prev, spotId];
      showToastMessage(next.includes(spotId) ? '已收藏' : '已取消收藏');
      localStorage.setItem('cw_favorites', JSON.stringify(next));
      return next;
    });
  };

  const toggleCheckIn = (spotId: string) => {
    setCheckedInIds((prev) => {
      const next = prev.includes(spotId) ? prev.filter((id) => id !== spotId) : [...prev, spotId];
      showToastMessage(next.includes(spotId) ? '打卡成功' : '已取消打卡');
      localStorage.setItem('cw_checkins', JSON.stringify(next));
      return next;
    });
  };

  const openNavigation = (spot: Spot) => {
    const url = `https://m.amap.com/search/mapview?keywords=${encodeURIComponent(spot.title)}`;
    showToastMessage('已为你打开导航');
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const onDrawerPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragState.current = {
      startY: event.clientY,
      startTop: drawerTop,
      moved: false
    };

    const onMove = (moveEvent: PointerEvent) => {
      if (!dragState.current) return;
      const delta = moveEvent.clientY - dragState.current.startY;
      if (Math.abs(delta) > 6) dragState.current.moved = true;
      const nextTop = clamp(dragState.current.startTop + delta, expandedTop, collapsedTop);
      drawerTopRef.current = nextTop;
      setDrawerTop(nextTop);
    };

    const onUp = () => {
      const current = dragState.current;
      dragState.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      suppressTapRef.current = !!current?.moved;
      window.setTimeout(() => {
        suppressTapRef.current = false;
      }, 50);
      const midpoint = (expandedTop + collapsedTop) / 2;
      snapTo(drawerTopRef.current < midpoint);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const openSpot = (spotId: string) => {
    if (!dynamicSpots.some((spot) => spot.id === spotId)) return;
    setDetailSpotId(spotId);
  };

  const openPlanFromSpot = (spot: Spot) => {
    sessionStorage.setItem(
      'cw_pending_query',
      JSON.stringify({
        source: 'explore',
        city: city.name,
        region: areaName,
        text: `围绕${spot.title}规划一条适合当下出发的CityWalk路线`,
        pois: [{ name: spot.title, desc: spot.desc }],
        allSpots: dynamicSpots.map(s => ({ name: s.title, id: s.id })),
      })
    );
    window.location.hash = 'plan';
  };


  return (
    <div
      ref={containerRef}
      className="relative mx-auto h-screen max-w-[430px] overflow-hidden bg-[#f5f9ff] font-sans text-[#1a1a2e]"
      style={{ height: '100vh' }}
    >
      <AMapView spots={dynamicSpots} activeCategory={activeCategory} onSpotClick={openSpot} />

      {/* Top bar: city name + compact buttons */}
      <div className="absolute inset-x-0 top-0 z-40 pointer-events-none">
        <div className="pointer-events-auto px-5 pt-[env(safe-area-inset-top,12px)]" style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}>
          <div className="flex items-center justify-between">
            <div className="relative">
              <button type="button" className="flex items-center gap-1 text-left" onClick={() => setShowCityPanel(p => !p)}>
                <span className="text-[18px] font-bold tracking-[0.01em] text-[#1a1a2e]">{city.name}</span>
                <ChevronDown className="mt-0.5 h-4 w-4 text-[#8e8e93]" strokeWidth={2.3} />
              </button>
              <div className="mt-0.5 text-[12px] font-medium text-[#8e8e93]">{city.weather}</div>
              {showCityPanel && (
                <div className="absolute left-0 top-12 w-40 rounded-[18px] bg-white/95 p-2 shadow-[0_12px_32px_rgba(30,95,216,0.15)] backdrop-blur-xl z-50">
                  {cityOptions.map(item => (
                    <button key={item.name} type="button"
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-[13px] ${item.name === city.name ? 'bg-gradient-to-r from-[#1e5fd8] to-[#5b9eff] text-white' : 'text-[#1a1a2e] hover:bg-[rgba(91,158,255,0.08)]'}`}
                      onClick={() => { setCity(item); setShowCityPanel(false); loadCityData(item.name); }}>
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-[#1a1a2e] shadow-sm backdrop-blur" onClick={() => { setSearchOpen(p => !p); }}>
                <Search className="h-4 w-4" strokeWidth={2.4} />
              </button>
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/60 shadow-sm backdrop-blur" onClick={() => { window.location.hash = 'mine'; }}>
                <UserRound className="h-4 w-4 text-[#5a5a62]" strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Drawer */}
      <div
        className="absolute inset-x-0 z-30 rounded-t-[28px] bg-white/[0.92] shadow-[0_12px_32px_rgba(30,95,216,0.15)] backdrop-blur-xl border-t border-[rgba(140,180,240,0.3)] transition-[top] duration-300 ease-out"
        style={{ top: drawerTop, bottom: 0, willChange: 'transform' }}
      >
        <div
          className="flex cursor-grab flex-col px-6 pb-2 pt-3 active:cursor-grabbing"
          style={{ touchAction: 'none' }}
          onPointerDown={onDrawerPointerDown}
          onClick={() => {
            if (!expanded && !suppressTapRef.current) snapTo(true);
          }}
        >
          <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-[rgba(140,180,240,0.4)]" />

          {/* Category tabs inside drawer */}
          <div className="grid grid-cols-5 gap-2">
            {categories.map((item) => {
              const active = item.id === activeCategory;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveCategory(item.id);
                    if (!expanded) setDetailSpotId(null);
                  }}
                  className={`flex min-w-0 items-center justify-center gap-1 rounded-[18px] border px-1 py-2 text-[12px] font-bold leading-none transition-all ${
                    active
                      ? 'border-white bg-white text-[#1a1a2e] shadow-[0_10px_26px_rgba(30,95,216,0.12)]'
                      : 'border-[rgba(140,180,240,0.3)] bg-[rgba(232,242,255,0.55)] text-[#5a5a62]'
                  }`}
                >
                  <span className="text-[13px]">{item.emoji}</span>
                  <span className="truncate text-[12px]">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search box inside drawer */}
          {searchOpen && (
            <div className="mt-3 rounded-[18px] bg-[rgba(232,242,255,0.55)] px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-[#8e8e93]" strokeWidth={2.2} />
                <input
                  autoFocus
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="搜索地点或关键词"
                  className="w-full bg-transparent text-[14px] text-[#1a1a2e] outline-none placeholder:text-[#8e8e93]"
                />
                {searchText ? (
                  <button
                    type="button"
                    className="text-[12px] font-medium text-[#8e8e93]"
                    onClick={(e) => { e.stopPropagation(); setSearchText(''); }}
                  >
                    清空
                  </button>
                ) : null}
              </div>
            </div>
          )}

          <div className="mt-3 text-[18px] font-bold tracking-[0.01em] text-[#1a1a2e]">{areaName}</div>
          {expanded ? (
            <>
              <p className="mt-3 whitespace-pre-line pr-8 text-[14px] leading-7 text-[#5a5a62]">
                {descMap[city.name] || '基于用户真实数据，已为你梳理当前区域热门去处。'}
              </p>
              <div className="mt-4 h-px bg-[rgba(140,180,240,0.2)]" />
            </>
          ) : null}
        </div>

        <div
          className="overflow-y-auto px-6 pb-28"
          style={{ height: expanded ? `calc(100% - 200px)` : `calc(100% - 120px)` }}
        >
          {expanded ? (
            <div className="space-y-6 pt-2">
              {filteredSpots.map((spot) => {
                const added = addedIds.includes(spot.id);
                return (
                  <button
                    key={spot.id}
                    type="button"
                    className="flex w-full items-start gap-4 text-left"
                    onClick={() => openSpot(spot.id)}
                  >
                    <img src={spot.image} alt={spot.title} referrerPolicy="no-referrer" className="h-24 w-24 shrink-0 rounded-[22px] object-cover shadow-sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-[18px] font-bold leading-6 text-[#1a1a2e]">{spot.title}</div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="rounded-md bg-[rgba(91,158,255,0.15)] px-2 py-1 text-[11px] font-semibold leading-none text-[#5b9eff]">
                              {spot.topTag}
                            </span>
                            <span className="rounded-md bg-[rgba(232,242,255,0.65)] px-2 py-1 text-[11px] font-semibold leading-none text-[#5a5a62]">
                              {spot.planTag}
                            </span>
                            <span className="rounded-md bg-[rgba(232,242,255,0.65)] px-2 py-1 text-[11px] font-semibold leading-none text-[#5a5a62]">
                              {spot.distanceTag}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            added ? 'bg-gradient-to-r from-[#1e5fd8] to-[#5b9eff] text-white' : 'bg-[rgba(232,242,255,0.65)] text-[#8e8e93]'
                          }`}
                          onClick={(event) => {
                            event.stopPropagation();
                            addToPlan(spot.id);
                          }}
                        >
                          {added ? <Check className="h-4 w-4" strokeWidth={2.8} /> : <Plus className="h-4 w-4" strokeWidth={2.8} />}
                        </button>
                      </div>
                      <p
                        className="mt-2 text-[15px] leading-7 text-[#8e8e93]"
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {spot.desc}
                      </p>
                    </div>
                  </button>
                );
              })}

              {!filteredSpots.length ? (
                <div className="rounded-[24px] bg-[rgba(232,242,255,0.55)] px-5 py-6 text-center text-[14px] leading-6 text-[#8e8e93]">
                  没有找到匹配的地点，试试别的关键词。
                </div>
              ) : null}
            </div>
          ) : (
            <div className="pt-3 text-[13px] leading-6 text-[#8e8e93]">
              上滑查看区域热门地点，或点按标题直接展开推荐列表。
            </div>
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-50 flex justify-center pb-[84px]">
        <div
          className={`pointer-events-auto rounded-full bg-[rgba(10,20,40,0.88)] px-4 py-2 text-[12.5px] font-medium text-white shadow-lg transition-all ${
            showToast ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
        >
          {toastText}
        </div>
      </div>

      {detailSpot && (
        <div className="absolute inset-0 z-[60] bg-black/28 backdrop-blur-[2px]" onClick={() => setDetailSpotId(null)}>
          <div
            className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[430px] overflow-hidden rounded-t-[34px] bg-white/[0.95] backdrop-blur-xl shadow-[0_-24px_70px_rgba(30,95,216,0.2)]"
            onClick={(event) => event.stopPropagation()}
            style={{ maxHeight: '84vh' }}
          >
            <div className="px-6 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[26px] font-bold tracking-[-0.01em] text-[#1a1a2e]">{detailSpot.title}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-[rgba(232,242,255,0.65)] px-3 py-1.5 text-[12px] font-semibold text-[#5a5a62]">
                      {categories.find((item) => item.id === detailSpot.category)?.label ?? '地点'}
                    </span>
                    <span className="rounded-full bg-[rgba(232,242,255,0.65)] px-3 py-1.5 text-[12px] font-semibold text-[#5a5a62]">{detailSpot.planTag}</span>
                    <span className="rounded-full bg-[rgba(232,242,255,0.65)] px-3 py-1.5 text-[12px] font-semibold text-[#5a5a62]">驾车 · {detailSpot.distanceTag}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(232,242,255,0.65)] text-[#8e8e93]"
                  onClick={() => setDetailSpotId(null)}
                >
                  <X className="h-5 w-5" strokeWidth={2.6} />
                </button>
              </div>
            </div>

            <div className="mt-5 overflow-y-auto px-6 pb-[110px]" style={{ maxHeight: 'calc(84vh - 98px)', WebkitOverflowScrolling: 'touch' }}>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {(detailSpot.gallery?.length ? detailSpot.gallery : [detailSpot.image]).map((img, index) => (
                  <img
                    key={`${detailSpot.id}-gallery-${index}`}
                    src={img}
                    alt={`${detailSpot.title}-${index + 1}`}
                    referrerPolicy="no-referrer"
                    className="h-[160px] w-[280px] shrink-0 rounded-[26px] object-cover"
                  />
                ))}
              </div>

              <div className="mt-6">
                <div className="flex items-center gap-2">
                  <div className="text-[18px] font-bold text-[#1a1a2e]">地点介绍</div>
                  <span className="rounded-full bg-[rgba(91,158,255,0.12)] px-2 py-1 text-[11px] font-semibold text-[#5b9eff]">AI生成</span>
                </div>
                <p className="mt-3 text-[15px] leading-7 text-[#5a5a62]">
                  {(detailSpot.intro || detailSpot.desc).replace('...展开', '')}
                </p>
              </div>

              <div className="mt-6 rounded-[26px] bg-[rgba(232,242,255,0.55)] p-4">
                <div className="text-[15px] font-bold text-[#1a1a2e]">营业时间</div>
                <div className="mt-2 text-[14px] leading-6 text-[#5a5a62]">{detailSpot.hours || '以门店实际为准'}</div>
              </div>

              <div className="mt-6">
                <div className="text-[18px] font-bold text-[#1a1a2e]">精选大众点评帖子</div>
                <div className="mt-3 space-y-3">
                  {(detailSpot.dianpingPosts || []).map((post) => (
                    <a
                      key={post.title}
                      href={post.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-[26px] bg-white/90 p-4 shadow-[0_8px_24px_rgba(30,95,216,0.08)] border border-[rgba(140,180,240,0.3)] backdrop-blur-xl"
                      onClick={() => showToastMessage('已打开大众点评')}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-[16px] font-bold text-[#1a1a2e]">{post.title}</div>
                          <div className="mt-2 text-[13px] leading-6 text-[#8e8e93]">{post.desc}</div>
                        </div>
                        <ExternalLink className="mt-1 h-4.5 w-4.5 shrink-0 text-[#8e8e93]" strokeWidth={2.3} />
                      </div>
                    </a>
                  ))}

                  {!(detailSpot.dianpingPosts || []).length ? (
                    <div className="rounded-[24px] bg-[rgba(232,242,255,0.55)] px-5 py-6 text-center text-[14px] leading-6 text-[#8e8e93]">
                      暂无精选内容，稍后再来看看。
                    </div>
                  ) : null}
                </div>
              </div>

              {detailSpot.reviews && detailSpot.reviews.length > 0 && (
                <div className="mt-6">
                  <div className="text-[18px] font-bold text-[#1a1a2e]">用户评论</div>
                  <div className="mt-3 space-y-3">
                    {detailSpot.reviews.map((review, i) => (
                      <div key={i} className="rounded-[20px] bg-[rgba(232,242,255,0.5)] p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#1e5fd8] to-[#5b9eff] text-white flex items-center justify-center text-[12px] font-bold">{review.avatar}</div>
                          <div>
                            <div className="text-[13px] font-semibold text-[#1a1a2e]">{review.author}</div>
                            <div className="text-[11px] text-[#8e8e93]">{review.date} · {'★'.repeat(review.rating)}</div>
                          </div>
                        </div>
                        <p className="text-[13px] leading-6 text-[#5a5a62]">{review.text}</p>
                        {review.highlight && (
                          <div className="mt-2 inline-block px-2 py-1 rounded-lg bg-[rgba(91,158,255,0.12)] text-[11px] text-[#5b9eff] font-medium">{review.highlight}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="absolute inset-x-0 bottom-0 border-t border-[rgba(140,180,240,0.3)] bg-white/[0.92] backdrop-blur-xl">
              <div className="flex gap-3 px-6 py-4">
                <button
                  type="button"
                  className={`flex flex-1 items-center justify-center gap-2 rounded-[22px] px-4 py-3 text-[15px] font-semibold ${
                    favoriteIds.includes(detailSpot.id) ? 'bg-gradient-to-r from-[#1e5fd8] to-[#5b9eff] text-white' : 'bg-[rgba(232,242,255,0.65)] text-[#1a1a2e]'
                  }`}
                  onClick={() => toggleFavorite(detailSpot.id)}
                >
                  <Heart className="h-4.5 w-4.5" strokeWidth={2.5} />
                  收藏
                </button>
                <button
                  type="button"
                  className={`flex flex-1 items-center justify-center gap-2 rounded-[22px] px-4 py-3 text-[15px] font-semibold ${
                    checkedInIds.includes(detailSpot.id) ? 'bg-gradient-to-r from-[#1e5fd8] to-[#5b9eff] text-white' : 'bg-[rgba(232,242,255,0.65)] text-[#1a1a2e]'
                  }`}
                  onClick={() => toggleCheckIn(detailSpot.id)}
                >
                  <CheckCircle2 className="h-4.5 w-4.5" strokeWidth={2.4} />
                  打卡
                </button>
                <button
                  type="button"
                  className="flex flex-1 items-center justify-center gap-2 rounded-[22px] bg-gradient-to-r from-[#1e5fd8] to-[#5b9eff] px-4 py-3 text-[15px] font-semibold text-white"
                  onClick={() => openNavigation(detailSpot)}
                >
                  <Navigation className="h-4.5 w-4.5" strokeWidth={2.4} />
                  导航
                </button>
              </div>
              <div className="px-6 pb-[calc(env(safe-area-inset-bottom)+16px)]">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-[22px] border border-[rgba(140,180,240,0.3)] bg-white/90 px-4 py-3 text-[14px] font-semibold text-[#1a1a2e]"
                  onClick={() => openPlanFromSpot(detailSpot)}
                >
                  <Navigation className="h-4.5 w-4.5 text-[#5b9eff]" strokeWidth={2.6} />
                  规划一条路线
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function mount() {
  const rootElement = document.getElementById('exploreRouteRoot');
  if (!rootElement) return;
  const root = createRoot(rootElement);
  root.render(<ExploreRouteApp />);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
