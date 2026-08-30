# Operation Workbench Orchestration Use-Case Matrix

Status: locked current-domain classification for the approved local architecture.

This matrix applies the qualification rules in
[`durable-orchestration-standard.md`](durable-orchestration-standard.md) to the
currently understood Operation Workbench workflows.

The matrix classifies execution behavior, not visual workflow depth. A modal or
wizard may remain synchronous, while one final Apply action may start a durable
run.

No entry is currently `admitted-durable`. Temporal-backed execution has not
been implemented or admitted for these Console workflows.

Concrete definition contracts are indexed in
[`orchestration-definitions/`](orchestration-definitions/README.md).

## Classification Matrix

| Domain | Workflow or action | Classification | Decision |
| --- | --- | --- | --- |
| Proposal | Capture | `synchronous` | Create one canonical proposal record through the admitted broker path. |
| Proposal | Triage | `synchronous` | Record one bounded framing outcome. |
| Proposal | Disposition, park, reject, or resume | `synchronous` | Record one authoritative proposal decision. |
| Proposal | Handoff preparation and repository gate | `synchronous` | Packet preparation and pre-command eligibility are domain state, not a running orchestration. |
| Proposal | Dispatch handoff and wait for target application receipt | `conditional` | Promote only when dispatch and target receipt waiting become asynchronous and require durable recovery. |
| Repository | Request and admission review | `synchronous` | Collect and review repository intent before the operator submits an external effect. |
| Repository | Provision provider repository | `durable-candidate` | OOS now provides create-once checkpoints, provider recovery, exact readback, and a terminal receipt; normal runtime admission remains gated by composed operating evidence and Security acceptance. |
| Repository | Proposal-gate resolution | `synchronous` | Record one gate decision and projection. |
| Repository | Repository onboarding fulfillment | `durable-candidate` | Workspace classification, active inventory, contract updates, checks, and reconciliation remain separate non-atomic boundaries after provider provisioning. |
| Repository | Retirement request | `synchronous` | Record the requested retirement intent. |
| Repository | Repository retirement fulfillment | `durable-candidate` | Future custody, registry, access, archive, and reconciliation work needs recoverable execution. |
| Delivery Intake | Consume accepted source | `conditional` | Keep synchronous while creation and backlinking are reliably bounded; reevaluate if partial recovery becomes operationally real. |
| Delivery Work Design | Authoring, context shaping, tree design, and review | `synchronous` | These are operator drafts and review state. |
| Delivery Work Design | Apply Draft | `durable-candidate` | Validation, backend update, snapshot attachment, verification, and receipt are non-atomic. |
| Delivery Refinement | Metadata editing and readiness review | `synchronous` | Drafting and readiness decisions remain domain-owned. |
| Delivery Refinement | Apply refinement | `durable-candidate` | Governance update, plan reconciliation, bulk metadata application, verification, and receipt require recoverable execution. |
| Delivery Execution | Start, defer, resume, block, clear, and retire | `synchronous` | Each is a bounded broker command unless future implementation proves otherwise. |
| Delivery Execution | Tree edit draft | `synchronous` | Interactive editing remains local draft state. |
| Delivery Execution | Apply tree changes and reconcile affected work items | `durable-candidate` | Multi-item mutation and reconciliation can partially fail. |
| Delivery Execution | Retry or resume a failed durable apply | `synchronous` | This is a signal or control request against the existing run, not a new orchestration definition. |
| Delivery | Review Packet and landing-unit closeout | `durable-candidate` | Child completion, parent evidence refresh, eligible parent closeout, verification, and receipt must remain coherent. |
| Delivery Catalog | Add or retire ordinary catalog values | `synchronous` | One bounded catalog mutation should not create a durable run. |
| Delivery Catalog | Link and synchronize Owner Repository metadata | `conditional` | Reevaluate when the live route crosses Repository, Catalog, OpenProject, and reconciliation boundaries. |
| Prototype | Direct request capture | `synchronous` | Create one Prototype entry and preserve its source context. |
| Prototype Landing | Profile and support configuration | `synchronous` | Configuration is draft state before execution. |
| Prototype Landing | Landing Run | `durable-candidate` | Scaffold, support setup, preview-adapter preparation, validation, logs, and recovery must survive interruption. |
| Prototype | Candidate Promotion | `synchronous` | Interview, review, and decision are bounded domain work. |
| Prototype | Baseline Promotion decision | `synchronous` | Packet editing and the final operator decision do not themselves require a durable run. |
| Prototype | Baseline readiness execution | `conditional` | Promote when external validation, context admission, security checks, or long-running evidence collection are implemented. |
| Prototype Preview Runtime | Start, stop, restart, and check | `synchronous` | These are direct bounded host-control commands with their own command logs. |
| Prototype | Movement request preparation | `synchronous` | Prototype prepares intent; Lifecycle Transition Control owns later cross-boundary execution. |
| Prototype | Local closeout or retirement | `synchronous` | Record one local lifecycle outcome; impacted cross-boundary cleanup requires separate qualification. |
| Workspace Governance | Repository, product, or component entrant classification | `synchronous` | Validate one typed candidate and record one explicit `out-of-scope`, `proposed`, or `admitted` intake-register outcome; no active inventory is created. |
| Workspace Governance | Admitted entrant promotion to active inventory | `durable-candidate` | Remove one intake entry, create exactly one typed active repo, product, or component record, validate cross-record truth, and verify the canonical receipt without overlap. |
| Product Portfolio | Product publication review | `synchronous` | Validate one product-owner publication packet and record one publication outcome; product and operating facts remain with their source authorities. |
| Product Portfolio | Listing and curation update | `synchronous` | Update only Portfolio-owned listing state, scope, featured state, ordering, or product-owned showcase metadata. |
| Product Portfolio | Projection refresh | `conditional` | Reevaluate when live product-registry, manifest, WGCF, Platform, Security, release, and Delivery aggregation requires asynchronous reconciliation. |
| Model | Profile request capture and ordinary review | `synchronous` | Persist request and review state in OOS; a human review record alone does not require Temporal. |
| Model | Profile fulfillment | `durable-candidate` | Source-backed registry work, validation, projection refresh, and reconciliation can cross non-atomic boundaries. |
| Model | Profile activation | `durable-candidate` | Access-plane, caller, audit, egress, runtime, and security evidence must be applied and verified coherently. |
| Model | Profile suspension and retirement fulfillment | `durable-candidate` | Access revocation, registry state, affected consumers, rollback evidence, and projection refresh require recoverable execution. |
| Orchestration | Definition qualification and authoring | `synchronous` | The definition workflow produces a reviewed contract and implementation request, not a Temporal run. |
| Orchestration | Retry, resume, signal, cancel, or defer an existing run | `synchronous` | These are bounded control requests against an existing durable run. |

