# Workspace Entrant Promotion Definition

Status: `definition-ready` architecture contract with a production-shaped
Console command and receipt model plus isolated simulation. Durable runtime and
canonical mutation are not implemented or admitted.

Definition id: `workspace.entrant.promote`

Definition version: `1`

Classification: `durable-candidate`

## Purpose

Promote one `admitted` Workspace Intake entry into exactly one active Workspace
Governance inventory contract:

- repository -> `workspace-governance/contracts/repos.yaml`
- product -> `workspace-governance/contracts/products.yaml`
- component -> `workspace-governance/contracts/components.yaml`

The workflow removes the intake entry and adds the active record as one governed
landing unit. Intake and active inventory must never overlap for the same
entrant.

## Ownership

| Boundary | Owner |
| --- | --- |
| Intake decision and active inventory contracts | Workspace Governance |
| Promotion request, durable run, recovery, and receipt | Operator Orchestration Service (OOS) |
| Contract validation and readiness evidence | Workspace Governance Control Fabric (WGCF) |
| Repository/product/component source evidence | Owning source domain |
| Review and merge authority | Workspace Governance maintainers |

OOS coordinates the workflow but never becomes the inventory authority.
Portfolio is a later consumer of active product inventory and is not part of
this promotion.

## Frozen Request

```yaml
schema_version: 1
definition_id: workspace.entrant.promote
definition_version: 1
request_id: <uuid>
intake_entry_ref: <canonical-intake-entry-ref>
intake_entry_version: <immutable-version>
expected_intake_register_version: <immutable-version>
expected_active_inventory_version: <immutable-version>
entrant_kind: repository | product | component
active_record:
  id: <canonical-id>
  kind: repository | product | component
  value: <type-specific-canonical-record>
active_record_digest: <sha256>
approval_refs:
  - <workspace-governance-approval-ref>
operator_ref: <authenticated-operator-ref>
decided_at: <timestamp>
correlation_ref: <correlation-ref>
idempotency_key: <stable-key>
```

Correcting the intake entry or proposed active record creates a new request and
idempotency key. Retrying unchanged input resumes the existing run.

## Type-Specific Readiness

### Repository

- canonical id, repository class, and active lifecycle are explicit
- owned and forbidden boundaries are non-empty and distinct
- every allowed authority ref resolves to active repository inventory
- security-binding and review-subject posture matches the canonical schema
- validation behavior declares posture, WGCF graph role, catalog refs, and
  bounded notes

### Product

- canonical id, lifecycle, endpoint, and release capabilities are explicit
- platform, runtime, security, and all source-owner refs resolve to active
  repository inventory
- the product is not already active under another id
- validation behavior declares posture, WGCF graph role, catalog refs, and
  bounded notes

### Component

- canonical id, class, active lifecycle, owner repository, and security owner
  are explicit
- owner and security refs resolve to active repository inventory
- a non-null product ref resolves to active product inventory
- an optional interface contract carries both path and validation command
- the component is not already active under another id

## Execution

1. Load and verify the frozen intake entry and proposed active record.
2. Run type-specific WGCF validation against current Workspace Governance
   contracts.
3. Prepare one reviewable change that removes the intake entry and adds exactly
   one active record.
4. Run the canonical contract, generated-artifact, and cross-repo truth checks.
5. Obtain the required reviewed landing evidence.
6. Verify the merged canonical projection.
7. Record one immutable promotion receipt.

No step may publish a Portfolio listing, provision a runtime, create a release,
or imply production readiness.

## Failure And Recovery

- failure before a reviewed change has no canonical effect
- validation conflict returns the entry to its current intake state with a
  named correction owner
- a partial or conflicting source change blocks for reconciliation; it must not
  leave intake and active inventory overlapping
- retry and resume use the original request and idempotency key
- cancellation before merge preserves the intake entry
- completion requires merged canonical state and read-back verification

## Receipt

The final receipt records the intake entry removed, active contract and record
created, source and target versions, validation evidence, review or merge
evidence, operator and authority refs, correlation, timestamps, and terminal
outcome.

## Current Gap

Canonical inventory contracts and validators exist. The Console has exact
repo/product/component active-record shapes, optimistic source and target
versions, dependency validation, atomic local simulation, and receipt
projection. The generic request API, durable OOS definition, reviewed canonical
mutation, and authority readback remain post-baseline implementation work.
