import { test, expect } from "../support/filled-surface-layout.mjs";
import { createRequire } from "node:module";
import { environmentCatalog, environmentOperation, ownerProfileProjection } from "../support/environment-operations-ui-fixture.mjs";
import { refinementFeedbackProjection, refinementFeedbackRun } from "../support/refinement-feedback-fixture.mjs";
const require = createRequire(import.meta.url);
const { deliveryReadModel } = require("../../src/domain-workspaces/delivery/read-model/projections/root-projection.ts");
const base = process.env.CONSOLE_TEST_BASE_URL ?? "http://127.0.0.1:4317";
if (new URL(base).port === "3317") throw Error("Use isolated preview for synthetic submission tests.");
test.use({ viewport: { width: 1700, height: 1050 }, actionTimeout: 15000 });
test.setTimeout(120000);
const current = page => page.getByRole("dialog").last();
const gate = () => { let release; const promise = new Promise(resolve => { release = resolve; }); return { promise, release }; };
async function openShell(page, title) {
  await page.goto(base + "/?dev=1", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(title => { const b = document.querySelector(`button[title="${title}"]`); return b && Object.keys(b).some(k => k.startsWith("__reactProps$")); }, title);
  await page.getByTitle(title, { exact: true }).click();
}

for (const destructive of [false, true]) test(`Platform ${destructive ? "confirmation" : "direct action"} shows immediate pending feedback and only reports its returned outcome`, async ({ page }) => {
  const held = gate(), writes = [], errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (path === "/api/console/capabilities") return route.fulfill({ json: { artifactType: "console-runtime-capability-projection", schemaVersion: 1, mode: "live", capabilities: [] } });
    if (path === "/api/dev-integration/profiles") return route.fulfill({ json: { mode: "live", projection: ownerProfileProjection() } });
    if (path === "/api/dev-integration/requests") return route.fulfill({ json: { schema_version: 1, requests: [], page: { offset: 0, limit: 25, total: 0, next_offset: null } } });
    if (path === "/api/environment-operations" && request.method() === "GET") return route.fulfill({ json: { mode: "live", status: "current", observedAt: new Date().toISOString(), catalog: environmentCatalog(), operations: [] } });
    if (path === "/api/environment-operations" && request.method() === "POST") {
      writes.push(request.postDataJSON()); await held.promise;
      return destructive ? route.fulfill({ status: 503, json: { error: "Synthetic submission reply unavailable; inspect original operation." } })
        : route.fulfill({ json: environmentOperation("feedback", { action: "dev-integration.status" }) });
    }
    return route.fulfill({ status: 503, json: { error: "Unrelated synthetic owner unavailable" } });
  });
  try {
    await openShell(page, "Dev Integration");
    await current(page).getByRole("button", { name: "Inspect alpha", exact: true }).click();
    await current(page).getByRole("radio", { name: /runtime/i }).click();
    await current(page).getByRole("button", { name: destructive ? /stop/i : /check status/i }).click();
    if (destructive) await page.getByRole("alertdialog").getByRole("button", { name: "Confirm operation", exact: true }).click();
    await expect.poll(() => writes.length).toBe(1);
    const pending = destructive ? page.getByRole("alertdialog") : current(page);
    await expect(pending.getByText("Submitting the reviewed operation…", { exact: true })).toBeVisible();
    if (destructive) {
      await expect(pending.getByRole("button", { name: "Submitting…", exact: true })).toBeDisabled();
      await expect(pending.getByRole("button", { name: "Back", exact: true })).toBeDisabled();
    }
    await expect(page.getByRole("heading", { name: "Operation completed", exact: true })).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath("platform-pending.png") });
    held.release();
    if (destructive) {
      await expect(page.getByRole("alertdialog")).toHaveCount(0);
      await expect(current(page).getByText("Synthetic submission reply unavailable; inspect original operation.", { exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Operation completed", exact: true })).toHaveCount(0);
    } else await expect(page.getByRole("heading", { name: "Operation completed", exact: true })).toBeVisible();
    expect(writes).toHaveLength(1); expect(errors).toEqual([]);
  } finally { held.release(); }
});

