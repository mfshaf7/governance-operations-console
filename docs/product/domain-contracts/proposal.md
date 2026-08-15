# Proposal Domain Contract

Status: completed current-shape compact-control contract, not full-console
baseline approval.

Proposal owns idea/proposal control before work becomes Delivery, Prototype,
or parked/rejected posture. Repository and Portfolio are not route targets.

## Surface Purpose

The operator uses Proposal to capture, inspect, triage, disposition, and hand
off proposal records without pretending the console is the backend proposal
database.

Proposal is intentionally simpler than Delivery. It uses a compact focused
control modal, not a full-screen workspace, persistent left navigation,
Recent Activity panel, or persistent Agent Console.

## Ingress

Proposal has two ingress paths:

- direct console capture
- backend/API/agent/system-created proposal projection

Both paths must converge into one backend-owned proposal projection. The console
may show projection version/cursor, last update, and projection health. Until
OOS admits a realtime route, live wiring starts with refresh/polling rather
than SSE/websocket.

## Source Of Truth

Canonical Proposal state belongs to Workspace Proposals in OpenProject. OOS is
the only admitted mutation adapter. The Console reads typed OOS projections and
submits version-bound commands through same-origin server routes; it never
calls OpenProject from the browser or treats local state as canonical truth.

When `OOS_BASE_URL` is absent, the Console enters explicit disconnected preview
and uses synthetic fixtures plus prototype-local receipts. When an OOS endpoint
is configured but unavailable, the Console fails closed, shows an offline
source posture, disables writes, and does not fall back to fixtures.

## Projection Authority And Live Failover

Proposal source fields stay source-owned. Fields such as `backendRecordId`,
`recordVersion`, `projectionState`, `status`, route target, repository gate
state, owner, last projection update, and source evidence come from the Proposal
read model, OOS proposal projection, or a future admitted Proposal backend
projection. Workflow session code must not mutate those fields to simulate
triage, disposition, route, handoff, or implemented backend truth.

Live direct capture uses `POST /v1/ideas/capture`; the resulting Proposal is
refreshed through the versioned projection route before it is shown as
canonical. Disconnected preview may still create a prototype-local record, but
that record remains visibly local through `proposal://local/...`,
`recordVersion: "local-capture"`, and local projection posture.

In live mode, workflow steps submit `triage`, `disposition`, and `handoff`
commands to OOS with the canonical record ref, expected version, lifecycle
status, and current projection state. OOS projections and immutable history
events drive the Hub, progress cards, required move, and History posture. Local
drafts remain browser-local and lose write eligibility when their source
version is no longer current.

In disconnected preview, workflow steps may record prototype-local commands
and receipts. Those receipts may drive the same interface but must not be
presented as backend truth.
`projectProposalEffectiveRecords` is the single merge boundary for source
records, console captures, matching workflow receipts, and Repository gate
resolutions. Summary, filters, register rows, selected context, Details, Hub,
and workflow launchers consume those effective records. A receipt whose source
identity or version no longer matches the record remains audit evidence but
must not change current operator posture.
Each applied workflow receipt retains the structured applied payload and is
stored by Proposal record without overwriting earlier receipt evidence. Applied
workflow state may be reprojected from that receipt payload. Summary and History
must derive recorded outcomes from stored receipts, never from draft
`appliedAt` timestamps or mutable draft content alone.
Each prototype-local command must carry the source backend record id, source record version,
and source projection state it was based on so live wiring can reject stale or
conflicting writes instead of trusting UI state alone.
Autosaved local drafts and applied local receipts must preserve the same source
snapshot. If the source backend record id or source record version changes, or
if the projection becomes stale, offline, or errored, Proposal must show a
source-review posture and block further local apply actions until the operator
reviews the refreshed source.

Cross-operation outputs from disconnected preview remain local projection
packets:

- repository requests from Proposal repository gates stay under
  `operation-integrations/proposal-repository-request-projection.ts`
- Prototype entry packets from Proposal handoff stay under
  `operation-integrations/proposal-prototype-entry-projection.ts`
- Delivery entry packets from Proposal handoff stay under
  `operation-integrations/proposal-delivery-entry-projection.ts`

