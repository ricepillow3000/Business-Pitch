const manualStart = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Run Research Now' },
  output: [{}]
});

const calledStart = trigger({
  type: 'n8n-nodes-base.executeWorkflowTrigger',
  version: 1.3,
  config: { name: 'When Called By Scheduler', parameters: { inputSource: 'passthrough' } },
  output: [{}]
});

const loadConfig = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: 'Load Agency Config',
    executeOnce: true,
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'EwEgjWyFneyjExzI', cachedResultName: '[AGENCY] H0 Helper: Agency Config' },
      mode: 'once',
      options: { waitForSubWorkflow: true }
    }
  },
  output: [{ ok: true, crmUrl: 'https://docs.google.com/spreadsheets/d/SAMPLE/edit', crmId: 'SAMPLE', isDemo: true, systemPaused: false, researchBatchSize: 5, warmMinScore: 60, targetCities: ['Atlanta'], appointmentIndustries: ['plumbing'], timezone: 'America/New_York', aiModelLabel: 'Gemini 3 Flash (free tier)', aiInputPricePerM: 0.5, aiOutputPricePerM: 3 }]
});

const allowed = ifElse({
  version: 2.2,
  config: {
    name: 'Allowed To Run?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [
          { leftValue: expr('{{ $json.ok }}'), operator: { type: 'boolean', operation: 'true', singleValue: true }, rightValue: '' },
          { leftValue: expr('{{ $json.systemPaused }}'), operator: { type: 'boolean', operation: 'false', singleValue: true }, rightValue: '' }
        ],
        combinator: 'and'
      }
    }
  }
});

const stopped = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Stopped: Paused Or Not Set Up',
    parameters: { mode: 'manual', assignments: { assignments: [
      { id: 'st-1', name: 'stopped', value: true, type: 'boolean' },
      { id: 'st-2', name: 'reason', value: expr('{{ $json.problems || "SYSTEM_PAUSED is YES in the CRM Settings tab." }}'), type: 'string' }
    ] } }
  },
  output: [{ stopped: true, reason: 'SYSTEM_PAUSED is YES' }]
});

const readLeads = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Read Leads',
    executeOnce: true,
    alwaysOutputData: true,
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 2000,
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'sheet',
      operation: 'read',
      documentId: { __rl: true, mode: 'url', value: expr('{{ $("Load Agency Config").first().json.crmUrl }}') },
      sheetName: { __rl: true, mode: 'name', value: 'Leads' },
      options: {}
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ row_number: 2, 'Lead ID': 'L-sample.example', 'Is Demo': 'YES', 'Business Name': 'Sample (DEMO)', Industry: 'Plumbing', City: 'Atlanta', Website: 'https://sample.example', 'Pipeline Status': 'Not researched' }]
});

const pick = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Pick Leads To Research',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Picks a small batch of "Not researched" leads (same DEMO/LIVE flag as the CRM) and plans
// which pages of the business's OWN website may be read: robots.txt, the homepage and /contact.
const cfg = $('Load Agency Config').first().json;
const rows = $input.all().map((i) => i.json || {});
const bad = rows.find((r) => r.error);
if (bad) throw new Error('A2 could not read the Leads tab: ' + String((bad.error && bad.error.message) || bad.error).slice(0, 200));
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const demoFlag = cfg.isDemo === false ? 'NO' : 'YES';
const failCount = (s) => {
  const t = clean(s).toLowerCase();
  const key = 'research failed x';
  return t.indexOf(key) === 0 ? (Number(t.slice(key.length)) || 0) : 0;
};
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
const max = Number(cfg.researchBatchSize) > 0 ? Math.min(Number(cfg.researchBatchSize), 20) : 5;
const picked = rows.filter((r) => clean(r['Lead ID'])
  && clean(r['Pipeline Status']).toLowerCase() === 'not researched'
  && clean(r['Is Demo']).toUpperCase() === demoFlag
  && clean(r['Opted Out']).toUpperCase() !== 'YES'
  && failCount(r['Error Status']) < 3).slice(0, max);
