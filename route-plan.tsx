import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Footprints,
  PenLine,
  Plus,
  Share2,
  GripVertical,
  LoaderCircle,
  Route,
  Sparkles,
  TrainFront,
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
};

type RouteStop = CatalogPoi & {
  order: number;
  arriveAt: string;
  departAt: string;
  transitMode?: TravelMode;
  transitMin?: number;
  transitText?: string;
  reason: string;
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
    id: 'bay-park',
    title: '深圳湾公园',
    category: 'sight',
    area: '南山区',
    desc: '海风很稳，适合散步和看日落，是把整条路线节奏放慢的最佳开场。',
    vibe: '海边慢走',
    image: scenicPhoto('深圳湾公园', { top: '#89CFF0', bottom: '#4E87B7', accent: '#B9D98D', accent2: '#E7C97F' }),
    x: 74,
    y: 46,
    stayMin: 90,
    keywords: ['海', '日落', '散步', '骑行', '公园', '景点']
  },
  {
    id: 'talent-park',
    title: '深圳人才公园',
    category: 'sight',
    area: '南山区',
    desc: '城市天际线和海湾界面很好看，适合接上散步或拍照的节奏。',
    vibe: '城市海湾',
    image: scenicPhoto('深圳人才公园', { top: '#8DD3C7', bottom: '#4B8E7B', accent: '#C6E48B', accent2: '#9AD0F5' }),
    x: 61,
    y: 56,
    stayMin: 65,
    keywords: ['海', '公园', '拍照', '夜景', '散步']
  },
  {
    id: 'mixc-world',
    title: '深圳万象天地',
    category: 'shopping',
    area: '南山区',
    desc: '街区和商场结合得很舒服，逛街、吃饭、喝咖啡都能无缝衔接。',
    vibe: '逛街吃喝',
    image: scenicPhoto('深圳万象天地', { top: '#7D8D9F', bottom: '#334155', accent: '#D8B4FE', accent2: '#C084FC' }),
    x: 56,
    y: 34,
    stayMin: 105,
    keywords: ['购物', '商场', '逛街', '咖啡', '美食', '室内']
  },
  {
    id: 'window',
    title: '深圳世界之窗',
    category: 'sight',
    area: '南山区',
    desc: '大型主题地标，适合想要一站多拍、内容足够丰富的路线安排。',
    vibe: '经典打卡',
    image: scenicPhoto('深圳世界之窗', { top: '#1E3A8A', bottom: '#0F172A', accent: '#F5D061', accent2: '#F59E0B' }),
    x: 18,
    y: 54,
    stayMin: 110,
    keywords: ['景点', '拍照', '玩', '地标', '经典']
  },
  {
    id: 'nantou',
    title: '南头古城',
    category: 'sight',
    area: '南山区',
    desc: '街巷氛围浓，适合边走边吃边拍，特别适合作为路线中的质感转场。',
    vibe: '古城漫游',
    image: scenicPhoto('南头古城', { top: '#D9C3A4', bottom: '#A16207', accent: '#FDE68A', accent2: '#A3E635' }),
    x: 26,
    y: 35,
    stayMin: 85,
    keywords: ['古城', '历史', '人文', '街巷', '夜逛']
  },
  {
    id: 'sea-world',
    title: '海上世界',
    category: 'food',
    area: '南山区',
    desc: '适合把晚餐、夜景和收尾氛围放在同一站，节奏会很完整。',
    vibe: '夜景收尾',
    image: scenicPhoto('海上世界', { top: '#B6E0FE', bottom: '#7DD3FC', accent: '#93C5FD', accent2: '#FDE68A' }),
    x: 26,
    y: 76,
    stayMin: 95,
    keywords: ['海', '美食', '夜景', '喷泉', '餐厅']
  },
  {
    id: 'happy-harbor',
    title: '欢乐海岸',
    category: 'food',
    area: '南山区',
    desc: '吃饭和散步衔接自然，适合在路线中间安排休息和补能量。',
    vibe: '松弛补给',
    image: scenicPhoto('欢乐海岸', { top: '#A7F3D0', bottom: '#059669', accent: '#FDE68A', accent2: '#99F6E4' }),
    x: 48,
    y: 63,
    stayMin: 80,
    keywords: ['吃饭', '美食', '休息', '亲水', '散步']
  },
  {
    id: 'oct-loft',
    title: '华侨城创意园',
    category: 'drink',
    area: '南山区',
    desc: '如果你想把路线做得更文艺一点，这里很适合放进下午段。',
    vibe: '文艺街区',
    image: scenicPhoto('华侨城创意园', { top: '#FBCFE8', bottom: '#BE185D', accent: '#F9A8D4', accent2: '#FDE68A' }),
    x: 31,
    y: 50,
    stayMin: 70,
    keywords: ['咖啡', '文艺', '拍照', '街区', '展览']
  }
];

