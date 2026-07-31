# Product App Boundaries

Status: active extraction contract, not standalone product admission.

This record defines how reusable product tools inside the Governance Operations
Console can become independent from Operation Workbench domains without
breaking the current prototype.

## Current Decision

Context Board, Build Tree, and Control Board are incubating product apps
currently hosted by Delivery.

Delivery is their first integration customer. Delivery does not own their
long-term app internals.

Current no-visual-change extraction keeps product-app cores under:

```text
src/product-apps/context-board/
src/product-apps/build-tree/
src/product-apps/control-board/
```

Delivery-owned app adapters live under:

```text
src/domain-workspaces/delivery/product-adapters/context-board/
src/domain-workspaces/delivery/product-adapters/build-tree/
src/domain-workspaces/delivery/product-adapters/control-board/
```

These apps remain source modules inside the Governance Operations Console owner
repository. They are not separately admitted product repositories, platform
components, Teras primitive families, or runtime services.

## Boundary Rule

Product app core code must not import Delivery, Work Design, OpenProject, ART,
or Operation Workbench domain internals.

Delivery may consume product apps only through public product-app APIs and
Delivery-owned adapters.

Build Tree owns the tree product surface and tree-specific UI primitives: node
cards, node children, node stacks, node toggles, tree documents, traversal,
selection, expansion, read-only viewing, editable tree authoring, structured
tree display, inline tree display, metadata/detail slots, and tree-specific
controller behavior. Delivery owns the meaning of the tree through adapters:
Epic, Feature, User story, Risk, ART package, package metadata, and workflow
receipt mapping must not leak into the Build Tree core. Teras remains the
neutral console primitive layer and must not own tree-specific components.

Control Board owns package lane, package card, package progress, family-map,
and ART-tree host dashboard shapes. Teras may provide neutral panels, status
pills, empty states, buttons, and layout primitives used inside Control Board,
but Control Board-specific card/lane composition must stay in Control Board.

Allowed dependency direction:

```text
product-apps/context-board -> Teras or neutral app utilities
product-apps/build-tree -> Teras or neutral app utilities
product-apps/control-board -> Teras, neutral app utilities, or Build Tree public viewer APIs
delivery/product-adapters -> product-app public API + Delivery read/application models
delivery/presentation/workflows/work-design -> product-adapters + product-app public API
delivery/presentation/surfaces/execution-board -> product-adapters + product-app public API
```

Forbidden dependency direction:

```text
product-apps/* -> domain-workspaces/delivery/*
product-apps/* -> domain-workspaces/delivery/read-model
product-apps/* -> operation-workbench/*
product-apps/* -> private workflow/session internals
```

## Visual Migration Rule

The extraction must be a no-behavior migration first.

During extraction:

- do not redesign Context Board or Build Tree
- do not redesign Control Board
- do not convert app internals to Teras merely because the files moved
- do not rename CSS classes if that risks visual regression
- do not change Delivery workflow step order or modal geometry
- do not change snapshot, scaffold, tree, or advisor behavior
- do not change package posture lanes, family-map grouping, ART tree behavior,
  or selected package action behavior
- keep Delivery preview behavior visually unchanged

After Delivery consumes the apps through adapters, app internals may be
refactored in separate slices with their own design record.

## Current Coupling Map

Context Board currently lives under:

```text
src/domain-workspaces/delivery/presentation/workflows/work-design/embedded-products/context-board/
```

It currently carries:

- board document and snapshot model through Work Design types
- board geometry, connector, bounds, SVG, and export helpers
- board templates, diagram kinds, sketch tools, labels, and palettes
- board controller hook
- board view and snapshot capture surface
- Work Design CSS ownership note for future standalone app extraction

Known coupling to remove:

- `DeliveryTone`
- Work Design board types from `../types`
- Work Design context decision and projection copy
- Delivery package context passed into the controller
- workflow dirty-state callbacks owned by the Work Design session

The Work Design Build Tree host remains under:

```text
src/domain-workspaces/delivery/presentation/workflows/work-design/embedded-products/build-tree/
```

It currently carries Delivery-owned integration code:

- tree editor controller hook
- tree host view and Work Design delete/guard dialogs
- adapter-backed scaffold section generation
- adapter-backed advisor prompt and transcript helpers
- Work Design CSS ownership note for future standalone app extraction

