import { test, expect } from "../support/filled-surface-layout.mjs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { deliveryReadModel } = require("../../src/domain-workspaces/delivery/read-model/projections/root-projection.ts");
const base = process.env.CONSOLE_TEST_BASE_URL ?? "http://127.0.0.1:4317";
if (new URL(base).port === "3317") throw Error("Use an isolated preview for Apply feedback tests.");
test.use({ viewport: { width: 1700, height: 1050 }, actionTimeout: 15000 });
test.setTimeout(120000);
const dialog = page => page.getByRole("dialog").last();

// Synthetic owner transport, native UI. These tests never invoke a live ART write.
async function openApply(page) {
  const model = structuredClone(deliveryReadModel), state = { posts: [], result: null, pending: false, apply: null, readsAfterApply: 0 }, errors = [];
  model.source_truth = "OpenProject-backed OOS";
  model.generated_at = new Date().toISOString();
  model.projection_state.checked_at = model.generated_at;
  const project = model.packages.find(row => row.legacy_epic_id === 712);
  project.summary = "Canonical ART new; 0 open descendants.";
  page.on("pageerror", error => errors.push(error.message));
  const snapshot = () => ({ mode: "live", status: "current", error: null, observedAt: new Date().toISOString(), projection: {
    schema_version: 1, package_ref: "delivery-package:712", source: { ref: "openproject://work_packages/712", revision: state.result ? "version-18" : "version-17" },
    state: state.result ? "applied" : state.pending ? "apply-pending" : "not-applied", pending_application_id: state.pending ? "synthetic:original-application" : null,
    latest_application: state.result, history: state.result ? [state.result] : [], projected_at: new Date().toISOString(),
  } });
  await page.route("**/api/**", async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname;
    if (path === "/api/delivery/workspace") {
      if (state.result) state.readsAfterApply++;
      if (url.searchParams.get("view") === "register") {
        const q = url.searchParams, selection = { surface: q.get("surface"), scope: q.get("scope"), query: q.get("q"), status: q.get("status") };
        const packages = model.packages.filter(row => q.has("id") ? row.delivery_package_id === q.get("id") : row.workflow_phase === "work_design");
        return route.fulfill({ json: { mode: "live", status: "current", error: null, projection: { ...model, packages }, page: { selection, next_cursor: null } } });
      }
      return route.fulfill({ json: { mode: "live", projection: model } });
    }
    if (path === "/api/console/capabilities") return route.fulfill({ json: { artifactType: "console-runtime-capability-projection", schemaVersion: 1, mode: "live", capabilities: [] } });
    if (path.startsWith("/api/saved-work/")) return route.fulfill({ json: { mode: "disconnected-preview" } });
    if (path.includes("/api/delivery/work-design/") && path.endsWith("/projection")) return route.fulfill({ json: snapshot() });
    if (path.includes("/api/delivery/work-design/") && path.endsWith("/apply")) { state.posts.push(req.postDataJSON()); return state.apply(route); }
    return route.fulfill({ status: 503, json: { error: "Unrelated synthetic owner unavailable" } });
  });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => { const b = document.querySelector('button[title="Open DELIVERY"]'); return b && Object.keys(b).some(k => k.startsWith("__reactProps$")); });
  await page.getByTitle("Open DELIVERY", { exact: true }).click();
  await page.getByRole("button", { name: /03.*Work Design/i }).click({ timeout: 60000 });
  await page.getByRole("row").filter({ hasText: "Context Admission Work Design" }).click();
  await page.getByRole("button", { name: "Open Design Hub", exact: true }).click();
  await dialog(page).getByRole("button", { name: "Open Context Session", exact: true }).click();
  await dialog(page).getByRole("button", { name: "Save Session", exact: true }).click();
  await dialog(page).getByRole("textbox", { name: "Session Name", exact: true }).fill("Synthetic Apply feedback proof");
  await dialog(page).getByRole("button", { name: "Save Session", exact: true }).click();
  await dialog(page).getByRole("button", { name: "Finalize Brief", exact: true }).click();
  await dialog(page).getByRole("button", { name: "Finalize Brief", exact: true }).click();
  await dialog(page).getByRole("button", { name: "Close finalized brief", exact: true }).click();
  await dialog(page).getByRole("button", { name: "Build From Brief", exact: true }).click();
  await dialog(page).getByRole("button", { name: "Review Draft", exact: true }).click();
  await dialog(page).getByRole("button", { name: "Mark Reviewed", exact: true }).click();
  await expect(dialog(page).getByText("The current draft is reviewed and can proceed to Apply Draft.", { exact: true })).toBeVisible();
  await dialog(page).getByRole("button", { name: "Apply Draft", exact: true }).click();
  function complete() {
    state.pending = false;
    state.result = { schema_version: 1, request_id: "synthetic:apply", correlation_id: "synthetic:correlation", application_id: "synthetic:original-application", status: "applied",
      accepted_draft_digest: "sha256:" + "c".repeat(64), applied_at: state.posts[0].acceptedAt, applied_by: "operator:synthetic",
      target: { delivery_ref: "openproject://work_packages/712", created_refs: ["openproject://work_packages/999"], updated_refs: [], reused_refs: [], readback_complete: true },
      receipt: { ref: "openproject://work_packages/712/activities/99", digest: "sha256:" + "d".repeat(64) } };
    project.summary = "Canonical ART new; 3 open descendants.";
    project.workflow_phase = "refinement";
    return state.result;
  }
  return { state, errors, complete };
}

