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
| `GOVERNANCE_CONSOLE_OPERATOR_ID` | yes | Verified same-origin Console session principal used to authorize browser mutations. |
| `OOS_CALLER_ID` | no | Defaults to `governance-operations-console`. |
| `GOVERNANCE_CONSOLE_OPERATOR_HANDLE` | no | Optional bounded display handle sent with operator attribution. |

The browser calls only same-origin `/api/proposals` routes. Caller credentials,
authority declarations, and operator attribution are assembled server-side.
The verified Console session principal authorizes the same-origin mutation,
while the OOS Proposal command records the authenticated `OOS_CALLER_ID` as its
machine operator. The Console must not serialize the human session principal or
display handle as OOS Proposal command attribution while the OOS Proposal
contract requires caller/operator equality.

## Live Behavior

### Prototype incubation source home

Prototype Disposition offers **Prototype Studio**, **Existing Repo** and **New
Repo**. Studio is the recommended home for an uncertain idea: use its existing
repository for experimental source without creating a separate project repository.
Selecting Prototype from an empty/no-repository draft selects Studio; explicit
existing/new choices are preserved. Only operator submission records the decision.

Resolve Studio from current active Inventory, using canonical ref
`repo://workspace-prototype-studio` and its actual label. Stale, missing or
unavailable Inventory retains the draft but blocks recording, with refresh
guidance. Configured live mode never borrows a synthetic catalogue. Studio's
repository visibility applies to stored source.

Emit the unchanged `existing-repo` / `existing` / `resolved` custody shape.
No new repository request, source permission or non-source claim is created.
Handoff continues the same reviewed target application; capture still precedes
Landing. Landing prepares the Studio folder and separately accepts setup. A
later product repository/source graduation remains a separate decision.

Delivery retains **Not Required** for genuine non-source work. Prototype does
not offer a new editable no-repository decision; its target requires a resolved
source home. Historical decisions remain inspectable without rewriting and
cannot authorize a new unsupported handoff. Only new-repository requests expose
the request-specific Repository Control action. Existing selections proceed to
handoff review.

For a current accepted Prototype decision recorded without a source home, use
**Open source-home decision** in Handoff, then **Change source home**. This starts
an explicit unrecorded draft through the existing Disposition command, retaining
the original history. The outcome remains accepted and the route remains
Prototype. Review the prefilled change note, select the actual source home and
explain the choice before recording. The normal source version, pending/draft guards and
interrupted-command identity still apply. Completed/applied, stale or unrelated
decisions cannot use this correction. Opening/editing the draft does not change
canonical state or restart the source workflow; recording creates the new
versioned decision and resets handoff preparation under existing owner rules.
A no-repository decision does not project a fabricated repository-request reference.

### Source and target commands

1. The register reads `GET /v1/proposals/register`: at most 25 matching summaries
   per response, scanning at most four native 25-record collection pages. Search
   and status/source filters apply across the source backlog through continuation,
   not just the visible page. A sparse search can return no matches and a
   **Continue search** action. It is a bounded scan, not an indexed search.
2. **Previous** and **Next page** replace the visible register page. Overview
   counts describe that page; the separate backlog count is the source total,
   not a filtered-match total. Continuation is bound to the exact normalized
   search/filter selection. Changed source totals or continuation anchors require
   **Refresh first page** rather than silently combining an inconsistent list.
3. Only the selected Proposal opens its exact source snapshot and first history
   page. Register summaries explicitly carry `summaryOnly: true`; their empty
   history is an unloaded placeholder, not proof that no events exist. A summary
   cannot authorize a submission. Required moves can load an older selected record
   independently of the register page. Opening the Hub waits for verified details
   or offers **Retry details**. The current selection stays separate from page counts.
4. Register and selected source refresh immediately on open and every 15 seconds
   while visible. A page in flight suppresses the timer refresh; obsolete selection
   responses cannot replace newer ones. Transient refresh failure retains the last
   verified rows as stale/read-only with their original observation time. Identity
   denial clears retained data, including detail/history reads. No configured
   failure falls back to preview fixtures.
5. Capture first looks up the original Console source identity through the existing
   `/v1/ideas/lookup` route. An identical saved capture is reused. A failed precheck
   reports that nothing was sent. After an unconfirmed creation response, retain
   title, context and request ID and use **Check capture result**. Only an explicit
   not-found result offers **Retry original capture**, with identical intent.
   The source lookup does not claim global exactly-once creation under concurrency.
