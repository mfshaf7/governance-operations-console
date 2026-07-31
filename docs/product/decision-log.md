# Governance Operations Console Decision Log

Status: current decision log.

Historical discussion has been consolidated into the normalized contract files.
Do not use deleted master-plan, old audit, or deep-design records as active
guidance. When dated entries conflict, the later decision supersedes the
earlier one.

## 2026-07-30

- Decision: `architecture/system-model.yaml` is the canonical cross-domain
  architecture source. The registered views under `architecture/views/` are
  synchronized projections; detailed domain and surface contracts may add
  local behavior but may not redefine model authority, lifecycle, handoff, or
  implementation-maturity facts.
- Decision: the former `architecture-diagrams.md` record is retired. Its active
  coverage is replaced by the architecture packet and its historical decision
  entries remain historical only.
- Decision: target design, Console implementation, backend support, live
  adapter status, and delivery phase are independent architecture axes. A
  complete prototype surface never proves a live backend effect.
- Decision: Proposal target ingress applies the handoff while Proposal remains
  `accepted`. Proposal becomes `implemented` only after downstream completion
  evidence is reconciled. This supersedes the 2026-07-12 wording that projected
  Proposal `done` at Prototype application or Delivery ingress.
- Decision: Workspace Intake is a generic Workspace Governance classification
  workflow for repository, product, and component entrants, not a Workbench
  domain. An `admitted` intake entry is not active inventory. A separate
  type-specific promotion removes the intake entry and creates exactly one
  active `repos.yaml`, `products.yaml`, or `components.yaml` record. Product
  Portfolio validates publication only for active products. This decision
  supersedes the briefly implemented standalone product-only intake surface.
- Decision: the operator approved the Governance Operations Console local
  design baseline on 2026-07-30. The active record is
  `record://design-baselines/governance-operations-console-2026-07-30`, with
  focused security review evidence in security-architecture PR #89 and
  refreshed security evidence in PR #90.
- Decision: baseline approval accepts the local product shape, workflows,
  visual language, source boundaries, fixture-backed proof, and explicit
  post-baseline owner ledger. It does not approve live backend authority,
  authenticated identity, secrets, client data, autonomous AI action,
  shared exposure, stage/prod deployment, or source graduation.

## 2026-07-26

- Decision: Environment Lifecycle is one cross-surface capability outside
  Operation Workbench with exactly two peer views: profile-centric Dev
  Integration and product-centric Governed Releases. The main Console is its
  summary and entry point, so the expanded surface has no shallow Home view.
- Decision: Dev Integration owns a profile register, stable Profile Dashboard,
  Runtime controls, Stage Handoff evidence, history, and a three-step Profile
  Request workflow. Profile lifecycle, runtime observation, command operation,
  and promote-check readiness remain separate state families.
- Decision: Governed Releases owns a product register and capability-driven
  Product Release Dashboard. Products retain their own maturity, highest real
  endpoint, release objects, runtime-lifecycle vocabulary, checks, actions, and
  rollback capability. Products without a governed release rail show truthful
  unavailability rather than synthetic steps.
- Decision: the Console prepares typed requests and projects operations. It
  does not approve profiles, execute shell or cluster commands, edit
  environment Git records, grant stage or production eligibility, accept
  security posture, or store environment business truth.
- Decision: future live commands extend admitted OOS workflow APIs and reuse
  Platform-owned runners, GitHub workflows, Argo contracts, product adapters,
  WGCF readiness receipts, and Security evidence. No new environment backend,
  database, release authority, or universal state machine is introduced.
- Decision: Baseline Foundation implements structured fixtures, dashboards, workflows,
  prototype-local command simulation, receipts, guards, and capability gates.
  Live Integration and Deployment adds read adapters, identity and authorization, request and command
  dispatch, release workflows, runtime-lifecycle controls, reconciliation, and
  fixture removal one admitted action family at a time.
- Decision: Baseline Foundation mounts one Environment-owned in-memory runtime at the
  expanded Environment Lifecycle boundary. Dev Integration and Governed
  Releases share its typed command, idempotency, source-version, operation,
  receipt, retry, and reconciliation grammar. Successful prototype-local
  receipts alone build effective interaction state; source fixtures are never
  mutated and local success never represents external authority.
- Decision: a product's human operator route is guidance only. Every
  executable product release or runtime-lifecycle action declares a separate
  machine adapter with explicit availability, and command creation fails
  closed rather than treating a runbook as an execution endpoint.
- Decision: a failed Environment Lifecycle submission remains on its Review
  step and shows the shared operation result, failure owner, source adapter,
  receipt, safe next action, return-to-draft route, and retry only when the
  failure class is retryable. Successful retry returns to the stable dashboard.

