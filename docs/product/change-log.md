# Governance Operations Console Change Log

Status: current product change log.

Historical entries describe the architecture that existed when each change was
made. They do not override current contracts. Active lifecycle-transition truth
lives in `surface-contracts/lifecycle-transitions.md`.

## 2026-08-25

- Added the server-only Console adapter for OOS Prototype Delivery application
  and readback using an exact Workspace Prototype Studio packet.
- Added strict packet/result binding, deterministic replay behavior,
  fail-closed conflict and malformed-result handling, and receipt-bound
  Prototype graduation projection.
- Reconciled the current architecture with the admitted OOS behavior: OOS now
  creates or reuses the Delivery Epic, while Delivery Intake continues the
  admitted target instead of acting as a second target-creation decision.
- Kept Prototype packet discovery, the Delivery live register projection,
  authenticated human identity, deployment, and security acceptance outside
  this bounded Console slice.

## 2026-08-16

- Connected Proposal to the admitted Operator Orchestration Service contract
  through server-only same-origin routes for list, capture, projection,
  command, and history behavior.
- Added bounded visible-page polling, canonical projection and receipt mapping,
  version-bound commands, and fail-closed write behavior when a configured OOS
  source is unavailable.
- Preserved an explicit disconnected-preview mode for local development without
  presenting fixture records or local receipts as canonical backend truth.

## 2026-07-31

- Transferred the approved application baseline and product records into the
  durable `governance-operations-console` owner repository.
- Preserved loopback-only preview, fixture-backed workflows, read-only host
  telemetry, local receipts, synthetic identity, and the absence of live
  backend, runtime, release, or security authority.
- Replaced Prototype Studio root-path assumptions with owner-repository
  contracts, validation, and source-graduation provenance.

## 2026-07-30

- Added a canonical machine-readable Console architecture model, seven
  coverage-validated projections, and a repository validation target.
- Replaced the former single diagram record in the active read order and
  corrected Proposal completion, generic Workspace Intake, active inventory,
  and Portfolio publication ownership across active contracts.
- Removed the short-lived product-only intake Workbench domain. Generic repo,
  product, and component classification now remains an embedded Workspace
  Governance workflow, separate from active-inventory promotion.
- Replaced Portfolio Admission source, fixtures, commands, projections, tests,
  and guards with Publication over active Workspace product identity. The
  Console still performs no live Workspace Governance or Portfolio mutation.
- Added the approved Governance Operations Console design-baseline record,
  promoted the Prototype Studio registry lifecycle to `baseline-approved`, and
  bound the focused merged security review.
- Updated current lifecycle records so the approved local baseline remains
  distinct from live integration, deployment, security acceptance, and source
  graduation.

## 2026-07-29

- Added typed `console-operator-identity/v1` and
  `console-operator-account/v1` sources, fail-closed trust projection, a compact
  dock-aware Operator Account card, and a functional account center for local
  profile preferences, access inspection, and authentication/session command
  posture. The current source remains explicitly synthetic and unauthenticated.
- Profile save and reset now update page-lifetime Console presentation and the
  command clock with dirty-close protection. Access requests, account
  switching, sign-out, authentication management, and session revocation remain
  disabled until admitted owner adapters exist. No credential, token, real
  identity, external service, canonical mutation, or Console-owned identity
  store was introduced.

## 2026-07-26

- Accepted the Environment Lifecycle Baseline Foundation operator and architecture
  contract. The surface is an expanded main-Console capability with separate
  Dev Integration and Governed Releases views, profile and product dashboards,
  a three-step profile request, product-capability-gated release paths, and
  explicitly separated profile, runtime, command, handoff, release, and
  product-lifecycle states.
- Recorded the future command boundary through admitted OOS workflow APIs and
  Platform-owned runners or product adapters. No UI, backend, runtime,
  environment record, security authority, stage, production, or canonical
  mutation changed in this contract-only slice.
- Added the six-phase Baseline Foundation implementation sequence and the separate
  post-baseline adapter sequence. Environment Lifecycle implementation now
  starts from structured models and fixtures rather than presentation.
- Completed Environment Lifecycle Baseline Foundation Phase 1. Typed profile, request,
  product capability, command, receipt, selector, and fixture boundaries now
  preserve profile lifecycle, runtime observation, release capability, and
  synthetic-scenario provenance as independent truth. Focused tests, the full
  semantic suite, typecheck, architecture guards, and prototype validation
  pass without adding a mounted surface or live mutation.
- Completed Environment Lifecycle Baseline Foundation Phase 2. The main Console now
  mounts one expanded Environment Lifecycle entry with exactly two peer views:
  Dev Integration and Governed Releases. Both views use authority-shaped
  fixture projections and real derived counts through a shared, product-neutral
  connected Console surface; Environment Lifecycle remains outside Operation
  Workbench, carries no local CSS or Teras dependency, and exposes no
  placeholder mutation.
