# Model Operations Domain Contract

Status: locked domain contract with a completed current-shape reference
implementation; backend request wiring remains unavailable and the Console is
not baseline-approved.

Surface mode: Compact Control Mode.

Model Operations is the Operation Workbench domain for governed model-profile
posture and caller-specific access readiness. It replaces Provider Registry as
a profile-governance surface. It does not replace the fixed Agent Runtime dock,
which reports provider health and source-backed active-runtime presence and
remains owned by `agent-console`.

The two surfaces connect only through explicit references. A runtime presence
may carry `modelProfileRef` and `modelProfileVersion`; Model Operations remains
the authority for resolving lifecycle, policy, access-plane, and
caller-eligibility truth for that reference. Agent Runtime must display missing,
stale, suspended, or blocked linkage without repairing or approving it.

## Operator Job

The operator uses Model Operations to answer:

- which governed profiles exist
- which profile lifecycle state is authoritative
- whether at least one registered caller can currently use a profile
- which caller, policy, access-plane, runtime, or security requirement prevents
  use
- which evidence is current, stale, or unavailable
- which owner controls the next required move

Model Operations does not choose models for an agent session and does not
invoke a model.

## Workbench Placement And Mode

Model Operations is an Operation Workbench domain. It uses Compact Control
Mode because its primary operator job is one governed-profile register with a
focused selected-profile dashboard.

The Workbench button opens Model Operations directly. The accepted entry is
not inline, not a global Console card, and not a separate cross-surface modal.

The domain has two stable surfaces:

1. Model Operations Control
2. Model Profile Dashboard

Local runtime inventory is a secondary inspector. It is not a peer primary
surface and is not mixed into governed profile truth.

## Authority Map

| Concern | Authority | Console posture |
| --- | --- | --- |
| Governed profile policy and canonical lifecycle | Platform Engineering model-profile registry | Read-only projection |
| Access-plane and provider-custody posture | Platform Engineering governed AI access plane | Read-only projection |
| Security acceptance and exception evidence | Security Architecture | Read-only projection |
| Registered consumer contract | Consumer owner plus workspace/platform contract | Read-only projection |
| Future profile request workflow | Operator Orchestration Service after explicit admission | Unavailable capability until implemented |
| Delivery implementation state | Workspace Delivery ART | Linked work-state projection |
| Local provider inventory | Local runtime authority | Explicit non-governed exception-runtime projection |

The Console has no durable Model Operations business database. It may keep
ephemeral selection, filters, and dialog state. Profile records, requests,
reviews, runtime evidence, audit evidence, and receipts remain with their
owning authorities.

## Current Proven Truth

The current platform contract proves:

- the canonical registry is
  `platform-engineering/security/governed-ai-model-profiles.yaml`
- the only currently registered profile is `intake-classifier-v1`
- its lifecycle is `suspended`
- its governed invocation path is `governed-ai-gateway`
- its registered caller is `workspace-governance/intake-assist`
- direct provider access is forbidden
- human approval is required
- access-plane profile activation remains disallowed

No current backend proves a profile list API, profile request API, profile
mutation API, activation workflow, ordered profile history, or unified
eligibility projection. The prototype must not present those capabilities as
live.

## Read Model

Model Operations composes immutable projections instead of flattening them
into one loosely mutable record:

- profile policy projection
- registered-consumer projection
- access-plane projection
- runtime-control projection
- security-acceptance projection
- latest audit projection where available
- local exception-runtime projection where explicitly requested
- future request projection after OOS admits the workflow

Every projection declares authority, source version, freshness, and stale
behavior. Missing or stale evidence remains visible; it must not be converted
into ready state.

Invocation eligibility is caller-specific. It is derived from:

- profile lifecycle
- caller identity
- allowed purpose
- data scope
- output schema
- operator identity and approval
- access-plane readiness
- runtime resolution
- audit and egress controls
- current security acceptance

The UI must not expose one global `eligible` boolean when registered callers
have different results.

## Lifecycle And Derived State

Canonical profile lifecycle values are only:

- `active`
- `suspended`
- `retired`
- `exception`

`Blocked`, `Available`, `Stale`, and `Unknown` are derived readiness or
projection states. They are not additional profile lifecycle values.

The Control summary uses exclusive buckets in this order:

1. `Suspended` for lifecycle `suspended`
2. `Retired` for lifecycle `retired`
3. `Exception` for lifecycle `exception`
4. `Available` for lifecycle `active` with at least one eligible registered
   caller
5. `Blocked` for lifecycle `active` with no eligible registered caller

Caller-specific failures remain visible in the dashboard even when another
caller makes an active profile count as Available. Stale or contradictory
source projections raise the overall attention status instead of inventing a
sixth summary bucket.

## Model Operations Control

The primary surface uses the standard compact-control structure:

- summary cards: Available, Blocked, Suspended, Exception, Retired
- one overall workspace-status pill based on projection health
- disabled `Request Profile` capability cue until the backend exists
- searchable Governed Profiles register
- lifecycle filter
- access-readiness filter
- provider/runtime-resolution filter
- selected-profile panel
- access-plane status panel

Register columns are:

- Profile
- Lifecycle
- Access readiness
- Resolution
- Action

The register must not contain a prose `Decision` column.

The selected-profile panel shows stable orientation only:

- profile ID and purpose
- lifecycle
- runtime resolution
- registered caller count
- access readiness
- first-class `Open Profile` action

The access-plane status panel summarizes registry, gateway, audit, and
activation posture. It does not duplicate the selected-profile dashboard.

## Model Profile Dashboard

The dashboard is a stable read surface, not a workflow hub. It uses the shared
large two-zone dashboard layout without page-level scrolling.

The top selected-profile panel contains only:

- profile ID
- purpose
- lifecycle
- source version
- freshness

The left zone contains five grouped readiness checks:

1. Profile Policy
2. Consumer Contract
3. Access Plane
4. Runtime Controls
5. Security Acceptance

Each row uses one of:

- Ready
- Blocked
- Suspended
- Stale
- Unknown

Rows open focused detail dialogs when the underlying evidence needs more
space. Long policy, schema, custody, or audit content does not get pasted into
the dashboard.

The right zone contains:

- Current Required Move as a stateful rail panel
- Registered Consumers as a bounded caller-specific list
- inspectors for Policy, Runtime, and Latest Audit

For the current `intake-classifier-v1` truth, Current Required Move is
`Maintain suspension` until upstream selection, consumer activation, identity,
audit, egress, runtime, and security gates are proven.

`Latest Audit` is not called History. The backend does not currently provide an
ordered profile-history API.

The dashboard does not contain workflow steps, an advisor, profile editing,
model selection, activation controls, or local provider inventory.

## Local Exception Runtime

Local Ollama or similar inventory is labeled `Local Exception Runtime` and is
opened as a secondary inspector from Model Operations Control.

It may show locally observed models, endpoint posture, and bounded hardware
facts. It must not:

- call raw models governed profiles
- call local models approval candidates
- imply local availability grants caller eligibility
- display secrets or unrestricted backend output
- compete visually with governed profile posture

## Future Profile Requests

Recommendation posture is `extend`. No new control plane is approved.

The future workflow extends:

- Model Operations as the Console adapter
- OOS as the operator workflow API and request-state owner
- Platform Engineering as profile source and fulfillment owner
- Security Architecture as acceptance and exception authority
- Workspace Delivery ART as implementation work-state truth

The Console never writes the profile registry directly.

One transport-neutral request envelope supports these intents:

- create
- amend
- activate
- suspend
- retire
- exception

The shared envelope does not imply one executable lifecycle definition.
Request capture and ordinary human review are persisted OOS request-state
transitions by default. Durable execution is split into independently
versioned definition candidates under one `model.profile` family:

- profile fulfillment
- profile activation
- profile suspension
- profile retirement

Amendment routes to the specific fulfillment or activation definition whose
canonical effects change. Exception approval, expiry, and revocation remain
with the authority identified by the governing control, normally Security
Architecture for model security posture. A human review becomes an in-run
authority wait only when the admitted definition requires automatic
continuation, timeout, escalation, or correlated execution after the decision.

The primary `Request Profile` entry starts only `create`. Existing-profile
changes are future contextual dashboard actions; they must not turn the primary
button into a broad action menu.

A profile request captures:

- display name and intended purpose
- requesting owner
- registered caller identities and owners
- requested environments
- input data classification
- admitted context source
- required output-schema reference
- human-approval requirement
- operational expectations
- operator justification

Provider credentials, secrets, raw provider routes, and final provider/model
selection are not operator inputs. Canonical profile IDs and runtime selection
remain platform-owned.

The future operator flow is two steps plus a result receipt:

1. Profile Intent
   - purpose, callers, data boundary, output contract, and environment intent
2. Review Request
   - derived gateway, identity, audit, egress, approval, runtime, and security
     requirements
3. Submission Result
   - request ID, status, routed owners, ART reference, and immutable receipt

The result is a post-submit receipt view, not a third editable workflow step.

## Request And Fulfillment State

Profile request review state is separate from fulfillment state and profile
lifecycle.

Review state:

- draft
- submitted
- under-review
- changes-required
- approved
- rejected
- withdrawn

Fulfillment state:

- not-started
- implementing
- applied
- failed

Profile lifecycle remains `active`, `suspended`, `retired`, or `exception`.

Request approval does not activate a profile. Applying an approved create
request normally creates a `suspended` profile. Activation is a separate
request and requires current access-plane, caller, identity, audit, egress,
runtime, and security evidence.

