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

- reads the canonical Registry, Intake, lifecycle, and product continuity
  projection through WGCF
- reconciles the OOS Registry projection against the same Workspace Governance
  revision, identities, versions, digests, posture, lineage, and last mutation
  before enabling Registry actions
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
- `WGCF_BASE_URL`
- `WGCF_CALLER_ID` (defaults to `governance-operations-console`)
- `WGCF_CALLER_SECRET`

Missing or malformed configuration remains unavailable. Live failure never
falls back to fixture data or a local mutation. `?dev=1` exposes a visibly
fixture-backed, read-only surface for interface verification only.

Runtime activation is separate from this source contract. The original OOS
Registry command adapter was admitted under ART `#1209`. The shared continuity
read path is source-complete under `#1295` and remains default-denied until
Security `#1303` and Platform `#1291` accept and commission the exact WGCF,
Console, OOS, and credential composition. This adapter grants none of those
authorities and remains fail-closed whenever either live owner is unavailable
or contradictory.

The original OOS Registry command path retains its distinct commissioning
evidence in Security `#1216`, Platform `#1217`, and operating proof `#1210`.

The detailed cross-surface read contract is
[`workspace-continuity-live-integration.md`](workspace-continuity-live-integration.md).

## Operator Flow

1. Open `Workspace Registry` from Console navigation.
2. Inspect active records or filter entrants in `Eligible`.
3. Inspect `Original Inventory requests` first. Reopen any pending original;
   a missing, offline or invalid journal never enables a new review.
   Otherwise review candidate identity, ownership, approvals and bound source.
4. Request a current OOS preparation.
5. Apply the promotion only against that reviewed preparation.
6. Continue durable progress when OOS requires it and retain the returned
   review, readback, history, and receipt evidence.
   At `review-and-merge`, use `Open Review` for the source review and the
   existing accountable-human provider review/merge path. `Check Review`
   reconciles the same original request; it is not a merge endpoint.

Lifecycle completion is deliberately stricter than request acceptance. The
Console reports a canonical change only when the exact reviewed source is
merged and OOS returns matching merged-state, readback, receipt, and immutable
history-event evidence. An accepted or in-progress request remains pending.

For an active inventory record:

1. Open `Manage Lifecycle` from the selected record.
2. Inspect its original requests. Reopening reads the exact retained ID only;
   it does not prepare a replacement or advance execution. With no pending
   original, explicitly select `Prepare a New Lifecycle Action`, then choose
   only an action allowed by posture: update, suspend, restore or retire.
3. Record the reason, approval reference, acknowledged impact, and complete
   validated record value when updating metadata.
4. Review the exact current and expected posture plus authority revision.
5. Apply through OOS, then inspect or continue the durable result until review,
   canonical readback, and history evidence are complete.

Suspension and retirement preserve identity and history. Restoration is a new
reviewed action bound to the latest suspension or retirement event. No Console
action performs hard deletion.

## Cold Recovery And Uncertain Acknowledgement

- Both request families list caller-bound original locators for the exact
  selected kind/name through OOS, with at most25 rows/32KiB per page. The
  displayed pending count covers every page; use `More original requests`
  to find an older original. `Refresh original requests` returns to page1.
- Discovery, pagination, reopening and `Refresh Original Request` are GET-only.
  They do not create, prepare, continue or cancel anything. Original IDs are
  opaque owner locators, including earlier non-Console prefixes; family and
  caller authorization stay with OOS. New submissions keep their namespace.
- Closing a dialog or restarting the browser does not lose workflow authority:
  reopen its original journal. A lost POST acknowledgement returns to the
  result/recovery surface and refreshes discovery instead of silently issuing
  another command. Explicit continuation or cancellation always uses that ID.
- An acknowledged result cannot navigate back to editing/applying its command.
  A terminal correction requires a fresh journal with no pending request and
  an explicit new preparation/review. The Console server repeats the pending
  check before new submission; generic OOS replay and concurrency semantics
  are unchanged. This is not a global single-request authority or lock.
- Once the entrant leaves `Eligible`, the canonical record's
  `View Promotion Requests` still reaches its promotion history. This history
  surface cannot fabricate a new entrant or promotion preparation.
- Offline, malformed, cross-target/family or stale-source responses remain
  unavailable. They never become empty successful history or a fixture write.

The isolated browser check `node --experimental-strip-types
scripts/verify-registry-request-recovery-browser.mjs` uses a separate loopback
test instance (default3318, never the operator port3317). It covers original
review/continuation, reload, uncertain cancellation, both recovery families,
off-page pending state and offline/corrupt denial using synthetic intercepted
APIs. This is component/browser conformance, not real owner mutation, runtime
commissioning, product acceptance or final-journey evidence.

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
