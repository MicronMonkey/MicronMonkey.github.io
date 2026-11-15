# 光光猴首頁：語言切換（測試版 index-lang-v1.html）

- 頂部列：標題、社群分享（Facebook / LINE / X / IG / WhatsApp / 分享）、右上角語言選單（繁中 / 简中 / English / 日本語 / 한국어 / हिन्दी）。樣式沿用首頁原本的灰色標題列與 🐵 Logo。
- 進站語言：網址 `?lang=` → 使用者上次的選擇 → 瀏覽器語言（中國、新加坡、馬來西亞中文 → 简中；其他中文 → 繁中；日文 → 日本語；韓文 → 한국어；印地文 → हिन्दी；其他語言 → English）。
- 內容只寫在 HTML（繁中，部分已有 `.u-zh/.u-en` 對照），由 `portal-i18n.js` 依語言切換顯示：
  - `.u-zh/.u-en` 與「中文 / English」格式只顯示一邊；
  - 其他文字用 `data.js` 的翻譯表（英／日／韓／印地）或簡體轉換；頁面程式之後寫入的文字也會翻譯。
- 分享網址：`index-lang-v1.html`（繁中）、`index-lang-v1-zh-hans.html`、`-en`、`-ja`、`-ko`、`-hi.html`，各自有該語言的標題、描述、預覽圖（`og-*.png`）。

## 改了首頁文字之後
1. `python3 -m http.server 8000`
2. `node portal-i18n/extract.cjs /tmp 'http://localhost:8000/index-lang-v1.html?lang=zh-Hant'` → 產生 `/tmp/portal-strings.json`
3. `python3 portal-i18n/build.py /tmp/portal-strings.json` → 更新 `data.js`。輸出若有 `untranslated`，把那些句子補進 `build.py` 的 `EN` 表；日／韓／印地文翻譯在 `tr_ja.py`、`tr_ko.py`、`tr_hi.py`（以 `keys.json`／`reference.tsv` 的列號對應）。未補的會顯示中文。
4. 預覽圖：`python3 portal-i18n/og.py && node portal-i18n/og-render.cjs`（印地文字型在 `fonts/`）
5. 語言入口頁與分享網址：`python3 portal-i18n/pages.py`
需要：`pip install opencc`、Playwright。

## 轉成正式版時
把 `index-lang-v1.html` 換成 `index.html`，並把 `PORTAL_I18N_CONFIG.share`、`hreflang` 與五個語言入口頁的網址改成正式網址（例如 `/en/`、`/ja/`、`/ko/`、`/hi/`、`/zh-hans/`）。

## 字級（`portal-type.css`）
文字分成 A–H 八類，每類一個大小。在 `type.py` 的 `SIZES` 改「手機 pt, 電腦 pt」，在 `RULES` 調整哪些元素屬於哪一類，然後執行 `python3 portal-i18n/type.py`，再把 `index-lang-v1.html` 裡的 `portal-type.css?v=` 版本號加 1。
手機以 390px 寬計算，1024px 以上用電腦大小，中間平滑過渡。6 種語言共用同一套大小。