- Completed Environment Lifecycle Baseline Foundation Phase 3. Dev Integration now uses
  shared Console controls for its searchable and filterable profile register,
  stable Overview/Runtime/Stage Handoff dashboard, secondary history view, and
  guarded three-step request workflow. A submitted request creates only a
  prototype-local `proposed` projection; runtime actions and promote-check
  execution remain visibly disconnected until Phase 5.
- Completed Environment Lifecycle Baseline Foundation Phase 4. Governed Releases now
  uses a searchable, three-filter product register and stable product dashboard.
  OpenClaw exposes only its descriptor-backed current release action and
  product-owned runtime lifecycle states through guarded two-step drafts.
  OpenProject remains inspectable with its platform-integrated evidence and
  operator route but exposes no invented product release workflow. Final
  execution remained disabled pending the Phase 5 runtime.
- Completed Environment Lifecycle Baseline Foundation Phase 5. One Environment-owned
  in-memory runtime now accepts typed profile requests, profile actions,
  promote checks, product release actions, and product runtime-lifecycle
  actions. Idempotent command admission, expected-source checks, ordered
  operation events, immutable prototype-local receipts, effective-state
  replay, safe logs, failure, retry causation, and correlation reconciliation
  are shared by both peer views. Source fixtures remain immutable, no live
  endpoint or external repo is mutated, and Live Integration and Deployment authority remains
  deferred.
- Completed Environment Lifecycle Baseline Foundation Phase 6. Final inspection and
  correction now separate human operator guidance from declared execution
  adapters, fail closed on unavailable adapters, preserve actor, workflow
  owner, capability, and adapter identity in operations and receipts, retain
  failed submissions on Review with explicit recovery, expose correlated
  history, and complete the stable profile and product projections. Shared
  Console Shell tabs and dialogs now provide linked tab-panel semantics,
  keyboard focus containment, restoration, and background scroll containment.
  Focused tests, all semantic tests, whole-console architecture guards,
  prototype validation, typecheck, and source diff checks pass without a build
  or live authority mutation.
- Added an Environment Lifecycle architecture guard covering direct Console
  mounting, the two-view/no-Home contract, default-versus-scenario fixture
  separation, Workbench exclusion, Console Shell presentation ownership,
  workflow-step boundaries, adapter and receipt identity, failure recovery,
  accessibility, and the live-authority boundary.

## 2026-07-24

- Completed Lifecycle Transitions cutover. The Console Shell now mounts the
  read-only three-route overview and connected receipt detail tray, with
  owner-workspace routing only where an admitted console surface exists.
- Removed the historical Movement Control component, five-lane fixture,
  scenario state, generic decision modal, global lane/decision styling, and
  stale guard/test expectations. Prototype source packet projection now names
  Delivery ingress as its target instead of a nonexistent Movement Control
  domain.
- Added the unmounted Lifecycle Transitions Phase 1 foundation. Typed source,
  validation, admission, named-authority, orchestration, application, failure,
  return, defer, cancel, and supersession artifacts now project through one
  pure state machine for the three locked routes.
- Added structured prototype-local scenarios and focused semantic coverage for
  Proposal-to-Prototype application, Proposal-to-Delivery Intake admission,
  Prototype-to-Delivery application, source return, authority wait, and
  technical retry ownership. No UI, CSS, domain projection, live adapter, or
  backend behavior changed.
- Renamed the active cross-surface contract path from the stale
  `movement-control.md` filename to `lifecycle-transitions.md` before the
  replacement cutover.

## 2026-07-23

- Replaced the active Portfolio architecture with a managed-product admission
  and publication contract. Portfolio now composes product-registry,
  product-owned manifest, Platform, Security, release, Delivery, and WGCF
  evidence into one durable product entry.
- Removed Portfolio as a Prototype graduation target and removed arbitrary-item
  posture registration from the active Proposal, Prototype, lifecycle,
  architecture-diagram, and operating-model direction. Prototype Preview
  Runtime remains the early-visibility path.
- Reopened the existing Portfolio UI and fixtures because they implement the
  rejected posture-control model. No UI, fixture, runtime, backend, mutation,
  Teras, or live-adapter change was made in this contract-only slice.
- Added independent Portfolio segment, product form, listing scope, access
  class, client reference, and controlled-tag semantics. Recorded the required
  post-baseline Workspace Delivery ART child for Workspace Governance to own the
  machine vocabulary, schema validation, migration, and compatibility evidence.
- Added the Baseline Foundation Product Portfolio fixture envelope, provenance modes,
  sixteen-scenario coverage matrix, and projection invariants. No fixture code,
  UI, runtime, backend, or live product authority changed in this record-only
  slice.
