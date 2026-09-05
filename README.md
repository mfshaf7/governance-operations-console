# Governance Operations Console

This repository owns the durable product source for the Governance Operations
Console.

## Current Status

The approved Prototype Studio baseline is present in this repository as the
source-graduation candidate for ART `openproject://work_packages/784`. The
cross-repo graduation record establishes final custody after the source landing,
Prototype Studio handoff, and Workspace Governance product promotion are all
reviewed.

The graduated baseline remains private and loopback-only. The Console now has
separately governed OOS integration slices:

- server-only OOS caller credentials and operator attribution
- canonical Proposal list, capture, projection, command, and history paths
- bounded visible-page polling with fail-closed writes
- explicit disconnected preview when no OOS endpoint is configured
- Prototype-to-Delivery application for an exact, source-authoritative
  Prototype Delivery packet, with server-only caller credentials and
  receipt-bound result projection
- Delivery Work Design source projection, bounded governed advice, canonical
  apply, reconciliation, and durable receipt readback
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

Prototype source discovery and operational workflows without a named live
integration contract remain:

- private and operator-local
- loopback-only for local preview
- fixture-backed or synthetic unless their own contract says otherwise
- read-only for bounded local host telemetry
- prototype-local for simulated writes and receipts outside Proposal live mode

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

```bash
npm ci
npm run dev
```

The local preview binds to `http://127.0.0.1:3317`.

Use `npm run check` for the complete architecture, semantic, type, and
production-build validation.

The Proposal live adapter is configured through the server-only environment
boundary documented in
[`docs/product/proposal-live-integration.md`](docs/product/proposal-live-integration.md).
The Prototype Delivery application boundary is documented in
[`docs/product/prototype-delivery-live-integration.md`](docs/product/prototype-delivery-live-integration.md).
The Delivery Work Design boundary is documented in
[`docs/product/work-design-live-integration.md`](docs/product/work-design-live-integration.md).
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
