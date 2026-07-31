# Product Portfolio Domain Contract

Status: accepted local-baseline managed-product contract with fixture-backed
projection and local publication and listing receipts. Live authority adapters
remain post-baseline work.

Surface label: `Product Portfolio`.

## Recommendation Result

The architecture recommendation is:

- `replace` the existing arbitrary-item posture register, exposure editor, and
  generic Movement Handoff workflow
- `reuse` the workspace product inventory, product-owned manifests, Platform
  runtime and release evidence, Security review evidence, Delivery outcomes,
  and WGCF readiness aggregation
- `extend` those authorities with a versioned product-publication packet and
  product-owned showcase metadata
- create no new Portfolio backend service before evidence proves that the
  existing authorities and adapters are insufficient

Product-surface work belongs in this owner repository. Live cross-repo
adapters, canonical mutations, and product publication belong in separately
admitted Live Integration and Deployment work after owner assignment.

## Domain Role

Portfolio is the live catalog and operator showcase for graduated, durable,
managed products in the workspace.

It answers:

- what products the workspace currently manages
- what each product does and who owns it
- where its source and operating documentation live
- how an operator opens or obtains the product
- what maturity and highest real endpoint it has reached
- what version or release is current
- whether its managed runtime or distribution is available
- which Delivery outcomes most recently changed it
- which Platform and Security evidence supports its current posture

Portfolio contains products, not arbitrary work items. Delivery work may finish;
an active product remains managed and may receive many later Delivery outcomes.

## Product Versus Delivery Outcome

Delivery completion and Portfolio publication are not interchangeable.

- Repository, Prototype, or Delivery may emit a generic product entrant
  candidate when a durable product boundary becomes clear
- intake classification and active product registration happen in separate
  Workspace Governance workflows
- only an active `products.yaml` product id may become a Portfolio publication
  candidate
- a release, feature, or material change updates an existing Portfolio entry
- governance, planning, repair, risk, verification, and other non-product work
  remains in Delivery history and does not create a Portfolio entry
- retirement of a product updates the existing entry and retains its history

Delivery closeout evidence is one possible publication input. It is not the
canonical product registry, does not decide intake classification or active
registration, and is not a complete publication packet. The product owner
assembles that packet from Delivery outcome evidence plus the other required
product, operating, access, release, and security evidence.

## Canonical Authorities

Portfolio is a composed projection. It must not copy these facts into a
competing source of truth.

| Concern | Canonical authority |
|---|---|
| product identity, active product inventory, maturity, and owner map | `workspace-governance/contracts/products.yaml` |
| new entrant classification | `workspace-governance/contracts/intake-register.yaml` under Workspace Governance |
| promotion from admitted intake to active product inventory | Workspace Governance active-inventory promotion workflow |
| allowed Portfolio segment, product-form, listing-scope, access-class, and tag vocabulary | machine-readable Workspace Governance product-classification contract |
| product purpose, summary, classification values, artwork, and product links | versioned product-owned portfolio manifest, validated against Workspace Governance vocabulary |
| source repositories and durable source ownership | workspace repo inventory and owner repositories |
| runtime environments, endpoints, releases, versions, and availability | Platform Engineering product integration and runtime evidence |
| security review and permitted exposure | Security Architecture |
| Delivery completion and change history | Workspace Delivery ART and OOS receipts |
| readiness aggregation and source freshness | WGCF |
| listing order, featured state, and Portfolio listing scope | product owner plus workspace-governed Portfolio curation policy |

Every projected value that can change independently must carry its source ref,
source version or observation time, and freshness state. A prose summary may
describe those facts but must not determine them.

## Publication Intake

Portfolio may receive publication candidates from:

- an active product in `contracts/products.yaml`
- a product-owned update packet backed by an existing active product release
  or material-change receipt
- a curated import of a currently managed active product

Curated and adapter-projected candidates remain outside the Publication register
until the operator uses `Capture Publication`. Capture records
one version-matched prototype-local receipt against the catalogued publication
source; it does not permit free-form product creation, assign product identity,
or invent a publication packet.

When a new durable product boundary is discovered, its source workflow may emit
a generic Workspace Intake candidate. Portfolio must not receive that candidate
or its `admitted` classification. Workspace Governance must first promote it
into active `products.yaml` inventory. A Delivery closeout for an existing
active product may provide outcome evidence to its product owner. Portfolio
still receives the complete product-owned publication packet.