## 2026-07-23

- Decision: Portfolio is the live managed-product catalog and operator showcase
  for graduated, durable products. It is not an arbitrary-item posture
  register, a build lane, Delivery history, or a Prototype visibility surface.
- Decision: Proposal and Prototype do not route directly to Portfolio. A
  Prototype uses Preview Runtime for early visibility and must graduate to a
  durable product owner before product admission can make it eligible for
  publication.
- Decision: Delivery closeout classifies outcomes. A new-product outcome may
  start product admission, an existing-product release or material change may
  update one Portfolio entry, and non-product work remains Delivery history.
- Decision: Portfolio composes product-registry identity, product-owned
  showcase metadata, Platform runtime and release evidence, Security evidence,
  Delivery outcomes, and WGCF freshness. It owns only publication, listing, and
  curation; it does not grant product admission, runtime access, or security
  approval.
- Decision: listing scope and product runtime exposure are independent.
  Product, Platform, Security, and identity authorities own access; Portfolio
  projects their verified result.
- Decision: Portfolio classification separates `portfolio_segment`,
  `product_form`, `listing_scope`, `access_class`, optional `client_ref`, and
  controlled tags. Personal, client, and public are not one category axis.
- Decision: Workspace Governance owns the future machine-readable classification
  vocabulary. Product owners provide values, Portfolio validates and projects
  them, and Security reviews access semantics. A distinct Workspace Delivery
  ART child must be created after baseline approval; no ART item or live
  workspace-governance change is opened during Baseline Foundation.
- Decision: Product Portfolio fixtures use one production-shaped scenario
  envelope with explicit `authority-snapshot`, `synthetic-companion`, or
  `synthetic` provenance. OpenClaw and OpenProject preserve current registry
  facts; invented manifest, listing, runtime, release, or security evidence is
  always marked synthetic companion data.
- Decision: the locked Baseline Foundation matrix covers all independent state axes,
  non-web products, catalog visibility, admission correction, source-owned
  recovery, automatic updates, retirement, duplicate rejection, and idempotent
  replay. UI summaries and actions must derive from selectors over those
  records rather than component-local strings.
- Decision: the current `domain-workspaces/portfolio/` implementation is
  conceptually obsolete. Its posture edits, linked-work mutation, and Movement
  Handoff are not a baseline. The replacement must be designed and rebuilt
  cleanly, followed by direct cutover and removal of old source without a
  comparison toggle.
- Decision: Product Portfolio uses a fullscreen workspace with exactly
  `Products`, `Publication`, and `Curation`. Products is the landing surface; no
  shallow Home, Health, or generic Configuration navigation is added.
- Decision: Product Dashboard is stable large detail with Overview, Operations,
  and History. Admission uses Checks, Decision, and Result without an advisor
  or runtime log. Curation owns only listing state, permitted scope, featured
  placement, and relative order; it never edits source-owned product facts.
- Decision: this section supersedes every earlier Portfolio posture,
  registration, direct-graduation, movement, and completed-surface decision in
  this log.

## 2026-07-21

- Decision: Console delivery is split into two independently measured
  programs. Baseline Foundation completes and approves the fixture-backed,
  prototype-local product baseline. Live Integration and Deployment implements live adapters,
  identity enforcement, durable orchestration, canonical mutation,
  persistence, governed runtime activation, migration, and graduation only
  after baseline approval and work-home assignment.
- Decision: baseline approval may carry explicit post-baseline implementation
  work, but it may not carry unresolved product meaning. Ownership, authority,
  source of truth, state and action semantics, capability gating, failure and
  recovery meaning, adapter boundaries, and operator routes must be accepted
  during Baseline Foundation.
- Decision: baseline and post-baseline percentages are never combined. Missing
  live backend implementation does not reduce Baseline Candidate Completion
  once its product contract and deferred owner are accepted, and polished mock
  behavior does not count as Post-Baseline Implementation Completion.
- Decision: Environment Lifecycle is Baseline Foundation product-design scope and Program
  B execution scope. Its operator contract, capability gating, and surface must
  be accepted before baseline approval; platform APIs, shared-runner actions,
  GitHub workflows, Argo reconciliation, stage/prod mutation, and live receipts
  remain post-baseline work.

## 2026-07-22

- Decision: Prototype-to-Delivery is a route-specific graduation that extends
  the normal Delivery Intake path. Prototype owns `Prepare Delivery Handoff`,
  shared validation evaluates the versioned packet, Delivery ingress policy
  owns automatic admission, and Delivery Intake Consume creates or reuses one
  top-level Delivery shell.
