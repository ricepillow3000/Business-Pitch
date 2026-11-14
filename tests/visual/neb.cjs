// Cursor sweep over the orb (hover → brighter, more turbulent) — screenshots before/after.
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => (m.type()==='error'||m.type()==='warning') && errs.push(m.text().slice(0,300)));
  await p.goto((process.env.BASE || 'http://localhost:3000') + '/' + (process.env.Q ?? '?q=low'));
  await p.waitForFunction(() => getComputedStyle(document.querySelector('[role=status]')).display === 'none', null, { timeout: 180000 });
  await p.evaluate(() => { window.__simSteps = 20; });
  await p.waitForTimeout(8000);
  await p.evaluate(() => { window.__simSteps = 1; });
  await p.screenshot({ path: out + '/a-idle.png', timeout: 180000 });
  const c = await p.evaluate(() => { const st = window.__r3f; let pt = null; st.scene.traverse(o => { if (o.isPoints && o.material.uniforms && o.material.uniforms.uAttractors === undefined && o.material.uniforms.uBlue && o.material.uniforms.uPositions) { const v = o.getWorldPosition(new o.position.constructor()); v.project(st.camera); pt = { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; } }); return pt; });
  console.log('orb on screen', JSON.stringify(c));
  for (let i = 0; i <= 8; i++) { await p.mouse.move(c.x - 60 + i * 15, c.y - 10 + Math.sin(i) * 12); await p.waitForTimeout(250); }
  console.log('hover target:', await p.evaluate(() => window.__motion.hover));
  await p.waitForTimeout(1200);
  await p.screenshot({ path: out + '/b-hover.png', timeout: 180000 });
  console.log('errors:', [...new Set(errs)].slice(0, 6).join('\n') || 'none');
  await b.close();
})();