- Implemented the Portfolio publication projection, normalized product read
  model, admission history summary, admission decision command, listing
  curation command, structured local receipts, and focused semantic coverage.
- Accepted the replacement fullscreen Products, Admission, and Curation shape.
  Replacement presentation and direct cutover remain pending; the obsolete
  mounted surface is unchanged in this slice.
- Added the unmounted fullscreen Product Portfolio shell and Products register
  using existing Teras primitives only. The mounted obsolete Portfolio surface
  remains unchanged pending the rest of the replacement.
- Added the unmounted Product Dashboard and Curation surface using existing
  Teras primitives only. Product detail, operations, history, product access,
  listing cohorts, permitted scopes, relative placement, dirty-exit handling,
  and listing commands derive from structured Product Portfolio truth. The
  obsolete mounted surface remained unchanged for the next replacement phase.
- Added the unmounted Admission register and focused Checks/Decision/Result
  session using existing Teras primitives only. Admission state, requirement
  checks, source-owner repair routes, listing correction, controlled rejection,
  duplicate bypass, dirty-draft protection, and local receipts derive from the
  structured Product Portfolio model. The obsolete mounted surface remains
  unchanged pending direct cutover.
- Completed direct Product Portfolio cutover. Operation Workbench now opens the
  fullscreen Products, Admission, and Curation workspace; admission and listing
  commands use the prototype-local runtime boundary and effective projector.
  Removed the obsolete posture-control surface, movement handoff, fixtures,
  runtime, tests, and guard expectations.

## 2026-07-21

- Split Console delivery into an independently measured Baseline Candidate
  program and Post-Baseline Implementation and Graduation program. Added the
  exhaustive current capability checklist, made unresolved product semantics a
  baseline blocker, and kept live APIs, identity enforcement, durable
  orchestration, canonical mutation, governed runtime activation, migration,
  and graduation explicitly post-baseline.
- Replaced the prior mixed active backlog with the Baseline Foundation completion order
  and a separate deferred Live Integration and Deployment ledger. No UI, runtime, backend, data mode,
  mutation boundary, or source ownership changed.

## 2026-07-22

- Locked Prototype-to-Delivery as the first outbound route-specific graduation.
  The accepted path uses `Prepare Delivery Handoff`, shared validation,
  automatic Delivery ingress admission, normal Delivery Intake Consume, a
  continuation-aware Work Design handoff, and a final receipt that proves the
  Delivery shell, reciprocal backlinks, and durable source custody.
- Removed the route from the pending transition matrix and recorded that the
  stale Movement Control target is replaced rather than renamed. No UI,
  backend adapter, durable mutation, or runtime authority changed.

## 2026-07-17

- Completed Phase 5 whole-console style isolation without redesigning broader
  surfaces. Removed conservatively unreachable Operation Workbench and retired
  modal CSS from `globals.css`, reducing it from 29,310 lines, 737,360 bytes,
  and 3,822 rules to 5,998 lines, 143,650 bytes, and 789 rules while retaining
  active Console Shell, Command Center, Runtime Readiness, Movement Control,
  and Agent Console styling.
- Replaced Agent Console's four retired modal-class checks with the stable
  `data-teras-modal` shell contract and added a focused global-CSS ownership
  guard covering stylesheet parsing, one root mount, forbidden
  Operation-domain selectors, retired modal selectors, and bounded size/rule
  growth. Full architecture guards, typecheck, 154 semantic tests, and the
  Prototype Studio validator pass; no build, Playwright run, backend mutation,
  new primitive, PR, or push was introduced.
- Completed Phase 4 of whole-console structural extraction without changing
  accepted visual or runtime behavior. Runtime Readiness now separates its
  model, fixture-backed scenarios, pure component/resource/alert projections,
  WSL polling state, presentation, `/proc` host adapter, and HTTP handler.
  Agent Console now separates model status, polling state, interaction
  controller, presentation, request-admission policy, Ollama transport, and
  HTTP handler.
- Kept both Next.js API route files as thin capability mounts, split the
  Runtime Readiness focus and panel renderers, and reduced the Agent dock to a
  presentation-only renderer. Added focused boundary guards and semantic
  coverage for telemetry calculations, alert/environment projection, bounded
  prompt construction, and secret-like input rejection. The preview root and
  both API mounts returned `200`; no visual change, build, Playwright run,
  backend mutation, new primitive, PR, or push was introduced.
- Completed Phase 3 of whole-console structural extraction without changing
  accepted visual or runtime behavior. Reduced `src/app/page.tsx` from 1,169
  lines to a seven-line `GovernanceConsoleShell` mount. Console Shell now owns
  the command bar, controller, cross-capability focus router, context
  propagation, event-log fixture and presentation, and accepted major-surface
  composition. Operation Workbench now owns its selector presentation and the
  exhaustive then-seven-domain host.
