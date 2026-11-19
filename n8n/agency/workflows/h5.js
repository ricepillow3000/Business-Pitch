const whenCalled = trigger({
  type: 'n8n-nodes-base.executeWorkflowTrigger',
  version: 1.3,
  config: { name: 'When Called With One Lead', parameters: { inputSource: 'passthrough' } },
  output: [{ leadId: 'L-sample.example', failCount: 0, lead: { 'Lead ID': 'L-sample.example', Website: 'https://sample.example' }, ctx: { crmUrl: 'https://docs.google.com/spreadsheets/d/SAMPLE/edit' } }]
});

const plan = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Plan Pages', parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Checks the ONE lead this helper was given and plans which pages may be read.
const items = $input.all();
const first = (items[0] && items[0].json) || {};
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const safeOrigin = (w) => {
  const s = clean(w).toLowerCase();
  const proto = s.indexOf('https://') === 0 ? 'https:' : (s.indexOf('http://') === 0 ? 'http:' : '');
  if (!proto) return '';
  const host = s.split('://')[1].split('/')[0].split('?')[0].split('#')[0];
  const okChars = host.split('').every((ch) => (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') || ch === '.' || ch === '-');
  const numeric = host.split('').every((ch) => (ch >= '0' && ch <= '9') || ch === '.');
  if (!host || !okChars || numeric || host.indexOf('.') === -1 || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return '';
  return proto + '//' + host;
};
const lead = first.lead || {};
const origin = safeOrigin(lead.Website);
return [{ json: {
  leadId: clean(first.leadId), lead, failCount: Number(first.failCount) || 0, ctx: first.ctx || {},
  extraItemsIgnored: Math.max(items.length - 1, 0),
  hasWebsite: origin !== '', origin,
  robotsUrl: origin ? origin + '/robots.txt' : '', homeUrl: origin ? origin + '/' : '', contactUrl: origin ? origin + '/contact' : ''
} }];` } },
  output: [{ leadId: 'L-sample.example', hasWebsite: true, robotsUrl: 'https://sample.example/robots.txt', homeUrl: 'https://sample.example/', contactUrl: 'https://sample.example/contact' }]
});

const hasWebsite = ifElse({
  version: 2.2,
  config: {
    name: 'Has Website?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.hasWebsite }}'), operator: { type: 'boolean', operation: 'true', singleValue: true }, rightValue: '' }],
        combinator: 'and'
      }
    }
  }
});

const UA = 'AgencyLeadResearch/0.1 (n8n; reads public business pages, respects robots.txt)';

const fetchRobots = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'Fetch robots.txt',
    onError: 'continueRegularOutput',
    parameters: {
      method: 'GET',
      url: expr('{{ $json.robotsUrl }}'),
      sendHeaders: true,
      specifyHeaders: 'keypair',
      headerParameters: { parameters: [{ name: 'User-Agent', value: UA }] },
      options: {
        batching: { batch: { batchSize: 1, batchInterval: 1500 } },
        redirect: { redirect: { followRedirects: true, maxRedirects: 3 } },
        response: { response: { fullResponse: true, neverError: true, responseFormat: 'text', outputPropertyName: 'body' } },
        timeout: 8000
      }
    }
  },
  output: [{ statusCode: 200, body: 'User-agent: * Disallow: /admin' }]
});

const robotsRules = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Read robots.txt Rules', parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Obeys robots.txt. If the site asks bots not to read a page, that page is NOT fetched.
// This helper handles ONE lead per run, so there is nothing to mix up.
const p = $('Plan Pages').first().json;
const r = $input.first().json || {};
const NL = String.fromCharCode(10);
const status = Number(r.statusCode || 0);
const body = String(r.body !== undefined ? r.body : (r.data !== undefined ? r.data : ''));
let robotsOk = true;
let note = '';
let rules = [];
if (r.error || !status) { robotsOk = false; note = 'robots.txt could not be loaded (site down or too slow)'; }
else if (status >= 500) { robotsOk = false; note = 'robots.txt gave server error ' + status; }
else if (status < 400) {
  const groups = [];
  let cur = null;
  let lastWasAgent = false;
  body.split(NL).forEach((line) => {
    const t = line.split('#')[0].trim();
    const c = t.indexOf(':');
    if (c === -1) return;
    const key = t.slice(0, c).trim().toLowerCase();
    const val = t.slice(c + 1).trim();
    if (key === 'user-agent') {
      if (!cur || !lastWasAgent) { cur = { agents: [], rules: [] }; groups.push(cur); }
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
    } else if ((key === 'allow' || key === 'disallow') && cur) {
      cur.rules.push({ allow: key === 'allow', path: val.split('*')[0].split('$')[0] });
      lastWasAgent = false;
    } else { lastWasAgent = false; }
  });
  const mine = groups.filter((g) => g.agents.some((a) => a.indexOf('agencyleadresearch') !== -1));
  const star = groups.filter((g) => g.agents.indexOf('*') !== -1);
  (mine.length ? mine : star).forEach((g) => { rules = rules.concat(g.rules); });
}
const allowedPath = (path) => {
  let best = null;
  rules.forEach((rule) => {
    if (!rule.path || path.indexOf(rule.path) !== 0) return;
    if (!best || rule.path.length > best.path.length || (rule.path.length === best.path.length && rule.allow)) best = rule;
  });
  return !best || best.allow;
};
const homeAllowed = robotsOk && allowedPath('/');
const contactAllowed = homeAllowed && allowedPath('/contact');
if (robotsOk && !homeAllowed) note = 'robots.txt asks automated tools not to read this website';
return [{ json: Object.assign({}, p, { robotsOk, homeAllowed, contactAllowed, robotsNote: note, contactUrl: contactAllowed ? p.contactUrl : p.homeUrl }) }];` } },
  output: [{ leadId: 'L-sample.example', robotsOk: true, homeAllowed: true, contactAllowed: true, robotsNote: '', homeUrl: 'https://sample.example/', contactUrl: 'https://sample.example/contact' }]
});

