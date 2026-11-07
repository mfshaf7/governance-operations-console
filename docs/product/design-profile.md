# Governance Operations Console Design Profile

Status: graduated baseline design profile.

### Model usability maintenance preview

The Model Profile Dashboard explains purpose, permitted workflows, policy
status and the next useful action before exposing evidence. Reuse the existing
Prototype dashboard's overview, balanced panels and technical disclosures;
retain Model's policy/permission semantics. Bounded Platform policy summaries
are identified explicitly and do not assert current model health, an invocation
audit or unreported data/output facts. Reference IDs stay inspectable.
Purpose-profile forms retain the existing owner contract and later explicit
review, with one request page and owner-resolved workflow setup. The request and revision
forms use the large dialog with a filled height and the standard Teras scroll
region; actions remain pinned. Submission results retain their compact dialog.
The separate profile-policy change form uses standard width and content height;
its longer policy-edit states scroll within the shared viewport cap. Pending
and uncertain requests retain their original identity; failed refreshes cannot
remain current. Request history groups original details and review into balanced panels, followed
by the shared event timeline. Human names and review labels lead; raw identities
and per-event receipts stay in technical disclosure. Reference lookup is secondary,
and review actions begin with an explicit unselected choice. History uses bounded
summary pages and lazy selected evidence; record/reference switches protect dirty
review input. Confirmed connection outcomes remain separate from failed later reads. All scrolling uses
the standard Teras content region. The accumulated batch stays in preview for operator review.

### Console AI Capability profile maintenance preview

Keep **Request Profile** for creating a request. The existing request-management
entry and dialog use **Manage Requests**, since they include review, revision,
approval and implementation progress. History continues to mean an individual
request's event timeline; no additional action button is introduced.

Use **Console AI Capability** as the visible field label, with helper text
“Choose the AI function this permission profile applies to.” This names a
registered function configurable through Model Operations; it does not imply
a dedicated chat interface, Console invocation path or current runtime readiness.
Use this term for the existing implemented integration, not workflow template
or ART Feature. The request retains one form and the separate result dialog. It
shows source-backed behavior/input/output/instruction guidance, then review
wording and the shared operating-policy fields. Profiles stay suspended and
unselected until later explicit steps. Technical integration references remain a
maintainer path and cannot masquerade as implemented capability code.
The same shared policy fields serve original requests and policy revisions;
existing profile-change dialogs keep their approved content-sized layout.
Permission selection reuses a standard content-sized dialog with a guarded draft,
current saved choice and normal original-operation progress. No selection is
made by opening a form. Inactive profiles cannot be submitted as active choices.
Loading shows the shared skeleton without transient blocked/unavailable badges.

### Proposal usability maintenance preview

Preserve the compact register/selected-panel composition and existing
Triage, Disposition, Handoff and read-only History layouts. Reuse Teras fields,
loading states, technical disclosure and pending/result dialogs. Plain task
language leads; source identity and evidence remain inspectable. Overview
counts explicitly describe the current page, with the full backlog total
separate. Paging does not turn summaries into submission authority. Form text
limits match the owner command contract and never truncate an existing draft.
The preview requires operator visual review before publication.

Proposal pagination uses a separate register footer with comfortable button
height and spacing. The table owns its scroll area; navigation stays visible.
Show the current page and displayed range, with row numbers continuing across
pages of the current search. Sparse continuation pages count actual results,
not an assumed full page size. Filtering and first-page refresh reset numbering.

### Proposal Studio incubation preview

Post-baseline maintenance reuses Disposition's choice group, source panel,
guidance tray and shared fields. Studio is the first Prototype source-home choice,
with concise guidance that a separate product repository can wait. Its selected
tray explains incubation, real Inventory availability and source visibility.
No extra wizard or duplicated repository form. Delivery retains its choices;
Handoff uses the same meaning and shows request navigation only for actual requests.

Repository/Prototype coherence maintenance replaces Landing's ignored source-home
selector with the authoritative source readout and scope explanation. Existing
source and reference-only postures stay available through their admitted ingress;
Landing does not silently transfer custody. Repository creation, attachment and
registration disclose the current source-setup limits while preserving visibility.
Application-check editing starts only after the existing owner preparation read
confirms eligibility. Loading, denied and transient-failure states precede the
editable form; original pending work and its recovery identities are retained.

This file originated as the Prototype Studio design profile. The active visual
and structural rules live in the normalized contract set:

- [`system-design.md`](system-design.md)
- [`operation-workbench-contract.md`](operation-workbench-contract.md)
- [`teras-contract.md`](teras-contract.md)
- [`domain-contracts/`](domain-contracts/README.md)
- [`surface-contracts/`](surface-contracts/README.md)

### Register pagination visual maintenance

The shared footer keeps its compact range on the left and Rows per page 25/50/100
beside Previous/Next on the right. Default 25 is consistent across registers and
nested request histories; native transport chunk sizes remain separate. The size
selector uses the existing portal select control and primitive-owned sizing,
with wrapping at narrow footer widths. Size changes reset the first page and
vertical table scroll, retaining filters, separate originals and review drafts.

Model configuration registers and Orchestration Definitions retain their existing
columns and page complete configuration snapshots using the shared footer.
Repository Requests follows the native Proposal collection independently of its
overview. Nested request histories reuse footer controls while preserving their
native continuation, selected original, unsaved review and pending-request guards.

Pagination reuses Proposal’s compact record metadata text for range, empty and
pending labels. It must not inherit the page-body font size. Keep the existing
register frame and comfortable footer spacing without an additional divider.
Numeric summary cards retain their existing design; unavailable totals use an
em dash with an explanation rather than long status phrases in the value slot.
Repository and Prototype summaries retain their independent overview scope;
register search and page navigation do not redefine their totals. Execution
status and Family Map columns keep natural card heights with independent compact
search fields beneath their headings. Counts retain the unfiltered total.
Intake shows readable source and receipt labels, keeping exact references and
read failures in technical disclosure. A compact notice preserves visibility of
unverified source history without repeating large diagnostic cards above rows.
Environment source headers and registers share a bounded main region; existing
request and operation history remains reachable in the outer scroll region.

Verify actual long descriptions, pending/empty/ready states and the full footer
at the supported desktop viewport sizes. Successful paging actions and absence
of JavaScript errors alone do not establish visual conformance.

## Visual Direction

The console is a calm operator control surface for governance work. It should
feel precise, dense enough for repeated operator use, and clearly structured
around decisions, status, records, and receipts.

It is not a marketing page, generic admin template, decorative dashboard, or
single-domain Delivery clone.

## Shared Visual System

### Clear responsibility terminology

Operator-approved Console wording distinguishes the entity being referenced:

| Meaning | Display wording |
| --- | --- |
| GitHub repository namespace | GitHub account or organization |
| Repository identity associated with workspace custody | Workspace repository |
| Delivery source repository and its Catalog field | Implementation repository |
| Repository review controls and verification preparation | Repository setup |
| Repository supplying validation or Security records | Repository with the checks; Security repository |
| Component executing an operation | Execution component or workflow service |
| Component or person responsible for a blocker | Resolution responsibility |
| Human follow-up assignment | Responsible person or team |

Forms, registers, modal headings, filters, statuses, loading/error guidance and
read-only inspectors use the appropriate contextual term. Repository references
must not be presented as a question asking for a person. Exact original evidence,
field keys, permission claims and protocol identifiers remain unchanged.
Delivery renders the canonical Owner Repo field as Implementation repository;
it never rewrites the source field or mutation key. The primary account display
uses Workspace approver for the existing Workspace owner authority claim;
the verified claim, role checks and trust posture retain their exact values.
No translation grants access, admission, approval or execution capability.

### Repository review readability preview

The operator approved reorganizing Review Repository around identity, current
status, recorded evidence and understandable actions. A distinct Repository
details modal title sits above one neutral identity panel grouping repository
name, purpose and the GitHub/owner metadata. The GitHub link uses the existing blue information tone, underlining and
an external-link marker and opens in a separate tab. Purpose appears once.
Neutral paired status/action panels
replace competing green panels. Registration and GitHub observation have
separate labels and retain unavailable/retained state. Original checks and
runtime/Security references use shared technical disclosure, with the existing
record inspectors still available. Action explanations sit beside the controls;
History and return remain in the footer. Review and Inspect share this domain
composition while retaining their original eligibility and owner routes. This
extends the unpublished Repository batch, with preview review before publication.

Record inspection dialogs retain their standard modal header and use readable
metadata facts plus a brief explanation of scope. Technical details preserve
the original references. The selected repository is named in the description;
the parent review layout remains as reviewed. Evidence rows keep right-aligned
Inspect record buttons and separate result pills.

