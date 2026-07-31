# Teras Contract

Status: accepted local-baseline UI primitive contract.

This contract and the executable guards under
`scripts/guards/shared/` define the active
primitive boundary. [`teras-normalization-worklist.md`](teras-normalization-worklist.md)
is an inspection record, not an API authority.

This file defines the product-neutral shared UI primitive contract for the
Governance Operations Console.

Teras is product-local shared UI infrastructure. It owns product-neutral
primitives only. Domain-specific read models adapt at the consuming edge.

## Ownership Boundary

Teras may own:

- panels
- panel headers
- panel collapse action groups and title-overflow handling
- trays
- action buttons
- action rows
- split action-row variants
- dialogs and modal shells
- status pills
- summary cards
- rail cards and neutral card grids
- register tables and cells
- search and filter toolbars
- segmented mode switchers
- text fields with optional prefixes, note fields, text-list fields, and selects
- field grids and field stacks
- selected-context panels
- metadata lists
- stat grids and stat items
- neutral lists, status items, and signal items
- durable history timelines
- rail status and metric buttons
- choice groups and selectable rows
- workspace navigation buttons
- workflow hub frames and hub panel slots
- surface dashboard layouts
- advisor panels
- progress step selectors and step lists
- selected-action choice groups and detail panels composed from Teras primitives
- configuration/control layouts
- setup and readiness compositions assembled from neutral primitives
- activity log panels and full-log viewers
- empty states

Teras must not import Proposal, Repository, Delivery, Prototype, Portfolio,
Risk, Orchestration, Lifecycle Transitions, Runtime, Model Operations, or
Agent Console read models.

Teras must not own product-app-specific primitives. Tree node cards, tree
children, tree stacks, tree toggles, tree viewer/editor/selector behavior, and
tree-specific visual language belong to the Build Tree product app. Control
Board lane, package card, progress, and family-map dashboard shapes belong to
the Control Board product app. Context Board drawing and snapshot workbench
behavior belongs to the Context Board product app. Consuming domains use public
product-app APIs and adapters instead of promoting those shapes into Teras.

## Collection And Event Rules

`TerasList` owns neutral collection geometry, optional contained framing,
tokenized internal scrolling, and list semantics. It does not own row meaning
or external spacing. Empty states are alternatives to a list and must not be
rendered as list items.

Use:

- `TerasStatusItem` for a labeled state/check/evidence row with one semantic
  tone shared by the row and its status pill
- `TerasSignalItem` for a compact issue, event, action, or evidence summary
  with optional status or action content
- `TerasTimeline` plus `TerasTimelineItem` only for durable, ordered history
- `TerasActivityLogPanel` for operational command/apply/runtime output

`TerasTrayStack` remains the arbitrary-content composition stack. It must not
be used as a list substitute, and it accepts tokenized scroll heights rather
than caller-defined CSS sizes.

The retired checklist, signal-list, checkpoint, and timeline-row families must
not return. Consumers compose saved checkpoints from the neutral list and item
contracts instead of introducing a one-consumer primitive.

## Primitive Integrity

Using a Teras primitive means inheriting the primitive's visual state contract,
not only importing the component.

After an explicit surface discussion accepts a domain-specific exception,
domain CSS may:

- place a primitive in a local grid or panel
- set local width, height, min-size, gap, margin, or scroll ownership around
  the primitive
- pass product-neutral primitive props such as tone, read-only, density,
  selected, disabled, layout, accent, field density, spacing, title overflow,
  or className when exposed
- request a product-neutral Teras variant when repeated layout pressure proves
  the primitive needs one

The consumer must first try the accepted Teras layout and component APIs. A
local CSS file is not the default composition layer and is not justified by a
minor spacing, density, or sizing difference.

Domain CSS must not:

- target generated Teras internals
- override primitive-owned editable, read-only, disabled, selected, hover,
  focus, pill, button, panel, field, or fact-row chrome
- create hidden local variants that appear to be using Teras
- copy primitive chrome into a domain module to work around a primitive gap

## Visual Invariants

Every Operation Workbench shape must respect shared console visual language:

- panels, rails, trays, status pills, summary cards, action buttons,
  registers, filters, segmented mode switchers, modals, progress selectors,
  setup and readiness compositions, guards, navigation buttons, and advisor
  panels follow
  accepted Teras treatment when the pattern applies
- spacing, typography weight, button sizing, selected treatment, hover,
  disabled, read-only, warning, blocked, stale, and done states use the shared
  vocabulary
