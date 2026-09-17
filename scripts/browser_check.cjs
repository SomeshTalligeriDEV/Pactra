const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PACTRA_PLAYWRIGHT || '/private/tmp/pactra-tools/node_modules/playwright');
const base = process.env.PACTRA_TEST_URL || 'http://127.0.0.1:5374';
const videoUrl = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260809_012548_ef22562c-c0ae-4816-ad9d-f8922af4e6a7.mp4';
(async () => {
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [], requests = [], checks = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push(request.url()));
  if (process.env.PACTRA_CASE_STUDIES_ONLY === '1') {
    for (const origin of [base, 'http://127.0.0.1:5180']) {
      for (const width of [1440, 390]) {
        await page.setViewportSize({width,height:900});
        await page.goto(origin,{waitUntil:'domcontentloaded'});
        if(width<720) await page.locator('.burger').click();
        const selector=width<720?'.mobile-menu':'.nav-pill';
        await page.locator(`${selector} a`).filter({hasText:'Case Studies'}).click();
        await page.waitForURL('**/#case-studies');
        await page.waitForTimeout(900);
        assert(await page.locator('#case-studies-title').isVisible());
        assert.equal(await page.locator('#case-studies article').count(),2);
        assert(await page.locator('.mobile-menu').isHidden());
        assert(await page.locator('#case-studies').evaluate(e=>e.getBoundingClientRect().top<innerHeight));
        assert(await page.locator('#case-studies').evaluate(e=>e.getBoundingClientRect().right<=innerWidth+1));
        for(const scenario of ['paid','refused']) {
          await page.locator(`[data-purchase-scenario="${scenario}"]`).click();
          assert.equal(await page.locator('#buy .buy').getAttribute('data-scenario'),scenario);
        }
        await page.goto(origin+'/#case-studies',{waitUntil:'domcontentloaded'});
        await page.waitForTimeout(1000);
        await page.locator('#case-studies').screenshot({path:`/private/tmp/pactra-case-studies-${width}.png`});
        checks.push(`${origin} at ${width}px: navigation, menu close, two case studies, both walkthrough links, direct anchor load`);
      }
    }
    for (const path of ['/drill','/drill/','/drill/index.html','/case-studies','/case-studies/','/case-studies/index.html']) {
      const response=await page.goto('http://127.0.0.1:5180'+path,{waitUntil:'domcontentloaded'});
      assert(response.status()<400, `Legacy ${path} must not return 404`);
      await page.waitForURL('**/#case-studies');
      await page.waitForSelector('#case-studies-title');
      await page.reload({waitUntil:'domcontentloaded'});
      assert(await page.locator('#case-studies-title').isVisible());
      checks.push(`Standalone legacy route ${path}: redirects and reloads successfully`);
    }
    assert.deepEqual(errors,[]);
    const report={checkedAt:new Date().toISOString(),passed:checks.length,checks,errors};
    fs.writeFileSync('docs/case-studies-validation.json',JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2));
    await browser.close();
    return;
  }
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 15000))]));
  await page.waitForFunction(() => document.querySelector('[data-count]').textContent === '1');
  await page.waitForTimeout(2500);
  assert.equal(await page.title(), 'Pactra — One Budget for Every Agent');
  assert.equal(await page.locator('video source').getAttribute('src'), videoUrl);
  assert.deepEqual(await page.locator('[data-count]').allTextContents(), ['1', '3', '3', '0']);
  assert(!requests.some(url => /\/assets\/app-[^/]+\.js/.test(url)), 'Static home must not load the React application');
  checks.push('Static home, exact video source, Pactra copy, final counters, no framework bundle');

  for (const [width, height] of [[1440,900],[1920,1080],[768,1024],[720,900],[390,844],[320,568],[1024,600],[844,390],[667,375]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(300);
    const layout = await page.evaluate(() => {
      const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return {top:r.top,bottom:r.bottom,width:r.width,height:r.height}; };
      const headline = document.querySelector('.headline');
      return { overflow:document.documentElement.scrollWidth>innerWidth+1, header:rect('.header'), trust:rect('.trust'), headline:rect('.headline'), cta:rect('.cta'), stats:rect('.stats'), product:rect('.product-content'), headlineClipped:headline.scrollHeight>headline.clientHeight+1, menu:getComputedStyle(document.querySelector('.mobile-menu')).display };
    });
    assert(!layout.overflow, `${width}x${height}: horizontal overflow`);
    assert(!layout.headlineClipped, `${width}x${height}: clipped headline`);
    assert(layout.trust.top >= layout.header.bottom - 1, `${width}x${height}: hero overlaps header`);
    assert(layout.cta.bottom < layout.stats.top, `${width}x${height}: CTA overlaps stats`);
    assert(layout.stats.bottom <= height + 1, `${width}x${height}: stats outside first viewport`);
    assert(Math.abs(layout.product.top-height)<2, `${width}x${height}: product must begin after the hero viewport`);
    assert.equal(layout.menu, 'none');
    await page.screenshot({ path: `/private/tmp/pactra-current-${width}x${height}.png` });
    checks.push(`Viewport ${width}x${height}: complete hero, no overlap, menu hidden`);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo(0,0));
  await page.locator('.burger').click();
  assert.equal(await page.locator('.burger').getAttribute('aria-expanded'), 'true');
  await page.waitForTimeout(750);
  assert(await page.locator('.overlay').isVisible());
  for (const text of ['Home','Product','Case Studies','Contact']) {
    const link=page.locator('.mobile-link').filter({hasText:new RegExp(`^${text}$`)});
    assert(await link.isVisible());
    assert(Number(await link.evaluate(e=>getComputedStyle(e).opacity)) >= .69);
  }
  await page.screenshot({ path:'/private/tmp/pactra-current-menu.png' });
  await page.keyboard.press('Escape');
  assert(await page.locator('.mobile-menu').isHidden());
  assert.equal(await page.evaluate(()=>document.activeElement.className), 'burger');
  await page.locator('.burger').click();
  await page.locator('.overlay').click({position:{x:4,y:700}});
  assert(await page.locator('.mobile-menu').isHidden());
  await page.locator('.burger').click();
  await page.setViewportSize({width:900,height:700});
  assert(await page.locator('.mobile-menu').isHidden());
  assert.equal(await page.locator('.burger').getAttribute('aria-expanded'),'false');
  await page.setViewportSize({width:390,height:844});
  await page.locator('.burger').click();
  await page.locator('.mobile-menu a[href="#product"]').click();
  assert(await page.locator('.mobile-menu').isHidden());
  await page.waitForTimeout(900);
  assert(await page.evaluate(()=>scrollY>100));
  checks.push('Mobile menu: all links visible; Escape, overlay, resize and link close; focus restored');

  await page.locator('#buy .buy__tab[data-tone="refused"]').click();
  assert.equal(await page.locator('#buy .buy').getAttribute('data-scenario'),'refused');
  await page.locator('#buy .buy__step').nth(3).click();
  assert.equal(await page.locator('#buy .buy__title').textContent(),'A bound says no.');
  assert(await page.locator('#buy .buy__tx').isVisible());
  await page.locator('#buy .buy__tab[data-tone="paid"]').click();
  await page.locator('#buy .buy__step').last().click();
  assert.equal(await page.locator('#buy .buy__title').textContent(),'The agent gets what it asked for.');
  await page.locator('#buy .buy__tab[data-tone="paid"]').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#buy .buy').getAttribute('data-scenario'),'refused');
  await page.locator('#how').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1700);
  assert(await page.locator('#how .tree__ring-used').evaluateAll(rings=>rings.some(r=>parseFloat(r.getAttribute('stroke-dasharray'))>0)));
  checks.push('Original Paid/Refused walkthrough, proof links, step controls, keyboard tabs and animated trees');

  for (const width of [320,390,720,1440]) {
    await page.setViewportSize({width,height:900});
    const restored=await page.evaluate(()=>({
      backgrounds:[...document.querySelectorAll('#product .pactra-surface--violet, #product .pactra-surface--ember')].map(e=>getComputedStyle(e).backgroundImage),
      overflowing:[...document.querySelectorAll('#product section, #product .counter__panel, #product .buy__panel')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).length
    }));
    assert(restored.backgrounds.length>=2 && restored.backgrounds.every(b=>b.includes('gradient')), 'Original colored surfaces must remain visible');
    assert.equal(restored.overflowing,0,`Original sections at ${width}px must fit`);
    if(width===390) await page.locator('#buy').screenshot({path:'/private/tmp/pactra-original-mobile-purchase.png'});
  }
  checks.push('Original colored surfaces and product layouts at 320, 390, 720 and 1440px');
  await page.setViewportSize({width:1440,height:900});
  await page.locator('#how').screenshot({path:'/private/tmp/pactra-current-comparison.png'});
  await page.locator('#record').screenshot({path:'/private/tmp/pactra-current-record.png'});
  await page.locator('#start').screenshot({path:'/private/tmp/pactra-current-integrations.png'});
  for (const route of ['/product','/docs','/docs/mcp','/drill','/agent/41827','/refusal/13','/attest/41827','/console/','/console/new']) {
    const response=await page.goto(base+route,{waitUntil:'domcontentloaded'});
    assert.equal(response.status(),200,route);
    await page.waitForFunction(()=>document.body.innerText.trim().length>100);
    assert(await page.locator('#root').count(),`${route}: existing application shell missing`);
    checks.push(`Preserved route ${route}`);
  }
  await page.goto(base+'/docs',{waitUntil:'domcontentloaded'});
  await page.locator('a.nav__brand').click();
  await page.waitForSelector('.bg-video');
  assert.equal(await page.title(),'Pactra — One Budget for Every Agent');
  await page.locator('.page .cta').click();
  await page.waitForURL('**/console/new');
  checks.push('SPA home navigation and Get Started → mandate setup');

  const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await reduced.goto(base,{waitUntil:'domcontentloaded'});
  assert.deepEqual(await reduced.locator('[data-count]').allTextContents(),['1','3','3','0']);
  assert.equal(await reduced.locator('.headline span').first().evaluate(e=>getComputedStyle(e).opacity),'1');
  await reduced.locator('.burger').click();
  assert(await reduced.locator('.mobile-menu').isVisible());
  assert.equal(await reduced.locator('.mobile-link').nth(1).evaluate(e=>getComputedStyle(e).opacity),'1');
  checks.push('Reduced motion: visible headline/menu and final counters');
  await reduced.close();

  const fallback=await browser.newPage({viewport:{width:320,height:568}});
  await fallback.route('**/db.onlinewebfonts.com/**',route=>route.abort());
  await fallback.goto(base,{waitUntil:'domcontentloaded'});
  await fallback.evaluate(()=>document.fonts.ready);
  await fallback.waitForTimeout(1300);
  await fallback.screenshot({path:'/private/tmp/pactra-current-fallback.png'});
  assert(await fallback.evaluate(()=>document.fonts.check('28px "Geist Pixel Circle"')));
  const fits=await fallback.locator('.headline').evaluate(e=>e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1);
  if (!fits) console.log(await fallback.locator('.headline').evaluate(e=>({sw:e.scrollWidth,cw:e.clientWidth,sh:e.scrollHeight,ch:e.clientHeight,style:getComputedStyle(e).cssText})));
  assert(fits,'Fallback headline must fit');
  checks.push('Primary font unavailable: local Geist fallback fits');
  await fallback.close();
  assert.deepEqual(errors,[]);
  const report={checkedAt:new Date().toISOString(),base,passed:checks.length,checks,errors};
  fs.writeFileSync('docs/landing-validation.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
