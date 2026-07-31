# Delivery Source Architecture

Status: completed current-shape Delivery architecture baseline for the
implemented console Delivery domain.

This record is intentionally rebuilt from the Delivery source tree and the
Delivery-hosted product-app code. Prior planning records, previous approvals,
and folder layout convenience are not architecture authority when they conflict
with the source-backed Delivery contract.

## Scope

This record covers only:

- Delivery under
  `src/domain-workspaces/delivery/`
- Delivery-hosted product apps under
  `src/product-apps/context-board/`
  and `src/product-apps/build-tree/`

It does not define Proposal, Repository, Prototype, Portfolio, Lifecycle
Transition Control, Runtime Readiness, Model Operations, Agent Console, or
platform backend architecture.

## Locked Work Rule

Delivery behavior and visual output are locked during architecture cleanup.

Allowed without a separate design discussion:

- documentation that states the source-backed Delivery architecture
- no-behavior file moves that preserve imports, rendering, and workflow state
- naming cleanup that does not change operator copy or UI output
- tests or guards that prove the architecture boundary

Requires discussion before implementation:

- any visual change
- any workflow step change
- any modal geometry or panel layout change
- any Teras conversion that may change appearance
- any product-app extraction that changes board, tree, snapshot, or advisor
  behavior
- any source-of-truth, persistence, receipt, or mutation-boundary change

## System Role

Delivery is the operator workspace for accepted work that is serious enough to
be governed through the delivery path.

Delivery consumes accepted source into a delivery package, shapes the work,
repairs and validates metadata, exposes execution posture, supports
package-scoped actions, and manages Delivery-owned catalog values.

The console renders projected delivery state and submits bounded operator
intent. It must not become the canonical system of record for ART truth.

Backend direction:

```text
OOS orchestrates.
WGCF governs.
OpenProject stores ART truth.
Future Workspace Delivery backend may own durable delivery state later.
The console renders and submits operator intent.
```

## Operator Surfaces

Delivery has six peer operator surfaces:

- Home
- Intake
- Work Design
- Refinement
- Execution Board
- Catalog

No peer surface is more important than the others. Catalog is one Delivery
surface, not a separate operation workspace and not the main checkpoint for the
domain.

Surface responsibilities:

- Home shows workspace health, attention queue, recent activity, and the
  shared agent console entry for Delivery-level context.
- Intake consumes accepted source into a delivery package shell.
- Work Design shapes the package through context brief, Context Board, Build
  Tree, draft review, and local apply receipt.
- Refinement makes the Work Design handoff backend-safe and execution-ready
  through metadata repair, readiness review, and apply receipt.
- Execution Board shows family map, ART tree, control-board posture, selected
  package actions, and package-scoped inspection.
- Catalog manages Delivery-domain reference values and owner-routed metadata
  control.

## Working Flow

The source implements this Delivery flow:

```text
Accepted source
  -> Intake consume
  -> Delivery package
  -> Work Design context and draft tree
  -> Work Design apply receipt / handoff packet
  -> Refinement metadata repair and readiness
  -> Refinement apply receipt
  -> Refinement-to-Execution handoff
  -> Execution Board posture and package actions
  -> OOS closeout readiness
  -> Delivery closeout receipt and history
  -> Optional Workspace entrant or existing-product-change impact
```

Refinement `Done` means the Refinement workflow produced an accepted handoff.
It does not mean Delivery is complete. Delivery `Done` requires an
Execution-phase package, the accepted Refinement-to-Execution handoff,
OOS-shaped readiness with no open or blocked descendants, complete closeout
evidence, and a closeout receipt.

Every accepted closeout produces a Delivery outcome record and history ref.
Its optional impact is exactly one of:

- `none`: no downstream product or workspace boundary changed
- `workspace-entrant`: a new durable repo, product, or component candidate is
  ready for Workspace Intake classification
- `existing-product-change`: Delivery changed an active product and records its
  active registry ref, product owner, and change summary

The existing-product-change output is Delivery outcome evidence, not a complete
Portfolio publication packet. The product owner assembles that packet before
Portfolio validation.

Accepted Delivery ingress currently has two contract-defined source classes:

- Proposal: idea-level accepted source that creates a Delivery shell and begins
  Work Design without an approved product baseline.
