// The loading screen (BP-16, John 2026-11-21), checked in a real browser on a laptop and an iPhone 13:
//   (a) every line can be read: each is fully swapped in for at least 400 ms, and "Come on in" for at least 600 ms
//       before the walk-in starts (John: "try to come up with something that doesn't bring wait time"; a line shown
//       for less reads as a glitch). A line counts from the first frame it is on the page or its swap finishing,
//       until its next swap starts (or, for the last line, until the walk starts).
//   (b) no added wait: the walk-in starts no later than it did before this change (median of 5 runs, +30 ms at most)
//   (c) once per tab: a new tab plays it, a refresh of that tab does not, another new tab plays it again
//       (John: "only once per tab")
// Outside fonts are blocked so every run loads the same files; the page's own clock (performance.now) is used.
// Run: node tests/entry.cjs <site folder>
const { chromium, devices } = require('playwright');
const url = 'file://' + process.argv[2] + '/index.html';
let failed = 0;
const rec = (name, ok, detail) => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(46)}  ${detail}`); };

// When the walk-in started before BP-16, in ms after the page opened (walk = the loading screen gets its "walking"
// class): this file's own timing run on the untouched copy of the site, 2026-11-21, headless Chromium, one run at a
// time; three runs of 5 tabs each gave medians of 1846 / 1846 / 1848 ms (laptop) and 1846 / 1853 / 1848 ms (iPhone 13).
const BEFORE_MEDIAN = { laptop: 1846, 'iPhone 13': 1848 };
const RUNS = 5;

// records every change of the status line and the moment the walk starts
const watch = () => {
  window.__ev = []; window.__walk = null;
  const go = () => {
    const line = document.getElementById('entryLine'), entry = document.getElementById('entry');
    if (!line || !entry) return requestAnimationFrame(go);
    const note = () => window.__ev.push([performance.now(), line.textContent, line.classList.contains('swap')]);
    note();
    new MutationObserver(note).observe(line, { attributes: true, childList: true, characterData: true, subtree: true });
    new MutationObserver(() => { if (window.__walk === null && entry.classList.contains('walking')) window.__walk = performance.now(); }).observe(entry, { attributes: true });
  };
  go();
};

(async () => {
  const b = await chromium.launch();
  for (const [vp, opts] of [['laptop', { viewport: { width: 1280, height: 800 } }], ['iPhone 13', { ...devices['iPhone 13'] }]]) {
    // (a) and (b): five fresh tabs, one at a time
    const walks = [], held = [], shownMs = {};
    for (let i = 0; i < RUNS; i++) {
      const c = await b.newContext(opts);
      await c.route(/^https?:/, (r) => r.abort());
      await c.addInitScript(watch);
      const p = await c.newPage();
      await p.goto(url);
      await p.waitForFunction(() => window.__walk !== null, null, { timeout: 15000 });
      const { ev, walk } = await p.evaluate(() => ({ ev: window.__ev, walk: window.__walk }));
      await c.close();
      // how long each line is fully shown (text in place, no swap) before the walk; the last one runs to the walk
      const run = {}; let cur = null, since = null;
      const close = (t) => { if (cur !== null) run[cur] = (run[cur] || 0) + (t - since); cur = null; };
      for (const [t, text, swap] of ev) {
        if (t > walk) break;
        if (swap) close(t); else if (cur !== text) { close(t); cur = text; since = t; }
      }
      const last = cur; close(walk);
      for (const [text, ms] of Object.entries(run)) shownMs[text] = Math.min(shownMs[text] ?? Infinity, ms);
      walks.push(walk); held.push(last === 'Come on in' ? run['Come on in'] : 0);
    }
    const med = [...walks].sort((x, y) => x - y)[Math.floor(RUNS / 2)];
    rec(`"Come on in" readable before the walk (${vp})`, Math.min(...held) >= 600,
      `shown ${held.map((h) => Math.round(h)).join(' / ')} ms before the walk (600 needed)`);
    const others = Object.entries(shownMs).filter(([text]) => text !== 'Come on in');
    rec(`every line readable (${vp})`, others.length > 0 && others.every(([, ms]) => ms >= 400),
      `${others.map(([text, ms]) => `"${text}" ${Math.round(ms)} ms`).join(', ')} (shortest of ${RUNS}; 400 needed)`);
    rec(`no added wait (${vp})`, med <= BEFORE_MEDIAN[vp] + 30,
      `walk starts at ${Math.round(med)} ms (median of ${RUNS}; before: ${BEFORE_MEDIAN[vp]} ms, +30 allowed)`);

    // (c) once per tab
    const c = await b.newContext(opts);
    await c.route(/^https?:/, (r) => r.abort());
    await c.addInitScript(watch);
    const plays = async (p) => {
      await p.goto(url);
      const walked = await p.waitForFunction(() => window.__walk !== null, null, { timeout: 8000 }).then(() => true, () => false);
      if (walked) await p.waitForFunction(() => !document.getElementById('entry'), null, { timeout: 8000 });
      return walked;
    };
    const t1 = await c.newPage();
    const first = await plays(t1);
    await t1.reload();   // the same tab, refreshed: the loading screen is skipped at once and never walks
    const skipped = await t1.evaluate(() => document.documentElement.classList.contains('no-entry') && !document.getElementById('entry'));
    await t1.waitForTimeout(3000);
    const quiet = skipped && await t1.evaluate(() => window.__walk === null);
    const t2 = await c.newPage();
    const second = await plays(t2);
    await c.close();
    rec(`once per tab (${vp})`, first && quiet && second,
      `new tab ${first ? 'plays' : 'DOES NOT play'}, refresh ${quiet ? 'skips it' : 'PLAYS IT AGAIN'}, another new tab ${second ? 'plays' : 'DOES NOT play'}`);
  }
  await b.close();
  process.exit(failed ? 1 : 0);
})();
