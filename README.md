# Governance Operations Console

This repository is the durable product-source home for the Governance
Operations Console.

## Current Status

The repository is provisioned, but the approved application baseline has not
graduated here yet. Workspace Prototype Studio remains the source and local
preview authority until the separately reviewed source-transfer work is
complete.

This repository currently owns:

- product ownership guidance
- repository review controls
- public-source safety validation
- the future durable application source after graduation

It does not own:

- workspace contracts or intake decisions
- Workspace Delivery ART work-state truth
- shared workflow orchestration
- platform deployment or release authority
- identity or security acceptance
- the approved prototype source before graduation completes

## Authority Map

| Responsibility | Authority |
| --- | --- |
| Workspace classification and owner map | [Workspace Governance](https://github.com/mfshaf7/workspace-governance) |
| Current approved application source | [Workspace Prototype Studio](https://github.com/mfshaf7/workspace-prototype-studio) |
| Delivery work state and shared workflow APIs | [Operator Orchestration Service](https://github.com/mfshaf7/operator-orchestration-service) |
| Runtime integration and governed release | [Platform Engineering](https://github.com/mfshaf7/platform-engineering) |
| Trust boundaries and security acceptance | [Security Architecture](https://github.com/mfshaf7/security-architecture) |

## Security Baseline

The current reviewed baseline is recorded in:

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
```

The validator checks the owner skeleton and rejects common public-source
leaks, unresolved placeholders, secret-bearing files, and disposable runtime
artifacts.
