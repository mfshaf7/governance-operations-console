# Workspace Intake Live Integration

## Boundary

Workspace Intake is a shared, source-embedded Console workflow. Delivery
closeout supplies typed source candidates. Registry also exposes the existing
direct product/component classification route. The browser calls only
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
fixture-backed write path. The Console source adapter is reviewed under ART `#1209`;
routine live use remains blocked until Security `#1216` accepts the
exact merged Console and OOS revisions, Platform `#1217` activates their
bounded composition, and operating proof `#1210` succeeds.

## Operator Flow

For operator-authored product or component classification, open Workspace
Registry → Workspace Intake, select the canonical key and inspect retained
requests. Reopen an acknowledged request to inspect or continue its original
Result. Reopening, refreshing and pagination only read OOS; no browser storage
or new request is used for recovery. A pending request anywhere in the exact
caller/target/direct-source journal blocks a new classification.

For a new target, explicitly select active owner repositories, record purpose,
boundary and contextual evidence, then Review direct candidate. Product
metadata includes platform/runtime/security owners, source owners and intended
endpoint. Component metadata includes owner, security owner, class and optional
existing product association. Both carry explicit validation posture, WGCF
graph role, applicable catalog references and owner evidence explanation into
Intake so the resulting record can be evaluated for Inventory promotion.
An empty catalog list is valid; no new profile or catalog is invented.
There are no guessed owners or deployment
defaults. Contextual references are retained in the exact reviewed notes;
direct source metadata is operator-authored and never a Prototype/Delivery
source-owner attestation. Continue through the shared Decision / Review /
Result dialog below. Intake and Inventory promotion remain separate actions.
An already registered target can inspect its original Intake history without
repeating admission. Registry loading, unavailable, stale or fixture modes
cannot open this mutation path.

To change a completed Proposed classification to Admitted after its required
reviews, select `Reclassify completed candidate` in that target's journal.
The source request is shown alongside the control. It reuses the selected
completed direct candidate's original source identity and recorded metadata,
checks current pending visibility, then opens a fresh Decision / Review with
current canonical preparation. It never advances or changes the completed
request. Pending requests anywhere in the journal and existing active Inventory
block this action. Rows from earlier pages retain their selected identity.
Use this route for reclassification; adding context in the new-entrant form
constructs a different origin and cannot replace an existing entrant's source.

Owner readiness findings appear with the result, including the exact code,
message and next action. Rejected requests preserve their original identity;
a correction is a separately reviewed request. Findings are bounded by the
existing response budget, validated as operator-safe diagnostic fields, and
remain separate from canonical success/receipt evidence. Native findings must
bind this request and readiness outcome; raw readiness receipts are not exposed.

1. A successful Delivery closeout that emits a Workspace entrant exposes
   `Classify Candidate`.
2. The operator chooses `admitted`, `proposed`, or `out-of-scope`.
3. The operator reviews current canonical binding and explicitly confirms it.
4. The Console submits the server-built command and projects durable progress.
5. At review-required, the operator opens the provider review. Merge is not a
   Console or OOS API action.
6. Continuing after merge proves canonical readback and the terminal receipt.

## Staged Custody-To-Intake Adapter

The owner-admission source extension supports the existing preparation route
with optional `repository_custody: { request_id, requested_record }` for a repo
target. The server forwards only this bounded context to OOS; it does not
construct custody provenance or attest as the OOS source owner. OOS derives
the exact provider binding from its retained successful custody receipt.
The optional returned `source_candidate` is typed, target-bound and digest-
verified server-side. Repository provider coordinates survive request parsing
and submission, rather than being silently discarded.

When that source candidate is reviewed, submission re-reads the same custody
preparation and compares the entire reviewed binding before constructing the
canonical command. A classification that changes requested metadata requires
fresh owner preparation and review; it cannot silently rewrite the source
candidate. Out-of-scope records retain provider identity but clear in-scope
ownership metadata. The normal OOS submission independently verifies custody
again and retains its own attestation as part of that explicit write.

Repository Control exposes `Prepare Workspace Intake` only with a successful,
matching active-provider custody result and an executable Intake capability.
Its entrant form requires explicit repository class, security-binding decision,
owner purpose, validation posture/graph role and validation explanation. It
does not select a project framework, invent CI, or let the browser supply
provider coordinates. OOS returns the actual candidate before the shared
Decision / Review / Result dialog opens. Changing classification prepares the
exact normalized record again and clears confirmation. The review shows the
provider ID, source/candidate digests and authority revision.

The entrant surface first reads its retained Intake requests from OOS. The
list is caller/target/custody-bound, newest-first, and bounded by record count
and bytes. `Reopen original request` reads that acknowledged request and shows
only its Result/progress controls; it does not prepare or submit classification.
Existing continue/cancel/review actions retain the original identity. A pending
request anywhere in the matching journal blocks a new classification, including
when it is outside the visible page. Page navigation and refresh remain reads.
There is no browser-storage authority, empty-success fallback, or restart-driven
new request. A terminal correction returns to explicit entrant preparation and
review rather than silently editing the acknowledged command.

This remains staged source. Whole-source acceptance, coherent Platform
commissioning and the real business-path witness remain required; passing
adapter/UI tests alone does not prove a completed Console route. Canonical
active-owner registration must also satisfy repo-rule and provider-aware
workspace-layout checks; this entry does not bypass those dependencies.

## Completion Truth

An accepted HTTP response means acknowledgement only. A prepared branch or
open review is not canonical mutation. Completion requires `succeeded`,
`canonical_mutation: true`, and a `merged-authority` receipt from OOS.