const travelModeLabel: Record<TravelMode, string> = {
  walk: '步行',
  metro: '地铁',
  taxi: '打车'
};

const cityOptions = [
  { name: '深圳市', weather: '雷暴 28° - 34°' },
  { name: '广州市', weather: '多云 27° - 33°' },
  { name: '上海市', weather: '小雨 24° - 29°' },
  { name: '北京市', weather: '晴 22° - 31°' }
] as const;

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

function IOSStatusBar() {
  const [time, setTime] = useState('20:45');

  useEffect(() => {
    const sync = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      setTime(`${hh}:${mm}`);
    };
    sync();
    const timer = window.setInterval(sync, 30000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center justify-between px-6 pt-3 text-[15px] font-semibold text-black">
      <div>{time}</div>
      <div className="w-16" />
      <div className="flex items-center gap-1.5">
        <div className="h-3.5 w-4 rounded-[2px] border-[1.6px] border-black/90" />
        <div className="h-3.5 w-4 rounded-full border-[1.6px] border-black/90" />
        <div className="rounded-md border border-black/70 px-1 py-[1px] text-[11px] leading-none">80</div>
      </div>
    </div>
  );
}

function scorePoi(poi: CatalogPoi, text: string, selectedPoiNames: string[]) {
  let score = 0;
  const merged = text.toLowerCase();
  poi.keywords.forEach((key) => {
    if (merged.includes(key.toLowerCase())) score += 3;
  });
  if (selectedPoiNames.includes(poi.title)) score += 9;
  if (/购物|mall|逛街/.test(text) && poi.category === 'shopping') score += 4;
  if (/咖啡|饮品|奶茶/.test(text) && (poi.category === 'drink' || poi.category === 'shopping')) score += 4;
  if (/海|日落|散步|夜景/.test(text) && ['深圳湾公园', '深圳人才公园', '海上世界'].includes(poi.title)) score += 5;
  if (/历史|古城|人文/.test(text) && poi.title === '南头古城') score += 5;
  if (/拍照|打卡/.test(text) && ['深圳世界之窗', '华侨城创意园'].includes(poi.title)) score += 4;
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
  const theme = /海|日落|散步/.test(text)
    ? '海湾日落'
    : /购物|逛街/.test(text)
      ? '城市逛吃'
      : /古城|人文/.test(text)
        ? '人文漫游'
        : '城市漫游';
  const cityShort = (query.city || '深圳市').replace(/市$/, '');
  const title = `${cityShort}${/咖啡|饮品|文艺/.test(text) ? '文艺咖啡' : theme}City Walk`;
  const dayTitle = /咖啡|饮品|文艺/.test(text)
    ? '华侨城艺韵·古城咖啡漫步'
    : /海|日落|散步/.test(text)
      ? '海湾日落·慢行呼吸线'
      : /购物|逛街/.test(text)
        ? '城市逛吃·灵感漫游线'
        : /古城|人文/.test(text)
          ? '古城人文·街巷慢游线'
          : '南山灵感·城市漫游线';
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
  if (!raw) return { text: '帮我安排一条深圳南山半日路线', source: 'home', city: '深圳市', region: '南山区' };
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') return { text: parsed, source: 'home', city: '深圳市', region: '南山区' };
    return {
      city: '深圳市',
      region: '南山区',
      source: 'home',
      ...parsed
    };
  } catch {
    return { text: raw, source: 'home', city: '深圳市', region: '南山区' };
  }
}

