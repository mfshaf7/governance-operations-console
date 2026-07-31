# Governance Operations Console Agent Notes

This repository is the durable product-source owner for the Governance
Operations Console.

## Read First

- `README.md`
- `docs/security-and-data-boundaries.md`
- `docs/product/README.md`
- `docs/graduation/source-manifest.json`
- [Security review checklist](https://github.com/mfshaf7/security-architecture/blob/main/docs/reviews/security-review-checklist.md)
- [Source-graduation security delta](https://github.com/mfshaf7/security-architecture/blob/main/docs/reviews/components/2026-07-31-governance-operations-console-source-graduation.md)
- [Owner-repository admission review](https://github.com/mfshaf7/security-architecture/blob/main/docs/reviews/components/2026-07-31-governance-operations-console-owner-repository-admission.md)

## Current Boundary

- The repository contains the exact approved application baseline plus the
  explicitly recorded path and ownership adaptations required for graduation.
- Workspace Prototype Studio retains prototype history and the final
  graduation record; it must not retain a competing active source copy.
- Preserve baseline behavior and visual design during graduation. Any broader
  product change needs separate ART scope after custody is complete.
- Do not claim live backend wiring, production deployment, identity authority,
  security acceptance, or governed release maturity from repository
  source graduation alone.

## Ownership

This repository owns:

- product source
- product-local architecture and interface contracts
- product tests and build validation
- product-local operator documentation

This repository does not own:

- workspace classification or cross-repo contracts
- Workspace Delivery ART work state
- shared operator workflow services
- platform runtime or release authority
- security standards or security acceptance

Route those changes to Workspace Governance, Operator Orchestration Service,
Platform Engineering, or Security Architecture as appropriate.

## Public Source Rules

- Do not commit credentials, tokens, private keys, private endpoint details, or
  real operator data.
- Do not commit operator-local absolute paths or machine-specific setup notes.
- Do not commit `.env` files, build output, dependency trees, logs, temporary
  files, or runtime state.
- Use synthetic fixtures until a separately governed data boundary permits
  otherwise.
- Keep links in Git-tracked documentation web-safe.

## Review Guidelines

- Treat identity, secrets, external data, backend mutation, AI-enabled action,
  runtime control, deployment, and release changes as security triggers.
- Preserve operator review, auditability, rollback, and fail-closed authority
  boundaries.
- Confirm product behavior remains distinct from workspace-governance,
  platform, workflow, and security authority.
- During source graduation, prove baseline equivalence before changing
  behavior or visual design.
- Keep public-source safety and repository validation passing.
- Treat the local Ollama adapter, synthetic identity, local host telemetry,
  browser-memory evidence, fixture-backed workflows, and prototype-local
  receipts as constrained baseline behavior, not live authority.

## Validation

Run:

```bash
python3 scripts/validate_repository.py
npm ci
npm run check
npm audit --omit=dev
```