Proposal is not a Portfolio route target. Prototype is not a direct Portfolio
route target. Portfolio does not take implementation custody from either one.

A Prototype must first graduate to a durable owner and managed product path.
That may happen through Workspace Delivery ART or through another explicitly
approved owner-repo graduation. Active product registration plus operating
evidence then makes it eligible for Portfolio publication.

## Publication Requirements

A product may be published in Portfolio only when all applicable requirements
are structured and source-backed:

- stable `product_id` and product-registry ref
- active product lifecycle and maturity
- product owner, source owner, runtime owner, platform owner, and security owner
- durable source repository or explicit non-repository distribution source
- product purpose, concise summary, controlled classification, and
  product-owned showcase ref
- primary experience target such as a live application, operator UI, package,
  download, or documentation entrypoint
- truthful highest real endpoint
- current release or version evidence when the product is versioned
- runtime or distribution availability evidence
- product-specific visibility and operations contract
- required security-review refs
- Delivery or graduation evidence when the product entered through those paths
- listing scope no broader than the product's verified access contract

Missing requirements do not create a partially trusted product card in the
main Portfolio. They remain in the publication queue with a named owner and
required action.

## Publication Review State

Portfolio owns no entrant-classification or active-registration lifecycle.
Workspace Intake owns whether a candidate is `out-of-scope`, `proposed`, or
`admitted`; Workspace active-inventory promotion separately creates the active
product record.

Product publication state is separate from product lifecycle, listing state,
and runtime availability. A Portfolio publication review is a command
projection over an active product and uses the shared command-operation
lifecycle. Its operator result is:

- `captured`: a version-matched publication packet is awaiting review
- `needs-review`: named source evidence or a permitted listing choice needs
  correction
- `published`: a listing receipt exists
- `rejected`: publication was declined or the packet resolves to an existing
  entry

These labels are not product lifecycle, intake classification, or active
registration. Publication does not make a runtime live; it only controls
whether an active product is listed.

## Independent State Axes

Portfolio must keep these state axes independent:

### Product maturity

Projected from the workspace product registry, for example
`platform-integrated` or `fully-governed`. Portfolio does not invent maturity.

### Listing state

- `listed`: shown in the active Portfolio for its permitted listing scope
- `unlisted`: admitted but intentionally omitted from normal Portfolio views
- `retired`: retained as product history without an active-product cue

### Runtime or distribution availability

- `live`
- `degraded`
- `offline`
- `unknown`
- `not-applicable`

Availability must include an observation time and source. It is not product
lifecycle and it is not listing state.

### Listing scope

- `internal`
- `client`
- `public`

Listing scope controls who may see the Portfolio listing. It does not grant
access to the product runtime and cannot exceed the verified product access
contract.

## Product Classification

Portfolio classification uses independent controlled fields. Personal, client,
and public must not be collapsed into one ambiguous category.

- `portfolio_segment`: `workspace`, `personal`, or `client`
- `product_form`: `application`, `service`, `operator-tool`, `integration`,
  `cli`, `package`, `library`, or `documentation`
- `listing_scope`: `internal`, `client`, or `public`
- `access_class`: `private`, `restricted`, or `public`
- `client_ref`: required when `portfolio_segment` is `client`; it must be an
  approved opaque reference rather than copied client data
- `tags`: controlled secondary classification, not arbitrary free text

The product owner supplies segment, form, applicable client ref, and tags
through the product-owned manifest. Portfolio owns the requested listing state
and listing scope. Product, Platform, Security, and identity authorities supply
the verified access class. Portfolio validates and projects these values but
does not widen them.

`product_form` is the primary catalog classification, not a claim that a
product has only one interface. Multi-form products keep one stable primary
form and expose additional service, integration, package, or interface targets
through typed secondary experience targets. They do not create duplicate
Portfolio entries.

The allowed vocabulary is a Workspace Governance responsibility because it is
shared across products and owner repositories. During Baseline Foundation, fixtures use
the vocabulary locked in this contract. After baseline approval, a distinct
Workspace Delivery ART child must extend the machine-readable Workspace
Governance contracts, update schema validation, classify existing products,
and provide migration and compatibility evidence before live Portfolio adapters
depend on the fields.

Baseline Foundation fixture tags are limited to `collaboration`, `delivery`,
`developer-tool`, `documentation`, `governance`, `integration`, and
`operations`. They are prototype vocabulary only; the future Workspace
Governance child may replace or version them before any live adapter depends on
the values.

