import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ChevronDown,
  ChevronRight,
  Footprints,
  PenLine,
  Share2,
  Route,
  Sparkles,
  X
} from 'lucide-react';

type CategoryId = 'sight' | 'food' | 'drink' | 'shopping' | 'stay';
type TravelMode = 'walk' | 'metro' | 'taxi';

type PendingQuery = {
  text?: string;
  images?: string[];
  presets?: Record<string, string | null>;
  pois?: Array<{ name: string; desc?: string }>;
  source?: 'home' | 'explore' | 'adjust';
  region?: string;
  city?: string;
  personas?: string[];
};

type CatalogPoi = {
  id: string;
  title: string;
  category: CategoryId;
  area: string;
  desc: string;
  vibe: string;
  image: string;
  x: number;
  y: number;
  stayMin: number;
  keywords: string[];
  lng?: number;
  lat?: number;
};

type RouteStop = CatalogPoi & {
  order: number;
  arriveAt: string;
  departAt: string;
  transitMode?: TravelMode;
  transitMin?: number;
  transitText?: string;
  reason: string;
  avg_rating?: number;
  review_count?: number;
  avg_price?: number;
  business_hours?: string[];
  reviews?: any[];
  dp_url?: string;
};

type RoutePlan = {
  title: string;
  dayTitle: string;
  daysText: string;
  subtitle: string;
  summary: string;
  startTime: string;
  totalDurationText: string;
  totalDistanceText: string;
  stops: RouteStop[];
  personas?: string[];
  stance?: string;
};

const makeDataUri = (svg: string) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

const scenicPhoto = (title: string, palette: { top: string; bottom: string; accent: string; accent2: string }) =>
  makeDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220">
      <defs>
        <linearGradient id="bg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="${palette.top}"/>
          <stop offset="100%" stop-color="${palette.bottom}"/>
        </linearGradient>
      </defs>
      <rect width="220" height="220" rx="34" fill="url(#bg)"/>
      <path d="M0 148 C32 126, 74 122, 114 140 S188 184, 220 168 L220 220 L0 220 Z" fill="${palette.accent}"/>
      <path d="M0 166 C48 142, 85 150, 129 170 S185 203, 220 192 L220 220 L0 220 Z" fill="${palette.accent2}" opacity="0.9"/>
      <circle cx="171" cy="48" r="18" fill="rgba(255,255,255,0.24)"/>
      <path d="M26 118 C47 82, 74 60, 111 60 C146 60, 171 78, 198 110" stroke="rgba(255,255,255,0.2)" stroke-width="12" fill="none" stroke-linecap="round"/>
      <rect x="18" y="18" width="110" height="28" rx="14" fill="rgba(255,255,255,0.2)"/>
      <text x="30" y="37" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="white">${title}</text>
    </svg>
  `);

const catalog: CatalogPoi[] = [
  {
    id: 'wukang-road',
    title: '武康路',
    category: 'sight',
    area: '衡复/徐汇',
    desc: '梧桐掩映的老洋房街区，武康大楼是必拍地标，适合作为路线的开场漫步。',
    vibe: '梧桐漫步',
    image: scenicPhoto('武康路', { top: '#89CFF0', bottom: '#4E87B7', accent: '#B9D98D', accent2: '#E7C97F' }),
    x: 42, y: 30, stayMin: 60, lng: 121.4365, lat: 31.2084,
    keywords: ['梧桐', '老洋房', '散步', '拍照', '街区', '景点']
  },
  {
    id: 'anfu-road',
    title: '安福路',
    category: 'shopping',
    area: '衡复/徐汇',
    desc: '买手店和独立咖啡馆扎堆，逛街、拍照、喝咖啡都能无缝衔接。',
    vibe: '潮流街区',
    image: scenicPhoto('安福路', { top: '#7D8D9F', bottom: '#334155', accent: '#D8B4FE', accent2: '#C084FC' }),
    x: 38, y: 38, stayMin: 75, lng: 121.4378, lat: 31.2122,
    keywords: ['购物', '买手店', '逛街', '咖啡', '潮流', '拍照']
  },
  {
    id: 'laojishi',
    title: '老吉士',
    category: 'food',
    area: '衡复/徐汇',
    desc: '地道本帮菜馆，浓油赤酱老上海味道，适合作为路线中的正餐站点。',
    vibe: '本帮味道',
    image: scenicPhoto('老吉士', { top: '#D9C3A4', bottom: '#A16207', accent: '#FDE68A', accent2: '#A3E635' }),
    x: 48, y: 42, stayMin: 80, lng: 121.4412, lat: 31.2055,
    keywords: ['吃饭', '美食', '本帮菜', '餐厅', '老上海']
  },
  {
    id: 'hongbaoshi',
    title: '红宝石',
    category: 'drink',
    area: '衡复/徐汇',
    desc: '经典奶油小方和鲜奶蛋糕，老上海甜蜜记忆，很适合下午茶歇脚。',
    vibe: '经典西点',
    image: scenicPhoto('红宝石', { top: '#FBCFE8', bottom: '#BE185D', accent: '#F9A8D4', accent2: '#FDE68A' }),
    x: 52, y: 35, stayMin: 40, lng: 121.4488, lat: 31.2098,
    keywords: ['甜品', '蛋糕', '下午茶', '咖啡', '经典']
  },
  {
    id: 'julu-road',
    title: '巨鹿路',
    category: 'sight',
    area: '衡复/徐汇',
    desc: '文艺小店和网红餐厅密集，适合边走边拍，作为路线中的质感转场。',
    vibe: '文艺街巷',
    image: scenicPhoto('巨鹿路', { top: '#8DD3C7', bottom: '#4B8E7B', accent: '#C6E48B', accent2: '#9AD0F5' }),
    x: 58, y: 28, stayMin: 55, lng: 121.4512, lat: 31.2195,
    keywords: ['文艺', '街巷', '拍照', '小店', '夜逛']
  },
  {
    id: 'yongkang-coffee',
    title: '永康路咖啡',
    category: 'drink',
    area: '衡复/徐汇',
    desc: '精品咖啡一条街，适合在路线中间放慢节奏补充能量。',
    vibe: '精品咖啡',
    image: scenicPhoto('永康路咖啡', { top: '#A7F3D0', bottom: '#059669', accent: '#FDE68A', accent2: '#99F6E4' }),
    x: 45, y: 50, stayMin: 50, lng: 121.4492, lat: 31.2058,
    keywords: ['咖啡', '饮品', '休息', '文艺', '街区']
  },
  {
    id: 'xuhui-riverside',
    title: '徐汇滨江',
    category: 'sight',
    area: '徐汇区',
    desc: '黄浦江边开阔散步道，适合傍晚看日落和城市天际线。',
    vibe: '江边漫步',
    image: scenicPhoto('徐汇滨江', { top: '#B6E0FE', bottom: '#7DD3FC', accent: '#93C5FD', accent2: '#FDE68A' }),
    x: 30, y: 68, stayMin: 70, lng: 121.4505, lat: 31.1832,
    keywords: ['江', '日落', '散步', '夜景', '公园', '拍照']
  },
  {
    id: 'shanghai-tower',
    title: '上海中心大厦',
    category: 'sight',
    area: '浦东新区',
    desc: '632 米城市地标，观光层俯瞰全城，适合作为路线的高潮或收尾。',
    vibe: '城市之巅',
    image: scenicPhoto('上海中心大厦', { top: '#1E3A8A', bottom: '#0F172A', accent: '#F5D061', accent2: '#F59E0B' }),
    x: 78, y: 45, stayMin: 90, lng: 121.5055, lat: 31.2335,
    keywords: ['景点', '拍照', '地标', '经典', '夜景', '观光']
  }
];

const RADAR_DIMS = [
  { key: 'photo', label: '出片', weights: { photographer: 1.0, literary: 0.4 } },
  { key: 'taste', label: '滋味', weights: { foodie: 1.0, local: 0.7 } },
  { key: 'value', label: '性价', weights: { value: 1.0 } },
  { key: 'cult',  label: '文化', weights: { literary: 1.0, local: 0.5 } },
  { key: 'easy',  label: '便捷', weights: { parent: 1.0, value: 0.3, local: 0.3 } },
];

function calcRadarScores(personas: string[]): number[] {
  const pScore: Record<string, number> = {};
  personas.forEach((p, i) => { pScore[p] = (pScore[p] || 0) + (i === 0 ? 1.0 : 0.5); });
  return RADAR_DIMS.map(dim => {
    let s = 0;
    for (const [p, w] of Object.entries(dim.weights)) s += (pScore[p] || 0) * w;
    return Math.min(1, s / 1.5);
  });
}

function RadarChart({ scores, size = 64 }: { scores: number[]; size?: number }) {
  const cx = size / 2, cy = size / 2, r = size * 0.38;
  const n = 5;
  const pts = (radius: number) => Array.from({ length: n }, (_, i) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)];
  });
  const bg = pts(r);
  const data = scores.map((s, i) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + r * s * Math.cos(a), cy + r * s * Math.sin(a)];
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <polygon points={bg.map(p => p.join(',')).join(' ')} fill="rgba(91,158,255,0.08)" stroke="rgba(91,158,255,0.2)" strokeWidth="0.5" />
      <polygon points={pts(r * 0.5).map(p => p.join(',')).join(' ')} fill="none" stroke="rgba(91,158,255,0.15)" strokeWidth="0.5" />
      <polygon points={data.map(p => p.join(',')).join(' ')} fill="rgba(91,158,255,0.25)" stroke="#5b9eff" strokeWidth="1.5" />
      {RADAR_DIMS.map((dim, i) => {
        const a = (Math.PI * 2 * i) / n - Math.PI / 2;
        const lx = cx + (r + 10) * Math.cos(a);
        const ly = cy + (r + 10) * Math.sin(a);
        return <text key={dim.key} x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize="7" fill="#8e8e93">{dim.label}</text>;
      })}
    </svg>
  );
}

const travelModeLabel: Record<TravelMode, string> = {
  walk: '步行',
  metro: '地铁',
  taxi: '打车'
};

// 预置路线案例（跳过 LLM 等待）
let _demoCases: any[] = [];
fetch('/data/demo_routes.json').then(r => r.json()).then(d => { _demoCases = d.cases || []; }).catch(() => {});

function parseMaybeJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function pad(num: number) {
  return String(num).padStart(2, '0');
}

function minutesToTime(totalMinutes: number) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${pad(h)}:${pad(m)}`;
}

