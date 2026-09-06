# Workspace Registry Live Integration

## Boundary

Workspace Registry is the Console control surface for canonical active
Workspace Inventory and approved entrants that are eligible for promotion. It
is a dedicated cross-console workspace, not an Operation Workbench domain and
not a replacement for Workspace Governance authority.

The browser calls only same-origin `/api/workspace-registry/*` routes. It does
not receive OOS credentials, read Git or Workspace Governance contracts, build
canonical commands, or mutate inventory directly.

The Console server:

- reads the canonical registry projection through OOS
- requests a current promotion preparation for the selected entrant
- re-reads registry and preparation before submission
- rejects changed authority revisions, projection digests, candidate digests,
  or expected state
- constructs the digest-bound promotion command with admitted caller identity
- validates progress, review, history, readback, and receipt evidence

OOS owns durable execution, source review, merge reconciliation, readback, and
receipts. Workspace Governance remains canonical authority for intake and
active inventory.

## Configuration

The server-only adapter uses:

- `OOS_BASE_URL`
- `OOS_CALLER_ID` (defaults to `governance-operations-console`)
- `OOS_CALLER_SECRET`

Missing or malformed configuration remains unavailable. Live failure never
falls back to fixture data or a local mutation. `?dev=1` exposes a visibly
fixture-backed, read-only surface for interface verification only.

Live activation requires the composed registry read projection and integration
proof owned by ART `#1075`. Until then, the Console adapter is source-complete
and intentionally fail-closed in live mode.

## Operator Flow

1. Open `Workspace Registry` from Console navigation.
2. Inspect active records or filter entrants in `Eligible`.
3. Review candidate identity, ownership, approvals, and digest-bound source.
4. Request a current OOS preparation.
5. Apply the promotion only against that reviewed preparation.
6. Continue durable progress when OOS requires it and retain the returned
   review, readback, history, and receipt evidence.

## Completion Truth

Acknowledgement, a prepared branch, or an open review is not canonical
mutation. Completion requires `succeeded`, `canonical_mutation: true`, merged
authority readback, and a `workspace-inventory-promotion-receipt` in phase
`merged-authority`.
