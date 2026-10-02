# Workspace Entrant Classification Definition

Status: `source-implemented`, live activation blocked by Security `#1066` and
Platform identity activation `#1082`.

Definition id: `workspace.entrant.classify`

Definition version: `2`

Classification: `durable`

## Purpose

Record one explicit Workspace Governance classification for a repository,
product, or component entrant as `out-of-scope`, `proposed`, or `admitted` in
`workspace-governance/contracts/intake-register.yaml`.

Classification is not active registration. An admitted intake entry remains
outside active inventory until the separate promotion workflow succeeds.

## Sources

A typed candidate may come from Repository custody, Prototype, Delivery
closeout, or a direct/audit source adapter. Proposal routes ideas before a
durable workspace boundary necessarily exists and does not classify entrants.

The source owns candidate identity, bounded requested metadata, and immutable
evidence references. The Console must not reconstruct missing source truth.

## Ownership

| Boundary | Owner |
| --- | --- |
| Candidate evidence and source context | Originating domain |
| Intake vocabulary and canonical record | Workspace Governance |
| Durable command, progress, replay, and receipt | Operator Orchestration Service (OOS) |
| Readiness evaluation | Workspace Governance Control Fabric (WGCF) |
| OOS caller identity activation | Platform Engineering |
| Trust-boundary acceptance | Security Architecture |
| Operator interaction and projection | Governance Operations Console |

There is no standalone Product Intake operation. The Console embeds one shared
wizard in the originating surface and uses same-origin routes. Only the Console
server holds OOS caller credentials or constructs authority-bound commands.

## Durable Flow

1. Read current canonical preparation from OOS for exactly one target.
2. Select one classification and review the source candidate plus exact
   authority revision, register digest, and current record binding.
3. Confirm operator acceptance and submit the OOS v2 request and decision.
4. Continue the durable request through WGCF evaluation and source preparation.
5. At `review-required`, open the exact provider review. OOS has no merge
   endpoint; human review and merge remain provider actions.
6. Continue after merge. Only `succeeded` with a `merged-authority` receipt and
   canonical readback proves mutation.

The Console server re-reads preparation immediately before submission and
rejects stale reviewed state. Reusing a request identity with different input
is a conflict; replaying the identical command returns the existing result.

## Decision

- `out-of-scope`: intentionally outside Workspace Governance
- `proposed`: more evidence or ownership work is required
- `admitted`: approved to proceed toward active inventory

The v2 decision records explicit operator acceptance. Candidate
`requested_record.notes` carries bounded durable source context; the Console
does not collect a local-only rationale that OOS cannot persist. AI-suggested
classification remains unavailable until an approved profile and explicit
operator acceptance are both represented by the authority contract.

## Failure And Recovery

- malformed candidate, result, review, or receipt data fails closed
- configured OOS failure never falls back to fixtures
- stale authority requires a fresh preparation and review
- denied or requires-action results preserve WGCF findings
- an unmerged review may be cancelled; merged authority requires a separate
  reversal workflow
- canonical mutation remains false until merged readback proves the exact
  approved record

## Current Boundary

The Console source includes the Delivery closeout adapter, same-origin API,
server-only OOS client, embedded three-step wizard, and strict result
projection. OOS, Workspace Governance, WGCF, and the Platform identity source
are implemented but intentionally live-inactive pending `#1066` and `#1082`.
Operating conformance belongs to `#1069`; this source slice does not claim live
activation, deployment, or security acceptance.