const siteAllows = ifElse({
  version: 2.2,
  config: {
    name: 'Site Allows Reading?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.homeAllowed }}'), operator: { type: 'boolean', operation: 'true', singleValue: true }, rightValue: '' }],
        combinator: 'and'
      }
    }
  }
});

const pageOptions = {
  batching: { batch: { batchSize: 1, batchInterval: 1500 } },
  redirect: { redirect: { followRedirects: true, maxRedirects: 3 } },
  response: { response: { fullResponse: true, neverError: true, responseFormat: 'text', outputPropertyName: 'body' } },
  timeout: 10000
};

const fetchHome = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'Fetch Homepage',
    onError: 'continueRegularOutput',
    parameters: {
      method: 'GET',
      url: expr('{{ $json.homeUrl }}'),
      sendHeaders: true,
      specifyHeaders: 'keypair',
      headerParameters: { parameters: [{ name: 'User-Agent', value: UA }] },
      options: pageOptions
    }
  },
  output: [{ statusCode: 200, body: '<html><body><h1>Sample Plumbing</h1><p>Call us today.</p></body></html>' }]
});

const fetchContact = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'Fetch Contact Page',
    onError: 'continueRegularOutput',
    parameters: {
      method: 'GET',
      url: expr('{{ $("Read robots.txt Rules").first().json.contactUrl }}'),
      sendHeaders: true,
      specifyHeaders: 'keypair',
      headerParameters: { parameters: [{ name: 'User-Agent', value: UA }] },
      options: pageOptions
    }
  },
  output: [{ statusCode: 200, body: '<html><body><form><input type="email"></form></body></html>' }]
});

