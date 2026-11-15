const manualStart = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: "Run Sending Now" }, output: [{}] });
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
  output: [{ ok: true, crmUrl: 'x', systemPaused: false, outreachPaused: true, settings: {} }]
});
const switches = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: "Check Send Switches", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Every switch must say "go" before anything else happens. Any doubt = stop.
const cfg = $input.first().json || {};
const s = cfg.settings || {};
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const filled = (k) => clean(s[k]) && clean(s[k]).indexOf('[FILL IN]') === -1;
const reasons = [];
if (cfg.ok !== true) reasons.push('Config not OK: ' + clean(cfg.problems));
if (cfg.systemPaused !== false) reasons.push('SYSTEM_PAUSED is not NO');
if (cfg.outreachPaused !== false) reasons.push('OUTREACH_PAUSED is not NO');
if (clean(s.GMAIL_SENDING_ENABLED).toUpperCase() !== 'YES') reasons.push('GMAIL_SENDING_ENABLED is not YES');
['SENDER_NAME', 'SENDER_EMAIL', 'AGENCY_NAME', 'AGENCY_MAILING_ADDRESS'].forEach((k) => { if (!filled(k)) reasons.push(k + ' is not filled in'); });
if (filled('SENDER_EMAIL') && clean(s.SENDER_EMAIL).split('@').length !== 2) reasons.push('SENDER_EMAIL is not a valid address');
const limit = Number(s.DAILY_SEND_LIMIT);
if (!(limit > 0)) reasons.push('DAILY_SEND_LIMIT is not a positive number');
const now = DateTime.now().setZone(cfg.timezone || 'America/New_York');
const startH = Number(clean(s.SEND_WINDOW_START) || 9);
const endH = Number(clean(s.SEND_WINDOW_END) || 16);
if (now.weekday > 5) reasons.push('Weekend - no sending');
if (now.hour < startH || now.hour >= endH) reasons.push('Outside sending hours (' + startH + ':00-' + endH + ':00 ' + (cfg.timezone || 'America/New_York') + ')');
return [{ json: { allowed: reasons.length === 0, reasons: reasons.join(' | '), checkedAt: now.toFormat('yyyy-LL-dd HH:mm') } }];` } },
  output: [{ allowed: false, reasons: 'OUTREACH_PAUSED is not NO' }]
});
const canSend = ifElse({
  version: 2.2,
  config: {
    name: "Allowed To Send?",
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.allowed }}'), operator: { type: 'boolean', operation: 'true', singleValue: true }, rightValue: '' }],
        combinator: 'and'
      }
    }
  }
});
const stopped = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: "Stopped: Sending Is Switched Off",
    parameters: { mode: 'manual', assignments: { assignments: [
      { id: "stopped0", name: "sent", value: 0, type: "number" },
      { id: "stopped1", name: "reason", value: expr('{{ $json.reasons }}'), type: "string" }
    ] } }
  },
  output: [{ done: true }]
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
  output: [{ 'Draft ID': 'D-L-x-initial' }]
});
const readLedger = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: "Read Send Ledger",
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
      sheetName: { __rl: true, mode: 'name', value: "Send Ledger" },
      options: {}
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ 'Ledger Key': 'L-x|initial' }]
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
  output: [{ 'Lead ID': 'L-x' }]
});
const pre = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: "Preselect Approved Drafts", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Lists approved, unsent drafts for the suppression check. Stops if a tab can't be read.
const cfg = $('Load Agency Config').first().json;
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const drafts = $('Read Outreach Drafts').all().map((i) => i.json || {});
const ledger = $('Read Send Ledger').all().map((i) => i.json || {});
const leads = $input.all().map((i) => i.json || {});
if (drafts.some((r) => r.error)) throw new Error('C3 could not read Outreach Drafts - nothing sent');
if (ledger.some((r) => r.error)) throw new Error('C3 could not read the Send Ledger - nothing sent');
if (leads.some((r) => r.error)) throw new Error('C3 could not read Leads - nothing sent');
return drafts.filter((d) => clean(d['Draft ID']) && clean(d['Review Status']) === 'Approved' && ['', 'not sent'].indexOf(clean(d['Send Status']).toLowerCase()) !== -1)
  .map((d) => ({ json: { leadId: clean(d['Lead ID']), email: clean(d['To Email']).toLowerCase(), ref: clean(d['Draft ID']), crmUrl: cfg.crmUrl } }));` } },
  output: [{ leadId: 'L-x', email: 'info@x.example', ref: 'D-L-x-initial' }]
});
const supCheck = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: "Check Suppression",
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: "Xq13OdqjXhOLBWZr", cachedResultName: "[AGENCY] H6 Helper: Suppression Check" },
      mode: 'once',
      options: { waitForSubWorkflow: true }
    }
  },
  output: [{ ref: 'D-L-x-initial', allowed: true, checkedOk: true }]
});
const pickD = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: "Pick Approved Drafts", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Decides, draft by draft, what may be sent now. Matches everything by Draft ID / Lead ID.
const cfg = $('Load Agency Config').first().json;
const s = cfg.settings || {};
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const hashText = (s) => { let a = 2166136261; let b = 5381; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = Math.imul(a ^ c, 16777619) >>> 0; b = (Math.imul(b, 33) + c) >>> 0; } return ('0000000' + a.toString(16)).slice(-8) + ('0000000' + b.toString(16)).slice(-8); };
const draftHash = (to, subject, body) => hashText(clean(to).toLowerCase() + '|' + clean(subject) + '|' + clean(body).split(String.fromCharCode(13)).join(''));
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
    oneClickVerified: clean(s.ONE_CLICK_UNSUBSCRIBE_VERIFIED).toUpperCase() === 'YES'
  });
});
return [{ json: out }];` } },
  output: [{ crmUrl: 'x', candidates: [], draftUpdates: [], leadUpdates: [], reviewItems: [], events: [] }]
});
const saveBlocked = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: "Save Blocked Or Suppressed",
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: "r3tCCgZ7xETHATMd", cachedResultName: "[AGENCY] H8 Helper: Save CRM Updates" },
      mode: 'once',
      options: { waitForSubWorkflow: true }
    }
  },
  output: [{ ok: true }]
});
const claim = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: "Claim Ledger Rows", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Writes a "Sending" row for each email BEFORE contacting Gmail (claims it).
const c = $input.first().json.candidates || [];
const cfg = $('Load Agency Config').first().json;
const stamp = DateTime.now().setZone(cfg.timezone || 'America/New_York').toFormat('yyyy-LL-dd HH:mm');
return c.map((x) => ({ json: { 'Ledger Row ID': x.ledgerRowId, 'Ledger Key': x.ledgerKey, 'Lead ID': x.leadId, Step: x.step, 'To Email': x.to, Status: 'Sending', 'Created At': stamp, 'Updated At': stamp, 'Draft ID': x.draftId, 'Run ID': String($execution.id), 'Gmail Message ID': '', 'Gmail Thread ID': '', Error: '' } }));` } },
  output: [{ 'Ledger Row ID': 'L-x|initial|1', Status: 'Sending' }]
});
const writeClaim = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: "Write Sending Rows To Ledger",
    parameters: {
      resource: 'sheet',
      operation: 'append',
      documentId: { __rl: true, mode: 'url', value: expr('{{ $("Load Agency Config").first().json.crmUrl }}') },
      sheetName: { __rl: true, mode: 'name', value: "Send Ledger" },
      columns: {
        mappingMode: 'autoMapInputData',
        value: {},
        schema: [
          { id: "Ledger Key", displayName: "Ledger Key", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true } , { id: "Lead ID", displayName: "Lead ID", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true } , { id: "Step", displayName: "Step", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true } , { id: "To Email", displayName: "To Email", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true } , { id: "Status", displayName: "Status", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true } , { id: "Created At", displayName: "Created At", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true } , { id: "Updated At", displayName: "Updated At", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true } , { id: "Gmail Message ID", displayName: "Gmail Message ID", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true } , { id: "Error", displayName: "Error", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true } , { id: "Ledger Row ID", displayName: "Ledger Row ID", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true } , { id: "Draft ID", displayName: "Draft ID", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true } , { id: "Run ID", displayName: "Run ID", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true } , { id: "Gmail Thread ID", displayName: "Gmail Thread ID", required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }
        ]
      },
      options: { cellFormat: 'RAW', handlingExtraData: 'ignoreIt' }
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ ok: true }]
});
const reRead = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: "Re-read Send Ledger",
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
      sheetName: { __rl: true, mode: 'name', value: "Send Ledger" },
      options: {}
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ 'Ledger Row ID': 'L-x|initial|1', 'Ledger Key': 'L-x|initial', Status: 'Sending', row_number: 2 }]
});
const reCfg = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: "Re-check Pause Switch",
    executeOnce: true,
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: "EwEgjWyFneyjExzI", cachedResultName: "[AGENCY] H0 Helper: Agency Config" },
      mode: 'once',
      options: { waitForSubWorkflow: true }
    }
  },
  output: [{ ok: true, systemPaused: false, outreachPaused: false, settings: { GMAIL_SENDING_ENABLED: 'YES' } }]
});
const reItems = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: "Claimed For Re-check", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Addresses to check one more time, right before sending.
const cfg = $('Load Agency Config').first().json;
return ($('Pick Approved Drafts').first().json.candidates || []).map((x) => ({ json: { leadId: x.leadId, email: x.to, ref: x.ledgerRowId, crmUrl: cfg.crmUrl } }));` } },
  output: [{ leadId: 'L-x', email: 'info@x.example', ref: 'L-x|initial|1' }]
});
const reSup = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: "Re-check Suppression",
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: "Xq13OdqjXhOLBWZr", cachedResultName: "[AGENCY] H6 Helper: Suppression Check" },
      mode: 'once',
      options: { waitForSubWorkflow: true }
    }
  },
  output: [{ ref: 'L-x|initial|1', allowed: true, checkedOk: true }]
});
const final = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: "Final Send Check", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Last gate before Gmail: our ledger row must be the first claim for this email, the pause
// switches must still be off, and the address must still be allowed. Otherwise: not sent.
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const cands = $('Pick Approved Drafts').first().json.candidates || [];
const ledger = $('Re-read Send Ledger').all().map((i) => i.json || {});
const cfg2 = $('Re-check Pause Switch').first().json || {};
const s2 = cfg2.settings || {};
const sup = {};
$input.all().forEach((i) => { const d = i.json || {}; if (clean(d.ref)) sup[clean(d.ref)] = d; });
const ledgerOk = !ledger.some((r) => r.error);
const stillOn = cfg2.ok === true && cfg2.systemPaused === false && cfg2.outreachPaused === false && clean(s2.GMAIL_SENDING_ENABLED).toUpperCase() === 'YES';
const BLOCKING = ['sending', 'sent', 'failed'];
return cands.map((x) => {
  let reason = '';
  if (!ledgerOk) reason = 'could not verify';
  else {
    const rows = ledger.filter((r) => clean(r['Ledger Key']) === x.ledgerKey && BLOCKING.indexOf(clean(r.Status).toLowerCase()) !== -1)
      .sort((a, b) => (Number(a.row_number) || 0) - (Number(b.row_number) || 0));
    if (!rows.length || clean(rows[0]['Ledger Row ID']) !== x.ledgerRowId) reason = 'duplicate';
  }
  if (!reason && !stillOn) reason = 'paused';
  const sc = sup[x.ledgerRowId];
  if (!reason && (!sc || sc.allowed !== true || sc.checkedOk !== true)) reason = 'suppressed';
  return { json: Object.assign({}, x, { send: reason === '', notSentReason: reason, suppressionReason: sc ? sc.reason : 'no answer' }) };
});` } },
  output: [{ ledgerRowId: 'L-x|initial|1', send: true, notSentReason: '' }]
});
const sendNow = ifElse({
  version: 2.2,
  config: {
    name: "Send Now?",
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.send }}'), operator: { type: 'boolean', operation: 'true', singleValue: true }, rightValue: '' }],
        combinator: 'and'
      }
    }
  }
});
const sendOne = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: "Send One Email",
    onError: 'continueRegularOutput',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: "bl3Ls9beQiS3HewK", cachedResultName: "[AGENCY] H7 Helper: Send One Email (OFF)" },
      mode: 'each',
      options: { waitForSubWorkflow: true }
    }
  },
  output: [{ ledgerRowId: 'L-x|initial|1', outcome: 'not_sent_step_off' }]
});
const record = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: "Record Send Results", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Records what happened to each email, matched by Ledger Row ID. Never retries anything.
const cfg = $('Load Agency Config').first().json;
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const now = DateTime.now().setZone(cfg.timezone || 'America/New_York');
const stamp = now.toFormat('yyyy-LL-dd HH:mm');
const today = now.toFormat('yyyy-LL-dd');
let next = now;
let added = 0;
while (added < 5) { next = next.plus({ days: 1 }); if (next.weekday <= 5) added++; }
const finals = {};
$('Final Send Check').all().forEach((i) => { const x = i.json || {}; finals[clean(x.ledgerRowId)] = x; });
const inputs = $input.all().map((i) => i.json || {});
const results = inputs.length && Object.prototype.hasOwnProperty.call(inputs[0], 'outcome') ? inputs : inputs.map((x) => Object.assign({}, x, { outcome: 'not_sent_' + x.notSentReason }));
const out = { crmUrl: cfg.crmUrl, ledgerUpdates: [], draftUpdates: [], leadUpdates: [], reviewItems: [], events: [] };
const ev = (event, leadId, details) => out.events.push({ crmUrl: cfg.crmUrl, workflow: 'C3 Send Approved Outreach', runId: String($execution.id), isDemo: cfg.isDemo !== false, event, leadId: leadId || '', count: 1, details: details || '' });
const seen = {};
results.forEach((r) => {
  const rowId = clean(r.ledgerRowId);
  const x = finals[rowId];
  if (!rowId || !x || seen[rowId]) { if (rowId && seen[rowId]) ev('send_result_duplicate_ignored', clean(r.leadId), rowId); return; }
  seen[rowId] = true;
  const o = clean(r.outcome);
  const led = { 'Ledger Row ID': rowId, 'Updated At': stamp };
  if (o === 'sent') {
    Object.assign(led, { Status: 'Sent', 'Gmail Message ID': clean(r.gmailMessageId), 'Gmail Thread ID': clean(r.gmailThreadId), Error: '' });
    out.draftUpdates.push({ 'Draft ID': x.draftId, 'Send Status': 'Sent', 'Ledger Row ID': rowId, 'Gmail Message ID': clean(r.gmailMessageId), 'Gmail Thread ID': clean(r.gmailThreadId), 'Sent At': stamp, 'Updated At': stamp, 'Last Error': '' });
    out.leadUpdates.push({ 'Lead ID': x.leadId, 'Outreach Status': 'Sent', 'Sent At': stamp, 'Gmail Message ID': clean(r.gmailMessageId), 'Gmail Thread ID': clean(r.gmailThreadId), 'Pipeline Status': 'Contacted', 'Last Contact Date': today, 'Follow-up Count': '0', 'Next Allowed Follow-up': next.toFormat('yyyy-LL-dd'), 'Last Updated': today });
    ev('email_sent', x.leadId, x.draftId);
  } else if (o === 'failed') {
    Object.assign(led, { Status: 'Failed', Error: clean(r.error).slice(0, 300) });
    out.draftUpdates.push({ 'Draft ID': x.draftId, 'Send Status': 'Failed', 'Ledger Row ID': rowId, 'Updated At': stamp, 'Last Error': clean(r.error).slice(0, 300) });
    out.leadUpdates.push({ 'Lead ID': x.leadId, 'Outreach Status': 'Failed', 'Last Updated': today });
    out.reviewItems.push({ 'Item ID': 'RQ-' + rowId, 'Created At': stamp, Type: 'Email failed', 'Lead ID': x.leadId, Summary: 'Gmail refused the email to ' + x.to + '. It will NOT be retried automatically. Error: ' + clean(r.error).slice(0, 200), Link: cfg.crmUrl, Status: 'Open' });
    ev('email_failed', x.leadId, clean(r.error).slice(0, 200));
  } else if (o === 'uncertain') {
    Object.assign(led, { Status: 'Sending', Error: 'UNCERTAIN: ' + clean(r.error).slice(0, 280) });
    out.draftUpdates.push({ 'Draft ID': x.draftId, 'Send Status': 'Sending', 'Ledger Row ID': rowId, 'Updated At': stamp, 'Last Error': 'Delivery uncertain - check the Gmail Sent folder' });
    out.leadUpdates.push({ 'Lead ID': x.leadId, 'Outreach Status': 'Sending', 'Last Updated': today });
    out.reviewItems.push({ 'Item ID': 'RQ-' + rowId, 'Created At': stamp, Type: 'Delivery uncertain', 'Lead ID': x.leadId, Summary: 'We could not confirm whether the email to ' + x.to + ' was sent. Check the Gmail Sent folder. It will NOT be sent again automatically.', Link: cfg.crmUrl, Status: 'Open' });
    ev('email_delivery_uncertain', x.leadId, clean(r.error).slice(0, 200));
  } else {
    const why = o.split('not_sent_').join('') || 'unknown';
    const label = { duplicate: 'Not sent - duplicate', paused: 'Not sent - paused', suppressed: 'Not sent - suppressed', 'could not verify': 'Not sent - could not verify', step_off: 'Not sent - Gmail step off' }[why] || 'Not sent - ' + why;
    Object.assign(led, { Status: label, Error: clean(r.error || x.suppressionReason || '').slice(0, 300) });
    if (why === 'suppressed') {
      out.draftUpdates.push({ 'Draft ID': x.draftId, 'Send Status': 'Suppressed', 'Updated At': stamp, 'Last Error': 'Suppressed at final check: ' + clean(x.suppressionReason) });
      out.leadUpdates.push({ 'Lead ID': x.leadId, 'Outreach Status': 'Suppressed', 'Last Updated': today });
      ev('blocked_send_attempt', x.leadId, 'suppressed at final check: ' + clean(x.suppressionReason));
    } else ev('email_not_sent', x.leadId, label);
  }
  out.ledgerUpdates.push(led);
});
// A Gmail step that crashed without an answer leaves us unsure: treat as uncertain, never resend.
if (inputs.length && !Object.prototype.hasOwnProperty.call(inputs[0], 'notSentReason')) {
  Object.keys(finals).forEach((rowId) => {
    const x = finals[rowId];
    if (x.send !== true || seen[rowId]) return;
    out.ledgerUpdates.push({ 'Ledger Row ID': rowId, 'Updated At': stamp, Status: 'Sending', Error: 'UNCERTAIN: no answer from the sending step' });
    out.draftUpdates.push({ 'Draft ID': x.draftId, 'Send Status': 'Sending', 'Updated At': stamp, 'Last Error': 'Delivery uncertain - check the Gmail Sent folder' });
    out.leadUpdates.push({ 'Lead ID': x.leadId, 'Outreach Status': 'Sending', 'Last Updated': today });
    out.reviewItems.push({ 'Item ID': 'RQ-' + rowId, 'Created At': stamp, Type: 'Delivery uncertain', 'Lead ID': x.leadId, Summary: 'The sending step gave no answer for ' + x.to + '. Check the Gmail Sent folder. It will NOT be sent again automatically.', Link: cfg.crmUrl, Status: 'Open' });
    ev('email_delivery_uncertain', x.leadId, 'no answer from sending step');
  });
}
return [{ json: out }];` } },
  output: [{ crmUrl: 'x', ledgerUpdates: [], draftUpdates: [], leadUpdates: [], reviewItems: [], events: [] }]
});
const saveResults = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: "Save Send Results",
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: "r3tCCgZ7xETHATMd", cachedResultName: "[AGENCY] H8 Helper: Save CRM Updates" },
      mode: 'once',
      options: { waitForSubWorkflow: true }
    }
  },
  output: [{ ok: true }]
});
const note = sticky("## C3 Send Approved Outreach (Stage 4c) - SENDING IS OFF\nWill only ever send when ALL of these say go: SYSTEM_PAUSED = NO, OUTREACH_PAUSED = NO, GMAIL_SENDING_ENABLED = YES, sender details + mailing address filled in, weekday sending hours, daily limit not reached.\n\nPer email: approved text unchanged since approval, not suppressed (checked twice), DEMO mode = .example addresses only, footer present, no earlier Sending/Sent/Failed row in the **Send Ledger**. A *Sending* row is written BEFORE Gmail is contacted. Uncertain results are never retried.", [switches], { color: 6 });

export default workflow("agency-c3-send", "[AGENCY] C3 Send Approved Outreach")
  .add(manualStart)
  .to(loadConfig)
  .add(calledStart)
  .to(loadConfig)
  .add(loadConfig)
  .to(switches)
  .to(canSend
    .onTrue(readDrafts.to(readLedger).to(readLeads).to(pre).to(supCheck).to(pickD))
    .onFalse(stopped))
  .add(pickD)
  .to(saveBlocked)
  .add(pickD)
  .to(claim)
  .to(writeClaim)
  .to(reRead)
  .to(reCfg)
  .to(reItems)
  .to(reSup)
  .to(final)
  .to(sendNow
    .onTrue(sendOne.to(record))
    .onFalse(record))
  .add(record)
  .to(saveResults)
  .add(note);
