# Source Structure Discipline

Governance Operations Console source must keep clear ownership, naming, and
validation boundaries as the product moves from its approved local baseline
into durable owner-repository development. This rule applies to every product
surface and supporting module in this repository.

Use this document before changing source structure, creating a new workflow
surface, extracting shared components, or deciding whether code should stay
local.

Operation Workbench domains also follow the more specific contract in
`operation-workbench-contract.md`.
When that contract is stricter about state machines, persistence, commands,
receipts, reconciliation, action placement, or workbench source structure, use
the Operation Workbench Contract for that console work.

## Continuity Goal

The core goal is resumable, switchable work. A product surface should be
structured so an operator or engineer can pause it, work elsewhere, and later
resume without reconstructing intent from chat history or reading one large
component from top to bottom.

That means every substantial surface needs:

- a recorded architecture/workflow shape before implementation or major
  refactor
- a predictable source scaffold
- enough local validation to catch the drift that matters for that surface
- clear notes for what is temporary, mock, local-only, post-baseline, or
  deferred to governed integration

Flexibility comes from small, explicit ownership boundaries. Strength comes
from records and guards that keep those boundaries coherent as work moves
between surfaces.

## Engineering Principles

These principles are the general source-structure contract for product work.
They are intentionally broader than one domain or artifact type, and should be
extended as new stable rules are accepted.

- Code truth comes first. Existing docs, previous approvals, and current folder
  layout are not architecture authority when direct code reading proves they are
  stale or drifted.
- Strongest accepted architecture contract wins. Once a target architecture has
  been accepted as the strongest engineering model, do not keep hardening a
  weaker interim structure as if it were the target. Either migrate toward the
  stronger contract or record a bounded migration exception.
- A local structure drift is a system-wide signal until disproven. If two
  comparable folders, workflows, surfaces, or guards differ in shape, pause
  local restructuring and inspect the whole owning domain before calling the
  fix complete.
- A full inspection means every folder in the ownership boundary has been
  classified by role and comparable areas have been compared. Do not describe a
  domain as structurally solid from touched-file review, shallow guard success,
  or one clean subsection.
- Record accepted source-structure rules before continuing implementation.
  Chat agreement is not enough for rules that should survive context reset or
  guide future domains.
- Structure by ownership boundary, not by convenience, current file size, modal
  shape, or visible navigation alone.
- Folder trees should be understandable before opening implementation files.
  Names and grouping should reveal whether a folder is domain model, read
  model, workflow engine, operator step, embedded product app, adapter, support
  surface, fixture, or validation boundary.
- Keep public boundaries explicit. Default to direct concrete-file imports.
  Add `index.ts` only when the folder is a real public boundary whose external
  consumers should not know the internal file structure.
- Use exact `.ts` or `.tsx` module specifiers for relative imports in
  application TypeScript source. Operation semantics execute source directly
  through Node's type-stripping ESM loader, so relative imports must identify
  the real entrypoint, including an accepted `index.ts` public boundary.
  Bundler-resolved `@/` aliases remain extensionless and import an accepted
  public index boundary through its owning directory.
- Do not create convenience barrels automatically. An `index.ts` is justified
  only when it represents a real public boundary, groups several public exports,
  or deliberately hides internal file structure from outside consumers. Step,
  session, controller, view-model, and support folders should not keep
  `index.ts` merely to shorten imports.
- Use role-specific file names. Artifact-specific suffixes such as
  `*.fixture.ts`, `*-selectors.ts`, `*-view-model.ts`, `use-*.ts`,
  `*-surface.tsx`, and `*.module.css` should describe what the file owns.
- Do not let boundary roots become dumping grounds. If a folder represents an
  ownership boundary, loose mixed files at that root are a smell unless the root
  file is itself the boundary entry or shell.
- Do not apply artifact-specific rules globally. For example, `*.fixture.ts`
  belongs to fixture implementations; it is not a general file naming rule.
- Do not over-normalize blindly. Extract when it clarifies ownership, removes
  real duplication, stabilizes a reusable pattern, or makes validation easier.
- Use shared primitives first. Do not create local panel, card, row, pill, tray,
  button, filter, table, modal, fact, progress, or selected-context chrome when
  a shared primitive owns that need. Extend the primitive deliberately or record
  a local exception.
- Preserve visual and runtime behavior during structure cleanup. Any visual,
  workflow, or behavior change found during cleanup must be discussed before it
  is made.
- Mock and fixture data should be structured truth, not prose-heavy object
  dumps or scattered component-local literals.
- Product apps and primitives are different ownership layers. Teras owns
  product-neutral UI primitives. Product apps own larger reusable tool behavior,
  document models, controllers, and app-specific visual systems.
