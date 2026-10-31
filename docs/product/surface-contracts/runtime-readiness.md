# Runtime Readiness Contract

Status: accepted local-baseline cross-surface contract.

Runtime Readiness owns read-only local host telemetry, the declared component
observation catalog, and source-qualified advisory runtime alerts. Environment
admission, governed release posture, model-runtime posture, and platform
readiness remain with their owning capabilities.

## Surface Purpose

The operator uses Runtime Readiness to inspect the current local host resource
state, understand which component routes are known, determine whether component
health is actually observed, and review alerts that have an eligible source.

## Source Of Truth

The local resource adapter reads bounded host facts from `/proc` and the local
runtime. The current resource snapshot includes:

- CPU
- memory
- virtual memory
- disk
- network throughput
- system uptime
- host and platform identity

VMEM is kernel commit accounting (`Committed_AS / CommitLimit`), not measured
RAM pressure. Its value may exceed 100% under overcommit. Numeric values and
the selected detail chart retain that range; generic pressure thresholds,
normal bands and pressure alerts do not apply to this metric. The adapter does
not change host overcommit policy or diagnose Windows desktop memory usage.
An unverified catalog address is not replaced with a guessed runtime endpoint.

Component catalog entries are not health probes. A component observation must
declare:

- source authority and reference
- source mode
- observation timestamp
- freshness
- alert eligibility

Configured component posture comes from the private Platform-owned
`console-runtime-observations/v1` projection through the Console server. The
browser receives a bounded safe projection rather than Kubernetes references,
recovery paths, filesystem paths, or collector diagnostics. A configured
source that is missing, malformed, stale, contradictory, or unreadable is
unavailable; it must not recover through catalog or scenario fixtures.

Synthetic scenarios are presentation fixtures. They must remain visibly
synthetic and must not create normal runtime alerts.

## Freshness

Resource telemetry uses these explicit states:

- `warming`: no sample has completed
- `live`: the latest probe succeeded
- `stale`: a previous sample is retained after the latest probe failed
- `unavailable`: no usable sample exists and the latest probe failed
- `mock`: an operator-enabled development scenario is active

Retained values must never remain labeled live after a failed probe.

## Alert Eligibility

An alert may be projected only from:

- a current eligible component observation from an identified authority
- a current live host sample
- an explicitly labeled development scenario while Console development mode is
  active
- a telemetry-source failure or stale-source condition

Catalog-only component entries, unavailable observations, and synthetic
component scenarios are excluded from normal alerts.

Resource percentage thresholds are prototype-local advisory thresholds. They
are not governed platform capacity limits or promotion gates.

## Interaction

Runtime Readiness keeps one tabbed surface:

- Resources
- Components
- Alerts

Selecting a resource, component, or alert opens a read-only focus surface.
Each resource focus panel fills the existing Command Center slot regardless of metric
name or description length. Resource charts, statistics and evidence reflow
against that slot's usable width. The resource-card connector is visible only
when the monitor and focus panel are side by side; vertically stacked panels
keep a complete selected-card border without a lateral connector.
Component focus may open a real declared HTTP route. It must not expose
placeholder commands, fabricate stage or production posture, or imply that a
declared route has been health checked.

## Data Boundaries

Runtime telemetry must remain bounded. The surface must not expose secrets,
private logs, raw operational context, uncontrolled environment dumps, or
mutation controls.

## Non-Goals

Runtime Readiness must not:

- mutate runtime state
- approve stage or production
- project WGCF readiness without an admitted source
- replace Environment Lifecycle or platform release authority
- imply preview readiness equals platform readiness
- own model-runtime or Agent Console posture
- approve lifecycle-transition or Delivery actions

## Sources

- `../system-design.md`
- `../../../devint-prototype-preview.md`

## Primary monitor interaction

Resources, Components and Alerts use tab/tabpanel relationships, roving focus
and ArrowLeft/ArrowRight/Home/End activation. The no-alert explanation reflects
actual component observation coverage; it cannot label connected observations
as disconnected. Fixed Console docks reserve their own lanes, and the same
monitor reflows within the remaining desktop stage. VMEM remains explicitly
commit accounting, not a RAM-pressure assertion.
