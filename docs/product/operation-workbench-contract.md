# Operation Workbench Contract

Status: active implementation contract, not design baseline approval.

Date: 2026-06-22

This contract governs new and continuing Operation Workbench domain work in
the Governance Operations Console prototype. It exists to stop domain
surfaces, workflow state, persistence behavior, command handling, and source
structure from drifting away from the shared Workbench and Teras rules while
domains without a completed design pass receive their own contracts.

This is not a full-console design baseline. It does not approve final visual or
workflow design for any unfinished domain. It only defines the shared
implementation rules that new Operation Workbench work must start from unless
the operator explicitly accepts a domain-specific exception.

This is one contract with multiple sections because visual workflow decisions,
state ownership, persistence, command behavior, receipts, and source structure
must move together. Do not split those concerns into separate competing
contracts unless ownership changes.

## Scope

Applies to:

- Operation Workbench domain surfaces
- domain registers and selected-record launchers
- domain workflow hubs
- workflow session modals
- workflow progress panels
- selected-context panels
- current-required-move panels
- action and footer placement
- history or receipt archive access
- domain state machines and workflow transitions
- session state, local draft state, and guards
- persistence, receipts, reconciliation, and recovery behavior
- domain shape admission and visual-system invariants
- Teras primitive reuse for domain work

Does not apply to:

- Command Center
- Lifecycle Transitions / historical Movement Control and LANES surface
- Runtime & Readiness
- Agent Console
- final design approval for unstarted domains
- live backend implementation, security acceptance, or platform release
  authority after prototype graduation

## Accepted Pattern Catalog

The shared Workbench and Teras contracts are the implementation authority.
Completed domain surfaces provide examples only after their reusable behavior
has been normalized into product-neutral rules.

Accepted pattern families:

- workflow session: hub-first entry, selected context, progress/status panel,
  draft/status body, zone-owned modal body, apply/review/receipt flow, guarded
  exit behavior, and history/archive treatment
- register: search and filters, title plus muted secondary line, status pill,
  compact right action column, and no vertical column-divider clutter
- home or posture surface: used only when a domain truly needs a home posture
  surface
- board/action surface: selected-record action drafts, board inspection, and
  read-only done/retired posture
- catalog/control surface: selector-card rails, current-value tables,
  selected-value inspectors, bottom action rows, and owner-routed metadata
  control
- setup/readiness planner: profile shortcut, requirement rows, selected
  requirement inspector, generated output, and draft row state before a
  workflow move is recorded
- Teras primitives: product-neutral UI foundation

Old or page-era surfaces are not implementation references. Do not preserve an
old state machine, old panel, or old modal only because it renders useful
visual fragments.

No completed domain is the parent architecture. New domains should reuse the
shared pattern family that fits their surface purpose and record a deliberate
exception when none fits.

## Canonical Operation Surface Modes

Operation Workbench domains must choose a surface mode by domain shape,
workflow depth, and operator job. They must not choose a mode because an old
inline surface already exists, because a file location is convenient, or because
another domain happens to be nearby.

Current canonical modes:

- Full Workspace Mode: for app-sized domains with multiple peer surfaces,
  persistent workspace status, internal navigation when needed, workspace
  summary, and surface-owned scroll regions. Delivery is the current reference
  for this mode.
- Compact Control Mode: for focused domains with one main register or control
  surface, a selected-record launcher, focused hub/details dialogs, and shallow
  workflow sessions. Proposal is the current reference for this mode.
- Compact Control With Dashboard Extensions: an extension of Compact Control
  Mode for focused domains that also need persistent subsystem dashboards or
  control cockpits. The extension may add dashboard/control modals, tabs, logs,
  and focused detail dialogs, but it must keep compact entry, register,
  selected-record, hub, workflow, and dashboard responsibilities separate.

## Operation Source Grammar

Completed Operation Workbench domains use one source grammar with mode-specific
presentation roots. New domains must start from this grammar before adding
domain-specific folders.

Domain root layers:

```text
<domain>/
  index.ts          public operation entry only
  domain/           canonical concepts, states, invariants, and transition rules
  read-model/       source-projected UI read shape, selectors, fixtures, projections
  work-model/       command/session/workflow DTOs when the domain mutates work
  local-runtime/    prototype-local runtime, draft, receipt, projection adapter
  presentation/     React views, controllers, view models, dialogs, dashboards
  product-adapters/ only when the domain consumes an incubating product app
```

Rules:

- `index.ts` at the domain root is the only root file.
- `domain/`, `read-model/`, `presentation/`, and the domain root `index.ts` are
  required for every stateful operation domain. A source-registry control such
  as Model Operations may omit `domain/` only while it owns no canonical
  lifecycle or transition behavior.
- `domain/` must remain independent of React, Teras, presentation, local
  runtime, product adapters, read-model fixtures, and workflow-session state.
  Other layers consume domain concepts; the domain layer does not consume
  their projections.
- `work-model/` is required when the domain owns workflow, command, draft,
  receipt, setup, or transition models. Pure read/control domains may omit it
  only while they have no domain-owned command model.
- `local-runtime/` is required when the prototype records local drafts,
  receipts, projection overlays, or runtime subscriptions.
- `product-adapters/` is not a shared-component folder. It belongs only to a
  domain that consumes a product app and maps domain data into that product app.
- Do not add `components/`, `views/`, `utils/`, `model/`, `runtime/`,
  `session/`, `steps/`, or `shared/` at the domain root. Those roles belong
  inside the owning layer.

Public boundary rules:

- `index.ts` is allowed only at true public boundaries: domain root, workspace
  entry, completed full-workspace public sub-boundaries, product-adapter
  boundaries, and explicitly recorded product-app integration boundaries.
- Internal folders should use concrete imports. A small folder with one or two
  exports does not get an `index.ts` just to shorten import paths.
- External shell code imports a domain only through the domain public barrel.
  Domain internals may import each other by concrete file path inside the same
  domain.

Compact operation domains use the same root ownership grammar as full
workspaces, but their presentation layer is grouped by surface job instead of
Delivery's peer-surface navigation model:

```text
<domain>/
  index.ts
  read-model/
  work-model/
  local-runtime/
  presentation/
    workspace/       public modal wrapper and Workbench contract adapter
    surface/         primary register or control surface
    hub/             selected-record cockpit, only when the domain has one
    workflows/       bounded transition sessions only
    dialogs/         focused capture, details, request, retirement, and info dialogs
    dashboards/      stable subsystem dashboards or control cockpits
    shared/          compact-domain presentation helpers only when needed
```

Folders that do not apply to a domain should be omitted. A focused dialog must
not sit directly under `presentation/` beside `surface/`; it belongs under
`presentation/dialogs/`. A stable subsystem control surface must not be hidden
inside a workflow or hub; it belongs under `presentation/dashboards/`.

Full Workspace Mode presentation grammar:

```text
presentation/
  workspace/        fullscreen workspace wrapper, status, summary, controller
  package-register/ optional domain-wide package register and selected launcher
  surfaces/         peer operator surfaces
  workflows/        bounded workflow sessions, hubs, steps, support, view models
  shared/           domain-local presentation helpers only when truly shared
```

Full-workspace domains may add product-app host folders inside a workflow only
when the code is an adapter/view host for `src/product-apps/*`. Product-app CSS
and local class names remain owned by the product app; operation-domain chrome
must still use Teras primitives.

`package-register/` is used only when one domain-wide package register is
shared across peer surfaces, as in Delivery. A full workspace with different
record families and actions per peer surface keeps each register under its
owning `surfaces/<surface>/register/` boundary. It must not create a misleading
domain-wide register merely to resemble Delivery.

File role naming:

- `*-surface.tsx`: top-level surface composition.
- `*-modal.tsx` or `*-dialog.tsx`: modal/dialog shell for one bounded job.
- `*-view-model.ts`: display-ready facts, copy, rows, actions, and state
  projection for a view.
- `*-types.ts`: UI-facing type declarations for that boundary.
- `*-model.ts`: domain/work/read model helpers, not React rendering.
- `*-controller.ts` or `use-*-controller.ts`: command routing, draft mutation,
  subscriptions, and side-effect orchestration.
- `use-*-state.ts`: React-owned local view/session state only.
- `*.fixture.ts`: structured synthetic read-model truth only.

Comparable domains should use the same words for the same role. Do not rename
`surface` to `control`, `dashboard` to `hub`, or `dialog` to `workflow` because
one file happens to render in a modal.

These modes are implementation references, not final design approval for every
unfinished domain. A new or reworked operation surface may keep a legacy inline
surface only as a temporary comparison path. After the new mode is accepted and
cut over, the legacy path and stale mock data must be removed so future work
does not inherit the wrong structure.

## Surface And Modal Taxonomy

Operation Workbench domains must separate record selection, record routing,
persistent control, workflow transition, and focused inspection. Modal size and
composition may differ by domain, but the surface job must be explicit before
implementation.

Accepted surface jobs:

- Register: list, search, filter, select, and launch stable record actions. A
  register does not own workflow transition logic.
- Record hub: selected-record cockpit. It shows context, current required move,
  status posture, lifecycle progress when relevant, and links to workflows,
  dashboards, and history. It does not become a dumping ground for every
  subsystem panel.
- Workflow session: bounded transition or receipt-producing session. It owns
  draft state, dirty/guard behavior, validation, command/action, recovery, and
  receipt result for one lifecycle or evidence move.
- Stable dashboard or control surface: persistent status/control cockpit for a
  subsystem. It may use tabs, local actions, logs, profile/config sections, and
  focused detail dialogs. It is not a workflow step and must not use workflow
  session chrome unless it is running a bounded transition.
- Inspection dialog: focused details for one selected row, card, status, log,
  proof, gate, or support item. It must not replace the hub or workflow
  session.

Modal profile rules:

- Compact control modals are for focused domains with one register and one
  shallow selected action path.
- Workflow-session modals are for transition work only.
- Control-dashboard modals are allowed when a domain has persistent subsystem
  status/control that would be cramped or misleading inside a workflow modal.
- If content requires excessive vertical scrolling, the modal profile is wrong
  or the content must split into tabs and focused inspection dialogs.
- A stable dashboard may be launched from the register or hub, but it must not
  appear as an active workflow progress step.
- A workflow may depend on evidence from a dashboard, but that evidence should
  be represented as a requirement, receipt, or link, not by embedding the
  dashboard in the workflow.

### Baseline-Preserving Correction Boundary

This product has an approved local baseline. Operator-found visual,
modal-shape, component-choice, and workflow-shape drift may be corrected in the
owner repository only when the correction preserves the accepted behavior and
visual contract. A material design or workflow change requires separate
discussion and scope.

Use a durable improvement record when the operator explicitly requests it or
when a repeated miss affects baseline behavior, governed delivery, live
authority, security posture, or workspace governance. Ordinary isolated
owner-repository maintenance does not become a workspace improvement record.

## Extraction Rule

Before implementing a new Operation Workbench domain or workflow step, identify
the closest accepted Workbench or Teras pattern.

If no closest accepted pattern exists, record that the domain is creating a
local exploratory shape and name which part may later become a Teras promotion
candidate.

Do not implement from memory alone. The implementation pass should be able to
point to:

- the surface purpose
- the source of truth
- the nearest Workbench/Teras pattern
- the local exception, if any
- the focused guard or manual preview state that will prove it

Raw styling is not an accepted shortcut. Operation domains must not use
domain-local CSS, raw `className` chrome, `styles.*`, or inline style objects
for panels, cards, rows, pills, trays, buttons, filters, tables, modals,
metadata, progress, selected-context surfaces, or layout chrome. If a surface
genuinely lacks a required design primitive, discuss the gap first, experiment
locally only long enough to lock the visual, then immediately promote the
neutral primitive or variant into Teras before continuing broad implementation.
Duplicating an existing primitive with local styling is not acceptable.

