// Presses every control on the page, one at a time, on a laptop and a phone, and
// records what each one did. A control passes when it does something you can see
// (scrolls, opens, selects, switches, focuses or opens a link) and no script error
// happens. Then it presses a service row in every tab, opens every menu and dialog and presses what is inside.
// Run: node tests/buttons.cjs <site folder> [laptop|phone]
const { chromium, devices } = require('playwright');
const dir = process.argv[2];
const url = 'file://' + dir + '/index.html';
const rows = [];
let failed = 0;
const rec = (vp, name, effect, ok) => { rows.push({ vp, name, effect, ok }); if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${vp.padEnd(6)}  ${name.padEnd(42)}  ${effect}`); };

const snap = (p) => p.evaluate(() => ({
  y: Math.round(scrollY), x: [...document.querySelectorAll('.scroller')].map((s) => Math.round(s.scrollLeft)).join(','),
  hash: location.hash, theme: document.documentElement.dataset.theme,
  dialogs: [...document.querySelectorAll('dialog[open]')].map((d) => d.id).join(','),
  pops: [...document.querySelectorAll('.pop.open')].map((d) => d.id).join(','),
  aria: [...document.querySelectorAll('[aria-expanded],[aria-selected],[aria-checked],[aria-current]')].map((e) => [e.getAttribute('aria-expanded'), e.getAttribute('aria-selected'), e.getAttribute('aria-checked'), e.getAttribute('aria-current')].join('')).join('|'),
  focus: document.activeElement && (document.activeElement.id || document.activeElement.name || document.activeElement.className || document.activeElement.tagName),
  toasts: document.querySelectorAll('.toast').length,
  count: (document.getElementById('count') || {}).textContent,
  select: (document.querySelector('select[name=service]') || {}).value,
}));
const diff = (a, b) => Object.keys(a).filter((k) => a[k] !== b[k]).map((k) => k === 'y' ? `scrolled ${a.y}->${b.y}` : `${k}: ${String(a[k]).slice(0, 30)} -> ${String(b[k]).slice(0, 30)}`).join('; ');

(async () => {
  const b = await chromium.launch();
  const only = process.argv[3];   // optional: laptop or phone
  for (const [vp, opts] of [['laptop', { viewport: { width: 1280, height: 800 } }], ['phone', { ...devices['iPhone 13'] }]].filter(([v]) => !only || v === only)) {
    const ctx = await b.newContext({ ...opts, permissions: ['clipboard-read', 'clipboard-write'] });
    await ctx.addInitScript(() => { try { sessionStorage.setItem('ria-entered', '1'); } catch (e) {} });
    await ctx.route(/^https?:/, (r) => r.abort());     // stay offline: nothing leaves the test
    const fresh = async () => {
      const p = await ctx.newPage(); p._errs = []; p.on('pageerror', (e) => p._errs.push(e.message));
      await p.goto(url); await p.waitForTimeout(2600);
      await p.evaluate(() => window.__story && window.__story.revealAll()); await p.waitForTimeout(100);
      return p;
    };
    // 1. every visible control on the page
    const p0 = await fresh();
    const names = await p0.evaluate(() => {
      const els = [...document.querySelectorAll('a[href], button, select, input, [role=tab]')]
        .filter((e) => e.offsetParent && !e.closest('dialog:not([open]), .pop, [hidden], [inert], #entry'));
      return els.map((e, i) => { e.dataset.tid = i; return (e.getAttribute('aria-label') || e.textContent || e.name || e.placeholder || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 40); });
    });
    await p0.close();
    for (let i = 0; i < names.length; i++) {
      const p = await fresh();
      await p.evaluate(() => [...document.querySelectorAll('a[href], button, select, input, [role=tab]')]
        .filter((e) => e.offsetParent && !e.closest('dialog:not([open]), .pop, [hidden], [inert], #entry')).forEach((e, i) => (e.dataset.tid = i)));
      const sel = `[data-tid="${i}"]`;
      const info = await p.$eval(sel, (e) => ({ tag: e.tagName, href: e.getAttribute('href'), target: e.target, type: e.type }));
      await p.$eval(sel, (e) => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(250);
      // a "previous" arrow is greyed out on the first item, as it should be: step forward first
      let note = '';
      const partner = { workPrev: '#workNext', prev: '#next' }[await p.$eval(sel, (e) => (e.disabled ? e.id : ''))];
      if (partner) { await p.click(partner); await p.waitForTimeout(900); note = '(off on the first item; after Next) '; }
      const before = await snap(p);
      let effect = note, ok = true;
      const passed = await p.$eval(sel, (e) => e.disabled && e.classList.contains('slot'));
      if (passed) { effect = 'hidden: this time has already passed today'; }
      else if (info.href && /^tel:/.test(info.href)) { effect = `calls ${info.href.slice(4)}`; }
      else if (info.target === '_blank') {
        const [pop] = await Promise.all([ctx.waitForEvent('page', { timeout: 4000 }).catch(() => null), p.click(sel, { timeout: 5000 }).catch(() => null)]);
        effect = pop ? `opens new tab ${pop.url().replace(/^https?:\/\//, '').slice(0, 50)}` : 'NO NEW TAB'; ok = !!pop; if (pop) await pop.close();
      } else {
        try { await p.click(sel, { timeout: 3000 }); } catch (e) { effect = 'COULD NOT PRESS: ' + e.message.split('\n')[0]; ok = false; }
        await p.waitForTimeout(900);
        if (ok) {
          const after = await snap(p);
          if (/privacy|terms/.test(info.href || '')) { effect = 'opens ' + p.url().split('/').pop(); ok = /privacy|terms/.test(p.url()); }
          else { const d = diff(before, after) || (['INPUT', 'SELECT'].includes(info.tag) ? 'focused for typing' : 'NO VISIBLE EFFECT'); effect = note + d; ok = d !== 'NO VISIBLE EFFECT'; }
        }
      }
      if (p._errs.length) { ok = false; effect += ' | ERROR ' + p._errs.join(' / '); }
      rec(vp, names[i], effect, ok);
      await p.close();
    }

    // 2. what lives inside menus, popovers and dialogs
    const p = await fresh();
    // the map picture: one tap opens directions in Google Maps (John 2026-11-21: no Location buttons, a map instead)
    await p.$eval('.map-link', (e) => e.scrollIntoView({ block: 'center', behavior: 'instant' })); await p.waitForTimeout(500);
    const [mtab] = await Promise.all([ctx.waitForEvent('page', { timeout: 4000 }).catch(() => null), p.click('.map-link')]);
    const mhref = await p.getAttribute('.map-link', 'href');
    rec(vp, 'Map picture', mtab ? 'opens a new tab to ' + mhref.slice(0, 50) : 'NO NEW TAB', !!mtab && /google\.com\/maps\/dir/.test(mhref));
    if (mtab) await mtab.close();
    // tap a service row to book it (BP-17: replaces the Services mega menu), one row in every tab
    for (let i = 0; i < 5; i++) {
      await p.$eval('#t' + i, (e) => e.scrollIntoView({ block: 'center', behavior: 'instant' })); await p.waitForTimeout(200);
      await p.click('#t' + i); await p.waitForTimeout(600);
      const name = await p.$eval(`#p${i} li h3`, (e) => e.textContent.trim());
      await p.click(`#p${i} li >> nth=0`); await p.waitForTimeout(1200);
      const got = await p.$eval('select[name=service]', (e) => e.value);
      rec(vp, `Service row: ${name}`, `booking set to "${got}"`, got === name);
    }
    // search menu: every item
    // laptop: Ctrl K opens the search (no Search button, John 2026-11-21); phone: the menu button
    const openSearch = (pg) => (vp === 'laptop' ? pg.keyboard.press('Control+k') : pg.click('#menuBtn'));
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
    await openSearch(p); await p.waitForTimeout(500);
    const items = await p.$$eval('.cmd-item', (e) => e.map((x) => x.textContent.trim().replace(/\s+/g, ' ').slice(0, 40)));
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    for (let i = 0; i < items.length; i++) {
      const q = await fresh();
      await openSearch(q); await q.waitForTimeout(500);
      const before = await snap(q);
      const [pop] = await Promise.all([ctx.waitForEvent('page', { timeout: 1500 }).catch(() => null), q.click(`.cmd-item >> nth=${i}`)]);
      await q.waitForTimeout(1000);
      const after = await snap(q);
      let effect = pop ? 'opens new tab' : diff(before, after);
      if (pop) await pop.close();
      if (!effect && /call/i.test(items[i])) effect = 'calls the salon (tel: link)';
      rec(vp, `Search: ${items[i]}`, (effect || 'NO VISIBLE EFFECT') + (q._errs.length ? ' | ERROR ' + q._errs.join(' / ') : ''), !!effect && !q._errs.length);
      await q.close();
    }
    // the quiet search items (shown only when searched): Copy address still copies. Laptops only: since BP-18 the
    // phone menu is a short list to tap, with no search box
    if (vp === 'laptop') {
      const q = await fresh();
      await openSearch(q); await q.waitForTimeout(500);
      await q.fill('#cmdInput', 'copy address'); await q.waitForTimeout(200); await q.keyboard.press('Enter'); await q.waitForTimeout(700);
      const clip = await q.evaluate(() => navigator.clipboard.readText().catch(() => ''));
      rec(vp, 'Search: Copy address (when searched)', `clipboard: ${clip}`, /Rockbridge/.test(clip) && !q._errs.length);
      await q.close();
    }
    // photo viewer: open, then close with its button
    await p.evaluate(() => document.querySelector('#work').scrollIntoView()); await p.waitForTimeout(500);
    await p.click('#rail .photo-btn >> nth=0'); await p.waitForTimeout(900);
    const vsrc = await p.$eval('#viewerImg', (e) => e.getAttribute('src'));
    rec(vp, 'Photo viewer opens', `shows ${vsrc}`, await p.$eval('#viewer', (e) => e.open));
    rec(vp, 'Photo viewer: full-size photo', vsrc, /work-burgundy\.webp$/.test(vsrc));
    await p.click('#viewer button[aria-label]'); await p.waitForTimeout(800);
    rec(vp, 'Photo viewer: close button', (await p.$eval('#viewer', (e) => e.open)) ? 'STILL OPEN' : 'closes', !(await p.$eval('#viewer', (e) => e.open)));
    if (vp === 'phone') {
      // the menu sheet: a drag is not a tap, a tap outside still closes it
      await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
      await p.click('#menuBtn'); await p.waitForTimeout(600);
      const hb = await (await p.$('.cmd-handle')).boundingBox(), x = hb.x + hb.width / 2;
      await p.mouse.move(x, hb.y + 10); await p.mouse.down();
      for (let i = 1; i <= 8; i++) { await p.mouse.move(x, hb.y + 10 - i * 20); await p.waitForTimeout(40); }
      await p.waitForTimeout(150); await p.mouse.up(); await p.waitForTimeout(800);
      rec(vp, 'Menu sheet: pull up and let go', (await p.$eval('#cmd', (e) => e.open)) ? 'springs back, stays open' : 'CLOSED', await p.$eval('#cmd', (e) => e.open));
      await p.mouse.move(x, hb.y + 10); await p.mouse.down();
      for (let i = 1; i <= 10; i++) { await p.mouse.move(x, hb.y + 10 + i * 6); await p.waitForTimeout(50); }
      await p.waitForTimeout(120); await p.mouse.up(); await p.waitForTimeout(800);
      rec(vp, 'Menu sheet: short slow drag down', (await p.$eval('#cmd', (e) => e.open)) ? 'springs back, stays open' : 'CLOSED', await p.$eval('#cmd', (e) => e.open));
      await p.mouse.click(x, 20); await p.waitForTimeout(800);
      rec(vp, 'Menu sheet: tap outside', (await p.$eval('#cmd', (e) => e.open)) ? 'STILL OPEN' : 'closes', !(await p.$eval('#cmd', (e) => e.open)));
    }
    rec(vp, 'No script errors in menu tests', p._errs.join(' / ') || 'none', !p._errs.length);
    await p.close();
    await ctx.close();
  }
  await b.close();
  console.log(`\n${rows.length - failed} of ${rows.length} passed`);
  process.exit(failed ? 1 : 0);
})();
