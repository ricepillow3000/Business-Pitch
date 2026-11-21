// The full visit: what a person does on Ria's site, top to bottom, on a laptop and an iPhone, in Light and Dark mode.
// It watches the loading screen and walk-in, scrolls through every section, searches, opens every menu, tab and photo,
// turns the reviews, books a visit end to end (code included), checks the map and the legal
// pages, and records every script error and every control that did nothing. Pictures of each step go to <out>.
// Run: node tests/tour.cjs <site folder> <out folder> [laptop|phone]
// (BP-15, John 2026-11-21: "go through the entire site, press all the buttons, search up using the search up bar,
// use the light and dark mode, literally everything from top to bottom")
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path');
const dir = process.argv[2], out = process.argv[3], only = process.argv[4];
fs.mkdirSync(out, { recursive: true });
const faults = [], facts = [];
const fault = (s) => { faults.push(s); console.log('FAULT  ' + s); };
const fact = (s) => { facts.push(s); console.log('       ' + s); };
const QUERIES = ['balayage', 'haircut', 'hours', 'call', 'eyebrow', 'price', 'parking', 'wedding', 'dark', 'xyzzy'];

(async () => {
  const b = await chromium.launch();
  for (const [vp, opts] of [['laptop', { viewport: { width: 1280, height: 800 } }], ['phone', devices['iPhone 13']]].filter(([v]) => !only || v === only)) {
    for (const theme of ['light', 'dark']) {
      const tag = `${vp}-${theme}`;
      console.log(`\n== ${tag}`);
      const ctx = await b.newContext({ ...opts, permissions: ['clipboard-read', 'clipboard-write'] });
      if (theme === 'dark') await ctx.addInitScript(() => { try { localStorage.setItem('ria-look', 'dark'); } catch (e) {} });
      const p = await ctx.newPage();
      const errs = [];
      p.on('pageerror', (e) => errs.push('script error: ' + e.message));
      p.on('console', (m) => { if (m.type() === 'error' && !/maps|googleapis|fonts|ERR_/.test(m.text())) errs.push('console: ' + m.text()); });
      const shot = (name, full) => p.screenshot({ path: path.join(out, `${tag}-${name}.png`), fullPage: !!full });
      const t0 = Date.now();
      await p.goto('file://' + dir + '/index.html');

      // 1. the loading screen and the walk-in (light only: the same frames in both modes)
      if (theme === 'light') { for (const ms of [300, 1200, 2200, 3200]) { await p.waitForTimeout(ms - (Date.now() - t0)); await shot(`entry-${ms}`); } }
      await p.waitForFunction(() => !document.getElementById('entry') || getComputedStyle(document.getElementById('entry')).display === 'none' || document.getElementById('entry').hidden, null, { timeout: 15000 }).catch(() => fault(`${tag}: the loading screen never went away`));
      await p.waitForTimeout(1500);
      fact(`${tag}: walk-in over after ${((Date.now() - t0) / 1000).toFixed(1)} s; theme ${await p.evaluate(() => document.documentElement.dataset.theme)}`);
      await shot('hero');

      // 2. every section, one screen at a time
      for (const id of ['stylist', 'services', 'work', 'reviews', 'book', 'visit']) {
        await p.evaluate((i) => document.getElementById(i).scrollIntoView({ block: 'start' }), id); await p.waitForTimeout(1700);
        await shot(`s-${id}`);
      }
      await p.evaluate(() => scrollTo(0, document.body.scrollHeight)); await p.waitForTimeout(1500); await shot('s-footer');
      const m = await p.evaluate(() => ({ h: document.documentElement.scrollHeight, vh: innerHeight, words: document.querySelector('main').innerText.split(/\s+/).filter(Boolean).length,
        buttons: document.querySelectorAll('main button, main a').length, sideways: document.documentElement.scrollWidth - innerWidth }));
      fact(`${tag}: page ${m.h} px = ${(m.h / m.vh).toFixed(1)} screens, ${m.words} words, ${m.buttons} links and buttons, ${m.sideways} px sideways`);
      if (m.sideways > 0) fault(`${tag}: the page scrolls sideways by ${m.sideways} px`);
      await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(600);
      if (theme === 'light') await shot('full', true);

      // 3. search: open it, try ten searches, press Enter on one
      const openSearch = async () => { if (vp === 'laptop') await p.keyboard.press('Control+k'); else await p.click('#menuBtn'); await p.waitForTimeout(500); };   // laptop: Ctrl K (no Search button)
      await openSearch();
      if (!(await p.evaluate(() => document.getElementById('cmd').open))) fault(`${tag}: the search did not open`);
      await shot('search-empty');
      const empty = await p.evaluate(() => [...document.querySelectorAll('#cmdList [role=option]')].map((o) => o.textContent.trim().replace(/\s+/g, ' ')));
      fact(`${tag}: search opens with ${empty.length} items: ${empty.slice(0, 12).join(' | ')}`);
      // since BP-18 the phone menu is a short list to tap (no search box): searching is tried on the laptop
      if (vp === 'phone') { await p.keyboard.press('Escape'); await p.waitForTimeout(600); }
      else {
      for (const q of QUERIES) {
        await p.fill('#cmdInput', q); await p.waitForTimeout(250);
        const r = await p.evaluate(() => ({ items: [...document.querySelectorAll('#cmdList [role=option]')].map((o) => o.textContent.trim().replace(/\s+/g, ' ')), empty: (document.querySelector('.cmd-empty') || {}).textContent }));
        fact(`${tag}: search "${q}": ${r.items.length ? r.items.slice(0, 4).join(' | ') : 'none. ' + (r.empty || '')}`);
        if (q === 'balayage') await shot('search-balayage');
      }
      await p.fill('#cmdInput', 'balayage'); await p.waitForTimeout(250); await p.keyboard.press('Enter'); await p.waitForTimeout(2200);
      const afterEnter = await p.evaluate(() => ({ open: document.getElementById('cmd').open, svc: document.querySelector('select[name=service]').value, inBook: (() => { const r = document.getElementById('book').getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; })() }));
      fact(`${tag}: Enter on "balayage": search closed ${!afterEnter.open}, service "${afterEnter.svc}", booking in view ${afterEnter.inBook}`);
      if (afterEnter.open || afterEnter.svc !== 'Balayage' || !afterEnter.inBook) fault(`${tag}: Enter on a search result did not book it`);
      await shot('search-enter');
      }

      // 4. the header row (laptop: no Services link, John 2026-11-21) and the five service tabs
      await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(500);
      if (vp === 'laptop') {
        const row = await p.evaluate(() => [...document.querySelectorAll('#nav .nav-links > *')].map((e) => e.textContent.trim()));
        fact(`${tag}: header links: ${row.join(', ')}`);
        if (row.includes('Services')) fault(`${tag}: the header still has a Services link`);
      }
      await p.evaluate(() => document.getElementById('services').scrollIntoView()); await p.waitForTimeout(1500);
      for (let i = 0; i < 5; i++) {
        await p.click('#t' + i); await p.waitForTimeout(450);
        const r = await p.evaluate((i) => ({ name: document.getElementById('t' + i).textContent.trim(), rows: document.querySelectorAll('#p' + i + ' li').length, shown: !document.getElementById('p' + i).hidden }), i);
        fact(`${tag}: tab "${r.name}": ${r.rows} services, shown ${r.shown}`);
        if (!r.shown || !r.rows) fault(`${tag}: tab ${r.name} showed nothing`);
      }
      await shot('services-tab5');

      // 5. the gallery: arrows, a photo opened large, closed again
      await p.evaluate(() => document.getElementById('work').scrollIntoView()); await p.waitForTimeout(1600);
      if (await p.isVisible('#workNext')) { const x0 = await p.evaluate(() => rail.scrollLeft); await p.click('#workNext'); await p.waitForTimeout(700); const x1 = await p.evaluate(() => rail.scrollLeft); fact(`${tag}: gallery Next moved ${x1 - x0} px`); if (x1 === x0) fault(`${tag}: gallery Next did nothing`); }
      await p.click('#rail li:nth-child(1) .photo-btn'); await p.waitForTimeout(700);
      const v = await p.evaluate(() => ({ open: document.getElementById('viewer').open, cap: document.getElementById('viewerCap').textContent, img: document.getElementById('viewerImg').naturalWidth }));
      fact(`${tag}: photo viewer open ${v.open}, caption "${v.cap}", image ${v.img} px wide`);
      if (!v.open || !v.img) fault(`${tag}: the photo did not open large`);
      await shot('viewer');
      await p.click('#viewerClose'); await p.waitForTimeout(500);
      if (await p.evaluate(() => document.getElementById('viewer').open)) fault(`${tag}: the photo viewer did not close`);

      // 6. the reviews: next, next, back
      await p.evaluate(() => document.getElementById('reviews').scrollIntoView()); await p.waitForTimeout(1600);
      const counts = [await p.textContent('#count')];
      for (const btn of ['#next', '#next', '#prev']) { await p.click(btn); await p.waitForTimeout(600); counts.push(await p.textContent('#count')); }
      fact(`${tag}: reviews ${counts.join(' -> ')}`);
      if (new Set(counts).size < 3) fault(`${tag}: the review arrows did not move`);

      // 7. booking, end to end: empty send, then a real request, the code, confirmed, again
      await p.evaluate(() => document.getElementById('book').scrollIntoView()); await p.waitForTimeout(1600);
      await p.selectOption('select[name=service]', ''); await p.click('#submitBtn'); await p.waitForTimeout(400);
      const e = await p.evaluate(() => [...document.querySelectorAll('#bookForm .err')].map((x) => x.textContent.trim()).filter(Boolean));
      fact(`${tag}: empty send says: ${e.join(' / ')}`);
      if (!e.length) fault(`${tag}: an empty booking said nothing`);
      await shot('book-errors');
      await p.selectOption('select[name=service]', 'Balayage');
      await p.fill('input[name=date]', '2026-11-23');   // a Monday
      await p.waitForTimeout(300);
      await p.click('.slot:not([disabled]) >> nth=1');
      await p.fill('input[name=name]', 'Maria'); await p.fill('input[name=phone]', '7705550123');
      await shot('book-filled');
      await p.click('#submitBtn'); await p.waitForTimeout(400);
      await shot('book-sent');
      await p.waitForSelector('#otpBox:not([hidden])', { timeout: 8000 }).catch(() => fault(`${tag}: the code box never came`));
      await p.fill('#otp', '123456'); await p.waitForTimeout(1500);
      const c = await p.evaluate(() => ({ shown: !document.getElementById('confirmed').hidden, text: document.getElementById('confirmedText').textContent }));
      fact(`${tag}: confirmed ${c.shown}: "${c.text}"`);
      if (!c.shown) fault(`${tag}: the booking never confirmed`);
      await shot('book-confirmed');
      await p.click('#again'); await p.waitForTimeout(600);
      if (await p.evaluate(() => document.getElementById('bookForm').hidden)) fault(`${tag}: Book another visit did not bring the form back`);

      // 8. the location: call, directions
      await p.evaluate(() => document.getElementById('visit').scrollIntoView()); await p.waitForTimeout(1600);
      const links = await p.evaluate(() => [...document.querySelectorAll('#visit a, #visit button')].map((a) => (a.textContent.trim().replace(/\s+/g, ' ') || a.getAttribute('aria-label')) + ' -> ' + (a.getAttribute('href') || 'button')));
      fact(`${tag}: location controls: ${links.join(' | ')}`);
      // 9. dark/light switch (laptop: in the row; phone: in the menu)
      const before = await p.evaluate(() => document.documentElement.dataset.theme);
      if (vp === 'laptop') { await p.evaluate(() => scrollTo(0, 0)); await p.click('#modeBtn'); }
      else { await openSearch(); await p.evaluate(() => [...document.querySelectorAll('#cmdList [role=option]')].find((o) => /mode/i.test(o.textContent)).click()); }
      await p.waitForTimeout(500);
      const after = await p.evaluate(() => document.documentElement.dataset.theme);
      fact(`${tag}: mode switch ${before} -> ${after}`);
      if (before === after) fault(`${tag}: the mode switch did nothing`);
      // 10. the legal pages and back
      for (const pg of ['privacy.html', 'terms.html']) {
        await p.evaluate((pg) => document.querySelector(`footer a[href="${pg}"]`).click(), pg); await p.waitForLoadState(); await p.waitForTimeout(700);
        const t = await p.title(); fact(`${tag}: ${pg} opens "${t}"`); await shot(pg.replace('.html', ''));
        await p.goBack(); await p.waitForTimeout(900);
      }
      for (const x of errs) fault(`${tag}: ${x}`);
      await ctx.close();
    }
  }
  await b.close();
  fs.writeFileSync(path.join(out, 'tour.txt'), facts.join('\n') + '\n\nFAULTS\n' + (faults.join('\n') || 'none') + '\n');
  console.log(`\n${faults.length} faults`);
  process.exit(faults.length ? 1 : 0);
})();
