# RBA / 經濟部自主回報數 — Supabase 啟用步驟

此功能是「自行回報已寄出」，**不是官方收件證明**。RBA 和經濟部各自統計，不顯示合計，也不蒐集姓名或電子郵件。

## 1. 建立 Supabase 資料表與 API 函式

在 Supabase Dashboard 的 **SQL Editor > New query** 貼上本專案的 [action_reports_setup.sql](./supabase/action_reports_setup.sql) 全部內容，執行一次。

此 SQL 建立：
- `public.action_reports`：`action_type`（rba / moea）、匿名瀏覽器 UUID、時間
- `submit_action_report`：新增自主回報，同一瀏覽器 UUID 同一行動不重複增加
- `get_action_report_counts`：只公開兩種行動各自的人次
- RLS + 最小權限：網站無法直接讀取或修改原始紀錄

## 2. 設定公開連線參數

到 Supabase 專案的 **Project Settings / Settings > API Keys** 取得：
- Project URL（例如 `https://xxxx.supabase.co`）
- publishable key（`sb_publishable_...`，或舊版 anon public key）

在本 repository 的 `action-report-config.js` 填入：

```js
window.MM_ACTION_REPORT_CONFIG = {
  url: "https://YOUR-PROJECT.supabase.co",
  anonKey: "YOUR_PUBLIC_PUBLISHABLE_KEY"
};
```

**只填公開 publishable / anon key；絕不填 secret 或 service_role key。** Config 是公開網頁 JavaScript，任何訪客都能看見。

## 3. 測試

打開 `index_rba_action_preview.html`，兩個回報卡應看到數字 0（若之前未有人回報），按其中一項「我已寄出」後，只有該項加 1。重整網頁後同一個瀏覽器會顯示「已回報」，按鈕停用。

請自行在自己的瀏覽器執行測試，測試記錄也會計入真實回報；如需清除請由管理員在 Supabase SQL Editor 操作。

## 說明

不使用 CAPTCHA 或限流；無登入的瀏覽器識別只能降低誤按與重複點擊，不能阻擋惡意灌票或跨裝置重複。資料庫目前不公開原始 token，只透過 RPC 公開各項統計。未完成資料庫連線前，網站按鈕會停用並顯示「資料庫尚未設定」。