## Source Of Truth Rule

Domain modules own domain behavior. Shell modules compose domains.

Each domain must keep source-of-truth assumptions explicit:

- backend or future backend owner
- read model
- projection freshness or cursor/version if relevant
- mutation boundary
- local-only draft or receipt boundary
- post-baseline wiring boundary

Component-local logic must not own domain posture, action eligibility, backend
status truth, or source-of-truth metadata. Those belong in the domain read
model, selector, projection, action matrix, or session controller.

Mock, synthetic, approved read-only, and prototype-local behavior must remain
visibly separate from durable backend mutation or durable receipt evidence.

## Engineering Contract

Every Operation Workbench domain that edits, records, routes, applies, retires,
or blocks work must define its engineering model before implementation deepens.

The minimum model is:

- domain state machine
- session state model
- persistence and durability model
- command and receipt model
- reconciliation and freshness model
- error and recovery model
- adapter and authority boundary
- validation and guard model

Small read-only placeholder domains may defer the full model, but the first
real register, selected-record launcher, workflow hub, or mutation draft must
either add it or record the exception.

### Domain State Machine Rule

Domain states must be explicit and finite. A domain may project source or
future-backend states into compact UI states, but the mapping must live in a
read model or selector, not in component-local conditional rendering.

Each mutable domain defines an exhaustive transition model:

`current state + command + preconditions -> accepted transition or rejection`

The model owns allowed states, commands, guards, rejection reasons, outcomes,
and terminal behavior. Presentation code renders the projected result and emits
bounded intent; it must not invent lifecycle transitions in event handlers.

Editing a draft changes no workflow status. Submitting a command may advance
only command-run state. A prototype-local simulator result may advance the
explicit local scenario projection. Live canonical truth advances only after a
durable receipt or refreshed source projection.

For every domain state, identify:

- source owner: read-model scenario, prototype fixture, local draft, local
  receipt, future backend projection, or durable receipt
- whether the state is editable, review-only, terminal, blocked, failed,
  stale, retired, or not applicable
- valid next transitions
- operator-visible current required move
- command or receipt that proves the transition
- recovery path when the transition is blocked or fails

Do not invent UI-only states that cannot be reconciled to read-model scenario
truth, local draft, local receipt, future backend projection, or durable
receipt evidence. Do not collapse materially different states into one label
only because their visual treatment looks similar.

Completed or terminal workflow states stay reviewable unless review would
violate the domain contract. They lock editable controls and terminal actions;
they do not hide the record or disable safe inspection.

During prototype work, workflow state must be fully exercisable from local
fixtures, curated read-model scenarios, local drafts, and prototype-local
receipts. Primary workflow labels must not imply that a live backend capability
is required to test the full state machine. Use labels such as `Read Model`,
`Scenario`, `Source Projected`, or `Review Only` in primary workflow UI.
Reserve backend, OOS, WGCF, or adapter names for details, authority-boundary
copy, mutation-boundary facts, and future-wiring notes.

### Session State Rule

Workflow session state belongs to a controller or parent-owned session model,
not to scattered step views.

Session state should include:

- selected record id and selected record projection
- active workflow step
- pending workflow step when a close guard interrupts navigation
- draft map keyed by record id and step id when multiple drafts can exist
- dirty state derived from draft-versus-baseline comparison
- read-only state derived from read-model scenario, source projection, or
  recorded receipt
- close guard state
- local persistence status
- last command/receipt status when the prototype records one

Step views receive prepared props and emit bounded intents. They must not own
global workflow routing, determine whether another step is available, or decide
whether a source/read-model projection is stale.

### Persistence And Durability Rule

Persistence must be categorized before implementation.

The console frontend is non-authoritative by default. It may adapt to a live
backend, collect operator intent, keep local continuity state, and render
receipts, but it must not become the durable business database for an operation
surface.

Accepted categories:

- Ephemeral UI state: selected row, open dialog, transient hover/focus, and
  temporary filter input when it does not need restoration.
- Local preference state: low-risk operator display preferences that may be
  restored locally without implying workflow truth.
- Local draft state: autosaved operator draft content for continuity only.
- Prototype-local receipt: local evidence that a prototype action was recorded
  during exploration; it is not durable backend evidence.
- Read-model scenario: curated local fixture truth used to exercise workflow
  states without live backend dependency.
- Backend projection: canonical or future canonical read truth from the owning
  backend or adapter. In prototype UI, this should be surfaced as a
  read-model/source-projected scenario unless the surface is explicitly showing
  authority-boundary details.
- Durable receipt: future OOS/WGCF/backend evidence that proves a command was
  accepted or completed.

Rules:

- Local drafts may restore operator work, but they must not update canonical
  read-model truth until an accepted command or receipt path exists.
- Prototype-local receipts must be labeled as prototype-local and must not be
  presented as backend mutation evidence.
- Canonical source projection wins over stale local assumptions. If projection
  and draft disagree, the UI must show stale/conflict posture before applying.
- UI selection and filters must not be stored in the same shape as workflow
  drafts or receipts.
- A completed read-model-projected, source-projected, or receipt-backed step
  becomes read-only for editing but remains inspectable.

The approved local baseline may use React state or local browser storage only
when the data mode allows it. Any move to durable backend persistence requires
a separately governed live-integration decision.

### Local Baseline Authority And Artifact Model

This model is the locked architecture for the approved local baseline. It does
not authorize live wiring, new OOS endpoints, durable backend persistence, a
Console-owned database, or cross-repo runtime work. Local implementation is
limited to structured fixtures, deterministic simulation, truthful local
receipts, domain projection logic, and semantic validation.

The shared artifact families are:

- Source snapshot: an immutable observation from the primary authority with
  record id, source owner, source version, observed timestamp, freshness, data
  mode, and domain payload.
- Dependency snapshot: a versioned observation from another authority needed
  to evaluate the record, such as repository, catalog, readiness, or movement
  state.
- Projection bundle: one primary source snapshot plus the dependency snapshots
  required by the domain projector.
- Draft: editable operator input derived from a projection bundle or saved draft
  baseline. A draft is not workflow truth.
- Command: structured operator intent with expected source and dependency
  versions, stable idempotency identity, capability requirement, and expected
  outcome type.
- Command run: ordered command progress with `accepted`, `queued`, `running`,
  `blocked`, `failed`, `completed`, `canceled`, `stale`, or `unknown` state.
- Receipt: immutable local or durable evidence of a recorded command outcome. Its
  authority and durability must be explicit.
- Domain projector: domain-owned logic that derives the operator-facing view
  from the projection bundle, drafts, runs, and receipts.

Do not implement a generic mutable `local overlay` record. Drafts, commands,
runs, and receipts remain separate artifacts. The effective operator view is
derived and must not be persisted as canonical business truth.

Shared runtime code may own envelopes, freshness semantics, command/run/receipt
contracts, adapter interfaces, and invariant-test helpers. Each domain owns its
payloads, lifecycle, state machine, draft schema, command eligibility, receipt
schema, summary classification, and view projection.

### Effective Operator Projection Rule

Every operation domain must expose one domain-owned effective projection for
each record. The projector receives the current projection bundle plus any
valid draft, command run, and receipt artifacts and returns the complete
operator-facing state for that record.

Summary cards, register rows, filters, selected-record panels, dashboards,
hubs, workflow steps, status details, and history entry points must consume
that effective projection or a typed subprojection derived from it. They must
not merge source and local state independently or recompute lifecycle, tone,
eligibility, or current required move in component-local code.

The source snapshot remains separately inspectable. A local artifact may
affect the effective projection only when its schema, record identity, source
version, and required dependency versions reconcile with the current
projection bundle. Stale or incompatible artifacts produce an explicit
conflict posture; they are not silently applied or discarded.

The effective projection is derived state. It must not be persisted as
canonical business truth.

### Multi-Source Projection And Preconditions Rule

A domain record may depend on more than one authority. Its projection bundle
must identify one primary source and every dependency used to derive action
eligibility or displayed posture.

A command records the expected versions of the primary source and all relevant
dependencies. If any required version changes before apply, the command is
stale. The UI preserves the draft, identifies the conflict, and requires
refresh, discard, or deliberate rebase instead of silently applying against a
newer projection.

Timestamps do not replace versions. Live ordering belongs to an
authority-issued sequence or cursor. Prototype-local scenarios use deterministic
timestamps and ordering so repeated tests produce the same result.

### Capability And Action Semantics Rule

Every runtime adapter exposes capabilities rather than forcing the UI to infer
them from fixture status. Capabilities declare runtime mode and whether refresh,
submit, subscribe, cancel, retry, raw-log inspection, or other bounded actions
are available.

Every interactive action has one semantic class:

- navigation: opens or routes to another surface without changing domain state
- prototype-local simulation: exercises the accepted workflow locally and
  produces explicitly non-durable run events and receipts
- durable command: submits to an admitted authority and waits for run, receipt,
  and reconciliation truth

An action cannot report success because the UI reached a result page. Failed,
blocked, stale, or unknown runs do not become `Done`. Read or check actions do
not mutate readiness or evidence. Disabled actions expose a domain-owned reason.

Action labels and visual tones derive from command semantics, not from the
selected record's status tone. Navigation such as `Inspect`, `Open`, `View`, or
`Back` remains neutral or secondary even when the record is blocked or failed.
Danger treatment is reserved for a destructive command or an explicit negative
decision such as reject, delete, or retire. Repair, retry, refresh, and route
actions use the treatment of their command role; they do not inherit danger
from the record.

Prototype-local evaluators and planners may report that input was validated,
a plan was prepared, or a simulated outcome was recorded. They must not claim
that setup, admission, launch, start, stop, deployment, or another external
effect occurred unless an adapter actually executed that effect and emitted an
ordered run result. A simulated outcome must remain explicitly labeled local.

### Cross-Domain Packet And Custody Rule

Cross-domain handoffs use an immutable, schema-versioned packet envelope with:

- packet id and schema version
- source domain, record id, source version, and source owner
- created timestamp, correlation id, and causation id
- authority category and custody owner
- domain-specific payload
- producer receipt reference when one exists

The shared envelope does not create a universal business payload. Proposal,
Delivery, Repository, Prototype, and Portfolio retain domain-specific packet
schemas.

The producer prepares and dispatches a packet; it does not mutate the consumer's
record. The consumer admits or rejects the packet idempotently and records its
own receipt. Prepared, dispatched, admitted, rejected, and returned custody
states remain distinct from either domain's business lifecycle.

### Post-Baseline Live Runtime Authority Rule

This rule describes the post-baseline target only. It applies to current
operation surfaces and to future operation surfaces when they are adapters over
another owning backend or control plane. It does not pre-decide unknown future
surfaces that may need a dedicated backend. If a future surface needs durable
state that no existing authority owns, that need must create or assign a backend
authority first; it must not be solved by adding a console-owned business
database.

Recommendation posture: extend the existing backend, OOS, WGCF, domain, and
platform authority model. Do not create a new console persistence plane for
business truth.

Authority split:

- Console: selected row, open modal, active step, filters, local draft
  continuity, dirty guard state, cached read projections, and UI preferences.
- OOS: durable workflow requests, workflow run state, run projections, adapter
  receipts, and future Temporal-backed execution when admitted.
- Domain backend or source system: canonical records, domain status, record
  versions, owner fields, and domain-specific projections.
- WGCF: governance, readiness, validation, and control-fabric receipts.
- Platform storage/runtime: durable database and runtime storage for backend
  services, not for the console frontend.
- Teras: visual primitives only, with no command, receipt, or persistence
  authority.

Runtime artifact classes:

- Projection state: backend-owned read model with record id, status, current
  step, owner, blockers, receipt refs, projection version, freshness, and
  source owner.
- UI state: local-only selection, layout, filter, tab, dialog, and focus state.
- Draft state: operator input not yet applied. It may be local while editing.
  If it must survive reloads, devices, or operator handoff, the owning backend
  must expose a draft API.
