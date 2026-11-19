// Addresses to check one more time, right before sending.
const cfg = $('Load Agency Config').first().json;
return ($('Pick Approved Drafts').first().json.candidates || []).map((x) => ({ json: { leadId: x.leadId, email: x.to, ref: x.ledgerRowId, crmUrl: cfg.crmUrl } }));
