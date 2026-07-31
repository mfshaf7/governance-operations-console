# Orchestration Domain Contract

Status: accepted local-baseline domain and visual architecture. All seven local
implementation phases are complete; the surface remains fixture-backed and
local-only.

Orchestration owns the Console surface for durable definition qualification,
definition visibility, run visibility, and bounded run control. It must not
replace domain workflow meaning, executable source ownership, target-domain
admission, or backend authority.

The qualification and definition rules are owned by
[`../durable-orchestration-standard.md`](../durable-orchestration-standard.md).
The current domain decisions are locked in
[`../orchestration-use-case-matrix.md`](../orchestration-use-case-matrix.md).
Concrete definition contracts are indexed in
[`../orchestration-definitions/`](../orchestration-definitions/README.md).

## Architecture Decision

Recommendation posture: `extend`.

Orchestration extends:

- the existing Operator Orchestration Service authority boundary
- the Operation Workbench Full Workspace Mode
- the existing Teras fullscreen, register, dashboard, wizard, advisor, log,
  status, and dialog primitives

It does not create a new control plane, runtime authority, backend service,
surface mode, Teras primitive, or local visual system.

Product-surface work remains in this owner repository. Durable OOS, platform,
security, or runtime implementation is post-baseline work and must be routed
to its authority owner separately.

## Surface Purpose

The operator uses Orchestration to:

- determine whether a proposed backend operation needs durable orchestration
- design and review an implementation-ready orchestration definition
- inspect active, suspended, retired, and candidate definitions
- inspect orchestration requests, runs, activities, waits, failures, events,
  and receipts
- request allowed retry, resume, signal, cancel, or defer operations
- inspect adapter and worker posture without leaking runtime details into
  ordinary domain workflows

Orchestration is both a definition-management surface and a run-operations
surface. Domain-specific drafting and business decisions remain in the owning
domain.

Current implementation completion:

- Phase 1, Foundation And Scenario Truth: complete
- Phase 2, Fullscreen Workspace Shell: complete
- Phase 3, Home: complete
- Phase 4, Definitions Register And Dashboard: complete
- Phase 5, Design Orchestration: complete
- Phase 6, Runs Register And Dashboard: complete
- Phase 7, Cutover And Verification: complete

## Source Of Truth

After backend admission:

- OOS owns the operator workflow catalog, definition projection, request API,
  aggregate run projection, run-control API, correlation, and receipts.
- Executable definition source remains in the implementation owner repo.
- Temporal is a replaceable durable runtime adapter behind OOS.
- Owner components retain their activity or subworkflow boundaries.
- Platform Engineering and Security Architecture retain runtime and trust
  acceptance authority.

Before baseline, Orchestration definitions and runs are synthetic fixtures or
prototype-local projections only. They must not claim active runtime evidence.

## Entry Profile

Orchestration uses Full Workspace Mode with the
`fullscreen-workspace-modal` entry class.

- The Workbench button opens `Orchestration Workspace` directly.
- The workspace uses `TerasModalShell width="viewport" height="fill"` and
  `TerasFullscreenSurfaceFrame`.
- Persistent numbered navigation uses `TerasSurfaceNav` and
  `TerasSurfaceNavButton`:
  - `01 Home`
  - `02 Definitions`
  - `03 Runs`
- The shell title remains `Orchestration Workspace`. Selected definition and
  run names belong in selected-record or dashboard panels.
- The workspace does not own document scrolling. Each register, queue, event
  feed, execution list, and evidence list owns bounded internal scrolling.
- The existing placeholder has no useful legacy capability, so replacement is
  direct. No comparison toggle or inline legacy surface is required.

The persistent workspace posture is projected from one shared read model and
shown on every peer surface:

- `OOS API`
- `Catalog`
- `Run Projection`
- `Execution`

Each status is a global Orchestration-system signal, not selected-record
metadata. During prototype work, each signal must truthfully identify
synthetic, local, unavailable, stale, or blocked posture. Temporal belongs only
in technical definition or runtime diagnostics.

## Primary Surfaces

### Home

Home uses `TerasPrimarySideLayout`.

The workspace summary contains:

- `Active Runs`: queued plus running
- `Waiting`
- `Blocked`
- `Failed`
- `Definition Work`: qualification, definition review, or admission work

