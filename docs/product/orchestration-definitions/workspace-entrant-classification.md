# Workspace Entrant Classification Definition

Status: `definition-ready` architecture contract with a production-shaped
Console command and receipt model plus isolated simulation. Source, OOS,
authentication, and canonical mutation adapters are not implemented.

Definition id: `workspace.entrant.classify`

Definition version: `1`

Classification: `synchronous`

## Purpose

Record one explicit Workspace Governance classification for a repository,
product, or component entrant. The result is written to
`workspace-governance/contracts/intake-register.yaml` as `out-of-scope`,
`proposed`, or `admitted`.

Classification is not active registration. An `admitted` intake entry remains
outside active `repos.yaml`, `products.yaml`, and `components.yaml` inventory
until the separate promotion workflow succeeds.

## Sources

A typed candidate may be prepared by:

- Repository after physical repository provisioning
- Prototype after a durable repository, product, or component boundary becomes
  clear
- Delivery when durable ownership is discovered during governed work
- an operator or audit that identifies an unclassified entrant

Proposal does not classify workspace entrants. It routes ideas to Prototype or
Delivery before a durable boundary necessarily exists.

## Ownership

| Boundary | Owner |
| --- | --- |
| Candidate evidence and source context | Originating domain |
| Intake vocabulary and canonical decision | Workspace Governance |
| Request correlation and future command execution | Operator Orchestration Service (OOS) |
| Contract and cross-record validation | Workspace Governance Control Fabric (WGCF) |
| Operator acceptance | Authenticated Workspace Governance operator |

OOS may carry the command and return its receipt. OOS does not own the decision
or mutate active inventory. The Console does not write the YAML contract
directly.

## Request

```yaml
schema_version: 1
definition_id: workspace.entrant.classify
definition_version: 1
request_id: <uuid>
expected_intake_register_version: <immutable-version>
entrant_kind: repository | product | component
candidate_ref: <immutable-source-ref>
candidate_version: <immutable-source-version>
name: <operator-readable-name>
canonical_key: <candidate-key>
source_owner_ref: <source-owner>
evidence_refs:
  - <immutable-evidence-ref>
intake_metadata:
  # repository
  repo_class: <repository-class>
  requires_security_bindings: <boolean>
  security_owner: <repository-id-or-null>
  # product
  intended_endpoint: <endpoint>
  platform_owner: <active-repository-id>
  runtime_owner: <active-repository-id>
  source_owners:
    - <active-repository-id>
  # component
  component_class: <component-class>
  owner_repo: <active-repository-id>
  product: <active-product-id-or-null>
  validation_behavior:
    posture: <validation-posture>
    wgcf_graph_role: <graph-role>
    catalog_refs:
      - <catalog-ref>
    notes: <bounded-validation-note>
decision: out-of-scope | proposed | admitted
decision_source: operator | ai-suggested
operator_ref: <authenticated-operator-ref>
decided_at: <timestamp>
rationale: <concise-classification-rationale>
correlation_ref: <correlation-ref>
idempotency_key: <stable-key>
```

Only fields for the selected entrant kind are carried. The request contains
bounded contract values and immutable refs, not copied source records,
credentials, or free-form implementation state. An `out-of-scope` result
normalizes in-scope owner and validation fields out of the canonical intake
record.

## Decision

The operator records exactly one outcome:

- `out-of-scope`: the entrant is intentionally not governed
- `proposed`: the entrant needs more evidence or an ownership decision
- `admitted`: the entrant is approved to proceed toward active registration

An AI suggestion may assist classification only under an approved profile and
still requires explicit operator acceptance. Replaying the same idempotency key
returns the existing result.

## Validation

Before mutation, WGCF must prove:

- the entrant kind is supported
- the source and evidence references exist and agree
- the candidate is not already in active inventory
- no conflicting intake entry exists for the same entrant
- the decision carries an authenticated operator and rationale
- any AI-suggested source carries the required governed profile evidence

The canonical mutation writes or updates one intake entry. It does not create a
repository, product, component, Portfolio listing, release, or runtime.

## Receipt

The receipt records the request id, entrant kind, candidate ref, prior and new
classification, canonical intake-entry ref, operator ref, validation evidence,
timestamp, correlation ref, and idempotency key.

The originating surface may project the receipt beside its source record. There
is no standalone Product Intake operation in the Workbench. A future generic
queue is justified only if unresolved direct or audit-originated candidates
cannot be operated from their source.

## Current Gap

The canonical intake contract and validators exist. The Console has the typed
candidate, classification command, normalized intake-record, optimistic
version, and receipt model plus focused local proof. Source adapters, the OOS
command, authenticated acceptance, canonical mutation, and authority readback
are post-baseline implementation work.
