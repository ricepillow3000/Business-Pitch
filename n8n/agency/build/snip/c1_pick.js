// Picks Warm/Hot leads that are ready for a first email and don't have a draft yet.
// Stops (fail closed) if the Leads or Outreach Drafts tab can't be read.
const cfg = $('Load Agency Config').first().json;
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const leads = $('Read Leads').all().map((i) => i.json || {});
const drafts = $input.all().map((i) => i.json || {});
if (leads.some((r) => r.error)) throw new Error('C1 could not read the Leads tab');
if (drafts.some((r) => r.error)) throw new Error('C1 could not read the Outreach Drafts tab (run A0b Setup first)');
const s = cfg.settings || {};
const demoFlag = cfg.isDemo === false ? 'NO' : 'YES';
const max = Math.min(Math.max(Number(s.DRAFT_BATCH_SIZE) || 5, 1), 10);
const hasDraft = {};
drafts.forEach((d) => { if (clean(d['Draft ID'])) hasDraft[clean(d['Draft ID'])] = true; });
const validEmail = (e) => { const p = e.split('@'); return p.length === 2 && p[0] && p[1].indexOf('.') > 0 && e.indexOf(' ') === -1; };
const skipped = [];
const picked = [];
leads.forEach((l) => {
  const id = clean(l['Lead ID']);
  if (!id) return;
  const why = [];
  if (['warm', 'hot'].indexOf(clean(l.Temperature).toLowerCase()) === -1) return;
  if (clean(l['Pipeline Status']) !== 'Ready for review') return;
  if (hasDraft['D-' + id + '-initial']) return;
  if (clean(l['Is Demo']).toUpperCase() !== demoFlag) why.push('DEMO/LIVE mismatch');
  if (clean(l['Opted Out']).toUpperCase() === 'YES') why.push('opted out');
  if (!validEmail(clean(l['Public Email']).toLowerCase())) why.push('no valid public email');
  if (['high', 'medium'].indexOf(clean(l['Research Confidence']).toLowerCase()) === -1) why.push('research confidence not High/Medium');
  if (['', 'unknown', 'no clear opportunity'].indexOf(clean(l['Primary Opportunity']).toLowerCase()) !== -1) why.push('no clear opportunity');
  if (!clean(l.Evidence)) why.push('no verified evidence');
  if (why.length) { skipped.push(id + ': ' + why.join(', ')); return; }
  if (picked.length < max) picked.push(l);
});
const runId = String($execution.id);
return picked.map((l, i) => ({ json: { leadId: clean(l['Lead ID']), email: clean(l['Public Email']).toLowerCase(), crmUrl: cfg.crmUrl, ref: 'D-' + clean(l['Lead ID']) + '-initial', runId, skipped: i === 0 ? skipped : [] } }));
