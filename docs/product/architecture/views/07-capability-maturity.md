# Capability Maturity

Status: approved local-baseline target projection.

Source: [`system-model.yaml`](../system-model.yaml). Status values below are
orthogonal; a complete prototype UI does not prove backend or adapter support.

## Status Meaning

| Axis | Meaning |
| --- | --- |
| Design | Whether the target is observed, approved, proposed, or retired. |
| Console | Whether the operator surface is implemented, partial, prototype-only, not started, or retired. |
| Backend | Whether the required authority backend is implemented, partial, missing, unnecessary, or unverified. |
| Adapter | Whether the Console is connected, prototype-local, missing, or unnecessary. |
| Phase | Whether work is valid pre-baseline, belongs to the baseline gate, or is routed after baseline approval. |

All capabilities and transitions in this view are `approved-target`.

## Console Capabilities

| Capability | Console | Backend | Adapter | Phase |
| --- | --- | --- | --- | --- |
| Console Shell | implemented | not-required | not-required | pre-baseline |
| Command Center Focus | implemented | partial | prototype-local | pre-baseline |
| Workspace Pulse | implemented | partial | prototype-local | pre-baseline |
| Governance Activity | implemented | partial | prototype-local | pre-baseline |
| Operator Account | implemented | missing | prototype-local | post-baseline |
| Agent Console And Runtime | implemented | partial | connected | pre-baseline |
| Runtime Readiness | implemented | implemented | connected | pre-baseline |
| Operation Workbench | implemented | not-required | not-required | pre-baseline |
| Proposal | implemented | partial | missing | post-baseline |
| Repository | implemented | partial | missing | post-baseline |
| Model Operations | implemented | partial | missing | post-baseline |
| Delivery | implemented | implemented | missing | post-baseline |
| Prototype | implemented | partial | missing | post-baseline |
| Product Portfolio | implemented | partial | missing | post-baseline |
| Orchestration | implemented | partial | missing | post-baseline |
| Lifecycle Transitions | implemented | partial | missing | post-baseline |
| Dev Integration | implemented | implemented | missing | post-baseline |
| Governed Releases | implemented | partial | missing | post-baseline |
| Workspace Intake Classification | partial | implemented | missing | post-baseline |
| Workspace Active Inventory | partial | implemented | missing | post-baseline |
| Teras | implemented | not-required | not-required | pre-baseline |
| Context Board | implemented | not-required | not-required | pre-baseline |
| Build Tree | implemented | not-required | not-required | pre-baseline |
| Control Board | implemented | not-required | not-required | pre-baseline |

## Cross-Boundary Transitions

| Transition | Console | Backend | Adapter | Phase |
| --- | --- | --- | --- | --- |
| Proposal to Delivery | prototype-only | implemented | missing | post-baseline |
| Proposal to Prototype | prototype-only | missing | missing | post-baseline |
| Proposal Repository Gate | prototype-only | missing | missing | post-baseline |
| Repository Request and Provisioning | prototype-only | partial | missing | post-baseline |
| Prototype to Delivery | prototype-only | missing | missing | post-baseline |
| Delivery Owner Repo Catalog Link | prototype-only | partial | missing | post-baseline |
| Repository to Workspace Intake | not-started | partial | missing | post-baseline |
| Prototype to Workspace Intake | not-started | partial | missing | post-baseline |
| Delivery to Workspace Intake | partial | partial | missing | post-baseline |
| Workspace Intake to Active Inventory | partial | partial | missing | post-baseline |
| Active Product to Portfolio | prototype-only | missing | missing | post-baseline |
| Existing Product Update to Portfolio | partial | missing | missing | post-baseline |
| Model Profile Request | not-started | missing | missing | post-baseline |
| Orchestration Definition Admission | prototype-only | missing | missing | post-baseline |
| Durable Orchestration Run | prototype-only | missing | missing | post-baseline |
| Dev Integration Profile Request | prototype-only | partial | missing | post-baseline |
| Governed Product Release | prototype-only | partial | missing | post-baseline |
| Governed Context to Agent | partial | partial | missing | post-baseline |

## Current Gaps By Class

### Pre-Baseline Design Corrections

- Keep all prototype-local actions and receipts visibly qualified.
- Finish architecture and content coherence required for baseline review.

### Post-Baseline Authority Work

- Add or extend OOS APIs for Proposal, Delivery, Model, Orchestration, and
  correlated transition workflows.
- Add a generic Workspace Governance adapter for repo, product, and component
  intake classification plus a separate active-inventory promotion path.
- Add Workspace Prototype Studio registry and graduation adapters.
- Add Platform and Security projections and product-specific release adapters.
- Add CGG context admission and governed model-access integration.
- Add federated identity, session, RBAC, named authority, and access-request
  enforcement.

### Post-Baseline Console Adapters

- Replace structured fixtures with typed authority projections incrementally.
- Replace prototype-local command runtimes only when the corresponding backend
  contract is admitted.
- Preserve current visual and workflow contracts while swapping data sources.
- Reconcile every write through source version, idempotency, correlation, and
  authority-owned receipts.

## Baseline Interpretation

Baseline approval confirms that the target architecture, operator behavior,
structured fixtures, and implementation boundaries are coherent enough to
decompose into owner-repo work. It does not assert that missing backends,
adapters, identity, stage, production, or durable orchestration are already
live.
