# Environment Lifecycle Contract

Status: accepted Baseline Foundation behavior and architecture contract. All six
behavior phases are complete: typed truth, the two peer views, Dev Integration,
Governed Releases, prototype-local execution, and final verification are
implemented and proven. The dedicated workspace-modal cutover and obsolete
inline-host removal are complete. Live platform execution remains Live Integration and Deployment
work.

Architecture recommendation outcome:

- `extend` the Governance Operations Console with one cross-surface
  Environment Lifecycle capability
- `extend` Operator Orchestration Service only after baseline approval with
  bounded environment-workflow APIs
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

Baseline Foundation uses structured synthetic fixtures shaped like those sources. Fixture
data must identify provenance and must not imply live environment authority.

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

Live Integration and Deployment is admitted and sequenced independently:

1. add read-only profile and product adapters
2. add identity and server-side authorization
3. admit profile-request submission
4. admit dev-integration runtime commands
5. admit promote-check receipts
6. admit product-specific release workflow dispatch
7. admit product runtime-lifecycle controls
8. add reconciliation and receipt subscriptions
9. remove each fixture fallback only after its live adapter is proven

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
