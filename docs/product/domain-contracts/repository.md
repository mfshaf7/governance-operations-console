# Repository Domain Contract

Status: completed current-shape compact-control contract, not full-console
baseline approval.

Repository owns repository admission, onboarding, blocked admission posture,
and retirement handling for source custody.

## Surface Purpose

The operator uses Repository to request new repositories, inspect repository
ownership and lifecycle, prepare onboarding, resolve repository gates, and
request retirement.

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
eventual owner repo. The console may prepare prototype-local requests and
display registry projection, but it must not pretend page-local state created
or admitted a repository.

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

Repository provisioning and Repository-local onboarding do not classify the
repository into Workspace Governance. After a physical repository is ready,
Repository may prepare a generic repository entrant packet for the separate
Workspace Intake classification workflow. An `admitted` intake decision still
does not add the repository to active `repos.yaml`; the active-inventory
promotion workflow owns that later governed change and receipt.

Visible Repository summary cards must be computed from the current merged
repository records and prototype-local receipt overlays. The control surface
must not read fixture `summary` directly as live posture.
`projectRepositoryEffectiveRecords` is the sole merge boundary for source
records, Proposal request records, local Repository requests, and admission or
retirement receipt overlays. Summary, filters, register rows, selected context,
and dialogs consume the same effective record collection.

## Primary Surfaces

Repository Control uses:

- summary/status zone
- repository request ingress panel
- searchable/filterable register
- selected-record action panel
- details/onboarding modal
- blocked admission inspection
- guarded retirement request
- posture section details

The selected panel follows the compact control selected-panel pattern used by
Proposal and Repository. It fits content and ends with a bottom-right action.

## Source Structure

Repository uses the Operation Workbench `compact-control` profile.

Implementation ownership is:

- canonical repository record and lifecycle types in `domain`
- public boundary and entry shell in `presentation/workspace`
- control surface, overview, register, and surface view model in
  `presentation/surface`
- focused admission, details, gate-resolution, request, and retirement dialogs
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
- prototype-local runtime command handling, model, projection store, and
  request-record factory in role-specific `local-runtime` files

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

## Retirement

Retirement is available only for onboarded records. It is a guarded operation
and must not be presented as the primary shape for already retired records.
Retired records inspect like onboarded records but read-only.

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
- imply repository creation is complete from local prototype state alone

## Sources

- `../operation-workbench-contract.md`
- `../system-design.md`
- `../teras-contract.md`
