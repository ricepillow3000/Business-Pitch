// Interaction tests for the clickable orb + storm:
//  1 hint toast appears after the intro   2 hotspot buttons open the right panel
//  3 Esc closes it                        4 Tab reaches both hotspots
//  5 clicking the orb VISUAL (3D raycast) opens the core panel
//  6 clicking the storm visual opens the engine panel   7 click outside closes
//  8 the hint is gone after the first interaction and stays gone after reload
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
const BASE = (process.env.BASE || 'http://localhost:3000') + '/?q=low';
const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`); };
const loaderDone = (p) => p.waitForFunction(() => getComputedStyle(document.querySelector('[role=status]')).display === 'none', null, { timeout: 180000 });
const panelId = (p) => p.evaluate(() => document.querySelector('[role=dialog]')?.getAttribute('data-panel') ?? null);
const waitPanel = (p, want) => p.waitForFunction((w) => (document.querySelector('[role=dialog]')?.getAttribute('data-panel') ?? null) === w, want, { timeout: 20000 }).then(() => true, () => false);
const project = (p, which) => p.evaluate((which) => {
  const st = window.__r3f; const world = st.scene.getObjectByName('moon-world');
  const V = st.camera.position.constructor;
  const orbY = window.__orbY ?? 2.7;
  const v = which === 'core' ? new V(0, orbY, 0) : new V(0, 0.8, 0);
  world.localToWorld(v); v.project(st.camera);
  return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
}, which);

(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 300)));
  await p.goto(BASE);
  await loaderDone(p);
  await p.waitForTimeout(2500);

  // 1 hint toast
  const hint = await p.evaluate(() => { const h = document.querySelector('[data-hint]'); return { active: h.dataset.active, op: +getComputedStyle(h).opacity, text: h.textContent }; });
  check('hint toast appears after intro', hint.active === '1' && hint.op > 0.5, JSON.stringify(hint));
  await p.screenshot({ path: `${out}/i1-hint.png`, timeout: 120000 });

  // 4 Tab reaches both hotspots
  await p.evaluate(() => document.activeElement && document.activeElement.blur());
  const reached = new Set();
  for (let i = 0; i < 25 && reached.size < 2; i++) {
    await p.keyboard.press('Tab');
    const h = await p.evaluate(() => document.activeElement?.getAttribute('data-hotspot'));
    if (h) reached.add(h);
  }
  check('Tab reaches both hotspots', reached.has('core') && reached.has('engine'), [...reached].join(','));

  // 2 hotspot buttons open the right panel (keyboard Enter on the focused one, then mouse)
  await p.focus('[data-hotspot=core]');
  await p.keyboard.press('Enter');
  const okCore = await waitPanel(p, 'core');
  const title = await p.evaluate(() => document.getElementById('info-panel-title')?.textContent);
  check('core hotspot opens "The JIDO Core"', okCore && title === 'The JIDO Core', title);
  await p.waitForTimeout(1600);
  await p.screenshot({ path: `${out}/i2-core-panel.png`, timeout: 120000 });
  const focusInside = await p.evaluate(() => document.querySelector('[role=dialog]').contains(document.activeElement));
  for (let i = 0; i < 6; i++) await p.keyboard.press('Tab');
  const stillInside = await p.evaluate(() => document.querySelector('[role=dialog]').contains(document.activeElement));
  check('focus is trapped in the panel', focusInside && stillInside);

  // 3 Esc closes
  await p.keyboard.press('Escape');
  check('Esc closes the panel', await waitPanel(p, null));
  await p.waitForTimeout(1200);

  await p.evaluate(() => document.querySelector('[data-hotspot=engine]').click());
  const okEngine = await waitPanel(p, 'engine');
  check('engine hotspot opens "The Workflow Engine"', okEngine && (await p.evaluate(() => document.getElementById('info-panel-title')?.textContent)) === 'The Workflow Engine');
  // 7 click outside closes
  await p.waitForTimeout(1200);
  await p.mouse.click(120, 400);
  check('click outside closes the panel', await waitPanel(p, null));
  await p.waitForTimeout(1500);

  // 5 click the orb visual (3D raycast, not the DOM button)
  const orb = await project(p, 'core');
  await p.mouse.move(orb.x, orb.y); await p.waitForTimeout(800);
  const hov = await p.evaluate(() => ({ hover: window.__motion.hover, label: document.querySelector('.has-cursor') ? 'fine' : 'n/a' }));
  await p.mouse.click(orb.x, orb.y);
  check('clicking the orb visual opens the core panel', await waitPanel(p, 'core'), `at ${Math.round(orb.x)},${Math.round(orb.y)} hover=${hov.hover}`);
  await p.keyboard.press('Escape'); await waitPanel(p, null); await p.waitForTimeout(1500);

  // 6 click the storm visual
  const storm = await project(p, 'engine');
  await p.mouse.move(storm.x, storm.y); await p.waitForTimeout(600);
  await p.mouse.click(storm.x, storm.y);
  check('clicking the storm visual opens the engine panel', await waitPanel(p, 'engine'), `at ${Math.round(storm.x)},${Math.round(storm.y)}`);
  await p.keyboard.press('Escape'); await waitPanel(p, null);

  // 8 hint hidden after the first interaction, and remembered
  const hint2 = await p.evaluate(() => document.querySelector('[data-hint]').dataset.active);
  const stored = await p.evaluate(() => localStorage.getItem('jido:hint-seen'));
  await p.reload(); await loaderDone(p); await p.waitForTimeout(2500);
  const hint3 = await p.evaluate(() => document.querySelector('[data-hint]').dataset.active);
  check('hint hides after first interaction and stays hidden', hint2 === '0' && stored === '1' && hint3 === '0', `after=${hint2} stored=${stored} reload=${hint3}`);

  console.log('errors:', [...new Set(errs)].slice(0, 6).join('\n') || 'none');
  await b.close();
  const pass = results.filter(Boolean).length;
  console.log(`${pass}/${results.length} passed`);
  process.exit(pass === results.length && !errs.length ? 0 : 1);
})();
