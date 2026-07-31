# Lifecycle Transition Control Contract

Status: active cross-domain architecture contract. The authority model and the
Proposal-to-Prototype, Proposal-to-Delivery, and Prototype-to-Delivery routes
are locked. Remaining route mappings are pending explicit design discussion.

`Movement Control` is the historical console label. The replacement capability
and source boundary use `Lifecycle Transitions` because no independent Movement
Control authority or backend service is approved.

Architecture recommendation outcome:

- `replace` the universal Movement Control decision-authority model
- `reuse` WGCF validation, authority-owned decision receipts, OOS
  orchestration, and target-owned adapters
- `extend` the shared console projection only for correlated transition status
  and receipts
- create no new backend service or mandatory approval workspace

## Purpose

Lifecycle Transition Control provides one structured way to validate, apply,
observe, and audit changes that cross domain, ownership, custody, runtime,
visibility, or trust boundaries.

It is a shared capability, not an Operation Workbench domain and not a second
approval board. Routine, policy-clear transitions must not gain an additional
operator decision merely because they cross a domain boundary.

## Authority Model

Every transition separates these responsibilities:

| Concern | Authority |
|---|---|
| route intent and source packet | source domain |
| gate and policy evaluation | WGCF or the admitted validation authority |
| target admission | target domain |
| exception, waiver, or accepted-risk decision | authority identified by the named control |
| execution and retry | OOS orchestration |
| canonical target mutation | target adapter and target backend |
| receipt and history projection | shared transition receipt projection |

Lifecycle Transition Control does not replace any of these authorities. It
correlates their records and exposes their current state.

No new Movement Control backend service is approved. Future live wiring should
reuse WGCF validation and receipt capabilities, OOS orchestration, and
domain-owned target adapters unless later evidence proves a missing owner.

## Canonical Process

```text
source intent
  -> versioned transition packet
  -> shared validation
  -> target admission
  -> optional authority-decision receipt
  -> authorization
  -> OOS execution
  -> target adapter mutation
  -> immutable application receipt
  -> source, target, and transition history projections
```

The process may be automatic when policy and target admission permit it.
Manual review exists only where a named authority must make a real decision.

## Vocabulary

- `intent`: the source domain's requested destination and reason
- `handoff packet`: the versioned source record prepared for validation
- `validation`: gate and policy evaluation against the current source version
- `admission`: the target domain accepting responsibility for an incoming
  record or request
- `authorization`: all required validation, admission, and exception evidence
  permits application
- `application`: the target adapter changes canonical target state
- `receipt`: immutable evidence for one completed authority or application
  action
- `transition`: the complete process from source intent through target
  application

These terms are not interchangeable.

## Invariants

- A prepared packet is not approval, admission, authorization, or application.
- Authorization is not proof that target mutation completed.
- A target preview of an incoming packet is not target custody.
- Domain lifecycle state and transition state remain separate.
- The source and target do not both mutate the same canonical record.
- Target custody requires a target-owned admission or application receipt.
- Every command checks the expected source and dependency versions.
- Retries with the same intent and versions return the same result and receipt.
- A correction creates a superseding packet or receipt; history is not
  rewritten.
- Technical execution failure is not a governance rejection.
- UI labels must distinguish Prepared, Authorized, Applying, and Applied.

## Transition Record

A normalized transition record must identify:

- transition id and idempotency key
- transition kind
- source domain, record, owner, and projection version
- target domain, home, lane, and admission owner
- requested route and reason
- source handoff packet and producer receipt
- validation and gate snapshot
- admission mode: `automatic`, `target-review`, or `authority-review`
- target admission record, when required
- authority-decision request and receipt, when required
- orchestration run and adapter, once applying
- application receipt and resulting target reference
- next owner and required action
- superseded transition, when applicable

The record must be generated from structured domain truth. Prose can summarize
the record but cannot determine its state.

## Transition States