- accepted domain CSS exceptions compose only the boundary that Teras cannot
  express and do not recreate shared chrome
- new visual primitives require discussion before implementation

Shape flexibility is normal. Visual-system exceptions require an explicit
record.

## Panel Frame Rules

`TerasPanel` owns common panel-internal frame rows when the shape is a
product-neutral panel structure. Use the `layout` prop instead of local
`grid-template-rows` for these accepted frames:

- `header-body`
- `header-toolbar-body`
- `header-body-footer`
- `header-toolbar-body-footer`

Use `overflow`, `spacing`, and `density` only when the surrounding domain needs
the product-neutral variant. An explicitly accepted domain CSS exception may
still own grid placement, exact surface sizing, register/control minimums, and
intentionally local spacing around child content when Teras cannot express
that boundary.

Register panels use `TerasRegisterPanel` for the standard header, filter bar,
and scroll-owned table/list body frame. Use `density="normal"` for app-sized
or Delivery-style registers and `density="compact-control"` for focused
compact control registers.

Record control surfaces use `TerasRecordControlLayout` for register-owned
first-screen structure. Supported modes are `register-only`,
`register-selected`, and `overview-register-selected`; callers must choose the
mode that matches the surface instead of recreating local register/selected
grid CSS. Every caller must also choose one accepted composition:

- `composition="compact-control"` pairs with
  `TerasRecordControlOverviewGrid` and keeps the selected/ingress rail at the
  fixed product-neutral `430px` width.
- `composition="fullscreen-register"` keeps the register dominant and uses the
  responsive `minmax(340px, 0.36fr)` selected inspector shared by Delivery,
  Product Portfolio, and Orchestration.

The primitive does not expose arbitrary side widths. New proportions require
an explicit Teras composition decision instead of a domain-local override.

Compact control top rows use `TerasRecordControlSummaryPanel` for the
summary/status side and `TerasRecordControlActionPanel` for the
ingress/request/action side. Domain code supplies metrics, workspace-status
models, copy, receipt text, and command handlers; it must not recreate the
panel frame, five-card summary grid, compact status detail dialog, boundary
tray, receipt tray, or action-row spacing locally.

Segmented mode switchers use `TerasSegmentedControl`. The default size is for
compact workflow, register, and board mode changes. The `large` size is for
roomier control or dashboard modals where the switcher is a primary navigation
surface and needs stronger touch and scan affordance.

Every `TerasModalShell` caller declares `width`, `height`, and `bodyLayout`.
Every `TerasDialog` caller declares `width`, `height`, and
`contentOverflow`. Geometry has no implicit caller defaults.

First-class dashboards, active workflow sessions, control surfaces, and
workspaces use stable shell height. Their header and footer stay fixed while
panels, lists, logs, and other bounded content regions own internal scrolling.
A workflow hub is a bounded overview and launcher, so it uses content height;
the active workflow opened from it uses stable fill height. Compact request,
mutation, information, guard, and confirmation surfaces also use content
height within the shared viewport cap. Empty states and short result sets do
not select a smaller shell than populated states for the same operator job.

## Zone And Modal Rules

Common accepted shapes:

- focused control modal: top summary/capture or status/action zone, then
  register plus selected-record launcher
- configuration/control surface: selector rail, current values, and selected
  inspector/mutation column for backend-owned catalog or metadata controls
- workflow hub modal: selected record, current required move, current status,
  progress, receipt archive
- active workflow modal: progress/current-move strip, selected subject anchor,
  work body, optional advisor/context column, footer actions
- fullscreen workspace: summary/header, internal nav when needed, one active
  surface, panel-owned scroll regions

`TerasZoneLayout` owns constrained multi-zone operation layouts. Use
`variant="main-aside"` for the standard guided-operation body where the main
zone is dominant and the aside still carries real content. Use
`variant="main-support"` for compact guided bodies with a narrower optional
support zone. Dashboard-like primary/side bodies use `TerasPrimarySideLayout`.
Selector/value/inspector configuration surfaces use
`TerasSelectorValueInspectorLayout`. Domain code must not pass arbitrary
grid-template strings for these standard shapes. Every direct
`TerasZoneLayout` consumer declares its variant explicitly.

Each direct `TerasZone` declares `fit="fill"` or `fit="content"`.
`fit="fill"` assigns the remaining height to the final child while preserving
natural height for preceding children. `fit="content"` keeps every child at
natural height. Callers must not describe CSS track mechanics in the public
API.