- Removed the duplicated page implementations after the new Shell compiled,
  changed domain contracts and cross-capability presentation to use acyclic
  leaf dependencies, and added focused Shell composition guards plus semantic
  event-fixture coverage. No visual change, backend wiring, new primitive,
  build, PR, or push was introduced.
- Completed Phase 2 of whole-console structural extraction without changing
  accepted visual behavior. Moved Workspace Pulse, System Mood, priority
  briefing, decision-scenario projection, and Command Center dev-state
  presentation behind the Command Center public boundary. Moved the unchanged
  cockpit panel and status helpers to Console Shell because Command Center,
  Workbench selection, focus routing, and the console event log share them.
- Reduced `src/app/page.tsx` from 2,461 to 1,169 lines by removing moved
  Command Center implementation plus unused Desk form/source helpers and the
  unreachable pulse-detail modal. The page still owns cross-capability focus
  routing, top framing, event-log composition, and remaining shell state for
  the next structural phase. Added a focused Command Center boundary guard and
  pure view-model semantic tests.
- Completed Phase 1 of whole-console structural extraction without changing
  accepted visuals or operator behavior. Removed `src/data/today.ts` instead
  of renaming it, deleted its dead Proposal, Repository, Prototype, and generic
  signal fixture branches, and moved active Command Center, Console Shell,
  Runtime Readiness, and temporary Movement Control fixture truth beside the
  capability that owns it.
- Derived Operation Workbench selector identity and order from the typed domain
  registry, removed shell-owned domain workflow sessions and the obsolete
  Intake close-guard path, and renamed remaining shell selection semantics to
  describe the Workbench boundary rather than one domain. Added a focused
  whole-console source guard and semantic fixture-ownership tests. The route
  page, cross-surface presentation monoliths, and global CSS remain explicit
  work for later structural phases.
- Completed the whole-Operation Workbench host proof without changing the
  accepted domain visuals. Added one typed then-seven-domain registry, exhaustive
  selector routing with no undeveloped fallback, narrow public workspace
  boundaries, consistent host metadata for portal-rendered surfaces, a focused
  architecture guard, and registry semantics tests. Delivery and Prototype
  public exports were narrowed so route composition no longer imports their
  private controller or read-model implementation.
- Removed the generic Risk / Exception Workbench path, route, domain contract,
  placeholder source, and eighth selector slot. Added the cross-cutting
  authority-decision request and receipt contract, aligned active architecture
  records with named canonical authorities, and added a focused guard that
  prevents the generic domain from returning.
- Completed Model Operations normalization and validation. The stable profile
  dashboard now lives under the compact-domain dashboard boundary, focused
  dialogs are grouped by ownership, shared profile display semantics no longer
  depend on the primary surface, JSX consumes typed metadata projections, and
  the public barrel exposes only the workspace and contract. Added focused
  source, public-boundary, projection, and CSS guards; registered Model
  Operations in shared operation grammar and the normal semantic suite; and
  preserved the approved control and dashboard behavior without backend
  wiring, visual changes, local CSS, build, PR, or push.
- Completed Orchestration Phase 7 Cutover And Verification. Removed the
  unreachable placeholder fallback and stale surface-status projection,
  aligned Runs with the controller-owned register pattern, narrowed the domain
  public barrel to the workspace and contract, registered Orchestration as a
  completed operation in shared source and local-runtime boundary guards, and
  added focused source-structure, public-boundary, workspace, workflow,
  projection, and CSS guards. Direct Workbench entry, bounded surface
  composition, all fifteen synthetic scenarios, primitive-only styling, type
  safety, semantic tests, and the prototype validator are now the local
  completion evidence. No backend wiring, runtime authority claim, new Teras
  primitive, local CSS, build, PR, or push was introduced.
- Completed Orchestration Phase 6 Runs Register And Dashboard. Runs now use the
  standard full-workspace register, combined search plus run-state, definition,
  and source-domain filters, a rich selected launcher, and a stable large
  dashboard. The dashboard separates source-domain business state,
  orchestration state, and effect posture; keeps execution nodes inspectable;
  projects each queued, running, waiting, blocked, failed, completed, and
  cancelled condition truthfully; and keeps artifacts, operator-safe logs,
  receipts, source projection, runtime diagnostics, and structured events
  distinct. Retry, Resume, Provide Signal, Defer, and Cancel remain bounded by
  source-projected availability and record idempotent prototype-local receipts
  without mutating fixture truth or claiming live OOS execution. No backend
  wiring, local CSS, new Teras primitive, or arbitrary run-start action was
  introduced.

## 2026-07-16

