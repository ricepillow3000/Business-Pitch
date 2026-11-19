// Pulls NEW replies out of our own threads. Each Gmail answer is matched to its thread by Thread ID
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
return [{ json: { crmUrl: cfg.crmUrl, replies, problems, threadsChecked: checked, events } }];
