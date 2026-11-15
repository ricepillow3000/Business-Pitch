# Agency n8n workflows (source + tests)

This folder keeps a copy of the code behind the `[AGENCY]` workflows in n8n, so the work isn't lost if n8n changes. It isn't part of the website build.

- `workflows/`: n8n Workflow SDK source for A1, A2, A3, A10, H0, H1 and H4. `a0_blueprint_code.js` is the code inside A0 that describes the CRM tabs.
- `tests/`: local unit tests. `harness.js` pulls the JavaScript out of each Code step and runs it with fake n8n helpers and fictional data.

Run the tests:

```bash
cd n8n/agency && npm install && npm test
```

Notes:
- n8n is the source of truth. A few small fixes were applied directly in n8n and are mirrored here: position matching in A2, no `URL()` in A1/A2.
- Test results and what each test means: [`docs/agency-phase-b-test-log.md`](../../docs/agency-phase-b-test-log.md).