- Completed Orchestration Phase 5 Design Orchestration with the shared wide
  Teras wizard. New operations, in-progress candidates, definition-ready
  records, and immutable active versions now enter one structured workflow
  with two-stage synchronous/conditional qualification or three-stage durable
  definition design. Qualify captures execution-boundary truth, Define covers
  six implementation-contract sections, the prototype-local advisor produces
  explicit apply/reject field patches, Review links findings back to their
  owning section, and the final stage records idempotent prototype-local
  qualification or implementation-request receipts. Browser-local continuity,
  draft-derived dirty state, and the shared close guard are connected without
  backend wiring, executable code generation, runtime activation, local CSS, or
  a new Teras primitive.
- Completed Orchestration Phase 4 Definitions with the standard full-workspace
  register and selected-record layout, combined search and three-filter
  control, retained synchronous and conditional qualification records,
  suspended and retired discovery, and a stable large Definition Dashboard.
  The dashboard now exposes bounded execution-node inspection, independent
  implementation/validation/platform/security/runtime admission checks,
  focused trigger, failure, evidence, and version-history inspectors, plus
  truthful immutable active-version and read-only suspended/retired behavior.
  Definition authoring and implementation-routing actions were intentionally
  deferred to the now-complete Phase 5 workflow.
- Completed Orchestration Phase 3 Home with the shared primary-side layout,
  detailed workspace posture, a bounded Attention Queue with search plus
  scope, condition, and owner filters, healthy non-duplicated in-flight runs,
  and structured material events. Overdue waits now move into Attention
  instead of remaining duplicated in In-flight.
- Completed Orchestration Phase 2: the Workbench now opens a direct fullscreen
  `Orchestration Workspace` with persistent numbered Home, Definitions, and
  Runs navigation, read-model-derived summary cards, the same truthful
  workspace-status signals on every peer surface, and stable direct close
  behavior. Removed the Orchestration placeholder mount and corrected stale
  monitoring-only and movement-ownership wording.
- Completed Orchestration Phase 1 foundation and scenario truth: structured
  definition and run projections, fixed summary selectors, all required
  synthetic scenarios, definition-design drafts and receipts, bounded
  run-control requests, idempotent prototype-local receipts, and scenario
  overlays. The visible placeholder is unchanged.
- Locked Orchestration as a direct Full Workspace Mode replacement with Home,
  Definitions, and Runs peer surfaces, persistent system posture, bounded
  surface-owned scrolling, and no legacy comparison toggle.
- Locked Home composition, Definitions register and Definition Dashboard,
  advisor-assisted Design Orchestration, Runs register and Run Dashboard,
  bounded run-control dialogs, evidence separation, structured fixture
  scenarios, source ownership boundaries, and the seven implementation phases.
- Reconciled the Workbench profile registry, design profile, implementation
  audit, backlog, decision log, system design, and architecture diagram so
  Orchestration is no longer described as awaiting visual-entry or composition
  discussion.
- Stress-tested the shared durable-orchestration contract against Delivery
  Refinement Apply, Prototype Landing, and Model Profile lifecycle work before
  beginning Orchestration UI design.
- Replaced the activity-only contract with a bounded execution-node model for
  activities, waits, and subworkflows, including conditions, skip reasons,
  authority evidence, concurrency locks, effect posture, artifacts, logs, and
  explicit source-domain projection.
- Removed `deferred` as a generic run lifecycle state. A defer control now
  creates a structured `waiting` condition with owner, reason, resume
  condition, and optional review date or deadline.
- Split Model Profile request/review state from executable fulfillment. Profile
  fulfillment, activation, suspension, and retirement are independent durable
  candidates under one family; ordinary review remains persisted OOS request
  state unless automatic continuation or timers justify orchestration.
- Recorded that Prototype Landing selects only definition-owned conditional
  setup nodes. Missing inputs and unresolved security triggers block preflight,
  while a future run owns structured progress, logs, artifacts, locks, and
  verified landing output.

## 2026-07-14

- Added the Operation Workbench durable-orchestration standard and locked
  current-domain use-case matrix. The standard keeps synchronous execution as
  the default and defines qualification, definition, ownership, activity,
  retry, recovery, evidence, security, versioning, run, and work-routing rules.
- Expanded Orchestration from a monitoring-only placeholder contract into an
  accepted Home, Definitions, and Runs architecture. `Design orchestration`
  produces an implementation-ready definition and request packet; it does not
  generate code or activate a runtime definition.
- Updated the Orchestration domain, cross-domain boundary, system design,
  architecture diagram, profile registry, backlog, read order, and decision log
  so the older monitoring-only direction cannot be treated as current truth.
- Locked Delivery Refinement Apply as the first recommended durable-definition
  pilot while preserving the rule that no Console workflow is currently
  admitted to Temporal-backed execution.