6. Triage, Disposition, and Handoff send deterministic idempotent command IDs,
   expected record version, and current source status to OOS.
7. A conflict refreshes source truth. The local draft remains available for
   operator review but cannot silently overwrite the newer record.
8. Applying a Delivery handoff prepares the canonical packet when needed, then
   submits that packet through OOS's Delivery application route with one stable
   application identity.
9. The Console reports Delivery handoff completion only after OOS returns the
   target record and application receipt. A failed application refreshes the
   canonical blocked state and remains retryable with the same identity.
10. An accepted Prototype route remains actionable while its handoff is merely
   `ready`; Console no longer treats packet preparation as target application.
11. The operator starts the Prototype target application from the existing
    Handoff panel. The server re-reads the current Proposal, requires resolved
    repository custody, reads the exact Prototype Studio preparation through
    OOS, and constructs the caller-, session-, execution-, and replay-bound
    command without accepting those authority fields from the browser.
12. OOS opens the deterministic `workspace-prototype-studio` review and returns
    `review-required`. Console displays its exact repository, review number,
    and head, then uses the same application identity for reconciliation or
    cancellation.
13. Console records Handoff as applied only after OOS verifies the
    human-reviewed merge, Studio readback and receipt, and the canonical
    Proposal acknowledgement. Incomplete or malformed success evidence fails
    closed without a local receipt.

Runtime availability requires current exact composed Security acceptance and
Platform commissioning; source/UI proof alone does not activate the path.
Architecture authority remains `architecture-packet:delivery-1203-v1`. The
incubation choice reuses this boundary without a new credential, approval
authority or runtime service.

## Local Validation

### Completed Proposal inspection

A current completed source stays complete in the register, Hub, next action and
workflow navigation. Its recorded steps are read-only. Unfinished local drafts
cannot reopen it, and missing historical route or handoff details are shown as
not recorded rather than as new work. History remains available. A stale or
unavailable source still requires a source refresh before further decisions.

Existing `delivery_ref` links from earlier consumption are preserved even when
modern route/handoff receipts are absent. A bounded exact-ID metadata read supplies linked Delivery outcomes for the
native Proposal candidate page, without loading the global Delivery overview or
archived child trees. Done Delivery with an accepted Proposal is labelled as source
closeout pending; retired Delivery stays distinct from implementation. An
unavailable outcome does not erase the recorded link or invite duplicate routing.
The Proposal source status and version stay unchanged; source closeout remains
an independently governed owner operation.

Run:

```bash
python3 scripts/validate_repository.py
npm run check
npm audit --omit=dev
```

The integration can be exercised against the admitted `dev-integration` OOS
profile after Platform and Security supply runtime configuration. Do not use a
direct OpenProject endpoint as a substitute.

## Forms, submission feedback and original history

Triage summary, Decision notes, Route rationale and Handoff notes retain entered
text, display the existing 2,000-character command limit, and disable both the
in-panel and footer submission actions until valid. Advisor draft limits match
that same contract. No field is silently shortened. Handoff readiness describes
an unsubmitted draft until an actual owner receipt is recorded. Live and local
preview processing labels differ, and the implementation repository shows its
actual reference rather than its responsible component.

Submitting an ordinary workflow command opens a shared pending dialog, blocks
repeat clicks/closing while in flight, and gives a readable result or error.
The draft survives an unconfirmed response. Existing deterministic command IDs,
source-version conflicts and approval/target gates remain authoritative.

History follows `next_cursor` through **Load more history**, with retry on a
failed page. It includes repository confirmations, implementation reconciliation
and target failures with original dates, actors and receipt references. New
disposition events retain their accepted decision payload. Legacy events use
their original summary; current notes or route never substitute for an older
record. Creation is shown only when the source supplied its actual date. A
changed source version or conflicting original event stops page combination.
Technical references stay available through the shared disclosure pattern.

The preview browser suite uses isolated synthetic API responses for delayed,
failed, denied and interrupted paths. It does not create real Proposals or assert
live activation. Operator preview review precedes publication; exact composed
runtime acceptance and authenticated live readback remain the publication gate.
