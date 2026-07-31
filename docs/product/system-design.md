# Governance Operations Console System Design

Status: approved local system and design baseline contract.

This is the read-first system contract for the Governance Operations Console
product. It normalizes the accepted direction from the approved local baseline,
the source-structure discipline, the Operation Workbench contract, the Teras
contract, and the domain contracts.

The canonical architecture model and its synchronized projections live under
`architecture/`. When a flow is unclear, read `architecture/README.md` before
changing domain or lifecycle-transition behavior.

The approved source baseline has graduated to the
`governance-operations-console` owner repository. Source graduation does not
claim production authority, governed stage/prod readiness, security acceptance,
or backend mutation readiness.

## Owner And Work Home

Current work home:

- owner repo: `governance-operations-console`
- prototype id: `governance-operations-console`
- prototype lifecycle: `graduated`
- data mode: `real-readonly`
- mutation boundary: `prototype-local`
- runtime lane: owner-repository local preview

The exact source transfer and approved baseline provenance are recorded in
[`../graduation/source-manifest.json`](../graduation/source-manifest.json).
Workspace Prototype Studio retains the historical prototype and graduation
records, while Workspace Governance owns active product classification.

### Bootstrap Boundary

The Console's own development began before this lifecycle model existed. That
history is migration input, not a product capability. It must not create an
`existing-art` ingress, alternate Prototype state, operator bypass, or permanent
compatibility path.

Future live wiring may reconcile the current Prototype Studio record with its
pre-existing Workspace Delivery ART relationship once. The reconciliation must
be idempotent, auditable, owned by the admitted integration boundary, and leave
durable source and target references. It remains outside normal operator UI and
must not change the clean lifecycle used by later prototypes.

Delivery, Proposal, Repository, Model Operations, Prototype, Product Portfolio,
and Orchestration have accepted local prototype shapes inside Operation
Workbench. The approved Console baseline also covers the top-level capabilities,
shared transitions, cross-surface behavior, local evidence, and explicit
post-baseline owner ledger. It does not approve live adapters, canonical
mutation, deployment, security acceptance beyond the recorded local boundary,
or runtime activation.

## Core Idea

The console is a governance operations system, not a generic dashboard.

Its job is to let an operator see, prepare, inspect, and route workspace work
while keeping ownership boundaries explicit:

- domain modules own domain behavior
- shell modules compose domains
- cross-surface modules correlate lifecycle-transition state, runtime posture,
  model posture, and agent assistance
- Teras owns product-neutral UI primitives
- canonical backend systems remain the source of truth for real records

The system is valuable only if it prevents drift between what the operator sees
and what the workspace governance model actually allows.

## Global Architecture

```text
Governance Operations Console
  Console Shell
    viewport-fixed grouped primary navigation dock
      Overview
        Console
      Work
        Operation Workbench
          Proposal
          Repository
          Delivery
          Prototype
          Portfolio
          Model
          Orchestration
        Lifecycle Transitions
      Environment
        Dev Integration
        Governed Releases
    selected entry and focused workspace modal
    global visible context candidate
    global close and dirty guards

  Command Center
    posture summary
    next safe action
    decision queue
    pulse and status summary

  Operation Workbench
    Console quick launcher
    navigation dock direct-domain launcher
    domain selector
    workspace frame
    domain handoff context

    Domain Workspaces
      Proposal
      Repository
      Delivery
      Prototype
      Portfolio
      Model Operations
      Orchestration

  Lifecycle Transitions
    validation and admission projection
    application status
    technical failures
    immutable receipts
    links to the owning action surface

  Environment Lifecycle
    dev-integration profile and operation posture
    product-capability-gated stage and production posture
    platform-owned request and action routes
    two peer workspaces: Dev Integration and Governed Releases

  Runtime Readiness
    bounded local host telemetry
    declared component observation catalog
    source-qualified advisory alerts

  Agent Console
    visible context candidate
    prototype-local projection decision
    bounded local/manual assistance

  Teras
    product-neutral UI primitives
```

## Work-Type Taxonomy

The console must distinguish work type before choosing a surface:

| Work type | Primary home | Console role |
| --- | --- | --- |
| New idea or proposal | Proposal | Capture, triage, disposition, and handoff. |
| Governed delivery work | Delivery | Committed ART-backed planning and execution support. |
| Prototype or incubation work | Prototype | Shape, inspect, preview, and prepare baseline evidence. |
| Managed-product discovery and publication | Portfolio | Validate publication, list, inspect, and curate already admitted products from source-backed product, runtime, security, release, and Delivery evidence. |
| Repository/source custody work | Repository | Admit, onboard, block, or retire source repositories. |
| Cross-boundary transition | Lifecycle Transition Control | Correlate source intent, validation, target admission, application, and receipts without creating a new authority. |
| Environment profile or governed release operation | Environment Lifecycle | Prepare and inspect dev-integration profile operations and product-capability-gated stage/prod paths while retaining Platform Engineering authority. |
| Runtime posture | Runtime Readiness | Read-only local host telemetry, declared component observation coverage, and source-qualified advisory alerts. |
| Agent runtime health and presence | Agent Console | Report provider health and source-backed active runtime heartbeats, with optional versioned Model Operations profile references but no profile-approval authority. |
| Authority-owned waiver or accepted-risk work | Named control authority | Keep normal repair in the originating domain, route only explicitly waivable controls to their canonical authority, and consume a scoped decision receipt. |
| Governed model-profile work | Model Operations | Inspect canonical profile lifecycle and caller-specific access readiness without implying governed invocation. |
| Durable definition and run operations | Orchestration | Qualify and inspect definitions, inspect runs and evidence, and request bounded OOS-projected run controls. |
| Controlled metadata | Delivery Catalog or future catalog owner | Manage controlled values through the owning backend boundary. |

## Source-Of-Truth Boundaries

The console is an operator surface over multiple authorities. It must not
silently become the authority for records it only displays.

| Authority | Owns | Console posture |
| --- | --- | --- |
| Workspace Proposals / OOS | proposal intake and proposal workflow truth | read, draft local commands, and later dispatch through admitted adapter paths |
| Operator Orchestration Service | shared workflow requests, run-control adapters, receipts, and run projections | read, prepare prototype-local commands, and later dispatch only through admitted OOS paths |
| Workspace Delivery ART / OpenProject | committed delivery work-state truth | read, prepare drafts, and route writes only through OOS-backed action paths |
| Workspace Prototype Studio | prototype records, design baselines, prototype lifecycle records | source of truth while the item is still a prototype |
| Workspace Governance product-classification contract | controlled Portfolio segment, product form, listing scope, access class, and tag vocabulary | validate fixture values in Baseline Foundation; consume the versioned machine contract after the required Live Integration and Deployment Delivery child lands |
| Workspace product registry and product owners | admitted product identity, maturity, ownership, classification values, and product-owned showcase metadata | compose into Product Portfolio entries without copying canonical product truth |
| Product Portfolio | publication validation, listing state, listing scope, curation, and managed-product projection | publish only source-backed admitted products; never create product identity or grant runtime access or security acceptance |
| Repository owner/control plane | repository admission, source custody, retirement | read, prepare request drafts, and later mutate only through admitted repository control |
| Lifecycle Transition Control | derived transition status and cross-domain receipt history | read and route to the source, target, WGCF, OOS, or named decision authority; no independent decision authority |
| Workspace Governance | workspace contract waivers and governance exceptions | read decision status and receipts; dispatch only through an admitted authority-owned request path |
| Platform Engineering | runtime lane, stage/prod, release authority | read-only posture unless a governed platform workflow is admitted |
| Security Architecture | trust boundary and security acceptance | read-only posture and review evidence, not security approval |
| Platform governed AI policy records | profile policy, access-plane posture, provider custody, and runtime controls | read-only projection; future requests route through OOS and never write the registry directly |
| Teras | UI primitives only | no domain record authority |

The console itself has no durable business database for operation records. It
may keep UI state, local draft continuity, local prototype receipts, and safe
cache or preference state, but live packages, proposals, repository requests,
lifecycle-transition records, authority decisions, workflow runs, history, and
receipts belong to their owning backend or control plane. Unknown future
surfaces inherit this non-authoritative default only when they are adapters over
another authority. If a future surface needs durable state that no existing
authority owns, that need must create or assign a backend owner before the
console implements live mutation.

Before baseline approval, operation behavior remains fixture-backed and
prototype-local. The locked model separates immutable source and dependency
snapshots from drafts, commands, runs, and receipts; a domain-owned projector
derives the effective operator view. Cross-domain handoffs use versioned custody
packets and do not let one domain mutate another domain's record. This is an
architecture and simulation contract, not approval for live adapters or new
backend capabilities. The complete artifact and reconciliation rules live in
`operation-workbench-contract.md`.

