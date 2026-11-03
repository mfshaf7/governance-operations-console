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

1. Choose `Create repository` from Repository Control. `Proposal requests` in
   the workspace header is the separate existing Proposal dependency workflow.
2. Complete Repository details and Workspace ownership. The workspace owner
   reference follows the typed repository name until deliberately overridden;
   review it and the ownership type before submission.
3. Review the defaults in Approval and record the approval note. The creation
   form has one scrolling body; an idle result checklist does not occupy half
   the available input space.
4. Submit once. A retryable failure reuses the same request identity; changing
   reviewed intent creates a new request identity.
5. Inspect the OOS result, provider operation, readback, and terminal receipt.
6. On success, inspect current workspace registration. An already active
   registered repository needs no new Intake. Otherwise, use the separate
   `Review workspace registration` action when the repository should join the
   managed workspace. `Inspect Repository` opens the retained details and offers
   the same registration action. Preparation reads this exact repository's custody
   and existing Intake requests; it does not submit a classification decision.

Live registration requires current custody and Workspace inventory, a matching
successful custody receipt, and an available Workspace Intake mutation capability.
An unavailable capability leaves inspection open and explains why registration
cannot start. Local admission review is only a disconnected demonstration; it is
never offered as an alternative or fallback for live workspace registration.

### Registration details

`Review workspace registration` opens `Register repository`. Provider coordinates,
the workspace name and the custody reference are collected from the selected
successful result. A creation description is reused as editable purpose text;
linked repositories without a retained description require that explanation.

1. Choose what the repository contains and explain its responsibility. The type
   fills its existing category and validation role; another type and an explicit
   role override remain available under the form's specialist settings.
2. Choose how checks are provided. Repository-run tests need a description of
   the intended checks. Registered-check approaches can collect actual bindings
   and the check plan from an existing active owner. The same bounded Registry
   preparation read is repeated before preparing the candidate. An unavailable
   source preserves the draft and blocks that preparation; it never becomes
   invented check IDs or passing evidence. Explicitly reviewed manual IDs remain
   an advanced alternative and still need canonical validation.
3. Make the security-binding decision explicitly. Security owner choices come
   from current active Inventory; an agreed owner outside that list can still be
   named. Repository visibility does not decide this requirement. No credential
   or access grant is implied.
4. Choose `Review registration`. Missing decisions are named in the form. A valid
   preparation opens the existing classification review without submitting it.
   That review can return to the entered details. Closing an edited form or
   opening an unrelated retained request protects unsaved input.
   An acknowledged request clears the draft warning for those exact details;
   later edits are protected again. Acknowledgement still does not mean the
   classification or active registration has completed.

Technical references and derived codes are disclosed separately. Owner setup
requires a current Proposed or Admitted classification and remains a distinct
reviewed workflow. These details do not remove the existing public synthetic
source qualification or authorize private/client source activation.

Repository Control restores retained provisioning results from OOS after
browser reload. A recovered provider record remains ready for onboarding;
readback does not imply Workspace Intake, active inventory, or product
admission. The Source signal distinguishes loading, current canonical records,
and owner failure.

Open the creation dialog and choose the original entry in `Repository request`
to inspect its status and receipt after reload. Entries show the repository,
outcome and request date; exact references remain available in the result's
technical disclosure. A completed request is read-only and never asks for new
baseline or approval input. A failed creation may
have a real repository even though custody is still incomplete; the Console
shows that failure and never projects it as a successful Repository record.

For an acknowledged partial creation, the target and baseline remain locked.
Review the baseline again, enter a fresh approval note, then choose `Apply
reviewed correction`. The server binds a new request to the retained failed
creation through its causation identity. OOS verifies provenance and unchanged
intent, obtains fresh readiness, completes only the approved mutable settings
on the same immutable repository, and separately rereads provider truth. The
old failed result and receipt remain intact. No second repository is created.

For applying or retryable results, choose `Resume original request`. This uses
the canonical original request and approval, not a reconstructed browser draft
or a guessed approval note. The server verifies current operator and authority
before resubmission. Do not change the identity to retry an unknown outcome.

Switching requests, closing or returning from an unsubmitted edited draft asks
whether to keep editing or discard it. Merely reading an unchanged retained
request does not create an unsaved draft. Returning to `Create repository` starts
a fresh request after an unchanged historical inspection; unsaved input and
in-flight original-request recovery are preserved.

These form changes are staged in UI batch four for operator review. Live
publication remains a separate accepted-source activation step.

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
- failed observations are structurally validated, but may differ from requested
  settings or identity: that mismatch is the failure evidence. Exact settings,
  active state, identity, and custody checks remain mandatory for success.
- configured live failure never falls back to fixtures or local receipts.

## Validation

Run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/operation-runtime/repository-provisioning-live-adapter.test.mjs
node scripts/guards/run-guards.mjs --domain repository
npm run check
```


### Request fulfilment

Proposal decides whether to reuse existing work's repository or request a
repository for new work. The latter can be fulfilled in two reviewed ways:

- **Create new** opens the existing approved provisioning form, with the
  originating request filled automatically.
- **Already created** selects a known repository or accepts its GitHub root URL.
  A read-only OOS lookup resolves the immutable provider ID; the user never needs
  to find or type that ID. The operator confirms it was created for this request,
  reviews ownership, and approves the existing custody-link workflow. That
  workflow independently rereads provider identity and produces an attachment
  receipt; lookup metadata alone is not custody or request fulfilment.

Both paths bind the exact request through immutable `correlation.correlation_id`.
Standalone creation and unrelated receipts cannot directly confirm a request.
An explicit reviewed attachment records a new association and receipt; it does
not rewrite the original standalone or historical receipt. Provisioning
corrections keep `causation_id` for the failed creation and preserve their origin.

The form shows one method's fields at a time and preserves an attachment draft
when switching methods. After success, the verified repository is shown for
confirmation; a selector is needed only for multiple matching results. Final
Proposal confirmation remains explicit. Interrupted historical confirmation
keeps its exact original inputs and cannot silently select another repository.

OOS rejects fresh confirmation with an unbound or foreign receipt. The live
Proposal existing-owner selector uses current active Inventory with no fixture
fallback. Disconnected-preview fixtures retain their explicit scope.

Ingress inspection covers canonical Proposal API decisions and their adapter
origins, standalone creation, existing linkage, and Prototype/Delivery resolved
custody consumers. Only Proposal's decision currently feeds the live pending
requirement queue. Downstream custody consumption is not a separate creator.
