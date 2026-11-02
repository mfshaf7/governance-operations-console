# Governance Operations Console Design Profile

Status: graduated baseline design profile.

This file originated as the Prototype Studio design profile. The active visual
and structural rules live in the normalized contract set:

- [`system-design.md`](system-design.md)
- [`operation-workbench-contract.md`](operation-workbench-contract.md)
- [`teras-contract.md`](teras-contract.md)
- [`domain-contracts/`](domain-contracts/README.md)
- [`surface-contracts/`](surface-contracts/README.md)

## Visual Direction

The console is a calm operator control surface for governance work. It should
feel precise, dense enough for repeated operator use, and clearly structured
around decisions, status, records, and receipts.

It is not a marketing page, generic admin template, decorative dashboard, or
single-domain Delivery clone.

## Shared Visual System

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