- Decision: the Prototype handoff target is fixed to Workspace Delivery ART.
  Target lane and owner are generated, not free-text fields. Prototype carries
  its approved baseline, scope, boundaries, remaining work, and resolved source
  custody but does not assign Target PI, Iteration, Delivery Team, or an ART
  execution tree.
- Decision: Prototype becomes `graduating` after accepted source intent. It
  becomes `graduated` only when the final target application receipt proves the
  Delivery shell, reciprocal Prototype/baseline backlinks, and durable source
  custody. Intake admission or request acceptance alone is insufficient.
- Decision: Delivery Work Design receives Prototype baseline continuation
  context but still owns the Delivery tree. Prototype component, UI, and
  evidence trees are not imported as executable ART work.
- Decision: this route `extends` Prototype graduation and Delivery Intake and
  `replaces` stale Movement Control ownership. It creates no new backend service.
  Real WGCF/OOS/Delivery adapters remain Live Integration and Deployment work.

## 2026-06-24

- Decision: the normalized record hierarchy is the read-first authority:
  `README.md`, `system-design.md`, `operation-workbench-contract.md`,
  domain contracts, surface contracts, `teras-contract.md`, and
  `implementation-audit.md`.
- Decision: stale supporting records are removed or rewritten once their
  content is covered by the normalized contracts, because stale docs have been
  a real drift source.
- Decision: Delivery local prototype pass is complete as a domain. Home,
  Intake, Work Design, Refinement, Execution Board, and Delivery Catalog are
  recorded as peer surfaces.
- Decision: baseline approval is broad. It requires accepted system boundary,
  workflow model, source-of-truth model, data and mutation boundary, visual
  contract, implementation alignment, validation proof, required diagrams, and
  explicit post-baseline or graduation work. No single surface completion
  equals baseline approval.
- Decision: Prototype records may enter through local entry, proposal route,
  existing source registration, or imported provenance. Creation is cheap,
  admission is controlled, and graduation is governed.
- Decision: The old Prototype comparison code was replaceable scaffolding.
  Prototype Control must be designed from the Prototype domain contract.
- Decision: lifecycle-transition control is a shared contract and receipt
  projection, not an independent Movement Control decision authority. Source
  domains own intent, target domains own admission, WGCF owns admitted gate
  evaluation, Risk / Exception owns exception decisions, OOS owns execution,
  and target adapters own canonical mutation.
- Decision: Prototype owns Landing, Candidate Promotion, Baseline Promotion,
  and source-side transition preparation. Ownership for each outbound route is
  locked separately instead of being delegated to a generic Movement reviewer.
- Superseded decision: Portfolio was previously modeled as an existing-item
  posture register in a compact-control shell. The 2026-07-23 managed-product
  contract replaces that meaning and revokes the resulting implementation
  baseline.
- Decision: `architecture-diagrams.md` is the flow anchor for the console. It
  records the system boundary, primary routing, lifecycle-transition pattern,
  Delivery, Prototype, Portfolio, Repository, and mutation-boundary diagrams so
  future work does not infer cross-domain flow from chat memory.
- Decision: `architecture-diagrams.md` is clarified-flow coverage, not final
  whole-console coverage. Any future redesign of Orchestration, Risk/Exception,
  Runtime Readiness, Model Operations, Agent Console, Command Center/Home,
  Portfolio, Repository, or cross-boundary flow must update that diagram record
  in the same slice before completion.
- Decision: lifecycle transitions use structured source intent, validation,
  target admission, optional exception evidence, orchestration, target
  application, and immutable receipts. Prepared packets, authorization, and
  application are separate states.
- Decision: Proposal-to-Prototype and Proposal-to-Delivery are automatic after
  validation. Prototype application creates the captured entry before Landing.
  Delivery application creates an Intake source with `needs_consume`; Intake
  Consume remains internal Delivery work.
- Decision: Prototype legacy inspection is evidence for the next
  design slice, not a source shape to normalize mechanically. Registry filters,
  linked records, preview profile/proof projection, preparation gates, context
  packet boundary, and Teras-based record details are useful. The old
  `registry`/`prepare`/`movement` tab set, Prototype-owned movement review,
  `parked` lifecycle state, direct request-movement button, and page-era chrome
  are replacement risks.
- Decision: Prototype Control is register-led and dashboard-centered.
  Prototype uses Registry, Prototype Dashboard, Preview Runtime, lifecycle
  workflow wizards, transition-request preparation, and History/receipts as the
  domain structure. Preview proof is
  local evidence for Baseline Packet work; Preview Runtime is not a lifecycle
  workflow. Prototype prepares structured packets and local receipts; each
  target route retains its own admission and application authority.
