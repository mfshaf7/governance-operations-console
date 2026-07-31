# Runtime And Release Architecture

Status: approved local-baseline target projection.

Source: [`system-model.yaml`](../system-model.yaml). This view separates
incubation proof, local integration, governed environments, model access, and
durable workflow execution.

## Environment Path

```mermaid
flowchart LR
  Source["Reviewed source state"]
  Preview["Prototype Preview Runtime<br/>local incubation proof"]
  DevInt["Dev Integration<br/>active admitted profile"]
  Stage["Governed stage operation"]
  Production["Governed production operation"]
  RuntimeLifecycle["Supported runtime lifecycle<br/>start, stop, restart, restore"]

  Source --> Preview
  Source --> DevInt
  DevInt -->|reviewed commits + promote-check evidence| Stage
  Stage -->|product-specific readiness + approval| Production
  Production --> RuntimeLifecycle

  Platform["Platform Engineering"] --> DevInt
  Platform --> Stage
  Platform --> Production
  Platform --> RuntimeLifecycle
  Security["Security Architecture"] -. "trust evidence / decision" .-> Stage
  Security -. "trust evidence / decision" .-> Production
  WGCF["WGCF"] -. "validation / readiness / receipts" .-> DevInt
  WGCF -. "validation / readiness / receipts" .-> Stage
  WGCF -. "validation / readiness / receipts" .-> Production
  Owners["Owner repositories"] -. "source + capability descriptors" .-> Source
```

## Environment Responsibilities

| Layer | Purpose | Authority | Does not imply |
| --- | --- | --- | --- |
| Prototype Preview Runtime | Operate a local preview and collect incubation evidence. | Workspace Prototype Studio for prototype record; local process for proof. | Dev-integration admission, platform readiness, stage, production, or Portfolio listing. |
| Dev Integration | Run fast local integration through an admitted active profile and produce stage-handoff evidence. | Workspace Governance profile contract plus Platform-owned runner. | Stage promotion or production approval. |
| Stage | Rehearse a product-supported governed release path. | Platform Engineering, with WGCF and Security evidence as required. | Production readiness or production activation. |
| Production | Execute a product-supported governed production operation. | Platform Engineering and the product release authority. | Universal support for every product or command. |
| Runtime lifecycle | Run only lifecycle commands declared by the product capability descriptor. | Platform Engineering and product-owned adapters. | A generic Console authority over arbitrary runtimes. |

Products without a governed release rail remain visible at their highest proven
endpoint. The Console does not synthesize stage, production, or runtime
controls.

## Workflow Execution

```mermaid
flowchart TB
  Domain["Owning domain command"]
  OOS["OOS workflow API and catalog"]
  Durable["Replaceable durable runtime adapter"]
  Activity["Bounded activities, waits,<br/>locks, retry, and recovery"]
  Authority["Target authority"]
  Receipt["Correlated immutable receipt"]

  Domain --> OOS
  OOS --> Durable
  Durable --> Activity
  Activity --> Authority
  Authority --> Receipt
  Receipt --> OOS
  OOS --> Domain
```

- OOS owns shared workflow APIs, catalog, correlation, and run control.
- A durable engine such as Temporal is an admitted implementation adapter
  behind OOS. It is not Console vocabulary or domain authority.
- Domain-specific workflow meaning remains in the owning domain.
- Definition source remains reviewed, versioned source in an owner repository.
- The Orchestration surface qualifies candidates, inspects definitions and
  runs, and requests bounded controls. It is not an in-browser workflow engine.

## Model And Context Path

```mermaid
flowchart LR
  Candidate["Visible context candidate"] --> CGG["CGG admission,<br/>redaction, budget, projection"]
  CGG --> Packet["Model-safe packet + receipt"]
  Packet --> Access["Governed model access"]
  Profile["Governed model profile"] --> Access
  Identity["Authenticated actor + caller policy"] --> Access
  Access --> Agent["Agent Console session"]
```

| Capability | Responsibility |
| --- | --- |
| Model Operations | Project governed model profiles, caller eligibility, access readiness, runtime controls, and Security evidence. |
| Context Governance Gateway | Admit and transform operational context into bounded safe packets. |
| Federated Identity and Access | Authenticate the actor and enforce caller roles and authority. |
| Agent Console | Host separate bounded sessions and consume admitted context; it does not approve profiles or mutate domains. |

The current local agent connection is valid pre-baseline proof. Synthetic
context projection must be replaced with CGG-admitted packets before governed
live context use.

## Observation Boundary

Runtime Readiness is read-only observation of local host telemetry, declared
component coverage, freshness, and source-qualified alerts. It is separate from:

- WGCF readiness evaluation;
- Dev Integration profile state;
- product release readiness;
- stage or production operation state;
- Agent runtime presence.
