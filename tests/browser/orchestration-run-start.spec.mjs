import { test, expect } from "@playwright/test";
import { definition, config, revision, runProjection } from "../orchestration/orchestration-start-fixtures.mjs";

// Browser interaction proof uses explicit synthetic owner responses, not live
// runtime qualification. The ordinary server and native proof are separate.
const base = process.env.CONSOLE_TEST_BASE_URL ?? "http://127.0.0.1:3320";
const context = { initiativeId: 880001, title: "Synthetic browser initiative", recordRef: "openproject://work_packages/880001",
  sourceVersion: revision, projectionRef: "oos://v1/delivery-initiatives/delivery-880001/change-control",
  projectionVersion: revision, startAllowed: true, blockers: [] };
test.setTimeout(120_000);
test.use({ actionTimeout: 20_000, navigationTimeout: 60_000, viewport: { width: 1600, height: 1100 } });

async function mount(page, { loseFirst = false } = {}) {
  const writes = [], errors = [];
  let retained = null;
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/**", async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname === "/api/orchestration" && request.method() === "GET") {
      return route.fulfill({ json: { mode: "live", status: "current", error: null, observedAt: new Date().toISOString(), definitions: [definition()], runs: [] } });
    }
    if (url.pathname === "/api/orchestration/start") {
      if (request.method() === "GET") return route.fulfill({ json: context });
      expect(request.method()).toBe("POST");
      const intent = request.postDataJSON(); writes.push(intent);
      retained = runProjection({ request_id: `console-orchestration-request:${intent.requestId}`,
        idempotency_key: `console-orchestration-start:${intent.requestId}`, definition_id: "validation-readiness-run",
        source_domain: "workspace-governance-control-fabric", source_record_ref: context.recordRef,
        source_version_ref: intent.expectedSourceVersion, source_projection_ref: context.projectionRef,
        source_projection_version: context.projectionVersion, intent_digest: `sha256:${"c".repeat(64)}`,
        correlation_ref: `correlation:${intent.requestId}`, causation_ref: `review:${intent.requestId}`,
        operator_id: config.operatorId, approval_refs: [{ decision_ref: `approval:${intent.requestId}` }] });
      if (loseFirst && writes.length === 1) return route.abort("failed");
      return route.fulfill({ status: 202, json: { duplicate: writes.length > 1, runId: retained.run_id, state: null } });
    }
    if (url.pathname.startsWith("/api/orchestration/runs/") && request.method() === "GET") {
      expect(decodeURIComponent(url.pathname.split("/").pop())).toBe(retained.run_id);
      return route.fulfill({ json: retained });
    }
    expect(["GET", "HEAD", "OPTIONS"]).toContain(request.method());
    return route.continue();
  });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const node = document.querySelector('button[title="Open ORCHESTRATION"]');
    const key = node && Object.keys(node).find(key => key.startsWith("__reactProps$"));
    return Boolean(key && node[key].onClick);
  });
  await page.getByRole("navigation", { name: "Console navigation", exact: true }).hover();
  await page.locator('button[title="Open ORCHESTRATION"]').focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Refresh owner truth", exact: true })).toBeVisible();
  return { writes, errors, retained: () => retained };
}
async function openStart(page) {
  await page.locator('[data-orchestration-workspace-section="definitions"]').click();
  await page.getByRole("button", { name: "Open Definition", exact: true }).click();
  await page.getByRole("button", { name: "Start Run", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Start validation readiness run", exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("textbox", { name: "Delivery initiative", exact: true }).fill("880001");
  await dialog.getByRole("textbox", { name: "Run purpose", exact: true }).fill("Read-only browser interaction qualification.");
  await expect(dialog.getByRole("button", { name: "Start reviewed run", exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "Review current source", exact: true }).click();
  await expect(dialog).toContainText("Synthetic browser initiative");
  await expect(dialog.getByRole("button", { name: "Start reviewed run", exact: true })).toBeDisabled();
  await dialog.getByRole("radio", { name: "I approve this read-only run for the reviewed source and purpose", exact: true }).click();
  return dialog;
}

test("reviewed Start is explicit; workerless acknowledgement stays distinct from completed state", async ({ page }, testInfo) => {
  const state = await mount(page);
  const dialog = await openStart(page);
  await dialog.getByRole("button", { name: "Start reviewed run", exact: true }).click();
  await expect(dialog).toContainText("Run admitted");
  await expect(dialog).toContainText("No run projection is available yet");
  expect(state.writes).toHaveLength(1);
  await dialog.getByRole("button", { name: "Read original run", exact: true }).click();
  await expect(dialog).toContainText("running");
  await expect(dialog).toContainText("No aggregate receipt yet");
  expect(state.writes).toHaveLength(1);
  expect(state.errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("admitted-original-run.png"), fullPage: true });
});

test("lost acknowledgement freezes identity and Escape guard preserves the identical retry", async ({ page }, testInfo) => {
  const state = await mount(page, { loseFirst: true });
  const dialog = await openStart(page);
  await dialog.getByRole("button", { name: "Start reviewed run", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Retry original start", exact: true })).toBeEnabled();
  await expect(dialog.getByRole("textbox", { name: "Delivery initiative", exact: true })).toBeDisabled();
  await expect(dialog.getByRole("textbox", { name: "Original run reference", exact: true })).toBeDisabled();
  const original = await dialog.getByRole("textbox", { name: "Original run reference", exact: true }).inputValue();
  await dialog.getByRole("button", { name: "Retry original start", exact: true }).focus();
  await page.keyboard.press("Escape");
  const guard = page.getByRole("alertdialog", { name: "Leave this run request?", exact: true });
  await expect(guard).toBeVisible();
  await guard.getByRole("button", { name: "Keep Editing", exact: true }).click();
  await expect(dialog.getByRole("textbox", { name: "Original run reference", exact: true })).toHaveValue(original);
  expect(state.writes).toHaveLength(1);
  await dialog.getByRole("button", { name: "Retry original start", exact: true }).click();
  await expect(dialog).toContainText("Original run recovered");
  expect(state.writes).toHaveLength(2);
  expect(state.writes[1]).toEqual(state.writes[0]);
  expect(state.errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("same-request-recovered.png"), fullPage: true });
});

test("after reload the original run can be read independently of the empty register", async ({ page }) => {
  const state = await mount(page);
  const dialog = await openStart(page);
  await dialog.getByRole("button", { name: "Start reviewed run", exact: true }).click();
  await expect(dialog).toContainText("Run admitted");
  const original = state.retained().run_id;
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const node = document.querySelector('button[title="Open ORCHESTRATION"]');
    const key = node && Object.keys(node).find(key => key.startsWith("__reactProps$"));
    return Boolean(key && node[key].onClick);
  });
  await page.getByRole("navigation", { name: "Console navigation", exact: true }).hover();
  await page.locator('button[title="Open ORCHESTRATION"]').focus(); await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Read original run", exact: true }).click();
  const recovery = page.getByRole("dialog", { name: "Recover original run", exact: true });
  await recovery.getByRole("textbox", { name: "Original run reference", exact: true }).fill(original);
  await recovery.getByRole("button", { name: "Read original run", exact: true }).click();
  await expect(recovery).toContainText("running");
  await expect(recovery.getByRole("button", { name: "Start reviewed run", exact: true })).toHaveCount(0);
  expect(state.writes).toHaveLength(1);
  expect(state.errors).toEqual([]);
});
