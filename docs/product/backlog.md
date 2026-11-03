# Governance Operations Console Backlog

Status: current active backlog.

Use this file for product follow-ups and remaining local prototype work.
Architecture, visual, Teras, domain, and surface rules live in the normalized
contract files. Deferred follow-ups do not authorize implementation or replace
the required work-home classification when delivery begins.

## Before Customer Release: Provider Onboarding

- Status: **open; required before the first customer release**.
- Recorded: 2026-11-03, at the operator's request.
- Planning owner: Governance Operations Console.
- Implementation dependencies: Platform Engineering for installation-specific
  configuration, secret custody, connection wiring and renewal; OOS for
  authenticated provider adapters; Security Architecture for identity and
  access-scope decisions.
- Timing: revisit during release planning and independent-installation
  qualification. This is a deferred product-readiness requirement, not another
  ART item or an expansion of the current Repository UI repair.

### Observed Gap

The current GitHub connection requires technical operator assistance outside
the Console. App visibility, installation account, repository selection and
runtime credential consumption are separate prerequisites; an installation
alone does not prove the connection works. The creating App's repository access
does not automatically grant access to the separate metadata reader. Selected
repository access therefore leaves a manual onboarding step for new private
repositories that the current creation workflow does not handle.

At discovery, the metadata-only identity producer enforced selected
installations. That was our access policy, not a universal GitHub requirement.
The operator subsequently approved reusable account metadata access and
automatic renewal as part of the current maintenance repair. Its source and
operating qualification remain distinct from the customer-facing setup below.
Fixing
this local deployment or verifying one identity does not qualify independent
customer installation. A customer must not depend on the original developer's
accounts, App identifiers, private files, preloaded Vault state or Codex help.

### Required Customer Experience

1. The core Console starts without optional external providers. Each affected
   feature explains that its connection needs setup before an operation begins;
   unrelated features remain usable.
2. A discoverable connection setup flow explains purpose, required account or
   administrator authority, permissions and repository scope in plain language.
   It guides necessary provider-native authorization and returns to the Console.
   Customers do not reconstruct setup from internal runbooks or edit runtime
   environment variables for routine connection management.
3. Setup proves the intended account, access scope and a real authorized read
   before reporting Connected. App installation, credential delivery and
   operating readiness remain distinct observations.
4. Secrets stay in the installation's approved backend custody. Short-lived
   credentials renew automatically; restart, expiry, revocation, installation
   suspension and changed repository access produce clear status and recovery
   actions without secret exposure or Codex/CLI intervention.
5. Creating or linking another private repository has an explicit supported
   access path. Access already covered by an approved grant is handled
   automatically. Any additional provider approval is explained and reachable
   from the workflow before it is needed; a failed lookup must not be the
   customer's first notice of missing setup.
6. Installation instructions and in-product help describe which connections
   are optional, which features require them, and how to connect, inspect,
   reconnect and disconnect them. Verify the same expectations for other
   external integrations required by the supported release scope; do not assume
   this GitHub finding proves their setup is complete or broken.

### Decisions Required Before Implementation

- Choose the identity model for independent installations: guided
  customer-owned GitHub App registration or a product-owned App connection.
  Ownership, callback/access paths, credential custody and any vendor-service
  dependency must be explicit. The current developer-owned App is not the
  customer onboarding design.
- Design the customer-facing choice between the now-approved maintenance
  direction of explicit account-wide metadata reading (no repository filter,
  so future repositories are included) and selected-repository isolation.
  Explain each scope and its onboarding consequences; do not widen access
  automatically. Keep source-content and write privileges separate. Customer
  identity registration and independent-installation acceptance remain open;
  they must not be used to defer the active backend repair.
- Reuse the existing Console, Platform and OOS connection boundaries; do not
  assume this follow-up requires another service, control plane or installer.

### Release Acceptance Evidence

