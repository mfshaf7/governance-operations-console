# Connected GitHub accounts

Operator-approved repository maintenance. Landing Unit decision:
`child_isolated_landing_unit`; Console source, broker policy, credential delivery
and Security acceptance have separate owner and rollback boundaries. This is a
source candidate; preview, source landing and operating qualification are separate.

## Using Repository Control

Choose **Create repository**. **Create under** comes from the verified GitHub
connections supplied by Platform through OOS. One eligible account is automatic;
several offer a selector and use the configured default. Without a default, choose
deliberately. An unavailable account cannot submit a creation request. A personal
account supports Private or Public visibility; Internal remains organization-only
and subject to provider policy.

Changing destination requires a fresh defaults review. Submission resolves the
account type and credential binding again on the server. An interrupted request
keeps its original target and approval; changing the default never reroutes it.
A lost connection requires reconnecting that account, rather than retrying with a
different account's credentials.

New workspace references include account and name, for example
`repo:example-personal--todo` and `repo:example-company--todo`. Existing references
and deliberate aliases remain unchanged. Link existing repositories by their
GitHub URL; lookup selects that account's metadata reader. A known repository
retains its original workspace reference. Immutable GitHub repository IDs keep
same-named repositories distinct throughout custody and registration.

The creation form generates its internal workspace identifier automatically.
The `repo:` prefix is a record-type marker, not part of the GitHub name or URL.
**Workspace technical details** retains optional customization; normal creation
does not require understanding or editing that identifier. **Repository use**
offers only Dedicated (one project) and Shared (several projects), in both
creation and existing-repository linking/attachment forms. For creation, both
choices use the same provider baseline; linking associates existing source. The
classification is retained in the custody request and Console record. It does not scaffold project
folders, configure separate builds or select the later source plan. Prototype
Studio source custody is established by Landing in Studio's source area, not by
creating or linking a GitHub repository with an incubation label. Studio custody
and external maintenance are not repository-layout choices. Earlier recorded
classifications remain readable in existing records and immutable history; they
are not offered for new selections. The selected creation choice
does not move or import source, select a Proposal route, or activate registration.

The register shows qualified GitHub names and **Visibility**: Public, Private,
Internal or Unknown. Visibility comes from the dated identity-checked provider
readback; the timestamp is available on the value. Opening History performs the
existing selected-repository read, which updates visibility after verification.
An unavailable read retains earlier dated evidence and never guesses from the
URL or workspace admission state. Multiple accounts enable the account filter.
Workspace Registry remains one installation-private inventory; its native rows
also display the qualified GitHub source without changing their record identity.

## Connection authority

The browser receives account metadata and non-secret capability references from
`GET /api/repositories/custody/connections`. Tokens and App keys remain server-side.
OOS uses exact account ID, account type, purpose and binding, with no cross-account
or cross-purpose fallback. Source authoring still uses its separately approved
Source App connection. Lifecycle access remains independently activated and scoped
to the explicitly approved repository; creation does not grant archive authority.

