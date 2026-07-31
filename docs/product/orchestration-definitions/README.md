# Workflow Definition Registry

Status: local-baseline workflow-definition registry, not executable workflow source
or runtime admission evidence.

This directory records concrete cross-authority workflow definitions whose
classification has been decided. A `durable-candidate` definition must pass the
qualification rules in
[`../durable-orchestration-standard.md`](../durable-orchestration-standard.md).
A `synchronous` definition records the bounded command and receipt boundary
without inventing a durable run.

Each definition file must lock:

- stable definition identity and version
- source-domain trigger and immutable request
- approval evidence and concurrency locks
- preflight and mutation ownership
- bounded execution-node graph, conditions, waits, and idempotency
- retry, timeout, cancellation, and recovery behavior
- progress, effect posture, artifacts, logs, completion verification, and
  receipts
- explicit source-domain projection mapping
- current implementation and admission gaps

The files are architecture contracts. They do not contain executable Temporal
code, activate definitions, or authorize backend mutation.

## Current Definitions

| Definition | Classification | Contract state | Runtime state |
| --- | --- | --- | --- |
| [`delivery.refinement.apply` v1](delivery-refinement-apply.md) | `durable-candidate` | `definition-ready` | Not implemented or admitted |
| [`workspace.entrant.classify` v1](workspace-entrant-classification.md) | `synchronous` | `definition-ready` | Production-shaped Console contract and local proof exist; source, OOS, auth, and canonical adapters are missing |
| [`workspace.entrant.promote` v1](workspace-entrant-promotion.md) | `durable-candidate` | `definition-ready` | Production-shaped Console contract and atomic local proof exist; durable OOS and canonical mutation are missing |

## File Rule

Use one product-neutral file name per stable definition id. A behavior change
creates a new immutable definition version inside the same record or a
successor record when the definition identity itself changes.

Do not add a definition only because a UI has several steps. Add one when a
cross-authority command needs a stable request and receipt contract, then
classify it honestly as synchronous, conditional, or a durable candidate.
