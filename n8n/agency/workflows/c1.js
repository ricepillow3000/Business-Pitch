const manualStart = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: "Run Drafting Now" }, output: [{}] });
const calledStart = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.3, config: { name: "When Called By Scheduler", parameters: { inputSource: 'passthrough' } }, output: [{}] });
const loadConfig = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: "Load Agency Config",
    executeOnce: true,
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: "EwEgjWyFneyjExzI", cachedResultName: "[AGENCY] H0 Helper: Agency Config" },
      mode: 'once',
      options: { waitForSubWorkflow: true }
    }
  },
  output: [{ ok: true, crmUrl: 'https://docs.google.com/spreadsheets/d/SAMPLE/edit', isDemo: true, systemPaused: false, settings: {} }]
});
const allowed = ifElse({
  version: 2.2,
  config: {
    name: 'Allowed To Run?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [
          { leftValue: expr('{{ $json.ok }}'), operator: { type: 'boolean', operation: 'true', singleValue: true }, rightValue: '' } , { leftValue: expr('{{ $json.systemPaused }}'), operator: { type: 'boolean', operation: 'false', singleValue: true }, rightValue: '' }
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
    name: "Stopped: Paused Or Not Set Up",
    parameters: { mode: 'manual', assignments: { assignments: [
      { id: "stopped0", name: "stopped", value: true, type: "boolean" },
      { id: "stopped1", name: "reason", value: expr('{{ $json.problems || "SYSTEM_PAUSED is YES in the CRM Settings tab." }}'), type: "string" }
    ] } }
  },
  output: [{ done: true }]
});
const readLeads = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: "Read Leads",
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
      sheetName: { __rl: true, mode: 'name', value: "Leads" },
      options: {}
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ 'Lead ID': 'L-sample.example', Temperature: 'Warm' }]
});
const readDrafts = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: "Read Outreach Drafts",
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
      sheetName: { __rl: true, mode: 'name', value: "Outreach Drafts" },
      options: {}
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ 'Draft ID': 'D-L-old.example-initial' }]
});
const pick = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: "Pick Leads To Draft", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Picks Warm/Hot leads that are ready for a first email and don't have a draft yet.
// Stops (fail closed) if the Leads or Outreach Drafts tab can't be read.
const cfg = $('Load Agency Config').first().json;
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const leads = $('Read Leads').all().map((i) => i.json || {});
const drafts = $input.all().map((i) => i.json || {});
if (leads.some((r) => r.error)) throw new Error('C1 could not read the Leads tab');
if (drafts.some((r) => r.error)) throw new Error('C1 could not read the Outreach Drafts tab (run A0b Setup first)');
const s = cfg.settings || {};
const demoFlag = cfg.isDemo === false ? 'NO' : 'YES';
const max = Math.min(Math.max(Number(s.DRAFT_BATCH_SIZE) || 5, 1), 10);
const hasDraft = {};
drafts.forEach((d) => { if (clean(d['Draft ID'])) hasDraft[clean(d['Draft ID'])] = true; });
const validEmail = (e) => { const p = e.split('@'); return p.length === 2 && p[0] && p[1].indexOf('.') > 0 && e.indexOf(' ') === -1; };
const skipped = [];
const picked = [];
leads.forEach((l) => {
  const id = clean(l['Lead ID']);
  if (!id) return;
  const why = [];
  if (['warm', 'hot'].indexOf(clean(l.Temperature).toLowerCase()) === -1) return;
  if (clean(l['Pipeline Status']) !== 'Ready for review') return;
  if (hasDraft['D-' + id + '-initial']) return;
  if (clean(l['Is Demo']).toUpperCase() !== demoFlag) why.push('DEMO/LIVE mismatch');
  if (clean(l['Opted Out']).toUpperCase() === 'YES') why.push('opted out');
  if (!validEmail(clean(l['Public Email']).toLowerCase())) why.push('no valid public email');
  if (['high', 'medium'].indexOf(clean(l['Research Confidence']).toLowerCase()) === -1) why.push('research confidence not High/Medium');
  if (['', 'unknown', 'no clear opportunity'].indexOf(clean(l['Primary Opportunity']).toLowerCase()) !== -1) why.push('no clear opportunity');
  if (!clean(l.Evidence)) why.push('no verified evidence');
  if (why.length) { skipped.push(id + ': ' + why.join(', ')); return; }
  if (picked.length < max) picked.push(l);
});
const runId = String($execution.id);
return picked.map((l, i) => ({ json: { leadId: clean(l['Lead ID']), email: clean(l['Public Email']).toLowerCase(), crmUrl: cfg.crmUrl, ref: 'D-' + clean(l['Lead ID']) + '-initial', runId, skipped: i === 0 ? skipped : [] } }));` } },
  output: [{ leadId: 'L-sample.example', email: 'info@sample.example', crmUrl: 'x', ref: 'D-L-sample.example-initial' }]
});
const supCheck = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: "Suppression Check",
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: "Xq13OdqjXhOLBWZr", cachedResultName: "[AGENCY] H6 Helper: Suppression Check" },
      mode: 'once',
      options: { waitForSubWorkflow: true }
    }
  },
  output: [{ leadId: 'L-sample.example', email: 'info@sample.example', allowed: true, checkedOk: true }]
});
const requests = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: "Build AI Requests", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Builds one AI request per lead that passed the suppression check. Website-derived text is
// passed as DATA; the AI only writes the middle of the email (we add greeting, sign-off, footer).
const cfg = $('Load Agency Config').first().json;
const s = cfg.settings || {};
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const NL = String.fromCharCode(10);
const leadsById = {};
$('Read Leads').all().forEach((i) => { const l = i.json || {}; if (clean(l['Lead ID'])) leadsById[clean(l['Lead ID'])] = l; });
const okIds = {};
$input.all().forEach((i) => { const d = i.json || {}; if (d.allowed === true && clean(d.leadId)) okIds[clean(d.leadId)] = clean(d.email); });
const filled = (v) => clean(v) && clean(v).indexOf('[FILL IN]') === -1;
const agency = filled(s.AGENCY_NAME) ? clean(s.AGENCY_NAME) : 'our agency';
const sender = filled(s.SENDER_NAME) ? clean(s.SENDER_NAME) : 'the founder';
const callLen = clean(s.DISCOVERY_CALL_MINUTES) || '20';
const safe = (v, n) => clean(v).split('<<<').join('').split('>>>').join('').slice(0, n);
return $('Pick Leads To Draft').all().map((i) => i.json).filter((p) => okIds[p.leadId] && okIds[p.leadId] === p.email && leadsById[p.leadId]).map((p) => {
  const l = leadsById[p.leadId];
  const instructions = [
    'TASK: Write the middle part of a short, honest first-contact email from ' + sender + ' at ' + agency + ' (a small AI automation agency in Atlanta) to the business described below.',
    'RULES:',
    '- Mention exactly ONE idea: ' + safe(l['Primary Opportunity'], 80) + '. Describe it as something we could build together, never as something that already exists.',
    '- You may mention one or two facts from the evidence quotes. If you quote, copy only a few words exactly.',
    '- No results, numbers, percentages, prices, guarantees, testimonials, other clients, case studies or awards.',
    '- Do not say or suggest the business has a problem (no "you are losing customers"). Use "may" or "could".',
    '- End by inviting them to a short ' + callLen + '-minute discovery call. No links.',
    '- 60-120 words, plain text. NO greeting line and NO signature: we add those.',
    'Return subject (max 60 characters, no "Re:"), body, opportunity_used, evidence_used (the exact quotes you relied on, as a list).'
  ].join(NL);
  const data = [
    'Business: ' + safe(l['Business Name'], 120), 'Industry: ' + safe(l.Industry, 60), 'City: ' + safe(l.City, 60),
    'Evidence quotes from their own website: ' + safe(l.Evidence, 1500),
    'Contact options seen: ' + safe(l['Booking / Contact Options Seen'], 300),
    'Idea we could propose: ' + safe(l['Proposed Solution'], 600), 'Why it may help: ' + safe(l['Why It May Help'], 600)
  ].join(NL);
  return { json: {
    task: 'outreach_draft', instructions, untrustedContent: data,
    outputExample: JSON.stringify({ subject: 'An idea for after-hours calls', body: 'I came across your website and saw that you offer same-day service. One idea we could build together is a simple text-back that replies when a call is missed. It may help callers get a quicker answer. Would you be open to a short ' + callLen + '-minute call to see if it fits?', opportunity_used: 'Missed-call text back', evidence_used: ['same-day service'] }),
    requiredKeys: 'subject,body,opportunity_used,evidence_used',
    leadId: p.leadId, callerWorkflow: 'C1 Draft Outreach', crmUrl: cfg.crmUrl, aiModelLabel: cfg.aiModelLabel,
    aiInputPricePerM: cfg.aiInputPricePerM, aiOutputPricePerM: cfg.aiOutputPricePerM, runId: p.runId
  } };
});` } },
  output: [{ task: 'outreach_draft', leadId: 'L-sample.example' }]
});
const askAi = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: "Write Drafts With AI",
    onError: 'continueRegularOutput',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: "wD2yN7CAk0xz0oiW", cachedResultName: "[AGENCY] H1 Helper: AI Brain" },
      mode: 'each',
      options: { waitForSubWorkflow: true }
    }
  },
  output: [{ ok: true, leadId: 'L-sample.example', data: { subject: 'Idea', body: 'Text', evidence_used: [] } }]
});
const check = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: "Check Drafts", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Checks every AI draft by Lead ID, removes unsupported claims, adds greeting, sign-off and the
// required footer (sender, mailing address, opt-out), then prepares CRM rows. Never sends anything.
const cfg = $('Load Agency Config').first().json;
const s = cfg.settings || {};
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const hashText = (s) => { let a = 2166136261; let b = 5381; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = Math.imul(a ^ c, 16777619) >>> 0; b = (Math.imul(b, 33) + c) >>> 0; } return ('0000000' + a.toString(16)).slice(-8) + ('0000000' + b.toString(16)).slice(-8); };
const draftHash = (to, subject, body) => hashText(clean(to).toLowerCase() + '|' + clean(subject) + '|' + clean(body).split(String.fromCharCode(13)).join(''));
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
return [{ json: out }];` } },
  output: [{ crmUrl: 'x', draftUpdates: [], historyRows: [], leadUpdates: [], reviewItems: [], events: [] }]
});
const save = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: "Save Drafts And Updates",
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: "r3tCCgZ7xETHATMd", cachedResultName: "[AGENCY] H8 Helper: Save CRM Updates" },
      mode: 'once',
      options: { waitForSubWorkflow: true }
    }
  },
  output: [{ ok: true }]
});
const summary = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: "Drafting Summary",
    executeOnce: true,
    parameters: { mode: 'manual', assignments: { assignments: [
      { id: "summary0", name: "draftsSaved", value: expr('{{ $("Check Drafts").first().json.draftUpdates.length }}'), type: "number" }
    ] } }
  },
  output: [{ done: true }]
});
const note = sticky("## C1 Draft Outreach Emails (Stage 4a)\nWrites ONE personalized draft per Warm/Hot lead (verified research only), checks it, and saves it to **Outreach Drafts** as *Pending review*. Nothing is sent here.\n\nChecks: correct business name, no other business mentioned, no guarantees/results/testimonials/invented problems, quotes must be on the lead's own website, call-to-action, and a fixed footer (sender, mailing address, STOP opt-out). Suppressed addresses are skipped.", [pick], { color: 6 });

export default workflow("agency-c1-draft", "[AGENCY] C1 Draft Outreach Emails")
  .add(manualStart)
  .to(loadConfig)
  .add(calledStart)
  .to(loadConfig)
  .add(loadConfig)
  .to(allowed
    .onTrue(readLeads.to(readDrafts).to(pick).to(supCheck).to(requests).to(askAi).to(check).to(save).to(summary))
    .onFalse(stopped))
  .add(note);
