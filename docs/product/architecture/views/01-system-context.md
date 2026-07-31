# System Context

Status: approved local-baseline target projection.

Source: [`system-model.yaml`](../system-model.yaml). This view does not define
independent architecture truth.

## System Role

The Governance Operations Console is an operator and command surface over
multiple canonical authorities. It composes projections, prepares bounded
commands, routes operators to owning workflows, and reconciles receipts. It
does not become a canonical business database or a replacement control plane.

```mermaid
flowchart TB
  Operator["Operator"]

  subgraph Console["Governance Operations Console"]
    Shell["Console Shell"]
    Overview["Command Center, Workspace Pulse,<br/>Activity, Account, Agent, Runtime"]
    Workbench["Operation Workbench<br/>7 operation domains"]
    CrossDomain["Lifecycle Transitions,<br/>Dev Integration, Governed Releases"]
    ProductApps["Context Board, Build Tree,<br/>Control Board"]
    Teras["Teras interface primitives"]
  end

  subgraph Workflow["Workflow And Evidence"]
    OOS["Operator Orchestration Service"]
    WGCF["Workspace Governance Control Fabric"]
    CGG["Context Governance Gateway"]
    Intake["Workspace Intake<br/>embedded classification + promotion"]
  end

  subgraph Canonical["Canonical Record Authorities"]
    Governance["Workspace Governance<br/>intake register + active inventory"]
    OpenProject["OpenProject<br/>Proposal + Delivery ART"]
    Studio["Workspace Prototype Studio"]
    Repositories["Owner Repositories"]
    Identity["Federated Identity And Access"]
  end

  subgraph Runtime["Runtime, Release, And Trust"]
    Platform["Platform Engineering"]
    Security["Security Architecture"]
  end

  Operator --> Shell
  Shell --> Overview
  Shell --> Workbench
  Shell --> CrossDomain
  Shell --> ProductApps
  Teras --> Overview
  Teras --> Workbench
  Teras --> CrossDomain
  Teras --> ProductApps

  Overview -. "read / bounded request" .-> Workflow
  Overview -. "identity projection" .-> Identity
  Workbench -. "workflow request" .-> OOS
  Workbench -. "validation / readiness" .-> WGCF
  Workbench -. "canonical read / admitted write" .-> Canonical
  Workbench -. "conditional entrant candidate" .-> Intake
  Intake --> Governance
  Intake -. "validation" .-> WGCF
  Intake -. "correlation" .-> OOS
  CrossDomain -. "correlation / execution request" .-> Workflow
  CrossDomain -. "runtime / release command" .-> Platform
  CrossDomain -. "security evidence" .-> Security
  Overview -. "admitted context packet" .-> CGG
  ProductApps -. "incubation source" .-> Studio
```

## Architectural Planes

| Plane | Responsibility |
| --- | --- |
| Operator experience | Shell, navigation, dashboards, focused workspaces, dialogs, and bounded assistance. |
| Domain operations | Proposal, Repository, Model, Delivery, Prototype, Portfolio, and Orchestration behavior. |
| Cross-domain control | Transition correlation, environment operations, attention routing, and read-only runtime posture. |
| Governance evidence | Policy, validation planning, readiness, context admission, receipts, and security decisions. |
| Workflow execution | Shared operator APIs, adapters, retry, correlation, and future durable execution. |
| Canonical authority | Durable proposal, delivery, prototype, product, repository, source, identity, and platform records. |
| Runtime and release | Local integration, stage, production, product runtime, and release execution. |
| Interface infrastructure | Product-neutral primitives and reusable incubating product applications. |

## Boundary Rules

- The Console has no canonical business database.
- Console-local drafts and receipts prove interaction, not backend mutation.
- Each canonical record has one authority and one mutation owner.
- The Console must identify stale, unverified, unavailable, and
  prototype-local data explicitly.
- Missing backend support is an implementation gap. It does not invalidate an
  approved target capability or permit a fake live effect.
- Workspace Intake is a generic Workspace Governance authority workflow for
  repos, products, and components. It is embedded where an entrant is
  discovered and is not an Operation Workbench domain.
- `admitted` in the intake register means accepted for governance
  consideration. Only a separate promotion creates an active `repos.yaml`,
  `products.yaml`, or `components.yaml` record.
- Cross-repo implementation begins only after baseline approval and is routed
  to the owner that must review, deploy, validate, and roll it back.
