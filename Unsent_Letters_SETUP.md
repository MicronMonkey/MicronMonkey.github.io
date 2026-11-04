# 《未寄出的信》測試版｜設定與上線說明

## 已建好的部分
- 網址：\`https://micronmonkey.github.io/Unsent_Letters_test.html\`
- 檔案：\`Unsent_Letters_test.html\`（完全獨立，不覆蓋 \`index.html\`）
- 四個展區：A 疲憊（寫給夥伴）、B 疑問（寫給台中工會與公司）、C 期待（寫給夢想的公司）、D 未來（寫給未來的自己）
- 手機版與 LINE 內建瀏覽器可用的互動版面
- 投稿、信件瀏覽、拆信動畫、愛心、收藏、最新與熱門排行、隨機拆信、分享與檢舉入口
- 投稿文字以 textContent 顯示，避免注入 HTML；提供網址、Email、電話的基本偵測與提醒
- 主頁目前**不會**顯示測試頁入口；確認正式功能後再決定是否連結

## 重要：目前是「本機展示模式」
本頁目前 CONFIG.supabaseUrl 與 CONFIG.supabaseAnonKey 未填入，**任何測試投稿或愛心都只會存在使用者自己瀏覽器 localStorage**。不代表多人公開成功。測試內文也是虛構情境示範。
不要宣稱已啟用真實投稿功能。

## 開啟真正的即時公開投稿
1. 新增 Supabase 專案（可先用免費方案測試）。
2. Supabase → Authentication → Providers → 啟用 Anonymous Sign-ins。
3. Supabase → SQL Editor → 執行 \`unsent-letters-setup.sql\`。
4. Supabase → Project Settings / API Keys → 取得 Project URL 和 **Publishable** key（或舊版 anon public key）。**絕對不要把 secret / service_role key 放入 GitHub 網站**。
5. 編輯 \`Unsent_Letters_test.html\`，找到：
   \`var CONFIG={supabaseUrl:'',supabaseAnonKey:''};\`
   將這兩個值填入。
6. 兩台不同裝置分別開啟網站，一台發文，另一台確認是否能看見，並測試愛心取消、熱門排序與檢舉。
7. 檢舉會存在 \`letter_reports\` 資料表；管理員可在 Supabase Table Editor 檢視並把違規信件 \`letters.is_hidden\` 設為 \`true\`。並非投稿前審核。

## 匿名與安全限制
- 使用 Supabase anonymous auth，訪客不需要建立帳號／輸入信箱，但系統仍會建立不可見的匿名 session。
- 一個匿名 session 對同一封信最多一個愛心；不是無法灌票，因為清除瀏覽資料或換裝置可以建立新身分。
- SQL 的每日 3 封限制只限制每個匿名 session，**不能**獨立擋住大量機器人帳號。
- 公開使用前務必設定 Supabase Authentication CAPTCHA（hCaptcha 或 Cloudflare Turnstile），並配合前端 CAPTCHA token 的提交；未完成前不建議向大社群開放無審核投稿。
- 請建立移除個資、騷擾、誹謗、洗版貼文的處置流程與管理員值班安排；**不用事先審核，不代表可以不處理檢舉**。
- 匿名使用者在網站不顯示其身分；平台服務仍可能保留技術紀錄。不要宣稱完全不可追蹤。
- 前端不儲存其他人的 \`author_id\`；SQL 使用欄位級權限避免公開作者識別符。
- 清除瀏覽器資料後，本機收藏可能遺失。
- 若要長期維護，建議另做管理後台與信件撤回／刪除申請。

## 未完成事項
- 尚無 Supabase Project URL 或 publishable key，因此尚未接上真正共用資料庫。
- 尚未設定 CAPTCHA，也沒有已測試的後台檢舉處理流程。
- 尚未進行跨裝置實測，或確認 Pages 網址已完成部署。
- 請勿將本測試頁視為正式對外營運版本。
