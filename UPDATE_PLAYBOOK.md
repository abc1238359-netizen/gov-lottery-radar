# 每週更新手冊

每週一早上的排程照這份手冊執行。目標是讓 `src/data/` 裡的資料反映「今天」的狀況，並通過 `npm run build`，然後 push 到 `main`。Vercel 會自動重新部署。

## 收錄規則（不要自行放寬）

1. **範圍**：中央部會、22 縣市政府（含所屬局處）主辦或委外辦理、民眾可以報名參加、有明確截止日的抽獎。
   - 統一發票和雲端發票專屬獎只放在 `pinned.json` 的常態卡片。
   - **不收**：FB／IG 留言抽獎、抽籤類（社宅、兵役、公幼）、國營事業（台電、中華郵政、台灣菸酒等）、商圈協會或公會自辦的活動（即使有政府補助）、直接發券或補助（不是抽獎）。
2. **官方來源**：每筆都必須有官方來源，包括機關官網公告或新聞稿、官方活動網站、機關認證的 FB 貼文，或機關在中央社訊息平台（cna.com.tw/postwrite）發的新聞稿。新聞報導和部落格只能當線索，找不到官方來源就不上架，寫進 `coverage.json` 的備註。
3. **`officialUrl` 只能填官方網址**，網站上的「前往官方網站」按鈕就是連到這裡。

## 步驟

1. `npm ci`
2. **重查現有活動**：逐筆打開 `lotteries.json` 裡每筆的 `sourceUrl` 和 `officialUrl`，確認以下欄位：
   - 日期是否延長或提前結束
   - 獎項、開獎日、中獎名單網址是否有更新
   - 開獎日原本是暫估的（`drawNote` 寫「暫以…計算」），官方公布後要改成正式日期

   查證完把 `lastVerified` 改成今天。
3. **封存**：用 `src/lib/status.ts` 的規則判斷。開獎日後超過 30 天，或沒有開獎日、截止後超過 45 天的活動，從 `lotteries.json` 移到 `archive.json`，並填上 `archivedOn` 和 `reason`。`archive.json` 只保留最近 90 天。
4. **找新活動**：中央部會和 22 縣市各至少搜尋一次。建議的關鍵字：
   - 「<縣市> 2026 抽獎 登錄 發票」
   - 「<縣市> 購物節」
   - 「<縣市> 住宿 抽獎」
   - 「<部會> 抽獎 活動」
   - 「有獎徵答 <部會>」
   - 「中央社訊息平台 <縣市>政府 抽獎」

   另外追蹤 `coverage.json` 備註裡標「有線索」的項目。
5. **更新 `coverage.json`**：
   - `lastRun` 改成今天
   - 每個單位都要更新 `lastChecked`、`found`（上架筆數）和 `note`
   - 沒找到就寫「已查，目前沒有」，不能留空
6. `npm run build`：會先跑 `scripts/validate.mjs`，沒通過就修資料，**不准跳過檢查**。
7. commit 訊息格式：`資料更新 YYYY-MM-DD：新增 N、下架 N`，然後 push 到 `main`。
8. 推播摘要給使用者，內容包括：
   - 新增的活動
   - 封存的活動
   - 7 天內截止的活動
   - 等開獎的活動
   - 有線索但查不到官方來源而沒上架的活動
   - 這次打不開的網站

## 欄位說明（`lotteries.json`）

| 欄位 | 說明 |
|---|---|
| `id` | 小寫英數加連字號，例如 `taichung-shopping-2026` |
| `level` / `region` | 中央填 `central` / `全國`；地方填 `local` / 縣市全名（臺用「臺」） |
| `category` | `consumption` 消費・發票、`travel` 旅遊・住宿、`sports`、`culture`、`quiz` 宣導・問答、`other` |
| `startDate` / `endDate` | 活動（消費）起訖，格式 YYYY-MM-DD |
| `registerDeadline` | 登錄截止日，跟 `endDate` 不同時才填，否則填 `null` |
| `drawDate` | 最後一次開獎日。未公布就填 `null`；只知道月份就填月底，並在 `drawNote` 註明是暫估 |
| `residency` | 限設籍才填縣市陣列，否則填 `null` |
| `audience` | `all`、`citizens`（限本國籍）、`foreigners`（限外籍旅客，預設會被隱藏） |
| `eligibility` / `howToJoin` / `topPrize` / `drawNote` | 一兩句白話，給一般人看的 |
| `sourceUrl` / `sourceNote` | 實際查證用的頁面，以及它是什麼（例：活動官網辦法、某局新聞稿） |

## 連線問題

以下網站從海外的雲端環境連線常被擋（403 或逾時）：

- taiwantravel.tad.gov.tw
- gotaipei.taipei
- mof.gov.tw
- travel.taipei
- hccg.gov.tw

處理順序：

1. 先試 WebFetch。
2. 如果這次工作有連到使用者的電腦，改用他的內建瀏覽器。
3. 都不行，就找同一機關在中央社訊息平台或縣市政府全球資訊網發的新聞稿。

在摘要裡列出這次打不開的網站。
