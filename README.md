# 公家抽獎雷達

整理中央部會與 22 縣市政府正在辦的抽獎，顯示還剩幾天截止、誰能參加、最大獎是什麼，每筆都附官方連結。**非官方網站**，一切以各機關公告為準。

## 結構

- `src/data/lotteries.json`：活動資料（網站唯一的資料來源）
- `src/data/coverage.json`：每週查了哪些機關、各找到幾筆
- `src/data/pinned.json`：常態卡片（統一發票）
- `src/data/archive.json`：開獎超過 30 天後封存的活動
- `src/lib/status.ts`：狀態判斷（進行中／即將開始／等開獎／已開獎），在瀏覽器端依「今天」重新計算
- `scripts/validate.mjs`：資料檢查，`npm run build` 會先跑，不通過就不建置
- `UPDATE_PLAYBOOK.md`：每週更新流程

## 本機開發

```bash
npm ci
npm run dev       # http://localhost:4321
npm run build     # 先檢查資料，再輸出到 dist/
```

## 部署

push 到 `main` 後，Vercel 會自動建置（Astro 靜態輸出，設定在 `vercel.json`）。