test("Apply immediately shows busy steps and observed log, then refreshes the selected Hub after a delayed receipt", async ({ page }) => {
  const h = await openApply(page); let release;
  const held = new Promise(resolve => { release = resolve; });
  h.state.apply = async route => { await held; return route.fulfill({ status: 201, json: h.complete() }); };
  try {
    await dialog(page).getByRole("button", { name: "Apply Work Design", exact: true }).click();
    await expect.poll(() => h.state.posts.length).toBe(1);
    await expect(dialog(page).getByRole("button", { name: "Applying…", exact: true })).toBeDisabled();
    await expect(dialog(page).getByRole("button", { name: "Back to Hub", exact: true })).toBeDisabled();
    await expect(dialog(page).getByText("Applying reviewed tree…", { exact: true })).toBeVisible();
    await expect(dialog(page).getByText("Request submitted. Waiting for backend validation, canonical update and receipt.", { exact: true })).toBeVisible();
    await expect(dialog(page).getByText("Run Governance Checks", { exact: true })).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath("apply-pending.png") });
    release();
    await expect(dialog(page).getByRole("heading", { name: "Apply Complete", exact: true })).toBeVisible();
    await expect(dialog(page).getByText("Durable receipt received: canonical application and readback confirmed.", { exact: true })).toBeVisible();
    await expect.poll(() => h.state.readsAfterApply).toBeGreaterThan(0);
    await dialog(page).getByRole("button", { name: "Back to Hub", exact: true }).click();
    await expect(dialog(page).getByText("Canonical ART new; 3 open descendants.", { exact: true })).toBeVisible();
    expect(h.state.posts).toHaveLength(1); expect(h.errors).toEqual([]);
    await page.screenshot({ path: test.info().outputPath("apply-refreshed-hub.png") });
  } finally { release(); }
});

test("a lost reply shows unconfirmed status and recovers the original receipt using reads without a second Apply", async ({ page }) => {
  const h = await openApply(page);
  h.state.apply = route => { h.state.pending = true; return route.abort(); };
  await dialog(page).getByRole("button", { name: "Apply Work Design", exact: true }).click();
  await expect(dialog(page).getByRole("button", { name: "Check Apply Status", exact: true })).toBeEnabled();
  await expect(dialog(page).getByText("The original result is unconfirmed. Read its backend state before submitting again.", { exact: true })).toBeVisible();
  await expect(dialog(page).getByRole("heading", { name: "Apply Complete", exact: true })).toHaveCount(0);
  await dialog(page).getByRole("button", { name: "Check Apply Status", exact: true }).click();
  await expect(dialog(page).getByText("The original application still needs backend reconciliation. No new request was submitted.", { exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("apply-unconfirmed.png") });
  h.complete();
  await dialog(page).getByRole("button", { name: "Check Apply Status", exact: true }).click();
  await expect(dialog(page).getByRole("heading", { name: "Apply Complete", exact: true })).toBeVisible();
  expect(h.state.posts).toHaveLength(1); expect(h.errors).toEqual([]);
});

test("a rejected response is checked before an explicit retry, retaining the same acceptance identity", async ({ page }) => {
  const h = await openApply(page);
  h.state.apply = route => route.fulfill({ status: 422, json: { error: "Synthetic validation rejection" } });
  await dialog(page).getByRole("button", { name: "Apply Work Design", exact: true }).click();
  await expect(dialog(page).getByRole("button", { name: "Check Apply Status", exact: true })).toBeEnabled();
  await dialog(page).getByRole("button", { name: "Check Apply Status", exact: true }).click();
  await expect(dialog(page).getByText("The backend reports no pending application. Review the retained input before submitting again.", { exact: true })).toBeVisible();
  expect(h.state.posts).toHaveLength(1);
  h.state.apply = route => route.fulfill({ status: 201, json: h.complete() });
  await dialog(page).getByRole("button", { name: "Apply Work Design", exact: true }).click();
  await expect(dialog(page).getByRole("heading", { name: "Apply Complete", exact: true })).toBeVisible();
  expect(h.state.posts).toHaveLength(2);
  expect(h.state.posts[1].acceptanceId).toBe(h.state.posts[0].acceptanceId);
  expect(h.state.posts[1].acceptedAt).toBe(h.state.posts[0].acceptedAt);
  expect(h.errors).toEqual([]);
});