function formatDuration(totalMinutes: number) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (!h) return `${m}分钟`;
  if (!m) return `${h}小时`;
  return `${h}小时${m}分钟`;
}

function estimateStartMinutes(text: string) {
  if (/晚上|夜|夜景/.test(text)) return 17 * 60 + 30;
  if (/下午|半天/.test(text)) return 14 * 60;
  if (/早餐|上午|早茶/.test(text)) return 9 * 60 + 30;
  return 10 * 60 + 30;
}

function estimateStopCount(text: string, profileText: string) {
  if (/全天|一天|整天/.test(text)) return 6;
  if (/晚上|夜|半天|下午/.test(text)) return 4;
  if (/轻松|简单|少走/.test(text) || /带娃/.test(profileText)) return 4;
  return 5;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));


function scorePoi(poi: CatalogPoi, text: string, selectedPoiNames: string[]) {
  let score = 0;
  const merged = text.toLowerCase();
  poi.keywords.forEach((key) => {
    if (merged.includes(key.toLowerCase())) score += 3;
  });
  if (selectedPoiNames.includes(poi.title)) score += 9;
  if (/购物|mall|逛街/.test(text) && poi.category === 'shopping') score += 4;
  if (/咖啡|饮品|奶茶/.test(text) && (poi.category === 'drink' || poi.category === 'shopping')) score += 4;
  if (/江|日落|散步|夜景/.test(text) && ['徐汇滨江', '武康路', '上海中心大厦'].includes(poi.title)) score += 5;
  if (/历史|老洋房|人文/.test(text) && poi.title === '武康路') score += 5;
  if (/拍照|打卡/.test(text) && ['上海中心大厦', '巨鹿路'].includes(poi.title)) score += 4;
  return score;
}

function buildRoutePlan(query: PendingQuery, adjustmentText: string) {
  const profileTags = parseMaybeJson<any>(localStorage.getItem('cw_profile_tags'), {});
  const profileBasic = parseMaybeJson<any>(localStorage.getItem('cw_profile_basic'), {});
  const selectedPoiNames = (query.pois || []).map((item) => item.name);
  const profileText = JSON.stringify(profileTags || {}) + JSON.stringify(profileBasic || {});
  const text = [query.text || '', adjustmentText || '', selectedPoiNames.join(' '), profileText].join(' ').trim();
  const count = estimateStopCount(text, profileText);
  const startMinutes = estimateStartMinutes(text);
  const scored = [...catalog]
    .map((poi) => ({ poi, score: scorePoi(poi, text, selectedPoiNames) }))
    .sort((a, b) => b.score - a.score);

  const picked: CatalogPoi[] = [];
  selectedPoiNames.forEach((name) => {
    const found = catalog.find((item) => item.title === name);
    if (found && !picked.some((item) => item.id === found.id)) picked.push(found);
  });
  scored.forEach(({ poi }) => {
    if (picked.length >= count) return;
    if (!picked.some((item) => item.id === poi.id)) picked.push(poi);
  });

  const routeStops: RouteStop[] = [];
  let cursor = startMinutes;
  picked.slice(0, count).forEach((poi, index) => {
    let transitMode: TravelMode | undefined;
    let transitMin: number | undefined;
    let transitText: string | undefined;
    if (index > 0) {
      transitMode = index % 3 === 0 ? 'metro' : index % 2 === 0 ? 'walk' : 'taxi';
      transitMin = transitMode === 'walk' ? 16 + index * 2 : transitMode === 'metro' ? 24 + index * 3 : 14 + index * 2;
      transitText = `${travelModeLabel[transitMode]} · ${transitMin}分钟`;
      cursor += transitMin;
    }
    const arriveAt = minutesToTime(cursor);
    const departAt = minutesToTime(cursor + poi.stayMin);
    routeStops.push({
      ...poi,
      order: index + 1,
      arriveAt,
      departAt,
      transitMode,
      transitMin,
      transitText,
      reason:
        index === 0
          ? '作为起点更容易进入状态，节奏不会太赶。'
          : index === picked.length - 1
            ? '适合放在收尾段，体验完整，结束后也方便返程。'
            : '放在这里能把周边动线串起来，少走回头路。'
    });
    cursor += poi.stayMin;
  });

  const totalTransit = routeStops.reduce((sum, stop) => sum + (stop.transitMin || 0), 0);
  const totalStay = routeStops.reduce((sum, stop) => sum + stop.stayMin, 0);
  const totalMinutes = totalTransit + totalStay;
  const totalDistance = `${(1.4 + routeStops.length * 1.18).toFixed(1)}km`;
  const theme = /江|日落|散步/.test(text)
    ? '江畔日落'
    : /购物|逛街/.test(text)
      ? '城市逛吃'
      : /老洋房|人文/.test(text)
        ? '人文漫游'
        : '城市漫游';
  const cityShort = (query.city || '上海市').replace(/市$/, '');
  const title = `${cityShort}${/咖啡|饮品|文艺/.test(text) ? '文艺咖啡' : theme}City Walk`;
  const dayTitle = /咖啡|饮品|文艺/.test(text)
    ? '永康咖啡·衡复文艺漫步'
    : /江|日落|散步/.test(text)
      ? '江畔日落·慢行呼吸线'
      : /购物|逛街/.test(text)
        ? '安福潮流·灵感漫游线'
        : /老洋房|人文/.test(text)
          ? '武康人文·街巷慢游线'
          : '衡复灵感·城市漫游线';
  const daysText = /一天|全天|整天/.test(text) ? '1天' : '半天';
  const subtitle = `${routeStops[0]?.title || '起点'} → ${routeStops[routeStops.length - 1]?.title || '终点'}`;
  const summary =
    query.source === 'explore'
      ? '根据你在探索页选中的区域与 POI，AI 已自动拼接为一条更顺路的可玩路线。'
      : '根据你的输入、画像和偏好，AI 已把景点、节奏和转场串成一条更顺路的推荐路线。';

  return {
    title,
    dayTitle,
    daysText,
    subtitle,
    summary,
    startTime: minutesToTime(startMinutes),
    totalDurationText: formatDuration(totalMinutes),
    totalDistanceText: totalDistance,
    stops: routeStops
  };
}