- Command state: structured operator intent submitted to the owning backend or
  OOS with command type, payload, source projection version, idempotency key,
  operator/session identity, and expected receipt type.
- Run state: backend or OOS execution state such as queued, running, blocked,
  failed, completed, canceled, or stale.
- Receipt state: immutable backend, OOS, WGCF, or domain evidence. Local
  receipts are allowed only in prototype/local mode and must be labeled
  non-durable.
- Preference/cache state: non-authoritative state that can be deleted and
  rebuilt without losing business truth.

Operation surfaces must access persistence through a runtime boundary instead
of calling `localStorage`, mutating local receipt arrays, or embedding backend
details directly in views.

Runtime ports:

- `getCapabilities`
- `readProjection`
- `refreshProjection`
- `subscribeProjection`, when the owning backend exposes a stream
- `loadDraft`
- `saveDraft`
- `discardDraft`
- `submitCommand`
- `getCommandRun`
- `listCommandEvents`
- `cancelCommand`, only when the adapter declares cancellation support
- `listReceipts`
- `getReceipt`

Each operation may provide:

- `localRuntimeAdapter`: prototype/local behavior, local drafts, fixture
  projections, and clearly labeled prototype-local receipts.
- `liveRuntimeAdapter`: admitted backend, OOS, domain, or platform calls.

The UI must depend on the runtime port shape, not on the storage mechanism. A
surface may keep local React state around the adapter, but domain truth,
receipt truth, and run truth must come from the adapter response or projection.

Prototype-local command flow:

1. Load a deterministic projection bundle from structured scenario truth.
2. Create or restore a draft without mutating the source snapshot.
3. Validate the draft and adapter capabilities.
4. Submit a prototype-local command with stable idempotency identity and
   expected source/dependency versions.
5. Let the local simulator emit ordered run events and an explicitly local
   receipt or rejection.
6. Derive the effective view through the domain projector.

Post-baseline live command flow:

1. Load backend projection and projection version.
2. Create an editable draft from the projection.
3. Derive dirty state by comparing draft to projection or saved draft baseline.
4. Validate the draft locally for immediate operator feedback.
5. Submit a command with idempotency key and source projection version.
6. Show backend or OOS run state as pending, running, blocked, failed,
   completed, canceled, or stale.
7. Refresh or receive the updated projection.
8. Render durable receipts from the owning backend, OOS, WGCF, or domain owner.

Failure behavior:

- Stale projection: block apply, show resync or conflict posture, and require
  operator review.
- Backend rejection: preserve draft when safe, show the rejection reason, and
  expose retry or remediation.
- Timeout or unknown outcome: keep the command run visible until the backend
  confirms receipt or failure.
- Duplicate submit: idempotency must return the same run or receipt instead of
  creating a second business action.
- Offline/unavailable backend: allow read-only review or local draft continuity
  only; do not create fake live receipts.

No operation surface may add a console-owned domain database for packages,
proposals, repositories, lifecycle-transition records, workflow history, or receipts. A
small non-authoritative preference or cache store is allowed only when deleting
it cannot lose business truth.

### Draft, Dirty, And Guard Rule

Dirty state is a derived fact, not a hand-maintained boolean.

A draft is dirty when the editable draft content differs from the last loaded
baseline, saved draft baseline, or recorded receipt state for the selected
record and workflow step.

Guard behavior:

- No guard for closing untouched read-only or completed steps.
- No guard for navigation that does not risk losing unapplied operator input.
- Guard required when leaving a step with unapplied dirty draft content that
  would otherwise become hard to notice or recover.
- Guard copy must say whether the draft is autosaved locally, discarded, or
  preserved for later.
- Guard implementation should reuse shared Teras or existing workflow guard
  primitives before creating a domain-local dialog.

Autosave does not remove the need for a guard when the operator could believe a
draft was already applied. Autosave only protects continuity; it does not prove
the workflow transition happened.

### Command And Receipt Rule

Every real mutation or workflow transition must be modeled as a command even
when the current prototype records it locally.

A command model defines:

- command name
- owning backend or prototype-local owner
- input draft shape
- validation rules
- expected source version or record version
- idempotency key or prototype-local equivalent
- authority boundary: read-only, prototype-local, backend mutable, or future
  governed
- success receipt shape
- failure shape
- retry eligibility
- operator-visible disabled or blocked reason

The command path is:

1. derive draft and selected record projection
2. validate locally
3. show current required move and action readiness
4. submit command or record prototype-local receipt
5. store receipt/status in the session model
6. reconcile the read model or show that reconciliation is future-authority-owned
7. lock completed content for review

Commands must not be hidden as arbitrary `onClick` handlers with embedded
business rules. JSX may wire the button, but command eligibility, disabled
reason, receipt copy, and failure path belong in a command/action/receipt
model.

### Receipt And Audit Rule

Receipts are evidence, not decoration.

Receipt models should include:

- receipt id
- receipt schema version
- command name
- record id
- source and dependency versions used to evaluate command preconditions
- operator-visible action label
- timestamp
- command result state, distinct from the domain decision or lifecycle outcome
- backend route or prototype-local route
- summary of what was recorded
- either a typed snapshot of the material command input and outcome payload or
  an immutable, versioned artifact reference from which they can be
  reconstructed
- follow-up state when the command blocks, defers, accepts risk, retires, or
  fails

A summary string is not a decision record. For example, `recorded` describes a
successful command result while `accepted`, `parked`, `rejected`, or `retired`
describes the domain decision. Receipt models must preserve both when both are
material.

History panels and receipt archives show stable receipt summaries and route to
inspection. They must not mutate identity based on whichever local event was
last generated. If a domain has no real receipt yet, show a clearly labeled
empty or prototype-local state instead of fake audit history.

Receipt, history, run events, and raw logs are different artifacts:

- a receipt is immutable action evidence
- a history entry is an operator-readable projection of receipts and source
  transitions
- run events are ordered progress for one command run
- raw logs are optional diagnostic evidence and are not business truth

History timelines contain only transitions or receipts that actually occurred
and carry a real event timestamp. Current, pending, next, locked, planned, and
not-yet-applied facts belong in progress, readiness, or current-state surfaces;
they are not history events. Receipt references, projection versions, status
phrases, and labels such as `terminal record` must not be rendered as event
timestamps. Historical status and tone are captured from the event itself, not
recomputed from the record's current status.

Prototype-local simulations generate structured, ordered simulation events
instead of static prose that merely resembles a log. A surface may use
`Realtime Log` or `Raw Log` only when it is rendering a real ordered runtime
stream or an attached diagnostic artifact. Otherwise it must use an accurate
label such as `Simulation Events` or `Run Events`.

### Schema, Identity, Ordering, And Local Retention Rule

Source snapshots, dependency snapshots, commands, cross-domain packets, run
events, and receipts carry schema versions. Unsupported versions fail clearly;
adapters must not silently reinterpret changed payloads.

Prototype-local mode uses deterministic actor/session identities and clocks for
repeatable tests. Post-baseline live commands require authority-issued time,
operator/session identity, server-side authorization, and ordered sequence or
cursor evidence. The UI may explain authorization posture but is never the sole
enforcement point.

Local drafts, preferences, run events, and prototype-local receipts declare
their storage scope, reset behavior, retention, migration behavior, and allowed
data mode. Clearing local state must never delete or rewrite canonical truth.

### Reconciliation And Freshness Rule

Domains that read source projections or future-backend projections must handle
freshness explicitly.

The read model should expose one or more of:

- projection state
- record version
- cursor
- fetched timestamp
- last refreshed timestamp
- source adapter or owner
- stale reason
- refresh capability

Reconciliation behavior:

- Same version: allow validated command flow.
- Newer backend version while draft is open: show stale or conflict posture
  and require operator review before applying.
- Source/read model already completed the step: lock local draft for review and
  show read-model/source-projected completion.
- Backend failed or rejected a command: preserve draft when safe, show failure
  reason, and expose retry or remediation.
- Backend unavailable: show offline/unavailable posture and prevent pretending
  local state is canonical.

Realtime subscription is not assumed. Unless the owning backend exposes a
documented subscription/event stream, use explicit refresh, polling, or
cursor-based projection language. Do not encode a specific harness, agent, or
API source name into the domain unless that adapter is part of the domain
contract.

### Error And Recovery Rule

Every mutable workflow should define recovery before the first action is
called complete.

Common recovery outcomes:

- retry command
- edit draft and retry
- refresh projection
- resolve missing source context
- resolve repository or catalog gate
- remove blocker
- record workaround
- accept risk with justification
- defer with owner and review date
- retire or reject when the domain allows it

`Blocked` is not enough by itself. The operator must see what is blocking the
step, which recovery choices are allowed, which choice is current, and what
evidence or follow-up is required.

### Adapter And Authority Boundary Rule

Operation Workbench domains should be source-agnostic unless the domain itself
is the adapter.

The UI reads domain projections and sends bounded commands. It should not
encode whether ingress came from a specific AI harness, API trigger, CLI, or
agent unless that identity is real record data from the backend projection.

Authority categories:

- read-only projection
- prototype-local draft
- prototype-local receipt
- future OOS-mediated mutation
- future WGCF/readiness-mediated validation
- backend-owned mutable command
- security-gated or platform-gated command

The authority category must be visible in the domain contract, read model, or
command model. Do not make a button look like a live backend mutation when it
only records prototype-local state.

### Security And Data Mode Rule

The prototype default remains mock or synthetic data unless the prototype
record explicitly allows another data mode with security evidence.

Operation Workbench surfaces must not store secrets, credentials, private logs,
client data, or production exports in local draft, local storage, fixtures, or
receipts. Real mutable behavior requires security review and graduation or a
governed delivery plan.

AI/advisor output is draft-only unless a governed provider profile, CGG
admission path, and operator approval route exist. Advisor output must never
silently mutate backend projection, command payloads, receipts, or canonical
state.

### Fixture And Scenario Integrity Rule

Mock, synthetic, and read-model scenario data are part of the architecture
contract. They are not harmless filler.

Before a legacy surface is copied, replaced, or used as comparison evidence,
its fixtures and scenario records must be audited against the accepted domain
contract.

Rules:

- New or reworked domains must not carry legacy mock data that encodes retired
  states, retired route targets, obsolete action names, old mount assumptions,
  bad source ownership, fake backend authority, or old workflow shape.
- Scenario records must be structured from accepted domain truth: source of
  truth, lifecycle/status, data mode, mutation boundary, current required move,
  command eligibility, receipt posture, and recovery path.
- Scenario data must cover the accepted state matrix without inventing states
  that cannot reconcile to read-model, local draft, prototype-local receipt,
  future backend projection, or durable receipt truth.
- If legacy data contains useful business examples, remodel the example into
  the new domain read model instead of adapter-mapping the old structure
  forward.
- Bad or confusing fixture data blocks visual inspection and accepted
  replacement, because it can make an incorrect UI appear coherent.

### Evolution And Graduation Rule

Prototype-local behavior should be shaped so it can graduate without rewriting
the operator workflow.

When a domain graduates from local prototype behavior to live wiring:

- local draft shape maps to backend command input
- prototype-local receipt maps to durable receipt expectation or is retired
  explicitly
- read model projection replaces fixture truth
- local command model gains backend route, version, idempotency, and error
  handling
- tests move from structural/visual guards toward command, reconciliation, and
  receipt validation
- any unsupported prototype behavior is removed, blocked, or recorded as
  post-baseline backlog
- adapter rollout occurs one domain at a time without changing the accepted UI
  contract
- rollback returns the domain to prototype-local or read-only mode without
  rewriting canonical records

Do not implement a prototype shortcut that teaches the operator a workflow that
cannot be represented by the future backend command or receipt model.

## Code Structure Rule

