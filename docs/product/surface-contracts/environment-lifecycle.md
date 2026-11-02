# Environment Lifecycle Contract

Status: accepted Baseline Foundation behavior and architecture contract. All six
behavior phases are complete: typed truth, the two peer views, Dev Integration,
Governed Releases, prototype-local execution, and final verification are
implemented and proven. The dedicated workspace-modal cutover and obsolete
inline-host removal are complete. The Console-to-OOS live adapter now projects
the Platform-operation catalog, retained operations, exact next action,
controls, and receipts without fixture fallback. Platform owner composition,
operating proof, and activation remain Live Integration and Deployment work.

Architecture recommendation outcome:

- `extend` the Governance Operations Console with one cross-surface
  Environment Lifecycle capability
- `reuse` the admitted Operator Orchestration Service Platform-operation API
  for bounded catalog, command, readback, retry, and cancellation behavior
- `reuse` Workspace Governance profile and product contracts, Platform-owned
  runners and release workflows, WGCF readiness evaluation, Security evidence,
  and product-owned adapters
- create no new backend service, business database, release authority, or
  generic environment state machine

## Purpose

Environment Lifecycle is the operator surface for:

- requesting and operating `dev-integration` profiles
- inspecting a product's highest real environment endpoint
- running only product-supported stage, production, and runtime-lifecycle
  workflows
- following command progress, ownership, evidence, and immutable receipts

It is not an Operation Workbench domain. It does not route work between
Proposal, Prototype, Delivery, Repository, or Portfolio.

## Boundary With Adjacent Capabilities

| Capability | Responsibility |
| --- | --- |
| Lifecycle Transitions | Correlate cross-domain work handoffs and application receipts. |
| Environment Lifecycle | Prepare and follow environment-profile and product-release operations. |
| Runtime Readiness | Project read-only observed resource, component, and environment health. |
| Operation Workbench | Own domain work and domain-local workflows. |
| Platform Engineering | Own runtime lanes, shared runner, environment contracts, GitHub workflows, Argo state, stage, production, and release execution. |

Environment Lifecycle may link to Runtime Readiness for observed health. It
must not duplicate telemetry ownership or infer release readiness from health
alone.

## Operator Surface Shape

The Console-styled primary navigation opens Dev Integration and Governed
Releases as dedicated full-viewport Teras workspace modals under the
non-interactive `ENVIRONMENT` group.
Environment Lifecycle does not render as an expanded main-Console surface, an
inline Workbench domain, or a compact operation modal.

The surface has exactly two peer views:

1. `Dev Integration`
2. `Governed Releases`

There is no separate Home view. Primary navigation already provides the two
workspace launch points.

The views stay separate because they have different canonical subjects:

- Dev Integration is profile-centric.
- Governed Releases is product-centric.

A component or workflow may have a profile without being a product. A product
may have a governed release path independent of any one dev-integration
profile. They must not be merged into one synthetic register or universal
status.

## Authority Model

| Concern | Authority |
| --- | --- |
| dev-integration policy and admitted profile registry | Workspace Governance |
| profile implementation and profile-owned commands | profile owner repo |
| shared local runner and runtime-lane fit | Platform Engineering |
| product capability and highest real endpoint | Workspace Governance product contract plus product owner |
| stage, production, release, and runtime-lifecycle execution | Platform Engineering and the product-owned release adapter |
| validation and readiness receipts | WGCF or the admitted validator |
| security acceptance and security exceptions | Security Architecture |
| bounded workflow request, correlation, retry, and receipt API | Operator Orchestration Service after admission |
| protected environment approval and source landing | the owning GitHub and review controls |
| temporary drafts and prototype-local simulation | Governance Operations Console |

The Console does not approve profiles, grant stage or production eligibility,
accept security posture, mutate Argo, or become the source of environment
truth.

## Canonical Sources

Live Integration and Deployment read adapters consume:

- `workspace-governance/contracts/developer-integration-policy.yaml`
- `workspace-governance/contracts/developer-integration-profiles.yaml`
- `workspace-governance/contracts/products.yaml`
- profile-owned `profile.yaml` records and command contracts
- Platform-owned product integration and environment records
- product-owned verification catalogs
- WGCF validation and readiness receipts
- OOS operation and audit projections
- Security-owned review and acceptance evidence

Disconnected preview uses structured synthetic fixtures shaped like those
sources. Fixture data must identify provenance and must not imply live
environment authority. Configured live mode accepts only the OOS projection;
missing or partial owner truth disables commands and never falls back.