Qualify a fresh supported installation and a separate customer account or
organization with no inherited developer credentials or private state. Show
provider-free startup, guided authorization, actual connection verification,
supported private-repository creation/linking and metadata inspection, access
handling for the next repository, automatic renewal and restart recovery, and
understandable revocation/reconnection behavior. Routine operation must be
possible through the Console, with only explicitly documented provider-native
administrator actions. Record the supported environment, limits and actual
operating evidence; source tests or the existing developer installation alone
cannot close this entry. Carry this open requirement into the final release
readiness review and close it only with that evidence.

## Completed Local Prototype Outcomes

- Normalized console record hierarchy and read order.
- Removed stale master-plan, old audit, and deep-design records from the active
  record set.
- Completed Delivery's local prototype surface pass across Home, Intake, Work
  Design, Refinement, Execution Board, and Delivery Catalog as peer surfaces.
- Recorded Proposal as a compact focused workflow control modal.
- Recorded Repository as a compact focused repository control modal.
- Promoted shared selected-panel and filter-bar behavior into Teras.
- Recorded that the old Prototype comparison source was replaceable
  scaffolding.
- Added the canonical machine-readable architecture model and synchronized
  views for system context, operator surfaces, authorities, lifecycle,
  handoffs, runtime and release, and implementation maturity.
- Replaced the old universal Movement Control authority with a shared lifecycle
  transition contract covering source intent, validation, target admission,
  exception evidence, orchestration, application, and receipts.
- Locked Proposal-to-Prototype and Proposal-to-Delivery as automatic validated
  transitions with distinct target application receipts.
- Inspected the old Prototype comparison source and recorded carry-forward
  behavior plus replacement risks in `implementation-audit.md`.
- Designed Prototype Control as a register-led, dashboard-centered,
  workflow-owned domain that prepares structured transition intent without
  claiming target admission or application.
- Built Prototype Control from structured read models, selectors, commands,
  receipts, controller-owned state, registry, dashboard, workflows, Preview Runtime,
  History, and compact request entry.
- Recorded that reworked operations must not use inline Workbench surfaces as
  accepted product entry.
- Corrected Prototype replacement shape so `PrototypeWorkspace` owns only the
  accepted Prototype Control modal, not any legacy switch.
- Recorded that mock, synthetic, and read-model scenario data must be corrected
  to the accepted contract before visual inspection or accepted replacement.
- Audited accepted Prototype Control mock/scenario data and added an
  architecture guard to reject stale terms in active Prototype source.
- Added the missing direct Prototype Request ingress to Prototype Control.
  It creates a prototype-local `local-entry` / `exploring` record and routes
  it into the normal Prototype register, dashboard, and workflow path.
- Corrected the request entry panel shape so Prototype uses the same compact
  control overview pattern as Proposal and Repository instead of placing the
  request action inside the summary panel header.
- Corrected Prototype register and selected-launcher drift against the compact
  control pattern: whole-record status, secondary inspect row actions, and
  compact selected panel.
- Corrected Prototype Dashboard drift against the accepted dashboard cockpit
  pattern and guarded it against returning to the old local workflow-entry
  shape.
- Recorded the missing Prototype Landing model: request capture is not landing,
  the support profile drives scaffold/tool/evidence requirements, and lifecycle
  movement uses transition-specific workflows rather than one generic staged
  modal.
- Implemented Prototype Landing as the first workflow after request capture:
  structured landing plans now classify support, source home, preview need,
  scaffold, evidence, validation, and safety cues; recording Landing updates
  the local projection to record shaping and keeps the dashboard progress coherent.
- Renamed the placeholder Workflow operation domain to Orchestration and
  recorded the OOS/Temporal boundary so future workflow runtime wiring stays
  backend-owned instead of leaking into normal workspace UI.
- Locked the Operation Workbench durable-orchestration standard and current
  use-case matrix. Orchestration now has accepted Home, Definitions, and Runs
  responsibilities; definition authoring produces a versioned implementation
  contract rather than executable workflow code.
