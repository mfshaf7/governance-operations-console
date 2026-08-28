# Delivery Execution Work Sessions

## Purpose

This is the primary Console instruction surface for starting and continuing a
governed Delivery work session from Execution Board. The board keeps its
approved package and action presentation; the `Start Work` action switches to
authoritative OOS state only when live integration is configured.

OOS owns session semantics, exact next action, revisions, source observations,
command outcomes, and receipts. The Console owns operator interaction,
same-origin routing, decision entry, strict response validation, and bounded
presentation. The browser does not read Git, call OpenProject, hold OOS
credentials, or derive progress and completion.

## Runtime Modes

- `disconnected-preview`: `OOS_BASE_URL` is absent. The established structured
  fixture action and visibly prototype-local receipt remain available.
- `live`: OOS is configured. `Start Work` reads the authoritative target work
  item session and never falls back to a local success when OOS is unavailable,
  rejects the command, or returns malformed truth.

The source adapter can land while inactive. Mutable `dev-integration`
activation remains gated by the exact-head Security review and composed
positive and negative proof in the owning Delivery ART.

## Server Configuration

Provide these values through the local or Platform-owned runtime environment.
Do not expose them through `NEXT_PUBLIC_*` variables or commit concrete values.

| Variable | Required in live mode | Purpose |
| --- | --- | --- |
| `OOS_BASE_URL` | yes | OOS HTTP endpoint visible to the Console server. |
| `OOS_CALLER_SECRET` | yes | Caller-specific secret for the Console application identity. |
| `GOVERNANCE_CONSOLE_OPERATOR_ID` | yes | Separately attributed accountable operator identity used by the OOS session. |
| `OOS_CALLER_ID` | yes | Console application caller identity; defaults to `governance-operations-console`. |

The browser calls only same-origin
`/api/delivery/execution/{workItemId}/work-session` routes. The server assembles
credentials and the server-owned operator header. The application caller and
accountable operator are distinct bindings; neither is supplied by the browser.
Work-session reads use a bounded 45-second server timeout. Start and continue
commands use 75 seconds because the local ART backend may perform two sequential
authoritative reads; other OOS Console calls retain their shorter timeout.

## Operator Flow

1. Select a Delivery package whose structured action intent identifies an
   executable OpenProject work item.
2. Open `Start Work`.
3. In disconnected preview, use the established local action flow. In live
   mode, wait for the OOS work-session projection.
4. If no session exists, choose `Prepare Session`. OOS returns the
   caller-bound Landing Unit decision draft.
5. Review the Landing Unit model, identity, branch, split reason, rollback
   boundary, and architecture packet decision. The Console sends only these
   bounded operator inputs; the server retains OOS-owned work item, covered
   items, human gates, base ref, and operator identity from a fresh
   caller-bound draft requested when the accepted decision is submitted.
6. Choose `Start Work Session`. OOS validates the exact decision and returns
   the next projection and immutable command receipt.
7. Choose `Continue Work Session` only for the next OOS-projected transition.
   OOS remains responsible for deciding whether that transition can run.
8. If OOS reports an explicit rejection, correct the input and issue a new
   operator action. If the network outcome is unknown, retry retains the same
   command identity so OOS can replay the retained result safely.

## Source Landing Order

Keep the Landing Unit pull request open until OOS reports that its exact head
has a durable merge-ready Review Packet. Merge only after that gate passes,
then continue the same work session to bind the real merge commit and finalize
operating evidence.

If a runtime interruption prevents packet authoring and the source lands
first, recover through a truthful follow-up change in the same Landing Unit.
Do not relabel merged pull-request work as a direct land or bypass OOS
completion evidence.

Evidence produced for an earlier source revision must be rerun or explicitly
re-authored for the follow-up head before OOS can generate a replacement
Review Packet.

Closeout and in-flight plan adaptation are separate Delivery ART fronts. This
adapter does not add those controls prematurely.

## Current Boundary

Implemented in source:

- structured execution-target work-item identity
- strict work-session projection, decision, source, and receipt validation
- same-origin read, start, and continue routes
- caller/operator binding and server-only credentials
- stable retry identities and exact session revisions
- explicit disconnected preview and configured fail-closed behavior
- Execution Board interaction without direct browser source authority

Still separate from the work-session adapter:

- admitted source-executor activation and allowlisted source roots
- composed positive and negative `dev-integration` proof
- authenticated human identity beyond configured local attribution
- in-flight change control, documented in
  `delivery-change-control-live-integration.md`, plus closeout and terminal
  cleanup
- stage, production, release, and Portfolio authority

## Validation

Run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/operation-runtime/delivery-work-session-live-adapter.test.mjs
npm run architecture:delivery
npm run check
```
