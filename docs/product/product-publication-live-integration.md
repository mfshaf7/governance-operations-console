# Product Publication Live Integration

Status: the original internal-only commissioning is retained as historical
Security `#1257` and Platform `#1258` evidence. The existing lifecycle-maintenance
decision and native owner gates cover only `internal`, `unlisted` and `archived`.
`client` and `public` are not activated by this Console adapter. The real
owner-manifest entry and request-recovery extension requires exact composed
Security acceptance, Platform activation and actual operating qualification;
passing source tests alone is not that proof.

## Operator Job

Use Product Portfolio Publication to submit one reviewed, product-owner-backed
publication action and render the exact OOS, WGCF, and owner-receipt result.
The Console does not create product identity, read owner source directly,
evaluate readiness, approve Security posture, activate a runtime, or become the
publication journal.

`Products` uses canonical product continuity. In a connected workspace,
`Publication` and `Curation` open the same native owner-publication surface;
curation does not edit a local product listing. Fixture registers and local
receipts remain limited to explicit disconnected development preview. The
native Publication surface makes its posture visible as one of:

- `Disconnected preview`: local fixtures and local receipts are available only
  for interaction proof.
- `Owner path connected`: publication uses the server-only OOS path with an
  exact committed-manifest locator, verified by the native owners.
- `Owner path unavailable`: partial or invalid live configuration failed
  closed.

## Authority Sequence

1. The product owner commits the product source snapshot and a later owner
   manifest revision. Active product registration remains a prerequisite.
2. In `Publication`, enter the owner repository, relative manifest path, earlier
   source revision, later manifest revision and exact manifest digest. These
   entered pointers are unverified intent, not an authority-snapshot attestation.
   Initial publication uses schema 1, `unlisted`, version zero and no prior
   receipt. For later actions, first use `Read original publication request` to
   obtain the latest applied native receipt and version. Lifecycle operations
   require the schema-2 manifest and its exact Inventory history binding.
3. Choose `Review owner publication`. Check the exact locator, action, current
   version and target tuple. Retain the displayed request reference, explicitly
   approve that intent, then choose `Submit reviewed publication` once.
4. The server verifies the private Platform session, operator role, `Workspace
   owner` authority and configured operator binding. For every new submission
   it reads the current authority revision through the existing strict native
   Registry reader. It adds that revision and the exact private Security
   decision, then calls OOS with server-only credentials. The configured
   reviewed authority baseline is not a substitute for current Inventory.
5. OOS and WGCF reread the actual committed manifest, verify product identity,
   ownership, source and lifecycle, and determine readiness. OOS journals the
   authoritative applied or rejected result and its immutable receipt.
6. The Console validates request, manifest, authority, version, target,
   timeline, grants, readiness, packet, receipt and digest bindings before
   showing the native result. Connected counts describe observed native
   requests or current continuity, never the disconnected fixture inventory.
7. After interruption or in a fresh browser, enter the same original request
   reference and choose `Read original publication request`. This issues only
   the existing GET; historical authority and receipts remain unchanged.
   An unknown outcome locks replacement submission until an owner read resolves
   it. `Prepare another action` clears old manifest pointers; it retains only
   the actual applied prior receipt, not fresh manifest evidence.

The manifest binding is publication evidence, not an access credential or an
access grant. Listing scope controls who may see a Portfolio listing. Product
owners and their approved identity and access controls continue to enforce
access to the product itself. The Console remains private and loopback-only.

The native entry offers only the existing `internal`, `unlisted` and `archived`
target path; OOS and WGCF still enforce the exact active Security decision.
Lifecycle maintenance does not add a second publication command path. It composes current Workspace
Registry lifecycle, immutable Product Publication history, and Platform health,
then routes the operator to the existing owner surface for the next prerequisite.

The archive sequence is exact:

1. If currently listed, commit a fresh active/current-posture owner manifest and
   unpublish through Product Publication.
2. Retire the product through Workspace Registry.
3. Commit a fresh schema-v2 retired/`unlisted` owner manifest bound to that exact
   retirement receipt and history event.
4. Archive through Product Publication.

Restoration first restores the inventory record through Workspace Registry,
then requires a fresh schema-v2 active/`unlisted` owner manifest bound to the
restore event and exact prior archived receipt before Product Publication may
restore `archived` to `unlisted`. Neither path restores runtime, release, access,
or Security acceptance.

The product-owned publication evidence is
[`product-publication/manifest.json`](../../product-publication/manifest.json).
Its `owner_revision` identifies the earlier product-source snapshot described
by the manifest. The later commit containing the manifest is the separate
`manifest_revision` that WGCF must verify from merged owner-repository truth.

An OOS readiness rejection remains authoritative and names the receipt that
must be corrected. The Console's disconnected-preview `Reject` choice is a
local candidate-review disposition; it is not sent to OOS and never becomes a
canonical publication rejection.

## Same-Origin API

