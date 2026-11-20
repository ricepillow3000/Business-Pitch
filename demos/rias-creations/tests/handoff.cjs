// The walk-in lands on the hero in one shot: records the photo's on-screen size and position on every
// frame, from the loader's 100% to the end of the hero intro, on a laptop and an iPhone, and checks:
//   1. no jump: no single frame moves the photo by more than 6% of the whole move
//   2. one shot: the size and the position stop together (nothing slides after the zoom stops)
//   3. no readjust: once the hero takes over, the photo never moves again
// (John, 2026-11-19: "it zooms in into frame, but then readjusts last second")
// Run: node tests/handoff.cjs <site folder>
const { chromium, devices } = require('playwright');
let failed = 0;

(async () => {
  const b = await chromium.launch();
  for (const [vp, opts] of [['laptop', { viewport: { width: 1280, height: 800 } }], ['phone', { ...devices['iPhone 13'] }]]) {
    const c = await b.newContext(opts);
    await c.route(/^https?:/, (r) => r.abort());
    await c.addInitScript(() => {
      window.__trace = [];
      const rec = () => {
        const d = document.getElementById('entryImg'), entry = document.getElementById('entry'), h = document.getElementById('heroImg');
        if (entry && d && document.querySelector('#entry.walking')) {
          const r = d.getBoundingClientRect();
          window.__trace.push(['walk', r.width, r.left + r.width / 2, r.top + r.height / 2]);
        } else if (!entry && h) {   // the hero: where its object-fit cover photo really is (50% 45%)
          const r = h.getBoundingClientRect(), nw = h.naturalWidth || 1530, nh = h.naturalHeight || 2040;
          const s = Math.max(r.width / nw, r.height / nh), cw = nw * s, ch = nh * s;
          window.__trace.push(['hero', cw, r.left + (r.width - cw) * 0.5 + cw / 2, r.top + (r.height - ch) * 0.45 + ch / 2]);
        }
        if (!document.documentElement.classList.contains('intro-done')) requestAnimationFrame(rec);
      };
      requestAnimationFrame(rec);
    });
    const p = await c.newPage();
    await p.goto('file://' + process.argv[2] + '/index.html');
    await p.waitForFunction(() => document.documentElement.classList.contains('intro-done'), null, { timeout: 20000 });
    const tr = await p.evaluate(() => window.__trace);
    await c.close();

    const problems = [];
    const walk = tr.filter((r) => r[0] === 'walk'), hero = tr.filter((r) => r[0] === 'hero');
    if (walk.length < 10 || !hero.length) problems.push('could not record the walk-in');
    else {
      const range = Math.abs(walk[walk.length - 1][1] - walk[0][1]) || 1;
      // 1. no jump
      let jump = 0;
      for (let i = 1; i < walk.length; i++) jump = Math.max(jump, Math.abs(walk[i][1] - walk[i - 1][1]) / range);
      if (jump > 0.06) problems.push(`a ${(jump * 100).toFixed(0)}% jump in one frame`);
      // 2. one shot: after the size stops changing, the position must not change either
      const last = walk[walk.length - 1];
      const settled = walk.findIndex((r) => Math.abs(r[1] - last[1]) < 0.5);
      const slide = Math.max(...walk.slice(settled).map((r) => Math.hypot(r[2] - last[2], r[3] - last[3])));
      if (slide > 0.5) problems.push(`the photo slides ${slide.toFixed(1)} px after its zoom stops`);
      // 3. no readjust after the hand-off
      const h0 = hero[0];
      const move = Math.max(...hero.map((r) => Math.max(Math.abs(r[1] - h0[1]), Math.hypot(r[2] - h0[2], r[3] - h0[3]))));
      const land = Math.max(Math.abs(h0[1] - last[1]), Math.hypot(h0[2] - last[2], h0[3] - last[3]));
      if (land > 0.5) problems.push(`the hero takes over ${land.toFixed(1)} px away from where the walk-in landed`);
      if (move > 0.5) problems.push(`the hero readjusts by ${move.toFixed(1)} px after taking over`);
    }
    const ok = !problems.length; if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${vp.padEnd(6)}  ${ok ? 'one shot: no jump, no slide after the zoom, no readjust after the hand-off' : problems.join(' | ')}`);
  }
  await b.close();
  process.exit(failed ? 1 : 0);
})();
