# Orchestration Boundary Contract

Status: normalized cross-domain contract, not backend implementation approval.

This record defines how Operation Workbench domains qualify durable use cases,
prepare definition requests, submit durable commands, and consume run
projections without leaking backend runtime implementation details into normal
operator UI.

The complete qualification and definition rules are in
[`durable-orchestration-standard.md`](durable-orchestration-standard.md). The
locked current-domain decisions are in
[`orchestration-use-case-matrix.md`](orchestration-use-case-matrix.md).
Versioned concrete contracts are indexed in
[`orchestration-definitions/`](orchestration-definitions/README.md).

## Owner Boundary

OOS owns the shared operator workflow catalog, definition projection,
orchestration request API, aggregate run projection, run-control commands,
correlation, and receipts.

Temporal is a planned durable runtime adapter behind OOS after platform,
security, and dev-integration admission. Temporal is not a direct domain
dependency and should not appear in ordinary completed-workspace copy. It may
appear in architecture records, definition diagnostics, adapter health, and
technical run details.

Operation Workbench domains own business intent, selected-record context,
eligibility, workflow steps, local drafts, operator approval, and domain
projection. They do not own the durable runtime.

WGCF, CGG, Platform Engineering, Repository control, and other components may
own activities or subworkflows inside their established boundaries. They do not
silently become owner of the complete operator workflow.

Lifecycle Transition Control consumes OOS run and application receipts when a
run applies a cross-domain target change. It does not own orchestration or
create a second transition authority.

## Qualification Contract

Before requesting a new durable definition, the source domain or Orchestration
Definitions workspace records:

- candidate id
- source domain and source record type
- execution problem
- synchronous alternative considered
- durability triggers
- classification: `synchronous`, `conditional`, or `durable-candidate`
- classification rationale
- proposed business, implementation, and execution owners
- reevaluation trigger when classification is `conditional`

Only `durable-candidate` proceeds into definition authoring. Classification is
an operator-approved architecture decision, not an AI or runtime decision.

## Definition Contract

An implementation-ready definition packet carries:

- definition id, optional definition-family id, and proposed version
- title and operator-facing purpose
- source domain and source record type
- business owner
- implementation repo
- execution owner and execution-node owners
- trigger and approval requirements
- input and source-version references
- idempotency strategy
- source and target concurrency locks
- bounded execution-node graph with activities, waits, subworkflows,
  dependencies, conditions, parallel groups, and skip reasons
- structured waits, signals, timers, and timeouts
- retry and retry-exhaustion behavior
- reconciliation or compensation strategy
- cancellation boundary
- completion condition
- expected receipt and return projection
- correlation, evidence, retention, and redaction requirements
- security, platform, validation, rollout, rollback, and retirement obligations
- work-home routing decision

The packet is a reviewable implementation contract. It is not executable code,
an active workflow, or runtime admission evidence.

## Definition Catalog Projection

After backend admission, OOS projects each definition with:

- definition id, optional definition-family id, and immutable version
- lifecycle state
- qualification decision
- owner domain and source record type
- business, implementation, execution, and execution-node owners
- expected receipt
- implementation and validation evidence references
- platform and security posture
- activation, suspension, and retirement timestamps
- compatible predecessor or successor versions

Executable source remains in its owner repo. The catalog is an operational
projection, not an alternate source repository.

## Request Contract

When an admitted definition starts durable execution, the source domain sends
OOS:

- `request_id`
- `definition_id`
- `definition_family_id`, when applicable
- `definition_version`
- `source_domain`
- `source_record_ref`
- `source_version_ref`
- `request_type`
- `intent_summary`
- `input_refs`
- `approval_refs`, including the required operator approval and any additional
  authority evidence
- `lock_refs`
- `idempotency_key`
- `expected_receipt`
- `return_projection`
- `correlation_ref`
- `causation_ref`
- `transition_ref`, when the request applies a cross-domain target change

Prototype-local work may model these fields with synthetic fixtures and local
receipts. It must not present them as durable backend evidence.

Each approval ref declares its decision kind, authority, scope, source version,
decision ref, and timestamp. Each lock ref declares the protected source or
target resource and the conflict behavior. A definition may require new
authority evidence through a structured wait, but it may not overwrite prior
approval evidence or mutate frozen request input.

## Run Projection

OOS or an admitted adapter projects:

- `run_id`
- `request_id`
- `definition_id`
- `definition_family_id`, when applicable
- `definition_version`
- `source_domain`
- `source_record_ref`
- `correlation_ref`
- `causation_ref`
- `state`
- `current_node`, including node id, type, label, and owner
- `progress`, including planned, active, completed, skipped, and failed counts
- `wait`, including kind, owner, reason, expected signal or dependency, review
  date or deadline, and timeout behavior
