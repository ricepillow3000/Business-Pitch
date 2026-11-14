const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => (m.type()==='error'||m.type()==='warning') && errs.push(m.text().slice(0,300)));
  await p.goto((process.env.BASE || 'http://localhost:3000') + '/');
  await p.waitForFunction(() => getComputedStyle(document.querySelector('[role=status]')).display === 'none', null, { timeout: 180000 });
  await p.evaluate(() => { window.__simSteps = 25; });
  await p.waitForTimeout(12000);
  await p.evaluate(() => { window.__simSteps = 2; });
  await p.screenshot({ path: out + '/a-idle.png', timeout: 180000 });
  // find the core on screen via the r3f state, then sweep the cursor through it and click
  const c = await p.evaluate(() => { const st = window.__r3f; let pt = null; st.scene.traverse(o => { if (o.isPoints && o.material.uniforms && o.material.uniforms.uPositions) { const v = o.getWorldPosition(new o.position.constructor()); v.project(st.camera); pt = { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; } }); return pt; });
  console.log('core on screen', JSON.stringify(c));
  for (let i = 0; i <= 12; i++) { await p.mouse.move(c.x - 160 + i * 27, c.y - 30 + Math.sin(i) * 25); await p.waitForTimeout(250); }
  await p.mouse.click(c.x + 40, c.y + 10);
  await p.waitForTimeout(1200);
  await p.screenshot({ path: out + '/b-interact.png', timeout: 180000 });
  console.log('errors:', [...new Set(errs)].slice(0, 6).join('\n') || 'none');
  await b.close();
})();
