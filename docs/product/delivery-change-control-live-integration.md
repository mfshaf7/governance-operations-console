# Delivery Change Control Live Integration

## Purpose

This is the primary Console instruction surface for adapting active Delivery
work after execution has begun. The Execution Board keeps its established
presentation while OOS owns canonical projection, mutation semantics, source
revision checks, command replay, receipts, rollback disposition, and exact next
actions.

The Console owns operator interaction, explicit review, same-origin routing,
strict response validation, and bounded presentation. The browser does not hold
OOS credentials, construct operator authority, call OpenProject, create a
repository, mutate Catalog directly, or treat a draft as canonical truth.

## Runtime Modes

- `disconnected-preview`: `OOS_BASE_URL` is absent. Existing structured
  fixtures and visibly local receipts remain available for interface testing.
- `live`: OOS is configured. Execution edit reads canonical change truth before
  editing and accepted actions use the OOS command route. An unavailable,
  malformed, stale, rejected, or partial result never falls back to a local
  mutation receipt.

## Server Configuration

Provide these values through the Platform-owned runtime environment. Never use
`NEXT_PUBLIC_*` variables or commit concrete values.

| Variable | Required in live mode | Purpose |
| --- | --- | --- |
| `OOS_BASE_URL` | yes | OOS endpoint visible to the Console server. |
| `OOS_CALLER_SECRET` | yes | Caller credential for the Console application. |
| `GOVERNANCE_CONSOLE_OPERATOR_ID` | yes | Accountable operator identity recorded in accepted commands. |
| `GOVERNANCE_CONSOLE_OPERATOR_HANDLE` | no | Optional operator display handle. |
| `OOS_CALLER_ID` | no | Console caller identity; defaults to `governance-operations-console`. |

The browser uses only same-origin
`/api/delivery/execution/{deliveryId}/change-control` routes. The Console server
adds caller credentials and constructs the operator and acceptance records.

## Execution Edit Flow

1. Select an active Delivery package and choose `Edit Work`.
2. In live mode, wait for the current OOS projection. A failed read leaves edit
   unavailable and shows the OOS next action.
3. Edit the projected tree. Existing items produce bounded revision commands;
   new items produce parent-first add commands.
4. `Done Editing` opens explicit review when the draft changed. Record the
   acceptance note before applying.
5. The Console submits one command at a time. OOS validates the exact source
   revision, returns a terminal result, and the Console refreshes canonical
   truth before preparing the next command.
6. A conflict, rejection, partial failure, malformed result, or unknown outcome
   stops the sequence. Keep the draft, follow the exact next action, refresh,
   and review again.
7. Discarding a dirty draft, leaving Delivery areas, or closing the workspace
   keeps the established confirmation guard.

## Repository Custody

- `request_repository` records a routed OOS result and points to Repository
  operation. It never creates a repository.
- Repository operation owns repository creation and admission.
- Delivery Catalog owns reviewed add, link, and sync of an admitted Owner Repo
  value.
- `link_repository` composes that Catalog mutation before the Delivery work-item
  update. A partial result stays explicit and routes to reconciliation.
- The Execution Board Owner Repo action opens Delivery Catalog; it does not
  create another repository or Catalog editor.

## Result Handling

- `applied`: refresh canonical Delivery truth and show the durable receipt.
- `routed`: open the authority named by `next_action`.
- `partial_failure`: do not claim completion; follow the reconciliation action.
- `rejected`: preserve the draft and follow the compensating-command action.
- rollback is a separately reviewed command. The initial OOS contract rejects
  automatic inversion unless an exact inverse is proven.

## Validation

Run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/operation-runtime/delivery-change-live-adapter.test.mjs
npm run architecture:delivery
npm run check
```
