const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto((process.env.BASE || 'http://localhost:3000') + '/?q=low');
  await p.waitForFunction(() => getComputedStyle(document.querySelector('[role=status]')).display === 'none', null, { timeout: 90000 });
  await p.waitForTimeout(1500);
  const read = () => p.evaluate(() => { const out = {}; window.__r3f.scene.traverse(o => { const u = o.material && o.material.uniforms; if (!u) return; if (u.uCollapse) out.cloudTime = +u.uTime.value.toFixed(2); if (u.uOpacity && u.uBeige && !u.uCollapse && !u.uReveal) out.beamOpacity = u.uOpacity.value; if (u.uGlow) out.backdropAspect = u.uAspect.value; if (u.uReveal) (out.reveal = out.reveal || []).push(+u.uReveal.value.toFixed(2)); }); return out; });
  console.log('t1', JSON.stringify(await read()));
  await p.mouse.wheel(0, 1600); await p.waitForTimeout(3000);
  console.log('t2 (scrolled)', JSON.stringify(await read()));
  await b.close();
})();
