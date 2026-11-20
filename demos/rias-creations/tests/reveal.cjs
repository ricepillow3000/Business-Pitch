// Every block that animates on scroll flies in flat: from the left, the right or the bottom.
// No turning, folding, squashing or opening like a book (John, 2026-11-19).
// For each animated block, on a laptop and an iPhone: its waiting pose must be a pure slide
// (no rotation, no scale, no 3D), pointing the way its name says; mid-flight it must still be
// a pure slide; and once landed it sits exactly in place. Also: no sideways page scroll.
// Run: node tests/reveal.cjs <site folder>
const { chromium, devices } = require('playwright');
let failed = 0;

(async () => {
  const b = await chromium.launch();
  for (const [vp, opts] of [['laptop', { viewport: { width: 1280, height: 800 } }], ['phone', { ...devices['iPhone 13'] }]]) {
    const c = await b.newContext(opts);
    await c.route(/^https?:/, (r) => r.abort());
    await c.addInitScript(() => { try { sessionStorage.setItem('ria-entered', '1'); } catch (e) {} });
    const p = await c.newPage();
    await p.goto('file://' + process.argv[2] + '/index.html');
    await p.waitForTimeout(2800);
    const problems = [];
    // 1. the waiting poses, read before anything has been scrolled to
    const poses = await p.evaluate(() => [...document.querySelectorAll('[data-r]')].filter((e) => e.offsetParent).map((e) => {
      const m = new DOMMatrixReadOnly(getComputedStyle(e).transform);
      return { what: (e.tagName + '.' + (e.className || '').toString().split(' ')[0]).slice(0, 30), dir: e.dataset.r, is2D: m.is2D,
               a: m.a, b: m.b, c: m.c, d: m.d, x: m.e, y: m.f, op: +getComputedStyle(e).opacity, top: e.getBoundingClientRect().top };
    }));
    const below = poses.filter((q) => q.top > 820);            // not yet scrolled to
    if (below.length < 10) problems.push('too few waiting blocks to check: ' + below.length);
    const kinds = {};
    for (const q of below) {
      kinds[q.dir] = (kinds[q.dir] || 0) + 1;
      const flat = q.is2D && Math.abs(q.a - 1) < 1e-6 && Math.abs(q.d - 1) < 1e-6 && Math.abs(q.b) < 1e-6 && Math.abs(q.c) < 1e-6;
      if (!flat) { problems.push(`${q.what} (${q.dir}) turns, folds or scales while waiting`); continue; }
      const ok = { left: q.x < 0 && q.y === 0, right: q.x > 0 && q.y === 0, up: q.y > 0 && q.x === 0 }[q.dir];
      if (!ok) problems.push(`${q.what} says "${q.dir}" but waits at (${q.x}, ${q.y})`);
      if (q.op !== 0) problems.push(`${q.what} visible before its turn`);
    }
    if (!['left', 'right', 'up'].every((k) => kinds[k])) problems.push('missing a direction: ' + JSON.stringify(kinds));
    if (Object.keys(kinds).some((k) => !['left', 'right', 'up'].includes(k))) problems.push('an unexpected move: ' + JSON.stringify(kinds));
    // 2. mid-flight: scroll through slowly, sampling every moving block's transform
    let midBad = 0, midSeen = 0, overflow = 0;
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y <= H; y += 250) {
      await p.evaluate((y) => scrollTo(0, y), y);
      for (const t of [120, 260]) {
        await p.waitForTimeout(t === 120 ? 120 : 140);
        const r = await p.evaluate(() => {
          let bad = 0, seen = 0;
          document.querySelectorAll('[data-r].in').forEach((e) => {
            const m = new DOMMatrixReadOnly(getComputedStyle(e).transform); seen++;
            if (!(m.is2D && Math.abs(m.a - 1) < 1e-6 && Math.abs(m.d - 1) < 1e-6 && Math.abs(m.b) < 1e-6 && Math.abs(m.c) < 1e-6)) bad++;
          });
          // a phone zooms out to fit a page wider than the screen, so innerWidth grows too: compare with the screen itself
          return { bad, seen, overflow: Math.max(document.documentElement.scrollWidth - innerWidth, innerWidth - document.documentElement.clientWidth, Math.round(innerWidth - screen.width)) };
        });
        midBad += r.bad; midSeen += r.seen; overflow = Math.max(overflow, r.overflow);
      }
    }
    if (midSeen < 10) problems.push('caught too few blocks mid-flight: ' + midSeen);
    if (midBad) problems.push(`${midBad} mid-flight samples were not a flat slide`);
    if (overflow > 0) problems.push(`the page scrolled sideways by ${overflow} px`);
    // 3. landed: every block exactly in place
    await p.waitForTimeout(1500);
    const left = await p.evaluate(() => [...document.querySelectorAll('[data-r]')].filter((e) => e.offsetParent).length);
    const off = await p.evaluate(() => [...document.querySelectorAll('h2, .lede, .shell, .carousel, .rail li, .map-frame, .about-fig')]
      .filter((e) => e.offsetParent && (getComputedStyle(e).transform !== 'none' || +getComputedStyle(e).opacity < 1)).length);
    if (left) problems.push(`${left} blocks never arrived`);
    if (off) problems.push(`${off} blocks not exactly in place`);
    const ok = !problems.length; if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${vp.padEnd(6)}  ${ok
      ? `${below.length} blocks checked: ${kinds.left} from the left, ${kinds.right} from the right, ${kinds.up} from the bottom; ${midSeen} mid-flight samples all flat slides; no sideways scroll; all landed`
      : problems.slice(0, 5).join(' | ')}`);
    await c.close();
  }
  await b.close();
  process.exit(failed ? 1 : 0);
})();
