# Governance Operations Console

Staged source-editing procedure:
[Source editor and import](docs/product/source-editor-and-import.md).
Epic 1323 adds a shared text/diff editor and VS Code file/folder import to
Prototype app/design and ordinary Delivery. Exact composed Security acceptance
and commissioning remain required before operating qualification.

Staged operator procedure:
[Prototype source authoring](docs/product/prototype-source-authoring.md).
This source extension still requires exact composed acceptance and commissioning.
The same applies to the current evidence-only Delivery completion and real
owner-manifest Publication entry. Procedures:
[Delivery completion](docs/product/delivery-execution-work-sessions.md#evidence-only-completion-and-completed-parents)
and [Product Publication](docs/product/product-publication-live-integration.md).

This repository owns the durable product source for the Governance Operations
Console.

## Current Status

The approved Prototype Studio baseline has graduated into this repository,
which is now the durable Console source owner. The source manifest and
cross-repo graduation record preserve its origin and reviewed custody transfer;
Prototype Studio retains incubation history rather than active product source.

The graduated baseline remains private and loopback-only. The Console now has
separately governed OOS integration slices:

- server-only OOS caller credentials and operator attribution
- centralized governed runtime configuration with a non-secret capability
  projection and fail-closed partial-configuration handling
- Platform-owned runtime observation consumption with private server-side
  validation, browser-safe component posture, and fail-closed freshness
- server-issued correlation across every same-origin API response, authorized
  OOS attribution, denied actions, and bounded owner failures
- versioned canonical source envelopes for admitted live GET projections, with
  owner, identity, freshness, and ordering validation before use
- canonical Proposal list, capture, projection, command, and history paths
- Proposal-to-Prototype target application with repository-gate enforcement,
  exact Studio review projection, and receipt-plus-acknowledgement completion
- bounded visible-page polling with fail-closed writes
- canonical primary Prototype and Delivery registers, cold owner-workflow
  recovery, and bounded Delivery source-realization review controls
- explicit disconnected preview when no OOS endpoint is configured
- Prototype-to-Delivery application for an exact, source-authoritative
  Prototype Delivery packet, with server-only caller credentials and
  receipt-bound result projection
- Delivery Work Design source projection, bounded governed advice, canonical
  apply, reconciliation, and durable receipt readback
- Delivery Architecture Packet authoring with fresh ART validation, explicit
  operator approval, and WGCF-backed durable custody
- Delivery Refinement packet/run projection, governed metadata advice, durable
  apply polling, canonical readback, and receipt projection
- Delivery Catalog projection and reviewed add, edit, or retire mutation with
  source revision, canonical readback, and repository-readiness enforcement
- Delivery Execution in-flight change projection, reviewed tree and package
  commands, exact next actions, receipts, and repository-custody routing
- Delivery closeout readiness, reviewed evidence and impact, terminal command,
  durable outcome history, replay, receipts, and reconciliation projection
- Repository existing-source custody linkage through OOS, with immutable
  provider identity, WGCF decision evidence, provider readback, and a terminal
  custody receipt
- Repository provisioning through OOS, with server-held GitHub App authority,
  exact reviewed settings, provider-operation projection, and a terminal
  provisioning receipt
- Repository lifecycle control through OOS, with guarded custody transfer,
  provider archive/unarchive, workspace retirement/restore, reversal binding,
  replay, terminal receipts, and read-only audit history
- Workspace Intake classification from typed source candidates through
  server-built OOS commands, exact authority review, durable progress, and
  merged-authority receipt projection
- Workspace Registry inspection and active-inventory promotion through a
  server-only, stale-safe OOS adapter with explicit fixture isolation
- Product Portfolio publication through an exact owner-manifest binding,
  server-only OOS workflow, WGCF readiness, replay-safe version chain, and
  immutable owner receipt; the internal-only path is commissioned, while
  broader audience postures remain inactive pending their current Security,
  OOS source-activation, and Platform commissioning sequence
- Model Operations request creation through OOS plus exact Platform profile
  source, lifecycle receipt, and merged-readback reconciliation; the Console
  retains no registry, fulfillment, Security, or activation authority
- Agent Console sessions and invocations through OOS, CGG model-safe context,
  the governed Agent Console profile, gateway audit evidence, and terminal
  receipts; the Console retains no context-admission, model, action, Security,
  or activation authority
- owner-backed Command Center Focus and Workspace Pulse composition from one
  freshness-aware, deduplicated attention snapshot
- bounded Governance Activity composition from canonical OOS workflow activity
  and WGCF governance history, with owner evidence routes and no Console ledger
- Workspace Prototype Studio-owned Preview Runtime status, bounded lifecycle
  commands, exact-source proof, and digest-bound receipt projection through a
  server-only local owner adapter

Prototype source discovery and operational workflows without a named live
integration contract remain:

- private and operator-local
- loopback-only for local preview
- fixture-backed or synthetic unless their own contract says otherwise
- read-only for bounded local host telemetry
- prototype-local for simulated writes and receipts outside a named live owner
  integration

When an admitted live integration is configured, its canonical GET projection
must use the Console source-projection media type. Legacy JSON, stale or
conflicting ordering, unavailable authority, and owner mismatch fail closed;
the adapter does not fall back to fixtures. Explicit disconnected preview
remains available only when that live integration is not configured.

Source graduation does not grant:

- workspace contracts or intake decisions
- Workspace Delivery ART work-state truth
- shared workflow orchestration
- platform deployment or release authority
- identity or security acceptance
- live backend mutation or durable receipt authority
- governed AI, stage, production, public, or client-visible runtime status

## Product Source

The application is a Next.js 15 console with product source under `src/`,
architecture guards under `scripts/guards/`, semantic and system-simulation
tests under `tests/`, and product records under [`docs/product`](docs/product/).

The exact approved source origin and transfer mapping are recorded in
[`docs/graduation/source-manifest.json`](docs/graduation/source-manifest.json).
The approved design-baseline record is retained at
[`docs/graduation/approved-design-baseline.yaml`](docs/graduation/approved-design-baseline.yaml).

## Local Development

Use Node.js 22 and npm 10, matching the repository CI and governed owner
evidence runtime. With `nvm`, run `nvm use` from the repository root.

```bash
npm ci
npm run dev
```

The local preview binds to `http://127.0.0.1:3317`.

Before advancing a checkout used by an active Console, inspect the actual
running command and working directory. A running development server watches
its source checkout: pulling a merge can activate new source immediately,
before dependency installation, Security acceptance or Platform commissioning.
A successful build elsewhere does not prove the running process uses it.

Use the existing Platform complete-runtime procedure to retain every live
source consumer on the accepted revision until commissioning. Check both the
frontend process and repository-credential refresh; pinning only the refresh
consumer does not isolate the frontend. Preserve the existing private
environment and account custody. After acceptance, install the selected locked
dependencies and use normal activation to replace temporary source-path
overrides. Verify actual process source, refresh readiness and HTTP/native
workflow readback before retiring the accepted snapshot. Checkout advancement,
service existence and source merge alone do not establish operating readiness.

Use `npm run check` for the complete architecture, semantic, type, and
production-build validation.

The Proposal live adapter is configured through the server-only environment
boundary documented in
[`docs/product/proposal-live-integration.md`](docs/product/proposal-live-integration.md).
The Prototype Landing boundary is documented in
[`docs/product/prototype-landing-live-integration.md`](docs/product/prototype-landing-live-integration.md).
The Prototype Maturity boundary is documented in
[`docs/product/prototype-maturity-live-integration.md`](docs/product/prototype-maturity-live-integration.md).
The Prototype Closure and History boundary is documented in
[`docs/product/prototype-closure-live-integration.md`](docs/product/prototype-closure-live-integration.md).
The Prototype Preview Runtime owner boundary is documented in
[`docs/product/prototype-preview-runtime-live-integration.md`](docs/product/prototype-preview-runtime-live-integration.md).
The Prototype Delivery application boundary is documented in
[`docs/product/prototype-delivery-live-integration.md`](docs/product/prototype-delivery-live-integration.md).
The Delivery Work Design boundary is documented in
[`docs/product/work-design-live-integration.md`](docs/product/work-design-live-integration.md).
The Delivery Architecture Packet and execution work-session boundary is
documented in
[`docs/product/delivery-execution-work-sessions.md`](docs/product/delivery-execution-work-sessions.md).
The Delivery Refinement and Catalog boundary is documented in
[`docs/product/refinement-catalog-live-integration.md`](docs/product/refinement-catalog-live-integration.md).
The Delivery in-flight adaptation boundary is documented in
[`docs/product/delivery-change-control-live-integration.md`](docs/product/delivery-change-control-live-integration.md).
The Delivery terminal closeout boundary is documented in
[`docs/product/delivery-closeout-live-integration.md`](docs/product/delivery-closeout-live-integration.md).
The Repository custody linkage boundary is documented in
[`docs/product/repository-custody-live-integration.md`](docs/product/repository-custody-live-integration.md).
The Repository provisioning boundary is documented in
[`docs/product/repository-provisioning-live-integration.md`](docs/product/repository-provisioning-live-integration.md).
The Repository lifecycle boundary is documented in
[`docs/product/repository-lifecycle-live-integration.md`](docs/product/repository-lifecycle-live-integration.md).
The Workspace Intake boundary is documented in
[`docs/product/workspace-intake-live-integration.md`](docs/product/workspace-intake-live-integration.md).
The Workspace Registry boundary is documented in
[`docs/product/workspace-registry-live-integration.md`](docs/product/workspace-registry-live-integration.md).
The shared Registry and Product Portfolio canonical read boundary is documented
in
[`docs/product/workspace-continuity-live-integration.md`](docs/product/workspace-continuity-live-integration.md).
The governed Product Publication boundary is documented in
[`docs/product/product-publication-live-integration.md`](docs/product/product-publication-live-integration.md).
That boundary also documents the separately activated Product Dashboard
lifecycle/publication/Platform-health composition and archive/restore review.
The Model Operations request and source-reconciliation boundary is documented
in
[`docs/product/model-operations-live-integration.md`](docs/product/model-operations-live-integration.md).
The governed Agent Console session, context, model, and evidence boundary is
documented in
[`docs/product/agent-console-live-integration.md`](docs/product/agent-console-live-integration.md).
The shared runtime configuration, capability, correlation, and audit boundary
is documented in
[`docs/product/console-runtime-operability.md`](docs/product/console-runtime-operability.md).
The owner-attention composition boundary is documented in
[`docs/product/owner-attention-live-integration.md`](docs/product/owner-attention-live-integration.md).
The Governance Activity composition boundary is documented in
[`docs/product/governance-activity-live-integration.md`](docs/product/governance-activity-live-integration.md).

## Authority Map

| Responsibility | Authority |
| --- | --- |
| Workspace classification and owner map | [Workspace Governance](https://github.com/mfshaf7/workspace-governance) |
| Prototype history and graduation record | [Workspace Prototype Studio](https://github.com/mfshaf7/workspace-prototype-studio) |
| Durable product source after graduation | This repository |
| Delivery work state and shared workflow APIs | [Operator Orchestration Service](https://github.com/mfshaf7/operator-orchestration-service) |
| Runtime integration and governed release | [Platform Engineering](https://github.com/mfshaf7/platform-engineering) |
| Trust boundaries and security acceptance | [Security Architecture](https://github.com/mfshaf7/security-architecture) |

## Security Baseline

The current reviewed baseline is recorded in:

- [Security review checklist](https://github.com/mfshaf7/security-architecture/blob/main/docs/reviews/security-review-checklist.md)
- [Governance Operations Console source-graduation security delta](https://github.com/mfshaf7/security-architecture/blob/main/docs/reviews/components/2026-07-31-governance-operations-console-source-graduation.md)
- [Governance Operations Console owner-repository admission review](https://github.com/mfshaf7/security-architecture/blob/main/docs/reviews/components/2026-07-31-governance-operations-console-owner-repository-admission.md)
- [Governance Operations Console baseline security delta](https://github.com/mfshaf7/security-architecture/blob/main/docs/reviews/components/2026-07-30-governance-operations-console-baseline-security-delta.md)
- [Workspace Prototype Studio incubation security baseline](https://github.com/mfshaf7/security-architecture/blob/main/docs/reviews/components/2026-05-06-workspace-prototype-studio-product-incubation-baseline.md)
- [Workspace Prototype Studio security architecture](https://github.com/mfshaf7/security-architecture/blob/main/docs/architecture/components/workspace-prototype-studio/README.md)

See [Security and data boundaries](docs/security-and-data-boundaries.md) before
adding source, runtime adapters, identity integration, external data, or
deployment configuration.

## Validation

Run validation with Node.js 22 and npm 10.

Run:

```bash
python3 scripts/validate_repository.py
npm ci
npm run check
npm audit --omit=dev
```

The repository validator checks the owner and source structure and rejects
common public-source leaks, unresolved placeholders, secret-bearing files, and
disposable runtime artifacts. The product check runs the complete approved
architecture and behavior baseline.
