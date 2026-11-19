// Finds leads whose follow-up is due: first email Sent, NO reply of any kind, not opted out, date
// reached, fewer than MAX_FOLLOWUPS (at most 2). Stops (fail closed) if a tab can't be read.
const cfg = $('Load Agency Config').first().json;
const s = cfg.settings || {};
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const now = DateTime.now().setZone(cfg.timezone || 'America/New_York');
const today = now.toFormat('yyyy-LL-dd');
const leads = $('Read Leads').all().map((i) => i.json || {});
const drafts = $input.all().map((i) => i.json || {});
if (leads.some((r) => r.error)) throw new Error('D3 could not read the Leads tab');
if (drafts.some((r) => r.error)) throw new Error('D3 could not read the Outreach Drafts tab');
const maxF = Math.min(Math.max(Number(clean(s.MAX_FOLLOWUPS) || 2), 0), 2);
const batch = Math.min(Math.max(Number(s.DRAFT_BATCH_SIZE) || 5, 1), 10);
const demoFlag = cfg.isDemo === false ? 'NO' : 'YES';
const byId = {};
drafts.forEach((d) => { if (clean(d['Draft ID'])) byId[clean(d['Draft ID'])] = d; });
const picked = [];
const skipped = [];
leads.forEach((l) => {
  const id = clean(l['Lead ID']);
  if (!id || clean(l['Is Demo']).toUpperCase() !== demoFlag || clean(l['Opted Out']).toUpperCase() === 'YES') return;
  if (['contacted', 'follow-up pending'].indexOf(clean(l['Pipeline Status']).toLowerCase()) === -1) return;
  if (clean(l['Reply Status']) || clean(l['Reply Category']) && clean(l['Reply Category']).indexOf('Out of office') !== 0) return;
  const due = clean(l['Next Allowed Follow-up']);
  if (!due || due > today) return;
  const count = Number(clean(l['Follow-up Count']) || 0) || 0;
  if (count >= maxF) return;
  const step = 'followup' + (count + 1);
  const did = 'D-' + id + '-' + step;
  if (byId[did]) return;
  const init = byId['D-' + id + '-initial'];
  if (!init || clean(init['Send Status']) !== 'Sent') { skipped.push(id + ': first email not marked Sent'); return; }
  const thread = clean(init['Gmail Thread ID']) || clean(l['Gmail Thread ID']);
  if (!thread) { skipped.push(id + ': no Gmail thread recorded'); return; }
  const to = clean(init['To Email']).toLowerCase();
  if (!to || to !== clean(l['Public Email']).toLowerCase()) { skipped.push(id + ': lead email changed since the first email'); return; }
  if (count > 0 && !(byId['D-' + id + '-followup' + count] && clean(byId['D-' + id + '-followup' + count]['Send Status']) === 'Sent')) { skipped.push(id + ': previous follow-up not marked Sent'); return; }
  if (picked.length < batch) picked.push({ leadId: id, email: to, ref: did, step, count, thread, crmUrl: cfg.crmUrl, runId: String($execution.id) });
});
return picked.map((x, i) => ({ json: Object.assign({}, x, { skipped: i === 0 ? skipped : [] }) }));