## Console Shell Boundary

Console Shell owns only:

- top-level layout and navigation
- active navigation-entry selection, anchor focus, and focused workspace
  mounting
- prior Console position and focused-workspace return behavior
- global context-candidate propagation
- global close, dirty, and exit guards
- composition of major console surfaces
- composition of agent-console-owned global runtime-health surfaces
- the command bar, cross-capability focus router, Governance Activity
  presentation, and their shell-level interaction state

Console Shell must not own:

- domain posture
- domain action eligibility
- domain workflow state
- domain receipts
- movement gate truth
- runtime readiness truth
- model access authority

## Whole-Console Source Structure

Operation Workbench is the first proven capability boundary, not a special
exception to the rest of the Console. The surrounding Console uses the same
ownership discipline while preserving each capability's distinct product
shape.

```text
src/
  app/                    thin Next.js route mounts and HTTP adapters only
  console-shell/          shell controller, composition, focus, context, guards
    fixtures/             shell-owned synthetic operator metadata
    presentation/         command bar and focus routing
  command-center/         default cockpit posture and operator briefing
  operation-workbench/    typed selector presentation and exhaustive domain host
  domain-workspaces/      operation-domain implementations
  runtime-readiness/      runtime projection, telemetry, and inspection
  agent-console/          local context policy and bounded assistant interaction
  lifecycle-transitions/  cross-domain artifacts, projection, owner routes, and overview
  environment-lifecycle/  profile and product environment capability projections
  product-apps/           incubating reusable product behavior
  teras/                  product-neutral interface primitives
```

Capability roots are public boundaries. Their internals split only where the
code has a real owner, such as `model/`, `read-model/`, `selectors/`,
`fixtures/`, `presentation/`, `state/`, `server/`, or `local-runtime/`. Empty
ceremonial folders and convenience barrels are not part of the target.

Runtime Readiness and Agent Console use the following proven internal shape:

```text
runtime-readiness/
  model/          telemetry, component, alert, and scenario contracts
  fixtures/       declared component catalog
  read-model/     pure scenario, telemetry, observation, and alert projection
  state/          browser polling and sample accumulation
  presentation/   readiness panel, focused detail, and local visual support
  server/         host telemetry adapter and HTTP handler
  index.ts        narrow public composition boundary

agent-console/
  model/          provider status, input policy, context policy, and session contracts
  state/          status polling and interaction-session controller
  presentation/   dock, readiness, status dialog, and icon rendering
  server/         request policy, provider adapter, and HTTP handler
  index.ts        narrow public composition boundary
```

Read models and request policy are deterministic and do not own browser effects,
host access, provider access, or JSX. State modules own browser effects but do
not render. Server adapters own `/proc` or model-provider interaction; server
handlers translate those results into HTTP. `src/app/api/**/route.ts` only
mounts the capability-owned handler.

`src/app/page.tsx` is a thin mount. It must not regain capability
fixtures, business posture, eligibility, workflow sessions, deep modal views,
runtime adapter logic, cross-capability focus routing, or major-surface state.
The route mounts `GovernanceConsoleShell`; Console Shell owns the controller
and accepted major-surface composition. API route files translate HTTP only;
capability-owned server modules own host or provider interaction.

Fixture truth lives with the capability that owns its meaning. The Console must
not keep a whole-console fixture object or a generic shared-data warehouse.
Operation Workbench selector identity comes from its typed registry and domain
contracts. Completed domain fixture truth remains inside its domain. Command
Center, Runtime Readiness, Agent Console, Lifecycle Transitions, and
Environment Lifecycle keep capability-owned model, fixture, or local state
instead of sharing a whole-console data object while real backend adapters are
not admitted.

An operation domain may expose one named read-only
`read-model/activity-source` for Governance Activity composition and one named
read-only `read-model/attention-source` for Command Center composition through
its root public boundary. Public-boundary guards allow those two source roles
explicitly and reject every other internal read-model import or export from the
domain root.

Command Center owns its pulse and system-mood projections plus the neutral
actionable-attention projection rendered by Command Center Focus. Domains and
workspaces expose one public read-only attention source or carry an explicit
reserved/excluded disposition; they retain required-move meaning, urgency,
owner, source, and route truth. Console Shell owns generic typed
cross-capability focus routing and decides whether the focus slot shows Command
Center, Runtime Readiness, or an Operation Workbench domain. Command Center
must not import or switch on domain workspace implementations. The complete
source, ranking, navigation, layout, and live-wiring boundary is defined in
`surface-contracts/command-center-focus.md`.