## Product Publication Packet

A versioned publication packet must contain:

- packet id, schema version, correlation id, causation id, and idempotency key
- publication kind: `new-product`, `product-update`, `release-update`, or
  `product-retirement`
- product id, registry ref, registry version, and product lifecycle
- product-owned manifest ref and digest
- owner refs and source-repository refs
- portfolio segment, product form, client ref when applicable, and controlled
  tags
- maturity and highest-real-endpoint projection
- primary and secondary experience targets
- release/version ref and release evidence when applicable
- runtime or distribution observations with timestamps
- security owner, review posture, and evidence refs
- latest Delivery outcome and graduation refs when applicable
- requested listing state, listing scope, and curation metadata
- source versions and superseded publication ref when applicable

The packet carries references and digests rather than copying raw logs,
credentials, private runtime data, or unbounded Delivery history.

## Normalized Portfolio Entry

The operator read model should normalize one active product into these groups:

```text
ProductPortfolioEntry
  identity
    product_id
    registry_ref
    display_name
    summary
    artwork_ref
  classification
    portfolio_segment
    product_form
    client_ref
    tags
  ownership
    product_owner
    source_owners
    platform_owner
    runtime_owner
    security_owner
  source
    repositories
    documentation_targets
    manifest_ref
  maturity
    product_lifecycle
    maturity
    highest_real_endpoint
  experience
    primary_target
    secondary_targets
    access_class
  release
    version
    release_ref
    released_at
  runtime
    availability
    environments
    observed_at
    evidence_refs
  security
    posture
    review_refs
  delivery
    latest_outcome_ref
    history_refs
  listing
    state
    scope
    featured
    sort_order
  provenance
    publication_receipt_ref
    source_versions
    refreshed_at
    freshness
```

Product type must not be constrained to web applications. Experience targets
must support services, operator tools, CLIs, packages, libraries, downloads,
documentation products, and other active product forms without inventing a
separate Portfolio model for each.

## Baseline Foundation Fixture Contract

Portfolio UI implementation must start from structured fixture truth, not
component-local strings. Every scenario uses the same production-shaped packet,
entry, selector, and command types.

```text
PortfolioFixtureScenario
  scenario_id
  provenance
    mode
    authority_refs
    synthetic_fields
  publication_packet
  projection_context
    existing_entry
    applied_publications
    publication_decision
    evaluated_at
  expected
    publication_posture
    entry_projection
    status_axes
    required_action
    allowed_commands
    forbidden_commands
```

`projection_context` is input truth, not expected output. It is required so
duplicate detection, updates, retirement, publication decisions, and idempotent
replays can be evaluated without inferring prior state from display fixtures or
from test assertions.

Allowed fixture provenance modes are:

- `authority-snapshot`: copied from a named current authority without invented
  fields
- `synthetic-companion`: authority-backed identity plus explicitly synthetic
  manifest, listing, runtime, release, or security evidence needed for UI proof
- `synthetic`: a completely invented product that carries no client data,
  secret, private endpoint, or real operational claim

OpenClaw and OpenProject fixtures must preserve the lifecycle, owner, stage,
promotion, and highest-real-endpoint facts currently present in
`workspace-governance/contracts/products.yaml`. Any additional showcase or
runtime values are `synthetic-companion` data until their future authorities
exist.

### Required Fixture Matrix