- Completed the first definition-ready durable contract for
  `delivery.refinement.apply` v1. It freezes content-addressed input, limits
  mutation ownership to governance, plan reconciliation, and metadata apply,
  and defines preflight, idempotent recovery, cancellation, verification,
  receipts, and current OOS admission gaps.
- Stress-tested the generic definition and run contracts against Prototype
  Landing and Model Profile work. The normalized contract now supports bounded
  conditional execution, structured waits, plural authority evidence,
  concurrency locks, effect posture, artifacts/logs, definition families, and
  explicit source-domain projection without domain-specific run states.
- Corrected the first Prototype dashboard/workflow boundary after
  legacy-reference inspection: Preview Runtime is a stable runtime surface for
  profile, runtime, logs, and local proof actions. Preview proof is
  evidence for Baseline Packet work; Preview Runtime is not a workflow-session
  modal.
- Converted Prototype Baseline Packet from an inspector dialog into a
  workflow-session modal with a dedicated packet model, progress selector,
  evidence, gap, packet-result steps, a local packet action, and guard coverage
  against returning to the old inspector shape.
- Converted Prototype Movement Request preparation from an inspector dialog
  into a workflow-session modal with a dedicated movement model, target, gate,
  request steps, a locked packet-first state, and guard coverage against
  returning to the old inspector shape.
- Corrected Prototype Baseline Promotion projection: incomplete packet drafts
  stay editable and do not create partial local submission receipts; approved
  packets record only when they can move to `ready-for-movement`.
- Completed Prototype cutover by removing the temporary comparison wrapper and
  keeping `PrototypeWorkspace` as the only active Workbench entry.
- Added Prototype workflow-session footer controls: the dashboard now carries
  `Back To Register` plus the current move, and active workflow modals carry
  `Back To Dashboard` plus the contextual prototype-local command.
- Remodeled the useful legacy gate-resolution idea into the new Prototype
  workflow models: Baseline Packet and Movement Request now show structured
  recovery rows beside the command gate instead of leaving locked or incomplete
  states as disabled buttons only.
- Replaced rigid Prototype request type classification with Landing support
  profile and support rows. Request capture now uses a support profile shortcut
  with a help dialog, while Landing records source, studio home, interface,
  runtime, data, integration, tooling, evidence, visibility, and recovery
  support states.
- Promoted Prototype Request capture from a plain form into a first-class
  readiness surface: required fields and selected options now drive a live
  checklist, and submit is locked until every required row is ready.
- Converted Prototype Landing support rows from static signal rows into
  editable structured checklist rows. Row state changes stay in local draft
  state until the landing move is recorded, and leaving with unrecorded edits
  now uses the shared draft close guard.
- Normalized Prototype Landing back to the compact wizard rule: the body uses
  shared Teras trays, checklist rows, and a primary `TerasSelectField` for the
  active support option, while the full support/setup status lives in the right
  check panel instead of a local card grid or planner dump.
- Completed all seven Orchestration implementation phases. The direct
  fullscreen workspace now owns Home, Definitions, and Runs; the stale
  placeholder fallback is removed; public exports are narrowed; and focused
  architecture guards protect the completed source and authority boundaries.
- Completed the whole-Operation Workbench host proof. One typed registry now
  owns all selector labels and domain identities, route composition is
  exhaustive, every domain mounts through its public workspace boundary, and
  portal-rendered surfaces expose the same host-contract metadata. Focused
  guards and semantic tests reject unknown labels, placeholder fallback, and
  private host imports.
- Completed the first whole-console extraction phase. Replaced
  `src/data/today.ts` with capability-owned fixtures, removed dead domain and
  signal fixture branches, derived Workbench selector identity from its typed
  registry, removed obsolete shell-owned workflow session state, and added
  focused ownership guards and semantic tests without changing visuals or
  operator behavior.