Operation Workbench owns selector identity and presentation plus exhaustive
domain mounting. Console Shell owns which selector entry is active and routes
cross-capability requests into the Workbench public host. The Console quick
launcher and the always-present `Operation Workbench` navigation group are two
launcher projections over the same typed registry. Each navigation child opens
its domain workspace directly through the existing Workbench host; it does not
scroll to the inline launcher first. No second Workbench page, registry, route
map, or host is mounted. Both launch paths consume the same selection and host
state and must not fork Workbench behavior.
Domain workspaces depend on the Workbench contract leaf, not the composition
barrel, so the Shell may compose the host without a circular ownership
dependency.

The approved top-level navigation and workspace-entry contract lives in
`surface-contracts/console-navigation.md`. Console home retains the current
Operation Workbench quick launcher. Lifecycle Transitions, Dev Integration,
and Governed Releases leave the main Console grid and open dedicated
full-viewport Teras workspace modals after cutover. The global navigation
remains Console Shell presentation and does not adopt Teras styling.

The Console Operator Account, profile-preference boundary, source posture,
fail-closed trust projection, access and session command posture, and deferred
enforcement boundary are defined in
`surface-contracts/identity-and-authorization.md`. Console-local preferences
may change presentation, but browser state and fixture labels never grant
authentication or authorization.

Structural extraction preserves accepted visual and runtime behavior. A visual,
workflow, authority, or backend change discovered during extraction requires a
separate operator discussion.

## Operation Workbench Boundary

Operation Workbench is the host for domain workspaces. It owns the shared frame,
domain selection posture, and handoff context between domains.

Operation Workbench does not own domain internals.

Every domain must define its own:

- surface purpose
- ingress
- canonical source of truth
- lifecycle/status projection
- primary surfaces
- workflow steps, if any
- backend or adapter boundary
- data mode and mutation boundary
- legacy/cutover posture when applicable
- non-goals

Not every domain needs Delivery's full-screen workspace shape or Proposal's
compact workflow modal. Different domain shapes are allowed when the operator
job is different, but they must still respect the shared Operation Workbench
contract, Teras primitives, panel rules, and source-of-truth boundaries.

For any operation being rebuilt or newly shaped, inline Workbench rendering is
not an accepted product entry. Reworked operations open through a focused
modal or fullscreen workspace shell owned by the domain workspace wrapper.
Inline rendering may appear only as frozen legacy comparison during a temporary
replacement window.

Mock, synthetic, and read-model scenario data must also be corrected during a
rework. A new surface must not carry legacy fixture states, route targets,
action labels, source ownership, or fake backend authority that contradict the
accepted domain contract. Bad fixture data blocks inspection and accepted
replacement.

## Cross-Surface Boundary

Cross-surface modules support the whole console and must not absorb domain
ownership:

- Lifecycle Transition Control correlates source intent, WGCF validation,
  target admission, optional authority-decision evidence, OOS execution, target
  application, and immutable receipts. It does not create another approval
  authority or edit Proposal, Delivery, Prototype, Portfolio, Repository,
  Orchestration, or authority-owned decision records.
- Runtime Readiness shows bounded local host telemetry, declared component
  observation coverage, and source-qualified advisory alerts. It does not
  fabricate environment posture or mutate runtime, delivery, movement, or
  domain records.
- Agent Console provides bounded assistance over an explicit visible context
  candidate. Before governed CGG integration, Focus mode may project only
  bounded synthetic candidates under the prototype-local policy. Live and
  source-projected candidates remain display-only. Agent Console must not
  receive raw operational context, make autonomous governance decisions, or
  mutate canonical workspace state.

## Orchestration Boundary

Orchestration is the operation domain for durable definition qualification,
definition visibility, shared run visibility, and bounded run control. It has
three primary surfaces: Home, Definitions, and Runs in a direct fullscreen
workspace. The complete operator composition, source architecture, fixture
matrix, and implementation phases live in
`domain-contracts/orchestration.md`.

The Definitions surface determines whether a backend operation should remain
synchronous, stay conditional, or become a durable candidate. A qualified
candidate may be shaped into an implementation-ready definition packet. The
surface does not generate executable workflow code or activate definitions.

