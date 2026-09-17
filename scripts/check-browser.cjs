const { chromium } = require(process.env.PACTRA_PLAYWRIGHT || 'playwright');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PACTRA_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  });
  const results = [];
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    const routes = [
      ['site', 'http://127.0.0.1:5274/'],
      ['docs', 'http://127.0.0.1:5274/docs'],
      ['drill', 'http://127.0.0.1:5274/drill'],
      ['overview', 'http://127.0.0.1:5275/console/'],
      ['agents', 'http://127.0.0.1:5275/console/agents'],
      ['refusals', 'http://127.0.0.1:5275/console/refusals'],
      ['new-mandate', 'http://127.0.0.1:5275/console/new'],
    ];
    for (const [name, url] of routes) {
      const errors = [];
      const onError = error => errors.push(error.message);
      page.on('pageerror', onError);
      await page.goto(url, { waitUntil: 'networkidle' });
      const text = await page.locator('body').innerText();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
      const title = await page.title();
      const screenshot = `/private/tmp/pactra-${name}-${viewport.width}.png`;
      await page.screenshot({ path: screenshot, fullPage: false });
      const result = { name, url, viewport, title, textLength: text.length, overflow, errors, screenshot,
        ok: /Pactra/i.test(title) && text.length > 100 && !overflow && errors.length === 0 };
      results.push(result);
      page.off('pageerror', onError);
    }
    await page.close();
  }
  await browser.close();
  const report = { checkedAt: new Date().toISOString(), results, ok: results.every(x => x.ok) };
  fs.writeFileSync(path.join(__dirname, '../docs/browser-validation.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
