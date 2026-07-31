# Teras Normalization Record

Status: completed historical migration record. The active API authority is
[`teras-contract.md`](teras-contract.md) plus the executable shared guards.

This record preserves the outcome of the Teras normalization pass without
acting as an implementation plan.

## Audited Surface Set

The migration was checked against the accepted Operation Workbench shapes:

- Delivery fullscreen workspace
- Proposal compact control
- Repository compact control
- Prototype compact control with dashboard extensions
- Portfolio fullscreen workspace
- Orchestration fullscreen workspace
- Model Operations compact control with dashboard

Build Tree, Context Board, and Control Board were treated as product apps, not
as sources of generic Teras primitives.

## Locked Outcomes

- Primitive names describe product-neutral structure or behavior.
- Small spacing, density, and width differences do not justify new variants.
- `TerasContentFrame` and `TerasContentRegion` replaced workflow-specific
  frame/stage naming.
- `TerasZoneLayout` retains only materially distinct main/aside and
  main/support structures.
- `TerasPrimarySideLayout` and
  `TerasSelectorValueInspectorLayout` own their distinct reusable slot
  contracts.
- Action composition uses the shared action button, row, panel-action, utility,
  choice, and rail-button families.
- Metadata, statistics, subject, summary, highlight, list, timeline, tray, and
  empty-state responsibilities remain separate.
- Dialog shapes are named by geometry and job rather than by their first
  product consumer.
- Build Tree owns tree-node behavior and chrome.
- Control Board owns lane, package-card, progress, and family-map chrome.
- Context Board owns drawing and snapshot-workbench behavior.
- Operation domains use Teras for operation chrome and do not duplicate it in
  local CSS.

## Retired Families

The migration removed or absorbed obsolete evidence-tile, filter-toolbar,
setup-planner, wizard-result, dashboard-named generic card, tree-node, and
Control Board lane/card exports. Retired names must not return through
compatibility aliases.

## Verification

The active guard registry checks:

- Teras dependency direction and public exports
- action, field, selection, list/status, and structure contracts
- operation-domain raw styling
- product-app ownership boundaries
- accepted operation surface consumption

Any future Teras promotion still requires a demonstrated reusable gap and
operator discussion before implementation.

## Completion

- Historical normalization phases: 100% complete.
- Remaining work in this record: 0%.