OOS owns the workflow catalog, definition projection, durable workflow request,
aggregate run projection, run-control API, correlation, and receipt boundary.
Executable source remains in the selected implementation owner repo.

Temporal is the planned durable runtime adapter behind OOS after admission. It
belongs in architecture records, diagnostics, adapter health, and future
backend wiring plans. It should not become normal operator copy in completed
workspace UI.

Domains may prepare OOS workflow requests and consume OOS run projections, but
they keep their own workflow steps, local drafts, and current-required-move
semantics. Lifecycle transition projections consume orchestration receipts when
a run applies a cross-domain target change. Technical run failure remains an
Orchestration concern rather than a governance rejection.

Definitions use bounded execution nodes for activities, structured waits, and
subworkflows. Run state does not replace domain lifecycle, request-review,
fulfillment, readiness, or landing state. A supported defer control projects a
structured `waiting` condition rather than a separate deferred lifecycle.
Related operations may share a definition family while keeping independently
versioned behavior, as required for Model Profile fulfillment, activation,
suspension, and retirement.

The qualification and definition rules live in
`durable-orchestration-standard.md`. Current domain decisions live in
`orchestration-use-case-matrix.md`. The concrete cross-domain request and
projection contract lives in `orchestration-boundary-contract.md`.

## Prototype Ingress Model

Prototype records do not have to originate only from Proposal.

Accepted model:

```text
Creation is cheap.
Admission is controlled.
Graduation is governed.
```

Allowed ingress classes:

- `local-entry`
  - local scratch or emergency exploration
  - starts as `exploring`
  - private/internal
  - mock, synthetic, or explicitly approved read-only data only
  - cannot graduate, become client-visible, or use real mutation without a
    later approval path
- `proposal-routed`
  - routed from Proposal after triage/disposition
  - normally starts as `candidate`
  - has a proposal reference and route decision
- `existing-source`
  - source already exists and is being registered for control
  - must state current owner, source path, data mode, mutation boundary, and
    why it entered registration late
- `imported`
  - imported from another approved system or operator process
  - must carry provenance and authority evidence

External agents, API feeds, or broker events should normally enter Proposal
first. Direct Prototype ingress is allowed for local incubation only, not for
governed acceptance.

## Prototype Lifecycle

The prototype lifecycle follows the repo operating model:

| State | Meaning | Allowed next moves |
| --- | --- | --- |
| `exploring` | Rough local sketch or emergency/local entry. | Promote to `candidate`, keep local, or retire. |
| `candidate` | Worth shaping, not design-approved. | Prepare baseline, keep shaping, prepare route-specific transition intent when allowed, or retire. |
| `baseline-approved` | Operator accepted the design/workflow/boundary baseline. | Continue local implementation against the baseline, prepare graduation, or retire. |
| `graduating` | Moving to Delivery ART, an existing repo, a new repo, or an admitted platform path. | Complete graduation, cancel graduation, or retire with evidence. |
| `graduated` | Source of truth has moved elsewhere. | Inspect history only unless explicitly reactivated. |
| `retired` | Intentionally stopped. | Inspect history only unless explicitly reactivated. |

`baseline-approved` is not a live authority claim. It does not mean:

- real backend mutation is approved
- client exposure is approved
- stage or prod is approved
- security acceptance is complete
- Delivery ART execution is accepted
- source ownership has graduated

## Two-Program Delivery Boundary

Console work is tracked as two separate programs. Their scope and percentages
must never be combined.

### Baseline Foundation: Baseline Candidate

This is the current program. It owns the complete product contract:

- every intended top-level capability has an accepted operator purpose
- every visible state and action has truthful semantics
- source-of-truth, ownership, authority, data, and mutation boundaries are
  explicit
- structured fixtures and prototype-local commands prove normal, unavailable,
  waiting, completed, and supported failure paths
- typed ports define future backend interaction without implementing it
- cross-surface routing, close guards, receipts, and next actions are coherent
- visual language, source structure, Teras usage, diagrams, and focused proof
  are accepted
- all deferred live work is listed by owning control plane

Baseline approval may carry open implementation work. It must not carry
unresolved product meaning. An unknown owner, state transition, source of
truth, action effect, failure meaning, recovery route, authority boundary, or
capability-availability rule is baseline-candidate work, not post-baseline
backend work.

### Live Integration and Deployment: Post-Baseline Implementation And Graduation