During Baseline Foundation, sibling owner repositories are read-only authority inputs.
Governance Console work does not patch them. A mismatch discovered there is
recorded as a deferred owner-repo correction in this prototype and is sequenced
only after baseline approval and work-home assignment.

## State Separation

The UI must not collapse the following state families.

### Profile Lifecycle

Canonical profile lifecycle comes from Workspace Governance:

- `proposed`
- `build-admitted`
- `active`
- `suspended`
- `retired`

Only `active` is self-serve launchable.

### Runtime Observation

Runtime observation is derived from a profile-owned status adapter and carries
source and freshness. The normalized projection may be:

- `unavailable`
- `unknown`
- `stopped`
- `starting`
- `running`
- `degraded`
- `stopping`
- `failed`

An adapter must map its source explicitly. Missing or stale evidence projects
as `unknown`; the Console must not infer `running` from profile lifecycle.

### Command Operation

Each submitted command has its own operation state:

- `requested`
- `queued`
- `running`
- `succeeded`
- `failed`
- `cancelled`

Final operation state requires an executing-authority receipt.

### Stage Handoff Readiness

`promote-check` produces local handoff evidence only:

- `not-run`
- `running`
- `ready`
- `not-ready`
- `stale`
- `failed`

`ready` does not promote a runtime or authorize stage.

Each profile owns an ordered set of structured handoff checks. Every check has
a stable id, operator label, and purpose. A completed promote check records one
immutable outcome for every declared check:

- `passed`
- `blocked`
- `failed`

Each outcome carries its own evidence reference. `ready` is derived only when
every declared check has a recorded `passed` outcome. `not-ready` preserves the
full outcome set and at least one unmet check. The Console must not infer every
check as covered from an aggregate result.

### Product Release And Runtime Lifecycle

Product maturity, highest endpoint, stage capability, production capability,
release objects, and runtime-lifecycle vocabulary remain product-owned.

The shared surface renders a product capability descriptor. It does not force
all products through an OpenClaw-shaped state machine.

## Dev Integration View

### Register

The profile register supports search plus lifecycle, lane-class, and owner
filters. Its stable columns are:

- profile
- owner
- lane class
- profile lifecycle
- runtime observation
- inspect action

The view exposes a first-class `Request Profile` action.

### Profile Dashboard

The stable profile dashboard has three focused views.

#### Overview

- profile identity and purpose
- owner and participating repositories
- lane class and runtime platform
- disposable or persistent state model
- dependencies and expected writes
- admission and security evidence
- current runtime observation, source, and freshness
- current required move

#### Runtime

Active profiles may expose:

- Start or Resume
- Status
- Access
- Smoke
- Stop or Suspend
- Reset

Labels reflect the declared state model. For a persistent profile, `down`
means suspend and must preserve declared project data. Reset is destructive and
requires a confirmation guard.

The Runtime view uses a structured command log and immutable receipt summary.
Raw backend output is available through a separate safe viewer rather than
flooding the main surface.

#### Stage Handoff

- session manifest
- smoke summary
- profile-owned required checks with per-check outcomes and evidence refs
- promotion report
- `Run Promote Check`

The result is handoff evidence for reviewed source and the governed stage path.
It is not a direct environment promotion.

Profile history and receipts remain accessible from the dashboard without
becoming another primary view.

## Profile Request Workflow

The request is a three-step focused workflow.

### 1. Profile Intent

- unique kebab-case profile id
- canonical owner repo
- purpose
- lane class
- participating repositories

### 2. Runtime Contract

- platform-supported runtime target
- disposable or persistent state model
- runtime dependencies
- expected backend-write class and targets
- identity, secrets, runtime privilege, and AI-review triggers

Persistent details open in a focused dialog so the main wizard remains stable:

- persistence justification
- retained data scope
- suspend and resume semantics
- storage size or class
- destructive reset semantics
- cutover plan when upgrading an existing disposable profile
- read-only shared smoke posture
- disposable companion profile when mutating smoke is required

### 3. Review And Request

- completeness checklist
- owner, Platform, and Security requirements
- current request adapter and destination
- `Submit Profile Request`

Submission creates a structured request and a `proposed` projection. It does
not create an active profile, launch a runtime, or approve implementation.

The live request is owned durably by OOS and remains within the existing Dev
Integration workflow for submission, status and original-request recovery. It
does not create a Proposal or ART item. The recording receipt proves only that
the exact request was saved. A requested profile does not enter the canonical
register until Workspace Governance records it. Admission readback must match
both the profile identity and original request reference; matching names alone
cannot adopt another request's approval. Historical OpenProject or document
references on older profiles remain provenance, not a route for new requests.

