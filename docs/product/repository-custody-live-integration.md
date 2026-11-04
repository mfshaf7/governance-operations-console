# Repository Custody Live Integration

## Purpose

This is the primary Console instruction surface for linking one existing
provider repository to a declared workspace repository reference. The Console owns
operator review and strict projection. OOS owns orchestration and receipts,
WGCF owns readiness, and Platform Engineering owns provider credentials and
provider runtime composition.

This workflow does not provision a repository and does not classify or admit
the repository into other workspace systems.

## Preconditions

The action requires verified GitHub details, a workspace association and
explicit operator approval. Provider details come from the selected record or
the existing server-side lookup:

- provider `github` and host `github.com`
- the positive decimal GitHub repository ID
- canonical owner and repository name
- an unrecorded workspace custody target
- the Workspace repository reference to link (`workspace_owner_ref` in the API)
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

Repository Control reloads its canonical register from retained OOS custody
request pages through the same-origin `GET /api/repositories/custody/requests`
route. The server validates the OOS source envelope and every workflow result.
The browser follows bounded pages, rejects repeated cursors and conflicting
identities, and polls only while visible. Reloading the browser does not erase
retained successful custody or provisioning records. Missing or malformed
owner truth leaves the source offline without fixture fallback.

1. In Repository Control's **Repositories** view, choose **Link existing
   repository** under **Add a repository**. This also works with an empty
   register and does not need a Proposal request or repository-creation access.
   Enter the GitHub root URL and choose **Check repository**. The existing
   configured GitHub connection supplies the immutable ID, canonical account,
   name and visibility. A selected unlinked record can also use its existing
   **Link Existing Repository** action.
2. Review Repository use and Workspace repository, then record the
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

The standalone form uses the same lookup/approval form as Proposal attachment,
without Proposal fulfilment fields or decisions. The workspace reference is
filled from the GitHub name (lowercase for a new standalone link); change it
only to associate a different workspace record. Archived targets stay blocked
by the existing link/readback contract. A known successful creation or link
offers **Open repository**, not another linking submission; current inventory
and lifecycle remain visible in that record's normal review.

Pending reads/submission lock the form and close controls. Unsent edits use the
shared draft-close guard. A retry keeps the request identity and timestamp;
changed intent gets a new identity. Completion shows the original receipt and
offers **Open repository**. Loading/history outages do not manufacture a local
link or a registration decision.

Lookup and approval are independent capabilities. A configured metadata reader
allows opening the form and checking GitHub details even when link approval is
not configured. The form explains that condition and keeps submission disabled;
it never substitutes provisioning authority or treats lookup success as a link.
Both custody credential-binding reference variables above must be supplied by
the approved Platform composition before real linking is operational.

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

## Current Admission And Custody History

Repository Control reconciles retained OOS custody records against the current
canonical Workspace inventory from the existing WGCF continuity read. The
approved custody workspace-owner reference must exactly match a repository
inventory identity. Names, URLs and product records cannot establish admission.
Current active inventory shows Admitted, suspended inventory shows Blocked,
and retired inventory shows Retired across the register, counts, review and
next action. The original provider receipt remains unchanged as history.

Prepare Workspace Intake is available only for a repository absent from a
successful current inventory read. An existing inventory identity never offers
duplicate intake. Missing, invalid or failed current owner reads show admission
unavailable and block intake without falling back to old receipt handoffs.
Visible-page polling refreshes current inventory. Inventory admission alone
proves neither runtime readiness nor Security acceptance; consult those owners.

### Inspect Recorded Actions And GitHub Status

Select the repository, open `Review Repository`, then `View History`.
Creation and linking evidence retain the original provider readback and receipt;
their `Recorded` label does not claim the provider is still in that state.
History keeps three facts separate:

- **Registration** comes from the loaded Workspace Inventory projection.
- **GitHub status** comes from the existing read-only provider lookup when
  History opens or a temporary failed lookup is retried. Its provider and immutable
  repository ID must match the selected record. The observation time is shown.
- **Lifecycle record** comes from the last stored OOS lifecycle state, with
  its recorded time. Reading that audit does not probe GitHub again.

The browser uses same-origin
`GET /api/repositories/custody/provider-repository?owner=…&name=…`; OOS and
Platform retain provider credential authority. This inspection creates no
custody request and performs no lifecycle action or background register scan.
If an owner read fails, retained receipts remain inspectable and History reports
partial coverage. If the GitHub lookup fails, any earlier observation remains
dated and marked retained, while current status is unavailable. A lookup for a
different immutable repository identity cannot replace the observation.

An active Workspace registration may coexist with an archived GitHub repository.
Neither fact substitutes for the other. The History view does not require a
prototype-local setup receipt or grant any new mutation authority.