- Decision: Prototype dashboard redesign is a separate phase. The dashboard should
  remain a selected-record cockpit; each workflow opens as its own
  workflow-session wizard, and Preview Runtime opens as its own runtime surface.
  Do not combine dashboard redesign with Preview Runtime cleanup.
- Decision: Proposal and Repository are compact control surfaces. Delivery is
  app-sized. Future domains choose shape by surface purpose while preserving the
  shared visual system.
- Decision: no new or reworked Operation Workbench domain may use an inline
  Workbench surface as its accepted product entry. Reworked operations must
  open through a focused modal or fullscreen workspace shell. Inline rendering
  is allowed only as frozen legacy comparison during temporary replacement
  window.
- Decision: legacy implementation code is removed only after the accepted
  replacement is inspected, corrected, and operator-approved. Removal cleans
  active source, stale imports, public exports, guards, and mount references.
  Legacy code must not remain as an alternate path after removal.
- Decision: legacy comparison is a reference artifact, not a capability matrix.
  Useful old workflow ideas may be remodeled into the accepted contract, but
  stale legacy behavior should be rejected deliberately when the new contract
  is stronger.
- Decision: mock, synthetic, and read-model scenario data must be corrected to
  the accepted domain contract before visual inspection or accepted
  replacement. Legacy data that encodes obsolete states, route targets, action
  labels, source ownership, backend authority, or workflow structure must not
  be carried into Prototype Control.
- Decision: Prototype's accepted entry class is `focused-control-modal`.
  `PrototypeWorkspace` must own only the new `TerasModalShell` and close
  behavior. After cutover, `PrototypeWorkspace` is the only active Prototype
  Workbench entry. `app/page.tsx` must not mount `PrototypeWorkspaceSurface`
  directly.
- Decision: Prototype has a direct request ingress. Prototype Control must
  expose a first-class `New Prototype Request` action that creates a
  prototype-local `local-entry` / `exploring` record and then uses the normal
  Prototype dashboard and workflow path. It is not a baseline approval, movement
  request, platform runtime request, or backend mutation.
- Decision: no full Movement Control decision workspace or new Movement
  backend service is approved. A later Lifecycle Transitions overview may show
  status, failures, ownership, and receipts while routing actions to the owning
  domain, Risk / Exception, or Orchestration.
- Decision: Teras owns product-neutral primitives only. Domain read models do
  not enter Teras.

## 2026-07-01

- Decision: persistence normalization is not part of the current fast UI
  iteration pass. The console may continue using prototype-local continuity
  state only to support visual/workflow inspection, but new work must not
  spread hidden persistence into register projection, package posture, backend
  status, or source-of-truth decisions.
- Decision: during UI iteration, persistence work is containment only. Fix
  persistence bugs only when they block visual review or create false operator
  state, such as lost drafts, false close guards, or wrong status after a local
  workflow action. Do not introduce durable persistence, schema migrations, or
  backend-style ledgers as part of visual cleanup.
- Decision: before Delivery is treated as a true reference implementation for
  future Operation Workbench domains or backend/OOS wiring, it needs a
  dedicated persistence architecture pass. That pass must separate UI
  preference state, local draft state, command intent, prototype-local
  receipts, local transition ledger, source projection, and future durable
  backend receipts.
- Decision: register/status projection must eventually consume a reconciled
  session or read model, not direct browser storage. Local drafts restore
  operator continuity only; accepted commands or receipts are the only local
  evidence allowed to advance workflow status during prototype work.

## 2026-07-05

- Decision: Delivery, Proposal, and Repository are completed current-shape
  surfaces for this prototype pass. Delivery is the completed fullscreen
  workspace reference. Proposal and Repository are completed compact-control
  references. This locks their accepted entry shape, source structure, and
  Teras alignment unless a future explicit design discussion changes them. It
  does not approve the whole console baseline, does not finalize Prototype or
  unfinished domains, and does not imply live backend mutation wiring.

## 2026-07-06

- Decision: Teras normalization is now an explicit cleanup track. The four
  completed or accepted current-shape operation surfaces for this pass are
  Delivery, Proposal, Repository, and Prototype Control. Teras changes must be
  checked against those surfaces before a primitive, variant, or name is
  treated as accepted.
- Decision: the current Teras implementation is not the contract truth. It
  contains duplicate primitives, unclear names, product-context wording, unused
  exports, and product-app-owned shapes. Normalization must classify each
  primitive as `core keep`, `merge`, `delete`, `product-app-owned`, `rename`,
  or `needs discussion` before implementation.