This program begins only after the design baseline is approved and a governed
work home is assigned. It owns:

- real backend APIs and adapters
- canonical-system mutation and durable persistence
- OIDC identity, RBAC, approval identity, and authorization enforcement
- durable orchestration and Temporal workers where qualified
- WGCF, OOS, CGG, repository-control, and platform integration
- dev-integration admission and governed stage or production activation
- durable audit aggregation, reconciliation, migration, and cutover
- live contract, recovery, security, and runtime validation

The Console does not gain a business database in Live Integration and Deployment. Canonical records
remain in their owning systems.

## Approved Baseline Capability Checklist

The table is exhaustive for the currently known Console scope. `Accepted
current shape` means the product shape was accepted as local baseline evidence.
Post-baseline implementation remains separate and does not reduce or inflate
that acceptance.

| Capability | Required before baseline approval | Deliberately post-baseline | Current posture |
| --- | --- | --- | --- |
| Console Shell | Stable Console-styled grouped navigation, anchor routing, focused workspace-modal composition, context propagation, dirty/close guards, and capability mounting. | Live user session and identity-provider integration. | Accepted current shape with typed navigation, focused routing, independent agent sessions, account controls, and workspace mounting. |
| Command Center | Truthful posture, priority, decision, and governance-operation summaries with clear routes to owning surfaces. | Live WGCF graph, ledger, readiness, and escalation feeds. | Approved surface contract and accepted current shape with domain-owned attention sources, deterministic ranking, bounded routing, and focused semantic proof. |
| Proposal | Accepted capture, triage, disposition, handoff, state projection, and receipts using structured fixtures. | Live OOS and proposal-system adapters. | Accepted current shape. |
| Repository | Accepted request, admission, posture, retirement, history, and repository-link semantics using structured fixtures. | Live repository-control and owner-repo adapters. | Accepted current shape. |
| Delivery | Accepted Intake, Work Design, Refinement, Execution, Catalog, history, correction, and package-context behavior. | Live OpenProject/OOS mutation, reconciliation, and subscriptions. | Accepted current shape. |
| Prototype | Accepted request, landing, dashboard, preview runtime, lifecycle workflows, history, and transition-intent behavior. | Live prototype registry adapters, durable runtime control, and graduation mutation. | Accepted current shape. |
| Workspace entrant classification and active-inventory promotion | Versioned generic repo, product, and component candidate contracts; canonical-schema intake and active-record shapes; explicit Workspace Intake decision; separate dependency-checked promotion; no overlap between intake and active inventory; synchronized lifecycle and handoff diagrams; isolated command and receipt proof. | Live source adapters, authenticated Workspace Governance decision path, OOS commands, reviewed canonical mutation, and authority readback. | Architecture, workflow definitions, production-shaped Console contracts, and local simulation accepted; no standalone Workbench surface or live adapter. |
| Product Portfolio | Accepted catalog, Product Dashboard, publication validation, curation, availability, release, and Delivery-history behavior over active products using authority-shaped fixtures and command models. | Live product-registry, product-manifest, WGCF, Platform, Security, Delivery, and release adapters. | Accepted current shape. Publication cannot create, classify, or actively register product identity. |
| Model Operations | Accepted caller-specific profile posture, dashboard, request placeholder, capability gates, and unavailable states. | Governed model-profile request API and invocation-plane wiring. | Current shape accepted; live request path unavailable by design. |
| Orchestration | Accepted Home, Definitions, and Runs responsibilities; versioned definition, run, wait, recovery, receipt, and advisor semantics. | OOS catalog expansion, executable source, workers, broker/runtime wiring, and qualified Temporal execution. | Accepted current shape; all seven local implementation phases and focused definition/run proof are complete. |
| Lifecycle Transitions | Read-only correlation of source intent, validation, target admission, application, failures, receipts, and owner routes without central decision authority. | Live WGCF/OOS/target adapters and canonical target writes. | Accepted authority model and dedicated full-viewport Teras workspace implemented; obsolete inline presentation removed. |
| Environment Lifecycle | Accepted operator model for dev-integration profiles and operations plus product-capability-gated stage and production readiness/promotion views. | Platform execution API, shared runner, GitHub workflow, Argo, stage, production, and post-promotion wiring. | Baseline Foundation behavior and dedicated Dev Integration and Governed Releases workspace cutover complete; obsolete inline presentation removed. |
| Runtime Readiness | Truthful read-only local host telemetry, declared component observation coverage, source-qualified alerts, and explicit stale/unavailable states. | Admitted component probes and any separately owned platform or WGCF projections. | Accepted current shape with source-qualified telemetry, freshness, alert eligibility, uptime, and focused semantic proof. |
| Agent Console and context admission | Bounded manual assistance, typed visible candidates, server-recomputed prototype-local projection decisions, source-mode cues, input preflight, budget posture, and explicit mutation denial. | Real CGG admission and receipts, governed model access, caller authorization, and downstream adapters. | Accepted prototype-local shape with independent sessions, bounded synthetic Focus projection, server-side request validation, and explicit mutation denial. |
| Identity and authorization semantics | Stable Operator Account surface, prototype-local profile preferences, actor, role, named authority, approval identity, action eligibility, and denied/unavailable presentation in every affected contract. | OIDC, RBAC, durable profile preferences, access-request workflow, token/session handling, and server-side enforcement. | Accepted prototype-local shape; synthetic trust fails closed and deterministic actor/session attribution is preserved through shared command, run, and receipt envelopes. |
| Audit and correlation | Structured event, correlation, causation, receipt, authority, and evidence-reference model with safe operator inspection. | Durable aggregation across OOS, WGCF, CGG, platform workflows, and target systems. | Accepted prototype-local shape with domain-owned activity sources, immutable receipts, ordered run events, cross-domain correlation/custody, safe inspection, and structured export. |
| Adapter and persistence boundary | Typed ports, canonical owners, freshness, reconciliation, idempotency, fallback, and prototype-local simulation rules. | Real adapters, subscriptions, durable stores in owner systems, migration, and cutover. | Accepted Baseline Foundation boundary with shared runtime ports, centralized disposable draft storage, explicit unavailable live adapters, versioned preconditions, idempotency, projection freshness, and reconciliation proof. |
| Teras and product-app boundaries | Accepted product-neutral primitives, no unjustified duplicated styling, and explicit ownership for reusable product behavior. | Packaging or extraction required by later graduation decisions. | Normalization complete for the accepted Console scope; whole-console guards enforce Teras and product-app ownership boundaries. |
| Baseline evidence | Accepted diagrams, preview proof, state/workflow coverage, focused validation, open-item ledger, intended route, and approval record. | Live-contract regression and production evidence. | Approved local baseline and design-baseline record are present; source-graduation provenance is recorded separately. |

