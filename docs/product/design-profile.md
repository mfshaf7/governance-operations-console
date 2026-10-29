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
  focused domain guards. Purpose-profile requests use their existing live OOS
  integration. Epic 1313 stages Models & routing in the same Compact Control
  with existing Teras primitives; exact-source Security acceptance, commissioning
  and operating proof remain required for the extension.
- Orchestration is a completed current-shape fullscreen workspace with Home,
  Definitions, and Runs. Configured live mode now projects strict OOS
  definition and run truth, requests the admitted validation run after explicit
  source/approval review, and routes only currently available controls;
  disconnected preview remains explicitly local and is not durable evidence.
- Lifecycle Transitions now uses its accepted dedicated full-viewport Teras
  workspace. Runtime Readiness consumes separately admitted Platform observations and local
  host telemetry. Agent Console uses the separately admitted OOS/CGG request
  path. Their reviewed local integrations do not establish remote/team access,
  model entitlement or stage/production qualification.
  Authority decisions stay in the originating domain and the named authority;
  they do not add another Workbench visual profile.

Shape can differ by surface purpose. Visual language cannot drift.

## Baseline Visual Rule

Live Delivery inventory status is owner-scoped read truth, not a blanket write
readiness badge. Each workflow owns its live operation checks and durable
evidence; Home must not describe a canonical OOS read as a prototype-local write
path or claim mutation authority from inventory visibility. Explicit disconnected
preview keeps local status. Read-only direct ART inspection, local tree drafting,
reviewed canonical apply and source-session start remain distinct actions.

No surface is visually baseline-approved unless it has:

- accepted domain or surface contract
- Teras primitive alignment
- coherent zone model
- source-of-truth and status semantics visible in the UI
- no stale legacy comparison path
- focused preview or validation proof
