# Delivery Closeout Live Integration

## Purpose

This is the primary Console instruction surface for terminal Delivery
closeout. The Execution Board keeps its selected-package entry and opens a
dedicated evidence, review, and result wizard. OOS owns canonical readiness,
source revision, accepted intent, close mutation, durable outcome history,
receipt, replay, partial failure, reconciliation, and exact next action.

The Console owns operator interaction, bounded evidence and impact entry,
explicit review, same-origin routing, strict response validation, and outcome
presentation. The browser does not hold OOS credentials, construct accountable
operator identity, call OpenProject, derive readiness, close the initiative
directly, or fabricate completion or outcome history.

## Runtime Modes

- `disconnected-preview`: `OOS_BASE_URL` is absent. `Open Closeout` retains the
  established structured local simulator and visibly local receipt.
- `live`: OOS is configured. `Open Closeout` uses the dedicated canonical
  wizard. An unavailable, malformed, stale, rejected, or partial response never
  falls back to local completion.

## Server Configuration

Use the same Platform-owned server environment as other Delivery OOS adapters.
Never expose these values through `NEXT_PUBLIC_*` variables or commit concrete
values.

| Variable | Required in live mode | Purpose |
| --- | --- | --- |
| `OOS_BASE_URL` | yes | OOS endpoint visible to the Console server. |
| `OOS_CALLER_SECRET` | yes | Caller credential for the Console application. |
| `GOVERNANCE_CONSOLE_OPERATOR_ID` | yes | Accountable operator identity recorded by the server. |
| `GOVERNANCE_CONSOLE_OPERATOR_HANDLE` | no | Optional operator display handle. |
| `OOS_CALLER_ID` | no | Console caller identity; defaults to `governance-operations-console`. |

The browser uses only same-origin
`/api/delivery/execution/{deliveryId}/closeout` routes. The Console server adds
caller credentials and constructs the operator and acceptance records.

## Operator Flow

1. Select a closeout-eligible Delivery package and choose `Open Closeout`.
2. Wait for the current OOS projection. If canonical truth is unavailable, do
   not continue locally; use the returned next action.
3. Record completion, changed surfaces, tests, validation, demonstration, and
   inspection evidence. Existing readiness evidence refs remain source-owned.
4. Choose the outcome impact: none, a typed Workspace Intake candidate, or an
   existing-product change. This classifies the handoff; it does not claim
   downstream acceptance or mutation.
5. Review canonical readiness, the exact source revision, impact, and evidence.
   Add the acceptance note and apply once.
6. Inspect the terminal result, durable receipt, package-scoped outcome history,
   replay marker, and exact next action returned by OOS.

## Failure And Retry

- `not_ready`: resolve the OOS readiness reasons before applying.
- stale source: refresh, inspect the new revision, and review again.
- `rejected`: preserve the draft and follow the returned reconciliation action.
- `partial_failure`: do not claim closeout completion; follow the exact source
  reconciliation action.
- `reconciliation_required`: inspect outcome history and repair terminal
  evidence before any new command.
- retry uses the same command identity while the reviewed operation, revision,
  and acceptance note are unchanged. OOS decides whether the result is replay.

## Validation

Run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/operation-runtime/delivery-closeout-live-adapter.test.mjs
npm run architecture:delivery
npm run check
```