Known coupling to remove:

- `DeliveryPackageSummary`
- `DeliveryTone`
- `WorkDesignFinalizedBrief`
- Work Design node types used by Delivery adapters

Control Board previously lived under:

```text
src/domain-workspaces/delivery/presentation/surfaces/execution-board/
```

It currently carries:

- package posture lane view
- delivery-family lane grouping
- package cards and package progress display
- selected package ART tree viewer
- compact board-view switcher header

Known coupling removed in the first slice:

- `DeliveryPackageSummary`
- `DeliveryArtNode`
- `DeliveryPackagePosture`
- `deliveryPostureTerms`
- `getPackageTree`
- `getChildCounts`

Delivery still owns the execution surface shell, selected package panel, action
session, and action/review modals.

## Target Product App Contracts

Context Board should own neutral contracts such as:

- `ContextBoardDocument`
- `ContextBoardSubject`
- `ContextBoardSnapshot`
- `ContextBoardTemplate`
- `ContextBoardExport`
- `ContextBoardFinalizedBrief`

Build Tree should own neutral contracts such as:

- `BuildTreeDocument`
- `BuildTreeSubject`
- `BuildTreeNode`
- `BuildTreeProfile`
- `BuildTreeScaffoldSection`
- `BuildTreeDraft`
- `BuildTreeReviewPacket`
- `BuildTreeViewer`
- `BuildTreeTargetSelector`
- `BuildTreeEditor`
- `BuildTreeEditorTree`
- `BuildTreeScaffoldDialog`
- `BuildTreeNodeCard`
- `BuildTreeNodeChildren`
- `BuildTreeNodeStack`
- `BuildTreeNodeToggle`
- optional Build Tree selection workbench frame with consumer-owned detail slots

Control Board should own neutral contracts such as:

- `ControlBoardPackage`
- `ControlBoardPackagePosture`
- `ControlBoardPostureTerms`
- `ControlBoardTreeNode`
- `ControlBoardFamilyGroup`
- `ControlBoardViewMode`
- `ControlBoardLaneRow`
- `ControlBoardLanePanel`
- `ControlBoardCard`
- `ControlBoardCardProgress`
- `ControlBoardCardStack`

Delivery adapters own the mapping between those contracts and Delivery terms.

Examples:

```text
DeliveryPackageSummary -> ContextBoardSubject
ContextBoardFinalizedBrief -> WorkDesignFinalizedBrief

DeliveryPackageSummary + WorkDesignFinalizedBrief -> BuildTreeSubject
BuildTreeDraft -> Delivery draft tree / review packet
Delivery target tree -> BuildTreeViewer input
Delivery metadata targets -> BuildTreeTargetSelector input
Delivery metadata editors -> consumer-owned detail slots beside Build Tree selection
DeliveryPackageSummary -> ControlBoardPackage
DeliveryArtNode -> ControlBoardTreeNode
Delivery posture terms -> ControlBoardPostureTerms
```

## Current Extraction Status

The first source slice has created neutral public model contracts under:

```text
src/product-apps/context-board/
src/product-apps/build-tree/
```

Context Board board model, interaction state contracts, geometry, and snapshot
helper logic now live behind the neutral product-app API. Work Design aliases
the product-owned board contracts instead of duplicating board type definitions.
Delivery retains old Work Design helper names through
`delivery/product-adapters/context-board/`, not through workflow-local wrapper
files. Context Board now owns the live controller hook under
`product-apps/context-board/use-context-board-controller.ts` and the neutral
workbench view under
`product-apps/context-board/context-board-workbench-view.tsx`. Work Design
keeps an intentional host adapter that injects board copy, rail content, and
source overlay content. Work Design-specific brief state, decision options,
advisor rail copy, and source chips stay in Delivery-owned rail/source
components.

`board-templates.ts` is now partially split. Generic board palette, sizing,
connector, shape, style-target, arrange-position, starter viewport, starter
tone/size, label placement, tray metrics, tray creation, and endpoint parsing
helpers live behind product-app APIs:

```text
product-apps/context-board/context-board-template-helpers.ts
product-apps/context-board/context-board-starter-helpers.ts
```