- Prototype: a baseline-approved Prototype graduation packet that creates the
  same Delivery shell type but carries approved objective, scope, boundaries,
  source custody, baseline evidence, and remaining-work context.

Both classes use Delivery Intake. Prototype does not bypass Consume, Work
Design, Refinement, or Delivery readiness. Intake read models use a neutral
source kind, source ref, source version, packet ref, source custody, and
optional origin-specific metadata; `proposal_ref` must not remain the universal
source identity once Prototype ingress is implemented.

For Prototype ingress, Consume creates or reuses one top-level Delivery Epic
shell and records Prototype and Baseline Packet backlinks. Work Design starts
with a continuation context seeded from the approved Prototype objective,
scope, non-goals, existing source, evidence, and remaining work. The operator
still shapes the Delivery tree. Prototype component, UI, and evidence trees are
not imported as executable ART work.

The final target application receipt must prove the Delivery shell, reciprocal
backlinks, and resolved durable source custody before Prototype may project
graduation complete. Intake admission or shell-request acceptance alone is not
that receipt.

## Discovered Workspace Entrants

Delivery does not automatically classify every package, and classification is
not limited to closeout. When governed work reveals a new durable repository,
product, or component boundary that is not already classified, Delivery may
prepare a generic Workspace Intake candidate with typed identity, ownership,
intended endpoint, validation behavior, and Delivery evidence refs.

Workspace Governance owns the classification decision. An `admitted` intake
entry remains outside active inventory until the separate type-specific
promotion removes it from `intake-register.yaml` and creates exactly one active
`repos.yaml`, `products.yaml`, or `components.yaml` record. Delivery does not
perform either canonical mutation and must not treat the classification receipt
as closeout, active registration, or Portfolio publication.

The flow is not a claim that every mutation is live-backend wired. Prototype
execution mode uses mock read-model data, local transition helpers,
localStorage-backed session persistence through `local-runtime/`, and local
receipts to make the operator path exercisable.

## Projection Authority And Live Failover

Delivery package source fields stay source-owned. Fields such as
`backend_status`, `package_posture`, source refs, backend owner metadata, and
durable receipt refs come from the Delivery read model, OpenProject/OOS/WGCF
projection, or a future admitted Delivery backend projection. Prototype-local
workflow actions must not mutate those fields to simulate live completion.

When the prototype records a local workflow action before live backend wiring,
it may attach `local_workflow_projection` to the package projection. That overlay
must carry `authority: "prototype-local"` and may provide the operator-visible
status, tone, summary, local receipt id, recorded timestamp, and workflow phase
for the local preview state.

Rendering may use an effective status that prefers `local_workflow_projection`
for immediate operator feedback, but the source package fields remain unchanged.
`projectDeliveryEffectiveReadModel` is the single Delivery merge boundary for
source packages plus Intake, Work Design, Refinement, and Execution local
artifacts. Workspace summary, registers, selected-package views, workflow
launchers, and board status must receive that projected model or use
`getDeliveryEffectivePackagePosture`; they must not independently merge local
receipts with source package state.
When a live runtime adapter returns a durable receipt or refreshed backend
projection, the backend projection wins. The local overlay must then be removed,
ignored, or reconciled against the returned projection version; it must not
survive as competing business truth.

If the source projection changes while a local overlay or draft is active, the
UI must show stale, conflict, or review-only posture before any apply path
continues. It must not render the local overlay as `Source Done`, backend done,
ART mutation, or durable receipt evidence.

Delivery read-model fixtures may contain terminal source statuses so the
prototype can exercise done and retired states. Local runtime, presentation, and
workflow projection code must not assign terminal backend/source statuses
directly.

Visible Delivery summary cards must be computed from the current read-model rows
and effective local projection overlays for the surface they summarize. Summary
cards must not read `board_summary` directly because board aggregates can be a
separate execution-board projection and are not recalculated by local preview
transitions. If a future card intentionally shows a board aggregate, the label
must make that scope explicit instead of presenting it as package or workspace
truth.

## Delivery Ingress Boundary

Every accepted source enters Delivery through a Delivery-owned ingress
application. Its receipt creates an Intake source with `needs_consume`; no
source domain writes Delivery Intake directly.

For Proposal-to-Delivery, that ingress receipt completes the cross-domain
handoff. Delivery Intake Consume is a later, internal Delivery action that
creates or links the Delivery package shell and does not determine whether
Proposal Handoff completed.

