# Security And Data Boundaries

## Current Posture

The approved Console source baseline is graduated. Proposal and the bounded
Prototype-to-Delivery application are separately governed external-system
adapters: the browser calls same-origin Console routes and the server-side
adapters authenticate to OOS. These source changes do not themselves grant
deployment or security acceptance.

The current security evidence is:

- [Security review checklist](https://github.com/mfshaf7/security-architecture/blob/main/docs/reviews/security-review-checklist.md)
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
