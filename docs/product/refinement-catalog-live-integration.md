# Refinement And Catalog Live Integration

## Purpose

This is the primary Console instruction surface for OOS-backed Delivery
Refinement and Catalog behavior. It preserves the established Console visuals
while replacing prototype-local authority with typed canonical projection,
governed commands, readback, and receipts.

OOS owns Refinement source projection, admitted advice, durable apply runs,
Catalog projection and mutation, backend readback, and receipts. The Console
owns operator interaction, semantic-to-visual mapping, strict validation, and
same-origin routing.

## Runtime Modes

- `disconnected-preview`: `OOS_BASE_URL` is absent. Existing synthetic data and
  prototype-local commands remain available and are labelled as preview truth.
- `live`: OOS is configured. Refinement and Catalog use canonical OOS truth.
  A configured failure locks mutation and never falls back to fixtures.

## Server Configuration

Provide configuration through the local or platform-owned runtime environment.
Never expose it through `NEXT_PUBLIC_*` variables or commit concrete values.

| Variable | Required in live mode | Purpose |
| --- | --- | --- |
| `OOS_BASE_URL` | yes | OOS endpoint visible to the Console server. |
| `OOS_CALLER_SECRET` | yes | Runtime-delivered caller authentication. |
| `GOVERNANCE_CONSOLE_OPERATOR_ID` | yes | Stable operator attribution until authenticated identity is admitted. |
| `OOS_CALLER_ID` | no | Defaults to `governance-operations-console`. |
| `GOVERNANCE_CONSOLE_OPERATOR_HANDLE` | no | Optional bounded display handle. |

The browser calls only same-origin `/api/delivery/refinement/*` and
`/api/delivery/catalog/*` routes. OOS credentials and operator attribution are
assembled server-side.

The bounded security decision is the
[Refinement and Catalog dev-integration boundary review](https://github.com/mfshaf7/security-architecture/blob/main/docs/reviews/components/2026-08-26-refinement-catalog-dev-integration-boundary.md).

## Refinement

1. The Console reads the canonical packet and durable run projection before an
   advice or apply command.
2. Advice binds the packet revision, source revision, selected field, and node
   identities. OOS returns model and CGG evidence with a suggestion; the
   operator remains responsible for accepting or changing it.
3. Apply translates the reviewed workbench targets into exact backend field
   identities and records one resolution for every submitted value.
4. Same-session retries reuse one acceptance identity and deterministic OOS
   idempotency key.
5. The Console polls the durable run and reports success only after a completed
   run carries validated canonical readback and a receipt.
6. Run failures remain visible in the existing apply log and never create a
   local success receipt.

## Catalog

1. The Console reads Catalog items and values from the OOS projection and
   derives presentation tones locally.
2. Add, edit, and retire commands bind the exact source revision, reviewed
   draft, stable acceptance, and target value identity.
3. Success requires OOS canonical readback and a durable mutation receipt; the
   Console refreshes the projection before showing the new value set.
4. Owner Repo mutations require an exact admitted repository identity and its
   current WGCF readiness reference. Missing or mismatched evidence fails
   before mutation and does not call WGCF or OpenProject from the browser.
5. The current Console Repository projection does not yet expose readiness
   receipts for a newly admitted repository. Live Owner Repo linking therefore
   remains locked unless canonical Catalog truth already carries the matching
   readiness binding. No receipt is synthesized to bypass that boundary.

## Validation

Run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/operation-runtime/refinement-catalog-live-adapter.test.mjs
npm run architecture:delivery
npm run check
```