- Completed the Command Center ownership phase. Workspace Pulse, System Mood,
  priority briefing, decision scenarios, and their presentation now live
  behind the Command Center boundary. The route page keeps only the
  cross-capability focus router and remaining shell composition for those
  surfaces, and focused guards prevent Command Center implementation from
  returning to the route.
- Completed the Console Shell ownership phase. `src/app/page.tsx` is now a
  seven-line Shell mount; the command bar, cross-capability focus router,
  context propagation, scenario and selection controller, Governance Activity
  projection, and major-surface composition live under Console Shell.
  Operation Workbench owns its selector presentation and exhaustive domain
  host, with focused guards preventing page-owned composition from returning.
- Completed the Runtime Readiness and Agent Console ownership phase. Runtime
  fixtures, pure projections, browser telemetry state, presentation, host
  telemetry adapter, and thin HTTP handler now have separate owners. Agent
  model status, client session controller, presentation, request-admission
  policy, Ollama adapter, and thin HTTP handler are likewise separated. The
  accepted visuals, polling behavior, streaming behavior, and API contracts
  remain unchanged and are protected by focused guards and semantic tests.
- Completed the global style-isolation phase. Removed unreachable Operation
  Workbench selectors from `globals.css`, changed Agent modal detection to the
  stable `data-teras-modal` shell contract, and added a focused ownership guard.
  Active broader Console styling remains unchanged and will be moved only with
  its owning surface.
- Locked Prototype-to-Delivery as a normal Delivery Intake graduation with a
  richer Prototype continuation packet, resolved source custody, and a final
  target application receipt. The route replaces stale Movement Control
  ownership without introducing a new backend service.
- Replaced the arbitrary-item Portfolio posture model with a managed-product
  catalog, Product Dashboard, Curation, structured publication packets, and
  independent product, listing, access, runtime, release, and freshness
  projections.
- Removed direct Proposal and Prototype routes to Portfolio and retained the
  rule that Portfolio takes no source, runtime, release, or security authority.
- Replaced the short-lived product-only intake Workbench domain with generic
  Workspace Governance entrant-classification and active-inventory-promotion
  contracts for repositories, products, and components.
- Replaced Portfolio Admission with Publication over canonical Workspace
  product identity and versioned product-owner packets. Portfolio now owns
  publication and listing state only.
- Completed Lifecycle Transitions Phase 1 without mounting a replacement
  surface: three locked routes now use typed authority artifacts, a pure
  invariant-checked state projector, next-owner selectors, and structured
  prototype-local scenarios.
- Completed Lifecycle Transitions presentation and direct cutover. The
  main-console surface now exposes only the three locked routes, derives status
  and receipt history from structured projections, routes only to real owner
  workspaces, and no longer contains the historical five-lane Movement Control
  implementation or decision modal.
- Completed Environment Lifecycle Baseline Foundation Phase 1. The profile and product
  capability model, request and command contracts, selectors, authority-shaped
  fixtures, synthetic scenario matrix, and focused semantic coverage now form
  the unmounted implementation foundation.
- Completed Environment Lifecycle Baseline Foundation Phase 2. One full-width
  main-Console entry now opens Dev Integration or Governed Releases through a
  shared connected surface and fixture-backed read-only registers, without a
  Home view, modal, legacy toggle, Workbench registration, local CSS, or Teras.
- Completed Environment Lifecycle Baseline Foundation Phase 3. Dev Integration now
  provides the filtered profile register, stable Profile Dashboard, secondary
  history view, and guarded three-step Profile Request workflow. Submitted
  requests project only prototype-local `proposed` truth.
- Completed Environment Lifecycle Baseline Foundation Phase 4. Governed Releases now
  provides the filtered product register, stable Product Release Dashboard,
  capability-derived OpenClaw release and runtime-lifecycle drafts, and the
  truthful OpenProject unavailable projection. Both action paths use guarded
  two-step workflows derived from product capability descriptors.
