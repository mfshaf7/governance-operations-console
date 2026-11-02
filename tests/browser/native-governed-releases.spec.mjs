import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { governedProductsProjection } from "../support/governed-products-ui-fixture.mjs";
import { environmentCatalog, environmentOperation } from "../support/environment-operations-ui-fixture.mjs";

// Explicit test-only owner transport. Never publish these inputs as live data.
const base = process.env.CONSOLE_TEST_BASE_URL ?? "http://127.0.0.1:4317";
if (new URL(base).port === "3317") throw Error("Native qualification requires an isolated preview.");
test.setTimeout(90000);
test.use({ actionTimeout: 15000, navigationTimeout: 60000 });

for (const width of [1280, 1700]) test(`Native release review and original recovery survive reload at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: width === 1280 ? 800 : 1000 });
  const projection = governedProductsProjection();
  projection.source_posture="accepted-snapshot";projection.source_notice="Reviewed snapshot. Current owner main is not confirmed.";
  const product = projection.products.find(item => item.product_id === "openclaw");
  const definition = { schema_version: 1, workflow_id: "runtime", capability_id: "release.openclaw.runtime", action: "governed-release.change-runtime-lifecycle", available: true, unavailable_reason: null, source_version: projection.source_version,
    fields: [{ id: "state", label: "Target production state", description: "Choose the owner target.", kind: "select", required: true, default_value: "", options: [{ label: "Traffic stopped", value: "traffic-stopped" }, { label: "Quarantined", value: "quarantined" }] },
      ...[["reason", "Reason", true], ["incident_ref", "Incident or follow-up reference", false], ["operation_note", "Operator note", false]].map(([id, label, required]) => ({ id, label, required, description: "Synthetic owner input for browser qualification.", kind: "text", default_value: "", options: [] }))] };
  product.workflows.find(workflow => workflow.id === "runtime").native = definition;
  const catalog = environmentCatalog();
  catalog.subjects = [{ kind: "product-runtime-lifecycle", ref: "product:openclaw", owner: "platform-engineering", source_version: projection.source_version, capabilities: [{ action: definition.action, approval_required: true, available: true, capability_id: definition.capability_id, destructive: true, required_capability: "platform.release.runtime", unavailable_reason: null }] }];
  let operation = null, posts = 0;
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.route("**/api/**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (path === "/api/console/capabilities") return route.fulfill({ json: { artifactType: "console-runtime-capability-projection", schemaVersion: 1, mode: "live", capabilities: [] } });
    if (path === "/api/governed-products") return route.fulfill({ json: { mode: "live", projection } });
    if (path === "/api/environment-operations" && request.method() === "POST") {
      posts += 1;
      const input = request.postDataJSON();
      operation = structuredClone(environmentOperation("native", { kind: "product-runtime-lifecycle", ref: "product:openclaw", action: definition.action, state: "queued" }));
      operation.operation_id = "platform-operation:" + createHash("sha256").update(JSON.stringify({ command_id: "console-command:" + input.requestId })).digest("hex").slice(0, 24);
      operation.command.capability_id = definition.capability_id;
      operation.command.command_id = "console-command:" + input.requestId;
      operation.command.subject.expected_source_version = projection.source_version;
      operation.command.input = input.input;
      Object.assign(operation.provider_operation, { command_id: operation.command.command_id, capability_id: definition.capability_id,
        release_workflow: { schema_version: 1, workflow_id: "runtime", phase: "awaiting-approval", run_id: 42, run_url: "https://github.com/mfshaf7/platform-engineering/actions/runs/42", pull_request_url: null, branch: null, merge_commit: null, desired_state_verified: false } });
      operation.next_action = { code: "approve-owner-environment", authority: "operator", reason: "Approve the original protected environment job, then refresh." };
      return route.abort("failed"); // Accepted fixture write; acknowledgement lost.
    }
    if (path === "/api/environment-operations") return route.fulfill({ json: { mode: "live", status: "current", observedAt: new Date().toISOString(), catalog, operations: operation ? [operation] : [], historyPage: { workspace: "governed-releases", limit: 10, total: operation ? 1 : 0, snapshot: "sha256:" + "d".repeat(64), next_cursor: null } } });
    if (path.startsWith("/api/environment-operations/") && operation) return route.fulfill({ json: operation });
    return route.fulfill({ status: 503, json: { error: "Unrelated owner excluded from test transport" } });
  });
  async function open() {
    await page.waitForFunction(() => { const button = document.querySelector('button[title="Governed Releases"]'); return button && Object.keys(button).some(key => key.startsWith("__reactProps$")); });
    await page.locator('button[title="Governed Releases"]').click();
    await page.getByRole("dialog", { name: "Governed Releases", exact: true }).getByRole("button", { name: "Inspect openclaw", exact: true }).click();
    const dashboard = page.getByRole("dialog", { name: "Product Dashboard", exact: true });
    await dashboard.getByRole("radio", { name: "Release Path", exact: true }).click();
    return dashboard;
  }
  await page.goto(base + "/?dev=1", { waitUntil: "domcontentloaded" });
  let dashboard = await open();
  await expect(dashboard.getByRole("button", { name: "Change runtime state", exact: true })).toBeDisabled();
  await expect(dashboard.getByRole("button", { name: "Change production runtime state", exact: true })).toBeEnabled();
  await dashboard.getByRole("button", { name: "Back to Register", exact: true }).click();
  projection.source_posture="owner-main";projection.source_notice=null;
  await page.getByRole("dialog",{name:"Governed Releases",exact:true}).getByRole("button",{name:"Refresh products",exact:true}).click();
  await page.getByRole("dialog",{name:"Governed Releases",exact:true}).getByRole("button",{name:"Inspect openclaw",exact:true}).click();
  await dashboard.getByRole("radio",{name:"Release Path",exact:true}).click();
  await dashboard.getByRole("button", { name: "Change runtime state", exact: true }).click();
  let form = page.getByRole("dialog", { name: "Change production runtime state", exact: true });
  await form.getByLabel("Reason *", { exact: true }).fill("Synthetic browser qualification");
  await form.getByRole("button", { name: "Target production state *", exact: true }).click();
  await page.getByRole("option", { name: "Quarantined", exact: true }).click();
  await expect(form.getByRole("button", { name: "Review request", exact: true })).toBeDisabled();
  await expect(form.getByLabel("Incident or follow-up reference *", { exact: true })).toBeVisible();
  await form.getByRole("button", { name: "Target production state *", exact: true }).click();
  await page.getByRole("option", { name: "Traffic stopped", exact: true }).click();
  await form.getByRole("button", { name: "Close", exact: true }).click();
  const guard = page.getByRole("alertdialog", { name: "Discard these release details?", exact: true });
  await expect(guard).toBeVisible();
  await guard.getByRole("button", { name: "Keep Editing", exact: true }).click();
  await form.getByRole("button", { name: "Review request", exact: true }).click();
  await expect(form).toContainText("Synthetic browser qualification");
  await page.screenshot({ path: test.info().outputPath(`native-review-${width}.png`) });
  expect(await form.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await form.getByRole("button", { name: "Submit release request", exact: true }).click();
  await expect(form).toContainText("submission outcome is unconfirmed");
  await expect(form.getByRole("button", { name: "Submit release request", exact: true })).toHaveCount(0);
  await page.reload({ waitUntil: "domcontentloaded" });
  dashboard = await open();
  await expect(dashboard.getByRole("button", { name: "Change runtime state", exact: true })).toBeDisabled();
  await dashboard.getByRole("button", { name: "Recover original request", exact: true }).click();
  const result = page.getByRole("dialog", { name: "Original release request recorded", exact: true });
  await expect(result).toContainText("awaiting approval");
  await result.getByRole("button", { name: "Inspect operation history", exact: true }).click();
  await expect(dashboard.getByRole("button", { name: `Inspect operation ${operation.operation_id}`, exact: true })).toBeVisible();
  expect(posts).toBe(1); expect(errors).toEqual([]);
});