For Prototype-to-Delivery, ingress admission creates the Intake source but does
not complete graduation. Delivery Intake Consume is the target-application
stage for that route: it creates or reuses the Delivery shell, records the
Prototype and Baseline Packet backlinks, and contributes to the final
graduation receipt. Until that receipt proves the shell, reciprocal backlinks,
and durable source custody, Prototype remains `graduating`.

Intake operational states are limited to:

- `needs_consume`
- `consume_failed`
- `consumed`

Invalid or source-incomplete packets remain with their source domain and must
not enter Intake as blocked or parked records. Technical Consume failure stays
with Delivery and Orchestration. It must expose retry or repair without
reopening Proposal or requiring Prototype to submit the same accepted packet
again.

## Intake Source Custody

Delivery Intake does not require every accepted source to have its own
repository, but it must never accept source custody as unknown.

Every Intake source must carry structured source-custody metadata before the
operator consumes it into a Delivery package shell:

- `existing-repo`: an admitted owner repo or source owner already exists
- `new-repo-required`: Repository already resolved the durable source home
  before Delivery Intake receives the source
- `platform-internal`: work belongs inside an existing platform/internal source
  boundary
- `non-source-work`: governance, planning, risk, metadata, verification, or
  operational work where no source repo is required

The Intake projection must show the custody class, owner, repo/source ref when
applicable, repository gate state, and rationale. Delivery Intake may receive
only resolved or not-required custody. If the repository/source-custody gate is
still unresolved, the item belongs in Proposal, Prototype, or Repository
admission rather than Delivery Intake.

After consume, the Delivery package read model must carry `source_custody` as
stable package context. Downstream Delivery surfaces receive that context, but
they should only render it when it helps the operator make or audit a decision.
Catalog does not consume package source custody.

Execution-time source custody repair is a separate concern from Intake. If an
operator discovers during active Delivery execution that a work item now needs a
repo owner, the console must not free-text that value into the work item. The
resolved path is:

1. Repository admits or links the repository record.
2. The operator uses Delivery Catalog Owner Repo to add the catalog entry, link
   it to the admitted repository, and then run the backend value sync.
3. Execution applies the selected Owner Repo value to the live Delivery work
   item through the OOS work-item update route.

The Owner Repo Catalog request must select an admitted Repository record. It
must not accept a free-text repository slug as the source of truth. The Catalog
value label and key derive from the selected Repository record; the request
receipt keeps the repository ref so the later backend sync has a clear link.

The current backend supports the final Delivery work-item `owner_repo` update.
The backend Owner Repo catalog add/link/sync route is a future capability
requirement and must not be presented as live-supported until that route exists.

If active execution discovers that the work tree itself is missing a child,
uses the wrong parent, or needs bounded item metadata repair, Execution owns the
operator-facing edit action. Future live wiring must use the existing OOS
Delivery work-item create, update, and move routes. Repository and Catalog are
not involved unless the edit also requires a missing repository or catalog
value.

## Source Shape

Delivery uses the implemented source tree recorded in
`delivery-source-tree.contract`:

```text
src/domain-workspaces/delivery/
  index.ts
  local-runtime/
    persistence/
    transitions/
  work-model/
    refinement/
    work-design/
  presentation/
    workspace/
    package-register/
    shared/
    surfaces/
    workflows/
  product-adapters/
  read-model/
    fixtures/
    projections/
    selectors/
    terms/
    types/
```

Delivery-hosted product-app source:

```text
src/product-apps/
  context-board/
    context-board-core.ts
    context-board-model.ts
    context-board-rendering.ts
    context-board-snapshot-capture-surface.tsx
    context-board-starter-helpers.ts
    context-board-template-helpers.ts
    context-board-workbench-view.tsx
    context-board-workbench.module.css
    index.ts
    use-context-board-controller.ts
  build-tree/
    build-tree-advisor.ts
    build-tree-controller.ts
    build-tree-core.ts
    build-tree-editor.module.css
    build-tree-editor-tree.module.css
    build-tree-editor-tree.tsx
    build-tree-editor.tsx
    build-tree-model.ts
    build-tree-scaffold-dialog.module.css
    build-tree-scaffold-dialog.tsx
    build-tree-scaffold.ts
    build-tree-target-selector.tsx
    build-tree-view-contract.ts
    build-tree-view-model.ts
    build-tree-viewer.module.css
    build-tree-viewer.tsx
    index.ts
```

