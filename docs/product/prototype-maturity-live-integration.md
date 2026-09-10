# Prototype Maturity Live Integration

## Purpose

This is the primary Console instruction surface for Candidate Promotion and
Baseline Promotion after a Prototype has landed in Workspace Prototype Studio.

The Console collects and reviews operator input. OOS owns durable progression,
decision binding, review waits, recovery, and terminal receipts. WGCF owns
readiness and Prototype Studio remains canonical source authority. Neither
promotion grants Delivery, runtime, Security, source-custody, or publication
authority.

## Server Configuration

Configure only the Console server. Never expose these values through
`NEXT_PUBLIC_*` or browser fields.

| Variable | Required | Purpose |
| --- | --- | --- |
| `OOS_BASE_URL` | yes | OOS endpoint visible to the Console server. |
| `OOS_CALLER_SECRET` | yes | Server-only OOS caller credential. |
| `OOS_CALLER_ID` | no | Caller identity; defaults to `governance-operations-console`. |

The browser calls same-origin `/api/prototypes/maturity` routes. The server
re-reads exact Studio preparation before submission and constructs the
digest-bound request, transition packet, caller attribution, session, and
execution references.

## Operator Procedure

1. Complete the existing Candidate or Baseline wizard and review its decision.
2. Apply the decision. The Console reads current Studio authority, submits one
   stable request identity, obtains WGCF readiness through OOS, and binds the
   reviewed decision.
3. For a promotion, review and merge the exact returned Prototype Studio pull
   request. OOS never merges or writes `main` directly.
4. Apply or continue again after merge. OOS verifies checks, human review,
   merge ancestry, and byte-identical Studio readback.
5. The Console changes lifecycle only when the terminal receipt and merged
   readback agree. Candidate success points to Baseline Promotion; Baseline
   success points to Movement Request.

A block requires a visible issue, owner, and required fix. Block and closeout
decisions preserve source lifecycle. Closeout records route intent only; the
separate closeout workflow owns retirement. Read never advances a request and
cancel never fabricates completion evidence.

## Failure Behavior

- Changed Studio revision or record digest invalidates the reviewed preparation.
- Blocked, stale, or expired readiness does not permit a decision or source write.
- Review-required is pending workflow state, not success.
- Malformed or mismatched request, packet, review, readback, or receipt evidence
  is rejected before projection.
- Configured OOS failures fail closed and cannot produce a local success.
- Only `prototype_maturity_live_mode_required` permits the disconnected fixture
  path used by local design preview. Fixture receipts remain `prototype-local`.

## Activation Boundary

The Console integration implements the projection client only. The synchronized
OOS manifest keeps Prototype Maturity runtime activation false until its
separate Security, conformance, Platform, and activation gates are complete.
This change grants no stage, production, provider, or source-merge authority.

## Validation

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/operation-runtime/prototype-maturity-live-adapter.test.mjs
npm run check
```