- Decision: no new Teras primitive or visual variant may be introduced only
  because a surface has a slight spacing, density, or layout difference.
  Slight differences should collapse into one standard primitive unless code
  inspection and visual inspection prove a materially different reusable shape.
- Decision: product apps hosted by an operation surface are not operation
  primitive references by default. Build Tree, Context Board, and Control Board
  shapes may remain product-app-owned even when Delivery currently hosts them.
- Decision: Teras normalization is tracked in
  `teras-normalization-worklist.md` until the new primitive model is accepted
  and folded back into `teras-contract.md`. The worklist is temporary active
  cleanup state, not a new master plan.

## 2026-07-10

- Decision: the pre-baseline Operation Workbench authority model is locked.
  Immutable source and dependency snapshots remain separate from drafts,
  commands, command runs, and receipts. Domain-owned projectors derive the
  effective operator view; no generic mutable overlay or effective view becomes
  canonical business truth.
- Decision: shared runtime code owns only product-neutral envelopes, freshness,
  capability, command/run/receipt contracts, adapter interfaces, and invariant
  helpers. Each domain owns lifecycle, state transitions, payloads, eligibility,
  summaries, receipts, and view projection.
- Decision: cross-domain handoffs use schema-versioned custody packets with
  source version, correlation, causation, authority, and producer evidence. A
  producer never mutates the consumer's record, and consumer admission remains
  distinct from the producer's business lifecycle.
- Decision: before baseline approval, implementation remains structured-fixture
  and prototype-local simulation work only. This decision does not authorize
  live adapters, new OOS endpoints, durable persistence, subscriptions,
  cross-repo runtime work, or a console-owned business database.
- Decision: live wiring is a separate post-baseline governed phase. Future
  adapter rollout occurs one domain at a time and must preserve rollback to
  prototype-local or read-only behavior without rewriting canonical records.

## 2026-07-12

- Decision: replace the universal Movement Control decision-authority model
  with shared Lifecycle Transition Control. Reuse existing authorities instead
  of creating a new control plane: the source domain owns intent and the
  versioned handoff packet; WGCF or another admitted validator owns gate
  evaluation; the target domain owns admission; Risk / Exception owns waivers
  and accepted risk; OOS owns execution and retry; the target adapter owns the
  canonical mutation; and the shared transition projection correlates status
  and immutable receipts.
- Decision: no full Movement Control decision workspace or new Movement
  backend service is approved. A later Lifecycle Transitions overview may be
  read-only and route operators to the authority that owns the next action.
- Decision: Proposal-to-Prototype is automatic after validation. Proposal owns
  Triage, Disposition, and Handoff preparation. A Prototype-owned application
  receipt creates a derived `proposal-routed` / `exploring` entry with Landing
  `captured`; Landing remains the first Prototype action. Proposal becomes
  `done` only after that receipt exists.
- Decision: Proposal-to-Delivery is automatic after validation. A
  Delivery-owned ingress receipt creates an Intake source in `needs_consume`.
  Proposal becomes `done` at Delivery ingress. Intake Consume remains an
  internal Delivery action, and a Consume failure must not reopen Proposal.
- Superseded decision: Portfolio was previously treated as an existing-item
  registration destination. The 2026-07-23 managed-product publication contract
  replaces that model; Proposal and Prototype have no direct Portfolio route.
- Decision: Prototype-to-Delivery is now locked. Platform/runtime promotion,
  impacted retirement, suspend, defer, rollback, and Repository custody
  transitions remain pending.
  Their target application behavior must not be inferred from the historical
  Movement Control implementation or changed before route-specific discussion.

## 2026-07-14

- Decision: the Operation Workbench durable-orchestration standard is locked in
  `durable-orchestration-standard.md`. Synchronous execution remains the
  default. UI workflow depth, local persistence, a wizard, or a receipt does
  not by itself justify Temporal. Durable execution requires restart survival,
  non-atomic multi-system work, long waits, controlled retry or timeout,
  reconciliation or compensation, durable signals, or correlated run evidence.
- Decision: current workflow classifications are locked in
  `orchestration-use-case-matrix.md`. No current Console workflow is
  `admitted-durable`; all durable entries remain candidates pending source,
  platform, security, and runtime admission.
- Decision: Orchestration is not monitoring-only. Its accepted domain shape has
  Home, Definitions, and Runs. Definitions owns qualification, definition
  visibility, version posture, and the `Design orchestration` workflow. Runs
  owns active and historical run inspection and bounded run controls.
