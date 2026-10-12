// 活動狀態判斷：建置時與瀏覽器端共用同一套邏輯，日期一律以台灣時間計算。

export type Category = 'consumption' | 'travel' | 'sports' | 'culture' | 'quiz' | 'other';
export type Status = 'upcoming' | 'open' | 'awaiting' | 'drawn' | 'hidden';

export interface Lottery {
  id: string;
  title: string;
  organizer: string;
  level: 'central' | 'local';
  region: string;
  category: Category;
  startDate: string;
  endDate: string;
  registerDeadline: string | null;
  eligibility: string;
  residency: string[] | null;
  audience: 'all' | 'citizens' | 'foreigners';
  howToJoin: string;
  topPrize: string;
  drawDate: string | null;
  drawNote: string;
  officialUrl: string;
  sourceUrl: string;
  sourceNote: string;
  winnersUrl: string | null;
  lastVerified: string;
}

export const CATEGORIES: Record<Category, { label: string }> = {
  consumption: { label: '消費・發票' },
  travel: { label: '旅遊・住宿' },
  sports: { label: '運動' },
  culture: { label: '文化' },
  quiz: { label: '宣導・問答' },
  other: { label: '其他' },
};

export const REGIONS = [
  '臺北市', '新北市', '桃園市', '臺中市', '臺南市', '高雄市',
  '基隆市', '新竹市', '嘉義市', '新竹縣', '苗栗縣', '彰化縣',
  '南投縣', '雲林縣', '嘉義縣', '屏東縣', '宜蘭縣', '花蓮縣',
  '臺東縣', '澎湖縣', '金門縣', '連江縣',
];

/** 已開獎的活動在開獎日後保留幾天 */
export const KEEP_AFTER_DRAW = 30;
/** 沒公布開獎日的活動，截止後保留幾天 */
export const KEEP_WITHOUT_DRAW = 45;

export function todayTaipei(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

function toUTC(d: string): number {
  const [y, m, day] = d.split('-').map(Number);
  return Date.UTC(y, m - 1, day);
}

/** b 減 a 的天數（同一天為 0） */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUTC(b) - toUTC(a)) / 86400000);
}

export function deadlineOf(item: Lottery): string {
  return item.registerDeadline ?? item.endDate;
}

export interface Computed {
  status: Status;
  /** open：距截止天數；upcoming：距開始天數；awaiting：距開獎天數（未定為 null） */
  days: number | null;
  deadline: string;
}

export function computeStatus(item: Lottery, today: string): Computed {
  const deadline = deadlineOf(item);
  if (daysBetween(today, item.startDate) > 0) {
    return { status: 'upcoming', days: daysBetween(today, item.startDate), deadline };
  }
  if (daysBetween(today, deadline) >= 0) {
    return { status: 'open', days: daysBetween(today, deadline), deadline };
  }
  if (item.drawDate) {
    const toDraw = daysBetween(today, item.drawDate);
    if (toDraw >= 0) return { status: 'awaiting', days: toDraw, deadline };
    if (-toDraw <= KEEP_AFTER_DRAW) return { status: 'drawn', days: toDraw, deadline };
    return { status: 'hidden', days: null, deadline };
  }
  if (daysBetween(deadline, today) <= KEEP_WITHOUT_DRAW) {
    return { status: 'awaiting', days: null, deadline };
  }
  return { status: 'hidden', days: null, deadline };
}

/** 依使用者居住縣市判斷是否可能不符資格 */
export function maybeIneligible(item: Lottery, home: string | null): boolean {
  if (item.audience === 'foreigners') return true;
  if (!home || !item.residency) return false;
  return !item.residency.includes(home);
}

export function md(d: string): string {
  const [, m, day] = d.split('-');
  return `${Number(m)}/${Number(day)}`;
}

export function urgency(c: Computed): 'urgent' | 'soon' | 'calm' | 'muted' {
  if (c.status !== 'open' || c.days === null) return 'muted';
  if (c.days <= 3) return 'urgent';
  if (c.days <= 7) return 'soon';
  return 'calm';
}

/** 票根上要顯示的文字 */
export function stubText(c: Computed, item: Lottery): { top: string; num: string; unit: string; foot: string } {
  switch (c.status) {
    case 'open':
      if (c.days === 0) return { top: '', num: '今天', unit: '截止', foot: md(c.deadline) };
      return { top: '剩', num: String(c.days), unit: '天', foot: `${md(c.deadline)} 截止` };
    case 'upcoming':
      return { top: '', num: String(c.days), unit: '天後開始', foot: `${md(item.startDate)} 起` };
    case 'awaiting':
      return item.drawDate
        ? { top: '', num: '等', unit: '開獎', foot: `${md(item.drawDate)} 開獎` }
        : { top: '', num: '等', unit: '開獎', foot: '日期未定' };
    case 'drawn':
      return { top: '', num: '已', unit: '開獎', foot: item.drawDate ? md(item.drawDate) : '' };
    default:
      return { top: '', num: '', unit: '', foot: '' };
  }
}

export const STATUS_ORDER: Record<Status, number> = { open: 0, upcoming: 1, awaiting: 2, drawn: 3, hidden: 4 };

export function sortKey(item: Lottery, c: Computed): number {
  // 同一組內：可參加的依截止日、即將開始依開始日、等開獎依開獎日
  if (c.status === 'open') return c.days ?? 0;
  if (c.status === 'upcoming') return c.days ?? 0;
  if (c.status === 'awaiting') return c.days ?? 9999;
  return -(c.days ?? 0);
}