Operation Workbench code must be structured by ownership, not by the screen
that happened to render it first.

### Operation Domain Structure Standard

Delivery is an audited customer of this standard, not the parent architecture.
New operation work must start from the product-neutral domain structure below
and then choose the surface profile that fits the domain.

Every operation domain must declare one primary surface profile before a real
implementation pass:

- `placeholder-shell`: contract and empty shell only; no register, workflow, or
  mutation behavior is implemented yet.
- `compact-control`: one focused modal with a register or queue, selected
  context, compact summary, and shallow action path.
- `fullscreen-workspace`: app-sized modal with workspace shell, nav, summary
  header, multiple peer surfaces, and domain-local workflows.
- `stable-dashboard`: persistent status or control cockpit with tabs, profile
  sections, logs, and focused detail dialogs. It is not a workflow step.
- `workflow-session`: bounded transition session with draft state, guard,
  validation, command, receipt, and history/archive handling.
- `product-app-host`: domain integration host for an incubating product app.
  The domain owns adapters and workflow placement; the product app owns neutral
  app internals.

The profile controls structure, not visual imitation. A compact domain does
not copy Delivery fullscreen geometry. A fullscreen domain does not copy
Proposal's compact modal. A dashboard does not become a workflow because a
workflow happens to depend on its evidence.

The active profile must be visible in the domain contract, implementation
audit, or a focused surface contract. If a domain changes profile, stop and
record the decision before implementation continues.

Accepted profile registry:

- Delivery: `fullscreen-workspace`, completed current-shape reference surface.
- Proposal: `compact-control`, completed current-shape reference surface.
- Repository: `compact-control`, completed current-shape reference surface.
- Prototype: `compact-control` plus Prototype Dashboard, Preview Runtime, and
  workflow sessions; completed current-shape reference surface.
- Product Portfolio: completed `fullscreen-workspace`; Products is the landing
  surface, Product Dashboard is stable detail, and Publication and Curation are
  separate peer controls over active Workspace products.
- Model Operations: `compact-control` plus a stable Model Profile Dashboard;
  completed current-shape reference surface. Profile requests remain
  unavailable until their backend and orchestration contracts are implemented.
- Orchestration: `fullscreen-workspace` architecture with Home, Definitions,
  and Runs as peer surfaces; completed current-shape reference surface. The
  visual and source architecture is locked in
  `domain-contracts/orchestration.md`.

Authority decisions and Workspace Intake classification are cross-cutting
request and receipt interactions, not Operation Workbench domain profiles.
Their ownership and UI rules live in `authority-decision-contract.md` and the
registered Workspace entrant workflow definitions.

## Whole-Workbench Host Contract

The Operation Workbench host uses one typed registry for its seven real
domains. Selector labels, domain ids, and route resolution must come from that
registry rather than independent string literals.

Host composition follows these rules:

- every registered label resolves to exactly one domain id
- routing is exhaustive; an unknown or unhandled domain fails explicitly
  instead of opening an undeveloped placeholder
- `app/page.tsx` imports each domain only through its root public barrel
- each root public barrel exposes the workspace wrapper, its contract factory,
  and workspace props only; controllers, read models, selectors, workflows,
  and fixtures remain private
- the host mounts one `OperationWorkbench` wrapper and one public workspace
  wrapper for the selected domain
- each workspace wrapper owns its modal or fullscreen shell and close behavior
- the shared host contract metadata is attached both to the in-page host
  marker and to the portal-rendered modal surface
- cross-domain callbacks are explicit host wiring; they do not grant one domain
  private access to another domain
- removing a domain requires removing its registry entry, selector entry,
  exhaustive route, public mount, and host proof together

Whole-Workbench proof requires the registry test, focused host guard, complete
architecture guard suite, semantic tests, typecheck, build, and owner-repository
validation. It proves host integration only; it does not baseline-approve
Console Shell, Lifecycle Transitions, Runtime Readiness, or Agent Console.

All real domains, regardless of profile, use the same ownership families:

- entry shell and public contract
- read model and scenario truth
- selectors and projections
- view model and display copy
- command and receipt model when mutation or local recording exists
- state and controller hooks
- surface composition
- workflow/session folders when bounded transitions exist
- domain-local CSS only when an accepted composition or scroll-ownership need
  cannot be expressed through existing Teras layout primitives
- focused guard coverage

The general structure rule is stronger than any single domain example. When
Delivery, Proposal, Repository, Prototype, or a future domain conflicts with
this rule, fix or record the domain exception instead of treating that domain as
the new implicit standard.

Default domain scaffold:

```text
<domain>/
  <domain>-workspace-contract.ts
  <domain>-workspace.tsx
  <domain>-read-model.ts
  <domain>-selectors.ts
  <domain>-view-model.ts
  <domain>-commands.ts
  <domain>-receipts.ts
  <domain>-workspace-surface.tsx
  use-<domain>-state.ts
  use-<domain>-controller.ts
  <domain>.module.css
  index.ts
```

Tiny or unfinished placeholder domains may keep only the public contract,
workspace wrapper, and barrel until their design pass starts. Once a domain
gets a real register, selected-record surface, modal, or workflow, the missing
ownership layers must be added or the exception must be recorded.

Default multi-step workflow scaffold:

```text
<workflow>/
  <workflow>-session-modal.tsx
  use-<workflow>-session-state.ts
  use-<workflow>-session-controller.ts
  <workflow>-step-router.tsx
  <workflow>-session-footer.tsx
  <workflow>-session-dialogs.tsx
  view-model/
    <workflow>-step-model.ts
    <workflow>-transition-model.ts
    <workflow>-current-move.ts
    <workflow>-hub-model.ts
    <workflow>-footer-model.ts
    <workflow>-guard-model.ts
    <workflow>-command-model.ts
    <workflow>-receipt-model.ts
  hub/
    <workflow>-hub-view.tsx
  steps/
    <step>-view.tsx
```

The exact folder names may follow local domain language, but the ownership
must remain visible:

- read models define UI-consumed data shape
- selectors/projections derive posture, eligibility, selected record, gates,
  facts, current move, and progress state
- command models define command input, validation, authority, idempotency,
  disabled reason, failure, and receipt behavior
- controllers own selected ids, active step, draft state, guards,
  local persistence, and side-effect routing
- views render prepared props and emit bounded intents
- footers own modal-level session actions
- dialogs own contained guard/detail/export dialogs
- CSS modules own local composition and density only
- fixtures and mock receipts stay outside React views

Forbidden structure:

- one surface file owns routing, state, projection, modal logic, table rows,
  action copy, guards, and panel rendering
- step views compute global progress or call arbitrary `setActiveStep`
- shared Teras primitives import domain read models
- Operation Workbench host imports private workflow internals
- page-era or legacy inline modules become equal product concepts after the
  replacement surface exists
- source extraction only hides file size while leaving ownership unclear

Substantial domains should have focused architecture guards. Guards should
check required files, public exports, banned legacy terms, shared primitive
usage, no component-local posture/action eligibility, no private import leaks,
and stable `data-*` selectors for smoke paths.

### Operation Domain Implementation Standard

All Operation Workbench domains use the same implementation style, even when
their visual shape differs.

Required code ownership:

- `index.ts` exports only the public workspace wrapper, public contract helper,
  approved public read-model types, and approved selectors. It must not export
  workflow internals, modal internals, CSS modules, local fixtures, or legacy
  comparison modules.
- `<domain>-workspace.tsx` owns the accepted new Workbench entry shell:
  `TerasModalShell` or fullscreen workspace shell, close behavior, shell title,
  and shell description. It must not render frozen legacy inline code during
  temporary comparison.
- `<domain>-workspace-surface.tsx` owns only the accepted surface body. It
  composes panels, register, selected context, and modal routers from prepared
  props/state. It must not own canonical state, backend authority, command
  eligibility, receipt wording, or top-level entry/mount behavior.
- Runtime and bridge projection modules expose `subscribe...` and
  `get...Snapshot`/`get...Records` functions only. React subscription hooks,
  including `useSyncExternalStore`, belong in presentation state, surface, or
  controller files that consume those snapshots.
- `<domain>-read-model.ts` owns structured scenario/read truth. It must not be
  assembled from component-local literals.
- `<domain>-selectors.ts` owns filtering, selected-record fallback, derived
  status, derived tone, current required move, and action eligibility
  projections.
- `<domain>-view-model.ts` owns display-ready labels, facts, summary metrics,
  selected-panel metadata, row descriptions, and product-neutral primitive
  props.
- Domain metadata for `TerasMetadataList`, media snapshot facts, selected
  identity chips, reference facts, and receipt facts must be projected by a
  typed view-model/helper function. JSX may pass the prepared `items` value to
  the primitive, but it must not hand-author `items={[...]}` arrays or map raw
  records into metadata rows inline.
- `<domain>-commands.ts` owns command identifiers, labels, disabled reasons,
  authority boundary, failure posture, and receipt expectations.
- `<domain>-receipts.ts` owns prototype-local receipt shape and receipt
  creation. JSX must not create receipt objects inline.
- `use-<domain>-state.ts` owns ephemeral UI/session state such as selected id,
  filters, active modal, active step, draft maps, and guard state.
- `use-<domain>-controller.ts` owns bounded intents and side-effect routing
  such as select record, open modal, apply command, record local receipt, and
  request close.
- `<domain>.module.css` owns local layout only: grid, zone sizing, min/max,
  scroll ownership, and compact spacing around primitives.

Required coding style:

- Views receive typed domain records or prepared view-model props and emit
  bounded callbacks. They must not compute global progress, command
  eligibility, source freshness, backend posture, or receipt authority.
- Domain files import Teras primitives from `@/teras`; they must not copy
  primitive chrome into local components.
- Shared Teras files must never import domain read models, selectors, or
  fixtures.
- `app/page.tsx` imports only public domain barrels and public workspace
  wrappers. It must not import private domain surface, modal, controller,
  selector, fixture, or workflow files.
- Domain siblings must not deep-import another domain's private modules. Any
  cross-domain handoff uses a public projection, shared source, or explicitly
  recorded bridge module.
- Product-neutral cross-operation projection types and pure display helpers
  live under `src/domain-workspaces/operation-projections/`. They must not
  import concrete operation domains.
- Concrete cross-domain custody, ingress, acknowledgement, and catalog-link
  adapters live under `src/domain-workspaces/operation-integrations/`, not
  loose at the `domain-workspaces` root and not hidden inside one consuming
  domain. An integration adapter may import the public models of the domains
  it connects; consumers import the adapter through this explicit boundary.
- Dependency direction is enforced as code: `domain/` cannot depend on
  `read-model/`, `work-model/`, `local-runtime/`, `product-adapters/`, or
  `presentation/`; `read-model/` and `local-runtime/` cannot depend on
  `presentation/`; `work-model/` cannot depend on `local-runtime/` or
  `presentation/`; and `product-adapters/` cannot depend on `local-runtime/`
  or `presentation/`.
- Local helper components are allowed only when they are domain-specific and
  sit below a Teras primitive. If a helper recreates a Teras panel, row, pill,
  tray, button, filter, table, progress, selected panel, metadata list, or
  modal, it is drift unless a new Teras variant was discussed and recorded.
- Local components must be named for the domain capability they own, not for
  visual position. Avoid vague names such as `panel`, `card`, `section`,
  `content`, `stage`, `data`, or `workflow` unless the term is the exact
  domain concept.
- New domain work may not add behavior to a known fat file. The first slice is
  extraction by ownership unless the change is an emergency containment fix.

Additional code-structure requirements:

- Public/private export boundary: each domain barrel exports only the public
  workspace, public contract, and approved public types or helpers. Shells and
  sibling domains must not import workflow steps, private view models, local
  CSS, fixtures, or modal internals through deep paths.