Canonical selectors are used where a registry exists. Free text is limited to
purpose, justification, and explicitly unregistered dependency notes.

## Governed Releases View

### Register

The product register exposes:

- product
- maturity
- platform owner
- highest real endpoint
- stage capability
- production capability
- inspect action

There is no universal release-status column. Product release models are not
interchangeable.

Products without a governed release rail remain visible. Their dashboard shows
the real endpoint, unavailable capabilities, responsible owner, and existing
operator route without fake disabled workflows.

### Product Release Dashboard

The dashboard has two conditional areas.

#### Release Path

When supported by the product descriptor, this area may expose:

- release candidate
- stage verification
- stage readiness decision
- production promotion
- production verification
- current required move
- candidate and evidence references
- correlated operation receipts

Each material action opens a focused workflow. The Console does not edit
environment records directly.

#### Runtime Lifecycle

This area appears only when the product contract defines runtime-lifecycle
states and effects.

For OpenClaw, the current product-owned states are:

- `live`
- `traffic-stopped`
- `suspended`
- `quarantined`

Runtime lifecycle remains separate from release readiness. A product may
receive a new approved contract while remaining stopped or suspended.
Quarantine blocks promotion when the product contract says so.

Runtime lifecycle behavior is transition-owned, not destination-state-owned.
Each allowed `from` and `to` edge declares:

- operator description
- incident requirement: none, incident, or incident follow-up
- production-verification effect: preserve, inactive, or pending

Entering quarantine requires incident context. Returning from quarantine to
live requires incident follow-up and resets production verification to
pending. Moving to a non-live state makes production verification inactive.
The transition changes runtime lifecycle and the declared verification effect
only; it does not advance release progression.

## Product Capability Descriptor

Each product adapter supplies a versioned descriptor containing:

- product and owner references
- maturity and highest real endpoint
- stage and production support
- release-state source references
- supported release operations
- runtime-lifecycle support and vocabulary
- allowed runtime-lifecycle transitions and their incident and verification
  effects
- required actor or approval capabilities
- verification catalogs
- rollback support, when explicitly available
- source freshness and adapter availability

OpenClaw currently supplies a fully governed stage-to-production path.
OpenProject currently supplies a platform-integrated runtime endpoint and must
not project a separate product-owned stage-to-production rail.

The human operator route is guidance and navigation, not a machine execution
adapter. Every executable release operation and runtime-lifecycle capability
declares its own adapter reference and availability. A command must fail closed
when that adapter is unavailable and must never dispatch through the human
runbook route.

Rollback is never inferred. It appears only when the product descriptor names
a versioned rollback contract and admitted execution route.

## Command And Receipt Contract

Baseline Foundation uses the same typed command envelope against one Environment-owned
prototype-local runtime. It:

- admits a command once per idempotency key
- verifies the expected subject version before applying an effect
- records ordered `requested`, `queued`, `running`, and terminal events
- stores a separate immutable prototype-local receipt for success or failure
- rebuilds effective profile and product state only from successful,
  source-compatible receipts
- preserves correlation and causation across a retry
- reconciles the latest operation and receipt by correlation id

This runtime is an in-memory interaction proof. It never claims Platform,
product, OOS, WGCF, stage, or production authority.

Future live commands retain that envelope and follow:

```text
Console
  -> typed command request
  -> admitted OOS workflow endpoint
  -> Platform-owned runner or GitHub workflow adapter
  -> Platform or product authority action
  -> correlated operation and immutable receipt
  -> Console projection
```

Every command identifies:

- command id and idempotency key
- actor and required capability
- subject kind and subject ref
- action and expected source version
- source and target runtime states for a lifecycle transition
- reason and incident or incident-follow-up ref when required
- correlation and causation ids
- owning workflow and adapter
- created, started, and completed timestamps
- result, receipt, and safe log refs

The browser never invokes shell commands, Kubernetes, Argo, GitHub Actions, or
repository scripts directly.

## Persistence And Reconciliation

The Console has no Environment Lifecycle business database.

- Baseline Foundation form drafts and runtime state are temporary browser memory
- Baseline Foundation source fixtures remain immutable; effective state is replayed from
  successful prototype-local receipts
- failed or stale-source receipts never advance the effective subject version
- a reload discards Baseline Foundation operations, receipts, requests, and projections
- Live Integration and Deployment submitted requests become canonical records in their owner system
- Live Integration and Deployment operations and receipts come from OOS and the executing authority
- product release truth stays in Platform-owned Git and live projections
- promote-check receipts retain ordered per-check outcomes and evidence refs
- runtime-lifecycle receipts retain source state, target state, and the
  product-declared verification effect
