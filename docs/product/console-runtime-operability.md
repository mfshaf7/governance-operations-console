# Console Runtime Operability

Status: implemented product-local contract.

## Purpose

The Console needs one truthful answer for two runtime questions:

1. Which admitted owner-backed capabilities are available now?
2. Which request, owner call, error, receipt, and projected activity belong to
   the same operation?

This contract centralizes those answers without making the Console an identity,
workflow, audit-ledger, deployment, or release authority.

## Configuration Boundary

`src/console-integration/configuration/console-runtime-configuration.ts` is the
only product source allowed to read the governed OOS connection, Console
operator binding, session-projection path, and repository authority-reference
environment keys.

The same boundary resolves
`GOVERNANCE_CONSOLE_RUNTIME_OBSERVATION_PATH` for the private Platform-owned
runtime observation projection. The path remains server-only and must be an
absolute path to an operator-private regular file.

Model Operations resolves its OOS operator binding plus the three exact
Platform evidence paths only through the same central module:

- `GOVERNANCE_CONSOLE_MODEL_PROFILE_SOURCE_PROJECTION_PATH`
- `GOVERNANCE_CONSOLE_MODEL_PROFILE_LIFECYCLE_RECEIPT_PATH`
- `GOVERNANCE_CONSOLE_MODEL_PROFILE_MERGED_READBACK_PATH`

Selecting any part of that live shape selects live mode. Missing, malformed,
non-private, stale, or digest-conflicting evidence fails closed without fixture
fallback. Browser responses never expose the file paths or OOS credential.

## Runtime Observation Boundary

Runtime Readiness consumes Platform's `console-runtime-observations/v1`
projection through a same-origin, read-only Console route. The server verifies
the exact authority, environment, source mode, validity window, component
shape, replica posture, capability posture, and recovery ownership before it
projects component availability.

The browser receives only component identity, category, availability,
freshness, observation time, and the opaque Platform observation reference.
Kubernetes object references, recovery paths, filesystem paths, credentials,
and private diagnostics remain server-side. Missing, malformed, stale,
contradictory, non-private, or unreadable configured evidence projects an
explicit unavailable state and never falls back to fixture success.

When the runtime observation path is not configured, Runtime Readiness remains
in explicit disconnected preview and may show its declared component catalog.
Host CPU, memory, virtual memory, disk, network, and uptime continue through the
separate local telemetry adapter; neither source substitutes for the other.

Server adapters consume typed resolvers from that module. A partially supplied
live configuration selects live mode and fails closed; it must not fall back to
fixtures. The capability projection at `GET /api/console/capabilities` exposes
only capability state and stable reason codes. It never exposes endpoints,
paths, operator identities, credentials, or artifact values.

The projection states are:

- `available`: the required non-secret shape validates and the capability may
  proceed to its own owner and authorization checks.
- `disconnected`: live integration was not selected; approved preview behavior
  may remain available where its domain contract allows it.
- `invalid`: live integration was selected but its required configuration is
  incomplete or malformed; the capability fails closed.

Capability projection is diagnostic truth, not proof that OOS, Platform,
Security, or an external provider is healthy.

## Fixture Isolation And Executable Action Boundary

The Console consumes the Workspace Governance operational-capability contract
through the pinned binding at
`contracts/console-operational-capabilities.binding.json`. The product-owned
decision module at
`src/console-integration/fixture-isolation/console-fixture-isolation.ts`
selects exactly one demonstration source:

- an owner-confirmed `disconnected-preview` may select capability-owned
  fixtures and prototype-local simulation actions;
- a current `live` owner projection may select canonical data and durable
  actions;
- loading, partial, offline, invalid, or unavailable owner truth selects no
  fixture and disables both action classes.

The `?dev=1` presentation control may choose among approved synthetic scenarios
only after the owner has explicitly reported disconnected preview. It cannot
override live mode, convert a live error into fixture data, merge fixture and
canonical records, or make a durable action executable. This rule applies to
whole-Console composition as well as individual domain adapters.

## Correlation Boundary

Every same-origin `/api/*` request receives a fresh server-issued
`x-console-correlation-id`. An inbound caller value is replaced. Authorized
mutations reuse the server-issued identity in the OOS attribution headers and
return it on successful, denied, domain-error, and unexpected owner-failure
responses.

Unexpected owner failures are returned as a bounded
`console_owner_operation_failed` response. Private owner error text is not
projected to the browser. Domain adapters may continue to expose their stable
public error code, retry posture, and approved correction detail; the
correlation header binds that response to server and owner diagnostics.

Correlation is diagnostic identity only. It grants no authorization and is not
a receipt, approval, or completion claim.

## Audit Boundary

The Console does not create a competing durable audit ledger. Canonical audit
activity is projected from validated owner readback already returned by the
admitted domain adapters, including exact receipts, source events, audit
records, and their source references.

The Governance Activity surface may also display explicitly labelled
`prototype-local` or `synthetic` events during disconnected development. Those
events are not canonical owner evidence. Only source-projected owner readback
may support a durable completion or mutation claim.

## Environment Operation Readiness And Recovery

Environment Lifecycle derives operating readiness only from the current OOS
Platform-operation catalog plus retained OOS operation readback. It does not
reuse the separate Runtime Readiness telemetry surface or invent a Console
health authority.

The projection is `ready` only while the integration is live, both owner
sources are current, the catalog observation is within the 60-second operating
window, and no latest retained operation is active, blocked, or failed.
Loading and active operations project `recovering`; a partial source failure
projects `degraded`; an aged or owner-marked catalog projects `stale`; and a
disconnected or wholly absent owner path projects `unavailable`. None of those
four postures counts as ready or falls back to fixtures. Source-level loading,
partial, stale, disconnected, and unavailable states disable new durable
actions. An active, blocked, or failed retained operation changes readiness but
does not override a separate capability that the current owner catalog still
marks available; OOS remains the admission authority.

The browser refreshes the combined projection on a bounded 15-second cadence
while visible. An accepted nonterminal command or control is reconciled from
its exact OOS operation route every two seconds for at most ten attempts; the
normal bounded refresh continues afterward. Partial and offline reads retain
the last validated catalog and operation history for diagnosis, while action
admission remains disabled until fresh combined truth returns.

Operation readiness is scoped to the active Environment workspace. A retained
Governed Releases failure does not make Dev Integration unhealthy, or vice
versa, while their shared catalog dependency remains current.

Every non-ready posture shows the source state, retained owner next action,
and a manual refresh. Retry and cancel stay bound to the exact retained OOS
operation. Stopping a profile explicitly warns that it may stop Console
control-plane dependencies and that recovery then follows Platform's projected
next action. The Console does not claim it can bootstrap an unavailable OOS or
Platform provider from inside that unavailable path.

## Validation

The product guards enforce that:

- governed runtime keys are read only by the central configuration module;
- all API requests pass through the correlation middleware;
- canonical mutations use the shared authorization and correlation boundary;
- browser code cannot receive caller secrets or authority references.

Semantic tests cover disconnected, invalid, and live capability projection;
secret-safe output; successful mutation correlation; denied mutation
correlation; bounded owner failure; unchanged owner receipt readback; loading
and unavailable owner isolation; and the prohibition on dev-mode live
fallback.
