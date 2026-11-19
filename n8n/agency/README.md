# Agency n8n workflows (source + tests)

This folder keeps a copy of the code behind the `[AGENCY]` workflows in n8n, so the work isn't lost if n8n changes. It isn't part of the website build.

- `workflows/`: n8n Workflow SDK source.
  - Phase B: A1, A2, A3, A10, H0, H1, H4, H5.
  - Phase C: C1, C2, C3, C4, H6, H7, H8, A0b.
  - `a0_blueprint_code.js` is the code inside A0 that describes the CRM tabs.
- `tests/`: local unit tests (176). `test_c.js` covers Phase C. `harness.js` pulls the JavaScript out of each Code step and runs it with fake n8n helpers and fictional data.

Run the tests:

```bash
cd n8n/agency && npm install && npm test
```

Notes:
- n8n is the source of truth. The files here match n8n, without the temporary test-checker steps, which were removed.
- Results are matched by Lead ID / Draft ID / Ledger Row ID, never by list position.
- Test results and what each test means: [`docs/agency-phase-b-test-log.md`](../../docs/agency-phase-b-test-log.md) and [`docs/agency-phase-c-test-log.md`](../../docs/agency-phase-c-test-log.md).