return picked.map((r) => {
  const origin = safeOrigin(r.Website);
  return { json: {
    lead: r, leadId: clean(r['Lead ID']), failCount: failCount(r['Error Status']),
    hasWebsite: origin !== '', origin,
    robotsUrl: origin ? origin + '/robots.txt' : '', homeUrl: origin ? origin + '/' : '', contactUrl: origin ? origin + '/contact' : ''
  } };
});` }
  },
  output: [{ leadId: 'L-sample.example', hasWebsite: true, robotsUrl: 'https://sample.example/robots.txt', homeUrl: 'https://sample.example/', contactUrl: 'https://sample.example/contact', failCount: 0, lead: {} }]
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
  config: {
    name: 'Read robots.txt Rules',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Obeys robots.txt. If the site asks bots not to read a page, that page is NOT fetched.
// Results are matched to leads by position (the HTTP step keeps the order of its input).
const plans = $('Has Website?').all(0).map((i) => i.json || {});
const NL = String.fromCharCode(10);
return $input.all().map((it, idx) => {
const p = plans[idx] || {};
const r = it.json || {};
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
return { json: Object.assign({}, p, { robotsOk, homeAllowed, contactAllowed, robotsNote: note, contactUrl: contactAllowed ? p.contactUrl : p.homeUrl }) };
});` }
  },
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
      url: expr('{{ $("Site Allows Reading?").all(0)[$itemIndex].json.contactUrl }}'),
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
  config: {
    name: 'Extract Website Facts',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Pulls plain facts out of the pages with fixed rules (no AI): emails, phones, booking tools,
// forms, chat widgets. Then prepares the AI request. Website text is passed as DATA only.
// This step is reached three ways: pages fetched, site blocked by robots.txt, or no website.
const cfg = $('Load Agency Config').first().json;
const NL = String.fromCharCode(10);
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const has = (o, k) => Object.prototype.hasOwnProperty.call(o || {}, k);
const inputs = $input.all().map((i) => i.json || {});
const first = inputs[0] || {};
const mode = has(first, 'robotsOk') ? 'blocked' : (has(first, 'hasWebsite') ? 'noSite' : 'fetched');
const allowedList = mode === 'fetched' ? $('Site Allows Reading?').all(0).map((i) => i.json || {}) : [];
const homes = mode === 'fetched' ? $('Fetch Homepage').all().map((i) => i.json || {}) : [];
return inputs.map((inp, idx) => {
let p = inp;
let robots = null;
let home = null;
let contact = null;
if (mode === 'blocked') robots = inp;
if (mode === 'fetched') {
  robots = allowedList[idx] || {};
  p = robots;
  home = homes[idx] || null;
  if (robots.contactAllowed && robots.contactUrl !== robots.homeUrl) contact = inp;
}
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
return { json: Object.assign({}, p, {
  needsAi, skipReason, retryLater, facts,
  pageText: (h.text.slice(0, 9000) + ' ' + (c.ok ? c.text.slice(0, 5000) : '')).trim(),
  task: 'lead_research', instructions, untrustedContent: needsAi ? untrustedContent : '', outputExample,
  requiredKeys: 'business_summary,evidence_quotes,primary_opportunity,proposed_solution,why_it_may_help,unknowns_to_verify,research_confidence,suspicious_instructions_detected',
  callerWorkflow: 'A2 Research & Analyze', crmUrl: cfg.crmUrl, aiModelLabel: cfg.aiModelLabel,
  aiInputPricePerM: cfg.aiInputPricePerM, aiOutputPricePerM: cfg.aiOutputPricePerM, runId: String($execution.id)
}) };
});` }
  },
  output: [{ leadId: 'L-sample.example', needsAi: true, skipReason: '', retryLater: false, facts: {}, pageText: 'Sample', task: 'lead_research' }]
});

const needsAi = ifElse({
  version: 2.2,
  config: {
    name: 'Needs AI?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.needsAi }}'), operator: { type: 'boolean', operation: 'true', singleValue: true }, rightValue: '' }],
        combinator: 'and'
      }
    }
  }
});

const askBrain = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: 'Ask AI Brain',
    onError: 'continueRegularOutput',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'wD2yN7CAk0xz0oiW', cachedResultName: '[AGENCY] H1 Helper: AI Brain' },
      mode: 'once',
      options: { waitForSubWorkflow: true }
    }
  },
  output: [{ ok: true, data: { research_confidence: 'Medium' }, error: '', leadId: 'L-sample.example', estInputTokens: 1000, estOutputTokens: 200 }]
});

const checkAi = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Check AI Findings',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Never trusts the AI blindly: keeps only quotes that really appear on the page, lowers
// confidence when evidence is thin, flags hidden instructions and over-promising words.
const cfg = $('Load Agency Config').first().json;
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const facts = {};
for (let r = 0; r < 10; r++) {
  let items = [];
  try { items = $('Extract Website Facts').all(0, r) || []; } catch (e) { break; }
  items.forEach((it) => { if (it.json && it.json.leadId) facts[it.json.leadId] = it.json; });
}
const OPPS = ['Online booking / scheduling', 'Missed-call text back', 'Quote / lead follow-up', 'Appointment reminders', 'Website chat / FAQ assistant', 'Review requests', 'Intake form automation', 'No clear opportunity'];
const LEVEL = { low: 0, medium: 1, high: 2 };
const NAME = ['Low', 'Medium', 'High'];
const Q = [[8216, "'"], [8217, "'"], [8220, '"'], [8221, '"'], [8211, '-'], [8212, '-'], [160, ' ']];
const SP = new RegExp('[ ' + String.fromCharCode(9, 10, 13) + ']+', 'g');
const norm = (s) => { let t = clean(s).toLowerCase(); Q.forEach((q) => { t = t.split(String.fromCharCode(q[0])).join(q[1]); }); return t.replace(SP, ' ').trim(); };
const safe = (v, n) => {
  let t = (Array.isArray(v) ? v.map(clean).join('; ') : clean(v)).split('<<<').join('').split('>>>').join('').replace(SP, ' ').slice(0, n);
  if (t && '=+-@'.indexOf(t[0]) !== -1) t = "'" + t;
  return t;
};
const PROMISE = ['we built', 'we have built', 'already built', 'we created', 'already set up', 'guarantee', 'will increase', 'will double', '100%'];
const cities = (cfg.targetCities || []).map((x) => clean(x).toLowerCase());
const out = [];
const warnings = [];
$input.all().forEach((it) => {
  const j = it.json || {};
  const isFacts = Object.prototype.hasOwnProperty.call(j, 'needsAi');
  const f = isFacts ? j : facts[clean(j.leadId)];
  if (!f) { warnings.push('AI answer for unknown lead ' + clean(j.leadId)); return; }
  const ai = isFacts ? null : j;
  const lead = f.lead || {};
  const fx = f.facts || {};
  const next = (Number(f.failCount) || 0) + 1;
  const flags = { suspicious: false, wording: false, aiFailedFinal: false };
  const base = {
    leadId: f.leadId, industry: lead.Industry, websiteReachable: !!fx.websiteReachable,
    hasPublicEmail: !!(clean(lead['Public Email']) || fx.firstEmail), onlineBookingSeen: !!fx.onlineBookingSeen,
    phoneOrFormOnly: !!fx.phoneOrFormOnly,
    inTargetArea: cities.indexOf(clean(lead.City).toLowerCase()) !== -1 || clean(lead.City).toLowerCase().indexOf('unknown (inside') === 0,
    warmMinScore: cfg.warmMinScore, appointmentIndustries: cfg.appointmentIndustries,
    currentPipelineStatus: lead['Pipeline Status'], previousTemperature: lead.Temperature, replyCategory: lead['Reply Category'],
    optedOut: lead['Opted Out'], publicPhone: clean(lead['Public Phone']) || (fx.phonesFound || [])[0] || '',
    businessName: lead['Business Name'], oldNotes: clean(lead.Notes)
  };
  // Website problem that may fix itself: try again on a later run (max 3 tries)
  if (f.retryLater) { out.push(Object.assign(base, { researchFailed: true, errorStatus: 'Research failed x' + next, note: f.skipReason, flags })); return; }
  let aiData = null;
  let aiError = '';
  if (f.needsAi) {
    if (ai && ai.ok && ai.data && typeof ai.data === 'object') aiData = ai.data;
    else aiError = clean((ai && ai.error) || 'AI step did not answer').slice(0, 200);
    if (!aiData && next < 3) { out.push(Object.assign(base, { researchFailed: true, errorStatus: 'Research failed x' + next, note: 'AI step failed: ' + aiError, flags })); return; }
    if (!aiData) flags.aiFailedFinal = true;
  }
  const options = [];
  if (fx.websiteReachable) {
    options.push('Online booking: ' + (fx.onlineBookingSeen ? 'yes' + ((fx.platforms || []).length ? ' (' + fx.platforms.join(', ') + ')' : '') : 'not seen'));
    options.push('Contact form: ' + (fx.contactForm ? 'yes' : 'no'));
    options.push('Chat: ' + (fx.chatWidget ? 'yes' : 'no'));
    options.push('Phones on site: ' + (fx.phonesFound || []).length);
    if (fx.emergency) options.push('Mentions 24/7 or emergency service');
  } else options.push(f.skipReason || 'Website not read');
  let conf = 'Low';
  let quotes = [];
  let dropped = 0;
  let research = {};
  const notes = [];
  if (aiData) {
    const pageNorm = norm(f.pageText);
    (Array.isArray(aiData.evidence_quotes) ? aiData.evidence_quotes : []).forEach((q) => {
      const text = clean(q && typeof q === 'object' ? q.quote : q);
      const where = clean(q && typeof q === 'object' ? q.page : '') || 'website';
      if (norm(text).length >= 12 && pageNorm.indexOf(norm(text)) !== -1 && quotes.length < 4) quotes.push({ text, where });
      else dropped++;
    });
    let level = LEVEL[clean(aiData.research_confidence).toLowerCase()];
    if (level === undefined) level = 0;
    if (quotes.length === 0) level = 0;
    else if (quotes.length === 1 || dropped >= 2) level = Math.min(level, 1);
    let opp = clean(aiData.primary_opportunity);
    if (OPPS.indexOf(opp) === -1) { opp = 'Unknown'; level = Math.min(level, 1); notes.push('AI gave an opportunity outside the list'); }
    flags.suspicious = aiData.suspicious_instructions_detected === true || (fx.injectionPhrases || []).length > 0;
    if (flags.suspicious) { level = 0; notes.push('Website text contained instructions aimed at AI tools (' + safe((fx.injectionPhrases || []).join(', ') || aiData.suspicious_instructions_note, 150) + '); needs human review'); }
    const wordingLow = (clean(aiData.proposed_solution) + ' ' + clean(aiData.why_it_may_help)).toLowerCase();
    flags.wording = PROMISE.some((w) => wordingLow.indexOf(w) !== -1);
    if (flags.wording) notes.push('AI wording sounds like a promise; check before using it');
    if (dropped) notes.push(dropped + ' AI quote(s) removed because they were not found on the page');
    conf = NAME[level];
    research = {
      'Primary Opportunity': opp,
      Evidence: quotes.map((q) => '"' + safe(q.text, 300) + '" (' + q.where + ')').join(' || '),
      'Proposed Solution': safe(aiData.proposed_solution, 600),
      'Why It May Help': safe(aiData.why_it_may_help, 600),
      'Unknowns To Verify': safe(aiData.unknowns_to_verify, 600)
    };
    const summary = safe(aiData.business_summary, 300);
    if (summary) notes.unshift('Summary: ' + summary);
  } else {
    research = {
      'Primary Opportunity': 'Unknown', Evidence: '', 'Proposed Solution': '', 'Why It May Help': '',
      'Unknowns To Verify': fx.websiteReachable ? 'AI analysis unavailable; review the website by hand' : 'Website not read automatically; check by hand or by phone'
    };
    if (flags.aiFailedFinal) notes.push('AI analysis failed 3 times (' + aiError + '); facts only');
    if (f.skipReason) notes.push(f.skipReason);
  }
  research['Booking / Contact Options Seen'] = options.join(' | ');
  research['Evidence Sources'] = (fx.pagesRead || []).join(' ');
  if (!clean(lead['Public Email']) && fx.firstEmail) { research['Public Email'] = fx.firstEmail; research['Email Found At'] = fx.firstEmailPage; notes.push('Email found on own website'); }
  if (!clean(lead['Public Phone']) && (fx.phonesFound || []).length) research['Public Phone'] = fx.phonesFound[0];
  out.push(Object.assign(base, {
    researchFailed: false, researchConfidence: conf, research, flags,
    errorStatus: flags.aiFailedFinal ? 'AI failed x3' : '',
    note: notes.join('; ')
  }));
});
return out.map((o, i) => ({ json: Object.assign(o, { warnings: i === 0 ? warnings : [] }) }));` }
  },
  output: [{ leadId: 'L-sample.example', researchFailed: false, researchConfidence: 'Medium', research: {}, flags: {} }]
});