`TerasContentFrame` owns guided operation frames around a progress/current-move
strip and the active work body. Use its `standard` and `single-region`
variants explicitly instead of local shell CSS or a hidden default.
`TerasContentRegion` owns nested fill, gap, and internal scroll behavior.
Scroll regions must preserve natural row height and scroll the region rather
than squeezing child panels. Domain code supplies the content; Teras owns the
frame rhythm.

Vertical panel compositions use `TerasPanelStack fill="first"`,
`fill="middle"`, or `fill="last"` to name the child that owns remaining
height. Use `bounded` with the same position vocabulary only when one child
needs a tokenized internal scroll cap. Callers must not pass child counts,
mutable/final aliases, or child-level stack markers.

`TerasContentTray` keeps natural height by default. Use `fit="fill"` only when
its body must consume the remaining height allocated by its parent. Tray
callers must not expose the tray's internal row-track sequence.

`TerasFullscreenSurfaceFrame` owns fullscreen workspace shells with a summary/header
slot, nav rail slot, and active surface viewport. Domain code supplies the
summary model, nav items, active surface, and routing callbacks. It must not
recreate the fullscreen workspace grid, nav-rail sizing, main viewport sizing,
or responsive collapse locally.

`TerasPrimarySideLayout` owns primary-side slot surfaces that use a
primary top slot, primary fill slot, bounded side slot, and side fill slot.
Domain code supplies panels, read-model projections, and callbacks. It must
not recreate the dashboard split, side-column sizing, fill-slot sizing, or
responsive collapse locally. The side column uses the shared `430px` side
width so dashboard/status panels do not wrap into clipped actions.

`TerasSelectorValueInspectorLayout` owns selector-value-inspector surfaces that use the
selector rail, current-values body, and selected inspector pattern. Domain code
supplies the selector, value table/list, selected inspector, and mutation
dialogs. It must not recreate the outer three-zone configuration frame locally.
Use `TerasSelectorRailList` inside the selector rail for the standard
config-control selector list rhythm, spacing, and scroll treatment.

Modal rules:

- use `TerasDialog` for passive inspection, reference, information, guard, and
  confirmation dialogs that do not own a workflow transition surface
- passive information/reference dialogs omit `actions` when the only action
  would be `Close`; the header close affordance is enough. Guard,
  confirmation, inspect, export, recovery, and workflow-routing dialogs may use
  dialog actions because they carry real decisions or secondary actions.
- artifact, evidence, and reference dialogs must not own navigation to the
  next workflow step. Workflow routing belongs to the workflow shell, progress
  step selector, current-required-move panel, hub, or workflow footer. An
  artifact dialog may expose artifact-specific actions such as inspect, export,
  or view source details, but it must not become a hidden step router.
- full log viewers opened from panels inside operation modals must render as a
  top-layer dialog so the overlay, blur, and focus boundary cover the full
  screen rather than only the parent panel or modal region.
- fullscreen media, snapshot, and log viewers should not include a visible
  footer `Close` action. The header close affordance owns dismissal; footer
  actions are reserved for real viewer actions such as fullscreen, export, or
  copy.
- use `TerasModalShell` for workflow, request, mutation, receipt-producing, or
  workspace modal shells
- choose `TerasDialog`, `TerasModalShell`, or a workspace shell from the
  operator job, not from the desired dimensions; modal size is selected
  separately
- workflow, request, mutation, and dashboard shell titles name the stable
  operator job. Selected-record identity belongs in a subject/context panel.
  A dynamic shell title is reserved for passive object inspection where the
  object itself is the job, such as a media or tree artifact viewer
- register-entry action, request, capture, review, or receipt-producing shells
  opened from a register/control surface use `Back To Register` for the
  non-mutating footer return action. Nested step shells may use `Back` when
  returning to the previous modal step. Do not apply this wording rule to
  workflow session footers or guard dialogs.
- nested stable controls opened from a dashboard surface may use
  `Back To Dashboard` for the non-mutating footer return action
- compact request or mutation drafts use
  `width="standard" height="content" bodyLayout="scroll"` unless their
  content genuinely requires a wider bounded shell
- primary focused-control workspace shells are not compact request/mutation
  drafts. Approved main containers such as Proposal Control and Repository
  Control keep their explicit shell size unless the operator approves a
  workspace-level size change.
- guided sessions use `height="fill" bodyLayout="fill"` so their shared frame
  owns a stable body and bounded child regions own scrolling
- choose the smallest product-neutral modal size that gives the work enough
  space
