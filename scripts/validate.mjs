// 資料檢查：建置前執行，任何一項不通過就讓建置失敗，避免把壞資料推上線。
import { readFileSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(new URL(`../src/data/${p}`, import.meta.url), 'utf8'));
const items = read('lotteries.json');
const coverage = read('coverage.json');
const pinned = read('pinned.json');
const archive = read('archive.json');

const REGIONS = ['臺北市','新北市','桃園市','臺中市','臺南市','高雄市','基隆市','新竹市','嘉義市','新竹縣','苗栗縣','彰化縣','南投縣','雲林縣','嘉義縣','屏東縣','宜蘭縣','花蓮縣','臺東縣','澎湖縣','金門縣','連江縣'];
const CATEGORIES = ['consumption','travel','sports','culture','quiz','other'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());

const errors = [];
const warnings = [];
const err = (id, msg) => errors.push(`[${id}] ${msg}`);
const isDate = (d) => typeof d === 'string' && DATE.test(d) && !Number.isNaN(Date.parse(d));
const isUrl = (u) => { try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:'; } catch { return false; } };

const REQUIRED_TEXT = ['id','title','organizer','eligibility','howToJoin','topPrize','drawNote','officialUrl','sourceUrl','sourceNote'];
const ids = new Set();

for (const it of items) {
  const id = it.id ?? '(沒有 id)';
  for (const k of REQUIRED_TEXT) if (typeof it[k] !== 'string' || !it[k].trim()) err(id, `缺少 ${k}`);
  if (!/^[a-z0-9-]+$/.test(it.id ?? '')) err(id, 'id 只能用小寫英數與連字號');
  if (ids.has(it.id)) err(id, 'id 重複'); ids.add(it.id);
  if (!['central','local'].includes(it.level)) err(id, 'level 必須是 central 或 local');
  if (it.level === 'central' && it.region !== '全國') err(id, '中央活動的 region 必須是「全國」');
  if (it.level === 'local' && !REGIONS.includes(it.region)) err(id, `region「${it.region}」不是 22 縣市之一`);
  if (!CATEGORIES.includes(it.category)) err(id, `category「${it.category}」不在清單內`);
  if (!['all','citizens','foreigners'].includes(it.audience)) err(id, 'audience 必須是 all / citizens / foreigners');
  if (it.residency !== null && !(Array.isArray(it.residency) && it.residency.every((r) => REGIONS.includes(r)))) err(id, 'residency 必須是 null 或縣市陣列');
  for (const k of ['startDate','endDate','lastVerified']) if (!isDate(it[k])) err(id, `${k} 不是 YYYY-MM-DD`);
  for (const k of ['registerDeadline','drawDate']) if (it[k] !== null && !isDate(it[k])) err(id, `${k} 必須是 null 或 YYYY-MM-DD`);
  if (isDate(it.startDate) && isDate(it.endDate) && it.startDate > it.endDate) err(id, 'startDate 晚於 endDate');
  if (it.registerDeadline && it.registerDeadline < it.endDate) err(id, 'registerDeadline 早於 endDate');
  const deadline = it.registerDeadline ?? it.endDate;
  if (it.drawDate && it.drawDate < it.startDate) err(id, 'drawDate 早於 startDate');
  if (it.drawDate && it.drawDate < deadline) warnings.push(`[${id}] drawDate 早於截止日（多次抽獎時請填最後一次）`);
  if (isDate(it.lastVerified) && it.lastVerified > today) err(id, 'lastVerified 是未來日期');
  for (const k of ['officialUrl','sourceUrl']) if (!isUrl(it[k])) err(id, `${k} 不是有效網址`);
  if (it.winnersUrl !== null && !isUrl(it.winnersUrl)) err(id, 'winnersUrl 必須是 null 或網址');
}

// 查證範圍：22 縣市都要有紀錄，上架數要和清單一致
const names = coverage.units.map((u) => u.name);
for (const r of REGIONS) if (!names.includes(r)) err('coverage', `缺少 ${r} 的查證紀錄`);
if (!isDate(coverage.lastRun)) err('coverage', 'lastRun 不是日期');
for (const u of coverage.units) {
  if (!['central','metro','county'].includes(u.group)) err('coverage', `${u.name} 的 group 不正確`);
  if (!isDate(u.lastChecked)) err('coverage', `${u.name} 的 lastChecked 不是日期`);
  if (!Number.isInteger(u.found) || u.found < 0) err('coverage', `${u.name} 的 found 不是非負整數`);
  if (typeof u.note !== 'string' || !u.note.trim()) err('coverage', `${u.name} 缺少備註`);
}
for (const r of REGIONS) {
  const listed = items.filter((i) => i.region === r).length;
  const unit = coverage.units.find((u) => u.name === r);
  if (unit && unit.found !== listed) err('coverage', `${r} 查證紀錄寫 ${unit.found} 筆，但清單裡有 ${listed} 筆`);
}
const centralListed = items.filter((i) => i.level === 'central').length;
const centralFound = coverage.units.filter((u) => u.group === 'central').reduce((n, u) => n + u.found, 0);
if (centralListed !== centralFound) err('coverage', `中央查證紀錄合計 ${centralFound} 筆，但清單裡有 ${centralListed} 筆`);

for (const p of pinned) if (!isUrl(p.officialUrl)) err(p.id, 'pinned officialUrl 不是有效網址');
for (const a of archive) {
  if (ids.has(a.id)) err(a.id, '同時出現在清單與封存');
  if (!isDate(a.drawDate)) err(a.id, '封存項目缺少 drawDate');
}

for (const w of warnings) console.warn('注意', w);
if (errors.length) {
  console.error(`資料檢查失敗，共 ${errors.length} 個問題：`);
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log(`資料檢查通過：${items.length} 筆活動、${coverage.units.length} 個查證單位、${archive.length} 筆封存。`);
