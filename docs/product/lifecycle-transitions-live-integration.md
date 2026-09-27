# Lifecycle Transitions Live Integration

## Purpose

This is the primary Console instruction surface for reading the canonical
cross-domain transition journal. The Console correlates owner truth; it does
not decide, validate, admit, or apply a transition.

Workspace Governance owns the route contract. OOS owns transition identity,
state, chronology, next action, and the canonical Console projection. WGCF
owns validation and escalation evidence, which OOS records in the transition
journal as validation receipts, gates, and owner-routed required fixes.

## Server Configuration

Provide the shared OOS connection through the server runtime. Never expose the
caller secret through a `NEXT_PUBLIC_*` variable or commit a concrete value.

| Variable | Required | Purpose |
| --- | --- | --- |
| `OOS_BASE_URL` | yes | OOS HTTP endpoint visible to the Console server. |
| `OOS_CALLER_SECRET` | yes | Runtime-delivered caller credential. |
| `OOS_CALLER_ID` | no | Defaults to `governance-operations-console`. |

The browser calls only same-origin `/api/lifecycle-transitions`. It never calls
OOS or WGCF directly and never receives owner credentials.

## Read Behavior

1. The server reads bounded OOS transition pages, up to 500 records per
   refresh.
2. Every record must use the canonical Console source envelope and prove
   current freshness, OOS ownership, record identity, and monotonic revision.
3. The adapter validates the three locked route bindings and maps the owner
   projection into the existing Console read model.
4. WGCF readiness appears through OOS-owned validation receipts, gates,
   escalation fixes, and exact next-owner actions. The Console does not issue
   a second WGCF evaluation.
5. An unconfigured runtime returns explicit disconnected preview. Fixture data
   is used only in that posture or explicit Console design mode.
6. A configured runtime that is unavailable, stale, malformed, replayed, or
   route-conflicting fails closed with no fixture fallback.
7. If more than five pages exist, the visible projection is marked truncated
   instead of issuing an unbounded read.

## Ownership Boundary

The integration does not:

- mutate transition state
- append journal evidence
- call WGCF directly
- store canonical transition data in the Console
- invent receipts, target records, owner routes, or recovery actions
- turn fixture data into live authority

Target-domain writes remain owned by admitted source, OOS, WGCF, and target
workflows. Security acceptance and Platform activation remain separate Epic
`#900` work.

## Validation

Run:

```bash
npm run test:lifecycle-transitions
npm run check
```
