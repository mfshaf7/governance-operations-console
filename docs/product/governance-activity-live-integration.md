# Governance Activity Live Integration

## Purpose

Governance Activity presents one read-only chronology from two canonical owner
projections. OOS supplies workflow activity. WGCF supplies governance history
for readiness, escalation, ledger, and receipt records. The Console validates,
merges, filters, and exports those projections in memory; it does not create a
second audit ledger or become evidence authority.

## Server Configuration

OOS uses the existing server-only Console connection. WGCF uses a distinct
read-only caller binding. Concrete values must be delivered at runtime and must
never use `NEXT_PUBLIC_*` variables.

| Variable | Required for live composition | Purpose |
| --- | --- | --- |
| `OOS_BASE_URL` | yes | OOS endpoint visible to the Console server. |
| `OOS_CALLER_SECRET` | yes | OOS caller credential. |
| `OOS_CALLER_ID` | no | Defaults to `governance-operations-console`. |
| `WGCF_BASE_URL` | yes | WGCF endpoint visible to the Console server. |
| `WGCF_CALLER_SECRET` | yes | Dedicated governance-history reader credential. |
| `WGCF_CALLER_ID` | no | Defaults to `governance-operations-console`. |

The browser calls only same-origin `/api/governance-activity`. Owner endpoints,
credentials, and private diagnostics never enter browser code or exported
activity.

## Read Behavior

1. The server reads at most five pages of 100 records from each owner.
2. Both owner payloads are validated against their exact version-one contracts.
3. OOS event facts retain their owner identity, correlation, causation,
   evidence, receipt, and next actions.
4. WGCF records retain the WGCF authority boundary and allowlisted evidence
   routes. The Console maps them into its display vocabulary without treating
   them as approvals.
5. Events merge deterministically by occurrence time and stable event identity.
   Conflicting reuse of one identity fails closed.
6. Stale, unavailable, partial, or truncated sources remain visible as source
   posture. A configured live source never falls back to fixture truth.
7. Disconnected preview is available only when neither owner connection is
   configured.
8. JSON export contains the bounded projected events, filters, source posture,
   observation time, and truncation state. It contains no credentials, raw
   owner payloads, endpoints, or private diagnostics.

## Ownership Boundary

The Console does not mutate workflow or governance state, evaluate readiness,
approve evidence, persist a chronology, retrieve raw artifacts, or replace an
owner evidence route. OOS remains workflow-activity authority. WGCF remains
governance-history authority. Security acceptance and Platform activation are
separate ART `#900` work.

## Validation

Run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/console-architecture/governance-activity-live-adapter.test.mjs
npm run check
```
