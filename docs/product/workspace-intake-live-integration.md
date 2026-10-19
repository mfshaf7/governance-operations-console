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
fixture-backed write path. The Console source adapter is reviewed under ART `#1209`;
routine live use remains blocked until Security `#1216` accepts the
exact merged Console and OOS revisions, Platform `#1217` activates their
bounded composition, and operating proof `#1210` succeeds.

## Operator Flow

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