function getCurrentQuery(): PendingQuery {
  const raw = sessionStorage.getItem('cw_pending_query');
  if (!raw) return { text: '帮我安排一条上海徐汇半日路线', source: 'home', city: '上海市', region: '衡复/徐汇' };
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') return { text: parsed, source: 'home', city: '上海市', region: '衡复/徐汇' };
    return {
      city: '上海市',
      region: '衡复/徐汇',
      source: 'home',
      ...parsed
    };
  } catch {
    return { text: raw, source: 'home', city: '上海市', region: '衡复/徐汇' };
  }
}

function PlanningSkeleton() {
  return (
    <div className="relative h-full animate-pulse">
      <div className="absolute inset-x-0 top-0 h-[44%] bg-[#eaf2ff]" />
      <div className="absolute top-[35%] inset-x-0 text-center z-10">
        <div className="text-[14px] font-semibold text-[#1a1a2e]">AI 正在为你规划路线</div>
        <div className="text-[12px] text-[#8e8e93] mt-1">多个 Agent 正在讨论最佳方案…</div>
        <div className="mt-3 flex justify-center">
          <div className="w-5 h-5 border-2 border-[rgba(91,158,255,0.3)] border-t-[#5b9eff] rounded-full animate-spin" />
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 top-[40%] rounded-t-[34px] bg-white/[0.92] backdrop-blur-xl border-t border-[rgba(140,180,240,0.3)] px-5 pb-28 pt-4 shadow-[0_-18px_48px_rgba(30,95,216,0.15)]">
        <div className="mx-auto h-1 w-10 rounded-full bg-[rgba(140,180,240,0.3)]" />
        <div className="mt-4 h-7 w-2/3 rounded-full bg-[rgba(140,180,240,0.3)]" />
        <div className="mt-3 h-4 w-5/6 rounded-full bg-[rgba(140,180,240,0.3)]" />
        <div className="mt-5 grid grid-cols-3 gap-2">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-16 rounded-[20px] bg-[rgba(140,180,240,0.3)]" />
          ))}
        </div>
        <div className="mt-6 space-y-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="rounded-[24px] bg-[rgba(232,242,255,0.5)] p-4">
              <div className="flex gap-3">
                <div className="w-12 space-y-2">
                  <div className="h-4 rounded-full bg-[rgba(140,180,240,0.3)]" />
                  <div className="h-3 rounded-full bg-[rgba(140,180,240,0.3)]" />
                </div>
                <div className="h-16 w-16 rounded-[18px] bg-[rgba(140,180,240,0.3)]" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 w-2/5 rounded-full bg-[rgba(140,180,240,0.3)]" />
                  <div className="h-3 w-5/6 rounded-full bg-[rgba(140,180,240,0.3)]" />
                  <div className="h-3 w-2/3 rounded-full bg-[rgba(140,180,240,0.3)]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const RouteMap = React.memo(function RouteMap({
  stops,
  activeStopId,
  onStopClick,
}: {
  stops: RouteStop[];
  activeStopId: string | null;
  onStopClick: (id: string) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = () => {
      const el = mapRef.current;
      if (!el || el.offsetWidth === 0 || mapInstance.current || !(window as any).AMap) return false;
      const AMap = (window as any).AMap;
      const validStops = stops.filter(s => s.lng && s.lat);
      const center = validStops.length > 0
        ? [validStops[0].lng!, validStops[0].lat!]
        : [121.4365, 31.2084];

      const map = new AMap.Map(el, {
        zoom: 14,
        center,
        mapStyle: 'amap://styles/light',
        resizeEnable: true,
        touchZoom: true,
        dragEnable: true,
      });
      mapInstance.current = map;
      return true;
    };

    if (!initMap()) {
      const iv = setInterval(() => { if (initMap()) clearInterval(iv); }, 200);
      return () => clearInterval(iv);
    }

    const map = mapInstance.current!;

    // 编号 markers
    validStops.forEach((stop, i) => {
      const active = stop.id === activeStopId;
      const marker = new AMap.Marker({
        position: [stop.lng!, stop.lat!],
        offset: new AMap.Pixel(-16, -16),
        content: `<div style="display:flex;flex-direction:column;align-items:center;">
          <div style="width:32px;height:32px;border-radius:50%;background:${active ? 'linear-gradient(135deg,#1e5fd8,#5b9eff)' : '#5b9eff'};border:3px solid white;color:white;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;box-shadow:0 4px 12px rgba(30,95,216,0.3);transform:scale(${active ? 1.15 : 1});transition:all 0.2s;">${i + 1}</div>
          <div style="margin-top:2px;padding:1px 5px;border-radius:6px;background:${active ? '#1e5fd8' : 'white'};color:${active ? 'white' : '#1a1a2e'};font-size:10px;font-weight:600;box-shadow:0 2px 4px rgba(0,0,0,0.1);white-space:nowrap;">${stop.title.slice(0, 5)}</div>
        </div>`,
      });
      marker.on('click', () => onStopClick(stop.id));
      map.add(marker);
    });

    // 路线折线
    if (validStops.length > 1) {
      new AMap.Polyline({
        path: validStops.map(s => [s.lng!, s.lat!]),
        strokeColor: '#5b9eff',
        strokeWeight: 4,
        strokeOpacity: 0.8,
        lineJoin: 'round',
        lineCap: 'round',
        strokeStyle: 'solid',
      }).setMap(map);
    }

    if (validStops.length > 0) {
      map.setFitView(null, false, [60, 80, 200, 60]);
    }

    return () => { map.destroy(); mapInstance.current = null; };
  }, [stops, activeStopId]);

  return <div ref={mapRef} className="h-full w-full" />;
});


class PlanErrorBoundary extends React.Component<{children: React.ReactNode}, {error: string | null}> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: any) { return { error: e?.message || String(e) }; }
  render() {
    if (this.state.error) return (
      <div style={{padding:'40px',textAlign:'center',color:'#d00'}}>
        <h3>路线页渲染出错</h3>
        <pre style={{fontSize:'12px',whiteSpace:'pre-wrap'}}>{this.state.error}</pre>
      </div>
    );
    return this.props.children;
  }
}