- Guards should be focused by domain or boundary. Avoid giant validators that
  mix unrelated concerns, and delete or rebuild obsolete guards that enforce
  stale architecture.
- Guards are evidence only for the contract they actually enforce. Passing
  guards do not prove source quality when the agreed architecture grammar is not
  encoded yet.

## Source Modes

`baseline-preserving maintenance` keeps the accepted operator shape and source
boundaries stable while correcting owner-repository defects.

`post-baseline implementation` may replace fixture-backed or local-only
boundaries with typed adapters and durable contracts, but must not present
future integrations as active.

`governed integration` activates live authority only after the owning backend,
platform, security, and delivery evidence exists. Broader rewrites after
baseline need an explicit record explaining the defect, contract change, or
promotion need.

## Ownership Layers

Keep these layers separate unless a product surface is intentionally tiny:

- route/page shell: routing, high-level composition, and selected top-level
  view only
- domain read model: typed shape for the data the UI consumes
- selectors/projections: posture, eligibility, selected record, tree, action,
  and display projections derived from the read model
- workflow/session controller: local draft state, current step, guard state,
  persistence, and side-effect routing
- workflow views: render one operator step or panel set from prepared props
- action/view model helpers: operator copy, button eligibility, facts, gates,
  expected result, and receipt category
- shared primitives: product-neutral reusable controls, panels, modals,
  tables, fields, advisor consoles, dashboard cards, and tree nodes
- product fixtures: mock or synthetic data kept outside components
- verification scripts: focused guards for terminology, architecture,
  selectors, smoke paths, and visual/component states

The page shell should not own business posture, action eligibility, backend
truth, or deep workflow state.

## New Surface Requirements

Before building or materially reshaping a non-trivial surface, record the
surface shape in the product docs. The record should identify:

- owner and purpose
- source of truth and data mode
- mutation boundary and post-baseline boundary
- read-model shape or fixture source
- selector/projection responsibilities
- workflow steps or dashboard modes
- shared primitives to reuse
- local-only behavior and mock states
- validation guard or smoke check needed for the surface

Use a predictable scaffold unless the surface is intentionally tiny:

```text
<surface>/
  <surface>-read-model.ts       optional when shared read model already exists
  <surface>-selectors.ts        projections and derived state
  <surface>-surface.tsx         top-level composition
  use-<surface>-state.ts        local session/view state
  use-<surface>-controller.ts   workflow actions and side-effect routing
  <surface>-view-model.ts       operator copy, facts, gates, action display
  <surface>.module.css          local layout only
scripts/guards/domains/<domain>/<surface-or-concern>.guard.mjs
```

The scaffold is not a bureaucracy requirement. It is the default shape that
keeps work resumable and prevents new surfaces from inventing structure again.
If a surface needs a public barrel, record why it is a boundary instead of a
convenience import shortcut.

## Data And State

- UI components consume typed read models and selectors, not scattered object
  literals or component-local truth.
- Components may hold selected ids, open modal ids, expanded nodes, draft
  edits, local advisor text, and guard state.
- Components must not own canonical posture, action eligibility, source
  freshness, backend status, or receipt authority.
- Runtime and projection-store modules expose subscribe/snapshot functions.
  React subscription hooks belong in presentation state, surface, or controller
  files that consume those snapshots.
- Local persistence is allowed only when it proves the operator workflow and is
  clearly marked as owner-repository-local or prototype-local.
- Mock receipts and local apply results must not be presented as durable
  backend receipts.
- Stale, unavailable, permission-denied, backend-unavailable, dirty, conflict,
  empty, and error states should live in the read model or workflow state
  contract, not as one-off panel text.

## Component Structure

- Build by responsibility, not by screen size. If one file owns routing, state,
  data projection, modal logic, table rows, action copy, and panel rendering,
  split it.
- Product surfaces should use a stable ownership split:
  public wrapper, read model, selectors, view model, command/action model,
  receipt model when relevant, state hook, controller hook, views, and local
  layout primitives. The wrapper owns entry shell and close behavior; views
  render prepared props and emit bounded intents.
- Keep workflow session components in a predictable shape: session modal,
  state hook, controller hook, footer, step router, and step views when the
  workflow has multiple steps.
- Keep dashboard/board surfaces separate from modal workflow surfaces. A board
  may own selection and inspection; workflow mutation belongs behind an
  explicit action boundary.
- Promote reusable UI only after the contract is neutral. Shared primitives
  should accept display-ready fields and neutral tones, not domain-specific
  read-model objects.
- Keep domain-specific adapters at the consuming edge. The shared layer should
  not import Delivery, Proposal, Repository, Portfolio, or product-specific
  models.