- `prepared`: source packet exists; shared validation has not started
- `validating`: required source and target gates are being evaluated
- `awaiting-admission`: target-owned admission is required
- `awaiting-authority`: a valid authority-decision receipt is required
- `authorized`: validation and required decisions permit application
- `applying`: the target adapter is running
- `applied`: target application receipt exists
- `blocked`: a named gate, owner, and fix prevent progress
- `returned`: source changes and a replacement packet are required
- `deferred`: owner, reason, and review date exist
- `rejected`: target admission was declined
- `failed`: technical application failed after authorization
- `cancelled`: source withdrew the transition before application
- `superseded`: a replacement transition now owns progress

Domain states such as Proposal `accepted` or `implemented`, Prototype
`exploring`, Delivery Intake `needs_consume`, Workspace Intake `admitted`, or
Portfolio listing and availability are not transition states.

## Manual Exception Triggers

Manual cross-domain review is justified only for a real authority boundary,
including:

- conflicting or stale gate evidence
- ownership or custody crossing a trust boundary
- client, public, or sensitive-data exposure
- accepted risk, waiver, or policy exception
- cross-domain suspend, rollback, or retirement with active dependents
- multiple independent target authorities

Routine policy-clear transitions should validate and apply without another
operator click.

## Locked Route Matrix

| Route | Intent owner | Admission owner | Transition posture |
|---|---|---|---|
| Proposal -> Prototype | Proposal | Prototype ingress policy | automatic after validation |
| Proposal -> Delivery | Proposal | Delivery ingress policy | automatic after validation |
| Prototype -> Delivery | Prototype | Delivery ingress policy | automatic admission after validation; Delivery Intake Consume applies the target shell |
| Proposal -> Portfolio | not allowed | not applicable | Portfolio accepts managed-product publication, not work routing |
| Prototype -> Portfolio | not allowed | not applicable | graduate to a durable product owner before product publication |
| Repository, Prototype, or Delivery -> Workspace Intake | originating domain | Workspace Governance | conditional generic repo, product, or component classification; the decision does not create active inventory |
| Workspace Intake -> Active Inventory | Workspace Governance | type-specific Workspace Governance promotion | one governed change removes the admitted intake entry and creates exactly one active repo, product, or component record |
| Active Product -> Portfolio | Workspace Governance active product inventory | Portfolio publication policy | only a product in active `products.yaml` inventory may be validated and listed |
| Delivery -> Portfolio | Delivery closeout | Portfolio publication policy | only an existing active product may receive a direct publication update |

The following routes remain pending and must not be inferred from the old
Movement Control design:

- Delivery -> Platform or runtime promotion
- cross-domain retirement, suspend, defer, and rollback
- Repository custody changes

## Product Portfolio Relationship

Product Portfolio publication is not a generic lifecycle transition. Portfolio
composes active product identity, a product-owned manifest, runtime and
release evidence, Security evidence, and relevant Delivery outcomes into one
managed-product entry.

Proposal cannot publish a product. Prototype cannot publish directly from an
incubation record. Repository, Prototype, or Delivery may conditionally emit a
generic Workspace Intake candidate when a durable boundary becomes clear. An
`admitted` classification still requires separate active-inventory promotion.
Only an active `products.yaml` record may enter Portfolio publication
validation. A Delivery closeout for an existing active product may emit a
versioned update packet directly. Lifecycle Transition Control may correlate
graduation, classification, active-inventory promotion, and publication
receipts for inspection; it does not decide intake, active registration,
listing, runtime access, product maturity, or publication.

## Locked Route: Proposal To Prototype

Proposal owns Triage, Disposition, and Handoff preparation. A valid Handoff
produces a versioned Prototype entry packet. Shared validation checks:

- Proposal selected the Prototype route
- the Handoff receipt exists
- the Proposal source version is current
- packet schema is supported
- repository posture is resolved when required
- source custody is explicit
- no equivalent Prototype entry was already applied
- the Prototype ingress adapter is available

Prototype ingress admission is automatic for a valid internal Proposal packet.
No separate Movement operator decision is required.

Only a target application receipt permits Prototype to create an owned record
with:

- ingress `proposal-routed`
- lifecycle `exploring`
- Landing state `captured`
- Prototype Studio ownership
- Proposal backlink and packet reference
- Landing as the first required action

Proposal remains durable source history. Prototype receives a derived record;
the Proposal record is not transferred or deleted.

Proposal aggregate status projects as:

- packet prepared or validating: waiting on Prototype
- source correction required: action required
- target adapter retrying: waiting on Prototype
- Prototype application receipt recorded: handoff applied; Proposal remains
  accepted

Proposal may supply source identity, source version, title suggestion,
objective, context, rationale, notes, custody, and evidence references.
Prototype Landing owns or confirms the final Prototype name, support profile,
source home, base platform, preview need, data mode, visibility, mutation
boundary, tooling, and evidence support.

Hardcoded target configuration must be identified as a policy default or
suggestion. It must not be projected as source truth.

## Locked Route: Proposal To Delivery

Proposal owns Disposition and Handoff preparation. Shared validation checks:

- Proposal selected the Delivery route
- the Handoff receipt exists
- the Proposal source version is current
- packet schema is supported
- repository and source custody are resolved or explicitly not required
- Proposal reference is valid
- no equivalent Delivery Intake source already exists
- the Delivery ingress adapter is available

Delivery ingress admission is automatic for a valid accepted Proposal packet.
The transition ends when a target-owned Delivery ingress receipt creates an
Intake source with status `needs_consume`.

Proposal aggregate status projects as:

- packet prepared or validating: waiting on Delivery
- source correction required: action required
- target ingress adapter retrying: waiting on Delivery
- Delivery Intake ingress receipt recorded: handoff applied; Proposal remains
  accepted

Delivery Intake Consume is not part of the cross-domain transition. It is an
internal Delivery action that creates or links the Delivery Package shell.
Consume failure remains owned by Delivery and Orchestration and must not reopen
Proposal.

Delivery Intake retains only these operational states:

- `needs_consume`
- `consume_failed`
- `consumed`

Invalid Proposal handoffs do not enter Intake as blocked or parked records.
They remain with Proposal until corrected.

## Locked Route: Prototype To Delivery

Prototype-to-Delivery is a route-specific graduation into accepted governed
delivery work. It extends the normal Delivery Intake path; it does not create a
Movement-owned queue, bypass Intake, or move a Prototype record directly into
ART execution.

### Source Eligibility

Prototype may prepare this route only when:

- lifecycle is `baseline-approved`
- the approved Baseline Packet and Baseline Promotion receipt exist
- the operator explicitly selects governed Delivery as the intended route
- prototype identity, source version, objective, accepted scope, excluded
  scope, non-goals, and remaining work are structured
- data mode, mutation boundary, visibility, security/governance triggers, and
  open issues are recorded
- source custody is classified as `existing-repo`, resolved
  `new-repo-required`, `platform-internal`, or `non-source-work`
- the current source ref, durable owner, repository/source ref when applicable,
  repository gate, and custody rationale are resolved
- no nonterminal equivalent transition already owns the route

An unresolved repository or source-custody gate prevents packet dispatch. The
record stays in Prototype or Repository and does not enter Delivery Intake.

### Source Action And Packet

The route-specific Prototype action is `Prepare Delivery Handoff`. The target
is fixed to Workspace Delivery ART; target lane and target owner are not
free-text operator fields.

The versioned packet carries:

- transition, correlation, causation, idempotency, and schema identifiers
- Prototype id, source ref, source version, owner, and current lifecycle
- Baseline Packet ref/digest and Baseline Promotion receipt
- objective, target operator or user, accepted scope, excluded scope, and
  non-goals
- workflow/state references, design evidence, preview proof when applicable,
  linked records, and remaining post-baseline work
- source-custody classification, current source ref, durable owner repo/ref
  when applicable, repository gate state, and rationale
- visibility, data mode, mutation boundary, security/governance triggers, open
  issues, and required authority evidence
- governed Delivery intent and route rationale

Prototype does not supply Target PI, Iteration, Delivery Team, an ART execution
tree, or final execution metadata. Delivery owns those decisions.

Recording an accepted source intent projects Prototype as `graduating` and the
transition as `prepared`. It does not claim Delivery admission, shell creation,
source transfer, or graduation completion.

### Validation, Admission, And Application

Shared validation checks packet schema, source version, baseline evidence,
source custody, duplicate transition posture, and required authority evidence.
A source correction returns to Prototype with a named owner and required fix.