| Scenario | Classification and state | Expected operator behavior |
|---|---|---|
| `managed-openclaw` | authority-backed `workspace` / `operator-tool`; listed internal; restricted access; fully governed | Show one active product and its dashboard. Direct access appears only when the fixture carries a verified experience target. |
| `managed-openproject` | authority-backed `workspace` / `service`; listed internal; restricted access; platform integrated | Preserve its different maturity and unsupported governed-production posture instead of projecting OpenClaw semantics. |
| `personal-public-application` | synthetic `personal` / `application`; listed public; public access; live | Prove that a personal product can be publicly listed and opened without becoming a client or workspace product. |
| `client-restricted-application` | synthetic `client` / `application`; client listing; restricted access; opaque client ref | Show client-safe identity and an authenticated access cue without displaying copied client data. |
| `public-cli-release` | synthetic `personal` / `cli`; listed public; public distribution available | Use package, download, or documentation access rather than assuming every product opens a web runtime. |
| `unlisted-library` | synthetic `workspace` / `library`; active but unlisted; private; runtime not applicable | Exclude it from the default catalog, retain it in the Unlisted filter, and allow listing review only. |
| `degraded-service` | synthetic `workspace` / `service`; listed internal; restricted; degraded | Keep the product listed, show operational attention, and route runtime repair to its owner instead of blocking Portfolio publication. |
| `stale-runtime-evidence` | admitted listed product with expired runtime observation | Stop claiming healthy availability, project `unknown` plus stale evidence, and expose the source owner route. |
| `retired-documentation` | synthetic `personal` / `documentation`; retired listing; public history; runtime not applicable | Remove the active-product cue, retain product and release history, and offer no Portfolio-owned product-retirement action. |
| `new-product-delivery-candidate` | active `products.yaml` identity plus complete `new-product` publication packet | Open Publication Review and allow listing only after source checks and listing configuration pass. |
| `missing-manifest-candidate` | active product identity exists but required product-owned manifest evidence is missing | Project `needs-review`, name the product owner and missing source, and disable publication. |
| `scope-exceeds-policy-candidate` | requested public listing while the verified product access contract permits only internal or client listings | Project `needs-review`; allow a permitted listing scope or route to the owning Product and Security authorities. Never widen the verified listing policy locally. |
| `duplicate-product-candidate` | publication packet resolves to an existing product id | Reject the duplicate candidate, link the existing product, and create no second catalog entry. |
| `release-update-existing-product` | policy-clear `release-update` for an active product | Update the existing entry automatically, append release history, and avoid an unnecessary publication decision. |
| `product-retirement-update` | source-backed `product-retirement` for an active product | Move the existing entry to retired projection and preserve its full history; do not create a new card. |
| `idempotent-publication-replay` | same packet id, source versions, and idempotency key as an applied publication | Return the existing result and receipt with no duplicate history or entry. |

### Fixture Invariants

- Workspace intake classification, active registration, publication review,
  listing, maturity, availability, access, and freshness remain
  independent axes.
- Summary cards, filters, cards, dashboard sections, and actions derive from
  selectors over the normalized records.
- Unknown controlled-vocabulary values fail fixture validation instead of
  falling back to display prose.
- Synthetic fields retain explicit provenance and never overwrite
  authority-snapshot fields.
- No fixture contains real client names, client data, credentials, private
  endpoints, or raw operational logs.
- Missing evidence always names its canonical owner and operator route.
- Portfolio commands mutate only publication-review and listing-owned state.
- An existing `product_id` can produce at most one active Portfolio entry.

## Publication And Update Behavior

- An active product id has at most one active Portfolio entry.
- A new publication for an existing product updates that entry and appends
  history; it does not create a duplicate card.
- Release or Delivery updates change only fields owned by their source.
- Runtime observations expire or become stale; Portfolio must not display an
  old healthy observation as current truth.
- Product retirement retains release, ownership, and evidence history.
- Corrections supersede earlier publication packets and never rewrite receipt
  history.
- Idempotent retries return the first accepted result. Reusing the same key for
  a different command payload is rejected.
- Local publication-review and listing receipts apply only when their source
  identity, source version, command, and projected result agree.
- Rejected or orphaned local receipts remain unapplied and produce typed
  reconciliation issues instead of disappearing from projection.

## Visibility And Exposure Boundary

Portfolio listing visibility and product runtime exposure are different
controls.

Prototype owns preview intent and preview configuration. The shared
`dev-integration` runner and Platform Engineering own the actual preview
runtime and access path. Security review is required when identity, external
hosting, client/public access, real data, secrets, or mutable real systems enter
that preview.

For active products:

- the product owner defines the intended audience and product access contract
- Platform Engineering owns runtime deployment, ingress, environment, and
  access-path implementation
- Security Architecture owns security acceptance and explicit exceptions
- identity and access controls enforce the result
- Portfolio projects the verified access state and separately controls listing
  scope

Editing Portfolio metadata must never expose a runtime, widen network access,
approve security posture, or make a Prototype preview a production product.

## Operator Surface Responsibilities

Product Portfolio uses a fullscreen workspace with exactly three peer
surfaces: `Products`, `Publication`, and `Curation`. `Products` is the landing
surface; Portfolio does not add a shallow Home page. Health and source
freshness remain visible through persistent workspace status signals and the
product dashboard rather than separate navigation.

