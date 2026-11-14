# 挺光連署 Stand with Micron Workers

支持台灣美光勞工的獨立公開信頁面。網址：https://micronmonkey.github.io/stand-with-micron-workers/

- 紫／黑配色，右上角語言選單：繁體中文、简体中文、English、日本語、한국어（`?lang=zh-Hans|en|ja|ko` 可直接連到指定語言）。
- 區塊：最新消息橫幅、公開信、簽署＋簽署人、工會公開信（摘錄＋全文＋美光回應）、致全球美光夥伴、事件經過、安全提醒、FAQ、資料來源。
- 繁體中文文字寫在 `index.html`；English／日本語／한국어在 `i18n.js`；邏輯在 `app.js`。
- 简体中文 `i18n-zh-hans.js` 由繁中自動轉換，**改完繁中後要重產**：
  `node tools/dump-zh.cjs http://localhost:8000/stand-with-micron-workers/ > zh.json && python3 tools/gen_zh_hans.py zh.json > i18n-zh-hans.js`（需 `pip install opencc` 與 Playwright）。
- `og.png` 是分享到 LINE／FB 時的預覽圖（1200×630）。

## 連署目前是「本機測試模式」

`app.js` 裡 `CONFIG.endpoint` 是空的，簽名只存在簽署者自己的瀏覽器，**不會送出、別人看不到**。頁面上有清楚標示。

要收集真正的共用簽名：
1. 開一份 Google 試算表 → 擴充功能 → Apps Script，貼上 `apps-script.gs`。
2. 部署 → 新增部署作業 → 網頁應用程式；執行身分「我」、存取權「所有人」。
3. 把 `/exec` 網址填進 `app.js` 的 `CONFIG.endpoint`，推上 main。

注意：沒有驗證碼，無法完全阻擋灌票；想隱藏某筆簽名，把試算表該列 `hidden` 欄改成 `TRUE`。簽署人身分皆為自填、未驗證。

## 資料
事件數字取自公開新聞報導（頁面底部列出來源，整理日期 2026-11-14）。有新進展請更新 `index.html` 時間線與 `i18n.js` 對應翻譯。
