# Product Publication Live Integration

Status: the internal-only path is source-complete and commissioned by Security
`#1257` and Platform `#1258`. Support for broader contract-defined audience
postures was commissioned through Security `#1262`, OOS `#1263`, and Platform
`#1264`. Product lifecycle-maintenance composition is source-complete in the
Console under `#1270`; it remains inactive until Security `#1271`, OOS `#1272`,
and Platform `#1273` complete in that order.

## Operator Job

Use Product Portfolio Publication to submit one reviewed, product-owner-backed
publication action and render the exact OOS, WGCF, and owner-receipt result.
The Console does not create product identity, read owner source directly,
evaluate readiness, approve Security posture, activate a runtime, or become the
publication journal.

The existing `Products`, `Publication`, and `Curation` visual baseline remains
unchanged. The Publication register makes its source posture visible as one of:

- `Disconnected preview`: local fixtures and local receipts are available only
  for interaction proof.
- `Owner path connected`: publication uses the server-only OOS path and accepts
  only an authority-snapshot record carrying an exact governed binding.
- `Owner path unavailable`: partial or invalid live configuration failed
  closed.

## Authority Sequence

1. The product owner commits the product source snapshot and a later owner
   manifest revision.
2. An authority projection supplies the Console record with the exact owner
   repo, relative manifest path, source revision, manifest revision, manifest
   digest, request identity, idempotency key, current posture, expected version,
   and prior receipt when applicable.
3. The operator reviews `Checks` and `Decision` in the existing Publication
   session. The Console shows the current posture, exact target posture,
   audience, listing scope, access class, and owner-manifest binding.
4. The Console server verifies the private Platform session, operator role,
   `Workspace owner` authority, configured operator binding, and server-issued
   correlation identity.
5. The server adds the pinned Workspace Governance revision and exact Security
   decision from private runtime configuration, then submits the command to
   OOS with server-only caller credentials.
6. OOS obtains and rereads WGCF readiness, journals the result, and returns the
   immutable terminal receipt.
7. The Console validates every request, manifest, authority, version, target,
   timeline, grant, readiness, packet, receipt, and digest binding before it
   projects success. The Result view preserves the exact authoritative target
   tuple and owner-manifest evidence from that validated result.

The manifest binding is publication evidence, not an access credential or an
access grant. Listing scope controls who may see a Portfolio listing. Product
owners and their approved identity and access controls continue to enforce
access to the product itself. The Console remains private and loopback-only.

The audience slice operates on `internal`, `client`, `public`, and `unlisted`
target tuples. Lifecycle maintenance adds only the separately reviewed
`archive` and `restore` actions. Archive targets the fixed historical tuple;
restore targets `unlisted` and does not restore runtime, release, access, or
Security acceptance.

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
| Compose lifecycle and health | `GET /api/product-portfolio/maintenance/{request_id}` | OOS exact result plus private Platform projection |
| Submit archive or restore | `POST /api/product-portfolio/maintenance/{request_id}` | reread then `POST /v1/product-publications` |

Mutation and readback routes require the verified Console session. Browser code
never receives the OOS caller secret, configured operator identity, authority
revision, Security decision, owner endpoint, or private session projection.

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
- A record without the exact governed manifest/version binding cannot be
  submitted.
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
- Archive and restore reread the exact current OOS result and reject stale
  lifecycle digest, publication receipt, posture, or version bindings.
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
