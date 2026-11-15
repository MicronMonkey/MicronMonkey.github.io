# 連署後端啟用

## 1. Google 試算表與 Apps Script

建立私人 Google 試算表，選「擴充功能 → Apps Script」，將同資料夾 apps-script.gs 的完整內容貼到 Code.gs。試算表不需公開共用。

在 Apps Script 的「專案設定 → 指令碼屬性」設定：
- SPREADSHEET_ID：試算表網址 /d/ 與 /edit 之間的 ID
- ALLOWED_HOSTNAME：micronmonkey.github.io
- TURNSTILE_SECRET：Cloudflare 提供的 Secret Key，只能放在這裡

執行一次 setupSignatures 並授權。會建立 signatures 工作表。
部署 → 新增部署 → 網頁應用程式：
- 執行身分：我
- 存取權：任何人
複製結尾為 /exec 的部署網址。若帳號政策不允許匿名存取，需要可允許的帳號或其他後端。

## 2. Cloudflare Turnstile

Cloudflare 控制台 → Turnstile → Add widget。
名稱：Stand with Micron Workers
Hostname：micronmonkey.github.io（不包含 https:// 或路徑）
模式：Managed。
取得 Site Key 與 Secret Key。Site Key 可放前端，Secret Key 僅放上述指令碼屬性。
官方設定：https://developers.cloudflare.com/turnstile/get-started/
驗證文件：https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

## 3. 前端啟用

app.js 的 CONFIG：
endpoint 填入 /exec 部署網址。
turnstileSiteKey 填入 Site Key。
preview 改為 false。
完成真正送出測試前，保持原設定，以免讓訪客誤以為資料已正式收件。

## 4. 上線驗證

- 用瀏覽器開啟 /exec，應回傳 ok:true、count、signatures。
- 前端通過 Turnstile 後提交一筆測試，確認試算表增加一筆。
- 使用另一個瀏覽器確認公開名單和統計更新。
- 不公開姓名時，回傳資料應沒有姓名、職稱、留言。
- 信箱與驗證 tokenHash 不應出現在任何公開 JSON。
- 缺少或失效 token 應拒絕。重複信箱應拒絕。
- 確認 GitHub Pages 到 Apps Script 的跨來源讀寫能取得 JSON 回覆。不可用 no-cors 當成功回報。
- 用私人測試紀錄測完後，可在後台將 hidden 設為 TRUE 以隱藏。

## 後台管理

hidden：TRUE 會從公開名單及總數移除。
priority：數字越高，公開簽署者排序越前。未設定時以時間新到舊排序。
public、publicRole、publicMessage：尊重簽署者的公開設定，不要擅自將未同意的欄位公開。
email 只供後台查核重複，此流程沒有寄驗證信，Turnstile 也不驗證信箱所有權。
管理後台使用 Google 試算表的帳號與共用權限，沒有公開管理 API。
目前讀取整份已篩選名單，移除了舊版只回傳最後 300 筆的限制。大量簽署時需留意 Apps Script 配額及執行時間。
