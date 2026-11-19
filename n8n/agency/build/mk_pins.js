const h0 = require('./harness');
const fs = require('fs');
const { DateTime } = require('luxon');
const run = async (code, input, nd, opts) => { const r = await h0.run(code, input, nd || {}, opts || {}); return (Array.isArray(r) ? r : [r]).map((i) => i.json); };
const load = (f) => Object.fromEntries(h0.codeNodes(h0.load('wf/' + f)).map((c) => [c.name, c.code]));
const H6 = load('h6.js'), C1 = load('c1.js'), C3 = load('c3.js');
const FakeDT = { now: () => DateTime.fromISO('2026-11-16T10:00:00', { zone: 'America/New_York' }) };
const CRM = 'https://docs.google.com/spreadsheets/d/DEMO_TEST/edit';
const settings = { AGENCY_NAME: 'Jido (DEMO)', SENDER_NAME: 'Alex Demo', SENDER_EMAIL: 'alex@jido-demo.example', AGENCY_MAILING_ADDRESS: '100 Demo St, Atlanta, GA 30301', AGENCY_WEBSITE: 'https://jido-demo.example', DAILY_SEND_LIMIT: '10', SEND_BATCH_SIZE: '3', DRAFT_BATCH_SIZE: '5', GMAIL_SENDING_ENABLED: 'YES', UNSUBSCRIBE_BASE_URL: 'https://jido-api.app.n8n.cloud/webhook/jido-unsubscribe', SEND_WINDOW_START: '9', SEND_WINDOW_END: '16' };
const cfg = { ok: true, crmUrl: CRM, crmId: 'DEMO_TEST', isDemo: true, systemPaused: false, outreachPaused: false, timezone: 'America/New_York', settings };
const cfgDefault = Object.assign({}, cfg, { outreachPaused: true, settings: Object.assign({}, settings, { GMAIL_SENDING_ENABLED: 'NO' }) });
const lead = (id, name, email, extra) => Object.assign({ 'Lead ID': id, 'Is Demo': 'YES', 'Business Name': name + ' (DEMO)', Industry: 'Plumbing', City: 'Decatur', Website: 'https://' + id.slice(2), 'Public Email': email, Temperature: 'Warm', 'Pipeline Status': 'Ready for review', 'Opted Out': 'NO', 'Research Confidence': 'High', 'Primary Opportunity': 'Missed-call text back', Evidence: '"Family owned plumbers serving Decatur homes since 2009" (homepage)', 'Evidence Sources': 'https://' + id.slice(2) + '/', 'Email Found At': 'https://' + id.slice(2) + '/contact' }, extra || {});
const P = lead('L-peachtree-pro-plumbing.example', 'Peachtree Pro Plumbing', 'info@peachtree-pro-plumbing.example');
const B = lead('L-buckhead-comfort-hvac.example', 'Buckhead Comfort HVAC', 'hello@buckhead-comfort-hvac.example');
const S = lead('L-blocked-demo.example', 'Blocked Demo Co', 'donotcontact@blocked-demo.example');
const LOW = lead('L-low.example', 'Low Confidence Co', 'a@low.example');
const OPT = lead('L-opted.example', 'Opted Co', 'x@opted.example', { 'Opted Out': 'YES' });
const REAL = lead('L-real.com', 'Real Co', 'owner@realbusiness.com');
const LEADS = [P, B, S, LOW, OPT, REAL];
const sup = [{ 'Email Or Domain': 'donotcontact@blocked-demo.example' }];
const w = (a) => a.map((json) => ({ json }));
const save = (n, o) => fs.writeFileSync('pins/' + n + '.json', JSON.stringify(o));
const hash = (s) => { let a = 2166136261, c = 5381; for (let i = 0; i < s.length; i++) { const x = s.charCodeAt(i); a = Math.imul(a ^ x, 16777619) >>> 0; c = (Math.imul(c, 33) + x) >>> 0; } return ('0000000' + a.toString(16)).slice(-8) + ('0000000' + c.toString(16)).slice(-8); };
const BODY = (name) => 'Hi ' + name + ' team,\n\nIdea.\n\nThanks,\nAlex Demo\n\n--\nAlex Demo\nJido (DEMO)\n100 Demo St, Atlanta, GA 30301\n\nTo stop all emails from us, reply STOP.';
const mk = (id, name, email, over) => { const b = BODY(name); const hh = hash(email + '|Subj|' + b); return Object.assign({ 'Draft ID': 'D-' + id + '-initial', 'Lead ID': id, Step: 'initial', Version: '1', 'To Email': email, Subject: 'Subj', Body: b, 'Draft Hash': hh, 'Review Status': 'Approved', 'Reviewed By': 'AD', 'Reviewed At': '2026-11-16 09:00', 'Approved Hash': hh, 'Approved At': '2026-11-16 09:00', 'Send Status': 'Not sent', 'Unsubscribe Token': 'u' + 'a'.repeat(24) }, over || {}); };
(async () => {
  // ---------- C2 ----------
  const pend = (id, name, email, over) => mk(id, name, email, Object.assign({ 'Review Status': 'Pending review', 'Reviewed By': '', 'Reviewed At': '', 'Approved Hash': '', 'Approved At': '' }, over));
  const c2rows = [
    pend('L-c2-approve.example', 'Approve Co', 'a@c2-approve.example', { 'Review Status': 'Approved', 'Reviewed By': 'AD' }),
    Object.assign(mk('L-c2-edited.example', 'Edited Co', 'e@c2-edited.example'), { Body: BODY('Edited Co') + ' We guarantee results.' }),
    pend('L-c2-reject.example', 'Reject Co', 'r@c2-reject.example', { 'Review Status': 'Rejected', 'Reviewed By': 'AD' }),
    pend('L-c2-noname.example', 'No Name Co', 'n@c2-noname.example', { 'Review Status': 'Approved' }),
    mk('L-c2-done.example', 'Done Co', 'd@c2-done.example'),
    Object.assign(mk('L-c2-sent.example', 'Sent Co', 's@c2-sent.example', { 'Send Status': 'Sent' }), { Body: 'changed after sending' })];
  save('c2', { 'Run Approval Check Now': [{ json: {} }], 'Load Agency Config': w([cfgDefault]), 'Read Outreach Drafts': w(c2rows), 'Save Review Updates': [{ json: { ok: true } }] });
  // ---------- C3 ----------
  const D_OK = mk(P['Lead ID'], 'Peachtree Pro Plumbing', P['Public Email']);
  const D_PEND = mk(B['Lead ID'], 'Buckhead Comfort HVAC', B['Public Email'], { 'Review Status': 'Pending review' });
  const D_EDIT = Object.assign(mk(LOW['Lead ID'], 'Low Confidence Co', LOW['Public Email']), { Body: 'edited text with STOP' });
  const D_SUP = mk(S['Lead ID'], 'Blocked Demo Co', S['Public Email']);
  const D_OPT = mk(OPT['Lead ID'], 'Opted Co', OPT['Public Email']);
  const D_REAL = mk(REAL['Lead ID'], 'Real Co', REAL['Public Email']);
  const drafts = [D_OK, D_PEND, D_EDIT, D_SUP, D_OPT, D_REAL];
  const pre = await run(C3['Preselect Approved Drafts'], LEADS, { 'Load Agency Config': [cfg], 'Read Outreach Drafts': drafts, 'Read Send Ledger': [{}] });
  const supAns = await run(H6['Decide Allowed Or Blocked'], LEADS, { 'When Called With Addresses': pre.map((x) => Object.assign({}, x, { crmUrl: CRM })), 'Read Suppression List': sup });
  const key = P['Lead ID'] + '|initial';
  const theirs = { row_number: 2, 'Ledger Row ID': key + '|999', 'Ledger Key': key, Status: 'Sending', 'Created At': '2026-11-16 09:59' };
  const base = { 'Run Sending Now': [{ json: {} }], 'Load Agency Config': w([cfg]), 'Read Outreach Drafts': w(drafts), 'Read Send Ledger': [{ json: {} }], 'Read Leads': w(LEADS), 'Check Suppression': w(supAns), 'Save Blocked Or Suppressed': [{ json: { ok: true } }], 'Write Sending Rows To Ledger': [{ json: { ok: true } }], 'Send One Email': [{ json: { outcome: 'sent', ledgerRowId: 'SHOULD-NOT-BE-REACHED' } }], 'Save Send Results': [{ json: { ok: true } }] };
  save('c3_stop', Object.assign({}, base, { 'Load Agency Config': w([cfgDefault]) }));
  save('c3_dup', Object.assign({}, base, { 'Check Send Switches': [{ json: { allowed: true, reasons: '' } }], 'Re-read Send Ledger': w([theirs, { row_number: 3, 'Ledger Row ID': key + '|mine', 'Ledger Key': key, Status: 'Sending' }]), 'Re-check Pause Switch': w([cfg]), 'Re-check Suppression': w([{ ref: 'x', allowed: true, checkedOk: true }]) }));
  save('c3_pause', Object.assign({}, base, { 'Check Send Switches': [{ json: { allowed: true, reasons: '' } }], 'Re-read Send Ledger': w([theirs]), 'Re-check Pause Switch': w([Object.assign({}, cfg, { outreachPaused: true })]), 'Re-check Suppression': w([{ ref: 'x', allowed: true, checkedOk: true }]) }));
  fs.writeFileSync('pins/c3_meta.json', JSON.stringify({ key, pre: pre.map((x) => x.ref), sup: supAns.map((x) => [x.leadId, x.allowed]) }));
  // ---------- C4 ----------
  const tokP = 'u' + 'p'.repeat(24), tokB = 'u' + 'b'.repeat(24);
  const drafts4 = [{ 'Draft ID': 'D-L-p-initial', 'Lead ID': P['Lead ID'], 'To Email': P['Public Email'], 'Unsubscribe Token': tokP, 'Send Status': 'Sent' }, { 'Draft ID': 'D-L-b-initial', 'Lead ID': B['Lead ID'], 'To Email': B['Public Email'], 'Unsubscribe Token': tokB, 'Send Status': 'Not sent' }];
  const c4base = { 'Load Agency Config': w([cfg]), 'Read Outreach Drafts': w(drafts4), 'Read Suppression List': w(sup), 'Save Opt-out': [{ json: { ok: true } }] };
  save('c4_link', Object.assign({}, c4base, { 'Unsubscribe Link (GET)': [{ json: { headers: {}, query: { t: tokB, email: P['Public Email'] }, body: {} } }] }));
  save('c4_unknown', Object.assign({}, c4base, { 'Unsubscribe Link (GET)': [{ json: { headers: {}, query: { t: 'u' + 'z'.repeat(24) }, body: {} } }] }));
  save('c4_reply', Object.assign({}, c4base, { 'When Called With A Reply': [{ json: { fromEmail: 'Peachtree Office <INFO@peachtree-pro-plumbing.example>', subject: 'Re: Subj', text: 'STOP', gmailMessageId: 'm9', gmailThreadId: 't9' } }] }));
  save('c4_drafts_fail', Object.assign({}, c4base, { 'Read Outreach Drafts': w([{ error: { message: 'unreadable' } }]), 'Unsubscribe Link (GET)': [{ json: { headers: {}, query: { t: tokB }, body: {} } }] }));
  console.log('ok', JSON.stringify(JSON.parse(fs.readFileSync('pins/c3_meta.json'))));
})();
