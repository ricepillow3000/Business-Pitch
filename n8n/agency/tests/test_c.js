const h0 = require('./harness');
const { DateTime } = require('luxon');
const run = async (code, input, nd, opts) => { const r = await h0.run(code, input, nd || {}, opts || {}); return (Array.isArray(r) ? r : [r]).map((i) => i.json); };
const load = (f) => Object.fromEntries(h0.codeNodes(h0.load('../workflows/' + f)).map((c) => [c.name, c.code]));
const H6 = load('h6.js'), H7 = load('h7.js'), C1 = load('c1.js'), C2 = load('c2.js'), C3 = load('c3.js'), C4 = load('c4.js'), A0B = load('a0b.js');
let fails = 0, n = 0;
const expect = (l, g, w) => { n++; const ok = JSON.stringify(g) === JSON.stringify(w); if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + l + (ok ? '' : ' got=' + JSON.stringify(g) + ' want=' + JSON.stringify(w))); };
// Fixed clock: Monday 2026-11-16 10:00 New York (inside sending hours)
const FIXED = DateTime.fromISO('2026-11-16T10:00:00', { zone: 'America/New_York' });
const FakeDT = { now: () => FIXED };
const SUNDAY = { now: () => DateTime.fromISO('2026-11-15T10:00:00', { zone: 'America/New_York' }) };
const CRM = 'https://docs.google.com/spreadsheets/d/DEMO_TEST/edit';
const settings = { AGENCY_NAME: 'Jido (DEMO)', SENDER_NAME: 'Alex Demo', SENDER_EMAIL: 'alex@jido-demo.example', AGENCY_MAILING_ADDRESS: '100 Demo St, Atlanta, GA 30301', AGENCY_WEBSITE: 'https://jido-demo.example', DAILY_SEND_LIMIT: '10', SEND_BATCH_SIZE: '3', DRAFT_BATCH_SIZE: '5', GMAIL_SENDING_ENABLED: 'YES', UNSUBSCRIBE_BASE_URL: 'https://jido-api.app.n8n.cloud/webhook/jido-unsubscribe', DISCOVERY_CALL_MINUTES: '20', SEND_WINDOW_START: '9', SEND_WINDOW_END: '16' };
const cfg = { ok: true, crmUrl: CRM, crmId: 'DEMO_TEST', isDemo: true, systemPaused: false, outreachPaused: false, timezone: 'America/New_York', aiModelLabel: 'Gemini', aiInputPricePerM: 0.5, aiOutputPricePerM: 3, settings };
const lead = (id, name, email, extra) => Object.assign({ 'Lead ID': id, 'Is Demo': 'YES', 'Business Name': name + ' (DEMO)', Industry: 'Plumbing', City: 'Decatur', Website: 'https://' + id.slice(2), 'Public Email': email, Temperature: 'Warm', 'Pipeline Status': 'Ready for review', 'Opted Out': 'NO', 'Research Confidence': 'High', 'Primary Opportunity': 'Missed-call text back', Evidence: '"Family owned plumbers serving Decatur homes since 2009" (homepage) || "Call (404) 555-0101 for same-day service" (homepage)', 'Evidence Sources': 'https://' + id.slice(2) + '/ https://' + id.slice(2) + '/contact', 'Email Found At': 'https://' + id.slice(2) + '/contact', 'Proposed Solution': 'A missed-call text back.', 'Why It May Help': 'Callers may get a faster reply.' }, extra || {});
const P = lead('L-peachtree-pro-plumbing.example', 'Peachtree Pro Plumbing', 'info@peachtree-pro-plumbing.example');
const B = lead('L-buckhead-comfort-hvac.example', 'Buckhead Comfort HVAC', 'hello@buckhead-comfort-hvac.example', { Industry: 'HVAC', City: 'Atlanta', Evidence: '"Heating and cooling repair for Buckhead homes" (homepage)' });
const M = lead('L-marietta-ridge-roofing.example', 'Marietta Ridge Roofing', 'hello@marietta-ridge-roofing.example', { Temperature: 'Cold' });
const S = lead('L-blocked-demo.example', 'Blocked Demo Co', 'donotcontact@blocked-demo.example');
const LOW = lead('L-low.example', 'Low Confidence Co', 'a@low.example', { 'Research Confidence': 'Low' });
const NOMAIL = lead('L-nomail.example', 'No Mail Co', '');
const OPT = lead('L-opted.example', 'Opted Co', 'x@opted.example', { 'Opted Out': 'YES' });
const LEADS = [P, B, M, S, LOW, NOMAIL, OPT];
(async () => {
  // ================= H6 =================
  const sup = [{ 'Email Or Domain': 'donotcontact@blocked-demo.example' }, { 'Email Or Domain': 'blocked-domain.example' }];
  const reqs = [['L-peachtree-pro-plumbing.example', 'info@peachtree-pro-plumbing.example'], ['L-blocked-demo.example', 'donotcontact@blocked-demo.example'], ['L-x', 'a@blocked-domain.example'], ['L-y', 'b@mail.blocked-domain.example'], ['L-opted.example', 'x@opted.example'], ['L-z', 'not-an-email']].map(([leadId, email]) => ({ leadId, email, ref: leadId, crmUrl: CRM }));
  let d = await run(H6['Decide Allowed Or Blocked'], LEADS, { 'When Called With Addresses': reqs, 'Read Suppression List': sup });
  expect('H6: allowed / email / domain / subdomain / opted-out / invalid', d.map((x) => x.allowed), [true, false, false, false, false, false]);
  d = await run(H6['Decide Allowed Or Blocked'], LEADS, { 'When Called With Addresses': reqs.slice(0, 1), 'Read Suppression List': [{ error: { message: 'boom' } }] });
  expect('H6: Suppression List unreadable -> blocked (fail closed)', [d[0].allowed, d[0].checkedOk], [false, false]);
  d = await run(H6['Decide Allowed Or Blocked'], [{ error: { message: 'x' } }], { 'When Called With Addresses': reqs.slice(0, 1), 'Read Suppression List': sup });
  expect('H6: Leads unreadable -> blocked', d[0].allowed, false);
  d = await run(H6['Decide Allowed Or Blocked'], LEADS, { 'When Called With Addresses': [{ leadId: 'L-a', email: 'a@b.example', crmUrl: '' }], 'Read Suppression List': sup });
  expect('H6: no CRM link -> blocked', d[0].allowed, false);
  d = await run(H6['Decide Allowed Or Blocked'], LEADS, { 'When Called With Addresses': reqs.slice(0, 1), 'Read Suppression List': [{}] });
  expect('H6: empty Suppression List (no error) -> allowed', d[0].allowed, true);

  // ================= C1 =================
  const existing = [{ 'Draft ID': 'D-L-buckhead-comfort-hvac.example-initial' }];
  let picked = await run(C1['Pick Leads To Draft'], existing, { 'Load Agency Config': [cfg], 'Read Leads': LEADS }, { DateTime: FakeDT });
  expect('C1 pick: only eligible leads without a draft', picked.map((x) => x.leadId), ['L-peachtree-pro-plumbing.example', 'L-blocked-demo.example']);
  expect('C1 pick: skipped leads explained', picked[0].skipped.length, 3);
  let threw = false; try { await run(C1['Pick Leads To Draft'], [{ error: { message: 'no tab' } }], { 'Load Agency Config': [cfg], 'Read Leads': LEADS }); } catch (e) { threw = true; }
  expect('C1 pick: Outreach Drafts tab missing -> stops', threw, true);
  picked = await run(C1['Pick Leads To Draft'], [{}], { 'Load Agency Config': [cfg], 'Read Leads': LEADS }, { DateTime: FakeDT });
  const supD = await run(H6['Decide Allowed Or Blocked'], LEADS, { 'When Called With Addresses': picked, 'Read Suppression List': sup });
  const reqC = await run(C1['Build AI Requests'], supD, { 'Load Agency Config': [cfg], 'Read Leads': LEADS, 'Pick Leads To Draft': picked });
  expect('C1: suppressed lead gets no AI request', reqC.map((x) => x.leadId), ['L-peachtree-pro-plumbing.example', 'L-buckhead-comfort-hvac.example']);
  expect('C1: research passed as data, correct lead', [reqC[0].untrustedContent.indexOf('Peachtree Pro Plumbing') !== -1, reqC[1].untrustedContent.indexOf('Buckhead') !== -1, reqC[0].untrustedContent.indexOf('Buckhead') === -1], [true, true, true]);
  const supSwap = supD.map((x) => Object.assign({}, x, x.leadId === 'L-peachtree-pro-plumbing.example' ? { email: 'someone@else.example' } : {}));
  const reqSwap = await run(C1['Build AI Requests'], supSwap, { 'Load Agency Config': [cfg], 'Read Leads': LEADS, 'Pick Leads To Draft': picked });
  expect('C1: suppression answer for a different email is not trusted', reqSwap.map((x) => x.leadId), ['L-buckhead-comfort-hvac.example']);
  const aiP = { ok: true, leadId: 'L-peachtree-pro-plumbing.example', data: { subject: 'Re: An idea for missed calls', body: 'Hi there,\nI saw that you are "Family owned plumbers serving Decatur homes since 2009". One idea we could build is a missed-call text back. We guarantee 30% more bookings. Our clients love it. You are losing customers every night. Rated "best plumber in Georgia" by locals. It may help callers get a quicker reply. Would you be open to a short call?', opportunity_used: 'Missed-call text back', evidence_used: ['Family owned plumbers serving Decatur homes since 2009', 'invented quote'] } };
  const aiB = { ok: true, leadId: 'L-buckhead-comfort-hvac.example', data: { subject: 'Idea for Buckhead Comfort HVAC', body: 'We noticed Peachtree Pro Plumbing nearby uses this. A booking assistant could help.', opportunity_used: 'x', evidence_used: [] } };
  const nd1 = { 'Load Agency Config': [cfg], 'Read Leads': LEADS, 'Build AI Requests': reqC, 'Pick Leads To Draft': picked, 'Suppression Check': supD };
  let chk = (await run(C1['Check Drafts'], [aiB, aiP], nd1, { DateTime: FakeDT }))[0];
  const dP = chk.draftUpdates.find((x) => x['Lead ID'] === 'L-peachtree-pro-plumbing.example');
  expect('C1 check: answers matched by Lead ID (order does not matter)', [chk.draftUpdates.length, dP['To Email'], dP.Body.indexOf('Hi Peachtree Pro Plumbing team,') === 0], [1, 'info@peachtree-pro-plumbing.example', true]);
  expect('C1 check: unsupported claims removed', ['guarantee', '30%', 'clients', 'losing', 'best plumber'].map((w) => dP.Body.toLowerCase().indexOf(w) === -1), [true, true, true, true, true]);
  expect('C1 check: removed list recorded (4 sentences)', dP['Removed Claims'].split(' || ').length, 4);
  expect('C1 check: real quote kept, invented evidence dropped', [dP.Body.indexOf('Family owned plumbers serving Decatur homes since 2009') !== -1, dP['Evidence Used']], [true, 'Family owned plumbers serving Decatur homes since 2009']);
  expect('C1 check: research sources preserved', dP['Research Sources'].indexOf('peachtree-pro-plumbing.example/contact') !== -1, true);
  expect('C1 check: "Re:" removed from subject', dP.Subject, 'An idea for missed calls');
  expect('C1 check: footer has sender, address, STOP and a token link', [dP.Body.indexOf('Alex Demo') !== -1, dP.Body.indexOf('100 Demo St, Atlanta, GA 30301') !== -1, dP.Body.indexOf('reply STOP') !== -1, dP.Body.indexOf('jido-unsubscribe?t=' + dP['Unsubscribe Token']) !== -1, /^u[a-z0-9]{24}$/.test(dP['Unsubscribe Token'])], [true, true, true, true, true]);
  expect('C1 check: saved as Pending review / Not sent; lead Pending', [dP['Review Status'], dP['Send Status'], chk.leadUpdates[0]['Outreach Status']], ['Pending review', 'Not sent', 'Pending']);
  expect('C1 check: draft mentioning another business NOT saved; review item', [chk.draftUpdates.some((x) => x['Lead ID'] === 'L-buckhead-comfort-hvac.example'), chk.reviewItems.some((r) => r.Type === 'Draft mentioned another business' && r['Lead ID'] === 'L-buckhead-comfort-hvac.example')], [false, true]);
  const h1 = dP['Draft Hash'];
  const noAddr = Object.assign({}, cfg, { settings: Object.assign({}, settings, { AGENCY_MAILING_ADDRESS: '[FILL IN]', UNSUBSCRIBE_BASE_URL: '' }) });
  chk = (await run(C1['Check Drafts'], [aiP], Object.assign({}, nd1, { 'Load Agency Config': [noAddr] }), { DateTime: FakeDT }))[0];
  expect('C1 check: missing address -> marked, reply-STOP only', [chk.draftUpdates[0].Body.indexOf('[MISSING: AGENCY_MAILING_ADDRESS]') !== -1, chk.draftUpdates[0].Body.indexOf('jido-unsubscribe') === -1 && chk.draftUpdates[0].Body.indexOf('reply STOP and we will not email you again') !== -1, chk.draftUpdates[0]['Review Notes'].indexOf('blocked') !== -1], [true, true, true]);
  chk = (await run(C1['Check Drafts'], [{ ok: false, leadId: 'L-peachtree-pro-plumbing.example', error: 'AI off' }], nd1, { DateTime: FakeDT }))[0];
  expect('C1 check: AI failure -> no draft, event logged', [chk.draftUpdates.length, chk.events.some((e) => e.event === 'draft_failed')], [0, true]);

  // ================= C2 =================
  const draft = (over) => Object.assign({ 'Draft ID': dP['Draft ID'], 'Lead ID': dP['Lead ID'], Version: '1', 'Business Name': dP['Business Name'], 'To Email': dP['To Email'], Subject: dP.Subject, Body: dP.Body, 'Draft Hash': h1, 'Review Status': 'Pending review', 'Reviewed By': '', 'Reviewed At': '', 'Approved Hash': '', 'Approved At': '', 'Send Status': 'Not sent', 'Unsubscribe Token': dP['Unsubscribe Token'], Step: 'initial' }, over || {});
  const c2 = async (rows) => (await run(C2['Review Approvals'], rows, { 'Load Agency Config': [cfg] }, { DateTime: FakeDT }))[0];
  let r2 = await c2([draft({ 'Review Status': 'Approved', 'Reviewed By': 'AD' })]);
  expect('C2: approval recorded with fingerprint + time; lead Approved', [r2.draftUpdates[0]['Approved Hash'], !!r2.draftUpdates[0]['Approved At'], r2.leadUpdates[0]['Outreach Status'], r2.historyRows[0].Event], [h1, true, 'Approved', 'approved']);
  const approved = draft({ 'Review Status': 'Approved', 'Reviewed By': 'AD', 'Approved Hash': h1, 'Approved At': '2026-11-16 10:00' });
  r2 = await c2([approved]);
  expect('C2: second run changes nothing (idempotent)', [r2.draftUpdates.length, r2.historyRows.length], [0, 0]);
  r2 = await c2([draft({ 'Review Status': 'Approved' })]);
  expect('C2: approval without a name is not accepted', [r2.draftUpdates[0]['Review Status'], r2.draftUpdates[0]['Approved Hash']], ['Pending review', undefined]);
  r2 = await c2([Object.assign({}, approved, { Body: approved.Body.replace('quicker reply', 'quicker reply. We guarantee results') })]);
  expect('C2: edit after approval -> version 2, approval cancelled, review item', [r2.draftUpdates[0].Version, r2.draftUpdates[0]['Review Status'], r2.draftUpdates[0]['Approved Hash'], r2.leadUpdates[0]['Outreach Status'], r2.reviewItems[0].Type], ['2', 'Pending review', '', 'Pending', 'Edited draft needs approval']);
  r2 = await c2([draft({ 'Review Status': 'Rejected', 'Reviewed By': 'AD' })]);
  expect('C2: rejection recorded; lead Rejected', [!!r2.draftUpdates[0]['Reviewed At'], r2.leadUpdates[0]['Outreach Status']], [true, 'Rejected']);
  r2 = await c2([draft({ 'Send Status': 'Sent', Body: 'changed after sending' })]);
  expect('C2: sent drafts are left alone', r2.draftUpdates.length, 0);

  // ================= C3 switches =================
  const sw = async (c, dt) => (await run(C3['Check Send Switches'], [c], {}, { DateTime: dt || FakeDT }))[0];
  expect('C3 switches: all set, Monday 10:00 -> allowed', (await sw(cfg)).allowed, true);
  expect('C3 switches: OUTREACH_PAUSED (emergency pause) -> blocked', (await sw(Object.assign({}, cfg, { outreachPaused: true }))).allowed, false);
  expect('C3 switches: SYSTEM_PAUSED -> blocked', (await sw(Object.assign({}, cfg, { systemPaused: true }))).allowed, false);
  expect('C3 switches: GMAIL_SENDING_ENABLED not YES -> blocked', (await sw(Object.assign({}, cfg, { settings: Object.assign({}, settings, { GMAIL_SENDING_ENABLED: 'NO' }) }))).allowed, false);
  expect('C3 switches: missing mailing address -> blocked', (await sw(Object.assign({}, cfg, { settings: Object.assign({}, settings, { AGENCY_MAILING_ADDRESS: '[FILL IN]' }) }))).allowed, false);
  expect('C3 switches: weekend -> blocked', (await sw(cfg, SUNDAY)).allowed, false);
  expect('C3 switches: config not OK -> blocked', (await sw(Object.assign({}, cfg, { ok: false }))).allowed, false);

  // ================= C3 pick =================
  const LEADS_DEMO = LEADS.map((l) => l);
  const mk = (id, name, email, over) => { const b = 'Hi ' + name + ' team,\n\nIdea.\n\nThanks,\nAlex Demo\n\n--\nAlex Demo\nJido (DEMO)\n100 Demo St, Atlanta, GA 30301\n\nTo stop all emails from us, reply STOP.'; const hh = (() => { const s = email + '|Subj|' + b; let a = 2166136261, c = 5381; for (let i = 0; i < s.length; i++) { const x = s.charCodeAt(i); a = Math.imul(a ^ x, 16777619) >>> 0; c = (Math.imul(c, 33) + x) >>> 0; } return ('0000000' + a.toString(16)).slice(-8) + ('0000000' + c.toString(16)).slice(-8); })(); return Object.assign({ 'Draft ID': 'D-' + id + '-initial', 'Lead ID': id, Step: 'initial', 'To Email': email, Subject: 'Subj', Body: b, 'Draft Hash': hh, 'Review Status': 'Approved', 'Reviewed By': 'AD', 'Approved Hash': hh, 'Approved At': '2026-11-16 09:00', 'Send Status': 'Not sent', 'Unsubscribe Token': 'u' + 'a'.repeat(24) }, over || {}); };
  const D_OK = mk('L-peachtree-pro-plumbing.example', 'Peachtree Pro Plumbing', 'info@peachtree-pro-plumbing.example');
  const D_PEND = mk('L-buckhead-comfort-hvac.example', 'Buckhead Comfort HVAC', 'hello@buckhead-comfort-hvac.example', { 'Review Status': 'Pending review' });
  const D_REJ = mk('L-marietta-ridge-roofing.example', 'Marietta Ridge Roofing', 'hello@marietta-ridge-roofing.example', { 'Review Status': 'Rejected' });
  const D_EDIT = Object.assign(mk('L-low.example', 'Low Confidence Co', 'a@low.example'), { Body: 'edited text with STOP' });
  const D_SUP = mk('L-blocked-demo.example', 'Blocked Demo Co', 'donotcontact@blocked-demo.example');
  const D_OPT = mk('L-opted.example', 'Opted Co', 'x@opted.example');
  const realLead = lead('L-real.com', 'Real Co', 'owner@realbusiness.com');
  const D_REAL = mk('L-real.com', 'Real Co', 'owner@realbusiness.com');
  const D_NOFOOT = Object.assign(mk('L-nomail.example', 'No Mail Co', 'nm@nomail.example'), {});
  const leadsC3 = LEADS_DEMO.concat([realLead]).map((l) => (l['Lead ID'] === 'L-nomail.example' ? Object.assign({}, l, { 'Public Email': 'nm@nomail.example' }) : l));
  // make D_NOFOOT's approved text lack the address (approved as-is)
  const nf = D_NOFOOT; nf.Body = 'Hi team, no footer here'; (() => { const s = nf['To Email'] + '|Subj|' + nf.Body; let a = 2166136261, c = 5381; for (let i = 0; i < s.length; i++) { const x = s.charCodeAt(i); a = Math.imul(a ^ x, 16777619) >>> 0; c = (Math.imul(c, 33) + x) >>> 0; } nf['Draft Hash'] = nf['Approved Hash'] = ('0000000' + a.toString(16)).slice(-8) + ('0000000' + c.toString(16)).slice(-8); })();
  const allDrafts = [D_OK, D_PEND, D_REJ, D_EDIT, D_SUP, D_OPT, D_REAL, D_NOFOOT];
  const pre = await run(C3['Preselect Approved Drafts'], leadsC3, { 'Load Agency Config': [cfg], 'Read Outreach Drafts': allDrafts, 'Read Send Ledger': [{}] });
  expect('C3 preselect: pending + rejected never considered', pre.map((x) => x.ref).sort(), [D_OK, D_EDIT, D_SUP, D_OPT, D_REAL, D_NOFOOT].map((x) => x['Draft ID']).sort());
  const supC3 = await run(H6['Decide Allowed Or Blocked'], leadsC3, { 'When Called With Addresses': pre, 'Read Suppression List': sup });
  const pick = async (ledger, supAns, c, drafts) => (await run(C3['Pick Approved Drafts'], supAns || supC3, { 'Load Agency Config': [c || cfg], 'Read Outreach Drafts': drafts || allDrafts, 'Read Send Ledger': ledger || [{}], 'Read Leads': leadsC3 }, { DateTime: FakeDT, execId: 'run1' }))[0];
  let pk = await pick();
  expect('C3 pick: only the approved, unchanged, allowed, footer-complete demo draft is a candidate', pk.candidates.map((x) => x.draftId), [D_OK['Draft ID']]);
  expect('C3 pick: candidate uses this lead\'s own address + ledger key', [pk.candidates[0].to, pk.candidates[0].ledgerKey, pk.candidates[0].ledgerRowId], ['info@peachtree-pro-plumbing.example', 'L-peachtree-pro-plumbing.example|initial', 'L-peachtree-pro-plumbing.example|initial|run1']);
  const upd = Object.fromEntries(pk.draftUpdates.map((u) => [u['Draft ID'], u]));
  expect('C3 pick: edited-after-approval -> approval reset, not sent', [upd[D_EDIT['Draft ID']]['Review Status'], upd[D_EDIT['Draft ID']]['Approved Hash']], ['Pending review', '']);
  expect('C3 pick: suppressed + opted-out -> Suppressed, logged as blocked attempts', [upd[D_SUP['Draft ID']]['Send Status'], upd[D_OPT['Draft ID']]['Send Status'], pk.events.filter((e) => e.event === 'blocked_send_attempt').length], ['Suppressed', 'Suppressed', 2]);
  expect('C3 pick: DEMO mode blocks a real address', upd[D_REAL['Draft ID']]['Last Error'].indexOf('DEMO mode') === 0, true);
  expect('C3 pick: missing footer blocks sending', upd[D_NOFOOT['Draft ID']]['Last Error'].indexOf('Footer') === 0, true);
  pk = await pick([{ 'Ledger Key': 'L-peachtree-pro-plumbing.example|initial', Status: 'Sent', 'Created At': '2026-11-13 10:00' }]);
  expect('C3 pick: already Sent in ledger -> duplicate prevented', [pk.candidates.length, pk.events.some((e) => e.event === 'duplicate_prevented')], [0, true]);
  pk = await pick([{ 'Ledger Key': 'L-peachtree-pro-plumbing.example|initial', Status: 'Failed', 'Created At': '2026-11-13 10:00' }]);
  expect('C3 pick: earlier Failed -> NOT retried automatically', pk.candidates.length, 0);
  pk = await pick([{ 'Ledger Key': 'L-peachtree-pro-plumbing.example|initial', Status: 'Not sent - paused', 'Created At': '2026-11-16 09:00' }]);
  expect('C3 pick: earlier "Not sent - paused" does not block', pk.candidates.length, 1);
  const today10 = Array.from({ length: 10 }, (_, i) => ({ 'Ledger Key': 'L-other' + i + '|initial', Status: 'Sent', 'Created At': '2026-11-16 09:' + (10 + i) }));
  pk = await pick(today10);
  expect('C3 pick: daily limit reached -> waits', [pk.candidates.length, pk.events.some((e) => e.event === 'send_waiting_limit')], [0, true]);
  const supFail = supC3.map((x) => Object.assign({}, x, { checkedOk: false, allowed: false }));
  pk = await pick(null, supFail);
  expect('C3 pick: suppression unverifiable -> nothing sent', pk.candidates.length, 0);
  threw = false; try { await run(C3['Preselect Approved Drafts'], leadsC3, { 'Load Agency Config': [cfg], 'Read Outreach Drafts': allDrafts, 'Read Send Ledger': [{ error: { message: 'x' } }] }); } catch (e) { threw = true; }
  expect('C3: Send Ledger unreadable -> stops before anything', threw, true);

  // ================= C3 claim / final / record =================
  pk = await pick();
  const claims = await run(C3['Claim Ledger Rows'], [pk], { 'Load Agency Config': [cfg] }, { DateTime: FakeDT, execId: 'run1' });
  expect('C3 claim: Sending row written before Gmail', [claims.length, claims[0].Status, claims[0]['Ledger Row ID']], [1, 'Sending', 'L-peachtree-pro-plumbing.example|initial|run1']);
  const cfgOn = Object.assign({}, cfg);
  const recheck = async (ledger, cfg2, supAns) => run(C3['Final Send Check'], supAns || [{ ref: 'L-peachtree-pro-plumbing.example|initial|run1', allowed: true, checkedOk: true }], { 'Pick Approved Drafts': [pk], 'Re-read Send Ledger': ledger, 'Re-check Pause Switch': [cfg2 || cfgOn] });
  const mine = { row_number: 5, 'Ledger Row ID': 'L-peachtree-pro-plumbing.example|initial|run1', 'Ledger Key': 'L-peachtree-pro-plumbing.example|initial', Status: 'Sending' };
  const theirs = { row_number: 4, 'Ledger Row ID': 'L-peachtree-pro-plumbing.example|initial|run0', 'Ledger Key': 'L-peachtree-pro-plumbing.example|initial', Status: 'Sending' };
  expect('C3 final: our claim is first -> send', (await recheck([mine]))[0].send, true);
  expect('C3 final: a parallel run claimed first -> not sent (duplicate)', (await recheck([theirs, mine]))[0].notSentReason, 'duplicate');
  expect('C3 final: pause switched on mid-run -> not sent', (await recheck([mine], Object.assign({}, cfg, { outreachPaused: true })))[0].notSentReason, 'paused');
  expect('C3 final: unsubscribed mid-run -> not sent', (await recheck([mine], null, [{ ref: 'L-peachtree-pro-plumbing.example|initial|run1', allowed: false, checkedOk: true, reason: 'email is on the Suppression List' }]))[0].notSentReason, 'suppressed');
  expect('C3 final: ledger unreadable -> not sent', (await recheck([{ error: { message: 'x' } }]))[0].notSentReason, 'could not verify');
  const finals = await recheck([mine]);
  const rec = async (inputs) => (await run(C3['Record Send Results'], inputs, { 'Load Agency Config': [cfg], 'Final Send Check': finals }, { DateTime: FakeDT }))[0];
  let rr = await rec([{ ledgerRowId: mine['Ledger Row ID'], leadId: 'L-peachtree-pro-plumbing.example', outcome: 'sent', gmailMessageId: 'm1', gmailThreadId: 't1' }]);
  expect('C3 record: sent -> ledger Sent, lead Contacted, follow-up date set', [rr.ledgerUpdates[0].Status, rr.leadUpdates[0]['Pipeline Status'], rr.leadUpdates[0]['Next Allowed Follow-up'], rr.draftUpdates[0]['Send Status']], ['Sent', 'Contacted', '2026-11-23', 'Sent']);
  rr = await rec([{ ledgerRowId: mine['Ledger Row ID'], outcome: 'failed', error: 'Gmail refused (400)' }]);
  expect('C3 record: failed -> Failed + review item, no retry', [rr.ledgerUpdates[0].Status, rr.reviewItems[0].Type], ['Failed', 'Email failed']);
  rr = await rec([{ ledgerRowId: mine['Ledger Row ID'], outcome: 'uncertain', error: 'timeout' }]);
  expect('C3 record: uncertain -> stays Sending (blocks resend) + review', [rr.ledgerUpdates[0].Status, rr.reviewItems[0].Type], ['Sending', 'Delivery uncertain']);
  rr = await rec([{ error: { message: 'sub-workflow crashed' } }]);
  expect('C3 record: sending step crashed with no answer -> uncertain, never resent', [rr.ledgerUpdates[0].Status, rr.reviewItems[0].Type], ['Sending', 'Delivery uncertain']);
  rr = await rec([{ ledgerRowId: mine['Ledger Row ID'], outcome: 'not_sent_step_off', error: 'off' }]);
  expect('C3 record: Gmail step off -> "Not sent - Gmail step off" (does not block later)', rr.ledgerUpdates[0].Status, 'Not sent - Gmail step off');
  // duplicate run after a successful send
  pk = await pick([{ 'Ledger Key': 'L-peachtree-pro-plumbing.example|initial', Status: 'Sent', 'Created At': '2026-11-16 10:00' }], null, null, allDrafts.map((x) => (x === D_OK ? Object.assign({}, x, { 'Send Status': 'Not sent' }) : x)));
  expect('C3: run twice -> second run sends nothing', pk.candidates.length, 0);

  // ================= H7 =================
  const msg = { ledgerRowId: 'L-p|initial|run1', ledgerKey: 'L-p|initial', leadId: 'L-p', draftId: 'D-L-p-initial', to: 'info@peachtree-pro-plumbing.example', fromName: 'Alex Demo', fromEmail: 'alex@jido-demo.example', subject: 'Idea\r\nBcc: victim@x.example', body: 'Line 1\nLine 2', unsubscribeUrl: 'https://jido-api.app.n8n.cloud/webhook/jido-unsubscribe?t=uaaaaaaaaaaaaaaaaaaaaaaaa', oneClickVerified: false };
  let b = (await run(H7['Build Gmail Message'], [msg]))[0];
  const raw = Buffer.from(b.raw.split('-').join('+').split('_').join('/'), 'base64').toString('utf8');
  expect('H7: List-Unsubscribe has mailto + link; no One-Click until verified', [raw.indexOf('List-Unsubscribe: <mailto:alex@jido-demo.example?subject=unsubscribe>, <https://') !== -1, raw.indexOf('List-Unsubscribe-Post') === -1], [true, true]);
  expect('H7: header injection in subject neutralised (no Bcc header)', raw.split('\r\n').some((l) => l.indexOf('Bcc:') === 0), false);
  b = (await run(H7['Build Gmail Message'], [Object.assign({}, msg, { oneClickVerified: true })]))[0];
  expect('H7: One-Click header only when verified', Buffer.from(b.raw.split('-').join('+').split('_').join('/'), 'base64').toString('utf8').indexOf('List-Unsubscribe-Post: List-Unsubscribe=One-Click') !== -1, true);
  b = (await run(H7['Build Gmail Message'], [msg, msg]))[0];
  expect('H7: given two emails -> refuses', b.problems.length > 0, true);
  const res = async (built, r) => (await run(H7['Read Send Result'], [r], { 'Build Gmail Message': [built] }))[0];
  const okBuilt = (await run(H7['Build Gmail Message'], [msg]))[0];
  expect('H7 result: 200 + id -> sent', (await res(okBuilt, { statusCode: 200, body: { id: 'm1', threadId: 't1' } })).outcome, 'sent');
  expect('H7 result: 400 -> failed', (await res(okBuilt, { statusCode: 400, body: { error: { message: 'bad' } } })).outcome, 'failed');
  expect('H7 result: 503 -> uncertain', (await res(okBuilt, { statusCode: 503, body: {} })).outcome, 'uncertain');
  expect('H7 result: timeout -> uncertain', (await res(okBuilt, { error: { message: 'timeout of 30000ms exceeded' } })).outcome, 'uncertain');
  expect('H7 result: no credential -> failed', (await res(okBuilt, { error: { message: 'Credentials not found' } })).outcome, 'failed');
  expect('H7 result: step switched off (input passed through) -> not sent', (await res(okBuilt, okBuilt)).outcome, 'not_sent_step_off');
  expect('H7 result: carries its own Ledger Row ID', (await res(okBuilt, { statusCode: 200, body: { id: 'm1' } })).ledgerRowId, 'L-p|initial|run1');

  // ================= C4 =================
  const tokP = 'u' + 'p'.repeat(24), tokB = 'u' + 'b'.repeat(24);
  const drafts4 = [{ 'Draft ID': 'D-L-p-initial', 'Lead ID': 'L-peachtree-pro-plumbing.example', 'To Email': 'info@peachtree-pro-plumbing.example', 'Unsubscribe Token': tokP, 'Send Status': 'Sent' }, { 'Draft ID': 'D-L-b-initial', 'Lead ID': 'L-buckhead-comfort-hvac.example', 'To Email': 'hello@buckhead-comfort-hvac.example', 'Unsubscribe Token': tokB, 'Send Status': 'Not sent' }];
  const c4 = async (trig, supRows, draftsRows, c) => { const rq = (await run(C4['Read Request'], [trig]))[0]; return (await run(C4['Decide Unsubscribe'], supRows || sup, { 'Load Agency Config': [c || cfg], 'Read Request': [rq], 'Read Outreach Drafts': draftsRows || drafts4 }, { DateTime: FakeDT }))[0]; };
  let u = await c4({ headers: {}, query: { t: tokB, email: 'info@peachtree-pro-plumbing.example' }, body: {} });
  expect('C4 link: token unsubscribes ONLY its own recipient (extra email in link ignored)', [u.result, u.suppressionAppends.map((x) => x['Email Or Domain'])], ['Suppressed', ['hello@buckhead-comfort-hvac.example']]);
  expect('C4 link: lead marked opted out, unsent draft suppressed, logged', [u.leadUpdates[0]['Opted Out'], u.leadUpdates[0]['Pipeline Status'], u.draftUpdates[0]['Send Status'], u.unsubscribeLog[0].Result], ['YES', 'Unsubscribed', 'Suppressed', 'Suppressed']);
  expect('C4 link: confirmation page masks the address', [u.page.indexOf('h***@buckhead-comfort-hvac.example') !== -1, u.page.indexOf('hello@') === -1], [true, true]);
  u = await c4({ headers: {}, query: { t: 'u' + 'z'.repeat(24) }, body: {} });
  expect('C4 link: unknown token -> nothing suppressed', [u.result, u.suppressionAppends.length, u.leadUpdates.length], ['Unknown token', 0, 0]);
  u = await c4({ headers: {}, query: { email: 'victim@other.example' }, body: {} });
  expect('C4 link: no token, only an email -> nothing suppressed', [u.result, u.suppressionAppends.length], ['Invalid token', 0]);
  u = await c4({ headers: {}, query: { t: tokP }, body: {} }, sup.concat([{ 'Email Or Domain': 'info@peachtree-pro-plumbing.example' }]));
  expect('C4 link: already suppressed -> no duplicate row', [u.result, u.suppressionAppends.length], ['Already suppressed', 0]);
  u = await c4({ headers: {}, query: { t: tokP }, body: {} }, null, [{ error: { message: 'x' } }]);
  expect('C4 link: drafts unreadable -> human asked, honest page', [u.result, u.reviewItems[0].Type, u.page.indexOf('reply STOP') !== -1], ['Could not verify token', 'Unsubscribe needs a human', true]);
  u = await c4({ fromEmail: 'Owner <info@peachtree-pro-plumbing.example>', subject: 'Re: idea', text: 'Please STOP. Also remove boss@peachtree-pro-plumbing.example', gmailMessageId: 'm9' });
  expect('C4 reply: STOP suppresses the sender only, not addresses in the text', [u.result, u.suppressionAppends.map((x) => x['Email Or Domain'])], ['Suppressed', ['info@peachtree-pro-plumbing.example']]);
  u = await c4({ fromEmail: 'info@peachtree-pro-plumbing.example', subject: 'Re: idea', text: 'Sounds interesting, can we talk Tuesday?', gmailMessageId: 'm10' });
  expect('C4 reply: normal reply -> no action', [u.result, u.suppressionAppends.length], ['Not an opt-out request', 0]);
  u = await c4({ fromEmail: 'x@y.example', subject: 'unsubscribe', text: '', gmailMessageId: 'm11' });
  expect('C4 reply: "unsubscribe" in subject -> suppressed', u.result, 'Suppressed');
  // unsubscribe -> future outreach blocked
  const supAfter = sup.concat(u.suppressionAppends).concat([{ 'Email Or Domain': 'hello@buckhead-comfort-hvac.example' }]);
  const blockedNow = await run(H6['Decide Allowed Or Blocked'], LEADS, { 'When Called With Addresses': [{ leadId: 'L-buckhead-comfort-hvac.example', email: 'hello@buckhead-comfort-hvac.example', ref: 'r', crmUrl: CRM }], 'Read Suppression List': supAfter });
  expect('Unsubscribe -> H6 now blocks future outreach to that address', blockedNow[0].allowed, false);

  // ================= A0b =================
  const meta = { sheets: ['README', 'Leads', 'Settings', 'Send Ledger', 'Review Queue'].map((t, i) => ({ properties: { sheetId: [0, 100, 200, 600, 800][i], title: t, gridProperties: { columnCount: [5, 49, 5, 9, 9][i] } } })) };
  const vals = { valueRanges: [{ values: [['Key'], ['ENVIRONMENT'], ['GMAIL_SENDING_ENABLED']] }, { values: [['Ledger Key', 'Lead ID', 'Step', 'To Email', 'Status', 'Created At', 'Updated At', 'Gmail Message ID', 'Error']] }, { values: [['Lead ID', 'Outreach Status']] }] };
  let pl = (await run(A0B['Plan Changes'], [vals], { 'Load Agency Config': [cfg], 'Read CRM Structure': [meta] }))[0];
  expect('A0b: adds the 3 missing tabs', pl.structureBody.requests.filter((r) => r.addSheet).map((r) => r.addSheet.properties.title), ['Outreach Drafts', 'Draft History', 'Unsubscribe Requests']);
  expect('A0b: Send Ledger columns appended after existing ones (J1:M1)', pl.valuesBody.data.find((d) => d.range.indexOf('Send Ledger') !== -1).range, "'Send Ledger'!J1:M1");
  expect('A0b: Send Ledger widened by 4 columns before writing (real bug from run 129)', pl.structureBody.requests.filter((r) => r.appendDimension).map((r) => [r.appendDimension.sheetId, r.appendDimension.length]), [[600, 4]]);
  expect('A0b: widening happens in the structure step, before any values are written', pl.structureBody.requests.findIndex((r) => r.appendDimension) >= 0, true);
  expect('A0b: only missing Settings keys added, below existing rows', [pl.valuesBody.data.find((d) => d.range.indexOf('Settings') !== -1).range, pl.valuesBody.data.find((d) => d.range.indexOf('Settings') !== -1).values.some((r) => r[0] === 'GMAIL_SENDING_ENABLED')], ["'Settings'!A4:C12", false]);
  // Half-finished state seen in the real CRM after run 129: the 3 tabs exist but are empty; ledger columns and settings missing.
  const metaHalf = { sheets: meta.sheets.concat(['Outreach Drafts', 'Draft History', 'Unsubscribe Requests'].map((t, i) => ({ properties: { sheetId: 1300 + i * 100, title: t, gridProperties: { columnCount: [27, 8, 7][i] } } }))) };
  const valsHalf = { valueRanges: vals.valueRanges.concat([{}, {}, {}]) };
  pl = (await run(A0B['Plan Changes'], [valsHalf], { 'Load Agency Config': [cfg], 'Read CRM Structure': [metaHalf] }))[0];
  expect('A0b recovery: no duplicate tabs; headings written into the 3 empty tabs', [pl.structureBody.requests.some((r) => r.addSheet), pl.valuesBody.data.filter((d) => /Outreach Drafts|Draft History|Unsubscribe Requests/.test(d.range)).map((d) => d.range)], [false, ["'Outreach Drafts'!A1:AA1", "'Draft History'!A1:H1", "'Unsubscribe Requests'!A1:G1"]]);
  expect('A0b recovery: still adds ledger columns (with widening) and missing settings', [pl.structureBody.requests.filter((r) => r.appendDimension).length, pl.valuesBody.data.some((d) => d.range.indexOf('Send Ledger') !== -1), pl.valuesBody.data.some((d) => d.range.indexOf('Settings') !== -1)], [1, true, true]);
  const filledHeads = [{ values: [['Draft ID', 'Lead ID']] }, { values: [['Time']] }, { values: [['Time']] }];
  const vals2 = { valueRanges: [{ values: [['Key']].concat(['GMAIL_SENDING_ENABLED', 'SEND_BATCH_SIZE', 'DRAFT_BATCH_SIZE', 'SEND_WINDOW_START', 'SEND_WINDOW_END', 'DISCOVERY_CALL_MINUTES', 'AGENCY_WEBSITE', 'AD_DISCLOSURE_LINE', 'UNSUBSCRIBE_BASE_URL', 'ONE_CLICK_UNSUBSCRIBE_VERIFIED'].map((k) => [k])) }, { values: [vals.valueRanges[1].values[0].concat(['Ledger Row ID', 'Draft ID', 'Run ID', 'Gmail Thread ID'])] }, vals.valueRanges[2]].concat(filledHeads) };
  const meta2 = { sheets: metaHalf.sheets.map((x) => (x.properties.title === 'Send Ledger' ? { properties: Object.assign({}, x.properties, { gridProperties: { columnCount: 13 } }) } : x)) };
  pl = (await run(A0B['Plan Changes'], [vals2], { 'Load Agency Config': [cfg], 'Read CRM Structure': [meta2] }))[0];
  expect('A0b: second run adds nothing (safe to repeat)', [pl.added.length, pl.hasValues, pl.structureBody.requests.some((r) => r.addSheet)], [0, false, false]);
  console.log(fails ? fails + ' FAILED of ' + n : 'ALL PASSED (' + n + ')');
})();
