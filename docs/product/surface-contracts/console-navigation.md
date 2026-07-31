# Console Navigation And Workspace Entry Contract

Status: accepted current-shape information architecture. Direct workspace
cutover and obsolete inline-host removal are complete.

Architecture recommendation outcome:

- `replace` the current main-Console embedding of Lifecycle Transitions and
  Environment Lifecycle
- `reuse` the existing Operation Workbench launcher, registry, selector state,
  and workspace host
- `extend` Console Shell with one grouped floating navigation and a focused
  workspace-modal controller
- `reuse` Teras only inside the focused operational workspaces launched by that
  navigation
- create no new domain, backend service, authority, or persistence boundary

## Purpose

Console navigation keeps the overview cockpit short while giving growing
operational capabilities enough room to work. It is a viewport-fixed dock that
remains available while the operator scrolls the main Console. The navigation
itself belongs to Console Shell and keeps the Console's softer visual language.
It is not a Teras surface.

The navigation structure is:

```text
OVERVIEW
  Console

WORK
  Operation Workbench
    Proposal
    Repository
    Delivery
    Prototype
    Portfolio
    Model
    Orchestration
  Lifecycle Transitions

ENVIRONMENT
  Dev Integration
  Governed Releases
```

Group headings are non-interactive taxonomy. `Operation Workbench` is an
expandable launcher group. The actionable entries use one of three explicit
entry modes:

- `anchor`: focus the main Console
- `workbench-domain`: open one existing focused domain workspace directly
- `workspace-modal`: open a dedicated full-viewport operational workspace

## Entry Responsibilities

### Console

`Console` is an `anchor` entry. It returns focus to the top of the main Console
without replacing or remounting the Console.

Console retains the current Command Center composition, Runtime Readiness,
Agent Console, Governance Activity, and existing Operation Workbench quick
launcher. It does not retain expanded Lifecycle Transitions, Dev Integration,
or Governed Releases registers.

### Operation Workbench

`Operation Workbench` is an always-available expandable launcher group. It
exposes one `workbench-domain` child entry for each domain in the authoritative
Workbench registry:

- Proposal
- Repository
- Delivery
- Prototype
- Portfolio
- Model
- Orchestration

Selecting a child opens that focused workspace directly. It never scrolls back
to the inline Workbench launcher first. The dock group remains available while
the main Console scrolls, including when the inline launcher is outside the
viewport.

The dock group and inline launcher intentionally coexist as two launcher
projections over the same authoritative:

- typed domain registry
- active Workbench selection
- repository focus context
- exhaustive workspace host
- close behavior

The dock group must derive its children from the typed registry rather than
hard-code another domain list. It does not create a second Workbench page,
directory, workspace host, route map, or domain state.

### Lifecycle Transitions

`Lifecycle Transitions` is a `workspace-modal` entry. It opens a dedicated
full-viewport Teras workspace containing:

- route and transition summary
- transition register, search, and filtering
- validation, admission, and application posture
- immutable receipt history
- current-owner and owning-surface routing

The workspace remains read-only coordination and observability. It does not
approve, reject, apply, retry, or mutate source and target records. Actions
route to the source domain, target domain, named authority, or Orchestration.

### Dev Integration

`Dev Integration` is a `workspace-modal` entry. It opens a dedicated
full-viewport Teras workspace for its profile register, Profile Dashboard,
profile request workflow, runtime operations, stage handoff, operation history,
logs, and receipts.

### Governed Releases

`Governed Releases` is a `workspace-modal` entry. It opens a dedicated
full-viewport Teras workspace for its product register, Product Release
Dashboard, product-supported release actions, runtime-lifecycle actions,
operation history, logs, and receipts.

Environment Lifecycle remains the architecture boundary that owns the two
subjects. It is represented in navigation by the non-interactive
`ENVIRONMENT` group and does not gain a redundant landing page.

## Full-Viewport Justification

Lifecycle Transitions, Dev Integration, and Governed Releases each own a
register that can grow independently plus focused details, history, logs, or
workflow surfaces. Keeping those registers inline would make the main Console
progressively longer and would mix cockpit scanning with sustained work.