Authority decisions are not an Operation Workbench domain. A bounded decision
remains synchronous in its canonical authority workflow. Timed expiry, renewal,
revocation, or correlated continuation is evaluated as a durable candidate only
inside that authority's implementation, using
[`authority-decision-contract.md`](authority-decision-contract.md).

## Locked First Implementation Order

The current recommended design and implementation sequence is:

1. **Delivery Refinement Apply**
   - first durable definition pilot because its current apply plan already
     exposes concrete non-atomic OOS mutations and partial-failure boundaries
   - version 1 is now definition-ready in
     [`delivery-refinement-apply.md`](orchestration-definitions/delivery-refinement-apply.md),
     but remains unimplemented and unadmitted
2. **Delivery Work Design Apply Draft**
   - proves snapshot and receipt handling around another Delivery apply path
3. **Delivery Review Packet and landing-unit closeout**
   - proves parent/child reconciliation and closeout evidence
4. **Prototype Landing Run**
   - proves longer-running setup, logs, host or tool adapters, and recovery
5. **Model Profile fulfillment and activation family**
   - proves independently versioned related definitions, authority evidence,
     source-backed fulfillment, access changes, projection refresh, and rollback

This ordering is a design recommendation, not runtime approval or committed ART
scope. Each definition must still pass qualification, work-home routing,
implementation review, platform admission, and security review.

## Reevaluation Rule

Reclassify an entry only when evidence changes its execution boundary. Valid
triggers include:

- repeated partial failures that cannot be recovered inside one request
- an external or human wait is introduced
- an action begins coordinating multiple independent systems
- restart survival, timers, cancellation, or compensation become required
- a previously multi-step operation is reduced to one atomic authoritative
  command

Visual complexity, operator preference, and a desire for more logs are not by
themselves reclassification evidence.
