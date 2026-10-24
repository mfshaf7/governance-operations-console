# Model Operations Live Integration

Status: implemented source boundary; runtime activation remains subject to the
exact Security decision and Platform composition.

## Operator Outcome

Model Operations exposes two jobs in the existing Compact Control surface.
**Models & routing** submits operator choices for admitted backend/model
registration, native effort, system defaults, per-workflow overrides and ordered
fallback. **Purpose profiles** retains the existing two-step request workflow
for purpose and permission changes. OOS coordinates both workflows; Platform
owns configuration, verification, profile source and provider credentials.
Security acceptance and runtime activation remain with their existing owners.

The runtime configuration extension is source-staged under Epic 1313.
Live availability requires the subsequent exact-source Security acceptance
and Platform commissioning. Merged Console source alone is not activation.

## Models & Routing Procedure

1. Open Model Operations, **Models & routing**. The server reads admitted
   backends, current configuration and caller-owned history through OOS.
   First registration needs no prior completed request or lifecycle receipt.
   The existing OOS connection and verified operator session are sufficient
   Console-side configuration.
2. Select and register an admitted backend. Where account sign-in is supported,
   choose **Connect account** and complete its native device challenge.
   The code is private operator metadata. Provider tokens stay in Platform
   custody and never enter Console configuration or browser storage.
3. Choose **Discover models**, select an advertised model, then **Verify &
   register model**. Discovery is metadata. Registration completes after the
   Platform verification and receipt readback.
4. Select **System default** or a workflow row. Configure an explicit model
   route, use the existing profile binding, or inherit the default for that
   workflow. Native effort choices come from registered model metadata.
   Boolean thinking values remain booleans. Unsupported combinations cannot
   be saved. The system does not rank models or impose a provider preference.
5. Add up to four explicit fallbacks in the required order. Eligible fallback
   is limited to known pre-submission unavailability/busy. Ambiguous completion,
   policy, integrity and output failures stop with owner evidence.
6. Save reviewed settings. The request retains the observed configuration
   revision. Concurrent edits require reload and review; the Console never
   silently changes the original expected revision. Dirty drafts are protected
   on scope change, view change and workspace close.
7. Inspect progress and the actual owner outcome. After a lost acknowledgement,
   check or reconcile the original request. A known effect-free failure allows
   an explicit numbered retry. Unknown completion keeps the original owner
   command. Reload recovery retains only a request reference and reads the
   authenticated owner again. Paginated history is available independently.
8. Cancellation reports only the owner's confirmed outcome. To restore saved
   settings, review a retained configuration revision and confirm restoration;
   Platform creates a new revision.

The closed same-origin adapter routes are:

- GET /api/model-operations/runtime/registry
- GET /api/model-operations/runtime/catalogue?backend_id=...
- GET and POST /api/model-operations/runtime/requests
- GET /api/model-operations/runtime/requests/{request_id}
- POST /api/model-operations/runtime/requests/{request_id}/controls

Reads and writes require the verified operator session. The browser cannot
choose owner addresses, caller credentials, roles, policy permissions or
provider secrets. Server validation binds operator, request, command and
receipt digests, accepted historical readback, native login and terminal state.
Owner failure is unavailable without fixture substitution.

Existing Work Design, Refinement, Agent Console and source-authoring consumers
accept optional, strictly task-bound effective-selection evidence. Legacy
records remain readable. Task outputs, context admission, source-policy
bindings and operator acceptance retain their existing contracts.

## Server-Only Configuration

Configure the existing OOS connection and operator/session boundary:

- `OOS_BASE_URL`
- `OOS_CALLER_ID`
- `OOS_CALLER_SECRET`
- `GOVERNANCE_CONSOLE_OPERATOR_ID`
- `GOVERNANCE_CONSOLE_SESSION_PROJECTION_PATH`

For **Purpose profiles**, also mount the exact Platform artifacts as
operator-private regular files and set:

- `GOVERNANCE_CONSOLE_MODEL_PROFILE_SOURCE_PROJECTION_PATH`
- `GOVERNANCE_CONSOLE_MODEL_PROFILE_LIFECYCLE_RECEIPT_PATH`
- `GOVERNANCE_CONSOLE_MODEL_PROFILE_MERGED_READBACK_PATH`

The three files must be owned by the Console process, mode `0600`, bounded in
size, internally digest-valid, and mutually bound to the same lifecycle result
and merged Platform revision. Selecting any part of the live configuration
selects live mode. Partial or invalid configuration fails closed and never
falls back to fixture success.

## Purpose Profile Console Path

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