This source shape is the enforced Delivery source-tree path baseline.
Additional architecture roots are not allowed without an explicit contract
change and matching guard update. Placeholder layers are not part of the
contract.

## Implementation Baseline

Source ownership facts:

- `presentation/workspace/` owns the fullscreen Delivery workspace shell, nav,
  workspace summary, and route-level composition. Workspace count, status, and
  summary projections are split into focused model files while
  `workspace-view-model.ts` remains the public facade.
- `presentation/surfaces/` owns the six operator screens selected from the
  Delivery nav.
- `presentation/surfaces/catalog/` keeps `catalog-view-model.ts` as the public
  surface barrel while implementation ownership is split into selectors, draft
  model, display model, mutation types, and mutation application files.
- `work-model/` owns shared Delivery workflow, session, and artifact DTOs used
  across presentation, product adapters, and local runtime.
- `presentation/workflows/work-design/` owns the Work Design hub, workflow
  session, session controller, step router, Context Board host, Build Tree
  host, draft review, apply draft, and history. It consumes local persistence
  through `local-runtime/` and shared DTOs through `work-model/`.
- `presentation/workflows/work-design/artifacts/context-brief/` owns the
  finalized context brief, snapshot evidence, saved context summaries, and
  handoff evidence dialogs used across Work Design steps and package actions.
- `presentation/workflows/work-design/support/` owns Work Design-local support
  that is shared by multiple Work Design owners but is not a routeable step,
  embedded product, or artifact. Current support includes blocker recovery adapter
  models.
- `presentation/workflows/refinement/` owns the Refinement hub, workflow
  session, session controller, metadata editor, readiness review, apply, and
  receipt/history. It consumes local persistence through `local-runtime/` and
  shared DTOs through `work-model/`.
- `presentation/workflows/shared/package-actions/` owns selected-package action
  routing and handoff evidence helpers.
- `presentation/workflows/shared/blocker-recovery/` owns shared Delivery
  blocker recovery dialogs and model behavior. The recovery workbench composes
  problem, action/note, result, advisor, and action-info panels from focused
  files.
- `domain/` owns canonical Delivery concepts, states, invariants, and exported
  business type declarations. `read-model/delivery-read-model.ts` owns only the
  composed projected UI input shape.
- `read-model/fixtures/` root contains ownership folders only. Root fixture
  imports must go through family composers such as `fixtures/catalog`,
  `fixtures/board`, `fixtures/packages`, `fixtures/intake-sources`,
  `fixtures/selected-package`, `fixtures/apply-intents`, and
  `fixtures/audit-events`.
- Each fixture family keeps `index.ts` as the public barrel. Implementation
  files use `*.fixture.ts` so the file tree remains explicit without returning
  to flat, noisy filenames.
- `read-model/fixtures/catalog/` owns Delivery Catalog projection status,
  summary counters, groups, items, values, and authority metadata.
- `read-model/fixtures/board/` owns board summary, family map, and ART tree
  fixture readback.
- `read-model/fixtures/intake-sources/` owns accepted-source Intake fixture
  rows.
- `read-model/fixtures/packages/` owns package list composition, common package
  actions, phase package fixtures, Work Design scenario package fixtures,
  Work Design package helpers, and Refinement packet helpers.
- `read-model/fixtures/selected-package/`, `apply-intents/`, and
  `audit-events/` own selected package, action intent, and audit event fixture
  data.
- `read-model/projections/root-projection.ts` should remain a composition shell
  that imports typed read-model fixtures and exports the active Delivery read
  model.
- `local-runtime/` owns prototype-local persistence and transitions between
  Intake, Work Design, and Refinement.
- `presentation/package-register/` is Delivery-local. It is not yet a fully
  generic shared register because it is tied to Delivery package workflow
  routing.
