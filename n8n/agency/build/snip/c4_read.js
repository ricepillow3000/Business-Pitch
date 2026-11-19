// Works out what kind of unsubscribe request this is. A link carries ONLY a random token;
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
return [{ json: { channel: 'reply', token: '', email: fromAddr, isOptOut, ref: clean(j.gmailMessageId) || 'reply', threadId: clean(j.gmailThreadId) } }];
