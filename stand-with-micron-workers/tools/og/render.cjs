// Renders tools/og/card-*.html into the og-*.png preview images listed in jobs.json.
const { chromium } = require('playwright');
const jobs = require(__dirname + '/jobs.json');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  for (const [html, png] of jobs) { await p.goto('file://' + html); await p.waitForTimeout(400); await p.screenshot({ path: png }); console.log(png); }
  await b.close();
})();
