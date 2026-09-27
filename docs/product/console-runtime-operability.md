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

## Validation

The product guards enforce that:

- governed runtime keys are read only by the central configuration module;
- all API requests pass through the correlation middleware;
- canonical mutations use the shared authorization and correlation boundary;
- browser code cannot receive caller secrets or authority references.

Semantic tests cover disconnected, invalid, and live capability projection;
secret-safe output; successful mutation correlation; denied mutation
correlation; bounded owner failure; and unchanged owner receipt readback.