### Repository Control batch-four preview

Repository retains its shared compact-control overview, register and selected
context. All five summary cards—Total, Ready to register, Registered, Needs
attention and Retired—stay in one row at supported desktop widths, as the
operator requested. **Requests** and **Repositories** use the shared segmented
control in the modal header. The Requests attention count comes from the same
owner snapshot as its list and confirmation dialog. Optional modal header actions
extend Teras; callers without that option
retain their existing composition. Summary cards use the existing five-column grid.

Creation uses neutral full-width Repository, Workspace ownership and Approval
sections with readable paired fields and one scrolling body. Owner result chrome
appears only when a result or failure exists. Completed requests show original
read-only facts and a compact result, with technical references disclosed on
demand. The selected active repository shows registration complete and available
inspection rather than a duplicate disabled Intake action. Draft switches use
the existing discard guard. This is the first operator-review slice of the wider
Repository repair batch, not full Repository operating acceptance.

Repository onboarding keeps that composition. A repository awaiting onboarding
has one primary **Continue onboarding in Registry** action and secondary
inspection. Creation/linkage results provide the same exact-identity handoff.
Registry reuses the actual details, source setup and activation workflows. The
obsolete prototype-local admission modal and writer are removed; historical
demonstration receipts remain read-only and cannot establish current readiness.

Registration keeps its content-sized form and shared fields. Purpose, Checking source changes, and Security policies group user decisions; metadata already known from custody
is read-only. Repository type fills internal category/role, and existing shared
Intake choice labels provide explanations. Advanced overrides and technical codes
stay available without dominating the main task. Form errors name missing choices,
owner-read failures retain input, and leaving edited details uses the shared guard.
Completed matching request answers can prefill a pristine form without overwriting
an edited draft or inferring a security decision. Existing check IDs remain exact.
Normal review facts use human labels; protocol/category/role/provider IDs remain
in technical details. Successful decisions lead to source setup or activation;
submission is visibly distinct from completion. First reads, preparation and
command progress show shared waiting feedback. Interrupted submissions retain
original identity, freeze the reviewed decision and offer original-request recovery.
Leaving an uncertain result is not labelled cancellation or an unsent draft.

### Primary Console activity controls (batch three preview)

The primary Console retains its own visual treatment. Governance Activity actions
reuse its existing View all activity pill style, including the routine-read toggle
and History pagination/export controls. The history launcher sits beside the panel
heading, the event toggle sits in the Recent activity header, and pagination sits
beside the history list it controls. Action groups wrap with explicit gaps. Shared
Workbench utility-button chrome is not imposed on these primary Console controls.
The existing dialog, filters, source wording and owner-history behavior remain.

The selected Focus Center priority expands technical details into its remaining
height. Exact metadata shares the selected priority's existing scrolling area,
rather than using a second compact list scroller or expanding the attention queue.

### Shared waiting feedback (batch three preview)

Operator-requested loading maintenance extends Teras with one shared waiting
pattern throughout the Console. First reads use a quiet amber signal, a concise
task label and neutral skeleton rows that reserve content space. Partial and
background reads retain visible content and use the inline variant. Active
buttons show the same small signal and preserve their existing action guards.
This is presentation feedback, never an invented percentage or completion claim.

Bind feedback to the actual local request state, not text matching, a global
network interceptor or a permanent business state such as awaiting approval.
Do not show empty results before the initial read settles. Failures and retained
source warnings replace loading feedback; existing recovery controls remain.
Long waits say that the response is still pending without claiming a timeout,
retrying a mutation or concealing an error. Motion uses transform/opacity only,
stops when unmounted and becomes static under reduced-motion preferences. Keep
the existing typography, panel chrome, navigation and workflow layouts.

Source changes stay in the unpublished maintenance batch for visual review.

Teras is the shared UI primitive layer. Operation domains compose surfaces
through Teras layout primitives and exposed component props. Domain-local CSS
is an exception only when inspection proves that no accepted primitive can
express a required composition or scroll boundary and the exception is
discussed first. It must never recreate shared panel, button, pill, register,
modal, filter, progress, guard, or selected-context chrome.

New visual primitives, modal sizes, panel treatments, action placement rules,
or reusable density variants require operator discussion before
implementation.

## Domain Shape Posture