- Added the versioned orchestration-definition registry and completed
  `delivery.refinement.apply` v1 as the first definition-ready contract. The
  contract is source-derived from the current Refinement packet and OOS
  governance, plan-apply, and sequential bulk-update behavior.
- Locked Refinement Apply request integrity, preflight, three-operation
  mutation ownership, activity sequence, retry and timeout policy, forward
  recovery, effect-aware cancellation, canonical verification, source-domain
  projection, final receipt, and explicit runtime-admission gaps without
  changing UI or backend code.
- Moved Model Operations from the cross-surface set into Operation Workbench
  and replaced the narrow Provider Registry contract with a complete governed
  profile, caller-eligibility, dashboard, request, persistence, source
  structure, and cutover contract.
- Locked the future Request Profile path as an OOS-routed request workflow with
  Platform Engineering source ownership and Security Architecture acceptance.
  The current prototype exposes only a truthful disabled capability cue and
  does not create fake requests or receipts.
- Locked direct Model Operations replacement: the empty Workbench placeholder
  does not require a comparison toggle. Removed Provider Registry and fake
  readiness scenarios while preserving the agent-console-owned Console AI
  Runtime card and live companion panel for the two Console AI surfaces.
- Locked the Console's normal Prototype lifecycle to the clean steady-state
  model. The Console's own pre-system history is no longer treated as a reason
  to extend domain or lifecycle behavior.
- Isolated reconciliation between the current Prototype Studio record and the
  pre-existing Workspace Delivery ART record to a one-time, idempotent future
  live-wiring migration with durable evidence.
- Replaced route-by-route implementation as the active next priority with a
  whole-console code inventory and baseline plan. The shaped Delivery,
  Proposal, Repository, Prototype, and Portfolio surfaces remain inputs to that
  baseline; they do not make Operation Workbench or the Console complete.

## 2026-07-12

- Replaced the universal Movement Control decision-authority model with shared
  Lifecycle Transition Control: source intent, WGCF validation, target
  admission, Risk / Exception evidence, OOS execution, target application, and
  shared receipt projection remain separate authorities.
- Locked Proposal-to-Prototype and Proposal-to-Delivery as automatic validated
  transitions. Prototype receives a captured entry before Landing; Delivery
  receives an Intake source with `needs_consume`, while Intake Consume remains
  internal Delivery work.
- Recorded that no full Movement Control decision workspace or new backend
  service is approved.

## 2026-07-10

- Locked the pre-baseline Operation Workbench authority and artifact model:
  immutable primary/dependency snapshots, separate drafts/commands/runs/receipts,
  domain-owned projectors, and derived effective views.
- Added multi-source preconditions, adapter capabilities, action semantics,
  cross-domain custody packets, schema/order/retention rules, and explicit
  prototype-local versus post-baseline live boundaries.
- Added a focused shared architecture guard for the authority contract. No live
  adapter, backend endpoint, durable persistence, or cross-repo wiring was added.

## 2026-07-06

- Opened an explicit Teras normalization track after inspection showed the
  shared primitive layer had accumulated duplicate actions, ambiguous layout
  names, product-context wording, unused exports, and product-app-owned shapes.
- Recorded Delivery, Proposal, Repository, and Prototype Control as the
  current-shape operation surfaces to check before accepting Teras primitive
  changes.
- Added `teras-normalization-worklist.md` as the temporary active worklist for
  classifying, deleting, merging, renaming, and discussing Teras primitives
  before rewriting `teras-contract.md`.

## 2026-06-25

- Renamed the top-level Operation Workbench placeholder domain from Workflow to
  Orchestration to avoid confusing the domain name with domain-owned workflow
  steps and workflow-session modals.
- Added `orchestration-boundary-contract.md` to define the OOS request,
  run-projection, receipt, then-current Movement Control, and future Temporal adapter
  boundary without exposing Temporal as normal completed workspace UI copy.
- Updated the console code, operation workbench guard, Movement Control cue,
  and domain contract index to use the Orchestration domain boundary.
- Corrected Prototype replacement posture: the old comparison source is a
  reference artifact, not a capability matrix or parity target.
- Updated the Prototype contract, implementation audit, backlog, decision log,
  system design, and shared Operation Workbench temporary-legacy rule so the
  next Prototype pass focuses on workflow standardization before any legacy
  removal.
- Corrected the Prototype Preview boundary: Preview Runtime is now treated as
  a stable runtime surface with tabs and focused inspection dialogs,
  while preview proof is only local evidence consumed by Baseline Packet work.
  The earlier workflow-session direction for Preview Readiness is superseded.
- Recorded Prototype dashboard redesign as a separate phase: the dashboard becomes a
  selected-record cockpit that links to stable surfaces and the current required
  workflow, while workflows open separately as workflow-session wizards.