Delivery retains old-name compatibility re-exports in
`delivery/product-adapters/context-board/work-design-context-board-templates.ts`.
Delivery-specific starter labels, details, and ART/OpenProject connection
examples live in the Delivery product adapter:

```text
domain-workspaces/delivery/product-adapters/context-board/work-design-context-board-starters.ts
```

Neutral SVG/render/download helpers now live behind:

```text
product-apps/context-board/context-board-rendering.ts
```

Delivery `work-design-context-board-rendering.ts` in
`delivery/product-adapters/context-board/` owns Work Design snapshot attachment
assembly, Delivery tone mapping, artifact field mapping, and Work Design file
slug behavior.

Context Board now owns the read-only snapshot capture renderer, the neutral
workbench view, and the shared workbench stylesheet used by the current Work
Design host:

```text
product-apps/context-board/context-board-snapshot-capture-surface.tsx
product-apps/context-board/context-board-workbench-view.tsx
product-apps/context-board/context-board-workbench.module.css
```

Delivery maps package/decision context into Context Board core nodes through
`delivery/product-adapters/context-board/`. Finalized-brief artifacts consume
that adapter-owned projection; they do not own the board node model. The live
controller hook receives Context Board core nodes, starter factories, and
fingerprint creation from the Work Design controller edge instead of deriving
Delivery package, decision, source, or operator-note context itself. Delivery
keeps only a compatibility alias for `useWorkDesignContextBoard`, an
intentional `WorkDesignContextBoardView` host adapter, and Delivery-owned
rail/source slot components.

Build Tree neutral advisor protocol, traversal, mutation, expansion, metrics,
title, scaffold parsing, scaffold dialog surface, view contract labels/field
props, structured tree-view projection, read-only viewer rendering, viewer
visual language, target selector recursion/selection mechanics, editor frame
layout, editor tree renderer, editor view-mode switch, editor expand/collapse
toolbar, and tree controller state helpers now live
behind:

```text
product-apps/build-tree/build-tree-advisor.ts
product-apps/build-tree/build-tree-core.ts
product-apps/build-tree/build-tree-controller.ts
product-apps/build-tree/build-tree-editor.tsx
product-apps/build-tree/build-tree-editor.module.css
product-apps/build-tree/build-tree-editor-tree.tsx
product-apps/build-tree/build-tree-editor-tree.module.css
product-apps/build-tree/build-tree-scaffold.ts
product-apps/build-tree/build-tree-scaffold-dialog.tsx
product-apps/build-tree/build-tree-scaffold-dialog.module.css
product-apps/build-tree/build-tree-node.tsx
product-apps/build-tree/build-tree-node.module.css
product-apps/build-tree/build-tree-target-selector.tsx
product-apps/build-tree/build-tree-view-contract.ts
product-apps/build-tree/build-tree-view-model.ts
product-apps/build-tree/build-tree-viewer.tsx
product-apps/build-tree/build-tree-viewer.module.css
```

Delivery product adapters now own Delivery seed generation, Work Design node
labels, Delivery-specific child-count copy, Delivery-specific scaffold wording,
accepted-brief/source evidence mapping, and current Work Design advisor
response copy:

```text
domain-workspaces/delivery/product-adapters/build-tree/work-design-tree-model.ts
domain-workspaces/delivery/product-adapters/build-tree/work-design-build-tree-advisor.ts
domain-workspaces/delivery/product-adapters/build-tree/work-design-build-tree-scaffold.ts
```

The Work Design Review Draft read-only tree viewer now consumes
`BuildTreeViewer` from the product app. Delivery owns the dialog shell, metrics
copy, workflow navigation, and Work Design adapter functions; Build Tree owns
the recursive read-only tree rendering and expansion toolbar.

The Refinement Metadata Workbench target tree now consumes
`BuildTreeTargetSelector` from the product app. Delivery owns the metadata
target projection, status labels, field selection behavior, shared-selection
meaning, draft values, confirmation state, and apply behavior. Build Tree owns
the generic recursive target selector mechanics over a tree-shaped document.

The Work Design Build Tree step now consumes `BuildTreeEditor`,
`BuildTreeEditorTree`, and `BuildTreeScaffoldDialog` from the product app for
the editor frame, recursive editor tree rendering, scaffold dialog shell,
view-mode switch, expand/collapse toolbar, and right-side panel stack. Delivery
still owns Work Design context handoff copy, selected draft editor content,
advisor copy, scaffold data mapping, node mutation behavior, delete guards, and
workflow receipts.