## Progress Accounting

Every status report must publish two independent values:

1. `Baseline Candidate Completion`: progress against Baseline Foundation only.
2. `Post-Baseline Implementation Completion`: progress against Live Integration and Deployment only,
   reported as not started until baseline approval authorizes that program.

Missing live APIs, production identity, durable workers, or stage/prod wiring do
not reduce Baseline Foundation completion when their product contracts and deferred owner
records are accepted. Conversely, a polished fixture-backed surface does not
count toward Live Integration and Deployment.

## Baseline Approval Packet

A baseline approval packet must include:

- prototype identity and owner
- prototype objective and target user need
- scope boundary and non-goals
- workflow map
- design baseline evidence
- data mode and mutation boundary
- source boundary
- preview proof, when applicable
- security and governance triggers
- open items and blocked items
- next intended path
- approval record

Required diagrams for this console before baseline approval:

- system context and boundary
- operator surface and component map
- authority and data-flow map
- end-to-end lifecycle and state separation
- handoff and transition protocol
- runtime and release path
- capability and implementation maturity

The active architecture packet is `architecture/README.md`, backed by
`architecture/system-model.yaml`. A future baseline record may reference or
refine its registered views, but it must not contradict the model without an
explicit model and contract update.

## Graduation Model

Graduation is required when a prototype needs durable ownership beyond
Prototype Studio.

Graduation targets:

- Workspace Delivery ART for committed governed delivery work
- an existing owner repo for durable product/source ownership
- a new repo after intake classification
- platform path after owner and delivery/security gates exist
- retirement if the work stops

Product Portfolio publication is not a Prototype graduation target. A product
becomes eligible only after durable product ownership and product admission
exist. Portfolio then publishes source-backed product truth and operating
evidence without taking source, runtime, or security authority.

ART is not compulsory for every prototype. A prototype enters ART only when it
becomes accepted governed delivery work. Most live-available products will
eventually need platform/release handling, but the raw prototype does not move
directly into production authority.

Typical governed path:

