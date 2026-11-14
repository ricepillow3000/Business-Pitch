// Proves shader uniforms are live (not frozen at their first value — HANDOFF gotcha 1).
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto((process.env.BASE || 'http://localhost:3000') + '/?q=low');
  await p.waitForFunction(() => getComputedStyle(document.querySelector('[role=status]')).display === 'none', null, { timeout: 90000 });
  await p.waitForTimeout(1500);
  const read = () => p.evaluate(() => {
    const out = {};
    window.__r3f.scene.traverse(o => {
      const u = o.material && o.material.uniforms; if (!u) return;
      if (u.uSpin) out.cycloneTime = +u.uTime.value.toFixed(2);
      if (u.uStrike) out.beamStrike = +u.uStrike.value.toFixed(2);
      if (u.uZenith) out.skyTime = +u.uTime.value.toFixed(2);
      if (u.uOrbY) out.dustIntensity = +u.uIntensity.value.toFixed(4);
    });
    return out;
  });
  const a = await read();
  await p.waitForTimeout(3000);
  const c = await read();
  console.log('t1', JSON.stringify(a)); console.log('t2', JSON.stringify(c));
  const ok = c.cycloneTime > a.cycloneTime && c.skyTime > a.skyTime && c.beamStrike > 0.9 && c.dustIntensity > 0;
  console.log(ok ? 'PASS uniforms live' : 'FAIL uniforms frozen');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
