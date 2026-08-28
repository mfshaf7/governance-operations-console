# Security And Data Boundaries

## Current Posture

The approved Console source baseline is graduated. Proposal, the bounded
Prototype-to-Delivery application, and Delivery Work Design, Refinement,
Catalog, Execution work sessions, and in-flight Delivery change control are
separately governed external-system adapters: the browser calls same-origin
Console routes and the server-side adapters authenticate to OOS. These source
changes do not themselves grant deployment or security acceptance.

The current security evidence is:

- [Security review checklist](https://github.com/mfshaf7/security-architecture/blob/main/docs/reviews/security-review-checklist.md)
- [Refinement and Catalog dev-integration boundary review](https://github.com/mfshaf7/security-architecture/blob/main/docs/reviews/components/2026-08-26-refinement-catalog-dev-integration-boundary.md)
- [Governance Operations Console source-graduation security delta](https://github.com/mfshaf7/security-architecture/blob/main/docs/reviews/components/2026-07-31-governance-operations-console-source-graduation.md)
- [Governance Operations Console owner-repository admission review](https://github.com/mfshaf7/security-architecture/blob/main/docs/reviews/components/2026-07-31-governance-operations-console-owner-repository-admission.md)
- [Governance Operations Console baseline security delta](https://github.com/mfshaf7/security-architecture/blob/main/docs/reviews/components/2026-07-30-governance-operations-console-baseline-security-delta.md)
- [Workspace Prototype Studio incubation security baseline](https://github.com/mfshaf7/security-architecture/blob/main/docs/reviews/components/2026-05-06-workspace-prototype-studio-product-incubation-baseline.md)
- [Workspace Prototype Studio security architecture](https://github.com/mfshaf7/security-architecture/blob/main/docs/architecture/components/workspace-prototype-studio/README.md)

## Authority Boundaries

- Workspace Governance owns classification and cross-repo contract truth.
- Operator Orchestration Service owns shared workflow APIs and adapters.
- Platform Engineering owns runtime integration, deployment, and release.
- Security Architecture owns trust-boundary review and security acceptance.
- This repository owns durable product source after the recorded graduation
  completes.

The Console may project evidence from those authorities. It must not replace
them or imply that a local UI state is an authority decision.

## Graduated Baseline Boundary

The transferred baseline remains limited to:

- loopback local preview
- read-only local host telemetry
- synthetic or fixture-backed operational records
- prototype-local workflow state and receipts
- synthetic, unauthenticated operator identity
- manual, suggestion-only local Ollama interaction with synthetic context

The Proposal exception to that baseline is bounded to OOS list, capture,
projection, command, and history routes. OOS credentials and configured
operator attribution are server-only. Configured OOS failure disables Proposal
writes and never falls back to synthetic records.

The Prototype exception is narrower. The Console may submit an exact
source-authoritative Prototype Delivery packet to OOS and project only the
validated application result and durable receipt. The browser cannot supply
OOS caller identity or credentials, the Console does not create the canonical
packet, and neither browser nor server mutates OpenProject or WGCF directly.
If no Workspace Prototype Studio packet is available, the existing fixture
workflow remains explicitly local and cannot invoke the live adapter.

The Delivery Work Design exception is bounded to canonical source projection,
governed context and tree advice, canonical apply, reconciliation, and durable
receipt readback through OOS. OOS credentials and configured operator
attribution remain server-only. The model supplies advice only; it cannot apply
the draft. A configured OOS failure blocks canonical advice and apply and never
falls back to fixture behavior. A valid apply receipt is recorded in the
current Console session without fabricating a fixture Refinement package as
canonical backend state.

The Delivery Refinement exception is bounded to canonical packet and run
projection, admitted metadata advice, exact reviewed apply, durable event
polling, canonical readback, and receipt projection through OOS. The model
cannot apply metadata. Configured failure locks advice and apply without local
fallback, and only a completed run with a validated receipt reports success.

The Delivery Catalog exception is bounded to canonical group, item, and value
projection plus reviewed add, edit, and retire mutations through OOS. Owner
Repository linking requires an exact WGCF readiness reference already exposed
through canonical truth. The Console does not call WGCF, OpenProject, or the
privileged Catalog adapter directly and does not synthesize missing readiness.

The Delivery Execution work-session source exception is bounded to same-origin
read, start, and continue adapters over OOS-owned session state. The browser
cannot choose caller credentials or operator authority, read Git, call
OpenProject, choose a source path or executor, derive progress or completion,
or fabricate a receipt. The Console server rebuilds an accepted Landing Unit
decision from the caller-bound OOS draft and bounded operator fields. Configured
failure remains unavailable and never records a prototype-local success.
Mutable `dev-integration` activation remains denied until Security Architecture
binds the exact merged Console and OOS heads and accepts the admitted executor
and composed proof.

The Delivery in-flight change exception is bounded to same-origin canonical
projection and reviewed command routes over OOS-owned change control. Caller
credentials, accountable operator construction, and accepted-command records
remain server-side. The browser may submit only a bounded operation, expected
source revision, replay-safe command identity, and acceptance note. OOS retains
mutation semantics, OpenProject access, replay, receipts, rollback disposition,
and exact next actions. Repository creation remains in Repository operation and
Owner Repo value admission remains in Delivery Catalog. Configured read or
write failure, stale revision, rejection, partial failure, or malformed truth
must stop the action and must never become a prototype-local success.

The source manifest is
[`graduation/source-manifest.json`](graduation/source-manifest.json). The
baseline security findings remain expansion gates until separately reviewed
live-integration work resolves them.

## Public Repository Boundary

Allowed content includes public product source, synthetic fixtures, contracts,
tests, architecture records, and operator documentation.

Do not commit:

- credentials, tokens, private keys, cookies, or session material
- real operator, client, or workspace data
- private endpoint or host inventory
- operator-local absolute paths or machine-specific instructions
- `.env` files, dependency trees, build output, logs, temporary files, or
  runtime state

## Security Triggers

Require a fresh Security Architecture review when a change introduces or
materially changes:

- authentication, authorization, identity, or session handling
- secrets or credential delivery
- real data or external-system access
- mutable backend actions or privileged host control
- AI-enabled action paths
- runtime exposure, ingress, deployment, or release behavior