- Decision: `Design orchestration` uses Qualify, Define, and Review And Request.
  It produces an implementation-ready contract and work-routing packet, not
  executable code. The Console must not become a low-code Temporal editor,
  upload arbitrary code, deliver credentials, or activate an unreviewed
  definition.
- Decision: OOS owns the workflow catalog, definition and run projections,
  request and control APIs, correlation, and receipts. Executable definitions
  remain immutable, reviewed Git source in the selected owner repo. Owner
  components retain activity boundaries; Platform Engineering and Security
  Architecture retain runtime and trust acceptance.
- Decision: Delivery Refinement Apply is the first recommended durable
  definition pilot, followed by Work Design Apply Draft, Delivery landing-unit
  closeout, Prototype Landing Run, and the Model Profile lifecycle. This is a
  design sequence, not runtime approval or committed ART scope.
- Decision: `delivery.refinement.apply` version 1 is the first
  `definition-ready` contract. Only its final Apply command is durable;
  drafting and readiness remain synchronous. The run owns initiative
  governance, non-destructive plan reconciliation, item metadata application,
  canonical verification, and a final receipt.
- Decision: Refinement Apply uses immutable content-addressed inputs, one
  mutation owner per field, `reconcile_missing=ignore`, idempotent forward
  recovery, effect-aware cancellation, and read-back completion proof. Direct
  item create/update calls, blocker actions, and destructive missing-node
  reconciliation are outside the definition.
- Decision: a successful HTTP response or request-acceptance receipt is not a
  completed Refinement Apply. Only a verified `completed` execution receipt
  may project the Delivery workflow as done. Current OOS partial-write and
  missing durable-run capabilities block runtime admission.

- Decision: Model Operations is an Operation Workbench domain, not a
  cross-surface Console module. It uses Compact Control Mode with Governed
  Profiles Control, a stable Model Profile Dashboard, and a separate local
  exception-runtime inspector.
- Decision: profile lifecycle remains `active`, `suspended`, `retired`, or
  `exception`. Availability and blocking are caller-specific derived readiness,
  not additional lifecycle values. Raw provider inventory is not governed
  profile truth.
- Decision: the future Request Profile capability extends existing owners. The
  Console is the adapter, OOS owns request workflow state after admission,
  Platform Engineering owns profile source and fulfillment, Security
  Architecture owns acceptance and exceptions, and Workspace Delivery ART owns
  implementation work state. The Console never writes the registry directly.
- Decision: until that backend exists, Request Profile remains visible but
  disabled. Visual baseline approval may carry the capability as
  contract-defined/backend-unavailable, but Model Operations cannot claim live
  mutation capability and must not create fake local requests or receipts.
- Decision: Model Operations does not need a temporary legacy/new toggle. Its
  current Workbench entry is only a placeholder, so the new domain replaces it
  directly. Provider Registry and fake readiness scenarios are removed once
  valid governed-profile inspection exists in the replacement. The Command
  Center Console AI Runtime card and companion panel remain as live
  `agent-console` health projections for the embedded and floating Agent
  Console; they do not own governed profile policy.
- Decision: the Governance Operations Console will use the clean steady-state
  Prototype lifecycle for future work. Its own pre-system development history
  is bootstrap input, not a reusable lifecycle route, domain state, operator
  option, or permanent compatibility mode.
- Decision: the Console's existing Prototype Studio record and pre-existing
  Workspace Delivery ART relationship will be reconciled once during future
  live wiring. That reconciliation must be explicit, idempotent, auditable,
  and implemented at the owning integration boundary; it must not add product
  UI or alter normal Prototype-to-Delivery behavior.
- Decision: the shaped Delivery, Proposal, Repository, Prototype, and Portfolio
  surfaces do not constitute a completed Operation Workbench or a whole-console
  baseline. Further lifecycle-transition implementation is deferred until the
  unfinished Workbench domains, Console Shell, Command Center, Runtime
  Readiness, Model Operations, Agent Console, and cross-surface integration
  have been inventoried against one whole-console baseline plan.

## 2026-07-16

- Decision: the generic run lifecycle is `queued`, `running`, `waiting`,
  `blocked`, `failed`, `completed`, or `cancelled`. `deferred` is removed as a
  lifecycle value; deferral is a bounded control that creates a structured
  waiting condition.
- Decision: definitions use a bounded graph of `activity`, `wait`, and
  `subworkflow` nodes with dependencies, conditions, skip reasons, owners,
  adapters, locks, idempotency, and artifact/log/receipt outputs. Runtime input
  may select definition-owned optional nodes but may not upload executable
  steps or arbitrary commands.
