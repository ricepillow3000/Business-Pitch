const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type()==='error' && errs.push(m.text().slice(0,300)));
  await p.goto((process.env.BASE || 'http://localhost:3000') + '/?q=low');
  await p.waitForFunction(() => window.__motion, null, { timeout: 30000 });
  // poll on a timer (independent of slow WebGL frames)
  await p.evaluate(() => {
    const m = window.__motion; const page = document.getElementById('page'); let wasHidden = false;
    window.__t = {};
    const iv = setInterval(() => {
      const now = performance.now(); const op = +getComputedStyle(page).opacity;
      if (op < 0.01) wasHidden = true;
      if (m.approach > 0 && !window.__t.open) window.__t.open = now;
      if (m.split > 0 && !window.__t.splitStart) window.__t.splitStart = now;
      if (wasHidden && op > 0.01 && !window.__t.uiStart) window.__t.uiStart = now;
      if (m.split >= 0.999 && !window.__t.splitEnd) window.__t.splitEnd = now;
      if (wasHidden && op >= 0.999 && !window.__t.uiEnd) window.__t.uiEnd = now;
      if (m.approach >= 0.999 && !window.__t.approachEnd) window.__t.approachEnd = now;
      if (window.__t.splitEnd && window.__t.uiEnd && window.__t.approachEnd) clearInterval(iv);
    }, 10);
  });
  await p.waitForFunction(() => window.__t && window.__t.splitEnd && window.__t.uiEnd && window.__t.approachEnd, null, { timeout: 60000 }).catch(async () => console.log('partial', JSON.stringify(await p.evaluate(() => [window.__t, window.__motion.approach, window.__motion.split, getComputedStyle(document.getElementById('page')).opacity, getComputedStyle(document.querySelector('[role=status]')).display]))));
  const t = await p.evaluate(() => window.__t);
  const r = (k) => ((t[k] - t.open) / 1000).toFixed(2) + 's';
  console.log('from curtain open → approach end', r('approachEnd'), '| split start', r('splitStart'), 'end', r('splitEnd'), '| UI fade start', r('uiStart'), 'end', r('uiEnd'));
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}/open.png`, timeout: 90000 });
  await p.mouse.wheel(0, 1600); await p.waitForTimeout(3500);
  await p.screenshot({ path: `${out}/zoomout.png`, timeout: 90000 });
  console.log('errors:', errs.join('\n') || 'none');
  await b.close();
})();