- Transition model: multi-step workflows must derive step order, availability,
  progress state, current/next labels, and archive/history visibility from a
  focused model file. Step views must receive prepared projections and bounded
  navigation intents; they must not compute global progress or directly own
  `setActiveStep`-style routing state.
- Action and receipt model: workflow action labels, disabled/read-only state,
  receipt copy, and backend/prototype mutation boundary language belong in an
  action, footer, or receipt model instead of being scattered through JSX.
- Controller decomposition: session controllers own selected record id,
  active step, pending step, draft maps, dirty state, close guards, local
  persistence, and side-effect routing. Views render props and emit bounded
  intents such as open details, change draft, select step, apply receipt, or
  request close.
- Concern-based view models: selected context, current required move, status
  facts, register rows, summary cards, hub facts, history/archive summaries,
  and workflow footer state should be derived in separate focused helpers when
  they grow beyond simple inline literals.
- Scenario matrix: each domain with workflow behavior keeps curated synthetic
  scenarios that cover ready, current, blocked, done, stale, failed, and
  read-only states. The scenarios must be owned outside React views and must
  be corrected to the accepted domain contract before the new surface is
  inspected or activated.
- Guard tiers: every domain gets structural, public-boundary, and stale-legacy
  guards before visual/state smoke coverage is treated as enough. Structural
  guards prove profile, required ownership files, recorded exceptions, and
  fat-file registration. Public-boundary guards prove domain barrels expose
  only stable entry points or approved public model helpers, external shells
  import through public barrels, product apps do not import domain internals,
  and cross-domain coupling goes through explicit bridge projections.
  Workflow-scaffold guards prove active workflow folders expose the expected
  hub, steps, session controller, view-model, modal, footer, dialog, command,
  and receipt ownership boundaries, or that any missing boundary is explicitly
  recorded as a normalization exception. Baseline-ready domains add
  visual/state smoke coverage for registers, hubs, workflow sessions, guarded
  close, read-only review, and archive/detail access.
- Fat-file threshold: if one file owns unrelated concerns or grows large
  because it holds state, projection, routing, action copy, dialogs, footer,
  table rendering, and workflow body rendering together, the next work slice
  must extract by ownership before adding new behavior. Do not add another
  feature to a known fat surface unless the change is a containment fix.

### Normalization And Extraction Standard

Normalization is not measured by file count. It is measured by whether a new
engineer can identify the owner of state, projection, command, receipt,
workflow step, product-app host, and rendered view without reading unrelated
files.

Comparable Operation Workbench areas must use the same extraction grammar:

- Shell and workspace files own entry, close behavior, title, sizing, and
  modal/workspace chrome only.
- Surface files compose panels, registers, selected context, and modal routers.
  They do not own command authority, source-of-truth posture, or receipt
  creation.
- Panel files render one named panel family from prepared props. A multi-panel
  surface splits panel renderers and panel-specific projections instead of
  keeping all panel logic in one surface file.
- View-model files project one coherent family of display props. If one
  view-model owns unrelated families such as status, queue, activity,
  selected-context facts, and assistant responses, split by family and keep a
  thin composition file.
- Selector/projection files derive state from structured read models. They do
  not render React, do not export React hooks, and do not mutate local session
  state.
- Command/action/receipt files own command names, disabled reasons, result
  posture, receipt fields, and mutation-boundary wording. JSX must not invent
  command authority inline.
- Controller hooks own bounded intents and side effects. A controller may
  compose focused hooks, but should not become the only place where workflow
  meaning can be understood.
- Composition roots may be longer when the length is explicit prop wiring
  between already-focused hooks, panels, and view models. Do not split them
  solely by line count; split only when they hide a second state machine,
  projection family, command authority, or rendered subview.
- Step views render one routeable workflow step. A step folder may contain
  local subcomponents when they are unique to that step, but global progress,
  step availability, footer state, and close guards remain in workflow model,
  controller, footer, or session owners.
- Durable workflow outputs such as finalized briefs, receipts, exported
  snapshots, or handoff evidence live in a named artifact/output boundary, not
  inside a step folder only because the first button appears there.
- Workflow support folders hold reusable workflow-local support that is not a
  routeable step, artifact, session owner, or product-app host. They must not
  become dumping grounds for dialogs or models that have a clearer owner.
- Product-app host folders own the integration edge for reusable product apps.
  They may import the product-app public API and product-app CSS when rendering
  app-owned slots. General workflow, work-model, and read-model files must not
  casually import product-app interaction state.

Surface complexity tiers:

- Tiny launcher: one route or button wrapper may stay as one file if it only
  selects a workflow or opens a modal.
- Simple surface: keep `surface`, `view-model`, and optional table/panel/modal
  files.
- Multi-panel surface: split panel components and panel-specific projections.
  The surface remains a composition shell.
- Config/control surface: split selection state, draft/mutation model,
  selectors, current-values/table rendering, inspector/selected panel, and
  mutation dialogs.
- Workflow surface: use the workflow grammar of `hub`, `session`,
  `session-controller`, `shell`, `steps`, `view-model`, and `support`, adding
  `artifacts` or `embedded-products` only when those real boundaries exist.
- Product-hosted workflow step: keep the workflow step entry in `steps/`, and
  place product-app host state/view/adapters in `embedded-products/<product>`.

Extraction triggers:

- Split a file before adding behavior when it owns more than one state machine,
  more than one modal family, more than one panel family, or both projection
  and mutation authority.
- Split when private helpers form a second concern large enough that the file
  title no longer describes most of the code.
- Do not split merely because a file is long when the length is structured
  data, a fixture, a deterministic adapter table, or a single coherent renderer.
- Do not split a composition root merely because it wires many props. First
  prove that the composed owners are already focused; if they are not, split
  the hidden owner, not the composition root.
- Do not keep a root folder with mixed loose files when the files have obvious
  sub-boundaries such as `steps`, `session`, `view-model`, `support`,
  `artifacts`, `dialogs`, or `embedded-products`.
- Do not extract into a new folder unless the folder name states the ownership
  boundary. A folder that only hides code size is drift.

Public boundary and barrel rules:

- `index.ts` is allowed only for public domain/workspace entry points, shared
  workflow packages, product-adapter facades, artifact/output APIs, embedded
  product host APIs, read-model/type facades, or fixture family facades.
- Step, session, controller, view-model, support, and dialog folders do not get
  barrels just to shorten imports.
- Prefer explicit exports at public barrels. Wildcard exports are acceptable
  only for deliberate type/read-model facades or stable adapter facades whose
  whole module surface is intentionally public.

Product-app boundary rules:

- Product apps own reusable tool behavior, document models, controllers, and
  app-specific visual systems.
- Operation domains own when a product app is available, which domain record is
  passed into it, how app output is mapped back, and which workflow gates,
  receipts, dirty state, and handoff behavior surround that output.
- Work models may depend on persisted artifact/document DTOs that are part of
  the domain session contract. They must not collect transient app UI state such
  as drag state, resize state, selection boxes, tool drawers, or hover state
  unless that transient state is intentionally persisted and recorded.
- Presentation host adapters may import product-app public APIs directly.
  Other presentation files should use the host adapter or product-adapter
  boundary unless the direct import is recorded as the host edge.

## Drift And Decision Gate

If implementation discovers drift or an important visual/workflow decision,
stop and discuss it before continuing.

This gate applies when a change would:

- alter modal size, zone layout, scroll ownership, or footer behavior
- create a new panel, card, pill, table, nav, action, detail, progress, or
  history pattern
- change panel family, rail treatment, selected state, status tone, or pill
  semantics
- move an action between content, panel action row, footer, header, or detail
  modal
- add, remove, merge, split, rename, or reorder workflow steps
- change source-of-truth, mutation boundary, receipt behavior, or local/backend
  projection language
- promote a local component to Teras or create a new local alternative to an
  existing Teras primitive
- make a future domain copy Delivery behavior that may not fit its surface purpose
- resolve a mismatch between this contract, recorded shared Workbench behavior,
  and the current implementation

Allowed without a new discussion:

- implementing a rule already recorded in this contract
- fixing a clear bug that restores the recorded contract
- small spacing, alignment, or copy adjustments that do not change the pattern
  or workflow meaning
- adding focused guard coverage for already accepted rules

When the gate triggers, record the decision in the prototype decision log or
the relevant domain design record before continuing implementation. Do not
silently patch the UI into a new workflow shape.

## Domain Surface Shape

### Shape Admission Rule

Each Operation Workbench domain must declare its operating shape before major
implementation.

The admission record or design pass should identify:

- surface purpose
- canonical source of truth
- mutation boundary
- expected record volume and scan behavior
- whether the domain is primarily read-only, control, queue, board, catalog,
  map, ledger, hub/workflow, compact dialog, fullscreen workspace, or hybrid
- required operator surfaces, such as capture, list, inspect, status, apply,
  receipt, archive, or recovery
- nearest Workbench/Teras pattern
- patterns deliberately excluded because they do not fit the surface purpose
- local exploratory shape, if no accepted pattern fits yet
- validation or preview state that will prove the shape is usable

The shape follows the surface purpose, not the domain name. Completed domains are
examples only after their reusable behavior has been normalized into shared
Workbench or Teras rules.

### Surface Entry And Mount Rule

Surface entry is part of the admitted shape. It is not a wiring detail.

Before implementation starts, each Operation Workbench domain must declare its
entry class:

- `focused-control-modal`: the Workbench button opens the domain workspace
  wrapper, the wrapper owns a `TerasModalShell`, and the accepted control
  surface renders inside that modal body. Proposal, Repository, Prototype,
  and Model Operations use this entry class.
- `fullscreen-workspace-modal`: the Workbench button opens the domain
  workspace wrapper, the wrapper owns the fullscreen workspace shell, and the
  surface renders inside that shell. Delivery uses this entry class.
- `temporary-comparison`: inspection scaffolding only, never the product entry
  class.

Mounting rules:

- No new or reworked Operation Workbench domain may use an inline Workbench
  surface as its accepted product entry. Reworked domains must open through a
  focused modal or fullscreen workspace shell.
- `app/page.tsx` composes `OperationWorkbench` and the public domain
  workspace wrapper. It must not directly mount a private domain surface such
  as `<PrototypeWorkspaceSurface />` once a domain has an accepted entry
  class.
- `<domain>-workspace.tsx` owns the modal or workspace shell, close behavior,
  shell title, and shell description for the accepted new entry.
- `<domain>-workspace-surface.tsx` is the accepted surface body. It must not
  own the top-level Workbench entry mode or become a second inline product
  path.
- Temporary legacy comparison must sit in an inline cutover/comparison wrapper
  that keeps the frozen legacy surface visible in its original inline shape
  and opens the accepted new modal or workspace shell for comparison. The new
  workspace wrapper itself must not own or render the legacy inline surface.
- Accepted replacement removes the comparison switch and legacy mount, then the
  guard flips from allowing comparison scaffolding to rejecting it.

If a domain has structured read models, selectors, commands, receipts, and
Teras primitives but violates the entry class, the domain is still drifted.
Inline rendering is allowed only for frozen legacy comparison during a
temporary replacement window.

Accepted shape families include:

- compact capture or details dialog
- focused control modal
- searchable register or queue
- board or lane surface
- catalog/control surface
- workflow hub plus workflow session
- decision ledger or exception register
- map, graph, or relationship explorer
- app-sized fullscreen workspace modal
- future real-stage workbench surface

Large, multi-surface domains such as Delivery may use fullscreen workspace
treatment during this prototype phase. Simpler workflows such as Proposal
should use a focused control modal unless their surface purpose grows beyond that
space.

No domain should inherit Delivery Home, persistent workspace nav, recent
activity, or embedded Agent Console only because Delivery has them.

### Visual Invariant Rule

A domain may use a different product shape, but it must not invent a different
visual language.

Every Operation Workbench shape must respect the shared console visual system:

- Teras primitives are inspected and reused before local components are added.
- Panels, rails, trays, status pills, summary cards, action buttons, registers,
  filters, modals, progress selectors, guards, nav buttons, and advisor panels
  follow their accepted Teras and Workbench treatment when the pattern applies.
- Spacing, typography weight, button sizing, selected treatment, hover,
  disabled, read-only, warning, blocked, stale, and done states use the console
  vocabulary already recorded in this contract and the design profile.
- Operation-domain CSS is not a normal composition layer. Use Teras layout and
  content primitives first. Local CSS, raw `className` chrome, `styles.*`, or
  inline style objects require an explicit design gap and operator discussion;
  they must not recreate shared primitive chrome or introduce a parallel style
  family.
- Domain-specific layouts may change zone count, modal size, and internal flow
  only after recording the surface purpose and closest accepted pattern.
- If a domain needs a new visual primitive, the work pauses for discussion,
  records whether the primitive is local or a Teras promotion candidate, and
  defines the focused guard or preview state that protects it.

Shape flexibility is normal. Visual-system exceptions are not normal. A visual
exception needs an explicit decision record before implementation continues.

### Teras Primitive Integrity Rule

Using a Teras primitive means inheriting the primitive's visual state contract,
not only importing the component.

Operation-domain code may:

- place a primitive through a Teras layout primitive or product-app frame
- pass product-neutral primitive props such as tone, read-only, density,
  selected, disabled, layout, or approved sizing/scroll props when the
  primitive exposes them
- request a new product-neutral Teras variant when repeated layout pressure
  shows the primitive needs one

Operation-domain code must not:

- target generated Teras internals such as CSS-module class fragments
- override primitive-owned state treatment for editable, read-only, disabled,
  selected, hover, focus, pill, button, panel, field, or fact-row chrome
- create hidden local variants that still appear to be using Teras
- repair a primitive limitation by copying its chrome into a domain module
- add local CSS, raw `className`, `styles.*`, or inline style objects without
  an approved missing-primitive exception

If a domain needs a primitive to look or behave differently, the work pauses
for discussion. The accepted fix is either a product-neutral Teras variant or
a recorded domain-specific exception with guard coverage.

## Surface Zone Rule

A domain surface must have a deliberate zone model before adding panels.

Common accepted shapes, when they fit the admitted domain shape:

- focused control modal: top summary/capture or status/action zone, then
  register plus selected-record launcher
- workflow hub modal: selected record, current required move, current status,
  progress, receipt archive
- active workflow modal: progress/current-move strip, selected subject anchor,
  work body, optional advisor/context column, footer actions
- fullscreen workspace: summary/header, internal nav when needed, one active
  surface, panel-owned scroll regions

Do not add passive right-side panels, duplicate source-context panels, generic
recent activity, or agent consoles unless they have a concrete surface purpose for
that domain.

Panels that fit their content should not stretch to fill a column only because
space exists. Panels that own a list, board, register, or work area may use the
remaining space and should own their internal scrolling.

## Modal And Scroll Rule

Modal size and shell behavior follow the surface purpose.

Rules:

- use `TerasDialog` for passive inspection, reference, information, guard, and
  confirmation dialogs that do not own a workflow transition surface
- passive information/reference dialogs must not render a footer action area
  when the only action would be `Close`; rely on the dialog header close
  affordance. This does not apply to guard, confirmation, export, inspect,
  recovery, or workflow-routing dialogs that have a real decision or secondary
  action.
- use `TerasModalShell` for workflow, request, mutation, receipt-producing, or
  workspace modal shells
- register-entry action, request, capture, review, or receipt-producing shells
  opened from a register/control surface use `Back To Register` for the
  non-mutating footer return action. Nested step shells may use `Back` when
  returning to the previous modal step. Workflow sessions keep their own
  `Back To Hub`, `Back To Register`, apply, guard, and finish labels.
- nested stable controls opened from a dashboard surface may use
  `Back To Dashboard` for the non-mutating footer return action
- compact request or mutation drafts should use the default `TerasModalShell`
  size unless their content genuinely requires a wider workflow session
- primary focused-control workspace shells, such as Proposal Control and
  Repository Control, are the main surface container, not child request/mutation
  drafts; they keep their approved shell size and must not be resized during
  compact-dialog cleanup
- choose the smallest product-neutral modal size that gives the register or
  workflow body enough space
- choose `TerasDialog`, `TerasModalShell`, or a workspace shell by the
  operator job, not by the desired dimensions; size is a separate decision
- keep a workflow, request, mutation, or dashboard shell title stable and name
  the operator job. Put the selected record name in the subject/context panel.
  A dynamic shell title is allowed only for focused passive inspection where
  the selected object itself is the inspection job, such as a media or tree
  artifact viewer
- keep modal header, body, and footer visually separated
- keep footer actions visible and unobstructed
- avoid document-level scrollbars while a fullscreen or workflow modal is open
- use panel-owned or bordered-list internal scrolling for long content
- collapse or move persistent floating chrome while workflow modals are open

Do not center or animate a modal in a way that causes overflow, hidden actions,
or a second page scrollbar.

## Summary And Status Rule

Summary and status surfaces must not invent fake signals.

Shared summary cards are allowed only when the counts are meaningful to that
surface. When a surface does not need cards, keep the containing summary
chrome stable rather than showing placeholder cards or changing the panel
shape.

Workspace status signals are global read-model posture only. Current accepted
signals are:

- Backend
- Projection
- Write Path
- OOS

A domain contract may refine these labels or split one signal into several
global subsystem signals when the operator genuinely needs the distinction and
each signal has independent read-model truth. Such a refinement must be locked
before implementation and still must not show selected-record facts, route
choices, workflow history, or package-specific receipts.

Each clickable status opens only its scoped detail. Workspace status must not
show selected-record facts, package-specific receipts, route choices, proposal
ingress categories, or workflow history.

## Register Contract

When a domain has multiple records, the entry surface uses a standard register
or list before deep workflow work.

The register owns:

- search when the list can grow
- filters when state or type materially changes routing
- row status and source facts
- one clear row action for inspection or workflow entry
- bounded internal scrolling when the modal or workspace must fit the viewport
- stable column intent and alignment
- compact row actions
- long values wrapped, truncated, or moved into details

The register must not own:

- final workflow decisions
- multi-step mutation drafts
- receipt history
- unrelated source-specific panels
- duplicate gate columns when selected-record facts or details own that
  context more cleanly

Opening a row may open a details modal, a selected-record hub, or a workflow
step depending on the domain contract. It must not route to unrelated content.

Record controls use shared search/filter treatment. Search and filters sit
in one aligned toolbar without a redundant label above the search field.

Tables should avoid noisy vertical dividers. The primary record column gets the
working width. Status/gate columns should be compact and aligned consistently.

Operation tables must use `TerasRecordTable` with a named table profile when
the profile applies. Accepted profiles are:

- `register`: record registers with a primary record column, optional
  secondary/evidence columns, one status column, and one row action
- `value-matrix`: configuration/control value tables with a primary value
  column plus compact status, metric, and action columns
- `inventory`: dense technical inventory tables; existing native inventory
  tables in pre-baseline surfaces are replacement targets, not a pattern to copy

Columns use semantic intents instead of domain-local width classes:
`index`, `primary`, `secondary`, `evidence`, `status`, `metric`, `action`,
`technical`, and `chips`. Domain code must not recreate table shell, sticky
header, row hover, selected row, action alignment, index styling, or
profile-owned column widths in local CSS. Domain code owns row projection,
source-specific cell content, and command handlers only.

### Compact Focused-Control Register Pattern

Focused control modals that use the compact control shape, such as Proposal,
Repository, and Prototype, must share the same first-screen structure when the
domain has a register:

- top overview row: summary/status panel on the left and a dedicated
  ingress/request/action panel on the right
- layout shell: `TerasRecordControlLayout`
  `mode="overview-register-selected"` and `composition="compact-control"` with
  a fixed `430px` selected/ingress rail; compact controls must not create
  per-domain side-width variants
- overview row: `TerasRecordControlOverviewGrid`
- summary/status panel: `TerasRecordControlSummaryPanel`; the domain supplies
  metrics, copy, and optional workspace-status model only
- ingress/request/action panel: `TerasRecordControlActionPanel`; the domain
  supplies boundary copy, optional receipt copy, and the action handler only
- register zone: `TerasRegisterPanel` with `density="compact-control"`,
  `TerasFilterBar`, and `TerasRecordTable profile="register"`
- selected launcher zone: register-side `TerasSelectedPanel`
  `variant="compact"`
- register action column: one compact row action, normally a secondary
  Inspect/Open action. Record severity must not change navigation tone; danger
  is reserved for a genuinely destructive or explicit negative command
- register status column: whole-record status projection from the domain
  selector/view model, rendered as a single `TerasStatusPill`
- selected launcher metadata: prepared meta chips from the domain view model;
  rich metadata layouts are reserved for hubs, detail modals, workflow panels,
  or Delivery-style app-sized side panels

Compact control registers must not:

- place ingress/request actions inside the summary panel header when the peer
  compact controls use a dedicated right-side ingress panel
- use `TerasSelectedPanel variant="rich"` for the primary register-side
  selected launcher
- render a status cell as a local stack of pill plus unrelated metadata
- derive register button tone or label directly from ad hoc JSX when a
  whole-record status/action projection already exists or should be added
- use primary row buttons for ordinary inspect/open actions

If a focused control surface needs to diverge from this pattern, the operator
job and exception must be discussed and recorded before implementation.

## Hub Contract

A workflow hub is the selected-record control center for a domain workflow.

The hub should show:

- a selected-record context panel across the top, using a hub-owned
  `TerasPanel`/`TerasPanelHeader` shape with `TerasMetadataList` using chip
  treatment when identity chips are needed
- a two-column cockpit under the selected-record panel
- left column: current required move, then current status or gate posture
- right column: primary workflow progress, then history or receipt archive
  access
- one primary action in the current-required-move panel

The hub must not become:

- a permanent side dashboard
- a live backend event stream
- a substitute for the workflow step content
- a second copy of global workspace status
- a local list of generic workflow-entry rows when the domain has a real
  progress-step model
- a collection of extra posture, issue, or evidence panels that belong in the
  status panel, details modal, history surface, or active workflow step

Hub rendering must come from one projection model so selected context, current
move, progress, status, and history agree with each other.

Hubs for focused-control domains such as Proposal and Prototype still follow
this cockpit structure. They may use a focused modal size and fewer facts, but
they must not invent a new hub shape unless the exception is discussed and
recorded before implementation.

The hub selected-context panel stays oriented around the selected record. It
does not duplicate global workspace status. Lifecycle or route state belongs in
status pills, facts, or current-move/action panels.

The hub current-required-move panel uses the current action tone because it is
the active next move. Hub status/context panels stay neutral or info-toned
unless they are the actual action owner.

## Workflow Session Contract

A workflow session modal owns step-by-step operator work after the hub.

The session should separate:

- session controller and state
- transition model
- step projection model
- step router
- step views
- session footer
- close or dirty guard dialogs

Step views should not compute global workflow progress, mutate arbitrary active
steps, or duplicate session-level transition rules. They receive projected
state and emit bounded intents.

Completed workflow steps remain available for review unless the backend or
workflow contract makes review unsafe. Completed steps lock editable content
and terminal apply actions, but they should not lock the page itself.

Active workflow steps follow this basic body shape unless a recorded exception
exists:

- top current-required-move or progress strip
- selected subject anchor, usually `TerasSubjectHero`, when record context
  matters
- state-treated work panel with a semantic tone for editable draft fields
- rail-treated gate/action panel when the step owns a review, apply, record, or
  block decision
- compact read-only facts or context panels only when they help the active
  decision
- advisor panel only when the step has an admitted draft-assist job