function PlanningSkeleton() {
  return (
    <div className="relative h-full animate-pulse">
      <div className="absolute inset-x-0 top-0 h-[44%] bg-[#DCE6EB]" />
      <div className="absolute inset-x-0 bottom-0 top-[40%] rounded-t-[34px] bg-white/92 px-5 pb-28 pt-4 shadow-[0_-18px_48px_rgba(15,23,42,0.16)]">
        <div className="mx-auto h-1 w-10 rounded-full bg-slate-200" />
        <div className="mt-4 h-7 w-2/3 rounded-full bg-slate-200" />
        <div className="mt-3 h-4 w-5/6 rounded-full bg-slate-200" />
        <div className="mt-5 grid grid-cols-3 gap-2">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-16 rounded-[20px] bg-slate-200" />
          ))}
        </div>
        <div className="mt-6 space-y-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="rounded-[24px] bg-slate-100 p-4">
              <div className="flex gap-3">
                <div className="w-12 space-y-2">
                  <div className="h-4 rounded-full bg-slate-200" />
                  <div className="h-3 rounded-full bg-slate-200" />
                </div>
                <div className="h-16 w-16 rounded-[18px] bg-slate-200" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 w-2/5 rounded-full bg-slate-200" />
                  <div className="h-3 w-5/6 rounded-full bg-slate-200" />
                  <div className="h-3 w-2/3 rounded-full bg-slate-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MapOverview({
  stops,
  activeStopId,
  zoom,
  onZoomChange,
  onStopClick
}: {
  stops: RouteStop[];
  activeStopId: string | null;
  zoom: number;
  onZoomChange: (nextZoom: number) => void;
  onStopClick: (stopId: string) => void;
}) {
  const polyline = stops.map((stop) => `${stop.x * 3.9},${stop.y * 4.8}`).join(' ');

  return (
    <div
      className="relative h-full overflow-hidden bg-[#E9EFF2]"
      onWheel={(event) => {
        event.preventDefault();
        const delta = event.deltaY > 0 ? -0.08 : 0.08;
        onZoomChange(Math.max(1, Math.min(1.8, +(zoom + delta).toFixed(2))));
      }}
    >
      <div
        className="absolute inset-0 origin-center transition-transform duration-200"
        style={{ transform: `scale(${zoom})` }}
      >
        <svg className="h-full w-full" viewBox="0 0 390 480" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="390" height="480" fill="#E9EFF2" />
          <path d="M250 214C286 160 336 127 390 109V480H194C209 412 218 326 250 214Z" fill="#B9D8E9" />
          <path d="M0 372C46 340 84 319 132 314C171 309 205 317 228 344V480H0V372Z" fill="#CDE2EB" />
          <path d="M20 164C35 126 67 96 104 96C148 96 180 119 190 155C201 194 183 237 149 252C112 270 59 265 31 238C14 220 10 190 20 164Z" fill="#CBE3BD" />
          <path d="M204 302C232 270 275 262 319 270C352 276 374 291 390 317V394C367 370 338 357 303 360C259 364 227 392 205 420L204 302Z" fill="#C7DFB0" />
          <path d="M60 26L40 446" stroke="#F8F8F9" strokeWidth="8" strokeLinecap="round" />
          <path d="M114 38L100 446" stroke="#FAFAFB" strokeWidth="10" strokeLinecap="round" />
          <path d="M178 20L171 460" stroke="#F9F9FA" strokeWidth="11" strokeLinecap="round" />
          <path d="M250 18L247 455" stroke="#FAFAFB" strokeWidth="8" strokeLinecap="round" />
          <path d="M314 50L346 470" stroke="#F8F8F9" strokeWidth="8" strokeLinecap="round" />
          <path d="M0 110L390 96" stroke="#FAFAFB" strokeWidth="8" strokeLinecap="round" />
          <path d="M0 174L380 180" stroke="#FAFAFB" strokeWidth="8" strokeLinecap="round" />
          <path d="M0 244L355 256" stroke="#FAFAFB" strokeWidth="8" strokeLinecap="round" />
          <path d="M0 316L330 319" stroke="#F8F8F9" strokeWidth="8" strokeLinecap="round" />
          <path d="M0 392L288 402" stroke="#FAFAFB" strokeWidth="8" strokeLinecap="round" />
          {stops.length > 1 ? (
            <polyline
              points={polyline}
              fill="none"
              stroke="#28B7E8"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="0 0"
            />
          ) : null}
        </svg>

        <div className="absolute inset-0">
          {stops.map((stop, index) => {
            const active = stop.id === activeStopId;
            return (
              <button
                key={stop.id}
                type="button"
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${stop.x}%`, top: `${stop.y}%` }}
                onClick={() => onStopClick(stop.id)}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-[13px] font-bold shadow-[0_10px_18px_rgba(40,183,232,0.28)] ${
                    active ? 'border-white bg-[#111111] text-white' : 'border-white bg-[#28B7E8] text-white'
                  }`}
                >
                  {index + 1}
                </div>
                <div className={`mt-1 whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-semibold shadow-sm ${active ? 'bg-black text-white' : 'bg-white/92 text-black'}`}>
                  {stop.title}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RoutePlanApp() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{ startY: number; startTop: number; moved: boolean } | null>(null);
  const swipeState = useRef<{ pointerId: number; startX: number; startY: number; baseOffset: number; moved: boolean } | null>(null);
  const drawerTopRef = useRef(0);
  const [plan, setPlan] = useState<RoutePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [adjustInput, setAdjustInput] = useState('');
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
  const [replaceMode, setReplaceMode] = useState<'replace' | 'add'>('replace');
  const [shareOpen, setShareOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [toastText, setToastText] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [currentQuery, setCurrentQuery] = useState<PendingQuery>(getCurrentQuery());
  const [containerHeight, setContainerHeight] = useState(844);
  const [drawerTop, setDrawerTop] = useState(0);
  const [mapZoom, setMapZoom] = useState(1);
  const suppressTapRef = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const [cityName, setCityName] = useState<string>(getCurrentQuery().city || '深圳市');
  const [showCityPanel, setShowCityPanel] = useState(false);
  const [swipeOpenId, setSwipeOpenId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<Record<string, number>>({});
  const toastTimerRef = useRef<number | null>(null);
  const expandedTop = 74;
  const collapsedTop = Math.max(620, Math.round(containerHeight * 0.78));

  const refreshPlan = (query: PendingQuery, adjustment = '') => {
    setLoading(true);
    setEditMode(false);
    setSelectedStopId(null);
    window.setTimeout(() => {
      setCurrentQuery(query);
      const nextPlan = buildRoutePlan(query, adjustment);
      setPlan(nextPlan);
      setSelectedStopId(nextPlan.stops[0]?.id || null);
      setMapZoom(1);
      setLoading(false);
    }, adjustment ? 1100 : 900);
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

  useEffect(() => {
    if (!editMode) {
      setSwipeOpenId(null);
      setSwipeOffset({});
    }
  }, [editMode]);

  const showToastMessage = (text: string) => {
    setToastText(text);
    setShowToast(true);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setShowToast(false), 1600);
  };

  const orderedStops = plan?.stops || [];
  const candidatePois = useMemo(() => {
    const usedIds = new Set(orderedStops.map((stop) => stop.id));
    return catalog.filter((poi) => !usedIds.has(poi.id) || replaceMode === 'replace');
  }, [orderedStops, replaceMode]);

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

  const actionWidth = 174;

  const closeSwipe = (stopId?: string) => {
    if (stopId) {
      setSwipeOffset((prev) => ({ ...prev, [stopId]: 0 }));
      if (swipeOpenId === stopId) setSwipeOpenId(null);
      return;
    }
    setSwipeOpenId(null);
    setSwipeOffset({});
  };

  const onItemPointerDown = (event: React.PointerEvent<HTMLDivElement>, stopId: string) => {
    if (!editMode) return;
    const baseOffset = swipeOpenId === stopId ? -actionWidth : 0;
    swipeState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      baseOffset,
      moved: false
    };
  };

  const onItemPointerMove = (event: React.PointerEvent<HTMLDivElement>, stopId: string) => {
    const state = swipeState.current;
    if (!editMode || !state || state.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - state.startX;
    const deltaY = event.clientY - state.startY;
    if (Math.abs(deltaX) < Math.abs(deltaY)) return;
    state.moved = true;
    const next = clamp(state.baseOffset + deltaX, -actionWidth, 0);
    setSwipeOffset((prev) => ({ ...prev, [stopId]: next }));
  };

  const onItemPointerUp = (event: React.PointerEvent<HTMLDivElement>, stopId: string) => {
    const state = swipeState.current;
    if (!editMode || !state || state.pointerId !== event.pointerId) return;
    swipeState.current = null;
    const currentOffset = swipeOffset[stopId] ?? 0;
    if (!state.moved) {
      if (swipeOpenId && swipeOpenId !== stopId) closeSwipe(swipeOpenId);
      return;
    }
    if (currentOffset < -actionWidth * 0.45) {
      setSwipeOffset((prev) => ({ ...prev, [stopId]: -actionWidth }));
      setSwipeOpenId(stopId);
    } else {
      setSwipeOffset((prev) => ({ ...prev, [stopId]: 0 }));
      if (swipeOpenId === stopId) setSwipeOpenId(null);
    }
  };

  const onItemPointerCancel = (stopId: string) => {
    if (!editMode) return;
    swipeState.current = null;
    const currentOffset = swipeOffset[stopId] ?? 0;
    if (currentOffset < -actionWidth * 0.45) {
      setSwipeOffset((prev) => ({ ...prev, [stopId]: -actionWidth }));
      setSwipeOpenId(stopId);
    } else {
      setSwipeOffset((prev) => ({ ...prev, [stopId]: 0 }));
      if (swipeOpenId === stopId) setSwipeOpenId(null);
    }
  };

  const categoryLabelMap: Record<CategoryId, string> = {
    sight: '景点',
    food: '吃喝',
    drink: '喝咖',
    shopping: '购物',
    stay: '住宿'
  };
  const categoryLabelColorMap: Record<CategoryId, string> = {
    sight: '#C38A1D',
    food: '#E7773C',
    drink: '#7C7AF3',
    shopping: '#D25FA6',
    stay: '#7B6CF1'
  };

  return (
    <div
      ref={containerRef}
      className="relative mx-auto h-screen max-w-[430px] overflow-hidden bg-[#edf1f4] font-sans text-black"
      style={{ height: '100vh' }}
      onClick={() => {
        setShowCityPanel(false);
        if (swipeOpenId) closeSwipe(swipeOpenId);
      }}
    >
      <div className="absolute inset-0">
        {!loading && plan ? (
          <MapOverview
            stops={orderedStops}
            activeStopId={selectedStopId}
            zoom={mapZoom}
            onZoomChange={setMapZoom}
            onStopClick={setSelectedStopId}
          />
        ) : (
          <div className="h-full w-full bg-[#DEE8ED]" />
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-white/74 via-white/34 to-transparent" />

      {loading ? <PlanningSkeleton /> : null}

      <div className="absolute inset-x-0 top-0 z-20">
        <IOSStatusBar />
        <div className="px-6 pt-6">
          <div className="flex items-start justify-between">
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-1 text-left"
                onClick={(event) => {
                  event.stopPropagation();
                  setShowCityPanel((prev) => !prev);
                }}
              >
                <span className="text-[18px] font-bold tracking-[0.01em] text-black">{cityName}</span>
                <ChevronDown className="mt-1 h-4 w-4 text-black/75" strokeWidth={2.3} />
              </button>
              <div className="mt-1 text-[12.5px] font-medium text-black/42">{currentQuery.region || plan?.daysText || ''}</div>

              {showCityPanel ? (
                <div
                  className="absolute left-0 top-14 w-40 rounded-[20px] bg-white/96 p-2 shadow-[0_20px_55px_rgba(15,23,42,0.14)] backdrop-blur-xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  {cityOptions.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-[14px] ${
                        item.name === cityName ? 'bg-black text-white' : 'text-black/82 hover:bg-black/[0.04]'
                      }`}
                      onClick={() => {
                        setCityName(item.name);
                        setShowCityPanel(false);
                        const nextQuery: PendingQuery = { ...currentQuery, city: item.name };
                        sessionStorage.setItem('cw_pending_query', JSON.stringify(nextQuery));
                        refreshPlan(nextQuery, '');
                      }}
                    >
                      <span>{item.name}</span>
                      {item.name === cityName ? (
                        <span className="text-[11px] font-semibold">{item.weather.split(' ')[0]}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-black shadow-md backdrop-blur"
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
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-black shadow-md backdrop-blur"
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
        className="absolute inset-x-0 z-30 rounded-t-[28px] bg-white shadow-[0_20px_55px_rgba(15,23,42,0.14)] transition-[top] duration-300 ease-out"
        style={{ top: drawerTop, bottom: 0 }}
      >
        <div
          className="flex cursor-grab flex-col px-6 pb-4 pt-3 active:cursor-grabbing"
          onPointerDown={onDrawerPointerDown}
          onClick={() => {
            if (!expanded && !suppressTapRef.current && !loading) snapDrawer(true);
          }}
        >
          <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-black/18" />
          {!loading && plan ? (
            <>
              <div className="text-[18px] font-bold tracking-[0.01em] text-black">{plan.dayTitle}</div>
              {!expanded ? (
                <p className="mt-2 line-clamp-2 pr-10 text-[13px] leading-6 text-black/45">{plan.summary}</p>
              ) : (
                <>
                  <div className="mt-3 flex flex-wrap gap-2 text-[12px] font-semibold">
                    <div className="rounded-full bg-[#F4F8FA] px-3 py-1.5">起始 {plan.startTime}</div>
                    <div className="rounded-full bg-[#F4F8FA] px-3 py-1.5">{plan.totalDurationText}</div>
                    <div className="rounded-full bg-[#F4F8FA] px-3 py-1.5">{plan.totalDistanceText}</div>
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
                  const currentItemOffset = swipeOffset[stop.id] ?? (swipeOpenId === stop.id ? -actionWidth : 0);
                  return (
                    <div key={`${stop.id}-${index}`}>
                      {index > 0 ? (
                        <div className="mb-2 ml-3 flex items-center gap-1.5 text-[11px] font-medium text-black/42">
                          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-black/[0.03]">
                            <Footprints className="h-2.5 w-2.5" strokeWidth={2} />
                          </div>
                          <div>{getTransitMeta(stop, index)}</div>
                          <ChevronRight className="h-3 w-3 text-black/24" strokeWidth={2} />
                        </div>
                      ) : null}

                      <div
                        className={`relative overflow-hidden rounded-[24px] ${
                          isSelected ? 'bg-white shadow-[0_16px_36px_rgba(15,23,42,0.09)]' : 'bg-white/90'
                        }`}
                        draggable={editMode}
                        onDragStart={() => setDragIndex(index)}
                        onDragOver={(event) => {
                          if (editMode) event.preventDefault();
                        }}
                        onDrop={() => {
                          if (editMode && dragIndex !== null) moveStop(dragIndex, index);
                          setDragIndex(null);
                        }}
                      >
                        {editMode ? (
                          <div className="absolute inset-y-0 right-0 flex items-center justify-end gap-2 px-3" style={{ width: `${actionWidth}px` }}>
                            <button
                              type="button"
                              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F3F7FA] text-[11px] font-semibold text-black/76"
                              onClick={(event) => {
                                event.stopPropagation();
                                setReplaceIndex(index);
                                setReplaceMode('replace');
                                closeSwipe(stop.id);
                              }}
                            >
                              替换
                            </button>
                            <button
                              type="button"
                              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#111111] text-[11px] font-semibold text-white"
                              onClick={(event) => {
                                event.stopPropagation();
                                setReplaceIndex(index);
                                setReplaceMode('add');
                                closeSwipe(stop.id);
                              }}
                            >
                              新增
                            </button>
                            <button
                              type="button"
                              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFE8ED] text-[11px] font-semibold text-[#D95A7B]"
                              onClick={(event) => {
                                event.stopPropagation();
                                updateStops(orderedStops.filter((_, currentIndex) => currentIndex !== index));
                                closeSwipe(stop.id);
                                showToastMessage('已删除该站点');
                              }}
                            >
                              删除
                            </button>
                          </div>
                        ) : null}

                        <div
                          className="transition-transform duration-200 ease-out"
                          style={{ transform: `translateX(${currentItemOffset}px)` }}
                          onPointerDown={(event) => onItemPointerDown(event, stop.id)}
                          onPointerMove={(event) => onItemPointerMove(event, stop.id)}
                          onPointerUp={(event) => onItemPointerUp(event, stop.id)}
                          onPointerCancel={() => onItemPointerCancel(stop.id)}
                        >
                          <button
                            type="button"
                            className="flex w-full items-start gap-3 rounded-[24px] bg-white p-3 text-left"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (editMode && swipeOpenId === stop.id) {
                                closeSwipe(stop.id);
                                return;
                              }
                              setSelectedStopId(stop.id);
                            }}
                          >
                            <div className="flex min-w-0 flex-1 items-start gap-3">
                              <img src={stop.image} alt={stop.title} className="h-16 w-16 shrink-0 rounded-[18px] object-cover" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-[11px] font-semibold" style={{ color: categoryLabelColorMap[stop.category] }}>
                                      {categoryLabelMap[stop.category]}
                                    </div>
                                    <div className="truncate text-[17px] font-bold leading-6">{index + 1}.{stop.title}</div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {editMode ? <GripVertical className="h-4.5 w-4.5 text-black/26" strokeWidth={2.2} /> : null}
                                  </div>
                                </div>
                                <div className="mt-2 text-[15px] font-bold tracking-[-0.01em]">
                                  {stop.arriveAt} - {stop.departAt}
                                </div>
                                <div className="mt-2 rounded-[18px] bg-[#F7F7F8] p-3">
                                  <p className="line-clamp-3 text-[14px] leading-7 text-black/58">{stop.desc}</p>
                                </div>
                              </div>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="pt-2 text-[13px] leading-6 text-black/35">上滑查看路线详情，或点按标题直接展开。</div>
            )}
          </div>
        ) : null}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center pb-[84px]">
        <div
          className={`pointer-events-auto rounded-full bg-black/82 px-4 py-2 text-[12.5px] font-medium text-white shadow-lg transition-all ${
            showToast ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
        >
          {toastText}
        </div>
      </div>

      {!loading && plan ? (
        <div className="absolute bottom-6 right-5 z-40">
          <button
            type="button"
            className={`flex h-14 items-center justify-center gap-2 rounded-full px-5 shadow-[0_20px_55px_rgba(15,23,42,0.18)] ${
              editMode ? 'bg-black text-white' : 'bg-white text-black'
            }`}
            onClick={(event) => {
              event.stopPropagation();
              if (!expanded) snapDrawer(true);
              setEditMode((prev) => {
                const next = !prev;
                if (!next) closeSwipe();
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
            className="absolute inset-x-0 bottom-0 rounded-t-[30px] bg-white px-5 pb-8 pt-3 shadow-[0_-20px_60px_rgba(15,23,42,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto h-1 w-9 rounded-full bg-black/14" />
            <div className="mt-4 flex items-center justify-between">
              <div>
                <div className="text-[20px] font-bold">{replaceMode === 'replace' ? '替换这一站' : '在此后新增 POI'}</div>
                <div className="mt-1 text-[13px] text-black/42">选择后会实时更新上方地图和整条动线。</div>
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
                  className="flex w-full items-center gap-4 rounded-[24px] bg-[#F8FAFB] p-3 text-left"
                  onClick={() => handleApplyCandidate(candidate)}
                >
                  <img src={candidate.image} alt={candidate.title} className="h-16 w-16 rounded-[18px] object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[16px] font-bold">{candidate.title}</div>
                    <div className="mt-1 text-[12px] font-medium text-[#28B7E8]">{candidate.vibe}</div>
                    <div className="mt-1 text-[13px] leading-6 text-black/46">{candidate.desc}</div>
                  </div>
                  <ChevronRight className="h-4.5 w-4.5 text-black/28" strokeWidth={2.2} />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {shareOpen && plan ? (
        <div className="absolute inset-0 z-[60] bg-black/28 backdrop-blur-[2px]" onClick={() => setShareOpen(false)}>
          <div
            className="absolute inset-x-4 top-16 bottom-12 overflow-y-auto rounded-[30px] bg-white p-5 shadow-[0_25px_70px_rgba(15,23,42,0.24)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[22px] font-bold">路线长图预览</div>
                <div className="mt-1 text-[13px] text-black/42">当前先做预览态，后续可继续接导出图片。</div>
              </div>
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3F4F6]" onClick={() => setShareOpen(false)}>
                <X className="h-4.5 w-4.5" strokeWidth={2.5} />
              </button>
            </div>

            <div className="mt-5 rounded-[30px] bg-[#F7FAFC] p-4">
              <div className="rounded-[26px] bg-white p-4">
                <div className="flex items-center gap-2 text-[12px] font-semibold text-[#28B7E8]">
                  <Sparkles className="h-4 w-4" strokeWidth={2.2} />
                  AI 推荐路线
                </div>
                <div className="mt-3 text-[24px] font-bold leading-8">{plan.title}</div>
                <div className="mt-2 text-[14px] leading-7 text-black/62">{plan.summary}</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <div className="rounded-full bg-[#F4F8FA] px-3 py-1.5 text-[12px] font-semibold">起始 {plan.startTime}</div>
                  <div className="rounded-full bg-[#F4F8FA] px-3 py-1.5 text-[12px] font-semibold">{plan.totalDurationText}</div>
                  <div className="rounded-full bg-[#F4F8FA] px-3 py-1.5 text-[12px] font-semibold">{plan.totalDistanceText}</div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {orderedStops.map((stop, index) => (
                  <div key={`${stop.id}-share-${index}`} className="rounded-[24px] bg-white p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#28B7E8] text-[13px] font-bold text-white">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[16px] font-bold">{stop.title}</div>
                        <div className="mt-1 text-[12px] text-black/42">
                          {stop.arriveAt} - {stop.departAt} · {formatDuration(stop.stayMin)}
                        </div>
                        <div className="mt-2 text-[13px] leading-6 text-black/58">{stop.desc}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-[24px] bg-white p-4 text-[13px] leading-7 text-black/48">
                可分享给朋友一起看路线，也可以后续继续接成长图导出。
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function mount() {
  const rootElement = document.getElementById('routePlanRoot');
  if (!rootElement) return;
  createRoot(rootElement).render(<RoutePlanApp />);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
