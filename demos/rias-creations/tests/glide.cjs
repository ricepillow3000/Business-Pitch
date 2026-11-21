// BP-18: three glide buttons, each pair of sections on one laptop screen, and a heavier mouse wheel.
// John, 2026-11-21: "make traversing buttons where they have to click and the clicking automatically traverses down
// slowly with a high quality scrolling animation as if it's being pulled to the next section ... at the very start ...
// services and prices are fully visible, so you don't need a button for Meet Ria. Then you can put a button underneath
// services and prices where it will scroll to the gallery and the reviews ... add it under review, and then it would
// scroll to book a visit, and you could see book a visit and locations and hours ... slightly move down the book a
// visit ... so it fully fits. That way we can use only 1, 2, 3 buttons, the entire website."
// And: "add scroll animations where the scrolling feels heavier than the static original one, where it looks like
// you're pulling the site down. Obviously not too slow, but not too fast."
// What this checks, in plain words:
//   a. the three buttons are there: "See services" in the hero (to Meet Ria), "See her work" under the price list
//      (to the Gallery), "Book a visit" under the reviews (to Book a visit); real links with a small down arrow
//   b. laptop 1280 x 800: a click glides the page there, slowly (1.2 to 2.4 s), always forward, eased (fastest in the
//      middle), and the section's heading lands just under the header
//   c. after each glide both sections of the pair are fully on screen (1280 x 800, 1440 x 900 and 1920 x 1080)
//   d. a wheel turned during a glide stops it at once (within 100 ms)
//   e. with reduced motion the jump is instant
//   f. the heavy wheel: on a laptop one notch (100 px) eases the page down 100 px over 250 to 700 ms, never past it;
//      a phone, reduced motion and the booking form's list are left alone
//   g. phones (390 and 320): the buttons are there and thumb-sized, each lands on its section, nothing scrolls
//      sideways, the page stays under 10 screens
// Run: node tests/glide.cjs <site folder> [folder for screenshots of each pair]
const { chromium, devices } = require('playwright');
const url = 'file://' + process.argv[2] + '/index.html', shots = process.argv[3];   // optional: a folder for a screenshot of each pair
let failed = 0;
const rec = (name, ok, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(58)}  ${detail}`); };
const laptop = { viewport: { width: 1280, height: 800 } };
const BUTTONS = [
  { label: 'See services', href: '#stylist', from: '.hero', pair: ['stylist', 'services'] },
  { label: 'See her work', href: '#work', from: '#services', pair: ['work', 'reviews'] },
  { label: 'Book a visit', href: '#book', from: '#reviews', pair: ['book', 'visit'] },
];
const sel = (bt) => `${bt.from} a.glide[href="${bt.href}"]`;

(async () => {
  const b = await chromium.launch();
  const open = async (opts, extra = {}) => {
    const c = await b.newContext({ ...opts, ...extra });
    await c.route(/^https?:/, (r) => r.abort());
    await c.addInitScript(() => { try { sessionStorage.setItem('ria-entered', '1'); } catch (e) {} });
    const p = await c.newPage(); p._errs = []; p.on('pageerror', (e) => p._errs.push(e.message));
    await p.goto(url); await p.waitForTimeout(2600);   // the hero intro has landed
    return { c, p };
  };
  // records scrollY on every frame for ms milliseconds, from now
  const record = (p, ms) => p.evaluate((ms) => { window.__rec = []; const t0 = performance.now();
    const f = (t) => { window.__rec.push([t - t0, scrollY]); if (t - t0 < ms) requestAnimationFrame(f); }; requestAnimationFrame(f); }, ms);
  const samples = (p) => p.evaluate(() => window.__rec);
  // how a recorded move went: when it started and stopped, forward only, fastest in the middle
  const shape = (s) => {
    const y0 = s[0][1], y1 = s[s.length - 1][1];
    const moving = s.filter((x) => Math.abs(x[1] - y0) > 0.5);
    if (!moving.length) return { moved: 0 };
    const tStart = s[s.indexOf(moving[0]) - 1]?.[0] ?? moving[0][0];
    const tEnd = s.find((x) => Math.abs(x[1] - y1) < 0.5 && x[0] >= moving[0][0])[0];
    const dir = Math.sign(y1 - y0), mono = s.every((x, i) => !i || (x[1] - s[i - 1][1]) * dir >= -0.5);
    const at = (t) => { let k = s.findIndex((x) => x[0] >= t); if (k < 0) k = s.length - 1; return s[k][1]; };
    const D = tEnd - tStart, speed = (a, z) => Math.abs(at(tStart + z * D) - at(tStart + a * D)) / ((z - a) * D);
    return { moved: Math.round(y1 - y0), dur: Math.round(D), mono, mid: speed(1 / 3, 2 / 3), first: speed(0, 0.1), last: speed(0.9, 1), over: Math.max(...s.map((x) => (x[1] - y1) * dir)) };
  };
  const landing = (p, id) => p.evaluate((id) => { const h = document.querySelector('#' + id + ' h2').getBoundingClientRect(), n = document.getElementById('nav').getBoundingClientRect();
    return Math.round(h.top - n.bottom); }, id);
  const pairInView = (p, ids) => p.evaluate((ids) => { const n = document.getElementById('nav').getBoundingClientRect().bottom;
    return ids.map((id) => { const r = document.getElementById(id).getBoundingClientRect(); return { id, top: Math.round(r.top - n), bottom: Math.round(innerHeight - r.bottom), ok: r.top >= n - 1 && r.bottom <= innerHeight + 1 }; }); }, ids);

  // a. the three buttons
  {
    const { c, p } = await open(laptop);
    const found = await p.evaluate((BT) => BT.map((bt) => { const a = document.querySelector(`${bt.from} a.glide[href="${bt.href}"]`);
      return { label: bt.label, ok: !!a && a.textContent.trim() === bt.label && a.classList.contains('btn') && !!a.querySelector('svg[aria-hidden="true"]') && a.offsetParent !== null }; }), BUTTONS);
    const order = await p.evaluate(() => { const after = (a, bsel) => { const x = document.querySelector(a), y = document.querySelector(bsel); return !!x && !!y && !!(x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING); };
      return after('.svc-note', '#services a.glide') && after('.carousel #viewport', '#reviews a.glide'); });
    rec('a. three glide buttons, in their places', found.every((f) => f.ok) && order,
      found.map((f) => `${f.label} ${f.ok ? 'ok' : 'MISSING'}`).join(', ') + `; under the price note and the reviews: ${order}`);
    await c.close();
  }

  // b, c at 1280 x 800; c at 1440 x 900 and 1920 x 1080: click 1, 2, 3 in turn, as a visitor would
  for (const [n, o] of [['1280', laptop], ['1440', { viewport: { width: 1440, height: 900 } }], ['1920', { viewport: { width: 1920, height: 1080 } }]]) {
    const { c, p } = await open(o);
    for (const bt of BUTTONS) {
      const there = await p.$(sel(bt));
      if (!there) { rec(`b/c. ${n}: ${bt.label}`, false, 'button MISSING'); continue; }
      await p.$eval(sel(bt), (a) => { const r = a.getBoundingClientRect(); if (r.bottom > innerHeight || r.top < 72) a.scrollIntoView({ block: 'center', behavior: 'instant' }); });
      await p.waitForTimeout(200);
      await record(p, 3200); await p.click(sel(bt)); await p.waitForTimeout(3300);
      const s = shape(await samples(p)), land = await landing(p, bt.pair[0]);
      if (n === '1280') {
        const ok = s.moved > 0 && s.dur >= 1200 && s.dur <= 2400 && s.mono && s.mid > s.first && s.mid > s.last && s.over <= 0.5 && land >= 0 && land <= 72;
        rec(`b. ${n}: ${bt.label} glides to #${bt.pair[0]}`, ok, s.moved ? `${s.moved}px in ${s.dur} ms, forward only ${s.mono}, speed first/middle/last ${s.first.toFixed(2)}/${s.mid.toFixed(2)}/${s.last.toFixed(2)} px/ms, heading ${land}px under the header` : 'DID NOT MOVE');
      }
      await p.waitForTimeout(900);   // the second section's blocks have landed
      const v = await pairInView(p, bt.pair);
      rec(`c. ${n}: after ${bt.label}, the pair is on one screen`, v.every((x) => x.ok), v.map((x) => `#${x.id} top ${x.top}px under the header, bottom ${x.bottom}px above the screen's foot`).join('; '));
      if (shots) await p.screenshot({ path: `${shots}/pair-${bt.pair.join('-')}-${n}.png` });
    }
    rec(`b/c. ${n}: no script errors`, !p._errs.length, p._errs.join(' / ') || 'none');
    await c.close();
  }

  // d. a wheel during a glide stops it at once
  {
    const { c, p } = await open(laptop);
    await p.mouse.move(640, 400);
    await record(p, 3000); await p.click(sel(BUTTONS[0])); await p.waitForTimeout(700);
    const y = await p.evaluate(() => scrollY); await p.mouse.wheel(0, -100); const tw = await p.evaluate(() => performance.now());
    await p.waitForTimeout(100); const y100 = await p.evaluate(() => scrollY);
    await p.waitForTimeout(1500); const yEnd = await p.evaluate(() => scrollY);
    const target = await p.evaluate(() => document.getElementById('stylist').getBoundingClientRect().top + scrollY - document.getElementById('nav').offsetHeight);
    rec('d. a wheel during a glide stops it within 100 ms', y > 20 && y100 <= y + 2 && yEnd <= y + 2 && yEnd < target - 50, `gliding at ${Math.round(y)}px, 100 ms after the wheel ${Math.round(y100)}px, later ${Math.round(yEnd)}px (the glide was going to ${Math.round(target)}px)`);
    await c.close();
  }

  // e. reduced motion: the jump is instant
  {
    const { c, p } = await open(laptop, { reducedMotion: 'reduce' });
    await p.click(sel(BUTTONS[0]));
    const at = await landing(p, 'stylist'); await p.waitForTimeout(500); const later = await landing(p, 'stylist');
    rec('e. reduced motion: the jump is instant', at >= 0 && at <= 72 && at === later, `heading ${at}px under the header at once, ${later}px half a second later`);
    await c.close();
  }

  // f. the heavy wheel
  const wheelOnce = async (p, x, y, dy = 100) => {
    await p.evaluate(() => { window.__prevented = null; addEventListener('wheel', (e) => { window.__prevented = e.defaultPrevented; }, { once: true }); });
    await p.mouse.move(x, y); await record(p, 1100); await p.waitForTimeout(50); await p.mouse.wheel(0, dy); await p.waitForTimeout(1200);
    return { s: shape(await samples(p)), prevented: await p.evaluate(() => window.__prevented) };
  };
  {
    const { c, p } = await open(laptop);
    await p.evaluate(() => scrollTo({ top: 1000, behavior: 'instant' })); await p.waitForTimeout(300);
    const { s, prevented } = await wheelOnce(p, 640, 400);
    const ok = prevented === true && s.moved === 100 && s.dur >= 250 && s.dur <= 700 && s.mono && s.over <= 0.5;
    rec('f. laptop: one wheel notch eases 100 px, no overshoot', ok, s.moved ? `${s.moved}px over ${s.dur} ms, forward only ${s.mono}, past the end by ${s.over.toFixed(1)}px, eased by the page ${prevented}` : `did not move; eased by the page ${prevented}`);
    // two notches quickly: the page follows the sum, still never past it
    await record(p, 1300); await p.mouse.wheel(0, 100); await p.waitForTimeout(80); await p.mouse.wheel(0, 100); await p.waitForTimeout(1300);
    const s2 = shape(await samples(p));
    rec('f. laptop: two quick notches add up to 200 px', s2.moved === 200 && s2.mono && s2.over <= 0.5, `${s2.moved}px, forward only ${s2.mono}`);
    // over the booking form's list of services: the page does not take the wheel
    await p.$eval('select[name=service]', (e) => e.scrollIntoView({ block: 'center', behavior: 'instant' })); await p.waitForTimeout(300);
    const r = await p.$eval('select[name=service]', (e) => { const b = e.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; });
    const over = await wheelOnce(p, r[0], r[1]);
    rec('f. laptop: over the booking list, the wheel is left alone', over.prevented === false, `eased by the page ${over.prevented}`);
    // nothing runs while idle
    const idle = await p.evaluate(() => new Promise((res) => { let n = 0; const o = window.requestAnimationFrame; window.requestAnimationFrame = (f) => { n++; return o(f); }; setTimeout(() => { window.requestAnimationFrame = o; res(n); }, 1000); }));
    rec('f. laptop: nothing runs while idle', idle === 0, `${idle} frames asked for in a quiet second`);
    rec('f. laptop: no script errors', !p._errs.length, p._errs.join(' / ') || 'none');
    await c.close();
  }
  for (const [name, o, extra] of [['phone (touch)', { ...devices['iPhone 13'] }, {}], ['reduced motion', laptop, { reducedMotion: 'reduce' }]]) {
    const { c, p } = await open(o, extra);
    await p.evaluate(() => scrollTo({ top: 1000, behavior: 'instant' })); await p.waitForTimeout(300);
    const { prevented } = await wheelOnce(p, 100, 300);
    rec(`f. ${name}: the wheel is the browser's own`, prevented === false, `eased by the page ${prevented}`);
    await c.close();
  }

  // g. phones
  for (const [n, o] of [['390', { ...devices['iPhone 13'] }], ['320', { viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
    const { c, p } = await open(o);
    const sizes = await p.evaluate((BT) => BT.map((bt) => { const a = document.querySelector(`${bt.from} a.glide[href="${bt.href}"]`); if (!a) return null; const r = a.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }), BUTTONS);
    const lands = [];
    for (const bt of BUTTONS) {
      if (!(await p.$(sel(bt)))) { lands.push(`${bt.label} MISSING`); continue; }
      await p.$eval(sel(bt), (a) => a.scrollIntoView({ block: 'center', behavior: 'instant' })); await p.waitForTimeout(300);
      await p.tap(sel(bt)); await p.waitForTimeout(2800);
      const l = await landing(p, bt.pair[0]); lands.push(`${bt.label} -> #${bt.pair[0]} heading ${l}px under the header${l >= 0 && l <= 72 ? '' : ' WRONG'}`);
    }
    const m = await p.evaluate(() => ({ side: document.documentElement.scrollWidth - innerWidth, screens: document.documentElement.scrollHeight / innerHeight }));
    const ok = sizes.every((s) => s && s[1] >= 44 && s[0] >= 44) && lands.every((x) => !/MISSING|WRONG/.test(x)) && m.side <= 0 && m.screens < 10 && !p._errs.length;
    rec(`g. ${n}: buttons, landings, no sideways scroll, under 10 screens`, ok, `buttons ${sizes.map((s) => (s ? s.join('x') : 'MISSING')).join(', ')}; ${lands.join('; ')}; ${m.side}px sideways; ${m.screens.toFixed(2)} screens${p._errs.length ? '; ERRORS ' + p._errs.join(' / ') : ''}`);
    await c.close();
  }

  await b.close();
  console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll BP-18 glide checks passed');
  process.exit(failed ? 1 : 0);
})();