- Context Board and Build Tree have neutral product-app cores. Work
  Design Context Board core, rendering, template, and starter adapters live
  under `product-adapters/context-board/`; Context Board owns the board model,
  interaction state contracts, read-only snapshot capture renderer, and shared
  workbench stylesheet. Work Design aliases the product-owned board contracts.
  Context Board also owns the live controller hook and neutral workbench view.
  Work Design injects Context Board core nodes, starter factories, fingerprint
  creation, board copy, rail content, and source overlay content at the
  controller/view host edge so the product-app code does not derive Delivery
  package, decision, source, starter-copy, or operator-note context itself.
  Work Design-specific brief state, decision options, source chips, and advisor
  rail copy stay in Delivery-owned rail/source components and the intentional
  Work Design host adapter.
  Build Tree owns its editor frame, editor tree renderer, read-only viewer,
  target selector, controller helpers, scaffold helpers, scaffold dialog
  surface, and neutral structured tree presentation.
- Work Design does not use step, session, controller, model, or view-model
  convenience barrels. Consumers import concrete files unless the folder is a
  true public boundary such as the workflow entry point, a shared workflow
  package, a durable artifact API, or an embedded product-app API.

## Normalization Baseline Decisions

- Home uses focused panel-family projection files for workspace status,
  attention queue, recent activity, and agent response projection.
  `home-view-model.ts` is the thin composition and public import point.
- Catalog uses visible config/control ownership boundaries. Selection and
  local draft state live in `use-catalog-control-state.ts`, while selector,
  current values, inspector, current-value table, mutation model, and mutation
  dialog ownership are split into focused files.
- Work Design and Refinement use the workflow folder grammar. Differences are
  valid only when tied to a real domain boundary, not file-size convenience.
- Work Design context brief is the correct artifact boundary. Finalized brief
  projection, fingerprinting, snapshot attachment modeling, board snapshot
  generation, finalized brief rendering, evidence wrapping, and record-reference
  details, saved-session state, handoff rows, and finalization requirements live
  in focused files. `use-work-design-context-artifacts.ts` is the
  composition hook.
- Work Design's session controller is an accepted composition root. It
  wires focused state, artifact, product-host, lifecycle, apply, and dialog
  owners into modal props; it must not be split by line count alone. Cleanup
  must split a hidden owner only after proving the controller owns a
  second state machine, projection family, command authority, or rendered
  subview.
- Work Design's session step router and session dialog router are accepted
  composition roots. They unpack focused hook outputs and route props into
  owned step/dialog components; they should not own independent panel
  rendering, projection families, or command authority.
- `local-runtime/persistence/` owns prototype-local persistence. Do not
  rework the persistence shape during visual or structure normalization. A
  durable persistence redesign requires a separate recorded design decision
  because future backend/OOS wiring may replace this localStorage adapter.
- Work Design work-model keeps persisted snapshot/session and
  artifact-oriented Context Board DTO aliases only. Transient Context Board
  interaction aliases used by Work Design session code come from the Context
  Board product-adapter facade.
- Refinement's metadata draft step keeps many local subcomponents. That is
  acceptable only while they are step-local. Product-app viewer/selector host
  behavior must be classified explicitly instead of hidden in a step file.
- Execution Board's Control Board integration is a product-app boundary case
  and must not be copied as a general import pattern.

These decisions define the Delivery reference baseline for future Operation
Workbench normalization passes.

## Architecture Ratchet Rule

Delivery uses the strongest accepted engineering model that is implemented in
code, not a fictional future tree, as the target contract.

`domain/`, `read-model/`, `work-model/`, `product-adapters/`,
`local-runtime/`, and `presentation/` are the only final Delivery architecture
root classes. `index.ts` is allowed only at real public boundaries, not as a
default folder scaffold.

These are the only final Delivery architecture root classes.

Legacy root folders are not allowed:

- `workspace-shell/`
- `surfaces/`
- `workflows/`
- `shared/`

These legacy roots must not be described as the target architecture, expanded
as the preferred home for new Delivery code, or normalized as if the old shape
were final.

New Delivery structure work must do one of these:

- keep code inside the implemented final architecture roots
- preserve established behavior while tightening a recorded owner boundary
- add or update a guard that proves the baseline boundary

Guards must prove the Delivery baseline contract. A guard that only proves a
legacy-compatible path is not valid Delivery source-structure evidence.

## Engineering Model

Delivery should be organized by responsibility, not by historical file
placement or modal shape.

Target dependency direction:

```text
domain
  <- read-model / work-model / product-adapters / local-runtime
  <- presentation
```

Rules:

- `domain/` owns Delivery business concepts, state names, invariants, and
  finite transition rules.
- `read-model/` owns typed UI input, fixtures, selectors, projections, terms,
  and source-truth labels.