Refinement Metadata Workbench and Control Board ART Tree already prove that
multiple Delivery surfaces need tree-shaped interaction. Refinement converges
through `BuildTreeTargetSelector`: Build Tree owns the read-only tree selection
mechanics, while Refinement owns metadata field meaning, draft values,
confirmation state, and apply behavior. Control Board consumes Build
Tree-owned node primitives for ART tree rendering while retaining Control
Board-owned ART tree data, toolbar behavior, and package posture meaning. These
consumers should not each grow separate tree products, and they should not
force Delivery metadata semantics into Build Tree core.

Delivery product adapters still use the current Work Design model and finalized
brief compatibility paths while Work Design model types remain workflow-owned.
This is a bounded exception, not the target dependency model. Architecture
guards allow only:

```text
domain-workspaces/delivery/presentation/workflows/work-design/model
domain-workspaces/delivery/presentation/workflows/work-design/artifacts/context-brief
```

Adapters must not import arbitrary workflow internals, surfaces, view models,
workspace shell code, or presentation code. Removing this exception requires a
separate model split that separates reusable Work Design domain types from
workflow session and UI state.

The no-visual-change extraction foundation is complete for the reusable
Context Board and Build Tree logic that can move safely today. Further movement
of the interactive Context Board React shell, standalone routes, or
compatibility re-export removal belongs to a separate standalone app design
pass.

Control Board React views and CSS have moved behind:

```text
product-apps/control-board/
```

Control Board package lane and card composition now lives in
`product-apps/control-board/control-board-dashboard.tsx` and
`product-apps/control-board/control-board.module.css`.

`ControlBoardWorkspaceFrame` owns the board/right-zone frame. Its default
right zone is the selected-package panel frame. Execution inline tree edit may
use the frame's bare right-zone mode so Delivery-owned edit support and advisor
panels sit directly in the Control Board right zone without nested panel chrome.

Delivery maps package summaries, posture copy, tree nodes, descendant counts,
and family groups through:

```text
domain-workspaces/delivery/product-adapters/control-board/
```

The Delivery execution board surface remains the integration shell and owns
selected package context plus execution action modals.

## Migration Phases

1. Record the boundary and current coupling map.
2. Extract neutral app model types while keeping current files in place.
3. Move pure app logic first: board geometry, templates, export helpers, tree
   operations, scaffold helpers, and advisor helpers.
4. Add app-level public barrels and keep Delivery compatibility re-exports
   temporarily.
5. Add Delivery adapters under `domain-workspaces/delivery/product-adapters/`
   and switch Work Design to adapter-owned input/output.
6. Move app views/controllers after the model and adapter boundary is stable.
   Start with the read-only Build Tree viewer because it has the lowest
   mutation risk, then move the editable Build Tree shell, then evaluate
   metadata/detail shell reuse for Refinement, and only then evaluate Control
   Board ART tree convergence.
7. Remove Delivery compatibility re-exports.
8. Add a standalone harness route for each app so the app can run without
   Delivery.
9. Add architecture guards:
   - product apps cannot import Delivery or Operation Workbench internals
   - Delivery can import only product-app public barrels or adapters
   - Context Board and Build Tree cannot be classified as Teras primitives

## Completion Criteria

The no-visual-change extraction foundation is complete when:

- Delivery still renders the same Context Board and Build Tree behavior
- `product-apps/context-board` has no Delivery imports
- `product-apps/build-tree` has no Delivery imports
- `product-apps/control-board` has no Delivery imports
- Delivery owns all Delivery-specific mapping in adapters
- focused architecture guards pass

The full standalone app extraction is complete only later, when:

- compatibility re-exports are removed
- standalone harness routes can open the apps without Delivery
- React/CSS shells have standalone app ownership instead of Delivery ownership
- Delivery consumes the standalone app shell through explicit adapters

## Non-Goals

This extraction does not:

- admit a new governed product
- create a new repo
- create a platform component
- create a runtime service
- promote Context Board or Build Tree into Teras
- promote Control Board into Teras
- baseline-approve the standalone app design
- change Delivery workflow behavior