- Shared UI primitives are first-class dependencies. Do not create local panel,
  card, row, pill, tray, button, filter, table, modal, fact, progress, or
  selected-context chrome when the product has a shared primitive for that
  need. Extend the shared primitive deliberately or record a local exception.
- Raw styling is not a normal implementation path. Do not add local CSS,
  raw `className` chrome, `styles.*`, or inline style objects unless direct
  inspection proves the surface needs a design that no shared primitive or
  product app owns. That exception must be discussed first. If the experiment
  produces a reusable neutral shape, promote it into the shared primitive layer
  before continuing broad implementation.
- Do not extract code merely to hide size. Extract when it separates ownership,
  removes real duplication, stabilizes a shared pattern, or makes validation
  easier.
- Do not over-normalize future standalone app internals into generic
  components before their integration contract exists.

## Product Apps

Some reusable tools are larger than a shared primitive. These tools should live
as product apps when more than one surface may become a customer, or when the
current surface is only the first integration host.

Recommended shape:

```text
src/product-apps/<app>/
  <app>-model.ts
  <app>-controller.ts
  <app>-view.tsx
  <app>-view-model.ts
  <app>.module.css
  index.ts

src/domain-workspaces/<domain>/<area>/adapters/
  <domain>-<app>-adapter.ts
```

Product app core code owns product-specific behavior and may use shared
primitives. It must not import the consuming domain's read model, workflow
state, private selectors, or CSS.

Consuming domains own adapters. An adapter maps domain input into product-app
input and maps product-app output back into the domain workflow.

This is different from Teras. Teras owns product-neutral UI primitives.
Product apps own tool behavior, document models, controllers, and app-specific
visual systems.

When extracting an embedded tool into `product-apps`, move by contract first:

- record the product-app boundary
- preserve current behavior and visual output
- keep compatibility re-exports only temporarily
- add guards so app code cannot import consuming domain internals
- add a standalone harness before calling the app independent

## Naming

- Name modules for capability and ownership, not incidental layout position.
  Prefer names such as `selected-package-panel`, `session-controller`,
  `action-view-model`, `dashboard-card`, or `tree-node-card`.
- Shared components use product-neutral names. Domain names belong in domain
  components and adapters.
- Do not keep old vocabulary as internal implementation names after the model
  changes. Rename stale concepts during normalization instead of translating
  them in comments.
- Avoid vague names such as `stage`, `movement`, `data`, `panel2`, or
  `workflow` unless that is the exact domain concept.
- Test selectors should identify stable capability and route boundaries rather
  than repeated visible copy.

## CSS And Visual Source

- Use CSS modules for product surfaces and feature modules. Global CSS is for
  app shell, tokens, resets, and truly global primitives only.
- A repeated visual rule should live with the shared primitive that owns it.
  Do not duplicate panel, card, button, field, table, advisor, or dashboard
  rules across feature CSS.
- A feature module may keep local styling for local composition, spacing, and
  domain-specific content layout.
- Do not use specificity guards or CSS injection-order workarounds as normal
  design. Fix the owner or selector boundary instead.
- Header, state, pill, rail, card, and action rules must not drift between
  copies of the same component family.
- Text must stay bounded inside its component. Overflow, wrapping, clamping,
  and scroll ownership are part of the component contract.

## Validation

- Run focused TypeScript checks for React, state, and data-shape changes.
- Add or update lightweight architecture guards when a domain has banned
  vocabulary, required selectors, module-boundary rules, or routing rules.
- Use focused smoke checks for changed workflows and operator controls.
- Use screenshot or component-state checks for high-risk visual surfaces after
  baseline approval, or earlier when a visual surface is fragile.
- A source-structure change is not complete if docs say one owner shape and
  code implements another.

Each substantial surface should eventually have a focused architecture guard.
The guard should check only the rules that matter for that surface, such as:

- required read model, selector, action, and route files exist
- the surface imports shared primitives from the approved layer
- banned legacy vocabulary does not re-enter code
- shared primitives do not import domain read models
- workflow routes use the owned workflow/session modal instead of a generic
  fallback
- component-local posture or action eligibility helpers are absent
- required smoke selectors or `data-*` hooks remain stable

The repository should keep a small anti-pattern guard for common drift across
all surfaces. That guard should stay conservative and catch structural
mistakes, not enforce one domain's workflow model on another domain.

## Anti-Patterns

- component-local canonical domain state
- mutable workflow routes hidden inside display cards
- action buttons invented inside leaf components
- shared components importing domain read models
- copied visual primitives with slightly different CSS
- old workflow names kept as implementation names
- mock/backend/local behavior presented as live system evidence
- large parent components that only shrink by moving unclear code elsewhere
- generic wrappers that exist only for compatibility after contracts match
