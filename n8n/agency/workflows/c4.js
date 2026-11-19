const linkGet = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.2,
  config: { name: 'Unsubscribe Link (GET)', parameters: { httpMethod: 'GET', path: 'jido-unsubscribe', responseMode: 'responseNode', options: { ignoreBots: true } } },
  output: [{ headers: {}, query: { t: 'uabcdefghijklmnopqrstuvwx' }, body: {} }]
});

const linkPost = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.2,
  config: { name: 'One-Click Unsubscribe (POST)', parameters: { httpMethod: 'POST', path: 'jido-unsubscribe', responseMode: 'responseNode', options: {} } },
  output: [{ headers: {}, query: { t: 'uabcdefghijklmnopqrstuvwx' }, body: { 'List-Unsubscribe': 'One-Click' } }]
});

const replyIn = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.3, config: { name: "When Called With A Reply", parameters: { inputSource: 'passthrough' } }, output: [{ fromEmail: 'owner@sample.example', subject: 'Re: idea', text: 'STOP', gmailMessageId: 'm1', gmailThreadId: 't1' }] });
const readReq = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: "Read Request", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Works out what kind of unsubscribe request this is. A link carries ONLY a random token;
// any email address or other value in the link is ignored. A reply can only unsubscribe the
// address it came FROM, never an address mentioned inside the message.
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const j = $input.first().json || {};
const isWeb = Object.prototype.hasOwnProperty.call(j, 'headers') || Object.prototype.hasOwnProperty.call(j, 'query');
const okToken = (t) => t.length === 25 && t[0] === 'u' && t.split('').slice(1).every((ch) => (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9'));
if (isWeb) {
  const q = j.query || {};
  const b = j.body && typeof j.body === 'object' ? j.body : {};
  const t = clean(q.t || b.t).toLowerCase();
  return [{ json: { channel: 'link', token: okToken(t) ? t : '', tokenLooksValid: okToken(t), method: clean(j.method || (j.body && Object.keys(b).length ? 'POST' : 'GET')), isOptOut: true, email: '', ref: okToken(t) ? t : 'invalid-token' } }];
}
const from = clean(j.fromEmail).toLowerCase();
const fromAddr = from.indexOf('<') !== -1 ? from.split('<')[1].split('>')[0].trim() : from;
const text = (clean(j.subject) + ' ' + clean(j.text).slice(0, 2000)).toLowerCase();
const words = text.split('').map((ch) => ((ch >= 'a' && ch <= 'z') ? ch : ' ')).join('').split(' ').filter(Boolean);
const PHRASES = ['unsubscribe', 'remove me', 'take me off', 'opt out', 'opt-out', 'do not contact', "don't contact", 'do not email', "don't email", 'no more emails', 'stop emailing', 'stop sending'];
const isOptOut = words.indexOf('stop') !== -1 || PHRASES.some((p) => text.indexOf(p) !== -1);
return [{ json: { channel: 'reply', token: '', email: fromAddr, isOptOut, ref: clean(j.gmailMessageId) || 'reply', threadId: clean(j.gmailThreadId) } }];` } },
  output: [{ channel: 'link', token: 'uabcdefghijklmnopqrstuvwx', tokenLooksValid: true, isOptOut: true }]
});
const loadConfig = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: "Load Agency Config",
    executeOnce: true,
    onError: 'continueRegularOutput',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: "EwEgjWyFneyjExzI", cachedResultName: "[AGENCY] H0 Helper: Agency Config" },
      mode: 'once',
      options: { waitForSubWorkflow: true }
    }
  },
  output: [{ ok: true, crmUrl: 'x', settings: {} }]
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
  output: [{ 'Draft ID': 'D-L-x-initial', 'Unsubscribe Token': 'uabcdefghijklmnopqrstuvwx', 'To Email': 'info@x.example' }]
});
const readSup = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: "Read Suppression List",
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
      sheetName: { __rl: true, mode: 'name', value: "Suppression List" },
      options: {}
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') }
  },
  output: [{ 'Email Or Domain': 'donotcontact@blocked-demo.example' }]
});
const decide = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: "Decide Unsubscribe", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Turns the request into CRM changes. Unknown tokens change nothing. If the draft list can't be
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
return [{ json: out }];` } },
  output: [{ result: 'Suppressed', page: '<h2>Done</h2>' }]
});
const save = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: "Save Opt-out",
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'id', value: "r3tCCgZ7xETHATMd", cachedResultName: "[AGENCY] H8 Helper: Save CRM Updates" },
      mode: 'once',
      options: { waitForSubWorkflow: true }
    }
  },
  output: [{ ok: true }]
});
const fromLink = ifElse({
  version: 2.2,
  config: {
    name: "Came From A Link?",
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $("Read Request").first().json.channel === "link" }}'), operator: { type: 'boolean', operation: 'true', singleValue: true }, rightValue: '' }],
        combinator: 'and'
      }
    }
  }
});
const respond = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Show Confirmation Page',
    parameters: {
      respondWith: 'text',
      responseBody: expr('<html><body style="font-family:sans-serif;max-width:520px;margin:40px auto">{{ $("Decide Unsubscribe").first().json.page }}</body></html>'),
      options: { responseCode: 200, responseHeaders: { entries: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }] } }
    }
  }
});
const ret = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: "Return Result",
    executeOnce: true,
    parameters: { mode: 'manual', assignments: { assignments: [
      { id: "ret0", name: "result", value: expr('{{ $("Decide Unsubscribe").first().json.result }}'), type: "string" }
    ] } }
  },
  output: [{ done: true }]
});
const note = sticky("## C4 Unsubscribe (central) - INACTIVE\nThree ways in: the unsubscribe link in each email (GET), one-click unsubscribe from mail apps (POST), and replies passed in by the future reply monitor (Phase D).\n\nThe link carries only a random token. Other values in the link are ignored, so a link can't unsubscribe anyone else. A reply only unsubscribes its own sender. Opt-outs are added to the Suppression List immediately, the lead is marked Opted Out, unsent drafts become Suppressed, and everything is logged.\n\nThe links only work once this workflow is published (needs your approval).", [readReq], { color: 6 });

export default workflow("agency-c4-unsubscribe", "[AGENCY] C4 Unsubscribe")
  .add(linkGet)
  .to(readReq)
  .add(linkPost)
  .to(readReq)
  .add(replyIn)
  .to(readReq)
  .add(readReq)
  .to(loadConfig)
  .to(readDrafts)
  .to(readSup)
  .to(decide)
  .to(save)
  .to(fromLink
    .onTrue(respond)
    .onFalse(ret))
  .add(note);