- `work-model/` owns Delivery workflow, session, and artifact DTOs shared by
  presentation, product adapters, and local-runtime, plus pure command and
  transition preparation when those rules are not canonical domain state and
  not React presentation state.
- `product-adapters/` maps Delivery package/workflow data to product-app
  contracts and maps app outputs back to Delivery contracts.
- `local-runtime/` owns prototype-local storage, command receipt factories,
  local projection stores, local receipts, local transitions, mock command
  responses, and reconciliation helpers.
- `presentation/` owns React surfaces, workflow modals, panels, local layout
  CSS, and Teras composition.

Forbidden dependencies:

- domain importing React, CSS, Teras, localStorage, product apps, or UI copy
- product apps importing Delivery internals
- read model importing presentation
- local runtime owning canonical Delivery rules
- presentation computing canonical posture, action eligibility, route
  authority, receipt authority, or source-of-truth state

## Source Structure

The canonical full source-tree contract is
`delivery-source-tree.contract`. That file is the strict source of truth for
Delivery folder and file architecture. Do not maintain a second full tree in
this narrative document; duplicate trees drift. The source-tree contract records
the semantic final names, workflow step folders, product-app host boundaries,
read-model split, local-runtime split, and presentation ownership. Normalized
extraction grain is governed by the Operation Workbench normalization rules and
the baseline decisions in this document and the source-tree contract.

## Product-App Boundary

Context Board and Build Tree are product apps, not Teras primitives and not
Delivery internals.

Delivery is their first integration customer. Delivery owns:

- when each app is available in Work Design
- the selected Delivery package context passed into each app
- mapping Delivery package data into app input
- mapping app output into Delivery brief, tree, draft, review, receipt, and
  handoff structures
- workflow dirty state, apply gating, and receipt behavior around app outputs

Product apps own:

- neutral app models
- board or tree document behavior
- board geometry, connector, template, sketch, rendering, export, and snapshot
  helpers
- tree operations, scaffold helpers, scaffold dialog surface, advisor protocol,
  view-contract helpers, and controller helpers
- future standalone app shells and CSS after a separate design pass

Product apps must not import:

- `domain-workspaces/delivery/*`
- Delivery read models
- Work Design private session internals
- Delivery CSS
- Operation Workbench domain internals

Delivery may import product apps only through public product-app barrels or
Delivery-owned adapters.

## Surface Naming

Surface folder names should name the operator surface:

- `home`
- `intake`
- `work-design`
- `refinement`
- `execution` or `execution-board`
- `catalog`

Do not name primary surface folders after internal widgets such as
`work-design-register` or `refinement-register`. A register is a component or
presentation subfolder inside a surface, not the surface identity.

## Read Model Rule

Delivery UI consumes typed projected data. Components must not independently
own or recompute:

- package posture
- action availability
- selected-package workflow state
- catalog authority
- route authority
- receipt authority
- source freshness
- audit event truth

`projections/root-projection.ts` remains a composition shell over
`read-model/fixtures/`, with its composed input shape declared by
`read-model/delivery-read-model.ts` from canonical `domain/` types.
`read-model/selectors/` owns selectors and `read-model/terms/` owns copy terms.
Package fixture lists are split by package phase, and the root projection must
not regain package helper logic, selector logic, workflow logic, or
presentation imports.
Refinement fixture target bindings must point at nodes that exist in that
packet's target tree; `target_node_ids`, `target_values`, and `target_statuses`
must not carry stale ids from a different generated tree.

## Local Runtime Rule

Prototype-local behavior is allowed, but it must stay visibly separate from
durable backend truth.

Local runtime owns:

- localStorage-backed session persistence
- command receipt factories
- local projection stores
- local receipts
- local transition helpers
- mock command results
- local reconciliation helpers

Workflow session controllers may compose the persisted session object, but
`localStorage` IO and persistence normalization live under
`local-runtime/persistence/`. Presentation workflow files must not call
`window.localStorage` directly.

Local runtime must not be described as backend truth, durable receipt truth, or
OpenProject mutation authority.

Prototype-local Delivery history may report an apply or blocker disposition as
recorded only when an immutable local receipt identity exists. A persisted
boolean or timestamp without its receipt id is not apply evidence and must
normalize back to pending. Retried local receipt creation reuses the original
receipt identity and timestamp instead of rewriting history.

## Workflow Rule