| Action | Console route | Owner route |
| --- | --- | --- |
| Inspect capability mode | `GET /api/product-portfolio/publications` | local server configuration only |
| Submit or replay | `POST /api/product-portfolio/publications` | `POST /v1/product-publications` |
| Read exact result | `GET /api/product-portfolio/publications/{request_id}` | `GET /v1/product-publications/{request_id}` |
| Inspect maintenance mode | `GET /api/product-portfolio/maintenance` | local server configuration only |
| Compose lifecycle and health | `GET /api/product-portfolio/maintenance/{request_id}` | OOS exact publication result plus current Workspace Registry and private Platform projection |
| Continue lifecycle prerequisite | existing Workspace Registry or Product Publication surface | existing owner workflow only |

Mutation and readback routes require the verified Console session. Browser code never receives the OOS caller secret or private session
projection and cannot supply trusted server identity, authority or Security
configuration. Validated owner results may display their evidence references.

## Runtime Configuration

Platform activation must provide the existing Console OOS and session values
plus all Product Publication values as one complete set:

- `OOS_BASE_URL`
- `OOS_CALLER_ID`
- `OOS_CALLER_SECRET`
- `GOVERNANCE_CONSOLE_OPERATOR_ID`
- `GOVERNANCE_CONSOLE_SESSION_PROJECTION_PATH`
- `GOVERNANCE_CONSOLE_PRODUCT_PUBLICATION_AUTHORITY_REVISION`
- `GOVERNANCE_CONSOLE_PRODUCT_PUBLICATION_SECURITY_DECISION_URI`
- `GOVERNANCE_CONSOLE_PRODUCT_PUBLICATION_SECURITY_DECISION_DIGEST`
- `GOVERNANCE_CONSOLE_PRODUCT_PUBLICATION_SECURITY_DECISION_REVISION`

Lifecycle maintenance activation additionally supplies this separate complete
set, so existing Product Publication commissioning does not silently activate
the maintenance path:

- `GOVERNANCE_CONSOLE_PRODUCT_MAINTENANCE_AUTHORITY_REVISION`
- `GOVERNANCE_CONSOLE_PRODUCT_MAINTENANCE_SECURITY_DECISION_URI`
- `GOVERNANCE_CONSOLE_PRODUCT_MAINTENANCE_SECURITY_DECISION_DIGEST`
- `GOVERNANCE_CONSOLE_PRODUCT_MAINTENANCE_SECURITY_DECISION_REVISION`
- `GOVERNANCE_CONSOLE_PRODUCT_HEALTH_PROJECTION_PATH`
- `GOVERNANCE_CONSOLE_PRODUCT_HEALTH_RECEIPT_PATH`

The Security URI must use
`security-architecture://product-publication/decisions/...`; all revisions are
full Git commits and the decision digest is a SHA-256 digest. Supplying any
Product Publication value selects live mode. Missing or contradictory members
then produce an invalid capability rather than falling back to preview.

## Fail-Closed Rules

- Synthetic and synthetic-companion fixture records cannot enter the live
  owner path.
- A malformed locator or version binding cannot be submitted. A syntactically
  valid locator remains unverified until OOS and WGCF read its committed source.
- A failed or malformed current Registry read stops a new submission before
  POST; the configured authority baseline never becomes a freshness fallback.
- Initial publication requires version zero, `unlisted`, and no prior receipt.
- Later actions require the exact prior receipt, digest, version, and posture.
- Target posture, listing scope, audience, and access class must be the fixed
  Workspace Governance tuple.
- The returned command must equal the server-built reviewed command.
- WGCF readiness, packet, receipt, and owner-receipt references must bind the
  same request, manifest, product, target, and authority revision.
- All cross-boundary grants remain `false`.
- Platform health projection and receipt files must be regular, non-symlink,
  current-user-owned `0600` files with exact digest, reference, inventory,
  freshness, count, and no-authority bindings.
- A configured maintenance path never falls back to fixture health. Invalid or
  missing live evidence projects unavailable/unknown state.
- Product Maintenance has no mutation endpoint and never copies a prior
  `manifest_source` into a new request.
- The composition rereads current Workspace Registry lifecycle independently of
  the historical publication result and blocks contradictory state pairs.
- Archive and restore remain available only through Product Publication with a
  fresh committed owner manifest and the exact current receipt,
  posture, version, and lifecycle-history bindings.
- The terminal receipt digest is recomputed server-side before projection.
- OOS errors, oversized or malformed responses, timeline contradictions,
  replay conflicts, stale versions, or cross-product results never become a
  local success.

## Validation

Run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON \
  --experimental-strip-types --test \
  tests/operation-runtime/product-publication-live-adapter.test.mjs
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON \
  --experimental-strip-types --test \
  tests/operation-runtime/product-maintenance-live-adapter.test.mjs
npm run check
```

The focused suite owns Delivery ART cases `case:1256-positive` and
`case:1256-negative` for the commissioned baseline and `case:1261-positive`
and `case:1261-negative` for the audience projection. Lifecycle composition is
covered by `case:1270-positive` and `case:1270-negative`. Real-Git head, base,
validation, merge, and Review Packet binding remains in the Delivery
work-session lifecycle.
