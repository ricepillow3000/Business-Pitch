// Decides, draft by draft, what may be sent now. Matches everything by Draft ID / Lead ID.
const cfg = $('Load Agency Config').first().json;
const s = cfg.settings || {};
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
__HASH__
const now = DateTime.now().setZone(cfg.timezone || 'America/New_York');
const stamp = now.toFormat('yyyy-LL-dd HH:mm');
const today = now.toFormat('yyyy-LL-dd');
const runId = String($execution.id);
const drafts = $('Read Outreach Drafts').all().map((i) => i.json || {});
const ledger = $('Read Send Ledger').all().map((i) => i.json || {});
const leadsById = {};
$('Read Leads').all().forEach((i) => { const l = i.json || {}; if (clean(l['Lead ID'])) leadsById[clean(l['Lead ID'])] = l; });
const sup = {};
$input.all().forEach((i) => { const d = i.json || {}; if (clean(d.ref)) sup[clean(d.ref)] = d; });
const BLOCKING = ['sending', 'sent', 'failed'];
const usedToday = ledger.filter((r) => clean(r['Created At']).indexOf(today) === 0 && BLOCKING.indexOf(clean(r.Status).toLowerCase()) !== -1).length;
const limit = Math.min(Number(s.DAILY_SEND_LIMIT) || 0, 50);
const perRun = Math.min(Math.max(Number(s.SEND_BATCH_SIZE) || 3, 1), 10);
let room = Math.max(Math.min(limit - usedToday, perRun), 0);
const isDemoAddr = (e) => { const d = e.split('@')[1] || ''; return d.endsWith('.example') || ['example.com', 'example.org', 'example.net'].indexOf(d) !== -1; };
const out = { crmUrl: cfg.crmUrl, candidates: [], draftUpdates: [], leadUpdates: [], reviewItems: [], events: [] };
const ev = (event, leadId, details) => out.events.push({ crmUrl: cfg.crmUrl, workflow: 'C3 Send Approved Outreach', runId, isDemo: cfg.isDemo !== false, event, leadId: leadId || '', count: 1, details: details || '' });
const block = (d, why, resetApproval) => {
  const u = { 'Draft ID': clean(d['Draft ID']), 'Updated At': stamp, 'Last Error': why };
  if (resetApproval) Object.assign(u, { 'Review Status': 'Pending review', 'Approved Hash': '', 'Approved At': '', 'Review Notes': why + ' - please review and approve again.' });
  out.draftUpdates.push(u);
  if (resetApproval) out.leadUpdates.push({ 'Lead ID': clean(d['Lead ID']), 'Outreach Status': 'Pending', 'Last Updated': today });
  ev('send_blocked', clean(d['Lead ID']), why);
};
drafts.forEach((d) => {
  const draftId = clean(d['Draft ID']);
  const leadId = clean(d['Lead ID']);
  if (!draftId || clean(d['Review Status']) !== 'Approved' || ['', 'not sent'].indexOf(clean(d['Send Status']).toLowerCase()) === -1) return;
  const to = clean(d['To Email']).toLowerCase();
  const body = clean(d.Body);
  const cur = draftHash(d['To Email'], d.Subject, d.Body);
  if (cur !== clean(d['Approved Hash']) || !clean(d['Approved At']) || !clean(d['Reviewed By'])) { block(d, 'Changed after approval, or approval not recorded yet', true); return; }
  const lead = leadsById[leadId];
  if (!lead) { block(d, 'Lead row not found'); return; }
  const sc = sup[draftId];
  if (!sc || sc.checkedOk !== true) { block(d, 'Suppression could not be verified - not sent'); return; }
  if (sc.allowed !== true || clean(lead['Opted Out']).toUpperCase() === 'YES') {
    out.draftUpdates.push({ 'Draft ID': draftId, 'Send Status': 'Suppressed', 'Updated At': stamp, 'Last Error': 'Suppressed: ' + (sc.reason || 'opted out') });
    out.leadUpdates.push({ 'Lead ID': leadId, 'Outreach Status': 'Suppressed', 'Last Updated': today });
    ev('blocked_send_attempt', leadId, 'suppressed: ' + (sc.reason || 'opted out'));
    return;
  }
  if (cfg.isDemo !== false && !isDemoAddr(to)) { block(d, 'DEMO mode: only fictional .example addresses may be used'); return; }
  if (to !== clean(lead['Public Email']).toLowerCase()) { block(d, 'To address no longer matches the lead email', true); return; }
  const step0 = clean(d.Step) || 'initial';
  if (step0 !== 'initial') {
    const replied = clean(lead['Reply Status']) || (clean(lead['Reply Category']) && clean(lead['Reply Category']).indexOf('Out of office') !== 0);
    const stage = clean(lead['Pipeline Status']).toLowerCase();
    if (replied || ['contacted', 'follow-up pending'].indexOf(stage) === -1) {
      out.draftUpdates.push({ 'Draft ID': draftId, 'Review Status': 'Rejected', 'Approved Hash': '', 'Approved At': '', 'Review Notes': 'Cancelled automatically before sending: the lead has replied or moved on (' + (clean(lead['Reply Category']) || clean(lead['Pipeline Status'])) + ').', 'Updated At': stamp });
      ev('followup_cancelled', leadId, draftId + ': lead replied or moved on');
      return;
    }
    if (!clean(d['Gmail Thread ID'])) { block(d, 'Follow-up has no Gmail thread to reply in'); return; }
  }
  const addr = clean(s.AGENCY_MAILING_ADDRESS);
  if (body.indexOf('[MISSING:') !== -1 || !addr || body.indexOf(addr) === -1 || body.indexOf('STOP') === -1 || body.indexOf(clean(s.SENDER_NAME)) === -1) { block(d, 'Footer incomplete (sender, mailing address and STOP opt-out are required)'); return; }
  const step = clean(d.Step) || 'initial';
  const key = leadId + '|' + step;
  if (ledger.some((r) => clean(r['Ledger Key']) === key && BLOCKING.indexOf(clean(r.Status).toLowerCase()) !== -1)) { ev('duplicate_prevented', leadId, 'Send Ledger already has ' + key); return; }
  if (room <= 0) { ev('send_waiting_limit', leadId, 'daily or per-run limit reached'); return; }
  room--;
  const base = clean(s.UNSUBSCRIBE_BASE_URL);
  const token = clean(d['Unsubscribe Token']);
  out.candidates.push({
    ledgerKey: key, ledgerRowId: key + '|' + runId, draftId, leadId, step, to, subject: clean(d.Subject), body,
    fromName: clean(s.SENDER_NAME), fromEmail: clean(s.SENDER_EMAIL).toLowerCase(),
    unsubscribeUrl: base.indexOf('https://') === 0 && token ? base + (base.indexOf('?') === -1 ? '?' : '&') + 't=' + token : '',
    oneClickVerified: clean(s.ONE_CLICK_UNSUBSCRIBE_VERIFIED).toUpperCase() === 'YES',
    gmailThreadId: step === 'initial' ? '' : clean(d['Gmail Thread ID'])
  });
});
return [{ json: out }];
