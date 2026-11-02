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
fixture-backed, read-only surface for interface verification only. Its Intake
forms can be inspected with local drafts, but request reads, candidate review
and classification submission remain disabled.

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
3. Open `Review Promotion`. The Console checks original requests first and
   automatically reads the current source when no request is pending. An
   unavailable or invalid journal blocks a new request. Open any pending original
   instead; reading history never prepares or advances it.
4. Review identity, owners, the approved record and source details together.
   Select `Add to Registry` once to submit against the reviewed preparation.
   `Refresh source` retries a failed source read; it never submits a promotion.
5. Inspect the recorded outcome and continue only when its next action requires
   it. `Open Review` opens the source review; the existing accountable-human
   provider path owns review and merge. `Check Review` reconciles the same
   original request and is not a merge endpoint.

Lifecycle completion is deliberately stricter than request acceptance. The
Console reports a canonical change only when the exact reviewed source is
merged and OOS returns matching merged-state, readback, receipt, and immutable
history-event evidence. An accepted or in-progress request remains pending.

For an active inventory record:

1. Open `Manage Lifecycle` from the selected record.
2. The Console checks request history and automatically reads the current
   record when no request is pending. Open pending originals by their retained
   IDs; this never prepares a replacement. `Refresh record` explicitly retries a
   source read, with a discard guard if edits exist.
3. Choose an allowed action and supply its reason and exact approval reference.
   Suspend, restore and retire use one form with current/expected status, impact
   confirmation and a single final action. Metadata changes use one ordinary form and a separate confirmation dialog:
   labelled fields cover common properties, and `Edit complete record` preserves
   access to every owner field. Unchanged
   values remain intact and the managed envelope stays excluded.
4. Inspect or continue the original outcome until source review, merged readback,
   receipt and history evidence are complete. No stepper labels an unperformed
   review or mutation as complete.

Suspension and retirement preserve identity and history. Restoration is a new
reviewed action bound to the latest suspension or retirement event. No Console
action performs hard deletion.

## Preview maintenance: current records and readable evidence

The pending UI batch retains this owner path and the existing Teras workspace.
Registry refreshes both owner projections together on entry, on explicit
**Refresh Registry**, and every fifteen seconds while visible with no child
workflow open. A failed or contradictory refresh keeps the last reconciled
inventory visibly **Retained**, disables new Intake/lifecycle/promotion entry,
and leaves original-request inspection available. Unknown totals show an em dash;
retained totals describe the retained snapshot. No new freshness authority or
business cache is introduced. Exact source revision, digest and owner projection
time remain in **Record details**.

The register keeps Record/type, Owners and Status readable together. The selected
record and lineage use the existing scrolling stack; full source, record,
projection and mutation references stay available in technical details.
Mutation events and request locators are not labelled as terminal receipts.

Preparing a lifecycle action refreshes and reconciles both Registry owners first.
Lifecycle action availability, subject version, current posture and expected
posture all use the same freshly prepared record. A preparation that differs
from that Registry snapshot cannot be submitted; refresh against
matching owner source. A changed preparation resets
impact/review confirmation and returns to configuration. Metadata editing
preserves posture and the managed envelope remains excluded. The guided Intake form collects current owner validation metadata through that
existing preparation-read route. It never submits a lifecycle action to collect
facts. User intent stays separate from the automatically attached source context;
see [Workspace Intake](workspace-intake-live-integration.md#guided-registration-and-automatic-context-collection-preview).
Draft exit or replacement requires explicit discard; Keep Editing retains input, and pending
requests cannot be dismissed through these controls.

Promotion history starts with **Choose a request**, not completed
Review/Apply stages. Reopened requests use their recorded outcome; no preparation
is requested merely to inspect history. A terminal outcome without a receipt
says **No receipt issued**, rather than implying another step is pending.
These changes are preview evidence, not a new live commissioning claim.

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

## Ordinary forms and separate feedback dialogs in the pending UI batch

Registry actions reuse the clean Workspace Intake form pattern: standard width,
content height, one scrolling body, grouped fields and footer actions. They do
not use the wizard shell, selected-item banner, support rail or step navigation.
Promotion reviews the approved item directly; metadata editing opens a separate
confirmation dialog only when needed. Direct classification uses the same
ordinary dialog composition while retaining normalized metadata and explicit
acceptance. Changing classification clears acceptance, including Out of scope
normalization; returning to details preserves the authored draft. Other source-domain classification entry points retain their existing workflow.

Submission opens a separate result dialog. Accepted requests say submitted;
completed labels require a succeeded owner outcome. Source review, pending work,
failures, cancellation and unavailable outcomes retain their actual state.
Original opaque request IDs, pagination, pending totals, recovery, cancellation
and continuation stay bound to the existing owner journal. Request history is a
secondary inspection action and opens automatically when pending requests or
journal errors need attention. Exact source, receipt and event details remain
inspectable. The shared wizard primitive is unchanged.

These are operator-review preview changes in the same maintenance Landing Unit.
The Console server and OOS authority checks are unchanged. Verification submits
no real classification, promotion or lifecycle business command; an isolated
synthetic acknowledgement test proves the separate submitted-state dialog.
