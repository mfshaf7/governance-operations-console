# Work Design Live Integration

## Purpose

This is the primary Console instruction surface for OOS-backed Delivery Work
Design advice, source projection, apply, and durable receipt readback. The
existing Work Design workflow and visual structure remain unchanged.

OOS owns source revision, bounded AI-advice admission, canonical application,
reconciliation, and durable receipts. The Console owns operator interaction,
draft presentation, same-origin routing, and strict response validation.

## Runtime Modes

The server configuration selects one explicit mode:

- `disconnected-preview`: `OOS_BASE_URL` is absent. Existing fixture advice,
  local apply behavior, and visibly local receipts remain available.
- `live`: OOS is configured. Work Design reads canonical projection and sends
  advice and apply commands only through OOS. A configured failure is shown as
  unavailable and never falls back to fixture behavior.

## Server Configuration

Provide these values through the local or platform-owned runtime environment.
Do not expose them through `NEXT_PUBLIC_*` variables or commit concrete values.

| Variable | Required in live mode | Purpose |
| --- | --- | --- |
| `OOS_BASE_URL` | yes | OOS HTTP endpoint visible to the Console server. |
| `OOS_CALLER_SECRET` | yes | Caller-authentication secret delivered by the runtime owner. |
| `GOVERNANCE_CONSOLE_OPERATOR_ID` | yes | Stable operator attribution until authenticated Console identity is admitted. |
| `OOS_CALLER_ID` | no | Defaults to `governance-operations-console`. |
| `GOVERNANCE_CONSOLE_OPERATOR_HANDLE` | no | Optional bounded display handle. |

The browser calls only same-origin
`/api/delivery/work-design/{packageRef}` routes. Credentials and operator
attribution are assembled server-side.

## Live Behavior

1. Work Design derives one stable package identity from the selected Delivery
   record and reads its OOS projection before a canonical command.
2. Context and tree advice bind to the projected source revision. OOS returns
   bounded advice plus CGG and model-profile evidence for operator review.
3. The Console keeps accepted advisor evidence with the draft and supplies it
   to Apply without granting the model mutation authority.
4. Apply uses one stable acceptance identity and accepted time for same-session
   retries. The exact normalized tree produces the accepted-draft digest.
5. `apply-pending` blocks a second mutation while OOS reconciles. An already
   applied projection returns the durable application receipt without replaying
   the mutation.
6. Only a validated OOS apply result with matching draft digest, operator,
   target readback, and durable receipt is shown as applied.
7. A live apply records that receipt in the current Work Design session. It
   does not fabricate or project a fixture Refinement package as canonical
   backend state.
8. Advice or apply rejection refreshes source truth. A successful apply remains
   successful if only its follow-up projection refresh is temporarily
   unavailable because the returned receipt already proves the mutation.

## Current Boundary

Implemented:

- server-only OOS authentication and operator attribution
- strict source, advice, application, and receipt validation
- same-origin projection, advice, and apply routes
- version-bound advice and stable apply acceptance
- explicit disconnected preview and configured fail-closed behavior
- durable receipt readback across restart through OOS

Still separate:

- a canonical live Delivery package and register projection
- live Intake, Execution, and closeout adapters
- authenticated human identity beyond configured operator attribution
- platform deployment and security acceptance

## Validation

Run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/operation-runtime/work-design-live-adapter.test.mjs
npm run architecture:delivery
npm run check
```