Those outputs use the shared schema-versioned packet envelope. Each output uses
a separate custody projection, and applied handoffs carry their producer
receipt reference. Those packets carry `authority: "prototype-local"` and
must not be presented as durable Repository, Prototype, Delivery,
lifecycle-transition, or OOS receipts. When OOS or the owning backend returns a
durable receipt or refreshed projection, the backend projection wins. The
local receipt or packet must then be removed, ignored, or reconciled against
the returned projection version. Live OOS Handoff prepares a canonical target
packet only. It does not execute Delivery or Prototype application, emit a
target-owned receipt, or mark the Proposal implemented.

If the Proposal source projection becomes stale, offline, or changes version
while a local draft or receipt exists, the UI must show stale, conflict, or
review-only posture before continuing. It must not apply a local receipt against
an unknown source version or render local handoff as source-routed backend truth.

Visible Proposal summary cards must be computed from the current effective
proposal projection rows. They must not
read the fixture `summary` field directly because that field is only seed
read-model context and does not include console-captured records or locally
recorded workflow outcomes.

## Primary Surfaces

Proposal Control uses:

- top overview zone with Proposal Summary and Capture Proposal
- searchable/filterable Proposal Register
- compact selected-record launcher
- Proposal Details modal
- Proposal Hub modal
- workflow session modals for Triage, Disposition, and Handoff
- Proposal History as a read-only archive route

The selected-record launcher is only orientation plus a first-class action to
open Proposal Hub. It must not become the hub itself.

## Source Structure

Proposal is a compact operation domain, but it uses the same ownership-layer
vocabulary as Delivery so future operation work does not invent a second source
model. Its public boundary exposes only the domain `index.ts`; implementation
files stay private under ownership folders:

- `presentation/workspace/`: Proposal modal shell, public wrapper, and
  operation-workbench contract helper
- `presentation/surface/`: Proposal Control composition, overview panel,
  register table, compact control controller hook, controller contract types,
  and surface display helpers
- `presentation/dialogs/capture/`: direct proposal capture modal
- `presentation/dialogs/details/`: read-only proposal record details modal
- `presentation/hub/`: selected proposal hub, hub home panels, hub status,
  current-move, history, route projection, hub types, and hub view model
- `presentation/workflows/session/`: workflow session controller, draft-state
  hook, session state projection, controller contract types, footer, progress
  panel, and workflow shell copy. The draft hook receives a receipt-recording
  callback; only the top control controller calls `local-runtime`.
- `presentation/workflows/steps/`: workflow step views for triage, disposition,
  handoff, and history, including step-local panels and step view models when a
  step has multiple coherent panel responsibilities
- `domain/`: canonical Proposal record, lifecycle, repository-gate, and
  transition concepts
- `work-model/`: workflow command, navigation, step, source-projection,
  triage, disposition, and handoff models
- `read-model/`: structured Proposal types, read-model entry, and fixture truth
  split by activities, scenarios, scenario coverage, summary, and workspace status
- `local-runtime/`: prototype-local subscription and command receipt adapter
- `live-runtime/`: browser-safe OOS contract projection, bounded polling,
  same-origin command client, and explicit live/disconnected runtime state
- `server/`: server-only OOS client, caller authentication, configuration,
  timeout, response validation, and Next route handlers

Proposal must not add implementation files at the domain root except the public
barrel. Proposal uses Teras primitives directly and must not keep placeholder
local CSS, raw `className` chrome, `styles.*`, or inline style objects.

Product-neutral cross-operation types and pure display projections live under
`src/domain-workspaces/operation-projections/`. Concrete Proposal-to-Repository,
Proposal-to-Prototype, and Proposal-to-Delivery custody adapters live under
`src/domain-workspaces/operation-integrations/`. Neither boundary is Proposal UI
internals, and cross-domain adapters must not sit loose in the
`domain-workspaces` root.

## Workflow

Proposal active workflow steps:

1. Triage
   - backend-aligned name
   - records one triage summary
   - does not choose route, repository gate, parking, rejection, acceptance, or
     handoff readiness
   - may use advisor assistance as draft-only support
2. Disposition
   - records outcome: `accepted`, `parked`, or `rejected`
   - source `parked` proposals remain revisitable through Disposition because
     OOS supports recording a new bounded decision from a parked proposal
   - accepted proposals select Delivery or Prototype route intent and
     repository requirement
   - combines the old decision and route split into one workflow step
   - does not create repositories, Product Portfolio entries, or publication
     packets, and does not perform handoff
