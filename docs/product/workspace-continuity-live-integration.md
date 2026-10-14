# Workspace Registry And Product Portfolio Continuity

Status: source-complete under Delivery ART `#1295`; runtime activation remains
default-denied until Security `#1303` accepts the exact revisions and Platform
`#1291` commissions that accepted composition.

## Operator Job

Use Workspace Registry and Product Portfolio Products to inspect the same
canonical product identity, version, digest, posture, lifecycle, maturity,
lineage, ownership, and non-terminal publication-readiness state. Continue a
lifecycle action only in Workspace Registry through the existing OOS workflow.

Product Portfolio does not repair missing state, infer a listing, convert
readiness into terminal publication, or create a second product identity. Its
canonical Products register and selected-product detail are read-only views.

## Authority Composition

- Workspace Governance owns Registry, Intake, lifecycle, and product identity.
- WGCF exposes the authenticated, read-only
  `GET /v1/projections/workspace-continuity` projection.
- OOS owns Workspace Registry commands and terminal Product Publication state.
- The Console validates and displays the projection but owns none of those
  records.
- Security accepts disclosure and trust boundaries; Platform owns runtime
  configuration and activation.

The browser calls only same-origin `GET /api/workspace-continuity`. The Console
server supplies `WGCF_BASE_URL`, `WGCF_CALLER_ID`, and `WGCF_CALLER_SECRET` to
WGCF. None of those private values enters browser code or response data.

Workspace Registry reads both WGCF continuity and the existing OOS Registry
projection. It refuses the live view unless both name the same Workspace
Governance revision and every inventory identity, version, digest, posture,
lineage, maturity, last mutation, and eligible-intake binding agrees. OOS
remains the only command route.

Product Portfolio Products consumes the WGCF product records directly. It
shows only fields actually present in canonical continuity. Product-owned
showcase metadata, listing, runtime availability, access, release, and
Security facts are not synthesized when their separate authorities are absent.

## Source Selection And Failure

Exactly one source posture is allowed:

- live: current validated WGCF continuity, plus reconciled OOS evidence where
  Registry actions are offered
- disconnected preview: fixtures only when the operator explicitly enables
  Console design mode and all live owners are disconnected
- unavailable: loading, partial configuration, owner failure, malformed data,
  revision drift, identity collision, duplicate product identity, lifecycle
  contradiction, or stale cross-source binding

An unavailable live path displays no fixture fallback. Stale or missing
Product Publication readiness remains visible as stale or unavailable and is
never actionable by implication.

## Operator Flow

1. Open `Workspace Registry` to inspect canonical inventory or eligible intake.
2. Confirm the source status is `WGCF + OOS` before starting a lifecycle or
   promotion action.
3. Open `Product Portfolio` and select `Products` to inspect the same canonical
   product id, version, digest-backed lifecycle, and owner state.
4. Use `Open Registry Record` from the selected product when lifecycle work is
   required.
5. Use the separate Publication workflow only for its admitted publication
   command; continuity readiness alone is not terminal publication.

## Validation

Run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON \
  --experimental-strip-types --test \
  tests/operation-runtime/workspace-continuity-live-adapter.test.mjs
npm run check
```

The focused test owns `case:1295-positive` and `case:1295-negative`. Exact
merged revisions, Security acceptance, Platform activation, and live composed
proof remain later Landing Units in Epic `#1275`.

## Rollback

Platform disables the WGCF continuity runtime gate or removes the Console
continuity configuration, then reverts this Console Landing Unit if required.
Workspace Governance, WGCF records, OOS workflows, and Product Publication
history remain unchanged because the adapter is read-only.
