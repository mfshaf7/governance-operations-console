# Governance Console Foundation Simulation

Status: completed historical pre-baseline proof; the reviewed source was later
approved and graduated without changing this simulation.

## Purpose

This simulation tests whether the Governance Operations Console can carry one
small product from Proposal capture to a managed Product Portfolio entry while
preserving domain ownership, state order, failure behavior, and future backend
contracts.

The original proof was isolated inside Workspace Prototype Studio. Its
graduated copy remains a local contract simulation and does not update
Workspace Governance, OpenProject, Platform Engineering, Security Architecture,
or any live service.

## Test Product

`Focus Timer` is a test-only static application with start, pause, and reset
controls. Its manifest defines product identity, owner references, Prototype
support posture, and Portfolio policy input. The simulation starts an ephemeral
local HTTP server and verifies the returned HTML, CSS, and executable
JavaScript.

Source:
[`tests/system-simulation/fixtures/focus-timer-app/`](../../tests/system-simulation/fixtures/focus-timer-app/)

## Result

All 54 catalogued behaviors pass:

| Proof boundary | Count | Meaning |
| --- | ---: | --- |
| Console-local | 42 | Runs current local command, state, gate, packet, or projection code. |
| Contract-simulated | 12 | Runs an isolated typed model for a missing owner-backend boundary. |

The covered families are Proposal terminal and destination routes, Repository
gate resolution, the full Prototype decision family, Delivery failure and retry
through Refinement plus both closeout classes, Workspace Intake and
active-inventory rules, and every distinct Portfolio publication outcome.

## Corrections Found By The Simulation

1. Proposal route validation accepted unknown runtime values. The integration
   boundary now rejects unsupported targets.
2. Proposal could record a handoff attempt while repository custody remained
   unresolved. The command now rejects it before creating a successful receipt.
3. Proposal-routed Prototype records did not carry complete source-custody
   truth. Entry projection now retains it.
4. Prototype Landing allowed an unassigned base platform. Landing now blocks
   until the support shape is concrete.
5. Candidate and Baseline commands could be attempted outside their required
   lifecycle order. Their transition models now enforce Landing and Candidate
   evidence.
6. Baseline approval did not fully require current preview and retained
   evidence. The promotion gate now evaluates the complete current packet.
7. Prototype Movement accepted unknown runtime intent values. The transition
   now rejects unsupported intents.
8. Portfolio could be interpreted as admitting a product directly. Publication
   now requires a matching active product inventory version.
9. The first Workspace Governance simulator used Console-invented active-record
   fields and promoted a component before its product dependency existed. The
   contract model now mirrors the canonical intake, repository, product, and
   component schemas, and the proof promotes repository, product, then
   component.

## Backend Agreement

The local models and future adapters agree on these invariants:

- source id and source version are frozen before mutation;
- actor, authority, correlation, and idempotency are explicit;
- validation, target admission, execution, and final receipt are separate;
- stale intake versions and stale active-record digests are rejected;
- active-inventory promotion removes one admitted intake entry and adds exactly
  one typed active record atomically;
- active products reference only repositories already present in active
  inventory;
- components reference only active owner and security repositories plus an
  active product when one is declared;
- Portfolio cannot create product identity or substitute for Workspace Intake;
- replay returns the original result without duplicating state;
- a failed or forbidden route cannot project success.

## Remaining Gaps

The simulation proves architecture, not live readiness. These gaps remain:

1. Delivery Execution projection and closeout now run through production
   Console-local models against an OOS-shaped readiness snapshot. The live OOS
   command/readback adapter remains post-baseline integration work.
2. Workspace Intake classification and active-inventory promotion do not yet
   have source adapters, authenticated owner-backend commands, or canonical
   readback. The Console now owns production-shaped candidate, command, record,
   dependency, and receipt contracts matching the authority schemas, while the
   isolated simulator proves those contracts without serving as durable
   implementation.
3. Proposal-to-Prototype and Portfolio publication still lack their final OOS
   and authority adapters. Prototype-to-Delivery now has OOS target application
   and a bounded Console adapter, while Workspace Prototype Studio packet
   discovery remains separate work.
4. Real identity, authorization, durable receipt storage, retry scheduling,
   authority readback, and rollback proof remain post-baseline implementation
   work.
5. The synthetic preview proves a runnable product artifact only. It does not
   prove governed stage, production, security acceptance, or public exposure.

## Engineering Recommendation

The cross-domain foundation was accepted for the approved local source
baseline. Live Integration and Deployment remain blocked until separately
governed work supplies the required authority, security, and runtime evidence.

The owner-repository `npm run check` command runs the architecture guards, full
semantic suite, typecheck, and production build. The focused simulation remains
available through `npm run test:system-simulation`. Implement each missing
adapter in its own authority repo and repeat the same catalog against live
readback and durable receipts rather than replacing this contract test.

## Reproduce

```bash
npm run test:system-simulation
npm run test:semantics
npm run architecture
npm run typecheck
npm run build
```
