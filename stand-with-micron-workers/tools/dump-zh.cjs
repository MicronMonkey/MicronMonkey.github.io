// Dumps the zh-Hant strings (HTML baseline + runtime strings) as JSON.
// usage: node tools/dump-zh.cjs http://localhost:PORT/stand-with-micron-workers/ > zh.json
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto(process.argv[2] + '?lang=zh-Hant'); await p.waitForTimeout(300);
  process.stdout.write(JSON.stringify(await p.evaluate(() => window.SWMW_I18N['zh-Hant'])));
  await b.close();
})();