for (const oldHandoff of [false, true]) test(`Refinement ${oldHandoff ? "with previous handoff history" : "without previous history"} stays pending, applies the reviewed request and preserves receipt event times`, async ({ page }) => {
  const acknowledgement = gate(), completion = gate(), writes = [], errors = [];
  let run = null;
  const model = structuredClone(deliveryReadModel);
  model.source_truth = "OpenProject-backed OOS"; model.generated_at = new Date().toISOString(); model.projection_state.checked_at = model.generated_at;
  page.on("pageerror", error => errors.push(error.message));
  const snapshot = () => {
    const projection = refinementFeedbackProjection(run);
    if (oldHandoff && !run) {
      const older = refinementFeedbackRun("completed");
      older.receipt.source_work_design_receipt_id = "work-design-receipt:older-handoff";
      older.run_id = "refinement-run:older"; older.receipt.run_id = older.run_id;
      older.poll_ref = "/v1/delivery-refinement/delivery-package%3A760/runs/refinement-run%3Aolder";
      projection.latest_run = older; projection.history = [older];
    }
    return { mode: "live", status: "current", error: null, observedAt: new Date().toISOString(), projection };
  };
  await page.route("**/api/**", async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname;
    if (path === "/api/delivery/workspace") {
      const q = url.searchParams;
      const projection = q.get("view") === "register" ? { ...model, packages: model.packages.filter(row => q.has("id") ? row.delivery_package_id === q.get("id") : row.workflow_phase === "refinement") } : model;
      return route.fulfill({ json: { mode: "live", status: "current", error: null, projection,
        ...(q.get("view") === "register" ? { page: { selection: { surface: q.get("surface"), scope: q.get("scope"), query: q.get("q"), status: q.get("status") }, next_cursor: null } } : {}) } });
    }
    if (path === "/api/console/capabilities") return route.fulfill({ json: { artifactType: "console-runtime-capability-projection", schemaVersion: 1, mode: "live", capabilities: [] } });
    if (path.startsWith("/api/saved-work/")) return route.fulfill({ json: { mode: "disconnected-preview" } });
    if (path.includes("/api/delivery/refinement/") && path.endsWith("/projection")) return route.fulfill({ json: snapshot() });
    if (path.includes("/api/delivery/refinement/") && path.endsWith("/apply")) {
      writes.push(req.postDataJSON()); await acknowledgement.promise; run = refinementFeedbackRun(); return route.fulfill({ json: run });
    }
    if (path.includes("/api/delivery/refinement/") && path.includes("/runs/")) {
      await completion.promise; run = refinementFeedbackRun("completed"); return route.fulfill({ json: run });
    }
    return route.fulfill({ status: 503, json: { error: "Unrelated synthetic owner unavailable" } });
  });
  try {
    await openShell(page, "Open DELIVERY");
    await page.getByRole("button", { name: /04.*Refinement/i }).click();
    await page.getByRole("row").filter({ hasText: "Adapter Contract Metadata Repair" }).click();
    await page.getByRole("button", { name: "Open Refinement Hub", exact: true }).click();
    await current(page).getByRole("button", { name: /Apply Refinement/i }).click();
    await current(page).getByRole("button", { name: "Apply Refinement", exact: true }).click();
    await expect.poll(() => writes.length).toBe(1);
    await expect(current(page).getByRole("button", { name: "Applying…", exact: true })).toBeDisabled();
    await expect(current(page).getByRole("button", { name: "Back to Hub", exact: true })).toBeDisabled();
    await expect(current(page).getByText("Submitting reviewed Refinement…", { exact: true })).toBeVisible();
    await expect(current(page).getByText("Apply is waiting for metadata review and readiness gates.", { exact: true })).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath("refinement-awaiting-acknowledgement.png") });
    acknowledgement.release();
    await expect(current(page).getByText("Synthetic backend acknowledged the original run.", { exact: true }).first()).toBeVisible();
    await expect(current(page).getByText("processing", { exact: true }).first()).toBeVisible();
    completion.release();
    await expect(current(page).getByRole("button", { name: "Back to Register", exact: true })).toBeEnabled();
    await current(page).getByRole("button", { name: /Apply Refinement/i }).click();
    await expect(current(page).getByText("Original event times are retained above.", { exact: false })).toBeVisible();
    await expect(current(page).getByText("Synthetic backend acknowledged the original run.", { exact: true }).first()).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("refinement-receipt-events.png") });
    expect(writes).toHaveLength(1); expect(errors).toEqual([]);
  } finally { acknowledgement.release(); completion.release(); }
});