- client caches are disposable
- reconnect uses correlation ids to recover workflow state
- final states never come from optimistic client projection
- corrections supersede prior requests or receipts; history is not rewritten

## Failure And Recovery

- incomplete request fields stay local and cannot submit
- stale prototype-local commands fail without mutating effective truth
- duplicate idempotency keys return the already-recorded operation
- a retryable failed prototype-local operation may retry as a new causal
  attempt
- owner, Platform, or Security correction returns to the request owner
- stale runtime observation requests refresh and does not imply failure
- an idempotent technical command may retry through OOS
- a stale release candidate invalidates dependent verification and readiness
- failed stage verification returns to the product owner
- protected approval remains visibly external
- failed promotion remains a Platform or OOS operation failure
- failed production verification does not silently roll back
- quarantine blocks promotion according to the product contract
- unsupported or stale runtime-lifecycle edges fail before projection
- quarantine recovery requires explicit incident follow-up
- rollback appears only through an explicit product adapter

The surface must identify the failure owner, safe next action, source, and
receipt rather than collapse these cases into one `blocked` state.

## Identity, Security, And Logs

Live Integration and Deployment actions require authenticated actor identity and server-side
authorization. Disabled UI controls are not an authorization boundary.

The Console never displays secrets. Large or sensitive command output uses a
safe summary and a CGG-backed projection or artifact reference. Raw output is
opened only through the approved viewer and access policy.

## Baseline Foundation: Baseline Candidate

Baseline Foundation delivers:

- structured profile, request, product capability, command, operation, and
  receipt models
- representative synthetic fixtures for every legitimate state family
- the two dedicated full-viewport Teras workspaces
- Profile and Product dashboards
- the three-step profile request workflow
- prototype-local command simulation and logs
- capability-gated release workflows
- transition-gated runtime lifecycle with product-owned verification effects
- structured per-check promote-check outcomes and evidence references
- destructive-action and dirty-draft guards
- source, freshness, unavailable, failure, and recovery projections
- focused architecture, semantic, and visual proof

Baseline Foundation performs no real platform mutation.

## Live Integration and Deployment: Post-Baseline Implementation

The Console adapter steps below are complete; owner composition and operating
acceptance remain independently sequenced:

1. completed: project current Platform subjects and finite capabilities through
   OOS
2. completed: keep credentials, operator binding, intent digest, and exact
   approval construction server-side
3. completed: submit finite profile, runtime, promote-check, release, and
   runtime-lifecycle command families through one OOS contract
4. completed: project retained operation state, exact next action, retry,
   cancellation, events, and terminal receipts
5. completed: suppress fixtures in configured live, partial, loading, and
   unavailable postures while retaining readable failed history
6. completed product behavior: project runtime readiness, preserve dependency
   failure and retained recovery, reconcile accepted nonterminal operations,
   and fail closed on disconnected, degraded, or stale owner truth
7. pending: commission the Platform owner catalog and command/readback/control
   routes
8. pending operating proof: prove restart, lost-response, reconciliation, and
   terminal receipt behavior in the composed runtime
9. pending: pass exact-revision Security acceptance and fixture-free
   end-to-end proof

Each action family can fall back to read-only projection without corrupting
canonical records.

## Baseline Foundation Implementation Phases

Current state: Phases 1 through 6 are complete.

1. Model and fixtures
   - define typed subjects, state families, capability descriptors, commands,
     receipts, selectors, and scenario coverage
2. Workspace shell
   - replace the temporary expanded Console mount with direct Dev Integration
     and Governed Releases workspace modals without a permanent legacy toggle
3. Dev Integration
   - build the register, Profile Dashboard, request workflow, Runtime controls,
     Stage Handoff, logs, history, and guards
   - submitted requests record only `prototype-local` + `proposed`; runtime
     and promote-check commands execute only through the prototype-local
     Phase 5 simulator
4. Governed Releases
   - build the product register, Product Release Dashboard, OpenClaw descriptor,
     OpenProject unavailable-capability projection, release workflows, and
     runtime-lifecycle controls
   - action fields derive from each product operation descriptor; focused
     two-step drafts submit only declared capabilities to the prototype-local
     Phase 5 simulator
5. Prototype-local execution
   - connect command simulation, idempotency, operation progress, receipts,
     failure, retry, and reconciliation scenarios
   - completed with one Environment-owned runtime, effective receipt
     projection, structured safe log, and focused semantic coverage
