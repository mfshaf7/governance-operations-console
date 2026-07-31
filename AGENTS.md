# Governance Operations Console Agent Notes

This repository is the durable product-source owner for the Governance
Operations Console after its approved Prototype Studio baseline graduates.

## Read First

- `README.md`
- `docs/security-and-data-boundaries.md`

## Current Boundary

- The repository is provisioned but does not yet contain the approved
  application source.
- Workspace Prototype Studio remains source and local preview authority until
  the separate source-transfer landing is reviewed, validated, and recorded.
- Do not reconstruct, partially copy, or independently reshape the application
  before that transfer.
- Do not claim live backend wiring, production deployment, identity authority,
  security acceptance, or governed release maturity from repository
  provisioning alone.

## Ownership

This repository owns:

- product source after graduation
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

## Validation

Run:

```bash
python3 scripts/validate_repository.py
```