- Converted Prototype Preview Readiness from a shallow inspector dialog into a
  workflow-session modal with structured preview workflow state, selected
  prototype context, preview check result, recovery rows, progress selectors,
  and a local preview-check action guarded by the Operation Workbench architecture
  validator.
- Softened Prototype Preview Readiness operator wording so the modal uses
  readable preview-check language instead of raw state-machine labels.
- Converted Prototype Record Shaping from the old inspector dialog into a
  workflow-session modal with selected prototype context, current required
  move, record facts, controlled boundary fields, required fixes, and a local
  save action guarded by the Operation Workbench architecture validator.
- Corrected Prototype active workflow modal sizing to use the same wide
  workflow-session shell as Proposal active workflows, then shortened local
  panel copy and removed extra scope furniture to avoid cramped content.
- Restored the useful Record Shaping and Preview Readiness operator context
  after the wide shell correction, keeping only duplicate scope furniture out
  of the workflow body.
- Expanded the Prototype domain contract to separate request capture from
  landing, define support-profile classification, require landing scaffold/tool
  decisions, split lifecycle movement into transition-specific workflows, and
  clarify that Prototype may record design-baseline acceptance while Movement
  Control owns custody, runtime, visibility, graduation, retirement, defer, and
  accepted-risk decisions.
- Updated the active backlog and implementation audit so the next Prototype
  source slice starts with Landing rather than continuing from request capture
  directly into generic record-shaping.
- Implemented Prototype Landing as its own workflow-session slice: request
  records now carry structured landing plans, the dashboard opens Landing before
  record shaping, local landing receipts update the projection, and the dashboard
  shows Landing as done after the plan is recorded.
- Converted Prototype Baseline Packet into a workflow-session slice with a
  packet model, evidence, gap, and packet-result steps, local packet receipt
  action, and architecture guard coverage preventing return to the old
  inspector-dialog shape.
- Converted Prototype Movement Request preparation into a workflow-session
  slice with a movement model, target, gate, and request steps, packet-first
  locked action behavior, and architecture guard coverage preventing return to
  the old inspector-dialog shape.
- Replaced Prototype's rigid landing type model with a support profile model:
  request capture now offers support profile shortcuts plus a support guide
  dialog, Landing records structured support rows, and scaffold/evidence/
  validation planning derives from support needs rather than a fixed prototype
  type.
- Reworked Prototype Request capture into a readiness-checklist dialog: the
  request now has draft details beside a live checklist, rows turn ready as
  required fields and options are completed, and the local submit action is
  locked until the checklist is complete.
- Made Prototype Landing support rows editable in the workflow: support row
  state changes are structured local draft edits, recorded through the landing
  action, and protected by the shared draft close guard when leaving.
- Normalized Prototype Landing to the compact wizard pattern: support option
  selection now uses a primary Teras select treatment, selected-row editing
  stays in the body, and full support/setup status lives in the right check
  panel instead of a local card grid or setup-planner surface.

## 2026-06-24

- Created the normalized console record hierarchy:
  - `README.md`
  - `system-design.md`
  - `domain-contracts/`
  - `surface-contracts/`
  - `teras-contract.md`
  - `implementation-audit.md`
- Consolidated accepted system architecture, domain boundaries, surface
  boundaries, prototype lifecycle, baseline packet expectations, graduation
  model, Movement Control boundary, and drift gates into `system-design.md`.
- Split Proposal, Repository, Delivery, Prototype, Portfolio, Orchestration, and
  Risk/Exception into separate domain contracts.
- Split Movement Control, Runtime Readiness, Model Operations, and Agent
  Console into separate surface contracts.
- Consolidated shared visual primitive rules into `teras-contract.md`.
- Consolidated reusable implementation audit rules into
  `implementation-audit.md`.
- Rewrote registry-required `brief.md`, `design-profile.md`, `backlog.md`,
  `decision-log.md`, and `change-log.md` into current concise records.
- Removed stale active guidance files after their covered rules were
  consolidated into the normalized contract set.
- Updated the source architecture reference to point to `system-design.md`.
- Normalized Delivery completion wording so Home, Intake, Work Design,
  Refinement, Execution Board, and Delivery Catalog are recorded as peer
  completed Delivery surfaces.
- Recorded the then-current Prototype planning sequence around a centralized
  Movement Control model. That model is superseded by the 2026-07-12
  lifecycle-transition authority contract.
- Removed Portfolio as a normal Proposal route target. At that time Portfolio
  was still modeled as an existing-item posture register; the 2026-07-23
  managed-product publication contract later replaced that temporary model.
- Added `architecture-diagrams.md` and linked it from the read-first index and
  system design as the active full-flow diagram record.
