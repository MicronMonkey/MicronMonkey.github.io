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

注意：正式啟用步驟請見下方更新說明。安全驗證不能驗證簽署人的真實身分；身分類別仍為自填。想隱藏某筆簽名，把試算表該列 `hidden` 欄改成 `TRUE`。

## 資料
事件數字取自公開新聞報導（頁面底部列出來源，整理日期 2026-11-14）。有新進展請更新 `index.html` 時間線與 `i18n.js` 對應翻譯。

## 2026-11-15 表單更新與五輪檢查
1. 語言選單：手機也保留語言文字，顯示目前語言及 English／繁體中文提示。
2. 表單：九類單選按鈕（新增股東）、全名、職稱、私人信箱、留言字數。
3. 隱私：姓名預設不公開；姓名公開後才可公開類別及留言；即時預覽。前端儲存與後端回傳皆排除信箱。舊紀錄沒有新勾選同意的類別與留言不再顯示。
4. 安全：正式收件需要 Turnstile 前後端驗證、hostname/action 檢查、token 重播及信箱重複防護。未設定不允許正式送出。取消 no-cors 的假成功判定，必須取得 ok:true。
5. 可用性：鍵盤焦點、單選鍵盤操作、手機欄寬、長留言換行、降低動畫偏好、送出失敗保留輸入。

### 正式啟用（尚未完成）
目前 endpoint 仍為空字串，因此只可預覽，**未正式收件**。
- Cloudflare Turnstile 建立 widget，允許 micronmonkey.github.io。
- 將公開 site key 填入 app.js CONFIG.turnstileSiteKey。
- Apps Script 的指令碼屬性加入 TURNSTILE_SECRET 與 ALLOWED_HOSTNAME（micronmonkey.github.io）；secret 不可放進 GitHub。
- 使用更新後 apps-script.gs 部署 web app，將 /exec 網址填入 CONFIG.endpoint。
- 試算表維持私人，切勿公開或「發佈到網路」。原八欄保持原位置，新欄追加。
- 在正式開放前，用專用測試資料驗證 CORS 可讀的 JSON 回應、驗證失敗、重複信箱與三項公開設定；若讀不到回應，前端會顯示無法確認，不會假稱成功。
- 正式收件前補齊管理者聯絡方式、保留期間與刪除申請管道。

### 本次驗證結果
Syntax; DOM ID references; 8 privacy combinations; 4 privacy UI transitions; 8 mocked backend scenarios; 5 language overrides passed. Browser screenshots and live service integration unavailable.
參考站可讀頁面與瀏覽器皆無法取得，因此未完成逐項視覺比較。未新增新聞照片。