```text
Prototype
  candidate
  baseline-approved
  graduating
  Delivery ART or owner repo
  platform integration
  stage/prod only through governed release authority
```

## Lifecycle Transition Control Relationship

Lifecycle Transition Control is a shared validation, application-status, and
receipt-projection capability. It is not a boundary/custody authority and does
not own a generic decision workflow.

The source domain owns route intent. WGCF or another admitted validator owns
gate evaluation. The target domain owns admission. The authority identified by
the named control owns waiver or accepted-risk decisions. OOS owns adapter
execution and retry. The target adapter owns canonical mutation.

The concrete authority model, transition states, invariants, and locked route
matrix live in `surface-contracts/lifecycle-transitions.md`. Authority request and
receipt rules live in `authority-decision-contract.md`.

Proposal-to-Prototype and Proposal-to-Delivery are automatic after validation.
Prototype admission creates a derived Prototype entry before Landing. Delivery
admission creates an Intake source with `needs_consume`; Delivery Intake
Consume remains an internal Delivery action.

No Movement Control decision workspace is approved. The dedicated Lifecycle
Transitions workspace modal exposes status, failures, receipts, and links to
the authority that owns the next action without taking that authority.

Lifecycle Transitions does not own environment execution. Environment
Lifecycle is the operator surface for dev-integration profile operations and
for product-capability-gated stage or production paths. Runtime Readiness
remains the read-only posture surface. Platform Engineering retains environment
contracts, runner, GitHub workflow, Argo, stage, and production authority.
The full state, command, persistence, capability, and phased implementation
contract lives in `surface-contracts/environment-lifecycle.md`.

## Style Ownership Boundary

Teras is opt-in component infrastructure for accepted product-neutral
patterns. It is not a global Console theme, and importing the root stylesheet
must not make an Operation Workbench domain depend on broad Console styling.

Operation-domain presentation is owned by Teras modules, accepted product-app
modules, and the domain composition boundary defined by the Operation
Workbench contract. Operation-domain class selectors do not belong in
`src/app/globals.css`.

The root stylesheet currently retains the neutral document foundation and the
accepted host styling of Console Shell, Command Center, Runtime Readiness, and
Agent Console. Those capability styles are host-owned, not a shared primitive
contract. They move behind a narrower capability owner only when that surface
is inspected and discussed; a broad Teras conversion is not an accepted
cleanup shortcut.

Portal-aware broad surfaces detect an open Workbench modal through the stable
`data-teras-modal` shell attribute. They must not enumerate domain or legacy
modal class names. The shared global-CSS ownership guard enforces the single
root mount, rejects Operation-domain and retired modal selectors, parses the
stylesheet, and maintains a bounded global size and rule budget.

## Validation Expectations

Validation is added as surfaces normalize. Required guard families:

- Console Shell does not own domain internals.
- Operation Workbench hosts domains without importing private workflow state.
- domain workspaces export public surfaces through stable boundaries.
- Lifecycle Transition Control does not edit domain records or own domain
  decisions.
- Runtime Readiness remains read-only.
- Model Operations remains caller-specific and read-oriented until its OOS
  request path is admitted; it does not imply governed invocation or direct
  registry mutation.
- Agent Console remains bounded until governed model access exists.
- Teras does not import domain read models.
- global CSS does not retain Operation-domain styles after extraction and does
  not grow new capability styling without an explicit owner discussion.

Before a baseline claim:

- every major surface has a recorded design contract
- Operation Workbench contract is proven
- all eight registered operation domains are mounted exhaustively through their
  public workspace boundaries
- lifecycle transition projections do not duplicate domain editing or create a
  new approval authority
- no major domain logic remains in `src/app/page.tsx`
- focused guards pass
- typecheck passes
- key workflow smoke evidence exists
- visual review confirms the accepted console experience

## Drift Rules

Future work must stop for discussion before changing:

- domain ownership
- source-of-truth authority
- mock, synthetic, or scenario data that shape operator understanding
- lifecycle/status semantics
- workflow steps
- persistence or dirty/guard behavior
- Teras primitive contract
- modal/layout class of a domain
- Workbench entry class and mount owner
- panel/action placement rules
- visual treatment that creates a new reusable pattern

Temporary comparison toggles are allowed only while a replacement is being
inspected and proved. Once a domain replacement is accepted, the legacy path
must be removed from active source and all stale imports, public exports,
guards, and mount references must be cleaned up.