Connection delivery and renewal use the existing
[Platform procedure](https://github.com/mfshaf7/platform-engineering/blob/main/products/governance-operations-console/runbooks/operate-complete-runtime.md#connected-github-accounts).
The canonical custody policy is owned by
[Workspace Governance](https://github.com/mfshaf7/workspace-governance/blob/main/docs/repository-custody.md).

## Packaging follow-up

The existing [provider onboarding release requirement](backlog.md#before-customer-release-provider-onboarding)
must ask, after installation, whether users want personal accounts, organizations,
or both. It must verify connections, select a default and permit later changes.
Account choices are not permanent company/solo installation modes. The current
engineering connection procedure does not close packaged onboarding acceptance.

## Disconnected form preview

An explicitly disconnected Console can open **Create repository** to inspect and
edit the same form using labeled sample personal and organization accounts.
Submission remains disabled, including after every required field is filled.
Live loading, denied or unavailable connections never use these examples.

## Repository list, history and read recovery

The register reads bounded pages from the existing custody owner using
`view=register`, with one latest successful receipt per immutable repository ID.
It does not reconstruct the list from all creation/link requests. **Load more
repositories** makes further pages available without a fixed total-record cliff.
When more pages remain, summary, search and filters explicitly cover loaded
repositories. This list is recorded custody evidence, not a fresh GitHub check.

Request history is separate and paged on demand. Opening a repository's History
selects its immutable provider ID; opening a Proposal request selects its exact
Proposal association. Original requests and receipts remain unchanged. An
incomplete Proposal history cannot establish absence or enable another creation.
Link lookup independently resolves existing custody even when that repository is
not on the loaded page, preserving its original workspace identifier.

A failed initial read shows an error and retry in the register, with unavailable
totals instead of zeros. Failed continuations retain loaded rows and retry the
same continuation. Polling is non-overlapping and bounded; it does not drain
request history. Invalid or nonadvancing pages remain visible failures.

Create and link commands validate workspace identifier syntax before owner or
provider effects, using the same parser as registration. Linking uses the same
plain use descriptions and automatic identifier/technical disclosure as creation.
Disconnected Link preview uses a labeled fixed sample; GitHub lookup and linking
remain disabled, including after all fields are filled.

## Repository setup feedback

The same pending maintenance batch improves Repository setup and Application
verification using the existing Teras controls. Each action identifies its wait,
confirmed responses display a result, and interrupted command responses require
an original-request status check before further changes. Drafts and original
request/command identities survive retry in the current dialog; canonical owner
records remain the recovery authority after reload. Proposed-file previews are
limited to the preparation or draft being inspected. Withdrawal opens a secondary
inline reason form. No new wizard, source permission, provider grant or automatic
approval is introduced.

The shared Source access panel applies the same readable waiting and recovery
behavior in Repository, Prototype and Delivery. Repository, branch, allowed setup
files, reviewer, workflow permission and expiry remain visible for approval;
provider identities and binding digests remain inspectable in Technical details.
The primary procedure is [Repository setup](repository-owner-setup.md).

Local follow-on proof: full Console check passed (architecture, 961 semantic
tests, typecheck and production build). Three browser cases passed after the
build and preview restart, covering the editable verification plan, retained
history, action-specific waiting and an interrupted save that preserves its draft
and original request. Layout was inspected at 1280px and 1700px. These are
isolated UI/source conformance checks, not live provider commissioning.

## Coordinated repository onboarding

The same unpublished batch now replaces the local demonstration Admission Run
with Registry-owned onboarding. Repository Control hands its exact verified
identity to Registry; the existing details, source setup, approval and activation
workflows are reused. Creation/linkage is distinct from active workspace readiness.
Project use is enforced by the owner backend, including new Proposal dependencies
and Prototype publication, rather than by a browser-only ready flag.

See [Repository onboarding](repository-onboarding.md) for the primary procedure,
permitted pre-activation actions, independent application verification and private
source routing. Historical demonstration receipts remain readable but cannot
unlock a repository. Current Registry search includes internal registrations;
private metadata is not authorized for the public Studio route by onboarding.

### Onboarding candidate validation

Full Console check passes: architecture,962 semantic tests, typecheck and optimized
production build. Browser conformance covers27 distinct onboarding, Proposal reuse
and registration/detail cases, including native records, failed reads, exact
provider identity handoff, admitted-before-active status, original-request result
and return behavior, and the absence of a local admission writer. Two older test
selectors were updated to the existing single-review result dialog titles and
repassed. Layout was inspected at1280px and1700px. Public-source checks pass.
These isolated proofs leave the batch unpublished and unactivated; exact merged
source pins and live composed qualification belong to the later publication path.

### Onboarding usability follow-on

The operator requested a field-by-field usability pass in the same unpublished
batch. The repository form now asks how source changes are checked and whether
project requirements need a separate security repository. Recorded answers can
refill a pristine form from a completed matching request without inventing approval
or overwriting edits. Shared IDs and advanced controls remain available. Empty
history does not add a refresh panel; unavailable history blocks review and offers
a scoped retry with loading feedback.

Review facts use readable decisions and responsibility labels, with exact codes
and provider/source references in technical details. Result dialogs distinguish
submitted requests from recorded decisions, show actual failures and direct the
user to setup or activation only after the corresponding decision succeeds. A
completed decision does not claim completed onboarding. Interrupted submissions
retain the reviewed input and original ID, require original-status inspection and
permit identical retry only after authoritative not-found. Browser deadlines
follow existing owner read/command budgets and do not cancel accepted operations.

Usability validation: full Console check passes with963 semantic tests, architecture,
typecheck and optimized build. All23 focused browser cases pass against the
compiled candidate, plus the unknown-outcome close/return recovery check. Rendered
form layouts at1280/1700 and the settled result dialog were inspected. Public-source
and candidate Security evidence checks pass. These remain isolated service-response
conformance checks; actual provider/backend qualification awaits publication.
