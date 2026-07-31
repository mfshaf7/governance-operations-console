# Delivery Refinement Apply Definition

Status: `definition-ready` prototype architecture contract; runtime not
implemented or admitted.

Definition id: `delivery.refinement.apply`

Definition version: `1`

Classification: `durable-candidate`

This definition governs only the final Apply command in Delivery Refinement.
Metadata drafting, readiness review, workflow navigation, autosave, and
operator review remain synchronous Delivery behavior.

## Purpose

Apply one operator-approved Refinement packet to the canonical Delivery ART
through recoverable OOS execution. The run must survive loss of the Console
session, expose partial effects truthfully, resume idempotently, and mark the
Delivery package done only after canonical read-back verification succeeds.

The definition does not authorize Temporal adoption or backend implementation.
It is the required contract for later source, platform, security, and runtime
review.

## Ownership

| Boundary | Owner |
| --- | --- |
| Business intent, packet drafting, readiness, and operator approval | Delivery Refinement |
| Definition and request API, aggregate run, controls, and final receipt | Operator Orchestration Service (OOS) |
| Executable definition and current Delivery mutation activities | `operator-orchestration-service` |
| Canonical Delivery work state | Workspace Delivery ART in OpenProject |
| Durable runtime adapter | Planned Temporal adapter behind OOS |
| Runtime deployment and admission | Platform Engineering |
| Trust-boundary and credential acceptance | Security Architecture |

OOS activities may call the existing OOS Delivery service and OpenProject
adapter. The Console never calls Temporal or OpenProject directly.

## Trigger And Scope

The trigger is the operator pressing **Apply Refinement** after all current
packet fields and readiness gates pass.

The accepted command freezes the packet and submits a durable request. Closing
the modal or browser after request acceptance does not cancel the run.

Version 1 owns exactly these mutation classes:

1. initiative governance update
2. child-plan reconciliation
3. reviewed item metadata update

The following remain outside this definition:

- direct work-item create and update calls
- blocker set or clear
- execution start, defer, resume, completion, or retirement
- missing-child parking, deferral, or retirement
- Work Design snapshot creation
- operator drafting or readiness decisions

Direct create and update routes must not run beside `plan/apply` because plan
application already owns bounded child-tree create, update, and reuse behavior.

## Mutation Ownership

Each target field must be assigned to one operation only.

| Operation | OOS route | Owned data |
| --- | --- | --- |
| Governance | `POST /v1/delivery-initiatives/{delivery_id}/governance` | Initiative-level fields such as Target PI and Owner Repository |
| Plan reconciliation | `POST /v1/delivery-initiatives/{delivery_id}/plan/apply` | Child hierarchy, node identity, generated structural fields, and non-destructive create/update/reuse |
| Metadata change set | `POST /v1/delivery-work-items/bulk-update` or its admitted successor | Reviewed item-scoped metadata bound to canonical work-item ids |

The plan payload must omit `epic_updates` owned by the Governance operation.
Item metadata owned by the metadata change set must not also be written by the
plan payload. Version 1 fixes `reconcile_missing` to `ignore`; Refinement Apply
must never retire, defer, or park work omitted from its packet.

## Frozen Request

OOS accepts a schema-versioned request whose mutable content has already been
stored as immutable, content-addressed artifacts.

```yaml
schema_version: 1
request_id: <uuid>
definition_id: delivery.refinement.apply
definition_version: 1
request_type: apply_refinement
source_domain: delivery.refinement
source_record_ref: <delivery-package-ref>
source_version_ref: <immutable-refinement-packet-ref>
intent_summary: <operator-readable-summary>
idempotency_key: <sha256-key>
input_refs:
  refinement_packet:
    ref: <immutable-ref>
    digest: <sha256>
  work_design_receipt:
    ref: <immutable-ref>
    digest: <sha256>
  tree_snapshot:
    ref: <immutable-ref>
    digest: <sha256>
  governance_change_set:
    ref: <immutable-ref>
    digest: <sha256>
  plan:
    ref: <immutable-ref>
    digest: <sha256>
  metadata_change_set:
    ref: <immutable-ref>
    digest: <sha256>
approval_refs:
  - kind: operator
    approval_ref: <immutable-ref>
    authority_ref: <authenticated-principal-ref>
    approved_at: <rfc3339>
lock_refs:
  - <delivery-package-lock-ref>
  - <delivery-initiative-lock-ref>
expected_receipt: delivery.refinement.apply.v1
return_projection: delivery.refinement.apply-run.v1
correlation_ref: <correlation-ref>
causation_ref: <work-design-apply-receipt-ref>
```

The request and Temporal history carry references and digests, not a large
mutable tree or secret values. Activities resolve the immutable artifacts
through an admitted OOS-owned adapter.

The idempotency key is derived from:

- definition id and version
- source record ref
- frozen Refinement packet digest
- required operator approval ref

Submitting the same key returns the existing request and run. Correcting any
input creates a new packet digest, approval, request, and idempotency key.
Retry and resume of unchanged input target the existing run.

## Preflight