- Expanded the Proposal diagram from route output only into the full Proposal
  operation flow: ingress, projection, register, details, hub, Triage,
  Disposition, Repository gate, Handoff, local receipts, and History.
- Added a diagram coverage rule: the diagram file is authoritative for
  clarified flows only, and future redesigned domains/surfaces must
  update it in the same slice before completion.
- Defined the then-current Movement Control contract model in
  `surface-contracts/lifecycle-transitions.md`, including movement request fields,
  request statuses, decision outcomes, evidence gates, decision requirements,
  immutable receipts, domain mappings, and minimum queue filters.
- Updated the then-current Movement Control architecture diagram to show queued,
  under-review, gate snapshot, decision, outcome, and receipt/history flow.
- Validated the then-current Movement Control model against Delivery boundaries. It
  explicitly excludes Delivery package actions, Delivery Catalog, Delivery apply
  review, Delivery apply receipts, and ART mutation receipts, while allowing
  only cross-boundary Delivery-originated movement requests.
- Inspected the old Prototype comparison source and recorded which behavior
  should carry forward into Prototype Control versus which page-era behavior
  must be replaced.
- Recorded Prototype Control in the Prototype domain contract and
  architecture diagram: register-led, dashboard-centered, workflow-owned, structured
  read models, prototype-local receipts, and the then-current centralized
  movement-decision model, now superseded.
- Implemented the first Prototype Control slice in source: structured
  read model, selectors, command and receipt model, controller-owned session
  state, registry, record dashboard, record shaping, preview runtime proof, baseline
  packet, movement request preparation, history, and temporary comparison
  toggle while replacement was still pending.
- Tightened the Operation Workbench contract after Prototype entry drift: no
  new or reworked operation may use inline Workbench rendering as its accepted
  entry. Prototype is explicitly a focused-control-modal entry owned by
  `PrototypeWorkspace`, with temporary legacy comparison at the workspace
  shell/replacement boundary only.
- Tightened legacy-removal wording: legacy implementation code must be deleted
  from active source only after accepted replacement approval, with stale
  imports, public exports, guards, and mount references cleaned up.
- Added mock/scenario data integrity rules: reworked operation surfaces must
  correct fixtures to the accepted contract and must not carry obsolete legacy
  states, actions, route targets, source ownership, backend authority, or
  workflow shape into Prototype Control.
- Added a shared Operation Workbench implementation standard and Teras usage
  matrix so all operation domains follow the same ownership layers, public
  boundary, model/controller/view split, CSS limits, and shared-component-first
  rule.
- Corrected Prototype temporary replacement drift: the comparison wrapper owned
  the temporary switch during replacement, and `PrototypeWorkspace` owned only
  the Prototype Control modal.
- Audited accepted Prototype scenario data against the Prototype Control
  contract and added an architecture guard to block stale legacy terms from
  accepted Prototype source.
- Added the direct Prototype Request entry to Prototype Control, matching the
  Proposal capture and Repository request control-level pattern while keeping
  the request prototype-local and routed through the normal Prototype dashboard and
  workflow path.
- Corrected Prototype Request placement to use the same compact control
  overview shape as Proposal and Repository: summary panel on the left,
  dedicated railed ingress/request panel on the right.
- Corrected Prototype compact-control drift in the register and selected
  launcher: register now uses whole-record status projection, secondary
  inspect row action styling, and the selected launcher uses the compact
  `TerasSelectedPanel` variant with meta chips.
- Corrected Prototype Dashboard drift: the dashboard now uses the accepted
  Operation Workbench workflow-session cockpit shape with selected context on
  top, current required move plus current status on the left, progress plus
  receipt archive on the right, and an architecture guard rejecting the old
  local workflow-entry/posture/open-items dashboard shape.
- Corrected Prototype Baseline Promotion projection and temporary replacement
  usability: incomplete packet drafts no longer create partial local
  submission receipts, approved packets record only as `ready-for-movement`,
  and the frozen legacy overlay could no longer intercept the replacement
  toggle.
- Added Prototype workflow-session footer controls across the dashboard and active
  workflow modals so Prototype now follows the accepted session footer pattern:
  dashboard footer returns to the register or runs the current move; workflow footers
  return to the dashboard or run the contextual prototype-local command.
- Remodeled legacy preparation gate-resolution behavior into Prototype Control.
  Baseline Packet and Movement Request now derive structured
  recovery rows from their workflow models and render them with Teras panels
  and signal rows beside the command gate.
- Replaced the duplicated Command Center runtime card and readiness panel with
  one fixed Agent Runtime dock. Added source-backed heartbeat presence,
  aggregate health, a scrollable active-runtime roster, runtime details, and
  optional versioned Model Operations profile references without moving profile
  authority into Agent Console.