- Decision: run projections carry current node, structured wait, bounded
  progress, effect posture, controls, artifacts, logs, receipts, and a
  versioned source-domain projection reference. Generic run state never
  replaces domain lifecycle, review, fulfillment, or readiness state.
- Decision: Model Profile request capture and ordinary human review remain
  persisted OOS request state by default. Fulfillment, activation, suspension,
  and retirement are separate durable candidates grouped under one definition
  family. Exception authority remains with Risk / Exception and Security
  Architecture.
- Decision: a future Prototype Landing run uses one immutable approved setup
  plan and a bounded conditional node set. Missing input or unresolved security
  posture blocks preflight; the run must verify its output inventory before
  Prototype records Landing complete.
- Decision: Orchestration uses Full Workspace Mode with direct fullscreen entry
  and stable Home, Definitions, and Runs navigation. Its placeholder has no
  useful legacy capability, so implementation requires no comparison toggle.
- Decision: Home separates system posture, operator attention, healthy
  in-flight runs, and material events. It does not inherit an Agent Console,
  duplicate registers, source-context panels, raw logs, or the definition
  authoring action.
- Decision: Definitions uses a register plus stable Definition Dashboard.
  `Design Orchestration` uses an advisor-assisted Qualify and Define path,
  followed by operator-owned Review And Request. Synchronous and conditional
  outcomes stop after qualification review; durable candidates produce an
  implementation request, never executable workflow code.
- Decision: Runs uses a register plus stable Run Dashboard. Run controls are
  bounded dialogs projected by OOS capability, while events, logs, and receipts
  remain distinct evidence types. The Console cannot start arbitrary runs or
  reopen terminal runs.
- Decision: Orchestration follows the common domain ownership layers, but its
  Definitions and Runs registers remain under their owning peer surfaces.
  It must not create a misleading Delivery-style domain-wide package register.

## 2026-07-17

- Decision: Command Center owns Workspace Pulse, System Mood, operator priority
  briefing, decision scenarios, and their presentation. Console Shell retains
  cross-capability focus routing and chooses between Command Center, Runtime
  Readiness, and Operation Workbench content. Command Center must not mount or
  switch on domain workspace implementations.
- Decision: whole-console structural extraction precedes Lifecycle Transitions
  redesign. Operation Workbench remains the proven capability reference, while
  Console Shell, Command Center, Runtime Readiness, Agent Console, and the
  temporary Movement Control implementation receive explicit ownership
  boundaries without forcing them into Workbench-specific workflows.
- Decision: `src/data/today.ts` is replaced, not renamed. Structured fixture
  truth lives with its owning capability; completed domain fixtures that no
  active consumer reads are deleted; and no generic `shared/data` or successor
  whole-console fixture object is introduced.
- Decision: structural extraction is behavior- and visual-preserving. It does
  not approve a new primitive, workflow, backend mutation, runtime authority,
  or Lifecycle Transitions design.
- Decision: the Operation Workbench host has exactly eight registered domains.
  Their ids, selector labels, and order come from one typed registry; free-form
  route labels and an undeveloped-domain fallback are not valid host behavior.
- Decision: `src/app/page.tsx` is a thin mount for `GovernanceConsoleShell` and
  does not compose capabilities directly. Console Shell may route a registered
  operation only through the public Operation Workbench host, whose exhaustive
  routing must fail at development time or throw for an unknown label instead
  of silently mounting a placeholder.
- Decision: Operation Workbench owns selector identity and presentation plus
  exhaustive domain mounting. Console Shell owns active selection,
  cross-capability focus routing, command-bar and event-log presentation,
  context propagation, and accepted major-surface placement.
- Decision: domain workspaces import the Operation Workbench contract leaf
  rather than its composition barrel. Command Center and Agent Console import
  Console Shell leaf primitives rather than the Shell barrel. These dependency
  directions keep public composition boundaries acyclic without exposing
  private domain implementation.
- Decision: Runtime Readiness owns its typed model, fixture-backed scenarios,
  pure projections, browser polling state, presentation, host telemetry
  adapter, and HTTP handler. Agent Console owns its typed runtime status,
  browser interaction controller, presentation, request-admission policy,
  model-provider adapter, and HTTP handler. Next.js API route files are thin
  mounts and neither presentation boundary may own provider or host access.
- Decision: Agent request admission and prompt shaping remain independently
  testable from Ollama discovery and streaming. Runtime resource projections
  remain independently testable from browser polling and `/proc` access. This
  separation is structural and does not approve governed model access or
  runtime mutation authority.
- Decision: portal-rendered modal and fullscreen surfaces expose the same
  Operation Workbench contract metadata as their host section. This proves
  composition and ownership across the portal boundary without exposing a
  domain controller or read model through its public barrel.
