// Turns the request into CRM changes. Unknown tokens change nothing. If the draft list can't be
// read, a human is asked to handle it (and the person is told to reply STOP as a backup).
const cfg = $('Load Agency Config').first().json || {};
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const req = $('Read Request').first().json;
const drafts = $('Read Outreach Drafts').all().map((i) => i.json || {});
const sup = $input.all().map((i) => i.json || {});
const now = DateTime.now().setZone(cfg.timezone || 'America/New_York');
const stamp = now.toFormat('yyyy-LL-dd HH:mm');
const today = now.toFormat('yyyy-LL-dd');
const draftsOk = !drafts.some((r) => r.error);
const supOk = !sup.some((r) => r.error);
const out = { crmUrl: cfg.crmUrl, suppressionAppends: [], unsubscribeLog: [], leadUpdates: [], draftUpdates: [], reviewItems: [], events: [], result: '', page: '' };
const ev = (event, leadId, details) => out.events.push({ crmUrl: cfg.crmUrl, workflow: 'C4 Unsubscribe', runId: String($execution.id), isDemo: cfg.isDemo !== false, event, leadId: leadId || '', count: 1, details: details || '' });
const mask = (e) => { const p = e.split('@'); return p.length === 2 ? p[0].slice(0, 1) + '***@' + p[1] : 'your address'; };
const agency = clean((cfg.settings || {}).AGENCY_NAME).indexOf('[FILL IN]') === -1 && clean((cfg.settings || {}).AGENCY_NAME) ? clean(cfg.settings.AGENCY_NAME) : 'We';
let email = '';
let leadId = '';
if (cfg.ok !== true && !clean(cfg.crmUrl)) out.result = 'CRM not set up';
else if (req.channel === 'link') {
  if (!req.tokenLooksValid) out.result = 'Invalid token';
  else if (!draftsOk) out.result = 'Could not verify token';
  else {
    const d = drafts.find((x) => clean(x['Unsubscribe Token']).toLowerCase() === req.token);
    if (!d) out.result = 'Unknown token';
    else { email = clean(d['To Email']).toLowerCase(); leadId = clean(d['Lead ID']); }
  }
} else if (!req.isOptOut) out.result = 'Not an opt-out request';
else {
  email = clean(req.email).toLowerCase();
  if (email.split('@').length !== 2) { email = ''; out.result = 'Reply sender address unreadable'; }
  else if (draftsOk) { const d = drafts.find((x) => clean(x['To Email']).toLowerCase() === email); if (d) leadId = clean(d['Lead ID']); }
}
if (email) {
  const already = supOk && sup.some((r) => clean(r['Email Or Domain']).toLowerCase() === email);
  if (!already) out.suppressionAppends.push({ 'Email Or Domain': email, Type: 'email', Reason: 'Unsubscribed via ' + req.channel, 'Added At': stamp, 'Added By': 'C4 automation', Source: req.channel + ': ' + clean(req.ref).slice(0, 60) });
  if (leadId) out.leadUpdates.push({ 'Lead ID': leadId, 'Opted Out': 'YES', 'Outreach Status': 'Suppressed', 'Pipeline Status': 'Unsubscribed', 'Last Updated': today });
  if (draftsOk) drafts.filter((x) => clean(x['To Email']).toLowerCase() === email && ['', 'not sent'].indexOf(clean(x['Send Status']).toLowerCase()) !== -1)
    .forEach((x) => out.draftUpdates.push({ 'Draft ID': clean(x['Draft ID']), 'Send Status': 'Suppressed', 'Updated At': stamp, 'Last Error': 'Recipient unsubscribed' }));
  out.result = already ? 'Already suppressed' : 'Suppressed';
  ev('opt_out_recorded', leadId, req.channel + (already ? ' (already on list)' : ''));
}
if (['Could not verify token', 'CRM not set up', 'Reply sender address unreadable'].indexOf(out.result) !== -1) {
  out.reviewItems.push({ 'Item ID': 'RQ-UNSUB-' + clean(req.ref).slice(0, 30) + '-' + now.toFormat('yyyyLLddHHmm'), 'Created At': stamp, Type: 'Unsubscribe needs a human', 'Lead ID': leadId, Summary: 'An unsubscribe request (' + req.channel + ') could not be processed automatically: ' + out.result + '. Find the person and add them to the Suppression List today.', Link: cfg.crmUrl, Status: 'Open' });
  ev('unsubscribe_needs_human', leadId, out.result);
}
if (out.result === 'Unknown token' || out.result === 'Invalid token') ev('unsubscribe_unknown_token', '', out.result);
out.unsubscribeLog.push({ Time: stamp, Channel: req.channel, Reference: clean(req.ref).slice(0, 80), Email: email, 'Lead ID': leadId, Result: out.result, Details: req.channel === 'link' ? 'token only; other link values ignored' : 'reply sender only' });
const ok = out.result === 'Suppressed' || out.result === 'Already suppressed';
out.page = ok ? '<h2>You are unsubscribed</h2><p>' + agency + ' will not email ' + mask(email) + ' again.</p>'
  : out.result === 'Unknown token' || out.result === 'Invalid token' ? '<h2>This unsubscribe link is not valid</h2><p>To stop emails from us, reply STOP to any message we sent you.</p>'
  : '<h2>We received your request</h2><p>We will process it promptly. If you get another email from us, reply STOP.</p>';
return [{ json: out }];