Delivery workflows use hub and session concepts:

- the surface register selects a package
- the hub shows selected package context, current required move, status, and
  available workflow routes
- the workflow session owns bounded draft/review/apply/receipt work
- completed or terminal states remain reviewable
- editable controls lock only when the state requires it
- final mutation intent requires an explicit review/apply/receipt boundary

Work Design and Refinement do not need identical internal files, but they must
express the same ownership pattern: model, view model, session state, session
controller, shell/progress, visible step folders, dialogs, and history/receipt
access.

Routeable Work Design and Refinement step entrypoints must be visible under
`steps/` as named folders, not dumped as flat files in the step root.
Embedded products may remain separate when they are real product-app
integration boundaries, but workflow session and session-controller code must
call them through step facades such as `steps/context` and `steps/build-tree`
instead of importing `embedded-products` directly.

Dialog placement follows ownership, not component type. Step-specific dialogs
stay in the owning step folder, embedded-product dialogs stay with the
embedded product, artifact dialogs stay with the artifact, and session-wide
guards or checkpoint dialogs stay under `session/dialogs`. Work Design must
not use a top-level `dialogs/` bucket.

Work Design-local shared code must use sharper ownership names instead of a
generic shared bucket. Durable workflow outputs live under `artifacts/`; local
multi-owner helpers, adapters, and styles live under `support/`.

## Package Actions

Package actions are selected-package operations opened from Execution Board
context. They are not generic workspace actions.

Rules:

- action availability comes from package posture and backend gates
- quick actions prepare or open a draft; they do not mutate ART directly
- final mutation requires guarded apply review and receipt
- package-level actions and child-target actions stay separate
- `Start Work` targets a selected executable child target, not silently the
  package Epic
- defer, retire, continue, closeout, and blocker actions must show scope and
  impact before apply
- every mutation result maps to a visible receipt category: accepted, blocked
  by gate, rejected, apply failed, or projection sync required

## Catalog

Catalog manages Delivery-domain reference data as a peer Delivery surface.

Catalog read-model groups are:

- planning
- classification
- organization
- metadata
- board
- evidence

Definitions and values are separate layers. Definitions identify what is being
managed; values are allowed entries. Values that are policy-fixed
or owned elsewhere are owner-routed and muted for mutation.

Catalog values that cannot be safely created through the console must show the
owner route instead of pretending the console can mutate them directly.

Owner Repo is a catalog value with a cross-surface source. Repository owns repo
creation, admission, retirement, and repository lifecycle. Delivery Catalog owns
the operator-controlled add/link/sync workflow that makes an admitted repository
selectable by OOS/OpenProject as `owner_repo`. Execution may only apply values
that the Catalog/backend value layer exposes as accepted.

## Baseline Maintenance Rules

Delivery architecture changes must happen in small no-behavior slices unless a
separate design decision approves behavior or visual change.

Required maintenance discipline:

1. Keep `delivery-source-tree.contract` aligned with every source-tree change.
2. Keep guards aligned with the baseline contract instead of preserving stale
   baseline wording.
3. Split files by owner boundary, not by line count.
4. Route local workflow and persistence behavior through `local-runtime/`.
5. Route Delivery product-app integration through `product-adapters/` and
   explicit `embedded-products/` host edges.
6. Keep React and Teras composition inside `presentation/`.
7. Keep compatibility re-exports only at true public boundaries.
8. Keep Context Board and Build Tree app-shell extraction as a separate design
   pass.

Each slice must preserve established Delivery behavior and visual output unless an
inconsistency is found and discussed first.

## Validation Targets

Delivery architecture validation proves:

- product apps do not import Delivery internals
- Delivery imports product apps only through public barrels or adapters
- domain modules do not import React, CSS, Teras, localStorage, or product apps
- presentation modules do not own source-of-truth state
- local runtime is visibly local and not durable backend truth
- read-model fixtures are structured and not component-local object dumps
- Work Design and Refinement share the same ownership pattern even when their
  workflow content differs
- Delivery root exposes only the domain public API

## Non-Goals

Delivery must not:

- own Proposal capture or route selection
- own Repository admission
- own Prototype baseline approval
- become a generic lifecycle-transition authority for other domains
- turn Context Board or Build Tree into Teras primitives
- hide backend mutation behind local prototype state
- treat a current folder layout as correct merely because it renders today
