# Repository Domain Contract

Status: completed current-shape compact-control contract, not full-console
baseline approval.

Repository owns repository admission, onboarding, blocked admission posture,
and operator review for governed repository lifecycle actions. OOS owns
lifecycle execution, replay, recovery, and receipts.

## Surface Purpose

The operator uses Repository to request new repositories, inspect repository
ownership and lifecycle, prepare onboarding, resolve repository gates, and
review guarded custody, provider archive, workspace retirement, and reversal
actions.

Repository is a focused control modal. It is not a Delivery fullscreen
workspace and not a Proposal-style workflow ladder.

## Ingress

Repository ingress comes from:

- direct repository request draft
- Proposal repository-required gate
- existing repository registry projection
- retired or blocked repository records requiring inspection

Proposal may link to Repository when handoff is blocked by a repository gate.
The repository surface owns the repository-side resolution.

## Source Of Truth

Repository source truth belongs to the repository admission/control path and
eventual owner repo. The Console may display registry and OOS result projection,
but it must not pretend page-local state created or admitted a repository.

Repository has three bounded live OOS workflows. Existing-source linkage submits a
reviewed `link-existing` intent with immutable provider identity. New-source
provisioning submits a reviewed `provision-new` intent with organization,
repository name, visibility, custody target, and the fixed baseline repository
settings. Both use same-origin server routes. The server constructs the
canonical request with current policy and provider credential-binding
references; OOS owns WGCF readiness, provider interaction, replay, recovery,
and the terminal receipt. A missing, rejected, stale, or malformed authority
result remains unavailable and never falls back to local Repository state.

Repository lifecycle submits one of five guarded intents through the
same-origin Console boundary: `transfer-workspace-custody`,
`archive-provider`, `unarchive-provider`, `retire-workspace-record`, or
`restore-workspace-record`. The browser supplies reviewed operator intent only.
The Console server re-reads OOS lifecycle audit state, constructs authority and
impact references, and submits the exact request. OOS owns current-state checks,
WGCF decision use, provider credentials, mutation, readback, replay, reversal
binding, receipts, and audit history. A first lifecycle action may initialize
only from an exact successful OOS custody result; fixture or page-local state is
never live authority.

Repository admission may produce the repo owner/ref needed by Delivery, Proposal,
Prototype, or another operation. It does not directly mutate Delivery ART
metadata. When Delivery needs the admitted repository as an `owner_repo` value,
the handoff goes through the Delivery Catalog Owner Repo add/link/sync workflow.
The operator adds the catalog entry, links it to the admitted repository, and
runs the backend value sync before Execution applies the value to a live work
item.

The current console may mock this handoff locally, but the backend Owner Repo
catalog add/link/sync route is not yet proven live. Repository must expose that
as a future backend integration requirement rather than claiming the repo
admission itself updates Delivery catalog metadata.

Successful provisioning projects the provider repository as ready for
Repository onboarding. Provisioning and Repository-local onboarding do not
classify the repository into Workspace Governance. After a physical repository
is ready, Repository may prepare a generic repository entrant packet for the
separate Workspace Intake classification workflow. An `admitted` intake
decision still does not add the repository to active `repos.yaml`; the
active-inventory promotion workflow owns that later governed change and
receipt.

Visible Repository summary cards must be computed from the current merged
repository records and retained local setup receipt overlays. The control surface
must not read fixture `summary` directly as live posture.
`projectRepositoryEffectiveRecords` is the sole merge boundary for source
records, Proposal request records, local Repository requests, and admission or
gate-resolution receipt overlays. Summary, filters, register rows, selected
context, and dialogs consume the same effective record collection. OOS
lifecycle state remains a separate authoritative projection; it is not folded
into fixture truth.

## Primary Surfaces

Repository Control uses:

- summary/status zone
- repository request ingress panel
- searchable/filterable register
- selected-record action panel
- details/onboarding modal
- blocked admission inspection
- guarded lifecycle wizard with Action, Review, and Result
- posture section details

The selected panel follows the compact control selected-panel pattern used by
Proposal and Repository. It fits content and ends with a bottom-right action.

## Source Structure

Repository uses the Operation Workbench `compact-control` profile.

Implementation ownership is:

- canonical repository record and lifecycle types in `domain`
- live result validation and browser state in `live-runtime`
- public boundary and entry shell in `presentation/workspace`
- control surface, overview, register, and surface view model in
  `presentation/surface`
