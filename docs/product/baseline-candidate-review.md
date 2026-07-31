# Governance Operations Console Baseline Candidate Review

Status: approved local baseline recorded for governed source landing. The
operator approved the baseline on 2026-07-30. This record does not authorize
live integration, live mutation, deployment, or source graduation.

This is the historical baseline gate record. Subsequent source-graduation
provenance is recorded in
[`../graduation/source-manifest.json`](../graduation/source-manifest.json).

## Prototype Identity

- prototype: `governance-operations-console`
- product name: Workspace Governance Operations Console
- prototype owner: Workspace Governance
- source custodian: Workspace Prototype Studio
- product owner: `mfshaf7`
- lifecycle: `baseline-approved`
- visibility: `private-internal`
- data mode: `real-readonly`
- mutation boundary: `prototype-local`
- runtime lane: `prototype-devint`

The registry binds
`record://design-baselines/governance-operations-console-2026-07-30` and the
focused security review. Merge of the source landing makes that approved
baseline durable on the repository mainline.

## Objective And User Need

The Console gives one workspace operator a coherent surface for governance
attention, operation workflows, runtime posture, bounded agent assistance,
cross-domain transition visibility, and authority-owned evidence.

It must make current state, required action, source authority, mutation
boundary, run state, and receipts understandable without moving canonical
business truth into the browser or a Console-owned database.

## Accepted Baseline Foundation Scope

- Console Shell, navigation, Command Center, Workspace Pulse, Governance
  Activity, Operator Account, Runtime Readiness, and Agent Console
- seven Operation Workbench domains: Proposal, Repository, Model Operations,
  Delivery, Prototype, Product Portfolio, and Orchestration
- Lifecycle Transitions, Dev Integration, and Governed Releases workspaces
- product-neutral Teras primitives and explicit Build Tree, Context Board, and
  Control Board ownership boundaries
- structured fixture, prototype-local command, run, receipt, projection,
  persistence, and reconciliation contracts
- Workspace Intake and active-inventory contract shapes without a fabricated
  standalone Workbench domain

## Non-Goals

This baseline does not claim:

- live backend mutation or canonical persistence
- authenticated identity, authorization enforcement, or access approval
- durable OOS or Temporal execution
- live WGCF, CGG, OpenProject, repository, platform, security, or release
  adapters
- stage, production, public exposure, or security acceptance
- source graduation or completion of the existing Delivery initiative

## Architecture And Workflow Evidence

| Evidence | Record |
| --- | --- |
| Canonical system model and synchronized views | [`architecture/README.md`](architecture/README.md) |
| System purpose and lifecycle boundary | [`system-design.md`](system-design.md) |
| Operation engineering and interaction contract | [`operation-workbench-contract.md`](operation-workbench-contract.md) |
| Domain behavior and workflow contracts | [`domain-contracts/`](domain-contracts/README.md) |
| Console capability contracts | [`surface-contracts/`](surface-contracts/README.md) |
| Shared interface contract | [`teras-contract.md`](teras-contract.md) |
| Current source and ownership audit | [`implementation-audit.md`](implementation-audit.md) |
| End-to-end local route proof | [`foundation-simulation-report.md`](foundation-simulation-report.md) |

The architecture packet covers system context, operator surfaces, authorities,
lifecycle, handoffs, runtime and release, capability maturity, and foundation
proof. The Foundation Simulation carries a runnable Focus Timer product through
Proposal, Repository, Prototype, Delivery, Workspace Intake, active inventory,
and Product Portfolio without mutating another repository.

## Data, Mutation, And Evidence Boundary

- Canonical records remain with their named owner systems.
- Console selection, filters, dialog state, and page-lifetime preferences are
  local presentation state.
- Draft continuity uses the shared browser draft boundary and is disposable.
- Prototype-local commands preserve deterministic actor and session identity
  through command, run, and receipt envelopes.
- Cross-domain packets preserve source version, custody, correlation,
  causation, and receipt references.
- Completed local commands require receipts; stale, blocked, failed, canceled,
  and unavailable outcomes cannot project success.
- Live adapter placeholders fail closed and expose unavailable capabilities
  instead of simulating backend effects.

## Validation Evidence

Recorded on 2026-07-30 with:

```text
make validate
```

The command proved:

- Prototype Studio registry and record validation: passed
- architecture model and synchronized maturity views: passed
- whole-console and all domain architecture guards: passed
- semantic suite: 330 passed, 0 failed
- foundation route catalog: 54 passed
- TypeScript: passed
- optimized production build: passed

Production dependency evidence:

- Next.js: `15.5.22`
- PostCSS: `8.5.25`
- Sharp: `0.35.3`
- `npm audit --omit=dev`: 0 known vulnerabilities

## Governed Promotion State

The baseline landing is tracked under Delivery initiative `#417`:

| Work item | Purpose | Landing Unit |
| --- | --- | --- |
| `#767` | Parent baseline approval and landing Feature | Coordination parent |
| `#768` | Workspace Prototype Studio source baseline | `feature_single_landing_unit` |
| `#769` | Focused Governance Console security delta review | `child_isolated_landing_unit` |
| `#770` | Security evidence freshness prerequisite | `child_isolated_landing_unit` |
| `#771` | PI objective for governed baseline approval | PI objective |

Security items `#769` and `#770` are complete through merged
security-architecture PRs `#89` and `#90`. Source item `#768` remains the final
child landing unit on branch `delivery-768-governance-console-baseline`.

## Live Integration and Deployment Owner Ledger

| Owner | Deferred implementation |
| --- | --- |
| Workspace Governance | authenticated Workspace Intake decisions, active-inventory promotion, canonical schema changes, and product-classification vocabulary |
| Workspace Governance Control Fabric | live validation, readiness, admission planning, and authority readback |
| Operator Orchestration Service | durable workflow requests, run correlation, retries, receipts, and qualified Temporal adapters |
| Platform Engineering | dev-integration execution, product runtime integration, stage, production, and governed release adapters |
| Security Architecture | identity and trust review, privileged action review, security acceptance, and exception authority |
| Context Governance Gateway | governed context admission, redaction, budgeting, projection, and receipts |
| Federated identity and platform access | OIDC, sessions, RBAC, named authority, access requests, and server-side authorization |
| Domain and product owners | live Proposal, Repository, Delivery, Prototype, Portfolio, OpenProject, and product-manifest adapters |

Each deferred item requires its own governed work home and owner-repo
implementation. This packet does not authorize cross-repository changes.

## Remaining Baseline Decision

No known Baseline Foundation architecture, semantic, source-structure, type,
build, dependency-audit, or foundation-simulation defect remains.

The remaining landing gates are:

1. rerun exact clean-install validation from the reviewed source state;
2. land the Workspace Prototype Studio source pull request;
3. finalize the source Review Packet and reconcile the baseline Feature and PI
   Objective without closing the broader Delivery initiative;
4. classify and sequence Live Integration and Deployment work separately.

## Approval

Operator direction: accepted for governed baseline promotion on 2026-07-30.

Durable approval reference:
`record://design-baselines/governance-operations-console-2026-07-30`.
