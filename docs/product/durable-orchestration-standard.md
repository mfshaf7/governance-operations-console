# Operation Workbench Durable Orchestration Standard

Status: accepted local-baseline architecture contract, not runtime implementation
approval.

This standard defines when an Operation Workbench action should become a
durable orchestration, what an orchestration definition must contain, and how
the Console, OOS, runtime adapters, and execution-node owners divide
responsibility.

The current domain classification is recorded in
[`orchestration-use-case-matrix.md`](orchestration-use-case-matrix.md).
Qualified concrete definitions are indexed in
[`orchestration-definitions/`](orchestration-definitions/README.md).

## Core Decision

Synchronous execution is the default.

A workflow-shaped UI, multi-step modal, local receipt, or persisted domain
status does not by itself justify durable orchestration. Durable orchestration
starts only after an operator-approved command has been accepted and the
backend execution needs durable run semantics.

The Console prepares intent, collects approval, and projects run state. It does
not execute Temporal workflows directly.

## Qualification Rule

Classify each proposed orchestration as one of:

- `synchronous`
  - one bounded command can complete inside the normal request boundary
- `conditional`
  - synchronous now, with an explicit failure or scale condition that requires
    reevaluation
- `durable-candidate`
  - durable execution is justified, but implementation and runtime admission
    have not happened
- `admitted-durable`
  - the definition is implemented, reviewed, registered, and allowed to run

A candidate qualifies for durable orchestration when its accepted execution
requires one or more of the following:

- survival across browser, API, worker, or process restart
- multiple non-atomic side effects where partial completion must be recovered
- an external or human wait that outlives one request and requires automatic
  continuation, timeout, escalation, or correlated execution afterward
- controlled retry, timeout, backoff, or retry exhaustion
- reconciliation or compensation after partial failure
- durable cancellation, pause, resume, or signal handling
- a correlated run history and final receipt across multiple execution-node
  owners

The candidate must also have a known trigger, completion condition, execution
owner, and bounded execution-node model. Unclear business meaning is not solved by
adding Temporal.

## Explicit Non-Candidates

Keep these outside durable orchestration unless later evidence changes their
execution boundary:

- draft editing and autosave
- UI wizard navigation
- review forms and packet preparation
- ordinary CRUD and single-record status updates
- a domain record waiting to become eligible before any command is submitted
- a persisted human-review request whose decisions are ordinary authoritative
  state transitions and do not require automatic continuation, timers, or
  coordinated execution
- direct start, stop, restart, or health-check commands for one runtime
- read projections, registers, history, and dashboards
- simple approval decisions that record one authoritative outcome
- retry, cancel, or signal controls against an already running orchestration

## Authority Boundary

- The source Operation Workbench domain owns business intent, eligibility,
  draft state, operator approval, and its domain projection.
- OOS owns the operator-facing workflow catalog, orchestration request API,
  run-control API, correlation, aggregate run projection, and receipts.
- Temporal is a replaceable durable runtime adapter behind OOS. It is not a
  normal domain UI dependency or business term.
- WGCF, CGG, Platform Engineering, Repository control, and other components own
  only the activities or subworkflows inside their established boundaries.
- An owner-specific worker may execute owner-specific activities. That does not
  make the worker the owner of the complete business workflow.
- Platform Engineering owns runtime deployment and service adoption.
- Security Architecture owns trust-boundary review and security acceptance.
- Executable workflow source remains reviewed, tested, Git-owned code in the
  responsible implementation repo.

The Console must never upload arbitrary workflow code, evaluate operator code,
deliver credentials, or activate an unreviewed definition.

## Definition Contract

Every `durable-candidate` must define the following before implementation can
be requested:

### Identity And Ownership

- stable definition id
- optional definition-family id when several independently versioned
  definitions share one operator domain or request envelope
- definition version
- title and operator-facing purpose
- source domain and source record type
- business owner
- implementation repo
- execution owner
- execution-node owners

### Trigger And Result

- accepted command or event that starts the run
- approval requirements, including the required operator decision and any
  additional authority evidence
- immutable source-version or input references
- idempotency key strategy
- source and target concurrency-lock strategy
- completion condition
- expected receipt type
- return projection consumed by the source domain

### Execution-Node Model

- a bounded graph of `activity`, `wait`, or `subworkflow` nodes
- dependencies and explicit parallel groups
- bounded branch conditions and skip reasons
- owner and adapter for every node
- input, output, artifact, log, and receipt references
- idempotency behavior for every side effect
- structured external waits and required signals
- timers, deadlines, and timeout behavior
- execution and target lock scopes

An input may select from definition-owned optional nodes, but it must not upload
new executable nodes or arbitrary commands at run time.

### Failure And Control Model

- retry policy and retry exhaustion behavior
- reconciliation or compensation strategy
- cancellation boundary
- pause, resume, and signal availability
- terminal failure condition
- operator-visible remediation route
- blocker decisions supported by the workflow: `remove`, `workaround`,
  `accept-risk`, or `defer`
- justification, follow-up owner, and review date when a blocker is not removed

### Evidence And Security

- correlation and causation references
- execution-node and run event requirements
- final receipt and evidence references
- sensitive-data classification
- credential and secret references, never secret values
- caller identity and approval attribution
- security-review triggers
- retention and redaction requirements

### Delivery And Recovery

- deterministic workflow and replay tests
- activity idempotency and failure-injection tests
- timeout, cancellation, and signal tests
- version compatibility expectations
- rollout, suspension, rollback, and retirement plan

## Definition Lifecycle

