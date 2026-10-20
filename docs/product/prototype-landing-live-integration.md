# Prototype Landing Live Integration

## Purpose

This is the primary Console instruction surface for landing one accepted
Prototype entry into reviewed Workspace Prototype Studio source through
Operator Orchestration Service.

The Console is the operator client, not the workflow or source authority.
Workspace Prototype Studio owns the Prototype registry and incubation source,
WGCF owns readiness, OOS owns durable execution and receipts, and the source
provider owns human review and merge.

## Server Configuration

Configure the Console server through runtime-owned environment values. Never
expose these values through `NEXT_PUBLIC_*` or browser fields.

| Variable | Required | Purpose |
| --- | --- | --- |
| `OOS_BASE_URL` | yes | OOS endpoint visible to the Console server. |
| `OOS_CALLER_SECRET` | yes | Server-only OOS caller credential. |
| `OOS_CALLER_ID` | no | Caller identity; defaults to `governance-operations-console`. |

The browser calls only same-origin `/api/prototypes/landings` routes. It
supplies the reviewed Landing draft and source evidence, while the Console
server re-reads preparation and constructs the canonical digest-bound command,
caller attribution, approval reference, session reference, and execution
reference.

## Operator Procedure

1. Open a captured Prototype and complete Landing Profile and Setup Plan.
2. Run Landing. The Console reads the exact Prototype Studio preparation,
   submits one stable request identity, and advances the durable OOS workflow.
3. If the run reports `Review Required`, open the returned review and inspect
   the exact source head. A human approves and merges it; OOS never merges.
4. Continue Landing. OOS verifies the approved merge and byte-identical Studio
   readback.
5. The Console projects `landed` only when the terminal receipt, human-reviewed
   merge, merged readback, Prototype identity, and source digests agree. The
   next action is Candidate Promotion.

Read does not advance the workflow. Cancel reconciles only an unmerged Landing
attempt. A merge racing cancellation remains a merged result and requires a
separate reviewed reversal.

## Failure Behavior

- A changed Studio revision or registry digest invalidates the reviewed
  preparation before submission.
- Unknown or blocked required support, invalid source custody, missing import
  digests, WGCF denial, provider failure, malformed evidence, and mismatched
  command binding do not produce a local success.
- Configured OOS failures remain visible and fail closed.
- Only the explicit `prototype_landing_live_mode_required` response permits the
  existing disconnected local simulation. Its receipt remains
  `prototype-local` and carries no source-authority claim.
- Existing and referenced source require an immutable revision. Import requires
  an admitted `import://staged/` ref plus origin and imported-content digests.
- Creating new Studio source uses a null source-plan revision because that code
  does not exist yet. The originating capture's revision stays in the Entry
  Packet, while current Studio concurrency stays in the preparation and expected
  state. A capture revision must not be mistaken for an existing-code revision.
  An authority finding preserves the immutable prior request; use normal
  corrected submission for the same Prototype rather than changing old payloads
  or creating another product.

## Authority And Activation

The live boundary is constrained by the
[Prototype Landing trust-boundary review](https://github.com/mfshaf7/security-architecture/blob/main/docs/reviews/components/2026-09-07-prototype-landing-trust-boundary.md)
and the
[dedicated Prototype Landing identity](https://github.com/mfshaf7/platform-engineering/blob/main/docs/components/operator-orchestration-service/prototype-landing-identity.md).
The provider credential remains repository-scoped, short-lived, server-side,
and human-merge-only. This Console change grants no stage, production, runtime,
or security authority. Composed dev-integration activation remains owned by
ART work item `#1092`.

## Primary Records And Reload Recovery

The live Prototype register reads `/api/prototypes/records`, backed by OOS's
canonical Studio collection. It includes Proposal captures before Landing,
registry records, exact referenced Delivery packets and the caller's retained
Landing, Maturity and Closure progress. A capture is not landed source: its
support rows remain unknown and its setup defaults remain unaccepted until the
operator completes Landing. Loading, unavailable and successfully empty reads
remain distinct; refresh never promotes fixture or browser-local truth.

Cold reads restore review, continue, cancel and terminal receipt state from
owners, not browser storage. Canonical registry lifecycle wins over older
workflow history. Record identity (`record://prototypes/<id>`) is distinct from
its repository source path. Preview runtime/proof retains its separate owner.
Accepted owner Landing documents restore the actual setup and Candidate next
action, not the capture-only prompt to repeat Landing. A later canonical
lifecycle must not route back into an earlier completed promotion. Source
presence alone invents no terminal receipt or Preview proof; when retained
terminal owner progress exists, its exact Landing receipt link is restored
even when the source record is already marked landed.
Merged registry presence is not terminal workflow success: while that same
accepted OOS request is pending, its draft stays read-only and Continue Landing
remains available for merged readback (or cancellation reconciliation). Only
`succeeded` completes a live run. Source-complete/local-draft guards still
prevent a new submission; cancelled, rejected and requires-action runs cannot
advance, and retired/graduated records remain review-only. Cold reload must
resume the existing immutable request, never silently submit another one.
An existing Delivery application is looked up read-only using its immutable
packet identity; only an exact owner `application_not_found` response means
the packet has not been applied. Owner failure is not empty success.

## Validation

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/operation-runtime/prototype-landing-live-adapter.test.mjs
npm run check
```
