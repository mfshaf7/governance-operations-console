# Repository Provisioning Live Integration

## Purpose

This is the primary Console instruction surface for provisioning one new
GitHub organization repository through the governed OOS workflow. The Console
owns operator review and strict result projection. OOS owns orchestration and
receipts, WGCF owns readiness evaluation, and Platform Engineering owns GitHub
App credentials and provider runtime composition.

Provisioning creates provider source custody. It does not classify the
repository through Workspace Intake, add it to active inventory, link Delivery
Catalog metadata, admit a product, or complete Repository onboarding.

## Operator Flow

1. Choose `Provision Repository` from Repository Control.
2. Review the organization, repository name, purpose, custody target,
   visibility, and fixed baseline settings.
3. Acknowledge the baseline and record the approval note.
4. Submit once. A retryable failure reuses the same request identity; changing
   reviewed intent creates a new request identity.
5. Inspect the OOS result, provider operation, readback, and terminal receipt.
6. On success, continue through Repository onboarding and the separately
   governed Workspace Intake path when classification is required.

The operator cannot provide provider credentials, policy references, caller
secrets, arbitrary GitHub hosts, or repository feature and merge-policy values.

## Fixed Baseline

The Console requests:

- provider `github` at host `github.com`
- organization ownership
- an initial README
- Issues enabled
- Projects, Wiki, and Discussions disabled
- squash merge enabled
- merge commits and rebase merge disabled
- automatic head-branch deletion enabled

OOS and WGCF still decide whether that exact request is allowed. The Console
does not reinterpret a denial or silently adjust settings.

## Server Configuration

Provide these values through the Platform-owned runtime environment. Never use
`NEXT_PUBLIC_*` variables or commit concrete values.

| Variable | Required | Purpose |
| --- | --- | --- |
| `OOS_BASE_URL` | yes | OOS endpoint visible to the Console server. |
| `OOS_CALLER_SECRET` | yes | Caller credential for the Console application. |
| `GOVERNANCE_CONSOLE_OPERATOR_ID` | yes | Accountable operator identity used in the approval artifact. |
| `REPOSITORY_CUSTODY_POLICY_PROFILE_URI` | yes | Current provisioning-policy reference. |
| `REPOSITORY_CUSTODY_POLICY_PROFILE_DIGEST` | yes | Digest binding for the policy. |
| `REPOSITORY_PROVISIONING_CREDENTIAL_BINDING_URI` | yes | Platform-owned GitHub App credential-binding reference. |
| `REPOSITORY_PROVISIONING_CREDENTIAL_BINDING_DIGEST` | yes | Digest binding for the GitHub App credential receipt. |
| `OOS_CALLER_ID` | no | Defaults to `governance-operations-console`. |

The browser calls only same-origin
`/api/repositories/provisioning/requests` routes. Caller secrets, policy
references, credential references, and accountable operator construction
remain on the server.

## Result Rules

- `applying` is non-terminal and carries no fabricated terminal receipt.
- `succeeded` requires exact request, decision, provider operation, provider
  identity, applied settings, readback, credential binding, and receipt truth.
- `denied` remains a policy result and does not create a repository record.
- retryable `failed` results may be retried with the same request identity.
- corrected non-retryable requests receive a new request identity.
- configured live failure never falls back to fixtures or local receipts.

## Validation

Run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/operation-runtime/repository-provisioning-live-adapter.test.mjs
node scripts/guards/run-guards.mjs --domain repository
npm run check
```
