const manualStart = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: "Check Replies Now" }, output: [{}] });
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
  output: [{ ok: true, crmUrl: 'x', systemPaused: false, settings: {} }]
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
    name: "Stopped: Paused Or Not Set Up",
    parameters: { mode: 'manual', assignments: { assignments: [
      { id: "stopped0", name: "stopped", value: true, type: "boolean" },
      { id: "stopped1", name: "reason", value: expr('{{ $json.problems || "SYSTEM_PAUSED is YES in the CRM Settings tab." }}'), type: "string" }
    ] } }
  },
  output: [{ done: true }]
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
  output: [{ 'Ledger Key': 'L-x|initial', Status: 'Sent', 'Gmail Thread ID': 't1', 'Lead ID': 'L-x' }]
});
const readReplies = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: "Read Replies",
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
      sheetName: { __rl: true, mode: 'name', value: "Replies" },
      options: {}
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ 'Gmail Message ID': 'm0' }]
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
  output: [{ 'Lead ID': 'L-x', 'Public Email': 'info@x.example', 'Is Demo': 'YES' }]
});
const threads = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: "List Threads To Check", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Lists ONLY the Gmail threads of emails WE sent (from the Send Ledger). The monitor never searches
// or reads anything else in the inbox. Stops (fail closed) if a tab can't be read.
const cfg = $('Load Agency Config').first().json;
const s = cfg.settings || {};
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const ledger = $('Read Send Ledger').all().map((i) => i.json || {});
const replies = $('Read Replies').all().map((i) => i.json || {});
const leads = $input.all().map((i) => i.json || {});
if (ledger.some((r) => r.error)) throw new Error('D1 could not read the Send Ledger tab');
if (replies.some((r) => r.error)) throw new Error('D1 could not read the Replies tab');
if (leads.some((r) => r.error)) throw new Error('D1 could not read the Leads tab');
const max = Math.min(Math.max(Number(s.REPLY_CHECK_BATCH) || 20, 1), 50);
const demoFlag = cfg.isDemo === false ? 'NO' : 'YES';
const leadById = {};
leads.forEach((l) => { if (clean(l['Lead ID'])) leadById[clean(l['Lead ID'])] = l; });
const seen = {};
const threads = [];
ledger.forEach((r) => {
  const t = clean(r['Gmail Thread ID']);
  const id = clean(r['Lead ID']);
  if (clean(r.Status).toLowerCase() !== 'sent' || !t || !id || seen[t]) return;
  const l = leadById[id];
  if (!l || clean(l['Is Demo']).toUpperCase() !== demoFlag) return;
  seen[t] = true;
  threads.push({ threadId: t, leadId: id, leadEmail: clean(l['Public Email']).toLowerCase(), businessName: clean(l['Business Name']) });
});
return threads.slice(0, max).map((t) => ({ json: Object.assign({}, t, { crmUrl: cfg.crmUrl, runId: String($execution.id) }) }));` } },
  output: [{ threadId: 't1', leadId: 'L-x', leadEmail: 'info@x.example' }]
});
const fetchThread = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'Read Our Thread From Gmail (OFF)',
    disabled: true,
    onError: 'continueRegularOutput',
    parameters: {
      method: 'GET',
      url: expr('https://gmail.googleapis.com/gmail/v1/users/me/threads/{{ $json.threadId }}?format=full'),
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'gmailOAuth2',
      options: { response: { response: { fullResponse: true, neverError: true, responseFormat: 'json' } }, timeout: 30000 }
    }
  },
  output: [{ statusCode: 200, body: { id: 't1', messages: [] } }]
});
const extract = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: "Extract New Replies", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Pulls NEW replies out of our own threads. Each Gmail answer is matched to its thread by Thread ID
// (never by position). Our own messages, drafts and already-processed messages are skipped.
const cfg = $('Load Agency Config').first().json;
const s = cfg.settings || {};
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const NL = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const tz = cfg.timezone || 'America/New_York';
const threads = {};
$('List Threads To Check').all().forEach((i) => { const t = i.json || {}; if (clean(t.threadId)) threads[clean(t.threadId)] = t; });
const known = {};
$('Read Replies').all().forEach((i) => { const k = clean((i.json || {})['Gmail Message ID']); if (k) known[k] = true; });
const ours = clean(s.SENDER_EMAIL).toLowerCase();
const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const MAP = {};
ALPHA.split('').forEach((c, i) => { MAP[c] = i; });
MAP['+'] = 62;
MAP['/'] = 63;
const decode = (str) => {
  const bytes = [];
  let buf = 0;
  let bits = 0;
  clean(str).split('').forEach((c) => {
    if (MAP[c] === undefined) return;
    buf = ((buf << 6) | MAP[c]) & 16777215;
    bits += 6;
    if (bits >= 8) { bits -= 8; bytes.push((buf >> bits) & 255); }
  });
  let pct = '';
  bytes.forEach((b) => { pct += '%' + ('0' + b.toString(16)).slice(-2); });
  try { return decodeURIComponent(pct); } catch (e) { return bytes.map((b) => String.fromCharCode(b)).join(''); }
};
const header = (m, name) => { const h = (((m || {}).payload || {}).headers || []).find((x) => clean(x.name).toLowerCase() === name); return h ? clean(h.value) : ''; };
const findPart = (p, type) => {
  if (!p) return '';
  if (clean(p.mimeType).toLowerCase() === type && p.body && p.body.data) return decode(p.body.data);
  const parts = p.parts || [];
  for (let k = 0; k < parts.length; k++) { const t = findPart(parts[k], type); if (t) return t; }
  return '';
};
const htmlToText = (h) => {
  const withBreaks = h.split('<br').join(NL + '<br').split('</p>').join(NL + '</p>').split('</div>').join(NL + '</div>');
  return withBreaks.split('<').map((piece, i) => (i === 0 ? piece : piece.split('>').slice(1).join('>'))).join('').split('&nbsp;').join(' ').split('&amp;').join('&');
};
const stripQuoted = (t) => {
  const lines = t.split(CR).join('').split(NL);
  const out = [];
  for (let k = 0; k < lines.length; k++) {
    const l = lines[k].trim();
    if (l.indexOf('>') === 0) break;
    if (l.indexOf('On ') === 0 && (l.indexOf('wrote:') !== -1 || clean(lines[k + 1]).indexOf('wrote:') !== -1)) break;
    if (l.indexOf('-----Original Message-----') !== -1 || l.indexOf('________________') === 0) break;
    if (l.indexOf('From:') === 0 && out.join('').trim()) break;
    out.push(lines[k]);
  }
  return out.join(NL).trim().slice(0, 4000);
};
const addrOf = (from) => { const f = clean(from).toLowerCase(); return f.indexOf('<') !== -1 ? f.split('<')[1].split('>')[0].trim() : f; };
const domainOf = (e) => (e.split('@')[1] || '');
const replies = [];
const problems = [];
let checked = 0;
$input.all().forEach((i) => {
  const j = i.json || {};
  const body = j.body && typeof j.body === 'object' ? j.body : null;
  const threadId = clean((body && body.id) || j.threadId);
  if (!body || !Array.isArray(body.messages)) {
    problems.push(threadId + ': ' + (j.statusCode ? 'Gmail answered ' + j.statusCode : 'Gmail reading step is switched off or gave no answer'));
    return;
  }
  const t = threads[threadId];
  if (!t) { problems.push(threadId + ': not one of our threads - ignored'); return; }
  checked++;
  body.messages.forEach((m) => {
    const id = clean(m.id);
    const labels = m.labelIds || [];
    if (!id || known[id] || labels.indexOf('SENT') !== -1 || labels.indexOf('DRAFT') !== -1) return;
    const fromRaw = header(m, 'from');
    const fromAddr = addrOf(fromRaw);
    if (!fromAddr || fromAddr === ours) return;
    known[id] = true;
    const plain = findPart(m.payload, 'text/plain');
    const text = stripQuoted(plain || htmlToText(findPart(m.payload, 'text/html')) || clean(m.snippet));
    const ms = Number(m.internalDate) || 0;
    replies.push({
      crmUrl: cfg.crmUrl, leadId: t.leadId, businessName: t.businessName, fromEmail: fromRaw.slice(0, 200), fromAddr,
      subject: header(m, 'subject').slice(0, 300), text, gmailMessageId: id, gmailThreadId: threadId,
      receivedAt: ms ? DateTime.fromMillis(ms).setZone(tz).toFormat('yyyy-LL-dd HH:mm') : '', sortKey: ms,
      senderMatchesLead: fromAddr === t.leadEmail || (domainOf(fromAddr) !== '' && domainOf(fromAddr) === domainOf(t.leadEmail)),
      runId: String($execution.id)
    });
  });
});
replies.sort((a, b) => a.sortKey - b.sortKey);
const ev = (event, count, details) => ({ crmUrl: cfg.crmUrl, workflow: 'D1 Reply Monitor', runId: String($execution.id), isDemo: cfg.isDemo !== false, event, leadId: '', count, details: details || '' });
const events = [ev('reply_check', checked, replies.length + ' new replies')];
if (problems.length) events.push(ev('reply_check_problems', problems.length, problems.slice(0, 5).join(' | ').slice(0, 450)));
return [{ json: { crmUrl: cfg.crmUrl, replies, problems, threadsChecked: checked, events } }];` } },
  output: [{ crmUrl: 'x', replies: [], problems: [], threadsChecked: 0, events: [] }]
});
const split = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: "One Item Per Reply", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `return ($input.first().json.replies || []).map((r) => ({ json: r }));` } },
  output: [{ gmailMessageId: 'm1' }]
});
const handle = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: "Handle Each Reply",
    onError: 'continueRegularOutput',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: "rQzNzC1lVyYAz0lf", cachedResultName: "[AGENCY] D2 Handle One Reply" },
      mode: 'each',
      options: { waitForSubWorkflow: true }
    }
  },
  output: [{ gmailMessageId: 'm1', category: 'Question', needsHuman: true }]
});
const saveLog = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: "Log This Check",
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: "r3tCCgZ7xETHATMd", cachedResultName: "[AGENCY] H8 Helper: Save CRM Updates" },
      mode: 'once',
      options: { waitForSubWorkflow: true }
    }
  },
  output: [{ ok: true }]
});
const note = sticky("## D1 Reply Monitor (Stage 5) - INACTIVE, GMAIL READING OFF\nChecks ONLY the Gmail threads of emails we sent (thread IDs from the Send Ledger). It never searches or reads the rest of the inbox.\n\n**The Gmail reading step is disabled and has NO Gmail login attached.** No schedule is set.\n\nNew replies (not ours, not seen before) are handed to D2 one at a time, matched by Gmail Message ID.", [threads], { color: 6 });

export default workflow("agency-d1-reply-monitor", "[AGENCY] D1 Reply Monitor")
  .add(manualStart)
  .to(loadConfig)
  .add(calledStart)
  .to(loadConfig)
  .add(loadConfig)
  .to(allowed
    .onTrue(readLedger.to(readReplies).to(readLeads).to(threads).to(fetchThread).to(extract))
    .onFalse(stopped))
  .add(extract)
  .to(split)
  .to(handle)
  .add(extract)
  .to(saveLog)
  .add(note);