No canonical write may begin until preflight proves all of the following:

### Request Integrity

- the definition id and version are active and compatible
- every artifact exists, is immutable, and matches its digest
- the packet ref, packet digest, approval ref, and source record agree
- the Work Design receipt belongs to this package and matches the tree snapshot
- no different active run owns the same idempotency key
- no conflicting run owns the package or initiative lock
- correlation and causation references are complete

### Delivery Readiness

- all required Refinement fields are `complete`
- no field or target is dirty, missing, stale, or blocked
- every required readiness gate is passed
- the target is the top-level Delivery Epic expected by the packet
- Target PI, Owner Repository, classifications, values, and principals are
  accepted by current broker options and schemas
- the plan satisfies Delivery taxonomy, PI Objective, executable leaf-front,
  and active execution-contract rules

### Mutation Safety

- each field is owned by exactly one of the three operations
- the plan contains no duplicate initiative or metadata writes
- plan node selectors are unique and deterministically map to canonical nodes
- `reconcile_missing` is `ignore`
- every metadata selector resolves to one planned or existing node
- every metadata value passes type, length, allowed-value, and form validation
- OOS mutation authority, OpenProject configuration, caller identity, and
  required routes are available

Preflight has two read-only passes:

1. **Static preflight** validates the frozen packet, route ownership, plan,
   selectors, values, and current backend forms before any write.
2. **Binding preflight** resolves the final canonical work-item ids after plan
   reconciliation and validates the complete metadata batch before its first
   metadata write.

Failure in static preflight produces `failed_no_effect`. Failure in binding
preflight preserves the already-applied prefix, enters reconciliation, and
must not claim completion.

## Activity Sequence

Activities run serially in version 1. Parallel mutation is not allowed.

| Order | Activity | Owner | Side effect | Idempotency rule |
| --- | --- | --- | --- | --- |
| 1 | Load Frozen Packet | OOS | None | Resolve immutable refs and verify every digest |
| 2 | Preflight Refinement Apply | OOS Delivery adapter | None | Repeatable current-state and form validation |
| 3 | Apply Initiative Governance | OOS Delivery adapter | Yes | Read before write; no-op when canonical values already match |
| 4 | Reconcile Delivery Plan | OOS Delivery adapter | Yes | Reuse deterministic nodes; create only missing nodes; never reconcile missing nodes destructively |
| 5 | Resolve Metadata Targets | OOS Delivery adapter | None | Bind packet node selectors to one canonical id and retain the mapping |
| 6 | Preflight Metadata Change Set | OOS Delivery adapter | None | Validate all target forms and values before the first metadata mutation |
| 7 | Apply Metadata Change Set | OOS Delivery adapter | Yes | Read before write; emit a receipt per target; skip already-matching fields |
| 8 | Verify Delivery Projection | OOS Delivery adapter | None | Read canonical state and compare it with the frozen expected projection |
| 9 | Record Final Receipt | OOS | Append-only receipt | One final receipt per request and verified terminal outcome |

Every activity records its operation key, attempt, input digest, output digest,
canonical refs, start and finish time, and effect summary. A repeated activity
must return its prior verified result or safely converge on the same canonical
state.

## Retry And Timeout Policy

Version 1 has no human wait or signal. Its total execution deadline is 30
minutes after scheduling.

| Activity class | Start-to-close timeout |
| --- | --- |
| Artifact load and static preflight | 2 minutes each |
| Governance mutation | 2 minutes |
| Plan reconciliation | 10 minutes |
| Target resolution and metadata preflight | 3 minutes each |
| Metadata mutation | 10 minutes |
| Verification | 5 minutes |
| Final receipt | 2 minutes |

Retry only transient backend-unavailable, network, throttling, and server-error
failures. The candidate retry policy is five total attempts, two-second initial
delay, multiplier `2`, and 30-second maximum delay.

Do not blindly retry:

- authentication or authorization failure
- validation failure
- missing target
- backend contract drift
- digest or source-version mismatch
- ambiguous target binding

An update conflict permits one controlled read-refresh-and-compare. Retry once
only when the desired state and mutation ownership remain unchanged; otherwise
block for reconciliation. Activity timeout or retry exhaustion records the
effects already observed before choosing the next action.

These values are definition-version behavior, not global Teras or Console
defaults. Implementation review may revise them before activation; changing
them after activation creates a new definition version.

## Failure And Recovery

Version 1 uses forward recovery. It does not attempt blind rollback of
OpenProject updates or delete newly created work items.

| Failure point | Required behavior |
| --- | --- |
| Before the first canonical write | Fail with no effects; operator corrects the draft and submits a newly approved packet |
| Governance applied, plan not verified | Resume at plan reconciliation after verifying governance |
| Plan partially or fully applied | Re-run deterministic plan reconciliation and rebuild the canonical node map |
| Metadata batch partially applied | Read every target, retain successful rows, and resume only missing or mismatched rows |
| Verification mismatch | Enter `blocked`; expose expected versus observed state and a reconciliation action |
| Authentication or backend contract failure | Enter `blocked`; route to the owning service or authority rather than offering blind retry |
| Transient retry exhaustion | Enter `blocked`; allow bounded resume after service recovery |