A valid packet is admitted automatically by Delivery ingress policy and creates
one Delivery Intake source with `needs_consume`. This is target-owned admission,
not source mutation. Routine policy-clear traffic does not gain another generic
approval click.

Delivery Intake Consume then creates or reuses one top-level Delivery Epic
shell, records the Prototype and Baseline Packet backlinks, and starts a
Delivery continuation. Consume remains the deliberate target application
action; it does not create Features, User stories, execution metadata,
blockers, closeout records, or landing units.

The final Prototype graduation receipt is emitted only when:

- the Delivery shell exists or was idempotently reused
- the Delivery shell references the Prototype and Baseline Packet
- Prototype history references the Delivery shell
- durable source custody is resolved and linked
- the resulting target references and application evidence are recorded

Only that receipt may project Prototype as `graduated`. The graduated Prototype
record becomes read-only history. A Delivery Intake row or request-acceptance
receipt alone is insufficient.

### Delivery Continuation

Work Design receives a continuation context rather than a blank proposal
context. It may seed the Context Brief from the approved objective, scope,
non-goals, existing source, baseline evidence, and remaining work. The operator
still shapes and approves the Delivery execution tree.

Prototype component, UI, or evidence trees are input artifacts, not executable
ART trees. Delivery Work Design and Refinement retain planning, metadata,
readiness, and execution authority.

### Failure Ownership

- stale or invalid source evidence returns to Prototype
- unresolved repository custody stays with Prototype and Repository
- missing authority evidence waits on the named authority
- Intake Consume or backlink failure stays in Delivery and Orchestration and
  must not require Prototype to resubmit the same packet
- duplicate delivery application returns the existing target reference and
  receipt
- technical adapter failure is `failed`, not target rejection

## Repository Relationship

Repository supplies repository admission, source-custody evidence, and owner
repository references. It does not decide Proposal, Prototype, Delivery, or
Portfolio routes. A route can wait on Repository evidence without becoming a
Repository-owned transition.

## Authority Decision Relationship

The authority identified by the named control owns waiver, accepted-risk, and
policy-exception decisions. Lifecycle Transition Control consumes those
receipts and exposes their effect. It does not duplicate the decision form or
become the risk authority. Request and receipt requirements live in
`../authority-decision-contract.md`.

## Orchestration Relationship

OOS owns target-adapter execution, retries, reconciliation, and run receipts.
An application failure after authorization is an Orchestration failure, not a
source-domain rejection. The source must not repeat disposition merely because
an adapter needs retry or reconciliation.

## Operator Surface Posture

A dedicated full-viewport Lifecycle Transitions Teras workspace modal is
approved. It is an overview and routing surface, not a Movement Control
decision workspace. It provides:

- transition status and ownership
- source, target, validation, admission, and application posture
- technical failures
- immutable receipt history
- routing links to the authority that owns the next action

Routine transitions are read-only there. Actions remain in the source domain,
target domain, named decision authority, or Orchestration as appropriate. The
workspace deep-links owner records and must not become a generic approval
queue.

## Current Prototype Gap

The active local Proposal entry projections currently collapse handoff and
target custody into one event by creating `admitted` custody at the Proposal
handoff timestamp. That behavior is accepted only as temporary prototype
scaffolding. It is not the locked architecture.

Future correction must introduce distinct target ingress/application receipts
without changing accepted visual flows until the correction is reviewed.

The Governance Operations Console's own pre-system Prototype and ART records
are not another transition route. Their future one-time reconciliation is
migration work at the admitted integration boundary and must not appear in the
route matrix or normal operator surface.

## Non-Goals

Lifecycle Transition Control must not:

- edit domain records
- decide Proposal disposition
- perform Prototype Landing
- perform Delivery Intake Consume
- create or admit repositories
- edit Product Portfolio entries, listing, or publication state
- accept risk or waive policy
- execute target adapters
- replace WGCF, OOS, or target backends
- require manual review for every cross-domain packet
- become a bootstrap migration surface for the Console's own historical state

## Sources

- `../system-design.md`
- `../architecture/README.md`
- `../operation-workbench-contract.md`
- `../orchestration-boundary-contract.md`
