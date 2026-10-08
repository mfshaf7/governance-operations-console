# Model Operations Live Integration

Status: implemented source boundary; runtime activation remains subject to the
exact Security decision and Platform composition.

## Operator Outcome

Model Operations reads caller-owned request state from OOS and profile source
truth from Platform Engineering. A verified Console operator can submit the
existing two-step create request. The Console does not select a provider or
model, write the profile registry, fulfill a request, approve Security posture,
or activate a profile.

## Server-Only Configuration

Configure the existing OOS connection and operator/session boundary:

- `OOS_BASE_URL`
- `OOS_CALLER_ID`
- `OOS_CALLER_SECRET`
- `GOVERNANCE_CONSOLE_OPERATOR_ID`
- `GOVERNANCE_CONSOLE_SESSION_PROJECTION_PATH`

Also mount the exact Platform artifacts as operator-private regular files and
set:

- `GOVERNANCE_CONSOLE_MODEL_PROFILE_SOURCE_PROJECTION_PATH`
- `GOVERNANCE_CONSOLE_MODEL_PROFILE_LIFECYCLE_RECEIPT_PATH`
- `GOVERNANCE_CONSOLE_MODEL_PROFILE_MERGED_READBACK_PATH`

The three files must be owned by the Console process, mode `0600`, bounded in
size, internally digest-valid, and mutually bound to the same lifecycle result
and merged Platform revision. Selecting any part of the live configuration
selects live mode. Partial or invalid configuration fails closed and never
falls back to fixture success.

## Normal Console Path

1. Open Operation Workbench, then Model Operations.
2. Confirm the workspace status is `Current` and inspect the Platform-projected
   profile register.
3. Select `Request Profile`.
4. Complete `Profile Intent`. Enter caller identities as
   `caller-id=owner-repo`; provide only references and classifications, never
   credentials or provider routes.
5. Review the derived gateway, identity, audit, and Security obligations.
6. Record the operator justification and submit.
7. Inspect the OOS receipt. `submitted` means the request entered review; it
   does not mean Platform fulfillment, Security acceptance, or activation.

The browser calls only the same-origin routes:

- `GET /api/model-operations`
- `POST /api/model-operations`
- `GET /api/model-operations/operating-projection/{requestId}`

The server holds OOS credentials, adds the verified operator identity, rereads
each listed request through its canonical source envelope, validates Platform
artifacts, and returns only browser-safe projections.

## Reconciliation And Completion

The operating projection returns `complete` only when all of these agree:

- the exact OOS request is approved and its fulfillment is applied;
- the OOS item read is current, ordered, caller-owned, and receipt-bound;
- the Platform lifecycle receipt names the request and pre-apply revision;
- the merged readback binds that lifecycle receipt and merged source revision;
- the Platform source projection is byte-equivalent to the readback projection;
- the OOS fulfillment result version and receipt reference match Platform;
- `profile_lifecycle_changed` remains false in OOS;
- `console_mutation_authority` remains false.

## Failure And Recovery

- `disconnected-preview`: no live configuration was selected. Fixture-backed
  inspection remains explicit and `Request Profile` stays disabled.
- `invalid` or `offline`: restore the missing OOS binding, verified Console
  session, or exact Platform artifacts, then refresh. Do not copy credentials
  into the browser or substitute fixture evidence.
- revision conflict: reread the OOS request and review the new authoritative
  revision before retrying.
- digest, privacy, source-version, replay, or owner conflict: replace the
  mounted evidence with a newly generated authoritative artifact. Do not edit
  an evidence file in place.
- partial create/submit: reuse the same request and idempotency identities; OOS
  returns the existing request or rejects conflicting input.

## Validation

Run:

```bash
npm run architecture:model-operations
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test --test-concurrency=1 tests/model-operations/*.test.mjs
npm run typecheck
npm run build
```

The focused tests cover current projection, exact request submission, source
envelope consumption, private artifact validation, reconciliation, and
fail-closed malformed or incomplete evidence.
