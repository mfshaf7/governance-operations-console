# Governance Operations Console Design Profile

Status: graduated baseline design profile.

This file originated as the Prototype Studio design profile. The active visual
and structural rules live in the normalized contract set:

- [`system-design.md`](system-design.md)
- [`operation-workbench-contract.md`](operation-workbench-contract.md)
- [`teras-contract.md`](teras-contract.md)
- [`domain-contracts/`](domain-contracts/README.md)
- [`surface-contracts/`](surface-contracts/README.md)

## Visual Direction

The console is a calm operator control surface for governance work. It should
feel precise, dense enough for repeated operator use, and clearly structured
around decisions, status, records, and receipts.

It is not a marketing page, generic admin template, decorative dashboard, or
single-domain Delivery clone.

## Shared Visual System

Teras is the shared UI primitive layer. Operation domains compose surfaces
through Teras layout primitives and exposed component props. Domain-local CSS
is an exception only when inspection proves that no accepted primitive can
express a required composition or scroll boundary and the exception is
discussed first. It must never recreate shared panel, button, pill, register,
modal, filter, progress, guard, or selected-context chrome.

New visual primitives, modal sizes, panel treatments, action placement rules,
or reusable density variants require operator discussion before
implementation.

## Domain Shape Posture

- Delivery is a completed current-shape app-sized fullscreen workspace.
- Proposal is a completed current-shape compact focused workflow control modal.
- Repository is a completed current-shape compact focused repository control modal.
- Prototype is a completed current-shape compact control with a stable
  Prototype Dashboard and Preview Runtime surface.
- Product Portfolio is a completed current-shape fullscreen workspace.
  Products, Publication, Product Dashboard, and Curation operate over active
  product identity. The obsolete compact posture-control baseline remains
  revoked.
- Model Operations is a completed current-shape Compact Control with a stable
  profile dashboard, direct Workbench entry, normalized ownership tree, and
  focused domain guards. Its backend request path remains unavailable, and the
  surface is not baseline-approved.
- Orchestration is a completed current-shape fullscreen workspace with Home,
  Definitions, and Runs. Its local command and receipt behavior remains
  prototype-only and is not durable orchestration evidence.
- Lifecycle Transitions now uses its accepted dedicated full-viewport Teras
  workspace. Runtime Readiness and Agent Console have completed capability
  ownership and current-shape content and visual passes, but remain local
  prototype surfaces rather than baseline-approved or live-wired controls.
  Authority decisions stay in the originating domain and the named authority;
  they do not add another Workbench visual profile.

Shape can differ by surface purpose. Visual language cannot drift.

## Baseline Visual Rule

No surface is visually baseline-approved unless it has:

- accepted domain or surface contract
- Teras primitive alignment
- coherent zone model
- source-of-truth and status semantics visible in the UI
- no stale legacy comparison path
- focused preview or validation proof