The primary zone contains:

- `Orchestration System Posture`
  - a detailed `TerasSurfaceStatusPanel`
  - uses the same read-model truth as the compressed workspace header
  - does not repeat selected definition or run facts
- `Attention Queue`
  - owns the remaining primary-zone space and bounded scrolling
  - includes definition qualification, review, and admission work
  - includes blocked and failed runs
  - includes waiting runs only when operator action is required or a review
    date or deadline is overdue
  - supports search plus `scope`, `condition`, and `owner` filters

The side zone contains:

- `In-flight Runs`
  - queued, running, and healthy structured waits
  - does not repeat blocked or failed runs already owned by Attention Queue
- `Material Events`
  - structured system events only
  - no generic prose, fake recent activity, raw logs, or mutable history

Home does not include an Agent Console, duplicated definition or run register,
source-context panel, or `Design Orchestration` action.

### Definitions

Definitions uses the standard full-workspace register and selected-record
layout.

The summary contains:

- `Candidates`
- `Qualified`
- `Ready`
- `In Review`
- `Active`

Suspended and retired definitions remain searchable and filterable. A
`synchronous` or `conditional` qualification is retained as a qualification
record and must not be projected into the durable definition lifecycle merely
to populate a summary card.

The register provides:

- search
- record-state filter
- classification filter
- source-domain filter
- columns for Definition, Source, Classification, Posture, and Action

The right zone contains:

- a short railed `Qualify a backend operation` entry panel with the primary
  `Design Orchestration` action
- a `TerasSelectedPanel variant="rich"` with source, version, classification,
  execution owner, implementation repo, lifecycle, current required move, and
  `Open Definition`

Definitions has no separate hub. `Open Definition` opens the stable Definition
Dashboard.

### Runs

Runs uses the standard full-workspace register and selected-record layout. It
has no `Start Run` or ingress action. Runs originate only from approved
source-domain commands.

The summary contains:

- `Active`
- `Waiting`
- `Blocked`
- `Failed`
- `Completed`

Cancelled runs remain filterable rather than occupying a permanent summary
card.

The register provides:

- search
- run-state filter
- definition filter
- source-domain filter
- columns for Run And Source, Definition And Version, Current Node, State,
  Updated, and Action

The right zone uses `TerasSelectedPanel variant="rich"` and shows request and
run ids, source domain and record reference, definition and version, current
node and owner, effect posture, state, current required move, and
`Open Run Dashboard`. Register rows and the selected launcher do not own run
controls.

## Definition Dashboard

The Definition Dashboard is a stable large dashboard, not a hub and not a
workflow step. It contains:

- `Selected Definition`
- `Execution Plan`
  - bounded node list or graph
  - focused node details on selection
- `Definition Action`
- `Admission Posture`
  - implementation
  - validation
  - platform
  - security
  - runtime
- focused contract inspectors:
  - Trigger And Result
  - Failure And Controls
  - Evidence And Security
  - Version History

Active definitions are immutable. `Draft New Version` creates a new candidate
version. Suspended and retired definitions remain reviewable and read-only.
Long technical content belongs in focused dialogs rather than tabs or prose
stacks on the dashboard.

## Definition Workflow

`Design Orchestration` is an advisor-assisted definition workflow. The advisor
is a first-class co-author during Qualify and Define, not a passive panel added
to every step.

A durable candidate uses three stages:

1. **Qualify**
   - persistent advisor in the right zone
   - structured interview covering trigger, execution boundary, waits,
     failures, ownership, and completion
   - advisor suggests classification and rationale
   - operator records `synchronous`, `conditional`, or `durable-candidate`
2. **Define**
   - persistent context-aware advisor in the right zone
   - main-zone structured editor with these sections:
     1. Identity And Ownership
     2. Trigger And Result
     3. Execution Plan
     4. Failure And Controls
     5. Evidence And Security
     6. Delivery And Versioning
   - advisor suggestions become field-level patches with explicit Apply or
     Reject; they never edit draft state silently
   - section editing remains inline so the advisor and definition context stay
     visible
3. **Review And Request**
   - no advisor
   - review architecture, security, platform, owner-repo, validation, rollout,
     and work-home obligations
   - findings link back to the relevant Define section
   - Back returns to Define with the relevant section active
   - final operator approval is required
   - route the implementation-ready packet to Proposal or Delivery ART with a
     target reference