const score = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: 'Score With Fixed Rules',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'mMSUbBxUdWhbLP5e', cachedResultName: '[AGENCY] A3 Score & Qualify' },
      mode: 'once',
      options: { waitForSubWorkflow: true }
    }
  },
  output: [{ leadId: 'L-sample.example', fitScore: 75, scoreBreakdown: '+15 website works', temperature: 'Warm', temperatureReason: 'evidence-backed fit', pipelineStatus: 'Ready for review' }]
});

const buildUpdates = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build Lead Updates',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Turns scored research into Leads rows, Review Queue items and Activity Log events.
const cfg = $('Load Agency Config').first().json;
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const now = DateTime.now().setZone(cfg.timezone || 'America/New_York');
const today = now.toFormat('yyyy-LL-dd');
const stamp = now.toFormat('yyyy-LL-dd HH:mm');
const updates = [];
const review = [];
const s = { researched: 0, retryLater: 0, aiFailedFinal: 0, suspicious: 0, hot: 0, warm: 0, cold: 0, warnings: [] };
$input.all().forEach((it) => {
  const j = it.json || {};
  (j.warnings || []).forEach((w) => s.warnings.push(w));
  if (!j.leadId) return;
  const addNote = (n) => [j.oldNotes, n ? 'A2 ' + today + ': ' + n : ''].filter(Boolean).join(' | ').slice(-1500);
  if (j.researchFailed) {
    s.retryLater++;
    updates.push({ 'Lead ID': j.leadId, 'Error Status': j.errorStatus, 'Last Updated': today, Notes: addNote(j.note) });
    return;
  }
  s.researched++;
  if (j.flags && j.flags.aiFailedFinal) s.aiFailedFinal++;
  if (j.temperature === 'Hot') s.hot++; else if (j.temperature === 'Warm') s.warm++; else s.cold++;
  updates.push(Object.assign({ 'Lead ID': j.leadId }, j.research || {}, {
    'Research Date': today, 'Research Confidence': j.researchConfidence,
    'Fit Score': String(j.fitScore), 'Score Breakdown': j.scoreBreakdown,
    Temperature: j.temperature, 'Pipeline Status': j.pipelineStatus,
    'Error Status': j.errorStatus || '', 'Last Updated': today, Notes: addNote(j.note)
  }));
  const item = (type, summary) => review.push({ 'Item ID': 'RQ-' + j.leadId + '-' + type.toLowerCase().split(' ').join('-'), 'Created At': stamp, Type: type, 'Lead ID': j.leadId, Summary: summary.slice(0, 500), Link: cfg.crmUrl, Status: 'Open' });
  if (j.flags && j.flags.suspicious) { s.suspicious++; item('Suspicious website text', clean(j.businessName) + ': website text tried to give instructions to AI tools. Research confidence set to Low. Check the site by hand.'); }
  if (j.flags && j.flags.wording) item('AI wording check', clean(j.businessName) + ': proposed solution wording sounds like a promise. Edit before any outreach.');
  if (j.flags && j.flags.aiFailedFinal) item('Research needs a human', clean(j.businessName) + ': AI analysis failed 3 times. Facts were saved; review by hand.');
  if ((j.temperature === 'Warm' || j.temperature === 'Hot') && j.pipelineStatus === 'Ready for review') item('Lead ready for review', clean(j.businessName) + ' is ' + j.temperature + ' (score ' + j.fitScore + ', confidence ' + j.researchConfidence + '). ' + clean(j.temperatureReason));
});
return [{ json: { updates, review, summary: s } }];` }
  },
  output: [{ updates: [], review: [], summary: { researched: 0 } }]
});

const updateRows = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Lead Update Rows',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `return ($input.first().json.updates || []).map((r) => ({ json: r }));` }
  },
  output: [{ 'Lead ID': 'L-sample.example' }]
});

const saveLeads = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Save Research To Leads',
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 3000,
    parameters: {
      resource: 'sheet',
      operation: 'appendOrUpdate',
      documentId: { __rl: true, mode: 'url', value: expr('{{ $("Load Agency Config").first().json.crmUrl }}') },
      sheetName: { __rl: true, mode: 'name', value: 'Leads' },
      columns: {
        mappingMode: 'autoMapInputData',
        value: {},
        matchingColumns: ['Lead ID'],
        schema: [
          { id: 'Lead ID', displayName: 'Lead ID', required: false, defaultMatch: true, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Public Email', displayName: 'Public Email', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Email Found At', displayName: 'Email Found At', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Public Phone', displayName: 'Public Phone', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Research Date', displayName: 'Research Date', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Booking / Contact Options Seen', displayName: 'Booking / Contact Options Seen', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Primary Opportunity', displayName: 'Primary Opportunity', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Evidence', displayName: 'Evidence', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Evidence Sources', displayName: 'Evidence Sources', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Proposed Solution', displayName: 'Proposed Solution', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Why It May Help', displayName: 'Why It May Help', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Unknowns To Verify', displayName: 'Unknowns To Verify', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Research Confidence', displayName: 'Research Confidence', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Fit Score', displayName: 'Fit Score', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Score Breakdown', displayName: 'Score Breakdown', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Temperature', displayName: 'Temperature', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Pipeline Status', displayName: 'Pipeline Status', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Error Status', displayName: 'Error Status', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Last Updated', displayName: 'Last Updated', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Notes', displayName: 'Notes', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }
        ]
      },
      options: { cellFormat: 'RAW', handlingExtraData: 'ignoreIt' }
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ 'Lead ID': 'L-sample.example' }]
});

const reviewRows = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Review Queue Rows',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `return ($input.first().json.review || []).map((r) => ({ json: r }));` }
  },
  output: [{ 'Item ID': 'RQ-L-sample.example-lead-ready-for-review' }]
});

const addReview = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Add To Review Queue',
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 3000,
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'sheet',
      operation: 'append',
      documentId: { __rl: true, mode: 'url', value: expr('{{ $("Load Agency Config").first().json.crmUrl }}') },
      sheetName: { __rl: true, mode: 'name', value: 'Review Queue' },
      columns: {
        mappingMode: 'autoMapInputData',
        value: {},
        schema: [
          { id: 'Item ID', displayName: 'Item ID', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Created At', displayName: 'Created At', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Type', displayName: 'Type', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Lead ID', displayName: 'Lead ID', required: false, defaultMatch: true, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Summary', displayName: 'Summary', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Link', displayName: 'Link', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'Status', displayName: 'Status', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }
        ]
      },
      options: { cellFormat: 'RAW', handlingExtraData: 'ignoreIt' }
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ 'Item ID': 'RQ-L-sample.example-lead-ready-for-review' }]
});

const events = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Activity Events',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Activity Log rows describing what this run actually did.
const cfg = $('Load Agency Config').first().json;
const s = $input.first().json.summary || {};
const base = { crmUrl: cfg.crmUrl, workflow: 'A2 Research & Analyze', runId: String($execution.id), isDemo: cfg.isDemo !== false, leadId: '' };
const ev = [
  Object.assign({}, base, { event: 'leads_researched', count: s.researched || 0, details: 'Hot ' + (s.hot || 0) + ', Warm ' + (s.warm || 0) + ', Cold ' + (s.cold || 0) }),
  Object.assign({}, base, { event: 'research_retry_later', count: s.retryLater || 0, details: 'Website or AI problem; will try again (max 3 tries)' })
];
if (s.suspicious) ev.push(Object.assign({}, base, { event: 'suspicious_website_text', count: s.suspicious, details: 'Sent to Review Queue' }));
if (s.aiFailedFinal) ev.push(Object.assign({}, base, { event: 'ai_failed_3_times', count: s.aiFailedFinal, details: 'Facts saved, sent to Review Queue' }));
if ((s.warnings || []).length) ev.push(Object.assign({}, base, { event: 'research_warning', count: s.warnings.length, details: s.warnings.join(' | ').slice(0, 500) }));
return ev.map((e) => ({ json: e }));` }
  },
  output: [{ crmUrl: 'https://docs.google.com/spreadsheets/d/SAMPLE/edit', event: 'leads_researched', count: 0 }]
});

