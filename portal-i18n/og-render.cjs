const { chromium } = require('playwright'); const jobs = require(__dirname + '/og-jobs.json');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  for (const [h, png] of jobs) { await p.goto('file://' + h); await p.waitForTimeout(300); await p.screenshot({ path: png }); }
  await b.close(); })();
