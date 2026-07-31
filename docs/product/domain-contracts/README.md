# Operation Workbench Domain Contracts

Status: domain contract index.

These files define the domain-owned parts of the Operation Workbench. Every
domain must respect the shared `../operation-workbench-contract.md`, but not
every domain must use the same workflow shape as Delivery or Proposal.

Domains may differ in modal size, workflow depth, state machine, and operator
job. They may not drift from shared visual language, source-of-truth discipline,
Teras primitive usage, panel/action rules, or explicit lifecycle/status
projection.

Any domain action that may require durable execution must also be evaluated
against `../durable-orchestration-standard.md` and recorded in
`../orchestration-use-case-matrix.md` before implementation assumes an
orchestration runtime.

Workspace Intake classification and active-inventory promotion are embedded
Workspace Governance authority workflows, not Operation Workbench domains.
Their contracts live under `../orchestration-definitions/`.

## Domain List

- `proposal.md`
- `repository.md`
- `delivery.md`
- `prototype.md`
- `portfolio.md`
- `model-operations.md`
- `orchestration.md`

## Domain Admission Rule

Before a domain implementation slice starts, its contract must state:

- surface purpose
- ingress
- canonical system of record
- allowed lifecycle/status states
- primary surfaces
- workflow steps, if any
- backend or adapter boundary
- data mode and mutation boundary
- Teras primitive expectations
- temporary legacy/toggle posture
- known non-goals