- Delivery is a completed current-shape app-sized fullscreen workspace.
- Proposal is a completed current-shape compact focused workflow control modal.
- Repository is a completed current-shape compact focused repository control modal.
- Prototype is a completed current-shape compact control with a stable
  Prototype Dashboard and Preview Runtime surface.
- Product Portfolio is a completed current-shape fullscreen workspace.
  Products, Publication, Product Dashboard, and Curation operate over active
  product identity. The obsolete compact posture-control baseline remains
  revoked.
- Model Operations is a completed current-shape Compact Control with a stable
  profile dashboard, direct Workbench entry, normalized ownership tree, and
  focused domain guards. Purpose-profile requests use their existing live OOS
  integration. Epic 1313 stages Models & routing in the same Compact Control
  with existing Teras primitives; exact-source Security acceptance, commissioning
  and operating proof remain required for the extension.
- Orchestration is a completed current-shape fullscreen workspace with Home,
  Definitions, and Runs. Configured live mode now projects strict OOS
  definition and run truth, requests the admitted validation run after explicit
  source/approval review, and routes only currently available controls;
  disconnected preview remains explicitly local and is not durable evidence.
- Lifecycle Transitions now uses its accepted dedicated full-viewport Teras
  workspace. Runtime Readiness consumes separately admitted Platform observations and local
  host telemetry. Agent Console uses the separately admitted OOS/CGG request
  path. Their reviewed local integrations do not establish remote/team access,
  model entitlement or stage/production qualification.
  Authority decisions stay in the originating domain and the named authority;
  they do not add another Workbench visual profile.

Shape can differ by surface purpose. Visual language cannot drift.

## Operational Dashboard Preview

