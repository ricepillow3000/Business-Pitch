// Small polish fixes (BP-15, John 2026-11-21). Each check is one thing a visitor would notice:
//   a. phone: the map picture fills the width and keeps its shape (BP-17: a picture of Google's map, not a frame)
//   b. phone, preview copy: the map picture shows (nothing to block now), the address still names Lilburn Corner,
//      and the page never scrolls sideways
//   c. phone: the five service tabs sit on at most 2 rows with no gap between the rows
//   d. phone: the menu opens without popping up the keyboard; on a laptop, Ctrl K puts the cursor in the
//      box; Escape gives the focus back to the menu button
//   e. search finds what people type: "appointment", "phone", "how much", "sunday", "cash", "lashes", ...
//   f. laptop, first visit: while the header slides in, "Location" never runs into "Dark mode",
//      and "Dark mode" slides in with the other links
//   g. the grey "something is coming" pulses stop on their own (no endless animation)
//   h. no made-up tags on the menu; one plain line under it says some prices are samples (BP-17; shorter since BP-18)
// Run: node tests/polish.cjs <site folder> [<preview folder>]
const { chromium, devices } = require('playwright');
const site = process.argv[2], preview = process.argv[3];
let failed = 0;
const rec = (name, ok, detail) => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(44)}  ${detail}`); };
const entered = () => { try { sessionStorage.setItem('ria-entered', '1'); } catch (e) {} };
const phone = { ...devices['iPhone 13'] }, laptop = { viewport: { width: 1280, height: 800 } };

(async () => {
  const b = await chromium.launch();
  const open = async (opts, dir = site, skip = true) => {
    const c = await b.newContext(opts); await c.route(/^https?:/, (r) => r.abort());
    if (skip) await c.addInitScript(entered);
    const p = await c.newPage(); await p.goto('file://' + dir + '/index.html');
    return { c, p };
  };

  // a + c + d (phone)
  {
    const { c, p } = await open(phone); await p.waitForTimeout(2600);
    const m = await p.evaluate(() => { const r = document.querySelector('.map-link img').getBoundingClientRect(); return { ratio: r.height / r.width, w: r.width, vw: innerWidth }; });
    rec('a. phone: map picture full width, its own shape', Math.abs(m.ratio - 505 / 566) <= 0.01 && m.w >= m.vw - 41, `height/width ${m.ratio.toFixed(3)}, ${Math.round(m.w)}px wide in ${m.vw}px`);

    const tabs = await p.evaluate(() => {
      const t = document.querySelector('.tabs'), rows = [];
      [...t.querySelectorAll('.tab')].forEach((e) => { const r = e.getBoundingClientRect(); let row = rows.find((x) => Math.abs(x.top - r.top) < 2); if (!row) rows.push(row = { top: r.top, bottom: r.bottom }); row.bottom = Math.max(row.bottom, r.bottom); });
      rows.sort((x, y) => x.top - y.top);
      const gaps = rows.slice(1).map((r, i) => r.top - rows[i].bottom);
      return { rowGap: getComputedStyle(t).rowGap, rows: rows.length, gaps };
    });
    rec('c. phone: tabs on 2 rows, no gap between', tabs.rowGap === '0px' && tabs.rows <= 2 && tabs.gaps.every((g) => Math.abs(g) < 0.5),
      `row-gap ${tabs.rowGap}, ${tabs.rows} rows, gap between rows ${tabs.gaps.map((g) => g.toFixed(1) + 'px').join(', ') || 'none'}`);

    await p.evaluate(() => { scrollTo(0, 0); window.__inputFocused = false; document.getElementById('cmdInput').addEventListener('focusin', () => (window.__inputFocused = true)); });
    await p.waitForTimeout(300);
    await p.tap('#menuBtn'); await p.waitForTimeout(700);
    const ph = await p.evaluate(() => {
      const a = document.activeElement;
      return { open: document.getElementById('cmd').open, typed: window.__inputFocused, on: a.id || a.tagName, ring: getComputedStyle(a).outlineStyle !== 'none' && a.matches(':focus-visible') };
    });
    await p.keyboard.press('Escape'); await p.waitForTimeout(700);
    const back = await p.evaluate(() => ({ open: document.getElementById('cmd').open, on: document.activeElement.id || document.activeElement.tagName }));
    await c.close();
    const lc = await open(laptop); await lc.p.waitForTimeout(2600);
    await lc.p.keyboard.press('Control+k'); await lc.p.waitForTimeout(500);   // no Search button (John 2026-11-21): Ctrl K
    const lap = await lc.p.evaluate(() => document.activeElement.id);
    await lc.c.close();
    rec('d. phone menu: no keyboard pops up', ph.open && !ph.typed && !ph.ring, `menu ${ph.open ? 'open' : 'NOT OPEN'}, focus on ${ph.on}, search box focused: ${ph.typed}, focus ring shown: ${ph.ring}`);
    rec('d. laptop Ctrl K: cursor in the box', lap === 'cmdInput', `focus on ${lap}`);
    rec('d. Escape returns focus to the menu button', !back.open && back.on === 'menuBtn', `menu ${back.open ? 'STILL OPEN' : 'closed'}, focus on ${back.on}`);
  }

  // b (phone, preview copy)
  if (preview) {
    const { c, p } = await open(phone, preview); await p.waitForTimeout(2600);
    await p.evaluate(() => document.querySelector('.map-link').scrollIntoView({ behavior: 'instant' })); await p.waitForTimeout(800);
    const r = await p.evaluate(() => { const f = document.querySelector('.map-link img'), ad = document.querySelector('.info dd'); return { drawn: !!f.offsetParent && f.naturalWidth > 0, plate: !!ad.offsetParent && /Lilburn Corner/.test(ad.textContent), sw: document.documentElement.scrollWidth, w: document.documentElement.clientWidth }; });
    rec('b. preview phone: map shows, landmark kept', r.drawn && r.plate && r.sw <= r.w, `map picture ${r.drawn ? 'shown' : 'MISSING'}, "Lilburn Corner" in the address ${r.plate ? 'shown' : 'MISSING'}, page ${r.sw}px wide in a ${r.w}px screen`);
    await c.close();
  }

  // e (laptop search)
  {
    const { c, p } = await open(laptop); await p.waitForTimeout(2600);
    await p.keyboard.press('Control+k'); await p.waitForTimeout(500);
    const want = [['appointment', 'Book a visit'], ['booking', 'Book a visit'], ['phone', 'Call the salon'], ['how much', 'Services and prices'],
      ['sunday', 'Hours and directions'], ['walk in', 'Hours and directions'], ['cash', 'Hours and directions'], ['lashes', 'Eyelash extensions'],
      ['eyebrows', /^Eyebrow/], ['balayage', 'Balayage'], ['haircut', "Women's haircut"], ['hours', 'Hours and directions'],
      ['call', 'Call the salon'], ['wedding', 'Bridal hair'], ['xyzzy', null]];
    const bad = [];
    for (const [q, w] of want) {
      await p.fill('#cmdInput', q); await p.waitForTimeout(150);
      const first = await p.evaluate(() => { const i = document.querySelector('#cmdList .cmd-item span'); return i ? i.textContent.trim() : null; });
      const ok = w === null ? first === null : w instanceof RegExp ? w.test(first || '') : first === w;
      if (!ok) bad.push(`"${q}" -> ${first === null ? 'no matches' : '"' + first + '"'}`);
    }
    rec('e. search finds what people type', !bad.length, bad.length ? bad.join('; ') : `all ${want.length} queries put the right item first`);
    await c.close();
  }

  // f (laptop, fresh visit: the loader, the walk-in and the header entrance all play)
  {
    const { c, p } = await open(laptop, site, false);
    let worst = -Infinity, minOpacity = 1, samples = 0, endedAt = null;
    const t0 = Date.now();
    while (Date.now() - t0 < 20000) {
      const s = await p.evaluate(() => {
        const loc = document.querySelector('.nav-links a[href="#visit"]'), m = document.getElementById('modeBtn');
        if (!loc || !m) return null;
        return { over: loc.getBoundingClientRect().right - m.getBoundingClientRect().left, op: parseFloat(getComputedStyle(m).opacity), ended: !document.getElementById('entry') };
      }).catch(() => null);
      if (s) {
        samples++; worst = Math.max(worst, s.over); minOpacity = Math.min(minOpacity, s.op);
        if (s.ended && endedAt === null) endedAt = Date.now();
      }
      if (endedAt !== null && Date.now() - endedAt > 4000) break;
      await p.waitForTimeout(50);
    }
    rec('f. laptop: Location never runs into Dark mode', endedAt !== null && worst <= 0,
      `${samples} samples, ${endedAt === null ? 'ENTRY NEVER ENDED, ' : ''}closest: Location's right edge ${worst > 0 ? worst.toFixed(1) + 'px PAST' : (-worst).toFixed(1) + 'px before'} Dark mode`);
    rec('f. laptop: Dark mode slides in with the links', minOpacity < 1, `lowest Dark mode opacity ${minOpacity.toFixed(2)}`);
    await c.close();
  }

  // g + h
  {
    const { c, p } = await open(laptop); await p.waitForTimeout(2600);
    const h = await p.evaluate(() => ({ tags: document.querySelectorAll('.menu .tag').length, note: (document.querySelector('#panels + .svc-note') || {}).textContent }));
    rec('h. no made-up tags; the sample line says it', h.tags === 0 && h.note === 'Some prices are samples.', `${h.tags} tags; "${h.note}"`);

    const d = new Date(); d.setDate(d.getDate() + 2); if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    await p.evaluate(() => document.getElementById('book').scrollIntoView({ behavior: 'instant' })); await p.waitForTimeout(900);   // no hero button (John 2026-11-21)
    await p.selectOption('select[name=service]', { index: 3 });
    await p.evaluate((v) => { const i = document.querySelector('[name=date]'); i.value = v; i.dispatchEvent(new Event('change', { bubbles: true })); }, d.toISOString().slice(0, 10));
    await p.click('.slot:not([disabled]) >> nth=1');
    await p.fill('[name=name]', 'Maya'); await p.fill('[name=phone]', '7705550123');
    await p.click('#submitBtn');
    await p.waitForSelector('#sent h3:visible', { timeout: 4000 });
    const anim = await p.evaluate(() => {
      const skel = document.getElementById('otpSkel'), out = [];
      const look = (e, n) => e.getAnimations().forEach((a) => { const it = a.effect.getComputedTiming().iterations; out.push(`${n} ${a.animationName || 'animation'} x${it}`); });
      look(skel, '#otpSkel');
      document.querySelectorAll('.skeleton').forEach((e) => { if (e !== skel) look(e, '.' + e.className.split(' ').join('.')); });
      return { shown: !skel.hidden, list: out };
    });
    const endless = anim.list.filter((x) => /xInfinity$/.test(x));
    rec('g. waiting pulses stop on their own', anim.shown && anim.list.length > 0 && !endless.length,
      `${anim.shown ? '' : 'code placeholder NOT SHOWN; '}${anim.list.join(', ') || 'no animations found'}`);
    await c.close();
  }

  await b.close();
  console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed');
  process.exit(failed ? 1 : 0);
})();
