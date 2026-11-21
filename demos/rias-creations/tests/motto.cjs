// BP-18 part 2: the site lives up to Ria's motto, and says less.
// John, 2026-11-21: "ensure that this website reflects Ria's motto of enhancing beauty ... our main design. Whatever ...
// doesn't live up to the motto enhancing beauty, remove it, replace it with something that does." And: "assume that
// all users are drunk ... The more options and the more words they see, the more they have to think ... be to the point."
// What this checks, in plain words:
//   - the hero headline is her motto, "Enhancing beauty.", said once on the page
//   - no blurred shadows anywhere (photos, header, menus, tips, toasts); the gallery photos sit in her arched mirrors
//   - her brass instead of grey: no rgb(127 127 127) fills; field edges still 3:1 or better
//   - nothing loops, nothing overshoots (no keyframe step past its end)
//   - no stoplight dots; the open line in her gold; the rating is one quiet line; arrows and tab mark in her gold;
//     the confirmation tick in a small arch
//   - the phone menu: no search box, no group names, six choices; a laptop's Ctrl K still searches
//   - the simplicity cut: the shorter words John's critic chose, and fewer words on the page than before
// Run: node tests/motto.cjs <site folder>
const { chromium, devices } = require('playwright');
const fs = require('fs');
const dir = process.argv[2], url = 'file://' + dir + '/index.html';
const css = fs.readFileSync(dir + '/styles.css', 'utf8'), html = fs.readFileSync(dir + '/index.html', 'utf8');
const WORDS_BEFORE = 303;   // visible words in the page (main and footer) at 1280 x 800 before BP-18 part 2, measured by this test on the before copy
let failed = 0;
const rec = (name, ok, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(54)}  ${detail}`); };
const lum = (c) => { const v = c.match(/[\d.]+/g).map(Number); return [v[0], v[1], v[2]].map((x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }).reduce((s, x, i) => s + x * [0.2126, 0.7152, 0.0722][i], 0); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

(async () => {
  const b = await chromium.launch();
  const open = async (opts, look) => {
    const c = await b.newContext(opts); await c.route(/^https?:/, (r) => r.abort());
    await c.addInitScript((l) => { try { sessionStorage.setItem('ria-entered', '1'); if (l) localStorage.setItem('ria-look', l); } catch (e) {} }, look || null);
    const p = await c.newPage(); p._errs = []; p.on('pageerror', (e) => p._errs.push(e.message));
    await p.goto(url); await p.waitForTimeout(2600); await p.evaluate(() => window.__story && window.__story.revealAll()); await p.waitForTimeout(200);
    return { c, p };
  };
  const laptop = { viewport: { width: 1280, height: 800 } };

  // the stylesheet itself
  const shadows = [...css.matchAll(/box-shadow:\s*([^;}]+)/g)].map((m) => m[1]).filter((v) => !/^none/.test(v.trim()))
    .flatMap((v) => v.split(/,(?![^(]*\))/)).filter((s) => { const n = (s.replace(/rgb\([^)]*\)|var\([^)]*\)|color-mix\(.*\)/g, '').match(/-?[\d.]+(px)?/g) || []); return n.length >= 3 && parseFloat(n[2]) !== 0; });
  rec('No blurred shadow in the stylesheet', !shadows.length && !/--shadow-soft/.test(css), shadows.length ? shadows.join(' | ') : 'every box-shadow is a sharp ring or none');
  rec('No grey fills: her brass instead', !/rgb\(127 127 127/.test(css) && /--hover:/.test(css), (css.match(/rgb\(127 127 127[^)]*\)/g) || []).join(', ') || 'none left');
  rec('Nothing loops', !/infinite/.test(css), (css.match(/[^;{]*infinite[^;]*/g) || []).join(' | ') || 'no infinite animation');
  const over = [...css.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^}]*\})*)\s*\}/g)].flatMap((m) => [...m[2].matchAll(/([\d.]+%)\s*\{([^}]*)\}/g)]
    .filter((s) => !/^(0|100)%$/.test(s[1]) && [...s[2].matchAll(/scale\(([\d.]+)/g)].some((x) => +x[1] > 1)).map((s) => `${m[1]} ${s[1]}`));
  rec('No overshoot in any keyframes', !over.length, over.join(', ') || 'no step grows past its end');

  // the laptop page
  {
    const { c, p } = await open(laptop);
    const r = await p.evaluate(() => {
      document.querySelectorAll('.hero span[style*="clip"]').forEach((e) => (e.style.display = 'none'));
      const g = (s) => document.querySelector(s), cs = (s, pe) => getComputedStyle(g(s), pe);
      const h1 = g('.hero h1').innerText.replace(/\s+/g, ' ').trim();
      const main = g('main').innerText.replace(/\s+/g, ' ');
      const blur = [...document.querySelectorAll('.rail .ph, .about-arch, .nav, .card, .map-link, #tip, .cmd, .slot, .btn')].map((e) => getComputedStyle(e).boxShadow)
        .filter((v) => v !== 'none' && v.split(/,(?![^(]*\))/).some((s) => { const n = s.replace(/rgba?\([^)]*\)/g, '').match(/-?[\d.]+px/g) || []; return n.length >= 3 && parseFloat(n[2]) !== 0; }));
      const phs = [...document.querySelectorAll('.rail .ph')], after = getComputedStyle(phs[0], '::after');
      const dot = (s) => { const e = g(s); return e ? getComputedStyle(e, '::before').content : 'none'; };
      const hours = g('[data-hours]'); hours.dataset.state = 'open';
      const T = document.createElement('i'); T.style.color = 'var(--accent)'; document.body.append(T); const accent = getComputedStyle(T).color; T.remove();
      const field = g('select[name=service]');
      const groundOf = (e) => { for (; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (!/rgba\(.*, 0\)$/.test(c)) return c; } return getComputedStyle(document.body).backgroundColor; };
      const fieldEdge = getComputedStyle(field).boxShadow.match(/rgba?\([^)]*\)/)[0], ground = groundOf(field.parentElement);
      const arrow = getComputedStyle(g('#next'), '::after');
      const rv = g('#reviews'), arch = g('.review-arch'), hBefore = rv.getBoundingClientRect().height;
      if (arch) arch.style.display = 'none'; const hWithout = rv.getBoundingClientRect().height; if (arch) arch.style.display = '';
      const count = g('#count').getBoundingClientRect();
      // the visible words: no closed list of options, nothing read only by screen readers, only the review in view
      document.querySelectorAll('select, .sr, #count, span[style*="clip"], .slide[aria-hidden="true"]').forEach((e) => (e.dataset.wc = e.style.display, e.style.display = 'none'));
      const words = g('main').innerText.split(/\s+/).filter((w) => /\w/.test(w)).length;
      document.querySelectorAll('[data-wc]').forEach((e) => (e.style.display = e.dataset.wc, delete e.dataset.wc));
      return { h1, motto: (main.match(/Enhancing beauty/gi) || []).length, em: g('.hero h1 em')?.textContent, lede: g('.hero .lede').textContent.trim(), blur,
        arch: phs.length === 11 && phs.every((e) => getComputedStyle(e).borderTopLeftRadius === '999px' && getComputedStyle(e).borderBottomLeftRadius === '0px') && after.top === '8px' && /inset/.test(after.boxShadow),
        dots: [dot('[data-hours]'), dot('.status')], open: getComputedStyle(hours).color, accent, openGround: groundOf(hours),
        fieldCr: [fieldEdge, ground], score: !!g('.score'), note: !!g('.score-note'), rating: g('.score-meta a')?.textContent.trim(), ratingHref: g('.score-meta a')?.getAttribute('href'),
        arrow: arrow.content !== 'none' && arrow.top === '4px' && arrow.borderTopWidth === '1px' && getComputedStyle(g('#next')).boxShadow === 'none',
        ink: getComputedStyle(g('.tab-ink')).backgroundColor, mark: getComputedStyle(g('.state-mark')).borderTopLeftRadius,
        snips: getComputedStyle(g('.entry-snips .blade-a') || document.body).animationIterationCount,
        reviewArch: arch ? { shown: getComputedStyle(arch).display !== 'none', grows: Math.round(hBefore - hWithout), hidden: arch.getAttribute('aria-hidden') === 'true', src: arch.querySelector('img')?.getAttribute('src') } : null,
        countHidden: count.width <= 1 && count.height <= 1 && g('#count').textContent === '1 / 16', words };
    });
    rec('Hero headline is her motto', r.h1 === 'Enhancing beauty.' && r.em === 'beauty' && r.motto === 1 && /<span class="ln"><span>Enhancing<\/span><\/span><span class="ln"><span><em>beauty<\/em>\.<\/span><\/span>/.test(html),
      `"${r.h1}", gold word "${r.em}", said ${r.motto} time(s) on the page`);
    rec('Hero line under it', r.lede === 'Hair, brows and lashes. Walk-ins welcome.', `"${r.lede}"`);
    rec('No blurred shadows on photos, header, cards, menus', !r.blur.length, r.blur.join(' | ') || 'none');
    rec('Gallery photos in her arched mirrors', r.arch, r.arch ? '11 arch tops, a gold hairline 8 px inside' : 'NOT arched');
    rec('No stoplight dots; the open line in her gold', r.dots.every((d) => d === 'none') && r.open === r.accent && ratio(r.open, r.openGround) >= 4.5,
      `dots ${r.dots.join(', ')}; open line ${r.open} ${ratio(r.open, r.openGround).toFixed(1)}:1`);
    rec('Field edges in her brass, still 3:1 or better', ratio(...r.fieldCr) >= 3 && /127, 97, 53/.test(r.fieldCr[0]), `${r.fieldCr[0]} ${ratio(...r.fieldCr).toFixed(2)}:1 on ${r.fieldCr[1]}`);
    rec('Rating: one quiet line, no big numeral', !r.score && !r.note && r.rating === '4.5 from 29 Google reviews' && /google\.com\/maps/.test(r.ratingHref || ''), `"${r.rating}"; numeral ${r.score ? 'SHOWN' : 'gone'}; "Read them all" ${r.note ? 'SHOWN' : 'gone'}`);
    rec('Arrows wear the buttons\' gold hairline', r.arrow, r.arrow ? 'hairline 4 px inside, no grey box' : 'NOT the button language');
    rec('Tab mark in her gold; tick in a small arch', r.ink === r.accent && r.mark === '999px', `tab mark ${r.ink}; tick corner ${r.mark}`);
    rec('Review counter read aloud, not shown', r.countHidden);
    rec('Reviews: her work in an arch, adds no height', !!r.reviewArch && r.reviewArch.shown && r.reviewArch.grows === 0 && r.reviewArch.hidden && /work-spirals-480\.webp$/.test(r.reviewArch.src),
      r.reviewArch ? `shown ${r.reviewArch.shown}, adds ${r.reviewArch.grows}px, hidden from readers ${r.reviewArch.hidden}` : 'MISSING');
    rec('Fewer words on the page', r.words < WORDS_BEFORE, `${WORDS_BEFORE} words before, ${r.words} now`);
    // Ctrl K on a laptop still searches, with its box; no key hints
    await p.keyboard.press('Control+k'); await p.waitForTimeout(500);
    const k = await p.evaluate(() => ({ open: document.getElementById('cmd').open, box: !!document.getElementById('cmdInput').offsetParent, on: document.activeElement.id, foot: !!document.querySelector('.cmd-foot') }));
    rec('Laptop Ctrl K: search box, no key hints', k.open && k.box && k.on === 'cmdInput' && !k.foot, `open ${k.open}, box ${k.box}, cursor in ${k.on}, key hints ${k.foot ? 'SHOWN' : 'gone'}`);
    rec('Laptop: no script errors', !p._errs.length, p._errs.join(' / ') || 'none');
    await c.close();
  }
  // the loader's scissors snip four times, then rest
  rec('Loader scissors finite', /snip-a 560ms var\(--ease-in-out\) 4 alternate/.test(css) && /drift 48s linear 1;/.test(css), 'four snips, one drift');

  // the phone menu
  {
    const { c, p } = await open({ ...devices['iPhone 13'] });
    await p.tap('#menuBtn'); await p.waitForTimeout(700);
    const m = await p.evaluate(() => ({ box: !!document.getElementById('cmdInput').offsetParent, groups: [...document.querySelectorAll('.cmd-group')].filter((e) => e.offsetParent).length,
      items: [...document.querySelectorAll('.cmd-item span')].map((e) => e.textContent.trim()), font: getComputedStyle(document.querySelector('.cmd-item span')).fontFamily }));
    const dm = m.items.indexOf('Dark mode');
    rec('Phone menu: no search box, no group names, six choices', !m.box && !m.groups && m.items.length === 6 && !m.items.includes('Meet Ria') && m.items[dm - 1] === 'Gallery' && /Bodoni/.test(m.font),
      `box ${m.box ? 'SHOWN' : 'hidden'}, ${m.groups} group names, ${m.items.length} choices: ${m.items.join(', ')}`);
    const side = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    rec('Phone: review arch hidden, no sideways scroll', side <= 0 && !(await p.evaluate(() => { const a = document.querySelector('.review-arch'); return a && getComputedStyle(a).display !== 'none'; })), `${side}px sideways`);
    await c.close();
  }

  // the simplicity cut, word for word
  const t = (re) => re.test(html);
  const cut = [
    ['About: "Owner and stylist."', t(/<p class="lede" data-r="left">Owner and stylist\.<\/p>/) && !/class="motto"/.test(html)],
    ['Heading "Services"', t(/<h2 data-r="left">Services<\/h2>/)],
    ['Tabs "Hair" and "Color"; the form\'s lists match', t(/>Hair<\/button>/) && t(/>Color<\/button>/) && t(/<optgroup label="Hair">/) && t(/<optgroup label="Color">/)],
    ['Only "Priced at a consultation." under a service', (html.match(/<li[^>]*><h3>[^<]*<\/h3><span class="price">.*?<\/li>/g) || []).every((li) => !/<p>/.test(li) || /<p>Priced at a consultation\.<\/p>/.test(li))],
    ['"Some prices are samples."', t(/<p class="svc-note">Some prices are samples\.<\/p>/)],
    ['Gallery: no lede; "Face framing"', !/Recent work, straight from/.test(html) && t(/<b>Face framing<\/b>/)],
    ['Heading "Reviews"', t(/<h2 data-r="left">Reviews<\/h2>/)],
    ['Book: short lede, "Mobile", short consent, "Book", "Cancel"', t(/We text you a code to confirm\./) && t(/<span>Mobile<\/span>/) && t(/<p class="consent">Texts for this visit only\. Reply STOP to opt out\. <a href="privacy\.html">Privacy<\/a><\/p>/) && t(/<span id="submitLabel">Book<\/span>/) && t(/id="cancelReq">Cancel<\/button>/)],
    ['Location: no visible labels; parking reads on its own', (html.match(/<dt class="sr">/g) || []).length === 4 && t(/<dd>Parking is free, right outside<\/dd>/) && t(/Sunday closed/)],
    ['Footer: no copyright line', !/© 2026/.test(html)],
  ];
  for (const [n, ok] of cut) rec('Cut: ' + n, ok);

  await b.close();
  console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll BP-18 motto checks passed');
  process.exit(failed ? 1 : 0);
})();
