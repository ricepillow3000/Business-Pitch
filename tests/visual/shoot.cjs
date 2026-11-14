const { chromium } = require('playwright');
const out = process.argv[2] || 'shots';
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text().slice(0, 300)); });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.goto((process.env.BASE || 'http://localhost:3000') + '/?q=low', { waitUntil: 'domcontentloaded' });
  await p.mouse.move(900, 400);
  await p.waitForTimeout(1500); await p.screenshot({ timeout: 90000, path: `${out}/01-loader.png` });
  // wait for loader outro
  let t0 = Date.now();
  await p.waitForFunction(() => { const el = document.querySelector('[role=status]'); return el && getComputedStyle(el).display === 'none'; }, null, { timeout: 60000 }).catch(e => errs.push('loader never finished'));
  console.log('loader done after', Date.now() - t0, 'ms extra');
  await p.waitForTimeout(3500); await p.mouse.move(820, 380); await p.waitForTimeout(800);
  await p.screenshot({ timeout: 90000, path: `${out}/02-hero.png` });
  const H = await p.evaluate(() => innerHeight);
  const steps = [['03-zoom-mid', 1.1], ['04-zoom-out', 1.2], ['05-statement', 0.4], ['06-busywork', 1.2], ['07-busywork2', 0.8], ['08-agents', 1.2], ['09-agents-scroll', 1.5], ['10-agents-scroll2', 1.5], ['11-process', 1.6], ['12-process2', 0.8], ['13-calc', 1.2], ['14-calc2', 0.6], ['15-reports', 1.2], ['16-faq', 1.2], ['17-cta', 1.2], ['18-cta2', 0.6], ['19-footer', 2]];
  for (const [name, f] of steps) {
    await p.mouse.wheel(0, H * f);
    await p.waitForTimeout(2200);
    await p.screenshot({ timeout: 90000, path: `${out}/${name}.png` });
  }
  console.log(errs.slice(0, 20).join('\n'));
  await b.close();
})();
