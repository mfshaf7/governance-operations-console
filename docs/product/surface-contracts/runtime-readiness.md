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

Component catalog entries are not health probes. A component observation must
declare:

- source authority and reference
- source mode
- observation timestamp
- freshness
- alert eligibility

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
