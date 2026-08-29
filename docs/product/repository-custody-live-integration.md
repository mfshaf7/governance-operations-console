# Repository Custody Live Integration

## Purpose

This is the primary Console instruction surface for linking one existing
provider repository to an existing workspace owner record. The Console owns
operator review and strict projection. OOS owns orchestration and receipts,
WGCF owns readiness, and Platform Engineering owns provider credentials and
provider runtime composition.

This workflow does not provision a repository and does not classify or admit
the repository into other workspace systems.

## Preconditions

The action is available only when the Repository record supplies:

- provider `github` and host `github.com`
- the positive decimal GitHub repository ID
- canonical owner and repository name
- an unrecorded workspace custody target
- the workspace owner reference to link
- an explicit operator approval note

Repository names and URLs are display context. The immutable provider
repository ID is the identity used for the authority decision and readback.

## Server Configuration

Provide these values through the Platform-owned runtime environment. Never use
`NEXT_PUBLIC_*` variables or commit concrete values.

| Variable | Required | Purpose |
| --- | --- | --- |
| `OOS_BASE_URL` | yes | OOS endpoint visible to the Console server. |
| `OOS_CALLER_SECRET` | yes | Caller credential for the Console application. |
| `GOVERNANCE_CONSOLE_OPERATOR_ID` | yes | Accountable operator identity used in the approval artifact. |
| `REPOSITORY_CUSTODY_POLICY_PROFILE_URI` | yes | Current Workspace Governance custody-policy reference. |
| `REPOSITORY_CUSTODY_POLICY_PROFILE_DIGEST` | yes | Digest binding for the custody policy. |
| `REPOSITORY_CUSTODY_CREDENTIAL_BINDING_URI` | yes | Platform-owned provider credential-binding reference. |
| `REPOSITORY_CUSTODY_CREDENTIAL_BINDING_DIGEST` | yes | Digest binding for the provider credential receipt. |
| `OOS_CALLER_ID` | no | Defaults to `governance-operations-console`. |

The browser calls only same-origin
`/api/repositories/custody/requests` routes. Caller secrets, policy references,
credential references, and accountable operator construction remain on the
server.

## Link Flow

1. Select a Repository record with immutable provider identity and choose
   `Link Existing Repository`.
2. Review the custody kind and workspace owner reference, then record the
   approval note.
3. The Console server creates one canonical, digest-bound `link-existing`
   request and submits it to OOS.
4. OOS requests the exact WGCF decision, performs provider readback through
   the Platform-owned credential binding, and records a terminal receipt.
5. The Console validates request, execution, decision, provider identity,
   credential binding, readback, receipt, and downstream-handoff references
   before projecting the result.
6. A retryable provider failure reuses the same request identity. A corrected
   non-retryable request receives a new request identity.
7. Success reports custody as linked. Workspace Intake, active inventory,
   Delivery Catalog, product admission, and provisioning remain separate
   actions named by the receipt.

## Failure Behavior

- Missing server configuration keeps the workflow unavailable.
- Invalid or mutable provider identity is rejected before OOS is called.
- OOS denial, stale policy, idempotency conflict, unavailable provider, and
  malformed or mismatched result remain explicit failures.
- Configured live failure never falls back to fixture state or a local receipt.
- The Console never calls GitHub, WGCF, OpenProject, Workspace Intake, or
  Delivery Catalog directly from this workflow.

## Validation

Run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/operation-runtime/repository-custody-live-adapter.test.mjs
node scripts/guards/run-guards.mjs --domain repository
npm run check
```