`changes-required` must identify the unmet requirement, responsible owner, and
next operator action. Mandatory access controls cannot be bypassed through a
generic workaround or accepted-risk label. A permitted exception requires a
Security Architecture decision, owner, scope, expiry or review date, and
durable evidence.

## Current Capability Cue

Until the request backend exists, `Request Profile` remains visible but
disabled and muted. Its support dialog explains:

- that the capability is planned
- which owners must implement it
- which request, review, command, receipt, and reconciliation contracts are
  missing
- that no profile or ART item was created

The prototype must not open a fake request form, store a local request,
optimistically change profile posture, or manufacture a submission receipt.

The deferred capability is carried into baseline/graduation evidence as:

- contract-defined
- backend-unavailable
- not a blocker to visual baseline approval
- a blocker to any claim of live Model Operations mutation capability

Future delivery acceptance requires:

- admitted request schema and workflow API
- OOS request-state projection
- Platform registry fulfillment adapter
- Security review route
- command, run, and receipt contract
- source-version reconciliation
- refreshed Console projection
- rollback behavior

## Persistence And Reconciliation

The Console stores no durable request or profile business state.

Future live flow is:

1. Console submits a versioned request command to OOS.
2. OOS records request state and links delivery work where required.
3. Platform and Security review the request through their owning boundaries.
4. Once required approvals exist, OOS starts the specific admitted fulfillment,
   activation, suspension, or retirement definition when durable execution is
   required.
5. The definition changes the platform-owned registry or access-plane posture
   through its reviewable source-backed path.
6. OOS records the execution receipt and source version.
7. Model Operations refreshes the authoritative projections.
8. The backend projection supersedes optimistic or stale local state.

Completion requires the OOS receipt, Platform registry source version,
validation proof, Security evidence, and refreshed Console projection to
reconcile. Activation additionally requires access-plane and runtime evidence.

Rollback for an activated profile must support suspension, consumer disable,
provider-route revocation, and source-backed reconciliation. The Console may
request or display rollback posture; it does not execute privileged rollback
directly.

## Source Structure

Model Operations follows the same ownership grammar as other Workbench
domains:

```text
domain-workspaces/model-operations/
  index.ts
  read-model/
    fixtures/
    selectors/
    types/
    model-operations-read-model.ts
  work-model/
    profile-requests/
  presentation/
    workspace/
    surface/
    shared/
    dashboards/
      model-profile/
    dialogs/
      local-runtime/
      profile-inspector/
      request-support/
```

The exact files follow real ownership grain. Empty folders, one-export barrels,
and speculative adapters are not created merely to mirror the tree.

The public `index.ts` exports only the workspace entry and domain contract.
Private read models, selectors, dashboard panels, dialogs, and fixtures stay
inside the domain. Presentation uses Teras primitives directly and adds no
local CSS unless a genuine missing visual capability is discussed and promoted
after approval.

Focused guards enforce the source tree, public boundary, authoritative
projection posture, primitive-only styling, cross-presentation ownership, and
typed metadata projection. Model Operations semantic tests are part of the
normal Console semantic suite.

## Cutover Disposition

The former Workbench placeholder and top-level `src/model-operations/` module
are removed. The active domain lives under
`src/domain-workspaces/model-operations/`, uses contract-backed structured
fixtures, and has no legacy/new toggle or comparison wrapper.

The fixed Agent Runtime dock remains the `agent-console` provider-health and
live-presence projection. Runtime entries may reference governed profiles but
must not expose, approve, or mutate profile lifecycle truth.

The cross-surface requirement is reference-based composition with strict
ownership: live presence stays in Agent Console, while governed profile truth
stays in Model Operations.

## Non-Goals

Model Operations must not:

- own agent conversations or prompts
- replace Agent Console
- own context admission or redaction
- replace CGG
- own workflow orchestration or call Temporal directly
- replace OOS
- deploy or host model runtimes
- own provider credentials or secret delivery
- grant Security acceptance
- mutate the Platform registry directly
- present a raw model name as governed access
- imply a suspended profile is usable
- present one caller's eligibility as universal profile eligibility
- fabricate request, activation, audit, history, or receipt truth

## Sources

- `../operation-workbench-contract.md`
- `../system-design.md`
- `../orchestration-boundary-contract.md`
- `../teras-contract.md`
- `platform-engineering/security/governed-ai-model-profiles.yaml`
- `platform-engineering/security/governed-ai-access-plane.yaml`
- `platform-engineering/security/governed-ai-runtime-assist-contract.yaml`
- `platform-engineering/docs/standards/governed-ai-access-model.md`
- `platform-engineering/docs/decisions/adr/ADR-012-governed-ai-access-plane-and-model-profiles.md`
