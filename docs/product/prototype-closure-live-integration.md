# Prototype Closure Console Integration

The Console reads Prototype Studio lifecycle and Closure history through the
server-only OOS Prototype Closure adapter. It does not mutate Studio source,
merge Closure changes, decide Security acceptance, or revoke Platform runtime.

## Authority Boundary

- Browser requests go to `/api/prototypes/closures/*`. The server holds
  `OOS_BASE_URL`, `OOS_CALLER_ID`, and `OOS_CALLER_SECRET`; none are sent to the
  browser or stored in fixture data.
- Preparation comes from the committed Studio registry at an exact revision and
  record digest. The Console re-prepares before submitting an action and rejects
  stale review state.
- The server creates the OOS request with its configured caller identity. It
  never accepts a browser-supplied operator identity.
- The four admitted actions are `apply-delivery`, `graduate-source`,
  `retire-incubation`, and `reopen-incubation`. Each requires its own evidence
  references. References must resolve through the relevant owner; text entered
  in the Console is not proof of acceptance.
- Submission creates an in-flight OOS request, not a completed lifecycle
  change. Approval, source review and merge, Studio readback, Platform runtime
  disposition where applicable, and a terminal receipt remain distinct.
- History lists committed Studio Closure events. Selecting an event reads its
  OOS request and receipt. Fixture receipts are explicitly local preview data
  when the live adapter is unavailable.

## Recovery

The browser stores only the last request identifier per Prototype through the
operation draft store. On reopening the surface, it re-reads that identifier from OOS. The
identifier is a recovery pointer, not durable state or evidence. A missing OOS
request clears the pointer; OOS unavailability leaves the pointer for retry.
Resubmission with unchanged inputs reuses the same in-memory request identity
within an active browser session. A successful Closure is recognized only from OOS
`succeeded` state with a reviewed Studio readback and completed terminal
receipt.

## Current Limits

Without the server OOS configuration, Closure is read-only and reports a
disconnected local preview. Source-backed fixtures that do not correspond to a
current Studio Prototype record cannot be submitted as real Closure work.
Runtime activation and governed environment changes remain outside this
Console integration until their separate Platform and Security gates complete.
