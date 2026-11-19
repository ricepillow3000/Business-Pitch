// Lists approved, unsent drafts for the suppression check. Stops if a tab can't be read.
const cfg = $('Load Agency Config').first().json;
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const drafts = $('Read Outreach Drafts').all().map((i) => i.json || {});
const ledger = $('Read Send Ledger').all().map((i) => i.json || {});
const leads = $input.all().map((i) => i.json || {});
if (drafts.some((r) => r.error)) throw new Error('C3 could not read Outreach Drafts - nothing sent');
if (ledger.some((r) => r.error)) throw new Error('C3 could not read the Send Ledger - nothing sent');
if (leads.some((r) => r.error)) throw new Error('C3 could not read Leads - nothing sent');
return drafts.filter((d) => clean(d['Draft ID']) && clean(d['Review Status']) === 'Approved' && ['', 'not sent'].indexOf(clean(d['Send Status']).toLowerCase()) !== -1)
  .map((d) => ({ json: { leadId: clean(d['Lead ID']), email: clean(d['To Email']).toLowerCase(), ref: clean(d['Draft ID']), crmUrl: cfg.crmUrl } }));
