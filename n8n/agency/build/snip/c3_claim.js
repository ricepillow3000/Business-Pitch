// Writes a "Sending" row for each email BEFORE contacting Gmail (claims it).
const c = $input.first().json.candidates || [];
const cfg = $('Load Agency Config').first().json;
const stamp = DateTime.now().setZone(cfg.timezone || 'America/New_York').toFormat('yyyy-LL-dd HH:mm');
return c.map((x) => ({ json: { 'Ledger Row ID': x.ledgerRowId, 'Ledger Key': x.ledgerKey, 'Lead ID': x.leadId, Step: x.step, 'To Email': x.to, Status: 'Sending', 'Created At': stamp, 'Updated At': stamp, 'Draft ID': x.draftId, 'Run ID': String($execution.id), 'Gmail Message ID': '', 'Gmail Thread ID': '', Error: '' } }));
