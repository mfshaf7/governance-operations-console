# Governance Operations Console Implementation Audit

Status: approved source-baseline audit. This is not live-backend evidence,
runtime activation, or permission to publish.

## Audit Scope

This record describes the architecture implemented under this repository's
`src/` root. Normative design rules remain in
`system-design.md`, `operation-workbench-contract.md`, `teras-contract.md`,
the domain contracts, and the surface contracts.

The source was graduated through a reviewed owner-repository landing. The
accepted runtime posture remains local iteration without a stage, production,
or live-authority claim.

## Console Composition

The current source roots have explicit capability owners:

```text
src/
  app/                    route and API mounts
  console-shell/          whole-console composition, selection, identity, activity
  console-integration/    neutral attention, activity, and external-route contracts
  command-center/         pulse, focus, attention projection, and presentation
  operation-workbench/    typed operation registry, selector, and public host
  domain-workspaces/      operation domains and cross-operation boundaries
  lifecycle-transitions/  transition visibility and routing
  environment-lifecycle/  dev integration and governed release controls
  runtime-readiness/      host/runtime observation and readiness projection
  agent-console/          bounded operator/model interaction
  product-apps/           Build Tree, Context Board, and Control Board
  teras/                  product-neutral interface primitives
```

`src/app/page.tsx` is a thin mount for `GovernanceConsoleShell`. Capability
fixtures, state, selectors, server adapters, and operator workflows remain with
their owners. API route files mount capability-owned handlers rather than
implementing host or provider behavior.

The Operation Workbench selector and Console navigation consume one typed
seven-domain registry. Every registered domain mounts one public workspace
boundary, and selector metadata reports availability, runtime readiness, and
source mode separately.

## Operation Domain Architecture

Stateful operation domains use this dependency-oriented root grammar:

```text
<domain>/
  index.ts
  domain/
  read-model/
  work-model/
  local-runtime/
  presentation/
  product-adapters/   when a product app is consumed
```

`domain/` owns canonical concepts and transition rules. `read-model/` owns
source projection, fixture composition, selectors, and public read sources.
`work-model/` owns workflow and command DTOs. `local-runtime/` owns disposable
prototype state, receipts, subscriptions, and command simulation.
`presentation/` owns React composition and controllers. `product-adapters/`
maps an operation to a separately owned product app.

Model Operations is the deliberate exception: it is currently a governed
profile/readiness control and owns no canonical lifecycle, so it has no
`domain/` or local mutation layer.

Current operation shapes:

| Domain | Surface mode | Current source posture |
| --- | --- | --- |
| Delivery | fullscreen workspace | Domain, read model, work model, local runtime, presentation, and product adapters are separated; its exact source tree is guarded. |
| Proposal | compact control | Capture, register, hub, triage/disposition/handoff sessions, local receipts, and cross-domain custody are separated. |
| Repository | compact control | Request, admission, gate resolution, details, OOS lifecycle control, catalog linking, and retained local setup receipts are separated. |
| Model Operations | compact control with dashboard | Governed profile/readiness projection remains read-oriented and separate from Agent Console runtime health. |
| Prototype | compact control with dashboards | Request, dashboard, Preview Runtime, landing, candidate promotion, baseline promotion, transition intent, closeout, and history are separated. |
| Portfolio | fullscreen workspace | Products, Publication, Product Dashboard, and Curation follow the managed-product contract; Portfolio requires active product inventory and owns no intake classification or active registration. |
| Orchestration | fullscreen workspace | Home, Definitions, Runs, definition design, run control, projections, and local receipts are separated. |

Domain public barrels expose workspace entry, contract metadata, and approved
read-only activity or attention sources only. Private fixtures, workflow steps,
controllers, CSS, and internal view models are not public API.

Every completed domain exposes its public host through
`presentation/workspace/workspace.tsx`. Reusable display projections shared by
a domain's surface, dialogs, dashboards, or workflows live under
`presentation/shared/`; those internal presentation roles do not import the
public workspace host or depend backward on the primary surface.

## Cross-Operation Boundaries

Cross-operation code has three distinct owners:

- `operation-contracts/` owns shared packet and evidence contracts.
- `operation-projections/` owns product-neutral types and pure projection
  helpers. It does not import concrete domains.
