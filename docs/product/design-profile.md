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

## Operational Dashboard Preview

The operator authorized a Prototype Dashboard trial informed by the official
[Octopus project dashboard](https://octopus.com/docs/projects/project-dashboard)
and [Vercel deployment views](https://vercel.com/docs/deployments). It uses a
full-width project/next-action header, four substantial status cards, balanced
Runtime/source and Readiness/evidence panels, and a wide issues section. Existing
Teras neutral detail panels reduce competing emphasis; the four summary cards use
the primary amber rail treatment with header-aligned state pills and smaller
supporting facts grouped in a neutral inset card. Preview Runtime and Source Authoring remain primary actions
alongside the eligible workflow action. Source/handoff inspection retains a concise
purpose description. Exact references use the existing technical disclosure. One bounded
content region preserves natural panel heights and native scrolling. The trial
adds no theme, authority, analytics or workflow gate. Visual acceptance and coherent
batch publication remain pending; this is not a new live baseline.

Closure and Resume Closure are primary workflow-entry actions on this Dashboard;
View History and focused read-only inspections retain secondary emphasis.

## Delivery Repair Preview

The operator approved the Delivery inspection repairs in the existing uncommitted
UI batch. Preserve the six areas, native active/locked workflow components and
all owner gates. Repair readable table/board minimums, natural-height scrolling,
status semantics, dirty exits, and supporting-detail hierarchy. Delivery Home
regains an inline advisor using the existing governed Agent session and request
path with bounded Delivery context. No local scripted replies or new mutation
authority are introduced. Keep exact references available in technical details.
Architecture Packet retains its accepted JSON schema; this pass improves its
guidance and draft protection without replacing the authoring contract.

Home polish follows the existing shared patterns: the advisor switches Run to
Cancel during a request, and recorded Recent Activity uses `TerasTimeline` with
timestamp, original owner title and package context. Full source narrative and
exact actor/event/package/receipt references remain in technical disclosure.
The activity timeline sits inside a shared contained-list frame at the operator’s
request, with its existing internal scrolling.

Execution lane rows fill the board canvas so their native horizontal scrollbar
stays at its bottom while shorter lanes retain their natural height.

Execution action draft, review and receipt panels use the standard padded frame;
content must remain inside rounded edges and lower inputs must remain reachable
through the modal body scroll.

Visual review happens in preview before the combined batch is published.

## Baseline Visual Rule

The approved Orchestration maintenance preview keeps its three areas and shared
patterns. Home's attention queue fills the space below the compact service
summary; full service inspection opens on demand. Qualification checks retain
their natural height without an internal capped list. The advisor follows below
when necessary, with column scrolling rather than clipped primary content.
Registers preserve readable columns and scroll access; dashboards retain all
inspectors and exact evidence in technical disclosures. No new domain-local CSS,
visual theme, execution authority or runtime component is introduced.

Flat action panels use the standard panel gap between headings, facts and
buttons. Shared list and selector-rail insets leave room for hover lift and
keyboard focus at the first and last rows, while preserving the containing
panel's height and scrolling.

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