6. Verification
   - verify authority boundaries, state truth, content, visual consistency,
     source structure, accessibility, and focused guards
   - completed with explicit adapter and receipt identity coverage, shared
     failure recovery, correlated operation history, complete profile and
     product projections, Console Shell accessibility hardening, focused
     semantic tests, and whole-console architecture guards

## Non-Goals

Environment Lifecycle must not:

- become an Operation Workbench domain
- replace Lifecycle Transitions or Runtime Readiness
- create one universal environment or release state
- approve a profile, security review, stage readiness, or production promotion
- directly execute host, Kubernetes, Argo, GitHub, or repository commands
- create a Console-owned environment database
- infer stage, production, runtime lifecycle, or rollback support
- expose secrets or ungoverned raw operational output
- make `dev-integration` evidence count as governed stage or production proof

## Sources

- `../system-design.md`
- `../architecture/README.md`
- `lifecycle-transitions.md`
- `../orchestration-boundary-contract.md`
- Workspace Governance developer-integration policy and registries
- Platform Engineering dev-integration and product-release runbooks
- Operator Orchestration Service workflow boundary


## Pending maintenance preview: operation inspection and reachability

The operation-backed live surface scopes retained records by their original subject
kind, including profiles no longer in the current catalog. Every loaded operation
can be inspected and read again by exact identity. History expands in ten-record
increments and labels loaded counts without implying a complete lifetime history.
Owner events, effects, receipts and recovery flags stay distinct from catalog health.
New commands require current catalog truth; a destructive review also binds the
reviewed source version and capability, and the server rejects source drift before
dispatch. Context-bound source authorization remains in project Source authoring.

Overview and request-review panels retain natural content heights in the existing
scroll stack. Nested disconnected dashboards and support/history dialogs visibly
identify design-preview provenance. These presentation repairs preserve the accepted
three-step profile request and do not establish live profile-request submission or
full registry/dashboard projection. The finite operation catalog alone is not that
integration. Owner composition and operating acceptance remain separate evidence.


## Governed Releases maintenance extension

The existing register and Dashboard consume bounded real product readback when
commissioned. Product inventory is independent of executable subjects. Newer
owner-managed products are represented without claiming staging or production.
Recorded owner evidence is a separate projection from executable release steps;
its status and candidate binding do not create a Console approval or operation.

Existing protected owner workflows are opened as navigation, clearly labelled
with the execution boundary. They retain their own current source, inputs and
environment approval. No command or receipt is created by opening a link. Native
Console dispatch remains uncommissioned in the live installation. The approved
staged native entry adds a dedicated Platform dispatch identity, reuses the
existing protected workflow and introduces no new executor. Missing owner data and failed refreshes stay explicit;
configured live source never falls back to samples. Nested sample screens retain
Preview and Simulation labels.

Workspace history is filtered at OOS before bounded keyset pagination. Original
records and exact-read recovery remain authoritative. A warm page uses lightweight
file metadata rather than decoding all retained operation payloads; cold discovery
and file-stat costs still grow. The source extension is not live commissioning.

### Native owner workflow entry and source freshness

The staged OpenClaw adapter reuses the existing release Details/Review pattern
and OOS Platform-operation journal. Owner-defined inputs, product, capability and
exact source are reviewed before submission. Actual verification results start
blank. Human environment approval, source PR review/merge, desired-state readback
and observed health remain separate. Workflow success alone is not completion.
Native authority stays unavailable until the accepted composition and dedicated
Platform App are commissioned. Read-only GitHub links grant no mutation.

The running Platform code stays at its accepted revision. A bounded read adapter
may follow GitHub main only when every non-record Git leaf still matches that
revision and main retains the accepted lineage. Only the explicit existing
OpenClaw release/verification/lifecycle GitOps records may advance. A normal
release merge therefore refreshes owner records and permits the next reviewed
operation without a manual pull, checkout change or runtime-code repin.

`owner-main` means current owner main was verified. `accepted-snapshot` is the
reviewed local source snapshot; `retained-owner-main` is a last verified remote
snapshot. The latter two remain inspectable, with a source notice and original
observation time, and cannot enable a new native action. A source outage never
substitutes examples. A bounded derived cache retains one verified snapshot for
restart recovery; it is not canonical work-state authority. Immutable blobs and
shared head proofs avoid per-product probes and repeated full source reads.

A lost response retains only an opaque browser recovery pointer. Recover the
original OOS request; never redispatch after Platform's write-ahead marker. Exact
original reads, events, workflow/PR links and immutable receipts remain available
independently of current catalog admission. Cancellation targets the original run
and does not prove rollback. The two-consecutive-operation qualification uses an
isolated GitHub transport; it is source evidence, not live operating acceptance.
