# Workspace Intake Live Integration

## Boundary

Workspace Intake is a shared, source-embedded Console workflow. Delivery
closeout currently supplies the first typed candidate. The browser calls only
same-origin `/api/workspace-intake/*` routes and never receives OOS credentials,
constructs canonical authority, or calls Git, GitHub, WGCF, or Workspace
Governance directly.

The Console server:

- reads current preparation from OOS
- compares the reviewed preparation with a fresh read before submission
- constructs the v2 request and decision with the admitted caller identity
- submits, reads, continues, and cancels through OOS
- validates candidate, preparation, result, review, history, and terminal
  receipt projections before returning them to the browser

OOS owns durable progress, idempotency, readiness execution, source review,
readback, and receipts. Workspace Governance remains canonical authority.

## Configuration

The server-only adapter uses:

- `OOS_BASE_URL`
- `OOS_CALLER_ID` (defaults to `governance-operations-console`)
- `OOS_CALLER_SECRET`

Missing configuration returns an unavailable response. It never enables a
fixture-backed write path. Live use remains blocked until Security `#1066` and
Platform `#1082` approve and activate the exact source and caller identity.

## Operator Flow

1. A successful Delivery closeout that emits a Workspace entrant exposes
   `Classify Candidate`.
2. The operator chooses `admitted`, `proposed`, or `out-of-scope`.
3. The operator reviews current canonical binding and explicitly confirms it.
4. The Console submits the server-built command and projects durable progress.
5. At review-required, the operator opens the provider review. Merge is not a
   Console or OOS API action.
6. Continuing after merge proves canonical readback and the terminal receipt.

## Completion Truth

An accepted HTTP response means acknowledgement only. A prepared branch or
open review is not canonical mutation. Completion requires `succeeded`,
`canonical_mutation: true`, and a `merged-authority` receipt from OOS.
