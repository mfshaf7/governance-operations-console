# Repository Lifecycle Live Integration

## Purpose

This is the primary Console instruction surface for reviewing and applying one
governed repository lifecycle action. The Console owns operator interaction and
strict result projection. OOS owns workflow execution, WGCF decision use,
current-state enforcement, replay, recovery, provider readback, receipts, and
audit history. Platform Engineering owns provider credentials and runtime
composition.

The workflow supports:

- workspace custody transfer
- provider archive and unarchive
- workspace record retirement and restore

It does not hard-delete a provider repository, classify Workspace Intake,
promote active inventory, update Delivery Catalog, or mutate downstream work.

## Modes

- `disconnected-preview`: the lifecycle audit is not live and all final actions
  are disabled.
- `live`: the Console reads OOS audit state and submits reviewed intents through
  same-origin server routes. A live failure never falls back to fixtures.

Normal runtime activation still requires the separately approved composed
operating and Security evidence. Source integration and bounded sandbox proof
do not claim stage or production readiness.

## Server Configuration

Provide values through the Platform-owned runtime environment. Never expose
them as `NEXT_PUBLIC_*` variables or commit concrete values.

| Variable | Required | Purpose |
| --- | --- | --- |
| `OOS_BASE_URL` | yes | OOS endpoint visible to the Console server. |
| `OOS_CALLER_SECRET` | yes | Caller credential for the Console application. |
| `GOVERNANCE_CONSOLE_OPERATOR_ID` | yes | Accountable operator identity used for approval and acceptance artifacts. |
| `REPOSITORY_LIFECYCLE_POLICY_PROFILE_URI` | yes | Current Workspace Governance lifecycle-policy reference. |
| `REPOSITORY_LIFECYCLE_POLICY_PROFILE_DIGEST` | yes | Digest binding for the lifecycle policy. |
| `REPOSITORY_LIFECYCLE_PROVIDER_CREDENTIAL_BINDING_URI` | provider actions | Platform-owned provider credential-binding reference. |
| `REPOSITORY_LIFECYCLE_PROVIDER_CREDENTIAL_BINDING_DIGEST` | provider actions | Digest binding for the provider credential receipt. |
| `OOS_CALLER_ID` | no | Defaults to `governance-operations-console`. |

The browser uses only `/api/repositories/lifecycle/...`. Caller credentials,
policy references, provider bindings, operator identity, request digests, and
reversal receipt selection remain on the server.

## Operator Flow

1. Open an admitted or retired Repository record and choose `Manage Lifecycle`.
2. Select one eligible action. Transfer additionally records source and target
   owner acceptance and the target owner reference.
3. Review current state, target impact, and mutation owner.
4. Record a blocking-impact disposition only when one exists, provide the
   approval note, and explicitly confirm the exact action.
5. The Console server re-reads OOS audit state. If no lifecycle audit exists,
   only an exact successful OOS custody result may initialize the first action.
6. OOS evaluates, applies, reads back, and returns a terminal result or an
   explicit applying/failure result.
7. The Console validates the complete request, decision, operation, provider
   readback, receipt, and audit chain before displaying it.
8. Repository History reads the OOS audit and preserves retained local setup
   receipts as separately attributed evidence.

## Failure And Replay

- Missing server configuration keeps mutation unavailable.
- Missing immutable GitHub repository identity is rejected before OOS.
- Fixture state cannot initialize live lifecycle authority.
- Stale state, policy denial, credential failure, provider mismatch, malformed
  evidence, or missing reversal receipt remains explicit.
- Retrying the same reviewed intent uses the same request identity and may
  return `replayed: true`.
- Corrected intent receives a new request identity.
- The Console never calls GitHub or WGCF directly and never fabricates a
  lifecycle receipt.

## Validation

Run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/operation-runtime/repository-lifecycle-live-adapter.test.mjs
node scripts/guards/run-guards.mjs --domain repository
npm run check
```