`synchronous` and `conditional` classifications use a two-stage
`Qualify -> Review` path and finish with `Record Qualification`. Only a
`durable-candidate` enters Define and finishes with `Request Implementation`.

The final stage becomes the receipt surface after the action succeeds. There
is no fourth result step.

The workflow uses `TerasWizardModal size="wide"`, shared Teras fields,
checklists, panels, advisor, progress, action, and guard primitives. It never
emits executable code, activates a definition, or writes runtime source.

Before a governed model profile and invocation path are admitted, advisor
responses are synthetic or prototype-local suggestions and must be labeled as
such. A future live advisor may receive only the bounded source summary and
current definition draft needed for the active section. It must not receive raw
operational context, secrets, credentials, private logs, or authority to
approve, request, or apply work. Live activation requires the existing AI
governance and security-review path.

Definition drafts persist only in prototype-local continuity state. Dirty
state is derived from draft-versus-baseline comparison, and the shared close
guard appears only for uncommitted editor changes.

## Run Dashboard

The Run Dashboard is a stable wide dashboard, not a workflow session. It
contains:

- `Selected Run`
- `Execution Progress`
- `Current Run Condition`
- `Evidence Inspectors`
- `Run Events`

Selected Run must distinguish:

- orchestration run state
- source-domain business state
- effect posture

Execution Progress is a bounded scroll list of activities, waits, and
subworkflows with owner, state, attempt, duration, and skip reason. Parallel
groups are visually grouped. Completed nodes remain inspectable; future nodes
are muted rather than falsely blocked. Selecting a node opens focused input,
output, artifact, log, attempt, and receipt details.

Current Run Condition mutates by run state:

- queued: scheduling and cancel posture
- running: current node, owner, attempt, and effects
- waiting: wait kind, owner, reason, signal or dependency, and deadline
- blocked: blocker, remediation, retained effects, and supported disposition
- failed: failure, retry posture, and effects
- completed: verified result and final receipt
- cancelled: retained and verified effects

Evidence Inspectors provide focused access to:

- artifacts
- operator-safe logs
- receipts
- source projection
- runtime diagnostics

Run Events is a structured visible feed. Events explain orchestration, logs
show bounded execution output, and receipts prove accepted or verified
outcomes. These concepts must not be collapsed into one generic history list.

## Run Controls

Retry, Resume, Provide Signal, Defer, and Cancel use bounded dialogs rather
than wizards.

Each control shows:

- owning authority
- expected effect
- idempotency posture
- current effect posture
- availability and disabled reason
- resulting event or receipt

Defer requires owner, reason, resume condition, and a review date or deadline.
Cancel uses the shared destructive confirmation guard and must state that
cancellation is not rollback.

Only OOS-projected available controls are shown. If another authority owns the
required action, the dashboard routes there instead of simulating the action.
Terminal runs remain inspectable and cannot be reopened or edited. Corrected
inputs are resubmitted by the source domain.

## Definition Lifecycle

- `candidate`
- `qualified`
- `definition-ready`
- `implementation-requested`
- `admission-review`
- `active`
- `suspended`
- `retired`

An active definition is immutable. Behavior changes create a new version.

## Run Lifecycle

- `queued`
- `running`
- `waiting`
- `blocked`
- `failed`
- `completed`
- `cancelled`

`waiting` is expected workflow behavior. `blocked` requires remediation or an
authority decision. Retry availability, retry exhaustion, signal availability,
and cancellation availability are projected capabilities, not lifecycle
states. Deferral is a control that creates a structured `waiting` condition,
not another lifecycle state.

## Definition Projection

The selected-definition read model must provide:

- definition id, optional family id, and immutable version
- purpose and qualification decision
- source domain and source record type
- business, implementation, execution, and execution-node owners
- trigger and completion condition
- expected receipt and return projection
- activity, wait, subworkflow, condition, signal, retry, timeout, recovery,
  cancellation, and lock summary
- implementation, validation, platform, and security posture
- lifecycle and version history

Long technical contracts belong in focused detail dialogs. The primary surface
must remain operationally scannable.

## Run Projection

The selected-run read model must provide:

- request and run ids
- definition id, optional family id, and version
- source domain and source record reference
- correlation and causation references
- state, current execution node, node type, and owner
- bounded progress and skipped-node counts
- structured wait, blocker, failure, and retry details
- effect posture and allowed control actions
- artifact, log, receipt, and evidence references
- source-domain projection reference and version
- timestamps and event history
- runtime adapter diagnostics as secondary technical detail

## Required Synthetic Scenarios

The pre-baseline read model must include structured fixtures for:

- queued run with no effects
- running run with possible effects
- healthy structured wait
- blocked run with partial effects
- failed run with retry available
- completed run with verified effects
- cancelled run with retained effects
- synchronous qualification
- conditional qualification
- durable candidate under qualification
- definition ready for implementation request
- definition in admission review
- active, suspended, and retired definition versions

No fixture may claim a live OOS durable run, live worker, admitted Temporal
runtime, platform acceptance, or security acceptance.

## Source Architecture

Orchestration follows the standard Operation Workbench ownership layers:

```text
orchestration/
  index.ts
  domain/
  read-model/
    workspace/
    definitions/
    runs/
  work-model/
    definition-design/
    run-control/
  local-runtime/
    definition-design/
    run-control/
  presentation/
    workspace/
    surfaces/
      home/
      definitions/
        register/
        dashboard/
        dialogs/
      runs/
        register/
        dashboard/
        dialogs/
    workflows/
      definition-design/
```

Ownership rules:

- `domain/` owns canonical definition and run concepts.
- `read-model/` owns structured source projection, fixtures, selectors, and
  scenario truth.
- `work-model/` owns definition-design drafts and bounded run-control request
  DTOs.
- `local-runtime/` owns only prototype-local draft continuity, simulated
  receipts, and scenario overlays.
- `presentation/workspace/` owns the fullscreen shell, navigation, summary,
  workspace status, and controller.
- Each peer surface owns its register, dashboard, and focused dialogs.
  Orchestration must not create a misleading domain-wide `package-register/`
  because Definitions and Runs have different records and actions.
- `presentation/workflows/definition-design/` owns the complete advisor-assisted
  session. Step views receive prepared props and emit bounded intents.
- Do not create `presentation/shared/` in the initial scaffold. Add it only
  when two Orchestration presentation boundaries genuinely share a
  domain-local helper that cannot remain with either owner.
- Internal folders do not receive convenience barrels. The domain root is the
  public operation entry.
- Standard chrome uses Teras. Local CSS is allowed only for domain-specific
  composition or scroll ownership after explicit discussion.

## Implemented Capability Set

The current local prototype includes:

- structured definition and run scenarios
- fullscreen workspace entry, navigation, summary, status, and close behavior
- Home system posture, Attention Queue, In-flight Runs, and Material Events
- Definitions register, selected launcher, dashboard, inspectors, and
  immutable-version behavior
- advisor-assisted Qualify, Define, and Review And Request work
- Runs register, dashboard, progress, conditions, evidence, events, and bounded
  controls
- prototype-local continuity, dirty guards, and receipts

Backend wiring, a new Teras primitive, a local visual variant, or a runtime
authority claim still requires separate discussion and admission.

## Mutation Boundary

The Console may prepare prototype-local definition drafts and, after backend
admission, submit bounded OOS requests. It must not:

- call Temporal directly
- edit active executable workflow source
- activate a definition without source, validation, platform, and security
  evidence
- own adapter retries or activity credentials
- mutate source-domain records outside their admitted command path

## Non-Goals

Orchestration must not:

- become a low-code or arbitrary workflow-code editor
- become a generic dumping ground for domain actions
- treat every UI wizard as a durable workflow
- redefine Proposal, Delivery, Repository, Prototype, Portfolio, Model, or
  authority-owned risk workflow meaning
- replace Proposal or Delivery work routing
- replace WGCF validation, target-domain admission, named decision authorities,
  Platform Engineering, or Security Architecture
- hide adapter-specific failures behind an unqualified generic status

## Sources

- `../durable-orchestration-standard.md`
- `../orchestration-use-case-matrix.md`
- `../orchestration-definitions/README.md`
- `../system-design.md`
- `../operation-workbench-contract.md`
- `../orchestration-boundary-contract.md`