- `blocker`
- `failure`
- `retry_status`
- `effect_posture`: `none`, `possible`, `partial`, or `verified`
- `control_availability`, with authority and expected effect per control
- `artifact_refs`
- `log_refs`
- `receipt_refs`
- `event_refs`
- `source_projection_ref`
- `source_projection_version`
- `created_at`
- `last_projected_at`
- `completed_at`
- runtime and adapter details for secondary diagnostics

Primary UI uses operator-facing labels such as request, definition, run,
activity, receipt, retry, resume, cancel, defer, waiting, blocked, failed, and
completed. Runtime adapter names belong in details or diagnostics.

Effect posture means:

- `none`: no canonical side effect has started
- `possible`: a side-effecting request started but canonical outcome is not yet
  verified
- `partial`: a verified prefix exists but the definition is incomplete
- `verified`: every retained effect has been read back and classified, whether
  the run completed or ended with a documented retained-effect outcome

The run state is not the source domain's lifecycle, review state, or
fulfillment state. The definition owns an explicit projection mapping back to
the source domain, and the source domain remains authoritative for its business
meaning.

## Run-Control Contract

Retry, resume, signal, cancel, or defer is a bounded request against an existing
run. It does not create a new orchestration definition.

A defer control places the run in `waiting` with a structured resume condition
or review date. `deferred` is not a separate run lifecycle state.

Each control must declare:

- whether it is currently available
- required operator or authority approval
- expected effect
- idempotency behavior
- resulting event or receipt
- why the action is unavailable when disabled

Blocked paths must expose whether the supported disposition is `remove`,
`workaround`, `accept-risk`, or `defer`, and must route the decision to the
authority that owns it.

## Domain Handoffs

Proposal may prepare triage, disposition, repository-gate, and handoff intent.
Only asynchronous dispatch and target-receipt waiting may later qualify as a
durable Proposal handoff run.

Repository may prepare admission and retirement intent. Actual multi-system
onboarding and retirement fulfillment are durable candidates once their owner
routes exist.

Delivery may prepare ART-backed commands and receive OOS/OpenProject receipts.
Work Design Apply, Refinement Apply, multi-item tree reconciliation, and
landing-unit closeout are current durable candidates. Ordinary package actions
remain synchronous.

Prototype may prepare Landing, promotion, and transition intent. Landing setup
execution is a durable candidate with a bounded conditional node set selected
from the approved support profile. Missing inputs and unresolved security
triggers block preflight instead of becoming arbitrary in-run human waits.
Preview start, stop, restart, and check remain bounded host-control commands.

Workspace Intake classification records one bounded repo, product, or component
decision in the originating or future generic authority workflow. It is
synchronous and has no standalone Workbench domain. Active-inventory promotion
is a separate durable candidate because it must remove the intake entry, add
exactly one typed active record, validate cross-record truth, and return a
canonical receipt without overlap.

Product Portfolio validates later product-owner publication packets for active
products and records bounded publication or listing decisions. Refreshing a
live composed product projection is a conditional orchestration candidate only
if evidence later proves that cross-authority aggregation needs durable
reconciliation. Portfolio does not own intake classification, active
registration, a build lane, product graduation, runtime deployment, or
exposure orchestration.

Model Operations may prepare profile lifecycle requests. Request capture and
ordinary human review remain persisted OOS request state unless automatic
continuation, timers, or coordinated execution justify a durable run.
Fulfillment, activation, suspension, and retirement are separate durable
candidates with a shared definition family; they must not become one oversized
profile-lifecycle definition. Exception approval and expiry remain owned with
the authority identified by the governing control, normally Security
Architecture for model security posture.

Named authorities may supply decision receipts. Orchestration supplies
run-failure evidence. Timed approval, expiry, renewal, and revocation may form a
durable candidate only in the authority-owned implementation; simple record
disposition remains synchronous.

## UI Rule

Use `Orchestration` as the Operation Workbench domain name. Its primary
surfaces are Home, Definitions, and Runs.

Use `workflow` for domain-owned workflow sessions and backend workflow
contracts. Do not use `Workflow` as a top-level Workbench domain name. Do not
mention Temporal in ordinary completed-workspace UI unless the operator is
inspecting technical definition or runtime diagnostics.

The Definitions surface creates qualification and implementation packets. It
must not present itself as a low-code runtime builder or activate executable
workflows.

## Sources

- `durable-orchestration-standard.md`
- `orchestration-use-case-matrix.md`
- `orchestration-definitions/README.md`
- `system-design.md`
- `operation-workbench-contract.md`
- `domain-contracts/orchestration.md`
