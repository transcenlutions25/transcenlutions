# Cost evidence read contract v2

The existing `tay_workflow_evidence.measured_cost_usd` database column is
`SUM(tay_operating_events.estimated_cost_usd)`. Its historical name is misleading:
it does not contain measured provider charges, subscription costs, credits, bank
transactions or collected revenue.

## Compatible database read, explicit API correction

No database DDL, migration, event rewrite or runtime configuration is performed.
The checked-in SQL retains the old view column name and documents its meaning.
`getOperatingGraphEvidence` reads that column with an `estimated_cost_usd` alias,
then normalizes the outgoing cost fields:

- `estimated_cost_usd`: nonnegative finite numeric estimate or exact nonnegative
  decimal string from Postgres; null for absent/invalid evidence.
- `measured_cost_usd`: retained deprecated response key, always null. Clients that
  used its previous numeric value must switch to `estimated_cost_usd` and label it
  **estimated**, not measured. This intentional truthfulness correction is not a
  promise of semantic compatibility with the old inaccurate label.
- `billed_cost_usd`: null. This code has no verified billing source.
- `cost_evidence`: source/currency and separate estimate/billed verification states.
- Successful API responses include `evidence_contract_version: 2` and an explicit
  warning. Counts, workflow metrics, tenant scope and authentication are unchanged.

Zero estimated cost remains zero **estimated** cost; actual/billed cost stays
unknown. No estimate must be filled with zero. Decimal strings stay strings to
avoid loss of Postgres NUMERIC precision. Do not add estimate and billed values as
though they were separate expenses or relabel a configured database as billing
access. A future authenticated provider-billing adapter needs its own source,
account, currency, period, observed time and reconciliation tests before actual
cost may be populated.

## Consumer inspection and limits

Repository search found the database read adapter and `/api/operating-graph/evidence`
as the active consumers of this alias. No checked-in UI displays it. External
consumers may exist and must honor the v2 note above; do not silently hide the
change. The existing import guide describes this evidence endpoint, but does not
establish a deployed database or dashboard.

This is a source-only read-boundary fix. It does not implement a service-billing
inventory, paid-model routing, cost reservations/hard caps, subscription management
or revenue verification. It does not cancel anything, spend, connect an account,
grant permissions, run a migration or deploy. Existing Android/native-worker safety
work remains independent and takes priority.

## Regression

`node --test scripts/test-operating-cost-evidence.cjs` checks decimal/zero/unknown
cases and malicious/invalid inputs, and exercises the real database read adapter
with a stubbed Postgres pool. Estimated aggregate rows must never yield a measured
or billed amount. No database connection or provider request occurs in these tests.
