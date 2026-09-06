# Workspace Registry Live Integration

## Boundary

Workspace Registry is the Console control surface for canonical active
Workspace Inventory, approved entrants eligible for promotion, and reviewed
metadata or posture changes to existing records. It is a dedicated
cross-console workspace, not an Operation Workbench domain and not a
replacement for Workspace Governance authority.

The browser calls only same-origin `/api/workspace-registry/*` routes. It does
not receive OOS credentials, read Git or Workspace Governance contracts, build
canonical commands, or mutate inventory directly.

The Console server:

- reads the canonical registry projection through OOS
- requests a current promotion preparation for the selected entrant
- requests current inventory and append-only history bindings for lifecycle work
- re-reads registry and preparation before submission
- rejects changed authority revisions, projection digests, candidate or record
  digests, versions, posture, or expected state
- constructs digest-bound promotion and lifecycle commands with admitted caller
  identity
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

Runtime activation is separate from this source contract. It requires the
admitted OOS service, Workspace Governance provider identity, Platform, and
Security evidence. This adapter grants none of those authorities and remains
fail-closed whenever they are unavailable.

## Operator Flow

1. Open `Workspace Registry` from Console navigation.
2. Inspect active records or filter entrants in `Eligible`.
3. Review candidate identity, ownership, approvals, and digest-bound source.
4. Request a current OOS preparation.
5. Apply the promotion only against that reviewed preparation.
6. Continue durable progress when OOS requires it and retain the returned
   review, readback, history, and receipt evidence.

For an active inventory record:

1. Open `Manage Lifecycle` from the selected record.
2. Choose only an action allowed by the current posture: update, suspend,
   restore, or retire.
3. Record the reason, approval reference, acknowledged impact, and complete
   validated record value when updating metadata.
4. Review the exact current and expected posture plus authority revision.
5. Apply through OOS, then inspect or continue the durable result until review,
   canonical readback, and history evidence are complete.

Suspension and retirement preserve identity and history. Restoration is a new
reviewed action bound to the latest suspension or retirement event. No Console
action performs hard deletion.

## Completion Truth

Acknowledgement, a prepared branch, or an open review is not canonical
mutation. Completion requires `succeeded`, `canonical_mutation: true`, merged
authority readback, and a `workspace-inventory-promotion-receipt` in phase
`merged-authority`.

Lifecycle acknowledgement or a review-branch preparation receipt is also not
canonical mutation. Lifecycle completion requires `succeeded`,
`canonical_mutation: true`, a merged human-reviewed Workspace Governance pull
request, matching lifecycle readback and merged state, and the immutable
canonical history event reference returned by OOS.
