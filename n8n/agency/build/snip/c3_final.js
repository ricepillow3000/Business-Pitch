// Last gate before Gmail: our ledger row must be the first claim for this email, the pause
// switches must still be off, and the address must still be allowed. Otherwise: not sent.
const clean = (v) => String(v === undefined || v === null ? '' : v).trim();
const cands = $('Pick Approved Drafts').first().json.candidates || [];
const ledger = $('Re-read Send Ledger').all().map((i) => i.json || {});
const cfg2 = $('Re-check Pause Switch').first().json || {};
const s2 = cfg2.settings || {};
const sup = {};
$input.all().forEach((i) => { const d = i.json || {}; if (clean(d.ref)) sup[clean(d.ref)] = d; });
const ledgerOk = !ledger.some((r) => r.error);
const stillOn = cfg2.ok === true && cfg2.systemPaused === false && cfg2.outreachPaused === false && clean(s2.GMAIL_SENDING_ENABLED).toUpperCase() === 'YES';
const BLOCKING = ['sending', 'sent', 'failed'];
return cands.map((x) => {
  let reason = '';
  if (!ledgerOk) reason = 'could not verify';
  else {
    const rows = ledger.filter((r) => clean(r['Ledger Key']) === x.ledgerKey && BLOCKING.indexOf(clean(r.Status).toLowerCase()) !== -1)
      .sort((a, b) => (Number(a.row_number) || 0) - (Number(b.row_number) || 0));
    if (!rows.length || clean(rows[0]['Ledger Row ID']) !== x.ledgerRowId) reason = 'duplicate';
  }
  if (!reason && !stillOn) reason = 'paused';
  const sc = sup[x.ledgerRowId];
  if (!reason && (!sc || sc.allowed !== true || sc.checkedOk !== true)) reason = 'suppressed';
  return { json: Object.assign({}, x, { send: reason === '', notSentReason: reason, suppressionReason: sc ? sc.reason : 'no answer' }) };
});
