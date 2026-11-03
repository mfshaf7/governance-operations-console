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

Repository Control has **Requests** and **Repositories** views. Repositories
shares Proposal's summary/action overview, register and selected-record launcher.
Requests has a register and selected context for canonical Proposal requirements.
Confirmation fields belong in its focused request dialog. Canonical Proposal and
Console attention navigation open that dialog at the exact request; repository
creation contains only creation actions.

The context panel distinguishes required work from available inspection. An
active registered repository shows registration complete and does not offer a
duplicate Intake action. A registration action explains that it reviews whether
a created or linked repository joins the managed workspace, its ownership and
checks; classification and active Inventory remain distinct owner decisions.
Unavailable actions show their reason. Creation capability cannot represent the
availability of custody, lifecycle or other independent owner operations.

For a live repository ready to register, `Review workspace registration` is the
primary action and repository inspection is secondary. The inspection dialog
offers the same canonical registration path, with identical source and capability
checks. If registration is unavailable, its reason remains visible; local
admission is neither a fallback nor a competing path. Local admission launch and
execution require explicitly disconnected preview mode, including when a previously
opened dialog outlives a mode change.

Registration uses Purpose, Testing and validation, and Security responsibility sections. Readable
repository types derive existing category/role pairs; checks and security remain
explicit choices. Shared Intake display labels replace raw validation codes.
The form collects known custody metadata and retained creation descriptions,
can read an active check owner's current plan through the existing bounded
Registry preparation, and exposes reviewed overrides in Advanced settings.
Limited profile role combinations and required direct-check bindings follow
the Intake policy. Missing input is explained, drafts are guarded, and preparation
preserves the separate classification/Inventory decisions. Owner-plan metadata
is contextual evidence, not a successful test result or source-owner readiness.

Repository creation uses grouped, full-width Repository, Workspace ownership
and Approval sections. Supporting defaults and exact request/receipt references
use technical disclosure. An idle result checklist must not compete with inputs.
Retained completed requests use read-only original request and receipt facts,
not new draft validation. Switching retained requests protects unsaved input,
as do close and back actions. The existing correction, replay and original-request
recovery semantics remain independent of this form layout.

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
An admitted Repository record exposes `Reconcile Delivery Catalog`, which opens
the Delivery Catalog at that exact repository. Existing values are selected;
missing values open a reviewed add draft. The same-origin Console adapter asks
OOS for a current WGCF repository-readiness reference when the canonical
Catalog projection does not already carry one, then submits the reviewed
Catalog mutation. OOS owns readiness evaluation and verification, Catalog
mutation, canonical readback, and the durable receipt. A missing, denied,
stale, malformed, or mismatched readiness result blocks the mutation without a
local-success fallback.

Catalog reconciliation remains separate from applying `owner_repo` to a live
Delivery work item. Execution Board initiates that later reviewed link command,
which binds the Catalog receipt, Delivery update, canonical readback, and
operator acceptance.

Successful provisioning projects the provider repository as ready for
Repository onboarding. Provisioning and Repository-local onboarding do not
classify the repository into Workspace Governance. After a physical repository
is ready, Repository may prepare a generic repository entrant packet for the
separate Workspace Intake classification workflow. An `admitted` intake
decision still does not add the repository to active `repos.yaml`; the
active-inventory promotion workflow owns that later governed change and
receipt.

The staged `Prepare Workspace Intake` action consumes successful matching OOS
custody, collects explicit owner/validation metadata, and opens the shared
Intake Decision / Review / Result workflow with an OOS-derived source candidate.
It does not classify in page-local Repository state, promote Inventory, grant
source access or reconcile Catalog. Missing current custody/capability disables
entry; owner readback failures remain explicit. See
[`../workspace-intake-live-integration.md`](../workspace-intake-live-integration.md).

