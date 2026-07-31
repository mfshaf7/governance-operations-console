# Governance Operations Console Record Index

Status: approved source-baseline contract index.

This directory owns the product-local architecture and design records
transferred from Workspace Prototype Studio with the approved source baseline.
The implementation remains local-only and pre-live-integration, but this
repository is now the durable home for future product changes.

## Read Order

1. `system-design.md`
   - Full system purpose, work-type taxonomy, global boundaries, source of
     truth model, and prototype lifecycle expectations.
2. `architecture/README.md`
   - Canonical machine-readable system model plus synchronized views for system
     context, operator surfaces, authorities, lifecycle, handoffs, runtime and
     release, and capability maturity.
3. `operation-workbench-contract.md`
   - Shared Operation Workbench engineering, visual, workflow, panel, Teras,
     and drift-control rules.
4. `source-structure-discipline.md`
   - Product-wide source ownership, module-boundary, naming, extraction,
     styling, and validation rules.
5. `authority-decision-contract.md`
   - Cross-cutting request, authority, receipt, expiry, and originating-domain
     rules for waiver and accepted-risk decisions.
6. `product-app-boundaries.md`
   - Product-app extraction boundaries for reusable tools currently hosted by
     Operation Workbench domains, including Context Board and Build Tree.
7. `durable-orchestration-standard.md`
   - General qualification, definition, lifecycle, run, ownership, security,
     versioning, and operator-surface rules for durable orchestration.
8. `orchestration-use-case-matrix.md`
   - Locked classification of current Operation Workbench workflows as
     synchronous, conditional, or durable candidates.
9. `orchestration-definitions/`
   - Versioned concrete definition contracts derived from qualified durable
     candidates. The first definition is `delivery.refinement.apply` v1.
10. `orchestration-boundary-contract.md`
   - Cross-domain definition, OOS request, run projection, receipt,
     run-control, and Temporal-adapter boundary rules.
11. `domain-contracts/`
   - Domain-owned contracts for Proposal, Repository, Delivery, Prototype,
     Portfolio, Model Operations, and Orchestration.
   - For Delivery source architecture specifically,
     `domain-contracts/delivery.md` is source-derived from the current
     Delivery code and Delivery-hosted product-app code. If older broad records
     conflict with it on Delivery structure, product-app ownership, or
     no-behavior cleanup rules, use the Delivery contract.
12. `surface-contracts/`
   - Cross-surface contracts for Console navigation, Lifecycle Transition
     Control, Environment Lifecycle, Runtime Readiness, and Agent Console.
   - Read `surface-contracts/console-navigation.md` before changing top-level
     Console entries or moving capability surfaces in or out of Console home.
13. `teras-contract.md`
   - Product-neutral shared UI primitive contract.
14. `baseline-candidate-review.md`
   - Consolidated Baseline Foundation scope, evidence, deferred-owner ledger, validation,
     and the explicit operator approval gate.
15. `implementation-audit.md`
   - Current source alignment, operation ownership, integration boundaries,
     executable controls, and deliberate prototype limits.
16. Graduated prototype-history records:
   - `brief.md`
   - `design-profile.md`
   - `backlog.md`
   - `decision-log.md`
   - `change-log.md`

Retired planning and audit records have been removed from the active record
set. If an implementation question is not answered by the files above, stop and
update the normalized contract rather than searching for older guidance.

The transfer provenance and approved baseline record live under
[`../graduation`](../graduation/).

## Resume Rule

After context compaction or restart, resume console work by reading this file,
then `system-design.md`, then `architecture/README.md`, then the specific domain
or surface contract being changed. Do not rely on chat memory for accepted
structure.

## Phase Discipline

Console work moves in explicit phases:

1. Normalize records and read order.
2. Confirm or update the relevant domain or surface contract.
3. Inspect current code against that contract.
4. Make the smallest implementation slice that follows the contract.
5. Validate the affected slice.
6. Report remaining percentage against the active full-plan phase and the next
   move.

Any visual, structural, workflow, persistence, source-of-truth, or primitive
change that is not already covered by the contract must be discussed before
implementation.

If a slice changes a cross-domain role, authority, lifecycle, handoff, trust
boundary, or implementation maturity, update
`architecture/system-model.yaml`, every affected registered architecture view,
and the detailed domain or surface contract in the same slice before calling
that work complete.