- keep footer actions visible and unobstructed
- avoid document-level scrollbars while fullscreen or workflow modals are open
- use panel-owned or bordered-list internal scrolling for long content
- do not enable internal scroll chrome for short dashboard/list content that
  already fits its panel; omit `TerasList.fit` and `scrollHeight` in those
  cases

## Panel Rules

Primary workflow action panels use `treatment="rail"` with a semantic `tone`.

Use rail treatment for selected workflow context, current required move, gate
or readiness review, apply/record action review, selected-value inspectors,
workflow progress, and panels that decide the next workflow move.

Use `treatment="state"` with a semantic `tone` when a panel body itself tracks
editable, evaluative, or actionable state but is not the primary command cue.

Use `treatment="neutral"` without `tone` for facts, read-only detail, source
context, status summaries, queue/list bodies, activity/history content, and
supporting context that does not own or track the next move.

Every direct operation-domain `TerasPanel` consumer declares `frame` and
`treatment` explicitly. Treatment follows content semantics rather than visual
position.

Panel content must be grouped by meaning. Avoid separator-only content, flat
fact piles, stretched tile actions, and prose-only panels.

Use `TerasPanel collapsed` for header-only or title-only panel states that
should keep shared collapsed padding and zero-gap treatment. Domain CSS must
not recreate collapsed panel padding.

## Action Rules

The current required move must be visible in content, not only in a footer.

`TerasActionButton` is the standard command button. Dialog footers, workflow
footers, register row actions, and first-class mutation controls use this
button directly; Teras does not keep a separate dialog-button alias.

`TerasActionRow` owns action alignment. Use it for footer and panel action
placement instead of local flex rows.

`TerasPanelActionLayout` owns compact panel header/action pairing. It is a
placement primitive, not a command button.

`TerasUtilityButton` owns contextual utility controls such as view, export,
expand, or open-log actions. Use `variant="emphasis"` for first-class panel
utilities and `variant="subtle"` for low-emphasis toolbar utilities. Use
`TerasUtilityButtonGroup` only when a utility grid is the approved layout.

Panel action rows:

- use natural-width shared buttons
- sit after the content
- keep normal panel bottom padding
- align primary actions to the right
- use action-specific labels
- show unavailable mutation actions with disabled and visibly muted treatment

Guided-session footers carry session navigation plus the contextual
continuation action. They do not replace in-content readiness/action panels.

## Field Rules

Text fields with optional prefixes, note fields, text-list fields, and select
fields use Teras-owned field chrome.
Domain CSS may place fields in local layout, but it must not restyle the field
button, input, textarea, prefix token, hover, focus, disabled, or menu
treatment.

Use `TerasSelectField` with `treatment="primary"` and the appropriate neutral
tone when a workflow needs a select control to behave as the primary choice in
that step. Do not create a local button-looking select by targeting field
internals from a domain stylesheet.

Use the Teras field props for product-neutral pressure:

- `accentRgb` for an approved local subject accent, such as tree-node kind
  color
- `density` for compact or editor-sized fields
- `fill` when a note field should consume an explicitly allocated flexible
  body slot
- `spacing` when a field must sit in an existing panel rhythm without adding
  its default top offset

Use `TerasTextField` with its `prefix` prop when the editable text has a locked
prefix and an editable suffix. Do not recreate that split with a local
label/input grid.

Use `TerasFieldGrid` for horizontal field grouping and `TerasFieldStack` for
vertical field grouping. Use `TerasFieldStack layout="auto-fill-auto"` when a
form has fixed-height fields above and below a flexible editor or note field.
Do not recreate that fixed/fill/fixed field-stack behavior in domain CSS.

## Choice And Rail Rules

Use `TerasSelectableRow` for compact option selection when a row needs a label
plus optional detail and optional status. The primitive owns selection,
disabled, hover, focus, and tone treatment. Its parent owns list, tray, grid,
and spacing geometry. It is not a metric card and not a final
workflow-decision group.

Use `TerasChoiceGroup` when the operator is selecting one decision from a
small peer set, such as disposition route, recovery action, movement target, or
prototype lifecycle decision.

`detail` and `status` are optional. If `status` is omitted, the trailing status
is hidden. If `detail` is omitted, the row remains one-line. Use
`TerasRailButton` when a status or metric rail is first-class clickable
content.

Accepted rail-button variants:

- `variant="status"` for a clickable status rail with label, detail, and status
  pill.