The operator authorized a Prototype Dashboard trial informed by the official
[Octopus project dashboard](https://octopus.com/docs/projects/project-dashboard)
and [Vercel deployment views](https://vercel.com/docs/deployments). It uses a
full-width project/next-action header, four substantial status cards, balanced
Runtime/source and Readiness/evidence panels, and a wide issues section. Existing
Teras neutral detail panels reduce competing emphasis; the four summary cards use
the primary amber rail treatment with header-aligned state pills and smaller
supporting facts grouped in a neutral inset card. Preview Runtime and Source Authoring remain primary actions
alongside the eligible workflow action. Source/handoff inspection retains a concise
purpose description. Exact references use the existing technical disclosure. One bounded
content region preserves natural panel heights and native scrolling. The trial
adds no theme, authority, analytics or workflow gate. Visual acceptance and coherent
batch publication remain pending; this is not a new live baseline.

Closure and Resume Closure are primary workflow-entry actions on this Dashboard;
View History and focused read-only inspections retain secondary emphasis.

## Delivery Repair Preview

The operator approved the Delivery inspection repairs in the existing uncommitted
UI batch. Preserve the six areas, native active/locked workflow components and
all owner gates. Repair readable table/board minimums, natural-height scrolling,
status semantics, dirty exits, and supporting-detail hierarchy. Delivery Home
regains an inline advisor using the existing governed Agent session and request
path with bounded Delivery context. No local scripted replies or new mutation
authority are introduced. Keep exact references available in technical details.
Architecture Packet retains its accepted JSON schema; this pass improves its
guidance and draft protection without replacing the authoring contract.

Home polish follows the existing shared patterns: the advisor switches Run to
Cancel during a request, and recorded Recent Activity uses `TerasTimeline` with
timestamp, original owner title and package context. Full source narrative and
exact actor/event/package/receipt references remain in technical disclosure.
The activity timeline sits inside a shared contained-list frame at the operator’s
request, with its existing internal scrolling.

Execution lane rows fill the board canvas so their native horizontal scrollbar
stays at its bottom while shorter lanes retain their natural height.

Execution action draft, review and receipt panels use the standard padded frame;
content must remain inside rounded edges and lower inputs must remain reachable
through the modal body scroll.

Visual review happens in preview before the combined batch is published.

## Baseline Visual Rule

The approved Orchestration maintenance preview keeps its three areas and shared
patterns. Home's attention queue fills the space below the compact service
summary; full service inspection opens on demand. Qualification checks retain
their natural height without an internal capped list. The advisor follows below
when necessary, with column scrolling rather than clipped primary content.
Registers preserve readable columns and scroll access; dashboards retain all
inspectors and exact evidence in technical disclosures. No new domain-local CSS,
visual theme, execution authority or runtime component is introduced.

Flat action panels use the standard panel gap between headings, facts and
buttons. Shared list and selector-rail insets leave room for hover lift and
keyboard focus at the first and last rows, while preserving the containing
panel's height and scrolling.

Live Delivery inventory status is owner-scoped read truth, not a blanket write
readiness badge. Each workflow owns its live operation checks and durable
evidence; Home must not describe a canonical OOS read as a prototype-local write
path or claim mutation authority from inventory visibility. Explicit disconnected
preview keeps local status. Read-only direct ART inspection, local tree drafting,
reviewed canonical apply and source-session start remain distinct actions.

No surface is visually baseline-approved unless it has:

- accepted domain or surface contract
- Teras primitive alignment
- coherent zone model
- source-of-truth and status semantics visible in the UI
- no stale legacy comparison path
- focused preview or validation proof


## Lifecycle inspection repair preview

Batch three reuses the existing full-viewport register and Teras components.
Readable project/next-owner rows keep Updated visible; raw versions move to the
selected Record details disclosure. Full route names, concise source status and
separate source-reported/owner-confirmed labels preserve meaning at narrow desktop
widths. Natural-height selected and evidence panels scroll as one existing stack;
event disclosures retain all exact references. No new CSS or primitive is added.

## Registry inspection repair preview

Batch three keeps Record/type, Owners and Status in one readable register.
Selected facts and natural-height lineage share the existing scroll stack;
exact evidence uses Teras technical details, and mutation/request/receipt labels
remain distinct. Retained source is visibly marked and new actions require a
current reconciled read. Existing discard guards protect authoring and do not
interfere with read-only history. Intake examples explain power-user fields
without guessing classification or granting new authority. No new visual
primitive, CSS or workflow service is introduced.

Guided Registry registration orders Purpose, Responsibility and Checks in existing
Teras trays. User-facing labels explain decisions; owner metadata, validation role
and evidence bindings are prepared automatically. Advanced role/check overrides
remain deliberate and inspectable. Automatic facts, operator intent and actual
passed validation stay distinct. No new CSS, modal size or visual primitive.

Registry forms follow the existing Workspace Intake pattern: standard-width,
content-height `TerasModalShell`, one scrolling body, grouped fields and footer
actions. Promotion, direct classification and record changes do not use wizard
shells, selected-subject banners, side panels or progress navigation. A necessary
metadata confirmation and each submission outcome use separate standard Teras
dialogs. Receipt/history details stay available through disclosures and original
request controls. Accepted requests remain submitted, not completed. The shared
wizard primitive remains unchanged for actual workflows elsewhere. This is
uncommitted preview maintenance, pending operator review.


## Dev Integration inspection repair preview

Keep the profile-centric workspace and the accepted Intent, Runtime Contract and
Review request stages. Live operations use the existing register/selected pattern;
connection facts and exact capability references use technical disclosures. Operation
history is scoped to the workspace, grows in ten-record increments and opens any
loaded original operation in the same standard details dialog. Owner events, receipt,
source version and exact request remain inspectable independently of the current
catalog. Counts describe loaded records and never imply a complete lifetime total.

Current, retained and design-preview records stay visibly distinct, including nested
profile/support dialogs. Natural-height Overview and request-review panels share the
existing scroll stack. Confirmation captures the reviewed profile and source; it
cannot follow a later selection or keep working after the owner removes that action.
Reuse Teras components without new CSS, modal dimensions or a shared wizard change.


## Governed Releases maintenance preview

Reuse the inventory table minimum widths and existing Dashboard zones. Natural
height and existing body scrolling keep reviewed values reachable at shorter
desktop sizes. Preserve the accepted release/runtime draft and review structure;
this is not a generic wizard conversion. Carry explicit sample provenance into
nested screens and label simulated actions accordingly. Group candidate/source
references in technical disclosure while retaining every exact value.

Connected product records and protected owner workflow navigation reuse the same
interface. Recorded evidence does not become executable workflow progress. Source
health, product capability, release state and runtime observation remain distinct.


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


Request fulfilment starts with the shared **Create new / Already created** method
control. Only the selected method's fields are visible. The creation action and
attachment selector are separate forms, with draft state preserved across method
switches. Attachment uses a known repository or a GitHub URL, automatic provider
identity lookup, explicit purpose acknowledgement and reviewed custody approval.
After success, one associated result is read-only with notes and confirmation;
multiple matching results use a selector. Owner unavailability stays explicit.

### Adding repositories

Repository Control's Add a repository panel offers separate **Create repository**
and **Link existing repository** entries. Standalone linking reuses the Proposal
attachment form's verified lookup and explicit approval, without a Proposal
association or fulfilment confirmation. It works before any record exists;
creation and linking retain independent capability gates. Known prior links
open the existing record. Success, pending lock, draft guard and retry identity
remain inside the existing modal and Teras patterns; no new wizard is added.

### Deferred application verification

Repository registration derives source-owner governance participation for an
application; application test-plan prose stays optional. Source controls and
application verification have separate status. Owner setup can begin with no
application suite or marker. Active repositories expose **Application
verification**, which loads the current reviewed plan and offers manual checks,
existing test commands or both. Saving uses the existing exact-source review
workflow, not direct profile mutation. Instructions never display as completed
tests. Independent source controls are retained.

The dialog title names the job: **Application verification** (or **Repository
setup** for initial controls), with the selected repository beneath it. The
current form or selected request precedes a bounded **Previous requests** list.
History rows distinguish setup from verification, readable status and update
time; request IDs and service action codes belong in Technical details. Opening
a retained request preserves its original identity. A finished request offers
**Start new verification change** or **Start new setup review** without altering
the original result. A completed source request never represents passed
application checks.

## Repository onboarding example

Explicit disconnected preview reuses the repository onboarding details form and
single review dialog with a labeled sample notes application. The sample can be
edited and its decision reviewed, but it cannot submit, run source setup, activate
a repository or read provider custody. No real repository or successful receipt
is implied. Live onboarding continues to require verified custody and current
workspace authority. No advisor is introduced by this review sample.

## Model maintenance preview

This batch retains the Model workspace's two pages and shared Compact Control
register/selection pattern. Purpose profiles remain the default page. The
Profile Dashboard leads with purpose, policy permission, permitted workflows,
reported blockers and the next useful action. Its existing checks and evidence
inspectors remain reachable; source identifiers belong in Technical details.
A bounded policy summary describes permission and activation, rather than
provider health or invocation activity. Profile lifecycle evidence is labelled
as profile change evidence.

Workflow routing separates model/connection, native reasoning or thinking,
health and inheritance into register columns. Review Routing uses a standard,
content-sized dialog. Its body scrolls when ordered fallbacks need more space;
source revision checks, model eligibility, boolean effort values, four-fallback
limit and draft guards remain intact. The default row is included in the shown
count but is not counted as a workflow.

Profile forms group purpose and usage separately from policy references. An
explicit action may reuse recorded references from an existing request, with
an applicability warning. It never copies identity, purpose, data choices or
approval. Pending submissions keep their original identity and cannot close;
unknown outcomes recover that original request. Browser recovery retains only
the request reference, not a copy of its context or policy intent. A failed
background read closes the authority gate and offers Retry; an independently
recorded submission is still shown as successful if the register refresh fails.

API connection setup selects the source-confirmed new connection and offers a
continuation to its exact model-registration context after a stored key is
reported. Keys retain their transient input and Platform custody boundaries.
Experimental provider qualification stays visible. Operation outcomes explain
what happens next while keeping source IDs and failure codes inspectable.
This is unpublished maintenance preview work pending operator visual review;
isolated browser responses prove interface behavior, not live account or
mutation qualification.

Disconnected Model preview exposes the same request, review, connection and
routing forms for visual inspection. Input and local draft navigation are
available, alongside labelled sample request and operation history. Final
submissions, provider/account changes, real discovery and key storage remain
disabled. Sample catalogue discovery stays in memory and never contacts a
provider. Preview samples are selected only by explicit disconnected mode;
missing or failed live authority must never select them.


The approved single-form refinement removes the request wizard and its progress
state entirely. Reuse the standard content-sized dialog with a scrolling body
and pinned actions. Workflow, name, purpose, reason, environment, data sensitivity
and optional extra rules are the normal inputs. Resolved technical references
remain read-only in Technical details. The integration-maintainer path is an
explicit separate choice, preserving full-reference capability. A result is a
separate compact dialog. Profile request help distinguishes user choices,
automatic preparation, missing setup and later review without claiming every
control is currently Active. Visual states were reviewed at1280 and1700 pixels;
operator preview approval still precedes publication.