const extract = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Extract Website Facts', parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Pulls plain facts out of the pages with fixed rules (no AI): emails, phones, booking tools,
// forms, chat widgets. Then prepares the AI request. Website text is passed as DATA only.
// ONE lead per run: every result below is stamped with this lead's ID.
const p = $('Plan Pages').first().json;
const cfg = p.ctx || {};
const NL = String.fromCharCode(10);
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const tryFirst = (name) => { try { return $(name).first().json; } catch (e) { return null; } };
const robots = p.hasWebsite ? tryFirst('Read robots.txt Rules') : null;
const home = robots && robots.homeAllowed ? tryFirst('Fetch Homepage') : null;
const contact = robots && robots.contactAllowed && robots.contactUrl !== robots.homeUrl ? tryFirst('Fetch Contact Page') : null;
const lead = p.lead || {};
const SP = new RegExp('[ ' + String.fromCharCode(9, 10, 13, 160) + ']+', 'g');
const page = (r, url) => {
  if (!r) return { ok: false, status: 0, html: '', text: '', url };
  const status = Number(r.statusCode || 0);
  const body = String(r.body !== undefined ? r.body : (r.data !== undefined ? r.data : '')).slice(0, 400000);
  const ok = !r.error && status >= 200 && status < 400 && body.length > 0;
  let t = ok ? body : '';
  t = t.replace(new RegExp('<(script|style|noscript|svg|template)[^>]*>[^]*?</(script|style|noscript|svg|template)>', 'gi'), ' ')
    .replace(new RegExp('<!--[^]*?-->', 'g'), ' ')
    .replace(new RegExp('<[^>]+>', 'g'), ' ');
  [['&nbsp;', ' '], ['&amp;', '&'], ['&quot;', '"'], ['&#39;', "'"], ['&apos;', "'"], ['&lt;', '<'], ['&gt;', '>'], ['&rsquo;', "'"], ['&lsquo;', "'"], ['&ldquo;', '"'], ['&rdquo;', '"'], ['&ndash;', '-'], ['&mdash;', '-']]
    .forEach((pair) => { t = t.split(pair[0]).join(pair[1]); });
  t = t.replace(new RegExp('&#([0-9]{1,6});', 'g'), (m, n) => String.fromCharCode(Number(n))).replace(SP, ' ').trim();
  return { ok, status, html: ok ? body : '', text: t, url };
};
const h = page(home, p.homeUrl);
const c = page(contact, robots ? robots.contactUrl : '');
const htmlAll = (h.html + ' ' + c.html).toLowerCase();
const textAll = h.text + ' ' + c.text;
const textLow = textAll.toLowerCase();
const siteDomain = p.origin ? p.origin.split('//')[1] : '';
// Emails published on the business's own pages
const emailRe = new RegExp('[a-z0-9._%+-]+@[a-z0-9-]+([.][a-z0-9-]+)*[.][a-z]{2,}', 'gi');
const badEnd = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.css', '.js'];
const badDomains = ['sentry.io', 'wixpress.com', 'example.com', 'domain.com', 'email.com'];
const emails = [];
((h.html + ' ' + c.html).match(emailRe) || []).forEach((e) => {
  const s = e.toLowerCase();
  const d = s.split('@')[1];
  if (badEnd.some((b) => s.endsWith(b)) || badDomains.indexOf(d) !== -1 || emails.indexOf(s) !== -1) return;
  emails.push(s);
});
emails.sort((a, b) => Number(b.split('@')[1].endsWith(siteDomain)) - Number(a.split('@')[1].endsWith(siteDomain)));
const emailPage = (e) => (h.html.toLowerCase().indexOf(e) !== -1 ? h.url : c.url);
// Phone numbers
const phones = [];
const addPhone = (raw) => {
  let d = raw.split('').filter((ch) => ch >= '0' && ch <= '9').join('');
  if (d.length === 11 && d[0] === '1') d = d.slice(1);
  if (d.length === 10 && phones.indexOf(d) === -1) phones.push(d);
};
(textAll.match(new RegExp('[(]?[2-9][0-9]{2}[)]?[-. ]?[0-9]{3}[-. ][0-9]{4}', 'g')) || []).forEach(addPhone);
(htmlAll.match(new RegExp('tel:[+0-9() .-]{7,20}', 'g')) || []).forEach(addPhone);
const fmtPhone = (d) => d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6);
// Booking tools, forms, chat
const PLATFORMS = [['calendly.com', 'Calendly'], ['acuityscheduling.com', 'Acuity'], ['squareup.com/appointments', 'Square Appointments'], ['setmore.com', 'Setmore'], ['booksy.com', 'Booksy'], ['vagaro.com', 'Vagaro'], ['mindbodyonline.com', 'Mindbody'], ['schedulicity.com', 'Schedulicity'], ['housecallpro.com', 'Housecall Pro'], ['servicetitan.com', 'ServiceTitan'], ['getjobber.com', 'Jobber'], ['zocdoc.com', 'Zocdoc'], ['glossgenius.com', 'GlossGenius'], ['fresha.com', 'Fresha'], ['simplybook.me', 'SimplyBook'], ['youcanbook.me', 'YouCanBook.me'], ['opentable.com', 'OpenTable']];
const platforms = PLATFORMS.filter((x) => htmlAll.indexOf(x[0]) !== -1).map((x) => x[1]);
const BOOK_WORDS = ['book online', 'book now', 'online booking', 'schedule online', 'schedule now', 'book an appointment online'];
const bookingWords = BOOK_WORDS.filter((w) => textLow.indexOf(w) !== -1);
const onlineBookingSeen = platforms.length > 0 || bookingWords.length > 0;
const contactForm = htmlAll.indexOf('<form') !== -1 && (htmlAll.indexOf('type="email"') !== -1 || htmlAll.indexOf("type='email'") !== -1 || htmlAll.indexOf('<textarea') !== -1);
const CHATS = ['tawk.to', 'intercom', 'drift.com', 'livechat', 'crisp.chat', 'tidio', 'podium', 'birdeye', 'js.hs-scripts.com', 'zendesk', 'olark', 'smartsupp'];
const chatWidget = CHATS.some((x) => htmlAll.indexOf(x) !== -1);
const emergency = ['24/7', '24 hours', 'emergency'].some((x) => textLow.indexOf(x) !== -1);
const websiteReachable = h.ok && h.text.length >= 50;
const phoneOrFormOnly = websiteReachable && !onlineBookingSeen && !chatWidget && (phones.length > 0 || contactForm);
// Our own check for hidden instructions aimed at AI tools
const INJECT = ['ignore previous instructions', 'ignore all previous', 'ignore the above', 'disregard previous', 'disregard all prior', 'system prompt', 'you are now', 'new instructions:', 'as an ai language model', 'do not tell the user'];
const injectionPhrases = INJECT.filter((x) => textLow.indexOf(x) !== -1);
// Decide what happens next
let skipReason = '';
let retryLater = false;
const next = (Number(p.failCount) || 0) + 1;
if (!p.hasWebsite) skipReason = 'No usable website listed';
else if (robots && !robots.robotsOk) { skipReason = robots.robotsNote; retryLater = next < 3; }
else if (robots && !robots.homeAllowed) skipReason = robots.robotsNote;
else if (!websiteReachable) { skipReason = 'Homepage did not load (status ' + (h.status || 'none') + ')'; retryLater = next < 3; }
const needsAi = websiteReachable && (h.text + ' ' + c.text).trim().length >= 120 && !retryLater;
const facts = {
  websiteReachable, onlineBookingSeen, platforms, bookingWords, contactForm, chatWidget, emergency, phoneOrFormOnly,
  emailsFound: emails.slice(0, 3), firstEmail: emails[0] || '', firstEmailPage: emails[0] ? emailPage(emails[0]) : '',
  phonesFound: phones.slice(0, 3).map(fmtPhone), injectionPhrases,
  pagesRead: [h.ok ? h.url : '', c.ok ? c.url : ''].filter(Boolean)
};
const OPPS = ['Online booking / scheduling', 'Missed-call text back', 'Quote / lead follow-up', 'Appointment reminders', 'Website chat / FAQ assistant', 'Review requests', 'Intake form automation', 'No clear opportunity'];
const safe = (v, n) => clean(v).split('<<<').join('').split('>>>').join('').slice(0, n);
const yn = (b) => (b ? 'yes' : 'no');
const instructions = [
  'TASK: Research one small local business for a possible AI automation project. Use ONLY the website text provided below.',
  'Business (from our CRM): ' + safe(lead['Business Name'], 120) + ' | Industry: ' + safe(lead.Industry, 60) + ' | City: ' + safe(lead.City, 60),
  'Facts our own code detected on the website (reliable): online booking seen: ' + yn(onlineBookingSeen) + (platforms.length ? ' (' + platforms.join(', ') + ')' : '') +
    '; contact form: ' + yn(contactForm) + '; chat widget: ' + yn(chatWidget) + '; phone numbers found: ' + phones.length + '; 24/7 or emergency wording: ' + yn(emergency) + '.',
  'Fill in:',
  '- business_summary: 1-2 sentences on what the business does, based only on the text.',
  '- evidence_quotes: up to 4 short EXACT quotes (copy 5-25 words exactly as written) that support your analysis. Each item: {"quote": "...", "page": "homepage" or "contact"}.',
  '- primary_opportunity: exactly one of: ' + OPPS.join(' | ') + '.',
  '- process_that_could_benefit: which business process this would improve (for example how new customers book or ask for a quote).',
  '- proposed_solution: a simple automation the agency COULD build. Write it as a proposal. Never say it already exists, was built, or was tested.',
  '- why_it_may_help: 1-2 cautious sentences using "may" or "could". No promises, numbers, prices or guarantees.',
  '- unknowns_to_verify: list of things the website cannot tell us (for example how many calls they miss).',
  '- research_confidence: "High" only if the text clearly shows the services AND how customers contact or book; "Medium" if partly clear; "Low" if the text is thin or unclear.',
  'Do not assume the business needs automation. If the website already handles booking and follow-up well, say so and choose "No clear opportunity".'
].join(NL);
const outputExample = JSON.stringify({
  business_summary: 'Family-owned plumbing company serving Decatur homes.',
  evidence_quotes: [{ quote: 'Call us for same-day service', page: 'homepage' }],
  primary_opportunity: 'Missed-call text back',
  process_that_could_benefit: 'How new customers request service',
  proposed_solution: 'A text-back message that could reply to missed calls and collect job details.',
  why_it_may_help: 'Customers who call after hours may get a quicker reply.',
  unknowns_to_verify: ['How many calls are missed each week'],
  research_confidence: 'Medium',
  suspicious_instructions_detected: false,
  suspicious_instructions_note: ''
});
const untrustedContent = 'PAGE: homepage (' + h.url + ')' + NL + h.text.slice(0, 9000) + (c.ok ? NL + NL + 'PAGE: contact (' + c.url + ')' + NL + c.text.slice(0, 5000) : '');
return [{ json: Object.assign({}, p, {
  needsAi, skipReason, retryLater, facts,
  pageText: (h.text.slice(0, 9000) + ' ' + (c.ok ? c.text.slice(0, 5000) : '')).trim(),
  task: 'lead_research', instructions, untrustedContent: needsAi ? untrustedContent : '', outputExample,
  requiredKeys: 'business_summary,evidence_quotes,primary_opportunity,proposed_solution,why_it_may_help,unknowns_to_verify,research_confidence,suspicious_instructions_detected',
  callerWorkflow: 'A2 Research & Analyze', crmUrl: cfg.crmUrl, aiModelLabel: cfg.aiModelLabel,
  aiInputPricePerM: cfg.aiInputPricePerM, aiOutputPricePerM: cfg.aiOutputPricePerM, runId: clean(cfg.runId)
}) }];` } },
  output: [{ leadId: 'L-sample.example', needsAi: true, skipReason: '', retryLater: false, facts: {}, pageText: 'Sample', task: 'lead_research' }]
});

const note = sticky('## H5 Helper: Read One Business Website\nCalled by A2 **once per lead** (Execute Workflow, "run once for each item").\n\nrobots.txt first; homepage and /contact only if allowed; one page every 1.5 s. Every result carries the lead\'s **Lead ID**, so A2 matches results by ID, never by list order.', [plan], { color: 6 });

export default workflow('agency-h5-read-website', '[AGENCY] H5 Helper: Read One Business Website')
  .add(whenCalled)
  .to(plan)
  .to(hasWebsite
    .onTrue(fetchRobots.to(robotsRules).to(siteAllows
      .onTrue(fetchHome.to(fetchContact).to(extract))
      .onFalse(extract)))
    .onFalse(extract))
  .add(note);