The definition lifecycle is:

1. `candidate`
   - a domain or operator has raised a possible durable use case
2. `qualified`
   - the qualification decision is `durable-candidate`
3. `definition-ready`
   - the definition contract is complete enough for implementation review
4. `implementation-requested`
   - work is routed to the correct Proposal, Delivery ART, and owner-repo path
5. `admission-review`
   - implementation, tests, runtime, platform, and security evidence are under
     review
6. `active`
   - one immutable definition version is admitted for new runs
7. `suspended`
   - no new runs may start; existing-run handling follows the definition
8. `retired`
   - no new runs may start and the retained definition is historical evidence

Definitions classified as `synchronous` or `conditional` retain their
qualification decision but do not enter the durable definition lifecycle.

An active definition is immutable. Any behavior change creates a new version
with an explicit compatibility and rollout decision.

## Run Contract

An accepted durable request returns a `request_id` and, once scheduled, a
`run_id`. The source UI may close after acceptance because the run is not owned
by the browser session.

Run lifecycle states are:

- `queued`
- `running`
- `waiting`
- `blocked`
- `failed`
- `completed`
- `cancelled`

`waiting` is an expected workflow condition. `blocked` means progress requires
remediation or an authority decision. Retry availability, retry exhaustion,
signal availability, and cancellation availability are capabilities or failure
metadata, not additional lifecycle states.

Deferral is not a lifecycle state. A supported defer control moves the run to
`waiting` with a structured owner, reason, resume condition, and optional
review date or deadline.

Every wait projection declares:

- wait id and kind: `authority-decision`, `external-event`, `dependency`, or
  `timer`
- waiting owner and operator-readable reason
- expected signal or dependency reference
- entered timestamp
- review date or deadline when applicable
- timeout or expiry behavior

Every run projection must include:

- request, run, definition, and definition-version ids
- definition-family id when the definition belongs to a family
- source domain and source record reference
- correlation and causation references
- current execution node, node type, and owner
- lifecycle state and structured wait, blocker, or failure detail
- bounded progress counts, including skipped conditional nodes
- attempt and retry posture
- effect posture: `none`, `possible`, `partial`, or `verified`
- allowed control actions with required authority and expected effect
- artifact, log, receipt, and evidence references
- source-domain projection reference and version
- created, updated, and completed timestamps
- runtime and adapter diagnostics in a secondary technical view

The run projection does not replace source-domain state. Each definition must
map run states and final receipts into the source domain explicitly. For
example, Prototype Landing may project `captured`, applying, blocked, or
`landed`, while Model Operations keeps request-review state, fulfillment state,
and canonical profile lifecycle separate from the run lifecycle.

## Cross-Domain Proof

The shared contract has been checked against three materially different
execution shapes:

- Delivery Refinement Apply proves serial non-atomic mutations, partial effects,
  idempotent forward recovery, cancellation after writes, and canonical
  read-back verification.
- Prototype Landing proves bounded conditional nodes, skipped work, source and
  target locks, setup artifacts, operational logs, and output-inventory
  verification without arbitrary runtime commands.
- Model Profile work proves definition families, plural authority evidence,
  separation of persisted human-review state from durable execution, and
  source-domain projection that does not flatten request, fulfillment, and
  canonical lifecycle state.

A future definition that cannot fit these product-neutral contracts must return
to architecture discussion. It must not add an ad hoc run state, unstructured
wait string, or domain-specific field to the shared projection.

## Operator Surface Contract

The Orchestration domain contains three primary surfaces:

- **Home**
  - system health, active and failed runs, definitions requiring attention, and
    adapter or worker posture
- **Definitions**
  - candidate, active, suspended, and retired definitions; ownership, version,
    qualification, validation, and implementation posture
- **Runs**
  - active and historical runs, activities, waits, failures, signals, controls,
    events, and receipts

`Design orchestration` opens a three-stage definition workflow:

1. **Qualify**
   - establish the execution problem and decide whether durable orchestration
     is justified
2. **Define**
   - define trigger, activities, waits, recovery, authority, evidence, and
     version behavior
3. **Review And Request**
   - review obligations and route an implementation-ready definition packet

The advisor may help during Qualify and Define. It must not make the
qualification decision, approve the definition, activate a version, or remain
on a result page where no drafting assistance is needed.

The definition workflow produces a contract and implementation request, not
an executable workflow. Runtime activation remains a source-backed delivery
and admission action.

## Work Routing

- A new orchestration idea without accepted initiative scope starts in
  Workspace Proposals.
- An orchestration required by accepted initiative work becomes a Delivery ART
  item under the relevant initiative.
- Executable source lands in the owner repo selected by the definition.
- OOS catalog and API expansion lands in `operator-orchestration-service`.
- Owner-specific activities land in their owner repos.
- Platform and security changes remain separately reviewed boundaries.

The Orchestration workspace may prepare and route these records. It must not
bypass Proposal, Delivery ART, source review, platform adoption, or security
acceptance.

## Prototype Boundary

This record locks the Console design direction only. No Temporal service,
worker polling, durable database, live OOS definition endpoint, or backend
mutation is authorized by this document.

Prototype fixtures must label candidate definitions and local run receipts as
synthetic or prototype-local. They must not present `admitted-durable` state
until the backend, owner implementation, runtime admission, and evidence path
exist.

The first definition-ready contract is
[`delivery.refinement.apply` v1](orchestration-definitions/delivery-refinement-apply.md).
Its definition-ready state authorizes implementation review only; it does not
prove or activate a durable runtime.