- `variant="metric-split"` for a clickable rail where the metric/count is
  first-class content.

Record-control summary status signals are internal to
`TerasRecordControlSummaryPanel`. They are not part of the public action
primitive API.

## Register And Filter Rules

When a domain has multiple records, use a standard register or list before deep
workflow work.

Registers own search, material filters, row status, source facts, one clear
row action, bounded internal scrolling, stable column intent, compact row
actions, and long-value handling.

Registers must not own final workflow decisions, multi-step mutation drafts,
receipt history, unrelated panels, or duplicative gate columns.

Search and filters use the shared grouped filter treatment. Search and filters
sit in one aligned toolbar without a redundant label above the search field.
The shared filter group supports up to three filters unless a new variant is
approved.

`TerasRecordTable` is the table foundation. Domain tables must use a named
profile instead of local table chrome when the profile applies:

- `profile="register"` for record registers with a primary record column,
  optional secondary/evidence columns, one status column, and one row action
- `profile="value-matrix"` for configuration/control value tables such as
  catalog current values, where the primary value column gets the working
  width and status, metric, and action columns stay compact
- `profile="inventory"` for dense technical inventory tables; current native
  inventory tables remain pre-baseline migration targets until their owning
  surface is picked up

Table columns use product-neutral intents: `index`, `primary`, `secondary`,
`evidence`, `status`, `metric`, `action`, `technical`, and `chips`. The table
primitive owns standard width, alignment, vertical rhythm, hover, selected
row, keyboard focus, sticky header, compact density, and scroll frame behavior
for those intents. Domain code supplies display-ready cell content, row ids,
selection handlers, action handlers, and source-specific projection only.

Domain CSS must not recreate table shell, sticky header, row hover, selected
row, action-cell alignment, status/metric column alignment, index styling, or
profile-owned column widths. Domain CSS may place a table in a local grid or
choose a product-neutral table profile and density.

## Summary And Status Rules

Summary cards are allowed only when the counts are meaningful. Do not show
placeholder cards to preserve a shape.

Workspace status signals are global read-model posture only. Current accepted
signals are:

- Backend
- Projection
- Write Path
- OOS

Clickable status opens only scoped detail. Workspace status must not show
selected-record facts, route choices, workflow history, or package-specific
receipts.

## Selected Context Rules

Primary register-side selected panels use the grouped `TerasSelectedPanel`
primitive.

Use:

- `variant="compact"` for focused control surfaces such as Proposal and
  Repository, and for Prototype while it is admitted as a focused control
  modal
- `variant="rich"` for Delivery-style package register side panels

Hub selected-context panels are not register side panels. They keep the
hub-owned panel/header shape and may use `TerasMetadataList` with
`shape="line"`, `treatment="chip"`, and `wrap` when identity chips are needed.

Reusable metadata remains available through `TerasMetadataList`. Required
action content inside a register-side selected panel is supplied through the
`TerasSelectedPanel` action model; required action content elsewhere uses a
rail-treated `TerasPanel`, `TerasPanelHeader`, and `TerasActionRow`
composition. Do not hand-assemble either shape into a primary register-side
selected panel when `TerasSelectedPanel` applies. Metadata must be projected
as structured `items` arrays, not JSX fact children. Domain JSX should receive
those arrays from a typed view-model/helper function rather than constructing
`items={[...]}` or raw `.map(...)` metadata rows in the render path.

## Operation Hub Rules

Use `TerasHubFrame` when a domain hub follows the selected-record,
current-required-move, current-status, progress, and receipt/archive shape.
The frame owns the two-column hub skeleton, hub panel slot sizing, and progress
step-list spacing. The consuming domain owns the selected-record projection,
status facts, current move, step availability, command routing, and history
target.

Do not recreate hub grid, hub column, hub action panel, hub progress panel, or
hub step-list chrome in domain CSS when `TerasHubFrame`,
`TerasHubPanel`, and `TerasHubStepList` fit.

Use `TerasProgressStepList` for workflow step strips when the domain renders
more than one workflow step. The list owns selector spacing and may use the
fixed-column `columns` variant for approved workflow-shell strips. Use
`TerasProgressStepSelector` directly only for specialized hub composition where
the hub primitive owns the list container. Domain CSS must not target the
selector's internal button, title, or detail elements.

## Progress And History Rules

Progress panels show primary workflow steps only.

Hub history appears as a separate receipt/archive action panel, not as a
mutable progress step. Active workflow sessions may expose history as a
read-only route after apply/record completion.

Progress labels stay simple:

- `Current`
- `Next`
- `Locked`
- `Done`
- `Archive`

Connector chrome is for active workflow step strips only. Hub progress panels
do not use connector chrome.

## Setup And Readiness Rules

Use a setup/readiness composition when a workflow must start from a preset or
support profile, review several requirement rows, edit row state out of order,
and understand generated outputs before recording the move.

Build that composition from shared primitives:

- `TerasSelectField` or `TerasChoiceGroup` for the profile decision
- `TerasList` and `TerasStatusItem` for requirement/readiness rows
- `TerasSelectableRow` only when a requirement row itself is selectable
- `TerasContentTray` or `TerasMetadataList` for bounded generated output
- `TerasWizardPanel` for the owning workflow panel

The consuming domain owns:

- source read model
- draft state and dirty comparison
- row state semantics
- command and receipt handling
- guard behavior when draft edits are not recorded

Do not recreate setup rows, selected-row inspection, or generated-output
chrome in domain CSS when these shared primitives compose the required shape.

## Draft And Guard Rules

Editable workflow steps use parent-owned session draft state. Autosaved but
unapplied drafts use the shared close guard. Recorded, read-model-projected, or
source-projected steps become read-only.

Do not reinvent a domain-local dirty guard when a shared Teras or Delivery
workflow guard already fits.

## Advisor Rules

Advisor panels are not default Operation Workbench furniture.

Use an advisor only when the step has a concrete draft-assist job, the context
boundary is explicit, output remains operator-reviewed draft state, and the
advisor does not compete with modal actions.

## Activity Log Rules

Embedded runtime, apply, command, and receipt logs use `TerasActivityLogPanel`.
When a log needs a larger readable view, pass the panel's `fullLog` option so
Teras owns the `View Full Log` affordance and dialog composition.

The activity-log primitive owns its internal full-view composition. Do not
nest a second `TerasActivityLogPanel` inside a `TerasDialog`, because the modal
already owns the title, description, and actions. Domains provide rows,
full-view facts, and optional export actions through `fullLog` only.

History/archive timelines use `TerasTimeline` plus `TerasTimelineItem`.
Receipt and archive metric collections use `TerasStatGroup` plus
`TerasStatItem`. Domain CSS may place the surrounding panel but must not
recreate row, list, stat-card, scroll, or responsive grid chrome.

Summary metrics use `TerasSummaryCard` and `TerasSummaryCardGrid`. The
`prominent` variant is the approved larger compact-control summary-card shape;
do not introduce domain-named summary-card variants for Proposal, Repository,
Prototype, or future compact controls.

Non-summary card collections use `TerasCardGrid`. Do not create surface-named
card grid wrappers such as dashboard, proposal, repository, or prototype card
grids when the grid only arranges neutral Teras cards.

Framed content sections use `TerasContentTray`. Use `TerasTrayStack` only for
arranging trays or related content; it must not become a second framed content
primitive. Status facts are structured data and should project through the
owning status surface or `TerasMetadataList`, not through a separate
status-fact component family.

## Dialog And Modal Rules

Use `TerasModalShell` for first-class surfaces, workflows, request surfaces,
and action surfaces. These surfaces own a stable header/body/footer contract
and may change operational state.

Use `TerasDialog` for secondary overlays: passive details, reference
inspectors, guard prompts, archive/history viewers, log viewers, media
viewers, tree viewers, and narrow action inspectors. Callers select dimensions
with the product-neutral `width`, `height`, and `contentOverflow` props rather
than semantic shape aliases. Passive information, guards, confirmations, and
narrow inspectors normally use content height. Archive, history, media, tree,
and full-log viewers use stable height when they own a bounded internal
viewport.

Keep specialized wrappers only when they own behavior, not just styling. The
approved wrappers are `TerasDraftCloseGuardDialog` for dirty/leave guards and
`TerasMediaSnapshotViewerDialog` for media export/fullscreen behavior. Full log
dialogs remain owned by `TerasActivityLogPanel` through `fullLog` or by
`TerasActivityLogDialog` when a caller already owns the open state.

## Promotion Rule

A local component is a Teras promotion candidate when:

- two or more domains need the same shape
- the shape is product-neutral
- the state contract can be named without domain language
- the component can accept domain data through props instead of imports
- the visual behavior can be guarded by preview or focused tests

If a new primitive or variant is needed, pause for discussion before
implementation.

## Sources

- `operation-workbench-contract.md`
- current console Teras component implementations in the source tree
