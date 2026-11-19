// Reads the Gmail answer for the ONE email of this run. Never retries.
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
return [{ json: Object.assign({}, meta, { outcome, gmailMessageId: id, gmailThreadId: threadId, error }) }];