- Decision: whole-Workbench host proof and four completed whole-console
  ownership phases are not a whole-Console baseline claim. Lifecycle
  Transitions and remaining capability-specific global-style ownership still
  require their own inspection and acceptance.
- Decision: the proposed generic Risk / Exception Operation Workbench domain is
  removed. Blockers, normal recovery, workarounds, and defer decisions remain
  in the domain or canonical work system that owns them.
- Decision: explicitly waivable controls use an authority-decision request and
  receipt contract. Security Architecture owns security acceptance and
  security waivers; Workspace Governance owns workspace contract waivers;
  Platform Engineering owns platform exceptions; Delivery ART owns ART risks;
  and OOS Orchestration owns technical retry and reconciliation.
- Decision: Lifecycle Transition Control may require and project a scoped
  authority-decision receipt, but it does not own, approve, or reinterpret that
  decision.
- Decision: no generic abnormal-state register, decision modal, backend
  service, or canonical console database is introduced. A future read-only
  overview requires real cross-authority volume and remains outside the
  Operation Workbench domain set by default.
- Decision: Teras is opt-in product-neutral component infrastructure, not a
  global Console theme. Operation Workbench domains must not place domain
  selectors in `src/app/globals.css`, and broader Console surfaces must not be
  bulk-converted to Teras before their own visual and ownership discussion.
- Decision: the active broader Console stylesheet remains temporarily owned at
  the root while Console Shell, Command Center, Runtime Readiness, Movement
  Control, and Agent Console retain their accepted visuals. Each capability
  moves its styling behind its own boundary only during that capability's
  accepted normalization work.
- Decision: modal-aware cross-capability behavior uses the stable
  `data-teras-modal` shell attribute. Domain names and retired modal class
  lists are not valid cross-capability contracts.

## 2026-07-26

- Decision: Console Shell uses one grouped floating primary navigation with
  non-interactive `OVERVIEW`, `WORK`, and `ENVIRONMENT` headings. The
  entries are Console, Operation Workbench, Lifecycle Transitions, Dev
  Integration, and Governed Releases. Its styling remains part of the softer
  Console visual language.
- Decision: Console home retains the existing Operation Workbench quick
  launcher. `Operation Workbench` is also permanently present in the
  viewport-fixed navigation dock so it remains accessible at every main-Console
  scroll position. It expands to direct Proposal, Repository, Delivery,
  Prototype, Portfolio, Model, and Orchestration launch entries. Selecting a
  child opens the existing focused workspace immediately and does not scroll to
  the inline launcher. Both launcher projections consume one typed registry,
  selection controller, repository-focus context, and exhaustive workspace
  host.
- Decision: Lifecycle Transitions, Dev Integration, and Governed Releases leave
  the main Console grid and receive dedicated full-viewport Teras workspace
  modals. Environment Lifecycle remains their shared architecture boundary and
  a navigation group, not a redundant landing page.
- Decision: Lifecycle Transitions remains read-only coordination,
  observability, receipt history, and owner routing. Moving it into primary
  navigation does not give it decision, retry, orchestration, admission, or
  target-mutation authority.
- Decision: application-level grouped navigation and focused workspace-local
  navigation are separate semantic and visual levels. Console Shell owns and
  styles the application navigation. Teras owns only the focused workspace
  modal and its internal presentation; no Teras application-navigation
  primitive is introduced.

## 2026-07-28

- Decision: the fixed Agent Runtime dock supersedes the former Command Center
  runtime card plus companion readiness panel. It owns provider health and a
  scrollable roster of source-backed runtimes with current heartbeats.
- Decision: runtime presence and governed model-profile truth remain separate.
  Agent Runtime carries an optional versioned profile reference; Model
  Operations resolves and owns profile lifecycle, policy, and caller
  eligibility. A local runtime without that reference is explicitly
  `Prototype local`.
- Decision: Command Center Focus is replaced with a read-only, route-only
  actionable-attention projection. Owner domains retain required-move and
  urgency semantics; Command Center validates, deduplicates, ranks, selects,
  and presents public attention candidates without owning mutation.
- Decision: the default Focus interface is a bounded two-zone queue and
  selected-priority surface whose rendered height matches Workspace Pulse.
  Tabs are allowed only after content pruning and detail-dialog extraction
  prove that genuinely distinct content cannot fit; a concrete tab set needs
  operator review.
- Decision: Focus uses one generic typed Console entry intent and selected
  candidates feed the existing Agent Context boundary. It gets no business
  database, direct owner-API calls from presentation, duplicate Agent Console,
  or autonomous action path.
