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