A full-viewport workspace modal is therefore justified for all three:

- the main Console remains a stable overview and launch surface
- the operational register can use a bounded viewport and internal scrolling
- details and workflows remain visually subordinate to their owning workspace
- closing the workspace returns the operator to the prior Console position
- the global Console navigation remains visible behind the focused layer and
  does not become workspace-local navigation

## Navigation And Modal Behavior

- `Console` is the initial entry.
- The grouped floating navigation remains fixed in the viewport while the main
  Console scrolls.
- `Operation Workbench` and its direct domain launcher remain available in that
  dock regardless of the inline launcher's current viewport position.
- One navigation entry is active at a time.
- The `Console` anchor restores the main Console view.
- Workbench-domain entries launch their existing focused workspace directly.
- The Workbench parent is active while one of its domain children is open; the
  matching child carries the selected state.
- Workspace-modal entries open one focused modal at a time.
- Opening or closing a workspace does not discard canonical or prototype-local
  capability truth.
- A dirty workflow draft must resolve through its existing guard before its
  owning workspace closes or another workspace replaces it.
- Dashboards, workflows, logs, confirmation dialogs, and Workbench-local
  sections remain layered task surfaces. They do not become global navigation
  entries.
- Existing Workbench-local navigation remains owned by each full-screen
  workspace.
- The floating Agent Console remains global and receives the active Console or
  workspace context candidate. Its own policy decides whether that candidate
  is model-eligible.
- Navigation labels and active state are not lifecycle or authority state.

## Presentation Ownership

Console Shell owns:

- grouped floating navigation composition and Console visual styling
- active navigation-entry state
- Console focus and Workbench-domain direct-launch routing
- focused workspace-modal selection and mounting
- prior Console position and return behavior
- cross-workspace dirty and close guards
- active-context propagation

Teras owns only the focused workspace presentation:

- full-viewport workspace modal and internal layout primitives
- panels, registers, filters, status, selected context, logs, and dialogs
- interaction and state treatment inside the operational workspace

Operation Workbench owns its inline launcher, typed domain registry, and
workspace host. Console Shell projects the registry into the dock launcher and
routes child selection through that existing host.
Lifecycle Transitions and Environment Lifecycle own their workspace content,
read models, work models, and workflow state.

Console application navigation and `TerasSurfaceNav` are distinct. Console
navigation selects or focuses major Console capabilities and retains the
Console visual language. `TerasSurfaceNav` selects sections inside one focused
workspace. Teras must not own or style the Console application navigation.

## Source Structure

```text
src/
  console-shell/
    navigation/
      console-entry-model.ts
      console-primary-navigation.tsx
    presentation/
      console-workspace-modal-host.tsx
    use-console-shell-controller.ts

  lifecycle-transitions/
    presentation/
      workspace/
      surfaces/

  environment-lifecycle/
    presentation/
      dev-integration/
        workspace/
      governed-releases/
        workspace/
```

Folders are introduced only when their owned implementation exists. This tree
does not authorize empty scaffolding, convenience barrels, or a Teras
application-navigation primitive.

## Cutover Result

The Console-styled grouped navigation, direct domain launch, focused workspace
controller, Lifecycle Transitions workspace, Dev Integration workspace, and
Governed Releases workspace are mounted. Direct Workbench launch,
selected-child projection, context propagation, dirty guards, modal
replacement, and return behavior use the accepted controller path.

The obsolete inline Lifecycle Transitions and Environment Lifecycle
presentations are removed. They must not return as compatibility paths.

## Non-Goals

This change must not:

- restyle Console navigation with Teras
- create a second Operation Workbench page, registry, or workspace host
- move Lifecycle Transitions or Environment Lifecycle into Operation Workbench
- create an `Environment Lifecycle` landing page
- remove the Console Workbench quick launcher
- duplicate Workbench domain identity, selection, or workspace-host state
- change domain lifecycle, transition, profile, product, operation, or receipt
  semantics
- add live backend wiring, canonical mutation, identity, or authorization
- redesign accepted Workbench workspace internals
- add navigation entries for dialogs, dashboards, tabs, or individual
  workflows