function RoutePlanAppInner() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{ startY: number; startTop: number; moved: boolean } | null>(null);
  const drawerTopRef = useRef(0);
  const [plan, setPlan] = useState<RoutePlan | null>(null);
  const [allPlans, setAllPlans] = useState<RoutePlan[]>([]);
  const [activePlanIdx, setActivePlanIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [adjustInput, setAdjustInput] = useState('');
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
  const [replaceMode, setReplaceMode] = useState<'replace' | 'add'>('replace');
  const [shareOpen, setShareOpen] = useState(false);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [toastText, setToastText] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [currentQuery, setCurrentQuery] = useState<PendingQuery>(getCurrentQuery());
  const [containerHeight, setContainerHeight] = useState(844);
  const [drawerTop, setDrawerTop] = useState(420);
  const suppressTapRef = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const [detailStop, setDetailStop] = useState<RouteStop | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [realPois, setRealPois] = useState<any[]>([]);

  const cityOptions = [
    { name: '上海市', weather: '多云 24° - 29°' },
    { name: '深圳市', weather: '雷暴 28° - 34°' },
    { name: '广州市', weather: '多云 27° - 33°' },
    { name: '北京市', weather: '晴 22° - 31°' },
  ];
  const [cityName, setCityName] = useState(getCurrentQuery().city || '上海市');
  const [showCityPanel, setShowCityPanel] = useState(false);

  const expandedTop = 48;
  const collapsedTop = Math.max(containerHeight * 0.58, 420);

  useEffect(() => {
    fetch('/data/real_pois.json')
      .then(r => r.json())
      .then(data => {
        if (data?.pois) setRealPois(data.pois);
      })
      .catch(() => {});
  }, []);

  const refreshPlan = async (query: PendingQuery, adjustment = '') => {
    setLoading(true);
    setEditMode(false);
    setSelectedStopId(null);
    setCurrentQuery(query);

    try {
      let data: any;
      const matchCase = _demoCases.find(c => {
        const q = (query.text || '').toLowerCase();
        const t = (c.title || '').toLowerCase();
        return q.length >= 3 && t.length >= 3 && (q.includes(t.slice(0, 3)) || t.includes(q.slice(0, 3)));
      });

      if (matchCase && !adjustment) {
        data = { plans: [matchCase], fallback: false };
      } else {
        const res = await fetch('/api/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: [query.text || '', adjustment].filter(Boolean).join(' '),
            city: query.city || '上海',
            pois: query.pois,
            profile: parseMaybeJson(localStorage.getItem('cw_profile_tags'), {}),
            personas: query.personas || [],
          }),
        });

        if (!res.ok) throw new Error('api failed');
        data = await res.json();
      }

      // 将 API 返回的 stops 映射为完整的 RouteStop
      const poiMap = new Map<string, any>();
      realPois.forEach(p => poiMap.set(p.poi_id, p));
      // 也将旧的 catalog POI 加入
      catalog.forEach(p => poiMap.set(p.id, p));

      const palettes = [
        { top: '#89CFF0', bottom: '#4E87B7', accent: '#B9D98D', accent2: '#E7C97F' },
        { top: '#D9C3A4', bottom: '#A16207', accent: '#FDE68A', accent2: '#A3E635' },
        { top: '#7D8D9F', bottom: '#334155', accent: '#D8B4FE', accent2: '#C084FC' },
        { top: '#1E3A8A', bottom: '#0F172A', accent: '#F5D061', accent2: '#F59E0B' },
        { top: '#B6E0FE', bottom: '#7DD3FC', accent: '#93C5FD', accent2: '#FDE68A' },
        { top: '#A7F3D0', bottom: '#059669', accent: '#FDE68A', accent2: '#99F6E4' },
      ];

      const plansData = data.plans || (data.plan ? [data.plan] : []);

      const allRoutePlans: RoutePlan[] = plansData.map((planData: any, planIdx: number) => {
        const apiStops = planData.stops || [];
        let cursor = estimateStartMinutes(query.text || '');

        const routeStops: RouteStop[] = apiStops.map((s: any, i: number) => {
          const poi = poiMap.get(s.poi_id);
          const stayMin = s.stayMin || 60;
          const transitMin = i > 0 ? (s.transitMin || 15) : 0;
          if (i > 0) cursor += transitMin;
          const arriveAt = minutesToTime(cursor);
          cursor += stayMin;
          const departAt = minutesToTime(cursor);

          // 映射分类
          let catId: CategoryId = 'sight';
          if (poi) {
            if (poi.category) catId = poi.category;
            else if (poi.type === 'food' || poi.categories?.some((c: string) => /餐|面|菜|食/.test(c))) catId = 'food';
            else if (poi.type === 'rest' || poi.categories?.some((c: string) => /咖啡|茶|饮/.test(c))) catId = 'drink';
          }

          return {
            id: s.poi_id,
            title: s.name || poi?.name || poi?.title || s.poi_id,
            category: catId,
            area: s.regions?.[0] || poi?.regions?.[0] || poi?.area || '',
            desc: s.reviews?.[0]?.text?.slice(0, 60) || poi?.reviews?.[0]?.text?.slice(0, 60) || poi?.desc || s.branch_name || '',
            vibe: s.branch_name || poi?.branch_name || '',
            image: (s.dp_image ? decodeURIComponent(s.dp_image) : '') || (poi?.dp_image ? decodeURIComponent(poi.dp_image) : '') || scenicPhoto((s.name || poi?.name || '').slice(0, 6), palettes[i % palettes.length]),
            x: 0, y: 0,
            stayMin,
            keywords: s.categories || poi?.categories || poi?.keywords || [],
            lng: s.longitude || poi?.longitude || poi?.lng,
            lat: s.latitude || poi?.latitude || poi?.lat,
            order: i + 1,
            arriveAt,
            departAt,
            transitMode: i > 0 ? (s.transitMode || 'walk') as TravelMode : undefined,
            transitMin: i > 0 ? transitMin : undefined,
            transitText: i > 0 ? `${travelModeLabel[(s.transitMode || 'walk') as TravelMode]} · ${transitMin}分钟${s.distanceKm ? ` · ${s.distanceKm}km` : ''}` : undefined,
            reason: s.reason || '根据你的偏好推荐',
            avg_rating: s.avg_rating || poi?.avg_rating,
            review_count: s.review_count || poi?.review_count,
            avg_price: s.avg_price || poi?.avg_price,
            business_hours: s.business_hours || poi?.business_hours,
            reviews: s.reviews || poi?.reviews || [],
            dp_url: s.dp_url || poi?.dp_url || '',
          };
        });

        const totalTransit = routeStops.reduce((sum, s) => sum + (s.transitMin || 0), 0);
        const totalStay = routeStops.reduce((sum, s) => sum + s.stayMin, 0);

        return {
          title: planData.title || '城市漫游路线',
          dayTitle: planData.dayTitle || '推荐路线',
          daysText: '半天',
          subtitle: routeStops.length > 0 ? `${routeStops[0].title} → ${routeStops[routeStops.length - 1].title}` : '',
          summary: planData.summary || 'AI 为你规划的路线',
          startTime: routeStops[0]?.arriveAt || '10:30',
          totalDurationText: formatDuration(totalTransit + totalStay),
          totalDistanceText: planData.totalDistanceKm
            ? `${planData.totalDistanceKm}km`
            : `${(1.4 + routeStops.length * 1.18).toFixed(1)}km`,
          stops: routeStops,
          personas: planData.personas || [],
          stance: planData.stance || '',
        };
      });

      setAllPlans(allRoutePlans);
      if (data.fallback) {
        showToastMessage('AI 暂时繁忙，已用默认排列');
      }
      setActivePlanIdx(0);
      setPlan(allRoutePlans[0] || null);
      setSelectedStopId(allRoutePlans[0]?.stops[0]?.id || null);
    } catch (e) {
      // Fallback: 使用本地 buildRoutePlan
      const nextPlan = buildRoutePlan(query, adjustment);
      setPlan(nextPlan);
      setSelectedStopId(nextPlan.stops[0]?.id || null);
      showToastMessage('AI 暂时繁忙，已用本地算法生成路线');
    }

    setLoading(false);
  };

  useEffect(() => {
    const boot = () => {
      if (window.location.hash === '#plan') refreshPlan(getCurrentQuery());
    };
    boot();
    const onHashChange = () => {
      if (window.location.hash === '#plan') refreshPlan(getCurrentQuery());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

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
    // loading 时先保持展开态，加载完成后默认收起（与探索页一致）
    const nextExpanded = !!loading;
    setExpanded(nextExpanded);
    const nextTop = nextExpanded ? expandedTop : collapsedTop;
    drawerTopRef.current = nextTop;
    setDrawerTop(nextTop);
  }, [collapsedTop, loading]);

  useEffect(() => {
    drawerTopRef.current = drawerTop;
  }, [drawerTop]);

  useEffect(() => {
    setDrawerTop(expanded ? expandedTop : collapsedTop);
  }, [collapsedTop, expanded]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToastMessage = (text: string) => {
    setToastText(text);
    setShowToast(true);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setShowToast(false), 1600);
  };

  const orderedStops = plan?.stops || [];
  const candidatePois = useMemo(() => {
    const usedIds = new Set(orderedStops.map((stop) => stop.id));
    const fromCatalog = catalog.filter((poi) => !usedIds.has(poi.id) || replaceMode === 'replace');
    const fromReal = realPois
      .filter((p: any) => !usedIds.has(p.poi_id) || replaceMode === 'replace')
      .map((p: any) => ({
        id: p.poi_id,
        title: p.name,
        category: (p.type === 'food' ? 'food' : p.type === 'rest' ? 'drink' : 'sight') as CategoryId,
        area: p.regions?.[0] || '',
        desc: p.reviews?.[0]?.text?.slice(0, 50) || p.branch_name || '',
        vibe: p.branch_name || '',
        image: p.dp_image ? decodeURIComponent(p.dp_image) : scenicPhoto(p.name.slice(0,6), {top:'#89CFF0',bottom:'#4E87B7',accent:'#B9D98D',accent2:'#E7C97F'}),
        x: 0, y: 0, stayMin: 60,
        keywords: p.categories || [],
      }));
    return [...fromReal, ...fromCatalog].filter((v, i, a) => a.findIndex(x => x.id === v.id) === i);
  }, [orderedStops, replaceMode, realPois]);

  const updateStops = (nextStops: RouteStop[]) => {
    if (!plan) return;
    const rebuilt = buildRoutePlan(
      {
        ...currentQuery,
        pois: nextStops.map((stop) => ({ name: stop.title }))
      },
      adjustInput
    );
    rebuilt.stops = nextStops.map((stop, index) => {
      const prev = nextStops[index - 1];
      const transitMode: TravelMode | undefined = index === 0 ? undefined : index % 3 === 0 ? 'metro' : index % 2 === 0 ? 'walk' : 'taxi';
      const transitMin = index === 0 ? undefined : transitMode === 'walk' ? 15 + index * 2 : transitMode === 'metro' ? 24 + index * 3 : 12 + index * 2;
      return {
        ...stop,
        order: index + 1,
        transitMode,
        transitMin,
        transitText: index === 0 || !transitMode || !transitMin ? undefined : `${travelModeLabel[transitMode]} · ${transitMin}分钟`,
        reason:
          index === 0
            ? '作为起点更容易进入状态，节奏不会太赶。'
            : index === nextStops.length - 1
              ? '适合放在收尾段，体验完整，结束后也方便返程。'
              : '放在这里能把周边动线串起来，少走回头路。',
        arriveAt: prev ? prev.departAt : rebuilt.startTime,
        departAt: stop.departAt
      };
    });

    let cursor = estimateStartMinutes((currentQuery.text || '') + adjustInput);
    rebuilt.stops = rebuilt.stops.map((stop, index) => {
      if (index > 0) cursor += stop.transitMin || 0;
      const arriveAt = minutesToTime(cursor);
      cursor += stop.stayMin;
      const departAt = minutesToTime(cursor);
      return { ...stop, arriveAt, departAt };
    });

    const totalTransit = rebuilt.stops.reduce((sum, stop) => sum + (stop.transitMin || 0), 0);
    const totalStay = rebuilt.stops.reduce((sum, stop) => sum + stop.stayMin, 0);
    rebuilt.totalDurationText = formatDuration(totalTransit + totalStay);
    rebuilt.totalDistanceText = `${(1.3 + rebuilt.stops.length * 1.12).toFixed(1)}km`;
    rebuilt.subtitle = `${rebuilt.stops[0]?.title || '起点'} → ${rebuilt.stops[rebuilt.stops.length - 1]?.title || '终点'}`;
    setPlan(rebuilt);
    if (rebuilt.stops.length && !rebuilt.stops.some((stop) => stop.id === selectedStopId)) {
      setSelectedStopId(rebuilt.stops[0].id);
    }
  };

  const moveStop = (from: number, to: number) => {
    if (!plan || from === to) return;
    const list = [...orderedStops];
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    updateStops(list);
    showToastMessage('路线顺序已更新');
  };

  const handleApplyCandidate = (candidate: CatalogPoi) => {
    if (!plan || replaceIndex === null) return;
    const nextStops = [...orderedStops];
    const baseStop = nextStops[Math.min(replaceIndex, nextStops.length - 1)];
    const nextStop: RouteStop = {
      ...candidate,
      order: baseStop?.order || nextStops.length + 1,
      arriveAt: baseStop?.arriveAt || plan.startTime,
      departAt: baseStop?.departAt || plan.startTime,
      reason: '根据你的编辑动作重新补位，尽量保持整体动线顺路。',
      transitMode: baseStop?.transitMode,
      transitMin: baseStop?.transitMin,
      transitText: baseStop?.transitText
    };
    if (replaceMode === 'replace') {
      nextStops.splice(replaceIndex, 1, nextStop);
      showToastMessage('已替换该站点');
    } else {
      nextStops.splice(replaceIndex + 1, 0, nextStop);
      showToastMessage('已插入新的 POI');
    }
    updateStops(nextStops);
    setReplaceIndex(null);
  };

  const submitAdjust = () => {
    const text = adjustInput.trim();
    if (!text) return;
    const nextQuery = {
      ...currentQuery,
      text: `${currentQuery.text || ''} ${text}`.trim(),
      source: 'adjust' as const
    };
    sessionStorage.setItem('cw_pending_query', JSON.stringify(nextQuery));
    refreshPlan(nextQuery, text);
    setAdjustInput('');
  };

  const snapDrawer = (nextExpanded: boolean) => {
    setExpanded(nextExpanded);
    const nextTop = nextExpanded ? expandedTop : collapsedTop;
    drawerTopRef.current = nextTop;
    setDrawerTop(nextTop);
  };

  const onDrawerPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragState.current = {
      startY: event.clientY,
      startTop: drawerTopRef.current,
      moved: false
    };

    const onMove = (moveEvent: PointerEvent) => {
      if (!dragState.current) return;
      const delta = moveEvent.clientY - dragState.current.startY;
      if (Math.abs(delta) > 5) dragState.current.moved = true;
      const nextTop = clamp(dragState.current.startTop + delta, expandedTop, collapsedTop);
      drawerTopRef.current = nextTop;
      setDrawerTop(nextTop);
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      const moved = !!dragState.current?.moved;
      suppressTapRef.current = moved;
      window.setTimeout(() => {
        suppressTapRef.current = false;
      }, 50);
      const midpoint = (collapsedTop + expandedTop) / 2;
      snapDrawer(drawerTopRef.current < midpoint);
      dragState.current = null;
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const getTransitMeta = (stop: RouteStop, index: number) => {
    const minutes = stop.transitMin || 0;
    const distance = stop.transitMode === 'metro'
      ? `${(1.8 + index * 0.3).toFixed(1)}公里`
      : stop.transitMode === 'taxi'
        ? `${(2.6 + index * 0.4).toFixed(1)}公里`
        : `${(0.1 + index * 0.2).toFixed(1)}公里`;
    return `${distance} · ${minutes}分钟`;
  };

  const categoryLabelMap: Record<CategoryId, string> = {
    sight: '景点',
    food: '吃喝',
    drink: '喝咖',
    shopping: '购物',
    stay: '住宿'
  };
  const categoryLabelColorMap: Record<CategoryId, string> = {
    sight: '#1e5fd8',
    food: '#e86b30',
    drink: '#7C7AF3',
    shopping: '#D25FA6',
    stay: '#7B6CF1'
  };

  return (
    <div
      ref={containerRef}
      className="relative mx-auto h-screen max-w-[430px] overflow-hidden bg-[#f5f9ff] font-sans text-[#1a1a2e]"
      style={{ height: '100vh' }}
      onClick={() => {}}
    >
      <div className="absolute inset-0">
        {!loading && plan ? (
            <RouteMap stops={orderedStops} activeStopId={selectedStopId} onStopClick={setSelectedStopId} />
        ) : (
          <div className="h-full w-full bg-[#eaf2ff]" />
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-[#f5f9ff]/80 via-[#f5f9ff]/30 to-transparent" />

      {loading ? <PlanningSkeleton /> : null}

      <div className="absolute inset-x-0 top-0 z-20">
        <div className="px-6 pt-4">
          <div className="flex items-start justify-between">
            <div className="relative">
              <button type="button" className="flex items-center gap-1 text-left" onClick={() => setShowCityPanel(p => !p)}>
                <span className="text-[18px] font-bold tracking-[0.01em] text-[#1a1a2e]">{cityName}</span>
                <ChevronDown className="mt-0.5 h-4 w-4 text-[#8e8e93]" strokeWidth={2.3} />
              </button>
              <div className="mt-0.5 text-[12px] font-medium text-[#8e8e93]">{cityOptions.find(c => c.name === cityName)?.weather || ''}</div>
              {showCityPanel && (
                <div className="absolute left-0 top-12 w-40 rounded-[18px] bg-white/95 p-2 shadow-[0_12px_32px_rgba(30,95,216,0.15)] backdrop-blur-xl z-50">
                  {cityOptions.map(item => (
                    <button key={item.name} type="button"
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-[13px] ${item.name === cityName ? 'bg-gradient-to-r from-[#1e5fd8] to-[#5b9eff] text-white' : 'text-[#1a1a2e] hover:bg-[rgba(91,158,255,0.08)]'}`}
                      onClick={() => {
                        setCityName(item.name);
                        setShowCityPanel(false);
                        const short = item.name.replace(/市$/, '');
                        fetch(`/api/search?city=${encodeURIComponent(short)}&keywords=景点,美食,咖啡`)
                          .then(r => r.json())
                          .then(data => { if (data?.pois?.length) setRealPois(data.pois); })
                          .catch(() => {});
                        const regionMap: Record<string, string> = { '上海市': '衡复/徐汇', '深圳市': '南山区', '广州市': '天河/荔湾', '北京市': '东城/西城' };
                        const nextQuery = { ...currentQuery, city: item.name, region: regionMap[item.name] || '' };
                        sessionStorage.setItem('cw_pending_query', JSON.stringify(nextQuery));
                        refreshPlan(nextQuery, '');
                      }}>
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.9] text-[#1a1a2e] shadow-md backdrop-blur"
                onClick={(event) => {
                  event.stopPropagation();
                  window.location.hash = 'route';
                }}
                title="返回探索"
              >
                <Route className="h-5 w-5" strokeWidth={2.4} />
              </button>
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.9] text-[#1a1a2e] shadow-md backdrop-blur"
                onClick={(event) => {
                  event.stopPropagation();
                  setShareOpen(true);
                }}
                title="分享"
              >
                <Share2 className="h-5 w-5" strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        className="absolute inset-x-0 z-30 rounded-t-[28px] bg-white/[0.92] backdrop-blur-xl border-t border-[rgba(140,180,240,0.3)] shadow-[0_12px_32px_rgba(30,95,216,0.15)] transition-[top] duration-300 ease-out"
        style={{ top: drawerTop, bottom: 0, willChange: 'transform' }}
      >
        <div
          className="flex cursor-grab flex-col px-6 pb-4 pt-3 active:cursor-grabbing"
          style={{ touchAction: 'none' }}
          onPointerDown={onDrawerPointerDown}
          onClick={() => {
            if (!expanded && !suppressTapRef.current && !loading) snapDrawer(true);
          }}
        >
          <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-[rgba(140,180,240,0.4)]" />
          {!loading && plan ? (
            <>
              {allPlans.length > 1 && (
                <div className="mb-4">
                  <div className="text-[11px] font-semibold text-[#8e8e93] mb-2 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-[#5b9eff]" /> 多 Agent 为你生成了 {allPlans.length} 条方案
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {allPlans.map((p, i) => {
                      const active = i === activePlanIdx;
                      const personaMap: Record<string, { emoji: string; label: string }> = {
                        photographer: { emoji: '📷', label: '拍照党' },
                        foodie: { emoji: '🍜', label: '美食家' },
                        value: { emoji: '💰', label: '性价比' },
                        literary: { emoji: '📚', label: '文青' },
                        local: { emoji: '🏠', label: '老饕' },
                        parent: { emoji: '👶', label: '带娃' },
                      };
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setActivePlanIdx(i);
                            setPlan(p);
                            setSelectedStopId(p.stops[0]?.id || null);
                            setEditMode(false);
                          }}
                          className={`shrink-0 w-[65%] rounded-[16px] p-3 text-left transition-all ${
                            active
                              ? 'bg-gradient-to-br from-[#1e5fd8] to-[#5b9eff] text-white shadow-[0_8px_24px_rgba(30,95,216,0.3)]'
                              : 'bg-white/80 text-[#1a1a2e] border border-[rgba(140,180,240,0.3)]'
                          }`}
                        >
                          <div className="text-[13px] font-bold truncate">{p.dayTitle || `方案 ${i + 1}`}</div>
                          {p.stance && <div className={`text-[11px] mt-1 leading-4 line-clamp-2 ${active ? 'text-white/80' : 'text-[#8e8e93]'}`}>{p.stance}</div>}
                          <div className="flex items-center gap-1 mt-2 flex-wrap">
                            {(p.personas || []).map((pid: string) => {
                              const pm = personaMap[pid];
                              return pm ? (
                                <span key={pid} className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-[rgba(91,158,255,0.1)] text-[#5b9eff]'}`}>
                                  {pm.emoji} {pm.label}
                                </span>
                              ) : null;
                            })}
                          </div>
                          {(p.personas?.length ?? 0) > 0 && (
                            <div className="flex justify-center mt-1.5">
                              <RadarChart scores={calcRadarScores(p.personas || [])} size={56} />
                            </div>
                          )}
                          <div className={`text-[10px] mt-1.5 ${active ? 'text-white/60' : 'text-[#8e8e93]'}`}>
                            {p.stops.length}站 · {p.totalDurationText}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="text-[18px] font-bold tracking-[0.01em] text-[#1a1a2e]">{plan.dayTitle}</div>
              {plan.stance && (
                <div className="mt-1 text-[12px] text-[#5b9eff] font-medium">{plan.stance}</div>
              )}
              {plan.personas && plan.personas.length > 0 && (
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {plan.personas.map((pid: string) => {
                    const pm: Record<string, string> = {photographer:'📷 拍照党',foodie:'🍜 美食家',value:'💰 性价比',literary:'📚 文青',local:'🏠 老饕',parent:'👶 带娃'};
                    return pm[pid] ? <span key={pid} className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(91,158,255,0.1)] text-[#5b9eff] font-medium">{pm[pid]}</span> : null;
                  })}
                </div>
              )}
              {!expanded ? (
                <p className="mt-2 line-clamp-2 pr-10 text-[13px] leading-6 text-[#8e8e93]">{plan.summary}</p>
              ) : (
                <>
                  <div className="mt-3 flex flex-wrap gap-2 text-[12px] font-semibold">
                    <div className="rounded-full bg-[rgba(232,242,255,0.65)] px-3 py-1.5">起始 {plan.startTime}</div>
                    <div className="rounded-full bg-[rgba(232,242,255,0.65)] px-3 py-1.5">{plan.totalDurationText}</div>
                    <div className="rounded-full bg-[rgba(232,242,255,0.65)] px-3 py-1.5">{plan.totalDistanceText}</div>
                  </div>
                </>
              )}
            </>
          ) : null}
        </div>

        {!loading && plan ? (
          <div
            className="overflow-y-auto px-6 pb-28"
            style={{ height: expanded ? `calc(100% - 154px)` : `calc(100% - 92px)` }}
          >
            {expanded ? (
              <div className="space-y-4 pt-2">
                {orderedStops.map((stop, index) => {
                  const isSelected = selectedStopId === stop.id;
                  return (
                    <div key={`${stop.id}-${index}`}>
                      {index > 0 ? (
                        <div className="mb-2 ml-3 flex items-center gap-1.5 text-[11px] font-medium text-[#8e8e93]">
                          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[rgba(91,158,255,0.08)]">
                            <Footprints className="h-2.5 w-2.5" strokeWidth={2} />
                          </div>
                          <div>{getTransitMeta(stop, index)}</div>
                          <ChevronRight className="h-3 w-3 text-[#8e8e93]/50" strokeWidth={2} />
                        </div>
                      ) : null}

                      <div
                        className={`rounded-[24px] ${
                          isSelected ? 'bg-white/[0.92] shadow-[0_12px_28px_rgba(30,95,216,0.12)] border border-[rgba(140,180,240,0.3)]' : 'bg-white/[0.75]'
                        }`}
                      >
                        <div
                          className="w-full rounded-[16px] bg-white p-3"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedStopId(stop.id);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="shrink-0 w-6 h-6 rounded-full bg-[#5b9eff] text-white text-[11px] font-bold flex items-center justify-center">{index + 1}</span>
                              <span className="text-[14px] font-bold truncate">{stop.title}</span>
                              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded" style={{ color: categoryLabelColorMap[stop.category], background: categoryLabelColorMap[stop.category] + '18' }}>{categoryLabelMap[stop.category]}</span>
                            </div>
                            <span className="shrink-0 text-[12px] font-semibold text-[#1a1a2e]">{stop.arriveAt}-{stop.departAt}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-[#8e8e93]">
                            {stop.avg_rating ? <span className="text-[#f59e0b]">★{stop.avg_rating}</span> : null}
                            {stop.review_count ? <span>{stop.review_count}条评价</span> : null}
                            {stop.avg_price ? <span>人均¥{stop.avg_price}</span> : null}
                            <span className="ml-auto text-[#5b9eff] font-medium" onClick={(e) => { e.stopPropagation(); setDetailStop(stop); }}>详情→</span>
                          </div>
                        </div>
                        {editMode && (
                          <div className="flex items-center gap-2 px-3 pb-3 pt-1">
                            <button type="button" className="flex-1 py-1.5 rounded-xl bg-[rgba(232,242,255,0.65)] text-[12px] font-semibold text-[#5a5a62]"
                              onClick={(e) => { e.stopPropagation(); setReplaceIndex(index); setReplaceMode('replace'); }}>
                              替换
                            </button>
                            <button type="button" className="flex-1 py-1.5 rounded-xl bg-gradient-to-r from-[#1e5fd8] to-[#5b9eff] text-[12px] font-semibold text-white"
                              onClick={(e) => { e.stopPropagation(); setReplaceIndex(index); setReplaceMode('add'); }}>
                              新增
                            </button>
                            <button type="button" className="flex-1 py-1.5 rounded-xl bg-[#FFE8ED] text-[12px] font-semibold text-[#D95A7B]"
                              onClick={(e) => { e.stopPropagation(); updateStops(orderedStops.filter((_, ci) => ci !== index)); showToastMessage('已删除'); }}>
                              删除
                            </button>
                            {index > 0 && (
                              <button type="button" className="w-9 py-1.5 rounded-xl bg-[rgba(232,242,255,0.65)] text-[12px] text-[#5a5a62]"
                                onClick={(e) => { e.stopPropagation(); moveStop(index, index - 1); }}>
                                ↑
                              </button>
                            )}
                            {index < orderedStops.length - 1 && (
                              <button type="button" className="w-9 py-1.5 rounded-xl bg-[rgba(232,242,255,0.65)] text-[12px] text-[#5a5a62]"
                                onClick={(e) => { e.stopPropagation(); moveStop(index, index + 1); }}>
                                ↓
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {!editMode && (
                  <div className="mt-6 pb-4">
                    <div className="text-[13px] font-semibold text-[#1a1a2e] mb-3 flex items-center gap-2">
                      <span className="w-1 h-4 bg-gradient-to-b from-[#1e5fd8] to-[#5b9eff] rounded-sm" />
                      AI 帮你调路线
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {['便宜一点', '时间紧些', '加杯咖啡', '多拍照点', '换个风格'].map(tag => (
                        <button
                          key={tag}
                          type="button"
                          className="px-3 py-1.5 rounded-full text-[12px] font-medium bg-[rgba(232,242,255,0.65)] text-[#5b9eff] border border-[rgba(140,180,240,0.3)] hover:bg-[rgba(91,158,255,0.15)] transition"
                          onClick={() => { setAdjustInput(tag); }}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={adjustInput}
                        onChange={(e) => setAdjustInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) submitAdjust(); }}
                        placeholder="告诉 AI 你想怎么调整..."
                        className="flex-1 min-w-0 px-3 py-2.5 text-[13px] rounded-2xl border border-[rgba(140,180,240,0.35)] bg-white/[0.85] backdrop-blur text-[#1a1a2e] placeholder:text-[#8e8e93] outline-none focus:ring-2 focus:ring-[rgba(91,158,255,0.4)]"
                      />
                      <button
                        type="button"
                        onClick={submitAdjust}
                        disabled={!adjustInput.trim()}
                        className="shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-r from-[#1e5fd8] to-[#5b9eff] text-white flex items-center justify-center disabled:opacity-40 shadow-[0_4px_12px_rgba(30,95,216,0.3)]"
                      >
                        <Sparkles className="h-4 w-4" strokeWidth={2.4} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="pt-2 text-[13px] leading-6 text-black/35">上滑查看路线详情，或点按标题直接展开。</div>
            )}
          </div>
        ) : null}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center pb-[84px]">
        <div
          className={`pointer-events-auto rounded-full bg-[rgba(10,20,40,0.88)] px-4 py-2 text-[12.5px] font-medium text-white shadow-lg transition-all ${
            showToast ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
        >
          {toastText}
        </div>
      </div>

      {!loading && plan && expanded ? (
        <div className="absolute bottom-20 right-4 z-50">
          <button
            type="button"
            className={`flex h-11 items-center justify-center gap-2 rounded-full px-4 shadow-[0_12px_28px_rgba(30,95,216,0.18)] ${
              editMode ? 'bg-gradient-to-r from-[#1e5fd8] to-[#5b9eff] text-white' : 'bg-white/[0.9] text-[#1a1a2e] border border-[rgba(140,180,240,0.3)] backdrop-blur-xl'
            }`}
            onClick={(event) => {
              event.stopPropagation();
              if (!expanded) snapDrawer(true);
              setEditMode((prev) => {
                const next = !prev;
                showToastMessage(next ? '已进入编辑' : '已退出编辑');
                return next;
              });
            }}
          >
            {editMode ? <X className="h-4.5 w-4.5" strokeWidth={2.5} /> : <PenLine className="h-4.5 w-4.5" strokeWidth={2.4} />}
            <span className="text-[14px] font-semibold">{editMode ? '完成' : '编辑'}</span>
          </button>
        </div>
      ) : null}

      {replaceIndex !== null ? (
        <div className="absolute inset-0 z-50 bg-black/24" onClick={() => setReplaceIndex(null)}>
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-[30px] bg-[#f7f8fb] backdrop-blur-xl px-5 pb-8 pt-3 shadow-[0_-20px_60px_rgba(30,95,216,0.15)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto h-1 w-9 rounded-full bg-[rgba(140,180,240,0.4)]" />
            <div className="mt-4 flex items-center justify-between">
              <div>
                <div className="text-[20px] font-bold">{replaceMode === 'replace' ? '替换这一站' : '在此后新增 POI'}</div>
                <div className="mt-1 text-[13px] text-[#8e8e93]">选择后会实时更新上方地图和整条动线。</div>
              </div>
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3F4F6]" onClick={() => setReplaceIndex(null)}>
                <X className="h-4.5 w-4.5" strokeWidth={2.5} />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {candidatePois.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  className="flex w-full items-center gap-4 rounded-[24px] bg-[rgba(232,242,255,0.55)] p-3 text-left"
                  onClick={() => handleApplyCandidate(candidate)}
                >
                  <img src={candidate.image} alt={candidate.title} referrerPolicy="no-referrer" className="h-16 w-16 rounded-[18px] object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[16px] font-bold">{candidate.title}</div>
                    <div className="mt-1 text-[12px] font-medium text-[#5b9eff]">{candidate.vibe}</div>
                    <div className="mt-1 text-[13px] leading-6 text-[#5a5a62]">{candidate.desc}</div>
                  </div>
                  <ChevronRight className="h-4.5 w-4.5 text-black/28" strokeWidth={2.2} />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {detailStop && (
        <div className="absolute inset-0 z-[60] bg-black/28 backdrop-blur-[2px]" onClick={() => setDetailStop(null)}>
          <div
            className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[430px] overflow-hidden rounded-t-[34px] bg-white/[0.95] backdrop-blur-xl shadow-[0_-24px_70px_rgba(30,95,216,0.2)]"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '70vh' }}
          >
            <div className="px-6 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[22px] font-bold tracking-[-0.01em] text-[#1a1a2e]">{detailStop.title}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {detailStop.avg_rating && (
                      <span className="rounded-full bg-[rgba(232,242,255,0.65)] px-3 py-1 text-[12px] font-semibold text-[#5b9eff]">
                        {'★'.repeat(Math.round(detailStop.avg_rating))} {detailStop.avg_rating}
                      </span>
                    )}
                    {detailStop.review_count && (
                      <span className="rounded-full bg-[rgba(232,242,255,0.65)] px-3 py-1 text-[12px] font-semibold text-[#8e8e93]">
                        {detailStop.review_count}条评价
                      </span>
                    )}
                    {detailStop.avg_price && (
                      <span className="rounded-full bg-[rgba(232,242,255,0.65)] px-3 py-1 text-[12px] font-semibold text-[#8e8e93]">
                        人均¥{detailStop.avg_price}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(232,242,255,0.65)] text-[#5a5a62]"
                  onClick={() => setDetailStop(null)}
                >
                  <X className="h-5 w-5" strokeWidth={2.6} />
                </button>
              </div>
            </div>
            <div className="mt-4 overflow-y-auto px-6 pb-8" style={{ maxHeight: 'calc(70vh - 100px)' }}>
              {detailStop.image && (
                <img src={detailStop.image} alt="" referrerPolicy="no-referrer" className="w-full h-[160px] rounded-[22px] object-cover mb-4"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
              <div className="text-[14px] leading-7 text-[#5a5a62] mb-4">{detailStop.desc}</div>
              {detailStop.business_hours && (
                <div className="rounded-[20px] bg-[rgba(232,242,255,0.5)] p-4 mb-4">
                  <div className="text-[14px] font-bold text-[#1a1a2e]">营业时间</div>
                  <div className="mt-1 text-[13px] text-[#5a5a62]">{Array.isArray(detailStop.business_hours) ? detailStop.business_hours.join(', ') : detailStop.business_hours}</div>
                </div>
              )}
              {detailStop.reason && (
                <div className="rounded-[20px] bg-[rgba(91,158,255,0.08)] p-4 mb-4">
                  <div className="text-[13px] text-[#5b9eff] font-medium flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5" /> AI 推荐理由
                  </div>
                  <div className="mt-1 text-[13px] text-[#5a5a62]">{detailStop.reason}</div>
                </div>
              )}
              {(() => {
                const texts = ((detailStop as any).reviews || []).map((r:any) => r.text).join('');
                const pitfalls: string[] = [];
                if (/排队|等位|人多|拥挤/.test(texts)) pitfalls.push('⏰ 高峰时段可能需要排队');
                if (/贵|价格高|性价比低/.test(texts)) pitfalls.push('💰 价格偏高，注意预算');
                if (/难找|不好找|导航/.test(texts)) pitfalls.push('📍 位置较隐蔽，建议提前导航');
                if (/服务差|态度|慢/.test(texts)) pitfalls.push('⚠️ 部分用户反馈服务待改善');
                if (!pitfalls.length) return null;
                return (
                  <div className="rounded-[16px] bg-[#FFF8E1] p-3 mb-4">
                    <div className="text-[12px] font-semibold text-[#B77C00] mb-1.5">⚡ 避坑提醒</div>
                    {pitfalls.map((p, i) => <div key={i} className="text-[11px] text-[#8B6914] leading-5">{p}</div>)}
                  </div>
                );
              })()}
              <div className="rounded-[16px] bg-[rgba(232,242,255,0.5)] p-3 mb-4">
                <div className="text-[12px] font-semibold text-[#1a1a2e] mb-2">🛒 优惠信息</div>
                <div className="flex gap-2">
                  <div className="flex-1 rounded-xl bg-white p-2 text-center">
                    <div className="text-[10px] text-[#8e8e93]">团购券</div>
                    <div className="text-[13px] font-bold text-[#5b9eff]">¥{detailStop.avg_price ? Math.round(detailStop.avg_price * 0.85) : 59}</div>
                    <div className="text-[9px] text-[#8e8e93] line-through">¥{detailStop.avg_price || 69}</div>
                  </div>
                  <div className="flex-1 rounded-xl bg-white p-2 text-center">
                    <div className="text-[10px] text-[#8e8e93]">排队状态</div>
                    <div className="text-[13px] font-bold text-[#34C759]">较空闲</div>
                    <div className="text-[9px] text-[#8e8e93]">约0-5min</div>
                  </div>
                  <div className="flex-1 rounded-xl bg-white p-2 text-center">
                    <div className="text-[10px] text-[#8e8e93]">预约</div>
                    <div className="text-[13px] font-bold text-[#5b9eff]">可订</div>
                    <div className="text-[9px] text-[#8e8e93]">今日有位</div>
                  </div>
                </div>
              </div>
              {detailStop.reviews && detailStop.reviews.length > 0 && (
                <div>
                  <div className="text-[16px] font-bold text-[#1a1a2e] mb-3">用户评论</div>
                  {detailStop.reviews.slice(0, 3).map((r: any, i: number) => (
                    <div key={i} className="rounded-[18px] bg-[rgba(232,242,255,0.5)] p-3.5 mb-2.5">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#1e5fd8] to-[#5b9eff] text-white flex items-center justify-center text-[11px] font-bold">{r.avatar}</div>
                        <span className="text-[12px] font-semibold text-[#1a1a2e]">{r.author}</span>
                        <span className="text-[11px] text-[#8e8e93]">{'★'.repeat(r.rating)}</span>
                      </div>
                      <p className="text-[12px] leading-5 text-[#5a5a62]">{r.text}</p>
                    </div>
                  ))}
                </div>
              )}
              {detailStop.dp_url && (
                <a href={detailStop.dp_url} target="_blank" rel="noreferrer"
                  className="block w-full py-3 rounded-2xl bg-gradient-to-r from-[#1e5fd8] to-[#5b9eff] text-white text-center text-[14px] font-semibold mt-4">
                  在大众点评查看 →
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {shareOpen && plan ? (
        <div className="absolute inset-0 z-[60] bg-black/28 backdrop-blur-[2px]" onClick={() => setShareOpen(false)}>
          <div
            className="absolute inset-x-4 top-16 bottom-12 overflow-y-auto rounded-[30px] bg-white p-5 shadow-[0_25px_70px_rgba(30,95,216,0.2)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[22px] font-bold">路线长图预览</div>
                <div className="mt-1 text-[13px] text-[#8e8e93]">当前先做预览态，后续可继续接导出图片。</div>
              </div>
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3F4F6]" onClick={() => setShareOpen(false)}>
                <X className="h-4.5 w-4.5" strokeWidth={2.5} />
              </button>
            </div>

            <div className="mt-5 rounded-[30px] bg-[rgba(232,242,255,0.55)] p-4">
              <div className="rounded-[26px] bg-white p-4">
                <div className="flex items-center gap-2 text-[12px] font-semibold text-[#5b9eff]">
                  <Sparkles className="h-4 w-4" strokeWidth={2.2} />
                  AI 推荐路线
                </div>
                <div className="mt-3 text-[24px] font-bold leading-8">{plan.title}</div>
                <div className="mt-2 text-[14px] leading-7 text-black/62">{plan.summary}</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <div className="rounded-full bg-[rgba(232,242,255,0.65)] px-3 py-1.5 text-[12px] font-semibold">起始 {plan.startTime}</div>
                  <div className="rounded-full bg-[rgba(232,242,255,0.65)] px-3 py-1.5 text-[12px] font-semibold">{plan.totalDurationText}</div>
                  <div className="rounded-full bg-[rgba(232,242,255,0.65)] px-3 py-1.5 text-[12px] font-semibold">{plan.totalDistanceText}</div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {orderedStops.map((stop, index) => (
                  <div key={`${stop.id}-share-${index}`} className="rounded-[24px] bg-white p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#5b9eff] text-[13px] font-bold text-white">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[16px] font-bold">{stop.title}</div>
                        <div className="mt-1 text-[12px] text-[#8e8e93]">
                          {stop.arriveAt} - {stop.departAt} · {formatDuration(stop.stayMin)}
                        </div>
                        <div className="mt-2 text-[13px] leading-6 text-[#5a5a62]">{stop.desc}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#1e5fd8] to-[#5b9eff] text-white text-[14px] font-semibold shadow-[0_4px_12px_rgba(30,95,216,0.3)] mb-3"
                onClick={() => {
                  showToastMessage('请使用手机截图保存');
                  setTimeout(() => setShareOpen(false), 1200);
                }}
              >
                截图保存并分享
              </button>
              <div className="mt-4 rounded-[24px] bg-white p-4 text-[13px] leading-7 text-black/48">
                截图即可分享给朋友。完整路线已保存，随时可以回来查看。
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RoutePlanApp() {
  return <PlanErrorBoundary><RoutePlanAppInner /></PlanErrorBoundary>;
}

function mount() {
  const rootElement = document.getElementById('routePlanRoot');
  if (!rootElement) return;
  try {
    createRoot(rootElement).render(<RoutePlanApp />);
  } catch (e: any) {
    rootElement.innerHTML = `<div style="padding:40px;text-align:center;color:#d00;">
      <h3>路线页加载失败</h3><pre style="font-size:12px;white-space:pre-wrap;">${e?.message || e}</pre>
    </div>`;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