- Completed Environment Lifecycle Baseline Foundation Phase 5. A single Environment-owned
  in-memory runtime now connects profile requests, runtime controls, promote
  checks, product release actions, and product runtime-lifecycle actions to
  idempotent commands, expected-source checks, ordered operations, immutable
  local receipts, safe logs, effective-state replay, failure, retry, and
  reconciliation scenarios. No live or sibling-repo mutation is present.
- Completed Environment Lifecycle Baseline Foundation Phase 6. The final audit now
  separates human guidance routes from executable adapters, preserves actor,
  owner, capability, and adapter identity through operations and receipts,
  keeps failed submissions on Review with explicit recovery, exposes
  correlated history, completes profile and product projections, and hardens
  shared tab and dialog accessibility. Focused and whole-console no-build
  validation passes.

## Active Next Work

### Durable Source Graduation

The local baseline was approved on 2026-07-30. Source graduation is tracked by
ART `openproject://work_packages/784` and is complete only when:

1. the exact approved source and product records pass owner-repository
   validation;
2. a fresh Security Architecture delta covers the public owner-repository
   source head;
3. the source lands in `governance-operations-console`;
4. Workspace Prototype Studio records graduation and removes its competing
   active source copy;
5. Workspace Governance promotes the product from proposed intake to active
   product inventory; and
6. one finalized Review Packet binds the merged evidence and rollback order.

### Live Integration and Deployment: Post-Graduation Work

Do not start this program without separate work-home classification and owner
admission. Its deferred scope includes live WGCF/OOS/CGG/platform adapters,
identity and authorization enforcement, durable orchestration, canonical
mutation and persistence, dev-integration admission, governed runtime
activation, and migration.

#### Required Delivery Child: Product Portfolio Classification Vocabulary

Creation trigger: the Governance Operations Console baseline is approved and
the implementation program is admitted into Workspace Delivery ART.

- work-state home: a distinct Workspace Delivery ART child under the Console
  implementation or graduation Feature
- source owner: `workspace-governance`
- recommendation posture: `extend` the existing workspace product contracts;
  do not create a new service or Portfolio-owned vocabulary store
- required dependency review: Security Architecture confirms that listing scope
  and access-class vocabulary do not imply authorization

The child is complete only when:

- a machine-readable product-classification contract defines controlled
  `portfolio_segment`, `product_form`, `listing_scope`, `access_class`, and tag
  vocabulary
- the workspace product schema references or validates those fields without
  overloading the existing retired-term vocabulary contract
- client products use approved opaque `client_ref` values rather than copied
  client data
- OpenClaw and OpenProject have explicit migration or compatibility evidence
- workspace validators and generated operator documentation cover the new
  contract
- the future Product Portfolio adapter consumes a versioned contract and fails
  closed on unknown values
- the owner-repo change is covered by the required review and validation
  evidence before the ART child closes

No ART item, branch, or Landing Unit is created for this deferred Live
Integration and Deployment scope during source graduation.

## Active Console Navigation Cutover

The approved sequence is:

1. record grouped navigation, entry modes, and workspace-modal ownership
2. add the Console-styled floating navigation and entry controller
3. wire Console home routing and direct Workbench-domain launch children from
   the existing typed registry
4. move Lifecycle Transitions into its dedicated full-viewport Teras workspace
   modal
5. move Dev Integration and Governed Releases into separate full-viewport
   Teras workspace modals
6. verify direct Workbench launch, selected-child state, context, dirty guards,
   modal replacement, and return behavior
7. delete the obsolete inline capability presentation, CSS, guards, and stale
   wording

No backend, authority, persistence, domain-workflow, or accepted Workbench
workspace behavior changes in this cutover.

## Do Not Start Without Discussion

- new backend mutation wiring
- new model/AI invocation path
- new runtime lane or platform authority claim
- new Teras primitive or visual variant
- new lifecycle-transition authority behavior
- Console-specific bootstrap lifecycle behavior
- baseline approval claim
- graduation path
