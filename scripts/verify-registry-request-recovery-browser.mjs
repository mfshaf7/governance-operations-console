// Isolated synthetic browser/API conformance, NOT live Inventory or app evidence.
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { workspaceRegistryFixture, workspaceInventoryResultFixture, workspaceInventoryLifecyclePreparationFixture } from "../src/workspace-registry/fixtures/workspace-registry.fixture.ts";
import { assertWorkspaceContinuityProjection } from "../src/workspace-continuity/workspace-continuity-contract.ts";
import { reconcileWorkspaceRegistryContinuity } from "../src/workspace-continuity/workspace-registry-continuity.ts";
import { assertWorkspaceInventoryLifecycleResult } from "../src/workspace-registry/workspace-registry-contract.ts";

const base = process.env.CONSOLE_REGISTRY_TEST_URL ?? "http://127.0.0.1:3318";
if (new URL(base).hostname !== "127.0.0.1" || new URL(base).port === "3317") throw Error("Use a separate loopback test instance, never the operator Console.");
const digest = c => `sha256:${c.repeat(64)}`, at = new Date().toISOString();
const snapshot = structuredClone(workspaceRegistryFixture);
snapshot.records = snapshot.records.filter(row => row.kind !== "product");
const record = snapshot.records[0], candidate = snapshot.eligible_promotions[0];
const continuity = assertWorkspaceContinuityProjection({ schema_version: 1, artifact_type: "workspace-continuity-projection", projection_state: "current",
  projection_id: `workspace-continuity-projection:${"c".repeat(64)}`, projection_digest: digest("c"),
  authority: { owner_repo: "workspace-governance", revision: snapshot.authority_revision, file_digests: {} },
  authority_boundary: { canonical_registry: "workspace-governance", readiness_projection: "workspace-governance-control-fabric", workflow_authority: "operator-orchestration-service", terminal_publication_authority: "operator-orchestration-service", mutation_authority: "none" },
  products: [], inventory: snapshot.records.map(row => ({ kind: row.kind, name: row.name, record_id: row.id, record_version: row.version,
    record_digest: row.record_digest, posture: row.posture, lifecycle: "active", retired_collection: false, lineage: row.lineage,
    last_mutation: { ...row.last_mutation, idempotency_key: `fixture:${row.id}`, readiness_digest: null, request_digest: null } })),
  intake: snapshot.eligible_promotions.map(row => ({ kind: row.target.kind, name: row.target.name, record_id: row.target.record_id,
    record_version: row.intake_entry_ref.version, record_digest: row.intake_entry_ref.digest, status: "admitted", decision_source: "operator",
    owner_route: row.owner_refs[0], decision: { id: row.approval_refs[0] }, source: { class: "direct" }, last_mutation: {} })),
});
reconcileWorkspaceRegistryContinuity(continuity, snapshot);
const review = { repository: "workspace-governance", base_branch: "main", base_commit: "1".repeat(40), head_commit: "2".repeat(40), branch: "synthetic/original", number: 1,
  merged: false, human_reviewed: false, state: "open", url: "https://example.invalid/original-review", merge_commit: null };
const promotionId = "inventory-request:native-original/日本語?key=value";
let promotion = { ...workspaceInventoryResultFixture, request_id: promotionId, status: "review-required", next_action: "review-and-merge", review };
const lifecycleId = "inventory-lifecycle-request:native-original", preparation = workspaceInventoryLifecyclePreparationFixture(record);
const lifecycle = assertWorkspaceInventoryLifecycleResult({ schema_version: 1, workflow_id: "workspace-inventory-lifecycle", request_id: lifecycleId,
  session_ref: "session:synthetic", execution_ref: "execution:synthetic", status: "review-required", next_action: "review-and-merge", revision: 1,
  canonical_mutation: false, failure: null, review, readiness: null, receipt: null, readback: null, merged_state: null,
  history: [{ sequence: 1, status: "review-required", at, details: null }],
  request: { schema_version: 1, artifact_type: "workspace-inventory-lifecycle-request", request_id: lifecycleId, request_digest: digest("a"), requested_at: at,
    action: "suspend", approval_refs: ["synthetic:approval"], impact_acknowledgements: ["references reviewed"], reason: "Synthetic UI recovery only.",
    operator_ref: "operator:synthetic", correlation_ref: lifecycleId, idempotency_key: lifecycleId, requested_value: null, prior_event_ref: null,
    target: preparation.target, expected_state: preparation.expected_state } });
