# Prototype Delivery Live Integration

## Purpose

This is the primary Console instruction surface for applying one exact,
source-authoritative Prototype Delivery packet through Operator Orchestration
Service and projecting its durable result back into Prototype.

The Console is a projection client. Workspace Prototype Studio owns the packet,
WGCF owns readiness evaluation, OOS owns application and receipt correlation,
and OpenProject owns the resulting Delivery Epic and activity custody.

## Preconditions

The live action is available only when the Prototype read model supplies:

- a packet with `authority: workspace-prototype-studio`
- a `baseline-approved` source version
- resolved or not-required source custody
- an approved source authorization decision
- the exact baseline, work, posture, and evidence payload required by OOS

The Console does not derive this packet from fixture fields. Until an admitted
Workspace Prototype Studio projection supplies it, fixture-backed Movement
Request remains a local preview and cannot claim a live Delivery application.

## Server Configuration

Provide these values through the local or platform-owned runtime environment.
Do not expose them through `NEXT_PUBLIC_*` variables or commit concrete values.

| Variable | Required | Purpose |
| --- | --- | --- |
| `OOS_BASE_URL` | yes | OOS HTTP endpoint visible to the Console server. |
| `OOS_CALLER_SECRET` | yes | Caller-authentication secret delivered by the runtime owner. |
| `OOS_CALLER_ID` | no | Defaults to `governance-operations-console` and becomes the server-authenticated operator attribution. |

The browser calls only same-origin
`/api/prototypes/delivery-applications` routes. OOS caller credentials and
operator attribution are assembled server-side.

## Application Behavior

1. The Console validates but does not rewrite the source packet.
2. The server submits the packet and one decision reference to
   `POST /v1/delivery-ingress/prototype/applications`.
3. OOS authenticates the Console caller, requests WGCF readiness, and creates
   or reuses exactly one Delivery Epic through its canonical adapter.
4. OOS returns the exact packet binding, target ref, readiness evidence, and
   durable OpenProject activity receipt.
5. The Console rejects malformed, denied, or packet-mismatched results.
6. Only a valid OOS result may project the Prototype as `graduated`, attach the
   Delivery target link, and add a source-projected receipt.
7. Repeating the same packet and decision is deterministic and reuses the
   existing application.

The Console never calls OpenProject or WGCF directly and never treats a local
workflow receipt as proof of target application.

## Current Boundary

Implemented:

- server-only OOS application and read adapters
- same-origin Next.js routes
- strict packet and result validation
- exact packet/result binding
- receipt-bound Prototype projection
- deterministic replay, conflict, and malformed-result tests

Still separate:

- Workspace Prototype Studio packet discovery and transport
- a live Delivery register/read adapter for the created Epic
- authenticated human identity beyond the server caller boundary
- platform deployment and security acceptance

## Validation

Run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/operation-runtime/prototype-delivery-live-adapter.test.mjs
npm run check
```