const logActivity = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: 'Log Activity',
    onError: 'continueRegularOutput',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: 'W4IqWN9nxt1abIKb', cachedResultName: '[AGENCY] H4 Helper: Log Activity' },
      mode: 'once',
      options: { waitForSubWorkflow: true }
    }
  },
  output: [{ logged: true, rows: 2 }]
});

const summary = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Research Summary',
    executeOnce: true,
    parameters: { mode: 'manual', assignments: { assignments: [
      { id: 'rs-1', name: 'summary', value: expr('{{ $("Build Lead Updates").first().json.summary }}'), type: 'object' }
    ] } }
  },
  output: [{ summary: { researched: 0 } }]
});

const note = sticky('## A2 Research & Analyze (Stage 2)\nPicks up to RESEARCH_BATCH_SIZE leads with status **Not researched**.\n\nReads only the business\'s **own** website (robots.txt first, then homepage and /contact), slowly, one page every 1.5 s. If robots.txt says no, the site is not read.\n\nFixed rules find emails, phones, booking tools, forms and chat. The **AI Brain (H1)** writes the analysis; website text is treated as DATA only. Quotes the AI gives are kept only if they really appear on the page. Hidden instructions found on a site lower confidence to Low and go to the **Review Queue**.\n\nThen **A3** scores the lead with fixed rules and the result is saved to Leads. Problems retry up to 3 times.', [pick], { color: 6 });

export default workflow('agency-a2-research', '[AGENCY] A2 Research & Analyze')
  .add(manualStart)
  .to(loadConfig)
  .add(calledStart)
  .to(loadConfig)
  .add(loadConfig)
  .to(allowed
    .onTrue(readLeads.to(pick).to(hasWebsite
      .onTrue(fetchRobots.to(robotsRules).to(siteAllows
        .onTrue(fetchHome.to(fetchContact).to(extract))
        .onFalse(extract)))
      .onFalse(extract)))
    .onFalse(stopped))
  .add(extract)
  .to(needsAi
    .onTrue(askBrain.to(checkAi))
    .onFalse(checkAi))
  .add(checkAi)
  .to(score)
  .to(buildUpdates)
  .add(buildUpdates)
  .to(updateRows)
  .to(saveLeads)
  .add(buildUpdates)
  .to(reviewRows)
  .to(addReview)
  .add(buildUpdates)
  .to(events)
  .to(logActivity)
  .to(summary)
  .add(note);