Active workflow and guided-session bodies must use the shared Teras
session frame primitives:
`TerasModalShell height="fill" bodyLayout="fill"`,
`TerasContentFrame`, `TerasContentRegion`,
`TerasZoneLayout variant="main-aside"` or `variant="main-support"`,
`TerasList` with the appropriate neutral item primitive, and
`TerasActivityLogPanel` when operational output is required. The activity-log
primitive owns its fill geometry.

Do not embed hub-only selected-record panels or hub current-move panels inside
active workflow steps. Use the lighter subject/context anchor instead.

Do not add prose-only boundary panels. Boundary meaning must be carried by the
workflow step, disabled/locked controls, facts, status pills, and recorded
source-of-truth contract.

Do not add a standalone tray or panel whose only content restates the local,
source-projected, or future-live boundary. Put concise boundary copy in the
owning panel description, a structured authority/capability fact, or the
disabled reason for the affected action.

Operation domains must not recreate generic flow shell, step-stage, list,
status-item, signal-item, timeline, or activity-log CSS locally. If a guided
operation body needs a standard frame, list treatment, or log treatment,
extend the product-neutral Teras primitive first.

## Panel Rule

Primary workflow action panels use `treatment="rail"` with a semantic `tone`.

Use rail treatment for:

- selected workflow context
- current required move
- gate or readiness review
- apply or record action review
- selected value or selected package inspector
- workflow progress panels
- action panels that decide the next workflow move

Use `treatment="state"` with a semantic `tone` when a panel body itself tracks
editable, evaluative, or actionable state but is not the primary command cue.

Use `treatment="neutral"` without `tone` for:

- facts and read-only detail
- editable work fields
- source context
- status summaries
- queue/list bodies
- activity/history content
- supporting context that does not own the next move

A small secondary utility action inside a neutral panel does not by itself make
the panel a primary action panel.

Every direct operation-domain `TerasPanel` consumer declares `frame` and
`treatment` explicitly. Treatment follows content semantics rather than visual
position, and a neutral panel must not carry a tone.

Panels must not fall back to separator-only content, ungrouped fact piles,
stretched tile actions, or header-primary actions when the panel owns a real
workflow decision.

Panel content must be grouped by meaning. Use content trays, metadata lists,
signal items, or detail cards instead of a flat pile of unrelated facts.

Panel title/description copy should identify the surface purpose or gate. It
should not be filler, marketing prose, or a restatement of the button text.

## Action Placement Rule

The operator's current required move must be visible in content, not only in
the modal footer.

Use this split:

- Hub current move: action lives in the hub current-required-move panel.
- Workflow gate/review step: action or action readiness lives in the step's
  rail-treated gate/action panel.
- Workflow-session modal footer: always carries the session-level return action
  plus the contextual continuation action for the active step. For a hub this
  is `Back To Register` plus the hub current move. For a workflow step this is
  `Back To Hub` plus the next/apply/record/history action for that step. For a
  read-only history/archive route this is `Back To Hub` plus `Back To Register`.
- Other modal footer: close, confirm, apply, cancel, export, or terminal
  actions appropriate to that modal.
- Detail modal footer: close, export, confirm, or cancel actions.

Footer actions are valid, but they must not be the only place where a workflow
gate or decision is explained. The content panel must show what is being
reviewed, why it is ready or blocked, and what the action will record.

Panel action rows use natural-width shared buttons, sit after the content, keep
normal panel bottom padding, and align primary actions to the right.

Buttons must be action-specific. Avoid generic labels when the action route,
decision, or result is known.

Compact in-panel inspection or navigation buttons use a single clear label such
as `View Full Tree`, `Open Details`, or `View History`. They should not carry
secondary helper copy inside the button.

Real workflow approval or mutation actions inside panels may use the heavier
modal-action treatment when they change gate state or record operator
acceptance, such as `Mark Reviewed`.

Unavailable mutation actions need a visibly muted treatment in addition to the
disabled attribute and disabled reason.

## Progress And History Rule

Progress panels show primary workflow steps only.

History or receipt archive behavior follows this split:

- Hub: history appears as a separate receipt/archive action panel, not as a
  mutable progress step.
- Active workflow session: history may appear as a read-only route after
  apply/record completion when it helps review receipts.
- Progress connector chrome is for active workflow step strips only.
- History/archive routes do not receive sequence connectors.

Progress state labels should stay simple:

- `Current`
- `Next`
- `Locked`
- `Done`
- `Archive`, only for a read-only history or receipt archive route

Domain-specific readiness, backend status, receipt state, or route detail
belongs in pills, panel titles, facts, and body copy rather than progress-step
state labels.

Previously completed steps should remain selectable for review when review is
safe. Genuinely future, blocked, or disallowed steps stay locked.

Progress connector chrome is opt-in. Active workflow progress strips may show
the amber sequence connector. Hub progress panels do not use connector chrome.

## Selected Context Rule

Selected context must be visible near the workflow entry point and inside
workflow steps when it helps orientation.

Use:

- selected record panel in the hub
- subject hero or compact selected-context anchor inside workflow steps
- detail modal for deeper inspection

Do not duplicate all selected-record facts in every step. Step content should
show the minimum selected context needed for the operator to make that step's
decision.

Selected context panels normally stay info-toned. The record's lifecycle state
belongs in status pills, facts, or adjacent state controls unless the selected
context panel itself is the stateful action.

Primary register-side selected panels use the grouped `TerasSelectedPanel`
primitive so shell, header, status pill, identity/fact spacing, and nested
required action do not drift between surfaces. Use `variant="compact"` for
focused control surfaces such as Proposal Control, Repository Control, and
Prototype Control. Use `variant="rich"` for Delivery-style package register
side panels that need fact rows plus required action context.

Hub selected-context panels are not register side panels. They keep the
hub-owned `TerasPanel`/`TerasPanelHeader` shape and may use
`TerasMetadataList` with `shape="line"`, `treatment="chip"`, and `wrap` for
selected-record identity metadata. Do not replace hub selected context with
`TerasSelectedPanel` unless the operator explicitly approves a hub redesign.

The small pieces remain reusable where the full selected panel is not the
right surface: `TerasMetadataList` for identity chips or facts, and a
rail-treated `TerasPanel` with `TerasPanelHeader` plus `TerasActionRow` for a
standalone action cue. Metadata and facts must be passed as structured `items`
arrays.
They should not be hand-assembled into a primary register-side selected panel
when `TerasSelectedPanel` applies.

Workflow recovery surfaces that pair an action selector with selected action
details use a local domain component composed from `TerasChoiceGroup`,
`TerasPanel`, `TerasMetadataList`, and shared action rows. It is a workflow
selected action detail composition, not a selected subject/context panel and
not a compact launcher.

Details modals are neutral inspection surfaces. They may show facts, evidence,
route posture, source context, and mutation boundary. They must not contain
route choice, acceptance, rejection, parking, repository creation, or handoff
controls unless the details modal is explicitly the owning workflow surface.

Stable record facts, evidence signals, route facts, repository gates, and
activity/history context should be separated. Do not put activity fields such
as last event into stable record facts.

## Status And Tone Rule

Do not let lifecycle or gate meaning live only in color.

Every important state needs text, source context, and action posture. Color is
supporting emphasis.

Use tone by meaning:

- `info`: selected context, neutral workflow progress, reference context
- `warn`: current required move, attention, pending review, unresolved gate
- `ok`: completed, accepted, applied, healthy
- `danger`: rejected, failed, blocked, unsafe or destructive
- `muted`: unavailable, retired, read-only, not applicable
- `stale`: stale projection or refresh risk

These tones describe record, panel, row, or evidence state. They do not select
an action-button tone. Button treatment follows the action's command semantics
under the Capability And Action Semantics Rule.

The same lifecycle label must not appear in different colors for unrelated
local reasons.

Status pills use compact labels. Long backend/read-model states belong in
filters, detail facts, or body copy rather than occupying pill surfaces.

Clickable state summary cards or pills are allowed only when they open relevant
scoped details or action context.

Selected cards and buttons must show selected, unselected, hover, disabled,
and blocked states. A selected card must either open a coherent focus surface
or do nothing; it must not open unrelated content.

## Draft And Guard Rule

Editable workflow steps use parent-owned session draft state.

Draft behavior:

- edits autosave to prototype-local session state when that is the established
  pattern for the workflow
- unapplied local drafts open the shared Teras close guard before unsafe exit
- recorded, read-model-projected, or source-projected steps become read-only
- local receipts must be labeled prototype-local and must not imply backend
  mutation

Do not reinvent a domain-local dirty guard when a shared Teras or Delivery
workflow guard already fits.

Modal-local draft state is allowed only for small contained dialogs where no
workflow session controller exists. Multi-step workflow state belongs in the
session controller or parent-owned state.

AI/advisor output remains draft-only unless the domain contract explicitly
admits a governed provider and apply path. Advisor suggestions must not mutate
canonical source truth, read-model truth, or backend projection silently.

## Advisor Rule

Agent or advisor panels are not default Operation Workbench furniture.

Use an advisor only when:

- the step has a concrete draft-assist job
- the context boundary is explicit
- the output remains operator-reviewed draft state
- it does not cover or compete with modal footer actions

Simple domains should not inherit Delivery Home's Agent Console or a persistent
assistant column. Proposal allows advisor assistance only in Triage.

## Navigation Rule

Persistent workspace navigation is used only when the domain is app-sized and
has stable internal surfaces.

Use shared `TerasSurfaceNav` and `TerasSurfaceNavButton` when persistent
workspace nav is needed. Unselected nav items stay muted. Selected nav uses the
amber selected state and must not darken on hover. Per-item lifecycle status
coloring does not belong in workspace nav.

Workflow steps are not nav sections. Use progress selectors and hub actions for
workflow routing.

## Activity Rule

Recent activity is allowed only when the domain has a real activity source or a
clear audit-backed read model.

Activity rows should be simple system-generated event records:

- event kind
- generated title
- generated sentence
- timestamp
- record/package ref
- receipt/event id when available

Do not add generic activity prose, placeholder feeds, or changing history rows
inside a hub only to fill space.

## Teras Reuse Rule

Use Teras primitives before local variants.

Shared component usage is mandatory for standard Operation Workbench shapes:

| Need | Required shared primitive | Local code may own |
| --- | --- | --- |
| Modal/workspace entry shell | `TerasModalShell` or accepted fullscreen shell | domain title, description, close/cutover wiring |
| Fullscreen workspace frame | `TerasFullscreenSurfaceFrame` with `TerasSurfaceSummaryHeader` and `TerasSurfaceNav` | summary/nav view model, active surface routing, and workspace-specific workflow overlays |
| Primary-side layout | `TerasPrimarySideLayout` | slot content, read-model projections, and routing callbacks |
| Passive detail/reference/guard dialog | `TerasDialog` | body layout and domain content |
| Workflow/request/mutation/receipt shell | `TerasModalShell`; compact drafts use the default size before `wide`; primary focused-control workspace shells keep their approved container size | footer actions, domain title, description, close behavior, and body content |
| Panel | `TerasPanel` + `TerasPanelHeader`; use `TerasPanel.layout` for accepted header/body/footer frames | local grid placement, domain-specific sizing, and scroll ownership |
| Guided content frame/region | `TerasContentFrame variant="standard"` / `variant="single-region"` + `TerasContentRegion` | domain content, explicit variant selection, and region scroll ownership |
| Zone layout | `TerasZoneLayout variant="main-aside"` / `variant="main-support"` + `TerasZone fit="fill"` / `fit="content"` | semantic variant, child panels, and scroll ownership |
| Vertical panel stack | `TerasPanelStack fill="first"` / `fill="middle"` / `fill="last"` with optional matching `bounded` position | panel content and the semantic fill/bounded position only |
| Detail/content grid | `TerasDetailGrid` | child content and accepted detail-grid variant |
| Selector-value-inspector layout | `TerasSelectorValueInspectorLayout` + `TerasSelectorRailList` | selector rail items, current-value table/list, selected inspector, and mutation dialogs |
| Register panel | `TerasRegisterPanel` + `TerasFilterBar` | register copy, filter option data, callbacks, table/list projection |
| Compact record control layout | `TerasRecordControlLayout` + `TerasRecordControlOverviewGrid` + `TerasRecordControlSummaryPanel` + `TerasRecordControlActionPanel` | metrics, boundary/receipt copy, action callbacks, selected launcher content, domain modal children |
| Mode/view switcher | `TerasSegmentedControl` | options, selected value, and callback |
| Standard record table | `TerasRecordTable` + `TerasRecordCellText` / `TerasRecordMetaText` | table profile, column intents, row projections |
| Register-side selected launcher | `TerasSelectedPanel` | prepared meta/action props; compact controls use `variant="compact"` |
| Hub selected identity chips | `TerasMetadataList` with `shape="line"`, `treatment="chip"`, and `wrap` inside hub-owned `TerasPanel` | selected record chip values |
| Current required action panel | rail-treated `TerasPanel` + `TerasPanelHeader` + `TerasActionRow` | command view model and disabled reason |
| Panel action row | `TerasActionRow` + `TerasActionButton` | action callback only |
| Passive/secondary dialog | `TerasDialog` with explicit `width`, `height`, and `contentOverflow` geometry when non-default behavior is required | detail/reference/viewer/guard body content, inspect/export/confirmation actions; omit actions for info/reference dialogs whose only action would be `Close` |
| Workflow/request shell footer action | `TerasActionButton` in `TerasModalShell.footer` | command routing and disabled state |
| Status label | `TerasStatusPill` | compact display label and tone from selector/view model |
| Summary metric | `TerasSummaryCard` | metric label/value/tone |
| Facts and metadata | `TerasMetadataList` | structured metadata/fact `items`, columns, shape, chip/list/card treatment |
| Tray/content stack | `TerasTrayStack` | child content, scroll ownership, and accepted spacing/column props |
| Field layout grid | `TerasFieldGrid` | field controls and draft state |
| Status/check/evidence list | `TerasList` + `TerasStatusItem` | row projections, one semantic tone, optional index, and accepted list framing/scroll tokens |
| Receipt/archive metrics | `TerasStatGroup` + `TerasStatItem` | metric rows and scroll ownership |
| Signal/issue/action list | `TerasList` + `TerasSignalItem` | domain row data, optional status/action content, and accepted list framing/scroll tokens |
| History timeline | `TerasTimeline` + `TerasTimelineItem` | durable ordered timeline projection |
| Workflow progress | `TerasProgressStepList` + `TerasProgressStepSelector`; use fixed `columns` for workflow-shell strips | step model and navigation intent |
| Text/select/note field | `TerasTextField`, `TerasSelectField`, `TerasNoteField` | draft state and validation |
| Advisor | `TerasAdvisorPanel` | admitted assistant context and draft-only callback |
| Activity/apply log | `TerasActivityLogPanel` with `fullLog` when inspection is needed; `TerasActivityLogDialog` only when the caller already owns dialog state | rows, full-view facts, and optional export action |
| Workspace nav | `TerasSurfaceNav` / `TerasSurfaceNavButton` | nav item model only |

If a developer reaches for local CSS or a new local component for one of these
needs, the default answer is no. The allowed options are:

1. use the required Teras primitive;
2. pass a supported product-neutral primitive prop for layout only;
3. pause and record a Teras promotion/variant decision before implementing a
   new shared shape.

Expected shared primitives include:

- `TerasPanel`
- `TerasPanelHeader`
- `TerasPanelStack`
- `TerasContentFrame`
- `TerasContentRegion`
- `TerasFullscreenSurfaceFrame`
- `TerasPrimarySideLayout`
- `TerasZoneLayout`
- `TerasZone`
- `TerasSelectorValueInspectorLayout`
- `TerasSelectorRailList`
- `TerasDetailGrid`
- `TerasRecordControlLayout`
- `TerasRecordControlOverviewGrid`
- `TerasRecordControlSummaryPanel`
- `TerasRecordControlActionPanel`
- `TerasActionButton`
- `TerasActionRow`
- `TerasStatusPill`
- `TerasModalShell`
- `TerasDialog`
- `TerasRecordTable`
- `TerasRecordCellText`
- `TerasRegisterPanel`
- `TerasFilterBar`
- `TerasSegmentedControl`
- `TerasTextField`
- `TerasNoteField`
- `TerasSelectField`
- `TerasChoiceGroup`
- `TerasSummaryCard`
- `TerasMetadataList`
- `TerasList`
- `TerasStatusItem`
- `TerasSignalItem`
- `TerasTrayStack`
- `TerasFieldGrid`
- `TerasSubjectCard`
- `TerasContentTray`
- `TerasTimeline`
- `TerasTimelineItem`
- `TerasProgressStepList`
- `TerasProgressStepSelector`
- `TerasSubjectHero`
- `TerasSelectedPanel`
- `TerasAdvisorPanel`
- `TerasSurfaceStatusPanel`
- `TerasSurfaceNav`
- `TerasSurfaceNavButton`

Create a local component only when the behavior is domain-specific or the
shared primitive does not fit after inspection. If the same local shape appears
in more than one domain, evaluate it for Teras promotion before continuing.

Register and list filtering must use `TerasFilterBar` when the surface needs a
search field plus filters or a small right-side action. `TerasFilterBar` owns
the thin tray, search field, zero-to-three filter controls, optional action
slot, and the normal spacing to adjacent tables or lists. Do not hand-assemble
text fields and select controls for standard register/list filtering. More
than three filters requires a separate advanced filter surface or a
domain-specific filter decision, not a wider bar.

Standard register panels must use `TerasRegisterPanel` so the header, filter
bar, and table/list body frame stay consistent. Register/selected screen
structure must use `TerasRecordControlLayout` in the matching mode instead
of local grid CSS. Compact control surfaces must use
`TerasRecordControlLayout composition="compact-control"` with
`TerasRecordControlOverviewGrid`; the selected/ingress rail is fixed at
`430px` for Proposal, Repository, Prototype, and future compact controls.
App-sized register-selected surfaces must use
`composition="fullscreen-register"` so Delivery, Product Portfolio, and
Orchestration share the same responsive register-dominant inspector. Arbitrary
side widths are not part of the operation-workbench contract.

In-panel button rows must use `TerasActionRow` when a panel needs one or more
right-aligned `TerasActionButton` controls after body content. The primitive
owns wrapping, gap, right alignment, and approved vertical spacing. Do not
recreate local `*ActionRow` or `actionPanel` flex wrappers for standard panel
actions. Passive dialog buttons use `TerasActionButton` in the dialog action
slot only when there is a real inspect, export, guard, confirmation, or routing
action. Information/reference dialogs with only a close affordance omit the
action slot so they do not render a footer area. Workflow/request shell footer
buttons use `TerasActionButton` in `TerasModalShell.footer`; register-entry
action, request, capture, review, or receipt-producing shells use
`Back To Register` for their non-mutating return action.

Common panel-internal frame rows must be declared through `TerasPanel.layout`
when the shape is one of the accepted product-neutral frames:
`header-body`, `header-toolbar-body`, `header-body-footer`, or
`header-toolbar-body-footer`. Operation-domain CSS should not recreate those
rows with local `grid-template-rows`; if a real layout primitive is missing,
pause for discussion and promote the neutral Teras layout or record an
approved exception.

Teras must stay product-neutral and must not import domain read models.

Local CSS is exceptional in Operation Workbench domains. It must not recreate
shared card, row, pill, tray, modal, action, fact, filter, table, layout, or
progress chrome when Teras already has the primitive. Local parent spacing must
not double the primitive-owned spacing around filter bars, tables, signal lists,
or action rows. If local CSS remains necessary for a surface-specific exception,
the exception must state why no Teras primitive or product-app frame can own the
shape yet.

## Layout Health Rule

Before a changed Operation Workbench surface is called usable:

- long refs, URLs, model names, work-package links, and source paths must wrap,
  truncate with affordance, or move into details
- compact buttons must not stretch unless the pattern is a deliberate primary
  action card
- modal header, body, footer, nested cards, and overlays must not overlap
- modal footers must remain clickable
- scrollbars must belong to intentional panel/list regions
- changed buttons must produce visible operator feedback: state, route,
  receipt, guard, disabled reason, or explicit not-wired state

High-risk workflow changes should get a focused smoke or visual check for
overflow, intersection, and action obstruction when the surface is near a
baseline or completion claim.

## Temporary And Legacy Rule

Unfinished Operation Workbench domains with a meaningful page-era or legacy
surface should start with a temporary comparison switch during replacement
work. The comparison switch exists so the operator can inspect the legacy
surface while the new control/workspace is being rebuilt and can catch useful
old workflow ideas before the old path is removed.

The comparison switch is inspection scaffolding, not product navigation:

- the legacy inline or page-era path stays frozen and reference-only
- the new control/workspace is the only implementation path
- the comparison switch belongs to the inline cutover/comparison wrapper, not
  inside the accepted surface body or inside the new workspace shell
- the legacy inline surface remains visible in its original inline shape; the
  new control/workspace opens from that inline comparison wrapper
- the domain workspace wrapper owns only the accepted new modal/workspace
  shell, shell title, close action, and modal/workspace sizing
- do not polish, normalize, or add behavior to the legacy path
- do not mechanically copy legacy internals into the new domain folder
- do not treat the legacy surface as a capability matrix or parity target
- any useful legacy behavior must be re-modeled through the admitted product
  shape, Teras primitives, and domain read/session/command models
- if the new contract is stronger, stale legacy behavior should be rejected
  deliberately instead of carried forward

Before a replacement domain phase can be called complete or baseline-ready,
the accepted replacement must be operator-approved and legacy removal is
required:

- remove the temporary comparison switch
- remove the legacy mount from the Workbench path
- remove and clean up stale page-era implementation from active source so it
  cannot drift back in as an alternate implementation
- make the Workbench button open the accepted new surface directly
- flip the guard from allowing the comparison scaffold to rejecting it
- capture focused preview or smoke proof that the direct-entry surface covers
  the intended workflow and no legacy comparison markers remain

If a domain has no meaningful legacy surface to compare, record that exception
before starting implementation.

## Exception Rule

Future domains may challenge this contract during their own design pass.

An exception is allowed only when it records:

- the domain surface purpose
- why the accepted shared pattern does not fit
- the replacement pattern
- whether the replacement is local or a Teras promotion candidate
- the validation or visual check that will protect it

Unstarted domains remain pre-final. This contract prevents drift; it does not
approve their final shape.

## Current Application

This contract is generic. Current code-alignment status belongs in
`implementation-audit.md`; domain-specific workflow evidence belongs in the
relevant domain contract or decision log.

Current durable application of this contract:

- Completed local domain examples must not become parent architecture by
  implication. Shared behavior is authoritative only after it is written here
  or in `teras-contract.md`.
- Delivery, Proposal, Repository, Model Operations, Prototype, Workspace Product
  Intake, Portfolio, and Orchestration are completed current-shape surfaces for
  this prototype pass.
  That completion locks their accepted entry shape, source ownership, and Teras
  alignment, but it is not full-console baseline approval.
- Product Portfolio Publication requires Workspace Governance-admitted product
  identity and a product-owner packet. Its removed arbitrary-item posture and
  product-admission implementations must not return.
- Proposal Control and Repository Control use direct Workbench entry paths;
  their legacy comparison paths are retired.
- Shared selected panels, filter bars, status signal buttons, dashboard summary
  cards, surface dashboard layouts, meta strips, detail highlight panels, stat
  items, and action rows are Teras-owned behavior.
- Future domain passes start from this shared contract plus their own domain
  contract, then record exceptions before implementation when the surface purpose
  needs a different shape.