- focused admission, custody, details, gate-resolution, history, lifecycle, and
  request dialogs
  in `presentation/dialogs`
- repository registry scenario truth in `read-model`
- read-model labels in `read-model/repository-workspace-labels.ts`
- fixture builders and workspace status in `read-model/fixtures`
- proposed, active, contract-derived, and retired scenario records in
  `read-model/fixtures/records`
- repository request draft and empty-state contract in
  `work-model/request/repository-request-model.ts`
- prototype-local runtime public commands in
  `local-runtime/repository-runtime.ts`
- prototype-local admission and gate-resolution command handling,
  model, and projection store in role-specific `local-runtime` files
- same-origin OOS request construction and route handling in `server`

Root-level implementation files, stale root CSS, and convenience internal
barrels are not part of the Repository source model.

Repository presentation uses Teras primitives directly. It must not keep local
CSS, `className`, or inline style paths for panel, tray, field, fact,
checklist, dialog, selected-panel, register, filter, table, or action chrome.

## Lifecycle And States

Repository must distinguish:

- requested
- ready for onboarding
- onboarding
- onboarded
- blocked
- retired

Blocked means the repository cannot be admitted or completed by the current
repo-control path. The UI must show what blocks admission and the owning next
surface/action. Retired records stay read-only and do not show active blocker
cards.

## Onboarding

Onboarding is a bounded multi-step workflow:

- review request and ownership
- run/admit onboarding checks
- show structured run events in a separate panel
- finish with a receipt/read-only result

The prototype-local admission review may retain a complete evidence receipt,
but it must leave the repository's canonical admission state unchanged. Only
the future owner-routed admission path may project a repository as admitted.
The run-events panel must use events emitted by the local runtime; it must not
manufacture waiting, ready, or completed log lines from current UI state.

The second step uses a back action, not a close-only path.

## Repository Lifecycle

Lifecycle actions are available only for records with immutable provider
identity. The wizard shows all five actions and disables those incompatible
with the current lifecycle state. Transfer requires source and target owner
acceptance. Provider archive and unarchive require a server-held credential
binding. Retirement and restore apply only to the workspace record and never
delete the provider repository. Unarchive and restore bind the exact successful
receipt they reverse.

The Review step records impact disposition when a blocking finding exists,
requires an approval note, and requires explicit confirmation of the exact
action. The Result step displays only validated OOS decision, execution,
receipt, and audit truth. Repository History combines OOS lifecycle audit
entries with retained local setup receipts without converting either source
into the other.

Disconnected preview is read-only. A configured live failure, missing initial
OOS state, stale state, malformed result, or denied action remains explicit and
never falls back to the retired prototype-local request command. Retired
records remain inspectable and can enter only the guarded restore action.

## Proposal Gate Resolution

When a Proposal handoff is blocked by a repository requirement, Repository
must expose enough owner/ref/admission posture for the Proposal handoff to know
whether the gate is resolved after refresh/projection.

Gate resolution is a Repository-owned command outcome. It must produce an
idempotent prototype-local Repository receipt carrying receipt id, source
version, proposal id, request ref, resolved owner/ref, result, and timestamp.
The cross-domain projection may publish that immutable receipt back to Proposal;
it must not create a resolution timestamp or synthesize resolution truth itself.

## Non-Goals

Repository must not:

- become a source-code editor
- own Proposal route decisions
- own Delivery planning
- own Delivery Catalog Owner Repo value add/link/sync
- classify Workspace Intake or promote active Workspace inventory
- show unrelated posture sections as active blockers
- use legacy inline comparison paths after final failover
- imply repository creation is complete without exact OOS and provider
  readback evidence
- call GitHub or WGCF directly from the browser or Console server
- expose provider credentials, construct provider authority in the browser, or
  treat a fixture record as current lifecycle state
- hard-delete a provider repository or workspace record
- treat custody linkage as Workspace Intake, active inventory, Catalog linkage,
  product admission, or repository provisioning
- treat successful provisioning as Workspace Intake, active inventory, Catalog
  linkage, product admission, or completed onboarding

## Sources

- `../operation-workbench-contract.md`
- `../system-design.md`
- `../teras-contract.md`
- `../repository-custody-live-integration.md`
- `../repository-provisioning-live-integration.md`
- `../repository-lifecycle-live-integration.md`
