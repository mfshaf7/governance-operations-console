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

Models & routing retains its existing accepted runtime binding. The Purpose
registry, request-history and explicit operator-review extension is staged
under Epic 1332. Its live qualification requires exact composed Security
acceptance and Platform commissioning; merged Console source alone is not
activation.

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

For **Purpose profiles**, mount the accepted current Platform registry projection
as an operator-private regular file and set:

- `GOVERNANCE_CONSOLE_MODEL_PROFILE_SOURCE_PROJECTION_PATH`

First use requires no previous receipt or completed request. Registry and
request-path status never assert historical transaction completion. For
fulfillment verification, set `GOVERNANCE_CONSOLE_MODEL_PROFILE_REQUEST_HISTORY_ROOT`
to the Platform-published directory owned by the Console process, mode `0700`.
Each immutable `0600` regular file is named by the SHA-256 hex digest of the
UTF-8 request id plus `.json`. Its version-1
`platform-model-profile-request-evidence` bundle contains exactly
`schema_version`, `artifact_type`, `request_id`, `lifecycle_receipt`,
`merged_readback` and canonical `digest`. Nested artifacts retain their own
digests and original source snapshot. Missing selected history never falls
back to another request's evidence.

The older `GOVERNANCE_CONSOLE_MODEL_PROFILE_LIFECYCLE_RECEIPT_PATH` and
`GOVERNANCE_CONSOLE_MODEL_PROFILE_MERGED_READBACK_PATH` pair remains a bounded
compatibility input when no history root is selected. It proves only the exact
matching request and is unnecessary for registry loading. Reads retain the
512 KiB, ownership, privacy, no-symlink, digest, Platform actor and request /
revision / source-binding checks. Receipt URIs and browser input are never
followed as local paths. Partial live configuration never falls back to fixtures.

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
8. Open **Request History** and select the original request, or enter its
   reference and choose **Read original request**. Inspect its complete intent,
   requirements, owner next move and receipt history. Register polling cannot
   replace the selected scope.
9. Choose the review action offered by current OOS state. Explicit approval
   and rejection require a reason and decision reference/digest. Requested
   changes have typed requirements with owners and next moves. **Revise intent**
   reuses the original typed form and identity; saving is separate from
   resubmitting. Existing multiple-environment scope is displayed and retained.
   The same bound operator may submit and explicitly review its caller-owned
   request; Platform fulfillment uses a distinct caller.
10. Approval waits for the existing Platform fulfillment and Gary source-authoring
    path. It does not edit the registry, select a model, grant credentials,
    accept Security risk or activate runtime access. Refresh the original
    record to read its actual owner outcome.
11. After approved/applied, choose **Verify request fulfillment**. Completion
    requires this request's original lifecycle receipt, merged readback and
    current OOS record. Its historical merged source is shown separately from
    today's registry; later changes cannot invalidate an earlier completed request.

The browser calls only the same-origin routes:

- `GET /api/model-operations`
- `POST /api/model-operations`
- `GET /api/model-operations/requests/{requestId}`
- `POST /api/model-operations/requests/{requestId}` (bounded operator review)
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
- the historical source snapshot is byte-equivalent to its readback projection
  and policy digests match the lifecycle receipt's result source;
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
- lost create/submit acknowledgement: choose **Recover original request** or
  open its reference in Request History. Submit a retained draft there; read
  an already submitted or fulfilled record as it is. Do not replace it.
- unknown review acknowledgement: retain the frozen command identity, time,
  expected revision and reviewed body. Read the original record or retry that
  exact action. A known rejection permits fresh review after canonical refresh;
  lost acknowledgement never silently changes the command or revision.
- unavailable current registry: disable new requests without inferring profile
  state. Request History can still read an original record independently.
  Historical verification never uses today's registry as old completion evidence.

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

## Purpose Profile Source Availability

Purpose profiles uses accepted current Platform source and the live OOS request
path. Missing history affects only verification of its selected request.
Missing current source disables new requests and never infers lifecycle or
pending-selection facts from a sample or old transaction. Models & routing
retains its independently admitted live configuration.

Sample purpose profiles remain available only in the explicit wholly
disconnected design preview, which is labelled as sample data rather than
current Platform state. Partial, stale or invalid profile artifacts continue
to fail closed under the existing verification path.

## Provider health and registration updates

Core Console availability is independent of AI provider availability. After core
startup, Platform checks registered connections on its existing observation
timer; Models & routing reads cached, expiring evidence. A current local metadata
check is not a successful inference. Account presence is explicitly labelled
connection unprobed; routine checks never start Codex or send project context.
The primary health column follows the actual configured workflow route.

Select a registered model to inspect its accepted and observed runtime/digest.
Choose **Verify & update registration** to test the current advertised model and
accept a new registration revision only on success. This retains the model's
stable identity, routes and earlier evidence. Automatic checks never adopt drift,
choose defaults or change fallbacks. A failed/unknown check leaves configuration
controls available. Missing, invalid, expired or mismatched evidence is unknown.
Unknown command completion still reconciles its original owner operation.

This maintenance reuses the existing Compact Control, Teras table, metadata and
actions. Its [Security delta](https://github.com/mfshaf7/security-architecture/blob/main/docs/reviews/components/2026-10-30-provider-lifecycle.md) and normal Platform
acceptance remain required before runtime qualification.

Native visual qualification keeps the existing metadata pattern readable:
provider check time sits beneath provider status, model content is summarized as
changed/unchanged/unknown with full accepted/observed digests in the existing
metadata tooltip, and the original runtime values remain visible. The routing
form uses its existing bounded Field Stack scrolling so multiple fallback fields
retain their own space. No workflow, permission, verification or routing effect
changes in this presentation correction.