const writes = [], reads = [], errors = [];
let offline = false, malformed = false, pageTwo = false, cancelUnknown = true;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1560, height: 1100 } });
  page.setDefaultTimeout(15000);
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/**", async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname, method = request.method();
    const family = path.includes("/lifecycle/") ? "lifecycle" : "promotion";
    if (method === "GET") reads.push(path + url.search); else writes.push({ path, method, body: request.postDataJSON() });
    if (path === "/api/console/capabilities") return route.fulfill({ json: { artifactType: "console-runtime-capability-projection", schemaVersion: 1, mode: "live",
      capabilities: [{ id: "workspace-registry", mutation: { state: "available" }, source: { state: "available" } }] } });
    if (path === "/api/workspace-registry") return route.fulfill({ json: snapshot });
    if (path === "/api/workspace-continuity") return route.fulfill({ json: continuity });
    if (path.startsWith("/api/workspace-registry/")) {
      if (url.searchParams.has("target_kind")) {
        assert.equal(method, "GET");
        if (offline) return route.fulfill({ status: 503, json: { error: "Synthetic offline journal" } });
        const target = family === "lifecycle" ? preparation.target : url.searchParams.get("target_name") === candidate.target.name ? candidate.target : preparation.target;
        const result = family === "lifecycle" ? lifecycle : promotion;
        const terminal = ["cancelled", "blocked", "rejected", "stale", "succeeded"].includes(result.status);
        const nextPage = url.searchParams.has("cursor");
        return route.fulfill({ json: { schema_version: 1, workflow_id: `workspace-inventory-${family}`, target, revision: 1,
          pending_request_count: terminal ? 0 : 1, updated_at: at, canonical_mutation: false,
          records: malformed ? [{ bad: true }] : [{ request_id: pageTwo && !nextPage ? "native:old-terminal" : result.request_id,
            status: pageTwo && !nextPage ? "cancelled" : result.status, revision: 1, requested_at: at, updated_at: at, ...(family === "lifecycle" ? { action: "suspend" } : {}) }],
          next_cursor: pageTwo && !nextPage ? "b".repeat(64) : null } });
      }
      if (method === "GET") {
        const expected = family === "lifecycle" ? lifecycleId : promotionId;
        assert.ok(path.endsWith(encodeURIComponent(expected)), "Read must retain the original opaque ID");
        return route.fulfill({ json: family === "lifecycle" ? lifecycle : promotion });
      }
      if (path.endsWith("/continue")) {
        assert.ok(path.endsWith(`${encodeURIComponent(family === "lifecycle" ? lifecycleId : promotionId)}/continue`));
        return route.fulfill({ json: family === "lifecycle" ? lifecycle : promotion });
      }
      if (path.endsWith("/cancel")) {
        assert.ok(path.endsWith(`${encodeURIComponent(promotionId)}/cancel`));
        promotion = { ...promotion, status: cancelUnknown ? "cancelling" : "cancelled", next_action: cancelUnknown ? "inspect-review-or-cancel" : "complete" };
        if (cancelUnknown) { cancelUnknown = false; return route.fulfill({ status: 503, json: { error: "Synthetic lost acknowledgement; recover original request" } }); }
        return route.fulfill({ json: promotion });
      }
      throw Error(`Unexpected mutation in recovery-only case: ${path}`);
    }
    assert.equal(method, "GET", `No unrelated mutation allowed: ${path}`);
    return route.fulfill({ status: 503, json: { error: "Unrelated owner isolated", mode: "live", status: "offline" } });
  });
  async function openRegistry() {
    await page.goto(base, { waitUntil: "domcontentloaded" });
    const nav = page.getByRole("button", { name: /Workspace Registry/i }).first();
    await nav.waitFor();
    await page.waitForFunction(() => { const node = [...document.querySelectorAll('button')].find(n => n.title === 'Workspace Registry');
      const props = node && Object.keys(node).find(k => k.startsWith('__reactProps$')); return Boolean(props && node[props].onClick); });
    await nav.click();
    await page.getByRole("heading", { name: "Workspace Registry", exact: true }).waitFor();
  }
  async function openPromotion() {
    await openRegistry();
    await page.getByRole("button", { name: /Eligible/ }).click();
    await page.getByRole("button", { name: "Review Promotion", exact: true }).click();
    await page.getByRole("button", { name: "Refresh original requests", exact: true }).waitFor();
  }
  await openPromotion();
  await page.getByRole("button", { name: `Reopen original request ${promotionId}`, exact: true }).click();
  await page.getByRole("button", { name: "Check Review", exact: true }).waitFor();
  if (process.env.CONSOLE_REGISTRY_SCREENSHOT) await page.screenshot({ path: process.env.CONSOLE_REGISTRY_SCREENSHOT });
  assert.equal(writes.length, 0, "Discovery and reopening must not prepare, submit or continue");
  await page.getByRole("button", { name: "Check Review", exact: true }).click();
  await page.getByRole("button", { name: "Check Review", exact: true }).waitFor();
  assert.equal(writes.length, 1);
  await openPromotion(); // actual cold page reload, no browser-memory authority
  await page.getByRole("button", { name: `Reopen original request ${promotionId}`, exact: true }).click();
  assert.equal(writes.length, 1);
  await page.getByRole("button", { name: "Cancel Request", exact: true }).click();
  await page.getByText("Synthetic lost acknowledgement; recover original request", { exact: true }).waitFor();
  await openPromotion();
  await page.getByRole("button", { name: `Reopen original request ${promotionId}`, exact: true }).click();
  await page.getByRole("button", { name: "Cancel Request", exact: true }).click();
  await page.getByRole("button", { name: "Start a New Reviewed Promotion", exact: true }).waitFor();
  assert.equal(writes.length, 3);
  await openRegistry();
  await page.getByRole("button", { name: "View Promotion Requests", exact: true }).click();
  await page.getByRole("button", { name: `Reopen original request ${promotionId}`, exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Start a New Reviewed Promotion", exact: true }).count(), 0, "Active records offer history, not a fabricated entrant");
  await openRegistry();
  await page.getByRole("button", { name: "Manage Lifecycle", exact: true }).click();
  await page.getByRole("button", { name: `Reopen original request ${lifecycleId}`, exact: true }).click();
  await page.getByRole("button", { name: "Check Review", exact: true }).waitFor();
  assert.equal(writes.length, 3, "Lifecycle cold recovery must not prepare a replacement action");
  assert.equal(await page.getByRole("button", { name: "Prepare a New Lifecycle Action", exact: true }).isEnabled(), false);
  await page.getByRole("button", { name: "Refresh Original Request", exact: true }).click();
  assert.equal(writes.length, 3);
  offline = true;
  await openPromotion();
  await page.getByText(/Original Inventory requests are unavailable/).waitFor();
  assert.equal(await page.getByRole("button", { name: "Review Promotion", exact: true }).last().isEnabled(), false);
  offline = false; malformed = true;
  await page.getByRole("button", { name: "Refresh original requests", exact: true }).click();
  await page.getByText(/journal is invalid or mismatched/).waitFor();
  assert.equal(await page.getByRole("button", { name: "Review Promotion", exact: true }).last().isEnabled(), false);
  malformed = false; pageTwo = true;
  promotion = { ...promotion, status: "review-required", next_action: "review-and-merge" };
  await page.getByRole("button", { name: "Refresh original requests", exact: true }).click();
  await page.getByRole("button", { name: "More original requests", exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Review Promotion", exact: true }).last().isEnabled(), false);
  await page.getByRole("button", { name: "More original requests", exact: true }).click();
  await page.getByRole("button", { name: `Reopen original request ${promotionId}`, exact: true }).click();
  await page.getByRole("button", { name: "Check Review", exact: true }).waitFor();
  assert.equal(writes.length, 3);
  assert.deepEqual(errors, []);
  console.log("Registry isolated browser conformance PASS: promotion review/opaque original read/cold reload/lost cancellation acknowledgement/active record history/Lifecycle GET-only recovery/offline and corrupt journal denial. Three explicit original-ID commands only; no real owner mutations.");
} finally { await browser.close(); }
