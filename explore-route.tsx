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
  LocateFixed,
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

type CityOption = {
  name: string;
  weather: string;
};

type Spot = {
  id: string;
  title: string;
  category: CategoryId;
  topTag: string;
  planTag: string;
  distanceTag: string;
  desc: string;
  image: string;
  gallery?: string[];
  intro?: string;
  hours?: string;
  dianpingPosts?: Array<{ title: string; desc: string; url: string }>;
  x: number;
  y: number;
  labelOffsetX?: number;
  labelOffsetY?: number;
};

const cityOptions: CityOption[] = [
  { name: '深圳市', weather: '雷暴 28° - 34°' },
  { name: '广州市', weather: '多云 27° - 33°' },
  { name: '上海市', weather: '小雨 24° - 29°' },
  { name: '北京市', weather: '晴 22° - 31°' }
];

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

const scenicBanner = (title: string, palette: { top: string; bottom: string; accent: string; accent2: string }) =>
  makeDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="480" height="270" viewBox="0 0 480 270">
      <defs>
        <linearGradient id="bg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="${palette.top}"/>
          <stop offset="100%" stop-color="${palette.bottom}"/>
        </linearGradient>
      </defs>
      <rect width="480" height="270" rx="34" fill="url(#bg)"/>
      <rect width="480" height="270" rx="34" fill="rgba(255,255,255,0.06)"/>
      <path d="M0 186 C74 168, 132 170, 210 190 S368 236, 480 212 L480 270 L0 270 Z" fill="${palette.accent}"/>
      <path d="M0 214 C56 192, 150 198, 226 220 S374 260, 480 244 L480 270 L0 270 Z" fill="${palette.accent2}" opacity="0.88"/>
      <circle cx="382" cy="58" r="26" fill="rgba(255,255,255,0.24)"/>
      <rect x="22" y="22" width="190" height="38" rx="19" fill="rgba(255,255,255,0.22)"/>
      <text x="40" y="48" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="white">${title}</text>
    </svg>
  `);

const spots: Spot[] = [
  {
    id: 'bay-park',
    title: '深圳湾公园',
    category: 'sight',
    topTag: '深圳市景点top1',
    planTag: '11.8w人规划',
    distanceTag: '2.9km',
    desc: '一出地铁就是海，13公里沿海骑行道日落，冬天还能看海鸥。',
    image: scenicPhoto('深圳湾公园', { top: '#89CFF0', bottom: '#4E87B7', accent: '#B9D98D', accent2: '#E7C97F' }),
    gallery: [
      scenicBanner('深圳湾日落', { top: '#89CFF0', bottom: '#4E87B7', accent: '#B9D98D', accent2: '#E7C97F' }),
      scenicBanner('海风步道', { top: '#56CCF2', bottom: '#2F80ED', accent: '#BBF7D0', accent2: '#FDE68A' }),
      scenicBanner('海鸥季', { top: '#60A5FA', bottom: '#1D4ED8', accent: '#A7F3D0', accent2: '#FCD34D' })
    ],
    intro:
      '深圳湾公园是一条沿海的城市绿廊，适合慢跑、骑行和看日落。傍晚海风很舒服，步道视野开阔，能把城市天际线和海湾界面一起收进镜头。',
    hours: '全天开放（建议日落前 1 小时到达）',
    dianpingPosts: [
      {
        title: '深圳湾看日落攻略',
        desc: '最佳观景点位 + 停车/补给建议，适合下班后随时出发。',
        url: 'https://www.dianping.com'
      },
      {
        title: '沿海骑行路线怎么走',
        desc: '13 公里骑行段落拆解，附拍照打卡位置。',
        url: 'https://www.dianping.com'
      }
    ],
    x: 77,
    y: 53
  },
  {
    id: 'mixc-world',
    title: '深圳万象天地',
    category: 'shopping',
    topTag: '深圳市购物top1',
    planTag: '6.1w人规划',
    distanceTag: '1.7km',
    desc: '万象天地是华润“天地”系列首发，街区+mall的潮流地标，有小象雕塑、空...展开',
    image: scenicPhoto('深圳万象天地', { top: '#7D8D9F', bottom: '#334155', accent: '#D8B4FE', accent2: '#C084FC' }),
    gallery: [
      scenicBanner('万象天地夜景', { top: '#64748B', bottom: '#0F172A', accent: '#F9A8D4', accent2: '#D8B4FE' }),
      scenicBanner('街区咖啡', { top: '#A78BFA', bottom: '#6D28D9', accent: '#FDE68A', accent2: '#FCA5A5' }),
      scenicBanner('设计店铺', { top: '#94A3B8', bottom: '#475569', accent: '#C084FC', accent2: '#F472B6' })
    ],
    intro:
      '深圳万象天地是集街区、商场与艺术装置于一体的城市潮流地标，逛街、吃饭、喝咖啡都能无缝衔接。白天适合慢逛小店，晚上灯光氛围更出片。',
    hours: '10:00 - 22:00（部分餐饮延时）',
    dianpingPosts: [
      {
        title: '万象天地一日逛吃清单',
        desc: '轻松路线：咖啡 → 买手店 → 晚餐 → 夜景收尾。',
        url: 'https://www.dianping.com'
      },
      {
        title: '拍照打卡点位合集',
        desc: '小象装置、阶梯广场、玻璃立面，随手拍都很高级。',
        url: 'https://www.dianping.com'
      }
    ],
    x: 63,
    y: 39
  },
  {
    id: 'window',
    title: '深圳世界之窗',
    category: 'sight',
    topTag: '深圳市景点top2',
    planTag: '5.1w人规划',
    distanceTag: '2.7km',
    desc: '全球地标一天逛遍，埃菲尔铁塔拍照超出片，晚上灯光秀和烟花别错过。',
    image: scenicPhoto('深圳世界之窗', { top: '#1E3A8A', bottom: '#0F172A', accent: '#F5D061', accent2: '#F59E0B' }),
    gallery: [
      scenicBanner('世界之窗', { top: '#1E3A8A', bottom: '#0F172A', accent: '#F5D061', accent2: '#F59E0B' }),
      scenicBanner('灯光秀', { top: '#0F172A', bottom: '#1E40AF', accent: '#A78BFA', accent2: '#F472B6' })
    ],
    intro:
      '深圳世界之窗集合多国地标缩景与主题演艺，适合想“一站多拍”的路线安排。建议提前查看演出时间，避开正午高温，把夜场灯光秀作为亮点。',
    hours: '10:00 - 21:30（以景区公告为准）',
    dianpingPosts: [
      {
        title: '世界之窗夜场怎么玩',
        desc: '灯光秀/烟花/演艺排期建议，节奏不赶也能看全。',
        url: 'https://www.dianping.com'
      }
    ],
    x: 20,
    y: 62
  },
  {
    id: 'nantou',
    title: '南头古城',
    category: 'sight',
    topTag: '深圳市景点top3',
    planTag: '4.9w人规划',
    distanceTag: '3.1km',
    desc: '1700年的老城墙下，肠粉摊冒着热气，夜里灯光一亮，古城又活成了年轻人...展开',
    image: scenicPhoto('南头古城', { top: '#D9C3A4', bottom: '#A16207', accent: '#FDE68A', accent2: '#A3E635' }),
    gallery: [
      scenicBanner('南头古城', { top: '#D9C3A4', bottom: '#A16207', accent: '#FDE68A', accent2: '#A3E635' }),
      scenicBanner('夜市小吃', { top: '#F59E0B', bottom: '#B45309', accent: '#BBF7D0', accent2: '#93C5FD' })
    ],
    intro:
      '南头古城是深圳最有历史感的街区之一，小巷、城墙与新潮店铺混在一起，适合边走边吃边拍。傍晚灯光亮起后更有氛围，是路线里很好的质感转场。',
    hours: '全天开放（建议 17:00 后体验夜逛）',
    dianpingPosts: [
      {
        title: '南头古城夜逛路线',
        desc: '从城墙到小吃街，避开人潮的两条走法。',
        url: 'https://www.dianping.com'
      },
      {
        title: '古城必吃小摊',
        desc: '肠粉、糖水、烧烤一口气安排，按顺路排序。',
        url: 'https://www.dianping.com'
      }
    ],
    x: 27,
    y: 37
  },
  {
    id: 'sea-world',
    title: '海上世界',
    category: 'sight',
    topTag: '深圳市景点top5',
    planTag: '4.4w人规划',
    distanceTag: '6.0km',
    desc: '退役邮轮改成餐厅，甲板拍照很出片，傍晚还有音乐喷泉，适合慢慢逛吃。',
    image: scenicPhoto('海上世界', { top: '#B6E0FE', bottom: '#7DD3FC', accent: '#93C5FD', accent2: '#FDE68A' }),
    gallery: [
      scenicBanner('海上世界', { top: '#B6E0FE', bottom: '#7DD3FC', accent: '#93C5FD', accent2: '#FDE68A' }),
      scenicBanner('邮轮甲板', { top: '#38BDF8', bottom: '#0284C7', accent: '#FDE68A', accent2: '#BBF7D0' }),
      scenicBanner('音乐喷泉', { top: '#0EA5E9', bottom: '#1E3A8A', accent: '#C084FC', accent2: '#F472B6' })
    ],
    intro:
      '海上世界以邮轮与海滨广场为中心，集餐饮、夜景与休闲散步于一体。适合把晚餐和收尾氛围放在同一站，结束后也方便返程或继续夜生活。',
    hours: '广场全天开放（餐饮多为 11:00 - 23:00）',
    dianpingPosts: [
      {
        title: '海上世界夜景拍照点',
        desc: '邮轮、喷泉、海边步道三段式打卡，不用走回头路。',
        url: 'https://www.dianping.com'
      }
    ],
    x: 25,
    y: 75
  }
];

const mapPoints: Array<Spot | {
  id: string;
  title: string;
  category: CategoryId;
  x: number;
  y: number;
  labelOffsetX?: number;
  labelOffsetY?: number;
}> = [
  ...spots,
  { id: 'talent-park', title: '深圳人才公园', category: 'sight', x: 58, y: 60 },
  { id: 'shenzhen-sea-world', title: '深圳海上世界', category: 'sight', x: 20, y: 69, labelOffsetX: -6 },
  { id: 'mixc-mini', title: '海上世界', category: 'food', x: 38, y: 70 },
  { id: 'coffee-dot', title: '精品咖啡', category: 'drink', x: 10, y: 34 },
  { id: 'mall-dot', title: '购物天地', category: 'shopping', x: 84, y: 34 }
];

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

function MockMap({
  activeCategory,
  onBackgroundClick,
  onSpotClick
}: {
  activeCategory: CategoryId;
  onBackgroundClick: () => void;
  onSpotClick: (spotId: string) => void;
}) {
  const activeColor = categories.find((item) => item.id === activeCategory)?.markerColor ?? '#90D36E';

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#edf1f4]" onClick={onBackgroundClick}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(40,183,232,0.12),_transparent_30%)]" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 390 844" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="390" height="844" fill="#EDF1F4" />
        <path d="M257 404C290 356 322 290 390 252V844H210C236 748 226 600 257 404Z" fill="#B7D8E8" />
        <path d="M0 664C51 628 88 603 130 591C176 578 202 590 216 608V844H0V664Z" fill="#CDE3EC" />
        <path d="M225 561C245 528 279 517 318 527C347 535 368 553 390 584V690C367 650 345 623 312 616C275 608 245 628 225 653V561Z" fill="#B9DCA4" />
        <path d="M30 322C44 270 79 232 122 228C160 225 187 249 198 281C213 325 202 373 167 399C133 423 79 427 47 405C20 387 17 355 30 322Z" fill="#C7E3BC" />
        <path d="M20 624C50 592 92 576 139 586C179 594 199 624 203 666C167 686 121 714 92 758H0V670C5 653 11 639 20 624Z" fill="#B8D9B4" />
        <path d="M80 120L55 785" stroke="#F7F7F8" strokeWidth="7" strokeLinecap="round" />
        <path d="M122 106L101 790" stroke="#F9F9FA" strokeWidth="10" strokeLinecap="round" />
        <path d="M190 54L177 800" stroke="#FAFAFB" strokeWidth="12" strokeLinecap="round" />
        <path d="M258 44L247 792" stroke="#F8F8F9" strokeWidth="9" strokeLinecap="round" />
        <path d="M330 104L350 820" stroke="#F9F9FA" strokeWidth="8" strokeLinecap="round" />
        <path d="M5 176L390 150" stroke="#F8F8F9" strokeWidth="10" strokeLinecap="round" />
        <path d="M0 237L380 225" stroke="#FAFAFB" strokeWidth="8" strokeLinecap="round" />
        <path d="M0 304L350 315" stroke="#F9F9FA" strokeWidth="8" strokeLinecap="round" />
        <path d="M0 376L368 390" stroke="#FAFAFB" strokeWidth="9" strokeLinecap="round" />
        <path d="M0 458L342 468" stroke="#F8F8F9" strokeWidth="8" strokeLinecap="round" />
        <path d="M0 550L325 548" stroke="#FAFAFB" strokeWidth="8" strokeLinecap="round" />
        <path d="M0 618L300 630" stroke="#F8F8F9" strokeWidth="8" strokeLinecap="round" />
        <path d="M0 690L286 700" stroke="#F9F9FA" strokeWidth="9" strokeLinecap="round" />
        <path d="M223 571L343 769" stroke="#F7F7F8" strokeWidth="7" strokeLinecap="round" />
        <path d="M276 592L388 805" stroke="#F7F7F8" strokeWidth="5" strokeDasharray="5 6" strokeLinecap="round" />
      </svg>

      <div className="absolute left-[7%] top-[41%] text-[13px] font-semibold tracking-[0.01em] text-black/78">南头古城</div>
      <div className="absolute left-[55%] top-[44%] text-[13px] font-semibold text-black/78">深圳万象天地</div>
      <div className="absolute left-[74%] top-[64%] text-[13px] font-semibold text-black/78">深圳湾公园</div>
      <div className="absolute left-[56%] top-[73%] text-[13px] font-semibold text-black/78">深圳人才公园</div>
      <div className="absolute left-[24%] top-[81%] text-[13px] font-semibold text-black/78">海上世界</div>
      <div className="absolute left-[18%] top-[73%] text-[13px] font-semibold text-black/78">深圳海上世界</div>
      <div className="absolute left-[36%] top-[55%] -rotate-6 text-[12px] font-medium text-black/18">南山区</div>
      <div className="absolute left-[58%] top-[61%] -rotate-6 text-[11px] font-medium text-black/12">深湾大道</div>
      <div className="absolute left-[50%] top-[24%] text-[12px] font-medium text-black/14">南坪快速</div>

      {mapPoints.map((point) => {
        const config = categories.find((item) => item.id === point.category)!;
        const Icon = config.icon;
        const highlighted = point.category === activeCategory;
        const left = `${point.x}%`;
        const top = `${point.y}%`;

        return (
          <button
            key={point.id}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSpotClick(point.id);
            }}
            className="group absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              left,
              top,
              opacity: highlighted ? 1 : 0.4,
              transform: `translate(-50%, -50%) scale(${highlighted ? 1.08 : 0.94})`
            }}
          >
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/90 shadow-md transition-all"
              style={{
                background: highlighted ? activeColor : config.markerColor,
                boxShadow: highlighted ? '0 10px 20px rgba(17,24,39,0.16)' : '0 8px 16px rgba(17,24,39,0.08)'
              }}
            >
              <Icon className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
            </div>
          </button>
        );
      })}

      <div className="absolute left-[55%] top-[53%]">
        <Navigation className="absolute -left-4 -top-5 h-4 w-4 rotate-[18deg] drop-shadow-sm" style={{ fill: '#28B7E8', color: '#28B7E8' }} strokeWidth={2.4} />
        <div className="h-5 w-5 rounded-full border-[3px] border-white bg-[#2698F6] shadow-[0_8px_18px_rgba(38,152,246,0.28)]" />
      </div>

      <button
        type="button"
        className="absolute bottom-[19.5%] right-5 flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-[0_20px_55px_rgba(15,23,42,0.14)]"
        onClick={(event) => event.stopPropagation()}
      >
        <LocateFixed className="h-5 w-5" strokeWidth={2.2} />
      </button>
    </div>
  );
}

function ExploreRouteApp() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{ startY: number; startTop: number; moved: boolean } | null>(null);
  const drawerTopRef = useRef(0);
  const toastTimer = useRef<number | null>(null);
  const suppressTapRef = useRef(false);

  const [city, setCity] = useState<CityOption>(cityOptions[0]);
  const [activeCategory, setActiveCategory] = useState<CategoryId>('sight');
  const [expanded, setExpanded] = useState(false);
  const [drawerTop, setDrawerTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(844);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showCityPanel, setShowCityPanel] = useState(false);
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [toastText, setToastText] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [detailSpotId, setDetailSpotId] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [checkedInIds, setCheckedInIds] = useState<string[]>([]);

  const expandedTop = 74;
  const collapsedTop = Math.max(620, Math.round(containerHeight * 0.78));

  const filteredSpots = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return spots.filter((spot) => {
      const byKeyword = !keyword || `${spot.title}${spot.desc}${spot.topTag}`.toLowerCase().includes(keyword);
      return byKeyword;
    });
  }, [activeCategory, searchText]);

  const detailSpot = useMemo(
    () => filteredSpots.find((spot) => spot.id === detailSpotId) || spots.find((spot) => spot.id === detailSpotId) || null,
    [detailSpotId, filteredSpots]
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
        setShowCityPanel(false);
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
      showToastMessage('已加入行程');
      return [...prev, spotId];
    });
  };

  const toggleFavorite = (spotId: string) => {
    setFavoriteIds((prev) => {
      const next = prev.includes(spotId) ? prev.filter((id) => id !== spotId) : [...prev, spotId];
      showToastMessage(next.includes(spotId) ? '已收藏' : '已取消收藏');
      return next;
    });
  };

  const toggleCheckIn = (spotId: string) => {
    setCheckedInIds((prev) => {
      const next = prev.includes(spotId) ? prev.filter((id) => id !== spotId) : [...prev, spotId];
      showToastMessage(next.includes(spotId) ? '打卡成功' : '已取消打卡');
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
    if (!spots.some((spot) => spot.id === spotId)) return;
    setDetailSpotId(spotId);
  };

  const openPlanFromSpot = (spot: Spot) => {
    sessionStorage.setItem(
      'cw_pending_query',
      JSON.stringify({
        source: 'explore',
        city: city.name,
        region: '南山区',
        text: `围绕${spot.title}规划一条适合当下出发的CityWalk路线`,
        pois: [{ name: spot.title, desc: spot.desc }]
      })
    );
    window.location.hash = 'plan';
  };

  const closePanels = () => {
    setShowCityPanel(false);
    if (expanded) snapTo(false);
  };

  return (
    <div
      ref={containerRef}
      className="relative mx-auto h-screen max-w-[430px] overflow-hidden bg-[#edf1f4] font-sans text-black"
      style={{ height: '100vh' }}
    >
      <MockMap activeCategory={activeCategory} onBackgroundClick={closePanels} onSpotClick={openSpot} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-white/74 via-white/34 to-transparent" />

      <div className="absolute inset-x-0 top-0 z-20">
        <IOSStatusBar />

        <div className="px-6 pt-6">
          <div className="flex items-start justify-between">
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-1 text-left"
                onClick={() => {
                  setShowCityPanel((prev) => !prev);
                }}
              >
                <span className="text-[18px] font-bold tracking-[0.01em] text-black">{city.name}</span>
                <ChevronDown className="mt-1 h-4 w-4 text-black/75" strokeWidth={2.3} />
              </button>
              <div className="mt-1 text-[12.5px] font-medium text-black/42">{city.weather}</div>

              {showCityPanel && (
                <div className="absolute left-0 top-14 w-40 rounded-[20px] bg-white/96 p-2 shadow-[0_20px_55px_rgba(15,23,42,0.14)] backdrop-blur-xl">
                  {cityOptions.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-[14px] ${
                        item.name === city.name ? 'bg-black text-white' : 'text-black/82 hover:bg-black/[0.04]'
                      }`}
                      onClick={() => {
                        setCity(item);
                        setShowCityPanel(false);
                      }}
                    >
                      <span>{item.name}</span>
                      {item.name === city.name ? <Check className="h-4 w-4" strokeWidth={2.6} /> : null}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-black shadow-md backdrop-blur"
                onClick={() => {
                  setSearchOpen((prev) => !prev);
                  setShowCityPanel(false);
                }}
              >
                <Search className="h-5 w-5" strokeWidth={2.4} />
              </button>
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/76 text-black shadow-md backdrop-blur"
                onClick={() => {
                  window.location.hash = 'mine';
                }}
              >
                <UserRound className="h-5 w-5 text-black/60" strokeWidth={2.2} />
              </button>
            </div>
          </div>

          {searchOpen && (
            <div className="mt-4 rounded-[22px] bg-white/94 px-4 py-3 shadow-[0_20px_55px_rgba(15,23,42,0.14)] backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <Search className="h-4.5 w-4.5 text-black/35" strokeWidth={2.2} />
                <input
                  autoFocus
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="搜索地点或关键词"
                  className="w-full bg-transparent text-[14px] text-black outline-none placeholder:text-black/32"
                />
                {searchText ? (
                  <button
                    type="button"
                    className="text-[12px] font-medium text-black/45"
                    onClick={() => setSearchText('')}
                  >
                    清空
                  </button>
                ) : null}
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-5 gap-2">
            {categories.map((item) => {
              const active = item.id === activeCategory;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveCategory(item.id);
                    if (!expanded) setDetailSpotId(null);
                  }}
                  className={`flex min-w-0 items-center justify-center gap-1 rounded-[18px] border px-1 py-2 text-[12px] font-bold leading-none transition-all ${
                    active
                      ? 'border-white bg-white text-black shadow-[0_10px_26px_rgba(17,24,39,0.12)]'
                      : 'border-white/70 bg-white/88 text-black/84 shadow-[0_6px_20px_rgba(17,24,39,0.08)]'
                  }`}
                >
                  <span className="text-[13px]">{item.emoji}</span>
                  <span className="truncate text-[12px]">{item.label}</span>
                </button>
              );
            })}
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
            if (!expanded && !suppressTapRef.current) snapTo(true);
          }}
        >
          <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-black/18" />
          <div className="text-[18px] font-bold tracking-[0.01em] text-black">南山区</div>
          {expanded ? (
            <>
              <p className="mt-3 whitespace-pre-line pr-8 text-[14px] leading-7 text-black/74">
                海边散步能看对岸灯火连成一片，风里飘着烤生蚝的香气。
                {'\n'}
                基于用户真实数据，已为你梳理当前区域热门去处。
              </p>
              <div className="mt-4 h-px bg-black/8" />
            </>
          ) : null}
        </div>

        <div
          className="overflow-y-auto px-6 pb-28"
          style={{ height: expanded ? `calc(100% - 142px)` : `calc(100% - 70px)` }}
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
                    <img src={spot.image} alt={spot.title} className="h-24 w-24 shrink-0 rounded-[22px] object-cover shadow-sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-[18px] font-bold leading-6 text-black">{spot.title}</div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="rounded-md bg-[#FFF1BE] px-2 py-1 text-[11px] font-semibold leading-none text-[#B77C00]">
                              {spot.topTag}
                            </span>
                            <span className="rounded-md bg-[#F2F2F4] px-2 py-1 text-[11px] font-semibold leading-none text-black/54">
                              {spot.planTag}
                            </span>
                            <span className="rounded-md bg-[#F2F2F4] px-2 py-1 text-[11px] font-semibold leading-none text-black/54">
                              {spot.distanceTag}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            added ? 'bg-black text-white' : 'bg-[#F3F3F5] text-black/42'
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
                        className="mt-2 text-[15px] leading-7 text-black/38"
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
                <div className="rounded-[24px] bg-[#F7F7F8] px-5 py-6 text-center text-[14px] leading-6 text-black/42">
                  没有找到匹配的地点，试试别的关键词。
                </div>
              ) : null}
            </div>
          ) : (
            <div className="pt-3 text-[13px] leading-6 text-black/35">
              上滑查看区域热门地点，或点按标题直接展开推荐列表。
            </div>
          )}
        </div>
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

      {detailSpot && (
        <div className="absolute inset-0 z-[60] bg-black/28 backdrop-blur-[2px]" onClick={() => setDetailSpotId(null)}>
          <div
            className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[430px] overflow-hidden rounded-t-[34px] bg-white shadow-[0_-24px_70px_rgba(15,23,42,0.28)]"
            onClick={(event) => event.stopPropagation()}
            style={{ maxHeight: '84vh' }}
          >
            <div className="px-6 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[26px] font-bold tracking-[-0.01em] text-black">{detailSpot.title}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#F3F4F6] px-3 py-1.5 text-[12px] font-semibold text-black/74">
                      {categories.find((item) => item.id === detailSpot.category)?.label ?? '地点'}
                    </span>
                    <span className="rounded-full bg-[#F3F4F6] px-3 py-1.5 text-[12px] font-semibold text-black/74">{detailSpot.planTag}</span>
                    <span className="rounded-full bg-[#F3F4F6] px-3 py-1.5 text-[12px] font-semibold text-black/74">驾车 · {detailSpot.distanceTag}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F3F3F5] text-black/58"
                  onClick={() => setDetailSpotId(null)}
                >
                  <X className="h-5 w-5" strokeWidth={2.6} />
                </button>
              </div>
            </div>

            <div className="mt-5 overflow-y-auto px-6 pb-[110px]" style={{ maxHeight: 'calc(84vh - 98px)' }}>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {(detailSpot.gallery?.length ? detailSpot.gallery : [detailSpot.image]).map((img, index) => (
                  <img
                    key={`${detailSpot.id}-gallery-${index}`}
                    src={img}
                    alt={`${detailSpot.title}-${index + 1}`}
                    className="h-[160px] w-[280px] shrink-0 rounded-[26px] object-cover"
                  />
                ))}
              </div>

              <div className="mt-6">
                <div className="flex items-center gap-2">
                  <div className="text-[18px] font-bold text-black">地点介绍</div>
                  <span className="rounded-full bg-[#F6F7F9] px-2 py-1 text-[11px] font-semibold text-black/45">AI生成</span>
                </div>
                <p className="mt-3 text-[15px] leading-7 text-black/70">
                  {(detailSpot.intro || detailSpot.desc).replace('...展开', '')}
                </p>
              </div>

              <div className="mt-6 rounded-[26px] bg-[#F7F7F8] p-4">
                <div className="text-[15px] font-bold text-black">营业时间</div>
                <div className="mt-2 text-[14px] leading-6 text-black/60">{detailSpot.hours || '以门店实际为准'}</div>
              </div>

              <div className="mt-6">
                <div className="text-[18px] font-bold text-black">精选大众点评帖子</div>
                <div className="mt-3 space-y-3">
                  {(detailSpot.dianpingPosts || []).map((post) => (
                    <a
                      key={post.title}
                      href={post.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-[26px] bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.08)]"
                      onClick={() => showToastMessage('已打开大众点评')}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-[16px] font-bold text-black">{post.title}</div>
                          <div className="mt-2 text-[13px] leading-6 text-black/52">{post.desc}</div>
                        </div>
                        <ExternalLink className="mt-1 h-4.5 w-4.5 shrink-0 text-black/30" strokeWidth={2.3} />
                      </div>
                    </a>
                  ))}

                  {!(detailSpot.dianpingPosts || []).length ? (
                    <div className="rounded-[24px] bg-[#F7F7F8] px-5 py-6 text-center text-[14px] leading-6 text-black/42">
                      暂无精选内容，稍后再来看看。
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="absolute inset-x-0 bottom-0 border-t border-black/5 bg-white/92 backdrop-blur-xl">
              <div className="flex gap-3 px-6 py-4">
                <button
                  type="button"
                  className={`flex flex-1 items-center justify-center gap-2 rounded-[22px] px-4 py-3 text-[15px] font-semibold ${
                    favoriteIds.includes(detailSpot.id) ? 'bg-black text-white' : 'bg-[#F3F3F5] text-black'
                  }`}
                  onClick={() => toggleFavorite(detailSpot.id)}
                >
                  <Heart className="h-4.5 w-4.5" strokeWidth={2.5} />
                  收藏
                </button>
                <button
                  type="button"
                  className={`flex flex-1 items-center justify-center gap-2 rounded-[22px] px-4 py-3 text-[15px] font-semibold ${
                    checkedInIds.includes(detailSpot.id) ? 'bg-black text-white' : 'bg-[#F3F3F5] text-black'
                  }`}
                  onClick={() => toggleCheckIn(detailSpot.id)}
                >
                  <CheckCircle2 className="h-4.5 w-4.5" strokeWidth={2.4} />
                  打卡
                </button>
                <button
                  type="button"
                  className="flex flex-1 items-center justify-center gap-2 rounded-[22px] bg-[#28B7E8] px-4 py-3 text-[15px] font-semibold text-white"
                  onClick={() => openNavigation(detailSpot)}
                >
                  <Navigation className="h-4.5 w-4.5" strokeWidth={2.4} />
                  导航
                </button>
              </div>
              <div className="px-6 pb-4">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-[22px] border border-black/8 bg-white px-4 py-3 text-[14px] font-semibold text-black"
                  onClick={() => openPlanFromSpot(detailSpot)}
                >
                  <Navigation className="h-4.5 w-4.5 text-[#28B7E8]" strokeWidth={2.6} />
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