3. Handoff
   - reviews already selected route and repository gate
   - records a version-bound prepared-handoff result through OOS in live mode
     or a clearly local receipt in disconnected preview
   - does not choose a new route or create/mutate a repository

History is available as read-only archive. It is not a progress step in the
Hub and does not advance workflow.

Workflow step modal bodies use `TerasZoneLayout variant="main-aside"` with
`TerasZone` as the direct children. Step-specific stacked content or
scroll regions belong inside a zone, not as a replacement for the zone
column itself. This keeps Triage, Disposition, Handoff, and History from
resizing or behaving like separate implementations of the same workflow
surface.

## Route Targets

Allowed route targets:

- Delivery
- Prototype
- Parked

Repository is never a route target; repository is a gate, not a route target.
Repository is a gate selected during
Disposition and reviewed during Handoff. A proposal waiting on repository keeps
its selected Delivery or Prototype route while Handoff remains blocked.

Delivery and Prototype handoff packets must carry source-custody
classification, not only route intent. The classification must identify
`existing-repo`, `new-repo-required`, `platform-internal`, or
`non-source-work`, plus owner, repo/source ref when applicable, repository gate
state, and rationale. Delivery ingress policy verifies that custody is resolved
before creating the Intake source, and Intake rechecks the projected custody
before Consume. Proposal must not present route selection as source-custody
truth when the repository gate is unresolved, and must not hand off to Delivery
while that gate is still unresolved.

Portfolio is not a Proposal route target. A product idea still routes to
Prototype or Delivery according to its work maturity. Portfolio publication is
available only after the result has durable product identity, ownership, and
applicable operating evidence; Proposal never creates a Portfolio entry or
publication candidate directly.

## Handoff Completion Boundary

Recording Handoff prepares the source packet. It does not by itself prove
target admission, target application, or Proposal completion.

- Proposal-to-Prototype handoff becomes applied only when a Prototype-owned
  application receipt creates the derived `proposal-routed` / `exploring`
  entry with Landing `captured`.
- Proposal-to-Delivery handoff becomes applied only when a Delivery-owned
  ingress receipt creates an Intake source with `needs_consume`.
- Delivery Intake Consume is not part of Proposal Handoff. Consume failure is
  Delivery/Orchestration-owned and must not reopen Proposal.
- Validation that requires source correction keeps the action with Proposal.
  A technical target-adapter retry keeps Proposal waiting on the target rather
  than inventing a new Proposal decision.
- Applied target ingress leaves the Proposal lifecycle `accepted`. Proposal
  becomes `implemented` only after reconciled downstream completion evidence
  proves that the accepted idea was realized.

Prototype-local fixtures must model packet preparation and target application
as distinct receipts even when both are simulated in one local session.

## States

Proposal must distinguish:

- captured
- triaged
- accepted
- parked
- rejected
- implemented
- source projected
- review only
- local receipt pending or recorded

Repository-gate blocking and target-adapter failure are handoff or transition
postures, not Proposal lifecycle states.

`implemented` or the compact `done` summary label is valid only when the source
Proposal projection reports `implemented` or a durable downstream completion
receipt has been reconciled into that source projection. A Prototype
application receipt or Delivery ingress receipt proves handoff application,
not Proposal implementation.

Long backend/read-model labels should live in filters, details, or body copy
instead of stretching compact pills.

## Persistence And Guards

Workflow edits autosave into parent-owned prototype-local session state.
Unchanged drafts may close directly. Autosaved but unapplied drafts use the
shared Teras draft-close guard. Completed/read-model-projected workflow steps
remain reviewable but read-only.

## Non-Goals

Proposal must not:

- mutate canonical proposal state before admitted OOS wiring exists
- directly create repositories
- classify Workspace Intake or promote active Workspace inventory
- directly create Product Portfolio entries or publication packets
- replace Delivery Intake
- perform Delivery planning
- become a persistent agent console
- add a left-nav workflow section model
- treat legacy inline Proposal as the implementation baseline

## Sources

- `../architecture/README.md`
- `../operation-workbench-contract.md`
- `../system-design.md`
- `../teras-contract.md`
- `../implementation-audit.md`
