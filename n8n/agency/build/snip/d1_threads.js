// Lists ONLY the Gmail threads of emails WE sent (from the Send Ledger). The monitor never searches
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
return threads.slice(0, max).map((t) => ({ json: Object.assign({}, t, { crmUrl: cfg.crmUrl, runId: String($execution.id) }) }));
