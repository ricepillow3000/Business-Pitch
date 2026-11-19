const whenCalled = trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.3, config: { name: "When Called With One Email", parameters: { inputSource: 'passthrough' } }, output: [{ ledgerRowId: 'L-x|initial|1', ledgerKey: 'L-x|initial', leadId: 'L-x', draftId: 'D-L-x-initial', to: 'info@x.example', fromName: 'Sender', fromEmail: 'sender@agency.example', subject: 'Hi', body: 'Text' }] });
const build = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: "Build Gmail Message", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Builds ONE email in the raw format Gmail's API expects, with List-Unsubscribe headers.
// One message per run, so the result can never be matched to the wrong email.
const items = $input.all();
const m = (items[0] && items[0].json) || {};
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const CR = String.fromCharCode(13);
const LF = String.fromCharCode(10);
const CRLF = CR + LF;
const oneLine = (v) => clean(v).split(CR).join(' ').split(LF).join(' ');
const b64 = (s) => { try { return Buffer.from(s, 'utf8').toString('base64'); } catch (e) { return btoa(unescape(encodeURIComponent(s))); } };
const b64url = (s) => b64(s).split('+').join('-').split('/').join('_').split('=').join('');
const to = oneLine(m.to).toLowerCase();
const fromEmail = oneLine(m.fromEmail).toLowerCase();
const fromName = oneLine(m.fromName).split('"').join("'");
const problems = [];
if (items.length !== 1) problems.push('expected exactly 1 email, got ' + items.length);
if (to.split('@').length !== 2 || to.indexOf(' ') !== -1) problems.push('bad To address');
if (fromEmail.split('@').length !== 2) problems.push('bad From address');
if (!clean(m.body) || !oneLine(m.subject)) problems.push('empty subject or body');
const unsub = ['<mailto:' + fromEmail + '?subject=unsubscribe>'];
const url = clean(m.unsubscribeUrl);
if (url.indexOf('https://') === 0) unsub.push('<' + url + '>');
const headers = [
  'From: "' + fromName + '" <' + fromEmail + '>',
  'To: <' + to + '>',
  'Subject: =?UTF-8?B?' + b64(oneLine(m.subject)) + '?=',
  'MIME-Version: 1.0',
  'Content-Type: text/plain; charset="UTF-8"',
  'Content-Transfer-Encoding: base64',
  'List-Unsubscribe: ' + unsub.join(', '),
  'X-Jido-Ledger-Row: ' + oneLine(m.ledgerRowId)
];
if (m.oneClickVerified === true && url.indexOf('https://') === 0) headers.push('List-Unsubscribe-Post: List-Unsubscribe=One-Click');
const bodyB64 = (b64(clean(m.body).split(CR).join('').split(LF).join(CRLF)).match(new RegExp('.{1,76}', 'g')) || []).join(CRLF);
const raw = headers.join(CRLF) + CRLF + CRLF + bodyB64;
const meta = { ledgerRowId: clean(m.ledgerRowId), ledgerKey: clean(m.ledgerKey), leadId: clean(m.leadId), draftId: clean(m.draftId), to };
const threadId = oneLine(m.gmailThreadId);
return [{ json: { raw: problems.length ? '' : b64url(raw), threadId, meta, problems } }];` } },
  output: [{ raw: 'abc', meta: {}, problems: [] }]
});
const msgOk = ifElse({
  version: 2.2,
  config: {
    name: "Message OK?",
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.problems.length === 0 }}'), operator: { type: 'boolean', operation: 'true', singleValue: true }, rightValue: '' }],
        combinator: 'and'
      }
    }
  }
});
const send = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'Send Through Gmail API (OFF)',
    disabled: true,
    onError: 'continueRegularOutput',
    parameters: {
      method: 'POST',
      url: 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'gmailOAuth2',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify($json.threadId ? { raw: $json.raw, threadId: $json.threadId } : { raw: $json.raw }) }}'),
      options: { response: { response: { fullResponse: true, neverError: true, responseFormat: 'json' } }, timeout: 30000 }
    }
  },
  output: [{ statusCode: 200, body: { id: 'msg-1', threadId: 'thr-1' } }]
});
const result = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: "Read Send Result", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: `// Reads the Gmail answer for the ONE email of this run. Never retries.
// sent = Gmail gave a message ID | failed = Gmail definitely refused it |
// uncertain = we can't tell (timeout, server error): a person must check the Sent folder.
const built = $('Build Gmail Message').first().json;
const meta = built.meta || {};
const r = $input.first().json || {};
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
let outcome = 'uncertain';
let error = '';
let id = '';
let threadId = '';
const body = r.body && typeof r.body === 'object' ? r.body : {};
if ((built.problems || []).length) { outcome = 'failed'; error = 'Not sent: ' + built.problems.join('; '); }
else if (Object.prototype.hasOwnProperty.call(r, 'raw') && r.statusCode === undefined && !r.error) { outcome = 'not_sent_step_off'; error = 'Gmail sending step is switched off - nothing was sent'; }
else if (r.error) {
  const msg = clean(r.error.message || r.error);
  error = msg.slice(0, 300);
  outcome = /credential|unauthori|forbidden|invalid_grant|401|403/i.test(msg) ? 'failed' : 'uncertain';
} else {
  const code = Number(r.statusCode || 0);
  if (code >= 200 && code < 300 && clean(body.id)) { outcome = 'sent'; id = clean(body.id); threadId = clean(body.threadId); }
  else if (code >= 400 && code < 500) { outcome = 'failed'; error = 'Gmail refused (' + code + '): ' + clean((body.error && body.error.message) || '').slice(0, 200); }
  else { outcome = 'uncertain'; error = 'Unclear answer from Gmail (status ' + (code || 'none') + ')'; }
}
return [{ json: Object.assign({}, meta, { outcome, gmailMessageId: id, gmailThreadId: threadId, error }) }];` } },
  output: [{ outcome: 'sent', gmailMessageId: 'msg-1' }]
});
const note = sticky("## H7 Helper: Send One Email - SWITCHED OFF\nSends exactly ONE email per run through the Gmail API (so we can add List-Unsubscribe headers, which n8n's Gmail node can't).\n\n**The send step is disabled and has NO Gmail login attached.** Nothing can be sent until you approve go-live, attach the Gmail login here and switch the step on.\n\nNever retries: sent / failed / uncertain is reported back by Ledger Row ID.", [build], { color: 6 });

export default workflow("agency-h7-send-one", "[AGENCY] H7 Helper: Send One Email (OFF)")
  .add(whenCalled)
  .to(build)
  .to(msgOk
    .onTrue(send.to(result))
    .onFalse(result))
  .add(note);
