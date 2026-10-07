# Proposal Live Integration

## Purpose

This is the primary operator and runtime instruction surface for the Console's
OOS-backed Proposal integration. It covers Proposal list, capture, projection,
versioned commands, Delivery handoff application, Proposal-to-Prototype target
application, history, and bounded polling.

## Runtime Modes

The Console chooses one mode from server configuration:

- `disconnected-preview`: `OOS_BASE_URL` is absent. Proposal uses synthetic
  fixtures and visibly local receipts.
- `live`: the endpoint is configured. Proposal uses only canonical OOS data.
  If OOS or its credentials are unavailable, the surface reports offline and
  disables writes; it never falls back to fixtures.

## Server Configuration

Provide these values through the local or platform-owned runtime environment.
Do not expose them through `NEXT_PUBLIC_*` variables or commit concrete values.

| Variable | Required in live mode | Purpose |
| --- | --- | --- |
| `OOS_BASE_URL` | yes | OOS HTTP endpoint visible to the Console server. |
| `OOS_CALLER_SECRET` | yes | Caller-authentication secret delivered by the runtime owner. |
| `GOVERNANCE_CONSOLE_OPERATOR_ID` | yes | Fixed operator attribution until authenticated Console identity is admitted. |
| `OOS_CALLER_ID` | no | Defaults to `governance-operations-console`. |
| `GOVERNANCE_CONSOLE_OPERATOR_HANDLE` | no | Optional bounded display handle sent with operator attribution. |

The browser calls only same-origin `/api/proposals` routes. Caller credentials,
authority declarations, and operator attribution are assembled server-side.

## Live Behavior

1. The surface lists up to 25 canonical Proposal records from OOS.
2. It reads each typed projection and bounded history before presenting it.
3. It refreshes immediately on open and every 15 seconds while the page is
   visible.
4. Capture writes through `/v1/ideas/capture`, then refreshes the canonical
   projection.
5. Triage, Disposition, and Handoff send deterministic idempotent command IDs,
   expected record version, and current source status to OOS.
6. A conflict refreshes source truth. The local draft remains available for
   operator review but cannot silently overwrite the newer record.
7. Applying a Delivery handoff prepares the canonical packet when needed, then
   submits that packet through OOS's Delivery application route with one stable
   application identity.
8. The Console reports Delivery handoff completion only after OOS returns the
   target record and application receipt. A failed application refreshes the
   canonical blocked state and remains retryable with the same identity.
9. An accepted Prototype route remains actionable while its handoff is merely
   `ready`; Console no longer treats packet preparation as target application.
10. The operator starts the Prototype target application from the existing
    Handoff panel. The server re-reads the current Proposal, requires resolved
    repository custody, reads the exact Prototype Studio preparation through
    OOS, and constructs the caller-, session-, execution-, and replay-bound
    command without accepting those authority fields from the browser.
11. OOS opens the deterministic `workspace-prototype-studio` review and returns
    `review-required`. Console displays its exact repository, review number,
    and head, then uses the same application identity for reconciliation or
    cancellation.
12. Console records Handoff as applied only after OOS verifies the
    human-reviewed merge, Studio readback and receipt, and the canonical
    Proposal acknowledgement. Incomplete or malformed success evidence fails
    closed without a local receipt.

The target-application source remains runtime-inactive until Security ART
`#1235` accepts the exact Console candidate and Platform ART `#1236` commissions
the exact OOS and Console revisions. The accepted architecture authority is
`architecture-packet:delivery-1203-v1`; this source slice does not create a new
trust boundary, activation decision, or runtime authority.

## Local Validation

Run:

```bash
python3 scripts/validate_repository.py
npm run check
npm audit --omit=dev
```

The integration can be exercised against the admitted `dev-integration` OOS
profile after Platform and Security supply runtime configuration. Do not use a
direct OpenProject endpoint as a substitute.
