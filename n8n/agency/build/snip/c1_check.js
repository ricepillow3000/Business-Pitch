// Checks every AI draft by Lead ID, removes unsupported claims, adds greeting, sign-off and the
// required footer (sender, mailing address, opt-out), then prepares CRM rows. Never sends anything.
const cfg = $('Load Agency Config').first().json;
const s = cfg.settings || {};
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
__HASH__
const NL = String.fromCharCode(10);
const now = DateTime.now().setZone(cfg.timezone || 'America/New_York');
const stamp = now.toFormat('yyyy-LL-dd HH:mm');
const leadsById = {};
const allLeads = $('Read Leads').all().map((i) => i.json || {});
allLeads.forEach((l) => { if (clean(l['Lead ID'])) leadsById[clean(l['Lead ID'])] = l; });
const requests = $('Build AI Requests').all().map((i) => i.json || {});
const answers = {};
const warnings = [];
$input.all().forEach((i) => { const a = i.json || {}; const id = clean(a.leadId); if (!id) { warnings.push('AI answer without Lead ID ignored'); return; } if (answers[id]) { warnings.push('second AI answer for ' + id + ' ignored'); return; } answers[id] = a; });
const filled = (v) => clean(v) && clean(v).indexOf('[FILL IN]') === -1;
const need = (k) => (filled(s[k]) ? clean(s[k]) : '[MISSING: ' + k + ']');
const Q = [[8216, "'"], [8217, "'"], [8220, '"'], [8221, '"'], [8211, '-'], [8212, '-'], [160, ' ']];
const norm = (t) => { let x = clean(t).toLowerCase(); Q.forEach((q) => { x = x.split(String.fromCharCode(q[0])).join(q[1]); }); return x.split(NL).join(' ').split('  ').join(' '); };
const BANNED = ['guarantee', '100%', ' roi', 'roi ', 'double your', 'triple', '#1', 'number one', 'best in', 'our clients', 'our customers', 'clients say', 'customers love', 'case study', 'case studies', 'we helped', "we've helped", 'we have helped', 'trusted by', 'award', 'you are losing', "you're losing", 'losing customers', 'losing money', 'missing out', 'struggling', 'frustrated', 'we built', 'we have built', 'already built', 'we created', 'risk-free', 'risk free', 'act now', 'limited time', 'http', 'www.', '$', '%'];
const coreName = (n) => { let x = clean(n); ['(DEMO)', ', LLC', ' LLC', ', Inc.', ' Inc.', ' Inc'].forEach((t) => { x = x.split(t).join(''); }); return x.trim(); };
const randomToken = () => {
  const abc = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = 'u';
  let bytes = null;
  try { bytes = new Uint8Array(24); crypto.getRandomValues(bytes); } catch (e) { bytes = null; }
  for (let i = 0; i < 24; i++) out += abc[(bytes ? bytes[i] : Math.floor(Math.random() * 256)) % 36];
  return out;
};
const out = { crmUrl: cfg.crmUrl, draftUpdates: [], historyRows: [], leadUpdates: [], reviewItems: [], events: [] };
const ev = (event, leadId, details, count) => out.events.push({ crmUrl: cfg.crmUrl, workflow: 'C1 Draft Outreach', runId: String($execution.id), isDemo: cfg.isDemo !== false, event, leadId: leadId || '', count: count === undefined ? 1 : count, details: details || '' });
let saved = 0;
requests.forEach((req) => {
  const id = clean(req.leadId);
  const l = leadsById[id];
  const a = answers[id];
  if (!l) { warnings.push('lead ' + id + ' not found'); return; }
  if (!a || a.ok !== true || !a.data) { ev('draft_failed', id, 'AI did not return a usable draft: ' + clean(a && a.error).slice(0, 150)); return; }
  const name = coreName(l['Business Name']);
  const evidenceNorm = norm(l.Evidence);
  const removed = [];
  let aiBody = clean(a.data.body).split(String.fromCharCode(13)).join('');
  const lines = aiBody.split(NL).map((x) => x.trim());
  if (lines.length && /^(hi|hello|dear|hey)( |,)/i.test(lines[0])) lines.shift();
  const keptLines = lines.map((line) => {
    const parts = line.match(new RegExp('[^.!?]+[.!?]*', 'g')) || [];
    return parts.map((p) => p.trim()).filter((sent) => {
      if (!sent) return false;
      const low = ' ' + norm(sent) + ' ';
      const hit = BANNED.find((b) => low.indexOf(b) !== -1);
      if (hit) { removed.push(sent + ' [' + hit.trim() + ']'); return false; }
      const quoted = norm(sent).split('"').filter((x, i) => i % 2 === 1).map((x) => x.trim()).filter(Boolean);
      const bad = quoted.find((qt) => evidenceNorm.indexOf(qt) === -1);
      if (bad) { removed.push(sent + ' [quote not on their website]'); return false; }
      return true;
    }).join(' ');
  }).filter((x, i, arr) => x || (i > 0 && arr[i - 1]));
  aiBody = keptLines.join(NL).trim();
  const otherNames = allLeads.filter((o) => clean(o['Lead ID']) && clean(o['Lead ID']) !== id).map((o) => coreName(o['Business Name'])).filter((n) => n.length >= 4 && norm(n) !== norm(name));
  const mixed = otherNames.find((n) => norm(aiBody + ' ' + a.data.subject).indexOf(norm(n)) !== -1);
  if (mixed) {
    out.reviewItems.push({ 'Item ID': 'RQ-D-' + id + '-mixup-' + now.toFormat('yyyyLLddHHmm'), 'Created At': stamp, Type: 'Draft mentioned another business', 'Lead ID': id, Summary: 'The AI draft for ' + name + ' mentioned ' + mixed + '. It was NOT saved. It will be redrafted next run.', Link: cfg.crmUrl, Status: 'Open' });
    ev('draft_rejected_mixup', id, 'mentioned ' + mixed);
    return;
  }
  const callLen = clean(s.DISCOVERY_CALL_MINUTES) || '20';
  const lowBody = norm(aiBody);
  if (['call', 'chat', 'meeting', 'talk'].every((w) => lowBody.indexOf(w) === -1)) aiBody += (aiBody ? NL + NL : '') + 'Would you be open to a short ' + callLen + '-minute call to see if this could help?';
  let subject = clean(a.data.subject).split(NL).join(' ');
  while (/^(re|fw|fwd) *:/i.test(subject)) subject = subject.replace(/^(re|fw|fwd) *:/i, '').trim();
  const subjHit = BANNED.find((b) => (' ' + norm(subject) + ' ').indexOf(b) !== -1);
  if (!subject || subjHit) { if (subjHit) removed.push('Subject: ' + subject + ' [' + subjHit.trim() + ']'); subject = 'A quick idea for ' + name; }
  subject = subject.slice(0, 70);
  const to = clean(l['Public Email']).toLowerCase();
  const token = randomToken();
  const base = clean(s.UNSUBSCRIBE_BASE_URL);
  const optOut = base.indexOf('https://') === 0 ? 'reply STOP or use this link: ' + base + (base.indexOf('?') === -1 ? '?' : '&') + 't=' + token : 'reply STOP and we will not email you again';
  const site = clean(l.Website) || 'your website';
  const footer = [
    '--', need('SENDER_NAME'), need('AGENCY_NAME') + (filled(s.AGENCY_WEBSITE) ? ' | ' + clean(s.AGENCY_WEBSITE) : ''), need('AGENCY_MAILING_ADDRESS'), '',
    (filled(s.AD_DISCLOSURE_LINE) ? clean(s.AD_DISCLOSURE_LINE) + ' ' : '') + 'You are receiving this one-time note because ' + to + ' is listed on ' + site + '. To stop all emails from us, ' + optOut + '.'
  ].join(NL);
  const body = ['Hi ' + name + ' team,', '', aiBody, '', 'Thanks,', need('SENDER_NAME'), '', footer].join(NL);
  const words = aiBody.split(' ').filter(Boolean).length;
  const hash = draftHash(to, subject, body);
  const evidenceUsed = (Array.isArray(a.data.evidence_used) ? a.data.evidence_used : []).map(clean).filter((q) => q && evidenceNorm.indexOf(norm(q)) !== -1);
  const notes = [];
  if (removed.length) notes.push(removed.length + ' sentence(s) removed as unsupported');
  if (words < 25) notes.push('Very short after removing unsupported claims - rewrite before approving');
  if (body.indexOf('[MISSING:') !== -1) notes.push('Footer is missing agency details in Settings - sending will be blocked until filled');
  const draftId = 'D-' + id + '-initial';
  out.draftUpdates.push({
    'Draft ID': draftId, 'Lead ID': id, Step: 'initial', Version: '1', 'Created At': stamp, 'Updated At': stamp,
    'Business Name': clean(l['Business Name']), 'To Email': to, Subject: subject, Body: body,
    'Evidence Used': evidenceUsed.join(' || '), 'Research Sources': [clean(l['Evidence Sources']), clean(l['Email Found At'])].filter(Boolean).join(' '),
    'Removed Claims': removed.join(' || ').slice(0, 2000), 'Draft Hash': hash, 'Review Status': 'Pending review', 'Reviewed By': '', 'Reviewed At': '',
    'Approved Hash': '', 'Approved At': '', 'Review Notes': notes.join('; '), 'Send Status': 'Not sent', 'Unsubscribe Token': token, 'Last Error': ''
  });
  out.historyRows.push({ Time: stamp, 'Draft ID': draftId, Version: '1', Event: 'drafted', 'Draft Hash': hash, Subject: subject, Body: body, By: 'C1 automation' });
  out.leadUpdates.push({ 'Lead ID': id, 'Outreach Status': 'Pending', 'Email Subject': subject, 'Email Draft': body, 'Last Updated': now.toFormat('yyyy-LL-dd') });
  out.reviewItems.push({ 'Item ID': 'RQ-' + draftId + '-v1', 'Created At': stamp, Type: removed.length || words < 25 ? 'Draft ready - check edits' : 'Draft ready for approval', 'Lead ID': id, Summary: name + ': draft email waiting for your approval in Outreach Drafts.' + (notes.length ? ' ' + notes.join('; ') : ''), Link: cfg.crmUrl, Status: 'Open' });
  if (removed.length) ev('unsupported_claims_removed', id, removed.length + ' sentence(s)', removed.length);
  saved++;
});
const skipped = ($('Pick Leads To Draft').first().json.skipped || []);
const blocked = $('Suppression Check').all().map((i) => i.json || {}).filter((d) => d.allowed !== true);
blocked.forEach((d) => ev('draft_skipped_suppressed', d.leadId, d.reason));
ev('drafts_created', '', 'Waiting for approval in Outreach Drafts', saved);
if (skipped.length) ev('draft_candidates_skipped', '', skipped.join(' | ').slice(0, 500), skipped.length);
if (warnings.length) ev('draft_warning', '', warnings.join(' | ').slice(0, 500), warnings.length);
return [{ json: out }];
