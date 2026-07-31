# Security And Data Boundaries

## Current Posture

Repository provisioning does not activate the Console, move the approved
prototype source, or authorize connections to live workspace systems.

The current security evidence is:

- [Security review checklist](https://github.com/mfshaf7/security-architecture/blob/main/docs/reviews/security-review-checklist.md)
- [Governance Operations Console owner-repository admission review](https://github.com/mfshaf7/security-architecture/blob/main/docs/reviews/components/2026-07-31-governance-operations-console-owner-repository-admission.md)
- [Governance Operations Console baseline security delta](https://github.com/mfshaf7/security-architecture/blob/main/docs/reviews/components/2026-07-30-governance-operations-console-baseline-security-delta.md)
- [Workspace Prototype Studio incubation security baseline](https://github.com/mfshaf7/security-architecture/blob/main/docs/reviews/components/2026-05-06-workspace-prototype-studio-product-incubation-baseline.md)
- [Workspace Prototype Studio security architecture](https://github.com/mfshaf7/security-architecture/blob/main/docs/architecture/components/workspace-prototype-studio/README.md)

## Authority Boundaries

- Workspace Governance owns classification and cross-repo contract truth.
- Operator Orchestration Service owns shared workflow APIs and adapters.
- Platform Engineering owns runtime integration, deployment, and release.
- Security Architecture owns trust-boundary review and security acceptance.
- This repository owns product source only after the recorded graduation
  completes.

The Console may project evidence from those authorities. It must not replace
them or imply that a local UI state is an authority decision.

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
