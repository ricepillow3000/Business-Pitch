// Intro sync: motion.reveal (WebGL scene) must start/end with the UI fade-in (#page opacity).
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type()==='error' && errs.push(m.text().slice(0,300)));
  await p.goto((process.env.BASE || 'http://localhost:3000') + '/?q=low');
  await p.waitForFunction(() => window.__motion && window.__r3f, null, { timeout: 90000 });
  // SwiftShader takes ~0.5 s per frame, which makes the 2.2 s tweens jump in 2–3 steps.
  // Pause WebGL rendering (the scene is already ready) so we time the GSAP timeline itself.
  await p.evaluate(() => window.__r3f.setFrameloop('never'));
  // poll on a timer (independent of slow WebGL frames); also sample mid-way pairs
  await p.evaluate(() => {
    const m = window.__motion; const page = document.getElementById('page'); let wasHidden = false;
    window.__t = {}; window.__pairs = [];
    const word = document.querySelector('.loader-word');
    const iv = setInterval(() => {
      const now = performance.now(); const op = +getComputedStyle(page).opacity;
      if (op < 0.01) wasHidden = true;
      const sc = word ? new DOMMatrix(getComputedStyle(word).transform).a : 1;
      window.__t.maxScale = Math.max(window.__t.maxScale || 1, sc);
      if (m.reveal > 0.01 && !window.__t.revealStart) window.__t.revealStart = now;
      if (wasHidden && op > 0.01 && !window.__t.uiStart) window.__t.uiStart = now;
      if (m.reveal >= 0.999 && !window.__t.revealEnd) window.__t.revealEnd = now;
      if (wasHidden && op >= 0.999 && !window.__t.uiEnd) window.__t.uiEnd = now;
      if (m.reveal > 0.02 && m.reveal < 0.98) window.__pairs.push([m.reveal, op]);
      if (window.__t.revealEnd && window.__t.uiEnd) clearInterval(iv);
    }, 10);
  });
  await p.waitForFunction(() => window.__t && window.__t.revealEnd && window.__t.uiEnd, null, { timeout: 90000 });
  const t = await p.evaluate(() => window.__t);
  const pairs = await p.evaluate(() => window.__pairs);
  const maxDiff = pairs.reduce((a, [r, o]) => Math.max(a, Math.abs(r - o)), 0);
  const ms = (k) => (t[k] - t.revealStart).toFixed(0) + 'ms';
  console.log(`loader word max scale ${t.maxScale.toFixed(2)}`);
  console.log(`scene reveal 0→1: start 0ms, end ${ms('revealEnd')} | UI fade: start ${ms('uiStart')}, end ${ms('uiEnd')}`);
  console.log(`max |reveal − UI opacity| over ${pairs.length} samples: ${maxDiff.toFixed(3)}`);
  const ok = Math.abs(t.uiStart - t.revealStart) < 120 && Math.abs(t.uiEnd - t.revealEnd) < 120 && maxDiff < 0.06 && t.maxScale > 5;
  console.log(ok ? 'PASS intro sync' : 'FAIL intro sync');
  await p.evaluate(() => window.__r3f.setFrameloop('always'));
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}/open.png`, timeout: 90000 });
  console.log('errors:', errs.join('\n') || 'none');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
