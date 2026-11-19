// Builds ONE email in the raw format Gmail's API expects, with List-Unsubscribe headers.
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
return [{ json: { raw: problems.length ? '' : b64url(raw), threadId, meta, problems } }];