That same Intake preparation surface hosts the staged **Repository Owner Setup**
tool for proposed or admitted source-only Intake absent all Inventory. OOS owns
exact custody/eligibility,
finite trusted-control preparation, durable requests, credentials, source
execution/recovery, review and canonical readback. The Console selects the
actual project's evidence profile and optional CI, inspects inert source and
binds explicit decisions through same-origin APIs. Missing review controls use
the same finite plan: absent control files and digest-bound append-only AGENTS
review guidance only. Existing profile, application and independent control
bytes are preserved; incomplete independent review policy blocks for owner
review. No model, application authoring or active-owner source authority is
introduced by the adapter. Complete existing owner controls
use non-source checkout without a dummy PR. Setup grants neither admission nor
app/runtime acceptance; ordinary source consumers reject its separate purpose.
The primary procedure is [Repository owner setup](../repository-owner-setup.md).
Exact composed acceptance and browser operating proof remain pending.

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
- admitted-repository handoff to exact Delivery Catalog reconciliation
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
current canonical Workspace Inventory may project a repository as admitted.
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
receipt, and audit truth. Live Repository History combines identity-bound
custody and provisioning receipts with the OOS lifecycle audit, preserving
their original attribution. Prototype-local setup receipts appear only in
disconnected preview. Missing local setup evidence never describes the state
of canonical Workspace registration. Unavailable owner reads remain explicit
partial coverage, while previously loaded evidence stays inspectable.

Creation/link receipts describe recorded actions, not current provider health.
History displays Workspace registration separately from a read-only GitHub
observation and the last recorded lifecycle state. Opening History or retrying
a failed provider read reuses the existing bounded lookup for that single
repository. The lookup must match the immutable provider repository ID before
its status can describe the selected record. Lifecycle audit reads are stored
state, not fresh provider probes. Earlier GitHub observations retain their
timestamp during refresh or failure and are not labelled current. Neither
observation changes admission, lifecycle action eligibility or owner authority.
There is no permanent refresh control. A temporary load failure replaces the
affected section body with a centered Retry state, then restores normal content
after success. Setup, permission and identity verification failures explain the
prerequisite instead of offering ineffective retries. A provider retry reloads
only the provider section; a History retry reloads failed retryable history
sources. Stored evidence is retained through both states. Timeline entries
deduplicate receipt identities; latest-per-action references
follow completion time rather than source array order.

Disconnected preview is read-only. A configured live failure, missing initial
OOS state, stale state, malformed result, or denied action remains explicit and
never falls back to the retired prototype-local request command. Retired
records remain inspectable and can enter only the guarded restore action.

## Proposal Gate Resolution

When a Proposal handoff is blocked by a repository requirement, Repository
must expose enough owner/ref/admission posture for the Proposal handoff to know
whether the gate is resolved after refresh/projection.

Gate resolution is a Repository-owned command outcome. It must produce an
idempotent Repository receipt carrying receipt id, source
version, proposal id, request ref, resolved owner/ref, result, and timestamp.
The cross-domain projection may publish that immutable receipt back to Proposal;
it must not create a resolution timestamp or synthesize resolution truth itself.

In configured live mode, Repository Control reads canonical Proposal requests
and successful retained OOS custody results. Its reviewed resolution operation
binds the exact source version and custody receipt, preserves Disposition, and
persists the typed acknowledgement in canonical Proposal state and history.
An interrupted history acknowledgement is visible and retryable from the same
persisted inputs after reload. The prototype-local receipt path remains limited
to disconnected preview; it cannot satisfy a live handoff gate. See
[`../repository-proposal-gate-live-integration.md`](../repository-proposal-gate-live-integration.md).

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
- call GitHub or WGCF directly from the browser or Console server; Catalog
  readiness is obtained through OOS
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


### Repository request navigation (2026-11-03)

Repository Control separates **Requests** from **Repositories**. Requests reads
canonical Proposal repository requirements, not provisioning receipt history.
Its attention count includes unresolved requirements and interrupted confirmation;
resolved requests remain inspectable in history and do not contribute to attention.
Loading, unavailable or stale source counts are unknown, never a successful zero.
Retained unavailable metadata is read-only. Exact attention/Handoff links open the
requested Proposal requirement; a missing target never silently selects another.
The existing reviewed OOS confirmation binds the exact Proposal version and verified
custody receipt. The Console does not auto-resolve requirements or change Disposition.


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