- `operation-integrations/` owns concrete custody, ingress, acknowledgement,
  and catalog-link adapters that connect named domains.

`operation-runtime/` provides the shared prototype-local packet/runtime
mechanism. Source and target domains retain their own command and projection
authority. A local packet or receipt is simulation evidence, not backend truth.

Proposal-to-Delivery, Proposal-to-Prototype, Proposal-to-Repository,
Prototype-to-Delivery transition intent, and Repository-to-Delivery catalog
linking use these explicit boundaries. Delivery intake consumes accepted
source custody rather than inventing repository posture locally.

## Projection And Runtime Rules

- Canonical domain state, source projection, local overlay, and rendered view
  are separate layers.
- Activity and attention are separate read-only public sources.
- React subscriptions use retained provider/runtime instances and stable
  snapshots.
- Local runtimes own prototype-local drafts and receipts only.
- External HTTP/HTTPS navigation passes through
  `console-integration/external-route.ts`.
- Runtime Readiness and Agent Console server adapters remain server-owned;
  presentation does not read host or provider state directly.
- No operation domain performs a raw `window.open`.

## Interface Ownership

Teras owns product-neutral interface grammar. Operation domains compose Teras
without raw local chrome. Global CSS owns document reset, host shell styling,
and host-only scrollbar behavior; Teras tokens and component styles remain
inside Teras.

Build Tree, Context Board, and Control Board are product apps. Their internal
cards, nodes, lanes, editing behavior, and product CSS are not Teras
primitives. Delivery consumes them through explicit product adapters and
embedded-product hosts.

The accepted surface modes are:

- fullscreen workspace
- compact control
- compact control with dashboard extensions

Registers, hubs, workflow sessions, stable dashboards, and inspection dialogs
remain different jobs even when they share modal or panel primitives.

## Executable Controls

The registry-driven architecture suite owns:

- whole-console source ownership
- Console Shell, Command Center, Runtime Readiness, Agent Console, environment
  lifecycle, and lifecycle-transition boundaries
- operation registry and host exhaustiveness
- operation source grammar and public boundaries
- dependency direction and full source-cycle detection
- cross-operation runtime and authority boundaries
- product-app ownership
- Teras action, field, selection, list/status, structure, and dependency
  boundaries
- domain-specific structure, projection, workflow, vocabulary, and CSS rules

Delivery additionally has an exact source-tree contract. Other domain
structure guards assert ownership layers and known legacy-path absence without
freezing every private file name.

Semantic tests cover Console architecture, environment lifecycle, Workbench
selection, operation runtime, cross-operation projections, Delivery,
lifecycle transitions, Model Operations, Orchestration, and Prototype.
The shared operation runtime preserves deterministic prototype-local actor and
session attribution through command, run, and receipt envelopes.

## Deliberate Integration Boundaries

Outside the separately documented Proposal, Prototype Delivery, Delivery Work
Design, Refinement, Catalog, Execution work-session, in-flight change, and
closeout adapters, the following remain intentionally outside the current
completion claim:

- durable database ownership in the Console
- direct browser access to OOS, OpenProject, WGCF, repository, platform,
  security, release, or product-registry authority
- authentication and production identity wiring
- stage or production deployment
- baseline approval, graduation, or source landing

The Console may retain browser-local continuity and structured fixtures while
an operation has no admitted live contract. Named live adapters replace those
fixtures only at read-model, command, receipt, and subscription boundaries and
must not move canonical authority into React or a Console-owned database.

## Audit Result

The implemented source now has one explicit capability tree, one operation
registry, one operation source grammar, explicit cross-operation integration
ownership, dependency-direction enforcement, source-cycle detection, and
current domain guard packs.

No active contract should direct new work to historical Delivery root folders,
Delivery `read-model/types/`, loose cross-domain adapters, inline replacement
surfaces, or product-specific Teras primitives.

Required closure evidence for this audit is the single repository command:

```text
npm run check
```

Approved baseline validation recorded on 2026-07-30:

- Prototype Studio registry and records: passed
- architecture model and synchronized views: passed
- whole-console and domain guard registry: passed
- TypeScript: passed
- semantic suite: 330 passed, 0 failed
- foundation route catalog: 54 passed
- optimized production build: passed

Owner-repository graduation additionally requires:

```text
python3 scripts/validate_repository.py
npm audit --omit=dev
```
