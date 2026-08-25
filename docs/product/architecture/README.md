# Governance Operations Console Architecture

Status: canonical approved-baseline target-system model.

This directory replaces the former single `architecture-diagrams.md` record.
The architecture is model-first:

- [`system-model.yaml`](system-model.yaml) is the machine-readable source.
- [`views/`](views/) contains human-readable projections over that model.
- Domain and surface contracts contain local detail but must not redefine a
  cross-domain authority, lifecycle, handoff, or implementation-maturity fact
  declared here.

The model is owned by the `governance-operations-console` repository after
source graduation. It is not a workspace-wide runtime contract and does not
authorize cross-repo implementation.

## Read Order

1. [`01-system-context.md`](views/01-system-context.md)
2. [`02-operator-surfaces.md`](views/02-operator-surfaces.md)
3. [`03-authority-map.md`](views/03-authority-map.md)
4. [`04-lifecycle.md`](views/04-lifecycle.md)
5. [`05-handoffs.md`](views/05-handoffs.md)
6. [`06-runtime-release.md`](views/06-runtime-release.md)
7. [`07-capability-maturity.md`](views/07-capability-maturity.md)
8. [`08-foundation-proof.md`](views/08-foundation-proof.md)

## Interpretation Rule

The target architecture and current implementation are independent facts.

- `design_status` says whether a capability is observed, approved as the
  target, merely proposed, or retired.
- `implementation.console` says whether its Console shape exists.
- `implementation.backend_support` says whether its authority backend exists.
- `implementation.live_adapter` says whether the Console is actually connected.
- `implementation.delivery_phase` says whether the work belongs before the
  design baseline, at the baseline gate, or after baseline approval.

An approved target may therefore have a complete Console prototype while its
backend or live adapter is still missing. That is a planned implementation gap,
not permission to display a fake live effect.

`partial` adapter status means one admitted live slice exists while another
required source, command, or read projection remains disconnected. It must be
described explicitly in the owning integration record.

## Authority Rule

The Console is an operator and command surface. It has no canonical business
database.

Canonical authority remains with Workspace Governance, OOS, OpenProject,
Workspace Prototype Studio, owner repositories, Platform Engineering, Security
Architecture, WGCF, CGG, or the future federated identity boundary named in the
model. Prototype-local drafts and receipts prove interaction only.

## Change Rule

A change to a cross-domain role, authority, lifecycle, handoff, trust boundary,
or implementation status starts in `system-model.yaml`. Update every affected
view and detailed contract in the same change.

Do not add another architecture overview beside this packet. If a new view is
needed, register it under `views` in `system-model.yaml` so coverage validation
can prove that it belongs to the same model.