### Products

- standard register with search over product, owner, id, and tags
- maturity, availability, and listing-scope filters
- columns for Product, Owner, Maturity, Availability, Listing, and Action
- active products by default; unlisted and retired entries remain explicitly
  inspectable without being presented as active products
- a rich selected-product panel and direct entry to Product Dashboard

Product Dashboard uses a stable `large` detail surface. Its identity header is
followed by five dense summary cards for Maturity, Availability, Release,
Listing, and Freshness. `Overview`, `Operations`, and `History` are stable tabs.
The primary product access action is first class. Listing changes route to
`Curation`; the dashboard must not duplicate listing mutation controls.
History composes source classification, active-inventory promotion,
publication, release, runtime observation, publication-decision, and listing
receipts in event order without mutating source history.

### Publication

- `Open` and `Resolved` register views
- a first-class `Capture Publication` action that captures only a
  catalogued, version-matched publication source for an active product
- summary counts for Open, Needs Review, Published, and Rejected derived from
  normalized publication command and result records
- one focused three-stage session: `Checks`, `Decision`, `Result`
- no advisor and no runtime log because publication review is a bounded synchronous
  decision, not execution orchestration
- source-owned missing evidence routes to its named owner
- a listing-scope conflict may be corrected locally only to a scope already
  permitted by the verified access contract
- duplicate product identity is rejected automatically and opens the existing
  product instead of entering a manual decision session
- operator rejection uses controlled reasons; `other` requires a note
- the result is a prototype-local receipt and dirty drafts use the shared exit
  guard

### Curation

Curation uses the accepted three-zone configuration layout: catalog views,
current listings, and selected listing. Catalog views are `All Active`,
`Featured`, `Internal`, `Client`, `Public`, and `Unlisted`.

Portfolio may change only listing state, a policy-permitted listing scope,
featured placement, and relative position (`First`, `Last`, or `After
product`). It must never expose raw numeric sort order. Retired entries remain
read-only. Product-owned purpose, summary, classification, artwork, access,
runtime, release, and security facts are not editable through Curation.
After apply, selection remains on the affected product and receipt confirmation
is scoped to that product rather than whichever listing receipt was recorded
last.

## Non-Goals

Portfolio must not:

- become a build lane or Delivery history replacement
- list arbitrary Proposals, Prototypes, work packages, repositories, or ideas
- take source custody from Prototype, Delivery, or owner repositories
- own intake classification or active-registration authority
- own runtime deployment, ingress, identity, security acceptance, or release
  promotion
- use generic `movement-required` or Movement Control handoff semantics
- treat listing scope as runtime authorization
- accept free-text segment, form, access class, listing scope, or tags
- create a new canonical Portfolio database before a missing persistence owner
  is proven

## Current Implementation Disposition

The mounted implementation exposes Products, Publication, and Curation as
separate peer surfaces. Publication accepts only structured product-owner
packets carrying canonical Workspace product identity. It cannot create or
admit a product.

The prototype-local runtime records publication-review and listing
commands behind the shared operation runtime boundary, then derives one
effective read model from immutable source projections and accepted local
receipts. Receipt mismatches remain explicit reconciliation issues and do not
alter the effective read model.

Canonical product-entry identity and vocabulary live in `domain/`; publication
review and listing command models live in `work-model/`; source projections and
fixtures live in `read-model/`; local receipts and overlays live in
`local-runtime/`; and React composition lives in `presentation/`.

The obsolete arbitrary-item registration, posture editing, exposure data mode,
linked-work mutation, generic Movement Control handoff, fixtures, runtime,
tests, and guards have been removed. They must not return. No comparison toggle
exists because the rejected model was not an accepted capability.

Baseline Foundation uses structured fixtures shaped from current product authorities,
including OpenClaw and OpenProject examples. Live Integration and Deployment supplies live
product-registry, WGCF, Platform, Security, Delivery, and owner-manifest
adapters.

## Sources

- `../architecture/README.md`
- `workspace-governance/contracts/products.yaml`
- `platform-engineering/docs/standards/product-boundaries.md`
- `platform-engineering/docs/standards/product-documentation-model.md`
- `platform-engineering/docs/standards/service-contracts.md`
- `security-architecture/docs/architecture/components/workspace-prototype-studio/README.md`
- `../system-design.md`
- `../operation-workbench-contract.md`