Source corrections are never patched into a running definition. If immutable
input is wrong, the existing run is reconciled or closed and Delivery submits a
new approved packet.

Supported blocker dispositions are intentionally narrow:

- `remove` for invalid, stale, or ambiguous input
- `defer` for an unavailable dependency when retaining the run is safe
- `workaround` only through reviewed source or definition change
- no `accept-risk` bypass for Delivery schema, authority, or canonical-state
  verification

## Cancellation

Cancellation is a bounded OOS control request.

- Before activity 3 starts, cancellation finishes as `cancelled` with a
  `cancelled_no_effect` receipt.
- Once a mutation activity starts, do not interrupt the in-flight backend
  request. Record cancellation requested, finish observing that activity, and
  schedule no later business mutation until canonical effects are known.
- If the observed prefix is coherent and no reconciliation is required, finish
  as `cancelled` with a `cancelled_with_effects` receipt.
- If effects are partial or ambiguous, enter `blocked`, reconcile them, and
  only then finish as cancelled or failed.

Cancellation never means rollback and must never hide retained canonical
effects.

Version 1 does not support pause, arbitrary signal, or operator defer during
normal execution. Resume and retry are controls against a blocked existing
run, not new runs.

## Completion Verification

The run becomes `completed` only when canonical read-back proves:

- initiative governance values match the frozen governance change set
- every planned node exists exactly once under its intended parent
- the created, updated, or reused node mapping covers every requested plan node
- no omitted node was parked, deferred, or retired
- every reviewed metadata field matches its expected canonical value
- every activity effect has a correlated receipt and canonical record ref
- the final projection digest matches the expected projection derived from the
  frozen packet

The plan result summary must reconcile with its requested-node count. A
successful HTTP response is activity evidence, not completion proof.

Delivery projects the package as applying while the run is queued, running, or
blocked. It moves the packet to applied and the workflow to done only from a
verified completed receipt. Failure, cancellation, or partial effects never
project as done.

## Receipts

Request acceptance and execution completion are separate records.

### Acceptance Receipt

The acceptance receipt contains:

- request id and optional scheduled run id
- definition id and version
- source record and packet digest
- operator approval and idempotency refs
- accepted timestamp

It means OOS accepted custody of the request. It does not mean Refinement was
applied.

### Final Execution Receipt

The final receipt schema is `delivery.refinement.apply.v1` and contains:

- request, run, definition, source, correlation, and causation refs
- frozen input refs and digests
- operator approval attribution
- activity attempts and per-activity receipts
- canonical before and after refs
- plan node mapping and summary
- per-target metadata outcomes
- verification checks and final projection digest
- retained effects and outstanding reconciliation, if any
- terminal outcome and timestamps

Allowed receipt outcomes are:

- `completed`
- `failed_no_effect`
- `failed_with_effects`
- `cancelled_no_effect`
- `cancelled_with_effects`

Only `completed` may advance Delivery Refinement to done.

## Source-Domain Projection

Delivery consumes the OOS run projection through
`delivery.refinement.apply-run.v1`:

- `queued` or `running`: Applying
- `blocked`: Apply blocked, with owner and required remediation
- `failed`: Apply failed, with effect posture and retry or correction route
- `completed`: Done, with final receipt
- `cancelled`: Not applied, or cancelled with retained effects clearly shown

The current prototype-local immediate `accepted` receipt is a simulation. It
must not be reused as the live completion contract.

## Current Admission Gaps

This definition cannot become `admitted-durable` until the following exist and
are proven:

- OOS definition catalog, durable request, run, control, event, and receipt APIs
- immutable Refinement packet storage with schema version, refs, and digests
- authenticated operator approval evidence bound to the packet digest
- cross-operation read-only preflight
- deterministic plan node identity and returned packet-node-to-canonical-id map
- plan activity idempotency evidence across partial failure
- metadata batch prevalidation before mutation
- per-target metadata outcomes instead of an endpoint that stops after a
  previous row may already have mutated
- canonical verification and final receipt projection
- Temporal worker, persistence, credential, observability, security, rollout,
  suspension, and rollback admission
- deterministic replay, idempotency, failure-injection, retry, timeout,
  cancellation, and reconciliation tests

The current OOS routes remain useful bounded mutation capabilities, but their
existing synchronous composition is not yet this durable definition.

## Source Inspection

This contract was derived from the current prototype Refinement packet and the
current OOS Delivery implementation, including:

- Refinement handoff transition and packet read model in the Governance
  Operations Console
- OOS initiative governance handler
- OOS plan-apply handler and OpenProject reconciliation implementation
- OOS sequential bulk-update handler
- OOS Delivery workflow API v1 contract

The inspected implementation confirms that plan application owns child create,
update, and reuse, while bulk update currently processes rows sequentially.
Those facts drive the no-duplicate-route, preflight, idempotent-resume, and
partial-effect requirements above.
