import { test, expect } from "../support/filled-surface-layout.mjs";
import { createRequire } from "node:module";
import { governedProductsProjection } from "../support/governed-products-ui-fixture.mjs";
import { environmentCatalog, ownerProfileProjection } from "../support/environment-operations-ui-fixture.mjs";
const require = createRequire(import.meta.url);
const { modelRuntimePreviewRegistry } = require("../../src/domain-workspaces/model-operations/read-model/fixtures/model-runtime.fixture.ts");

const base = process.env.CONSOLE_TEST_BASE_URL ?? "http://127.0.0.1:4317";
if (new URL(base).port === "3317") throw Error("Use an isolated preview for loading tests.");
test.setTimeout(180_000);
test.use({ navigationTimeout: 60_000, actionTimeout: 15_000 });

async function hydrated(page) {
  await page.waitForFunction(() => {
    const button = document.querySelector('button[title="Console"]');
    return button && Object.keys(button).some(key => key.startsWith("__reactProps$"));
  });
}

// Delay actual preview GETs at the browser transport, never a live service.
async function holdReads(page) {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const errors = [], writes = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.route("**/api/**", async route => {
    if (!["GET", "HEAD", "OPTIONS"].includes(route.request().method())) {
      writes.push(route.request().url());
      return route.fulfill({ status: 503, json: { error: "Mutation excluded from loading qualification." } });
    }
    // Hold delivery of the response, rather than releasing all queued browser
    // requests into the preview server at once. The visible request still waits.
    try {
      const response = route.fetch().catch(() => null);
      await gate;
      const observed = await response;
      if (observed) await route.fulfill({ response: observed });
      else await route.abort();
    } catch { await route.abort().catch(() => {}); }
  });
  return { release, errors, writes };
}

const surfaces = [
  ["Proposal", "Open PROPOSAL"], ["Repository", "Open REPOSITORY"],
  ["Prototype", "Open PROTOTYPE"], ["Delivery", "Open DELIVERY"],
  ["Portfolio", "Open PORTFOLIO"], ["Models", "Open MODEL"],
  ["Orchestration", "Open ORCHESTRATION"], ["Lifecycle", "Lifecycle Transitions"],
  ["Registry", "Workspace Registry"], ["Integration", "Dev Integration"],
  ["Releases", "Governed Releases"],
];

for (const width of [1280, 1700]) test(`Initial waits across every workspace at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: width === 1280 ? 800 : 1000 });
  for (const [name, title] of surfaces) {
    const hold = await holdReads(page);
    try {
      await page.goto(base + "/?dev=1", { waitUntil: "domcontentloaded" });
      await hydrated(page);
      await page.locator(`button[title="${title}"]`).click();
      const loading = page.locator('dialog[open] [data-teras-loading="panel"]').first();
      await expect(loading, name + " has visible first-read feedback").toBeVisible();
      await expect(loading.getByRole("status")).toBeVisible();
      expect(await loading.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
      if (name === "Registry") {
        await expect(page.locator('dialog[open]')).not.toContainText("No canonical records are available.");
        await page.screenshot({ path: test.info().outputPath(`loading-registry-${width}.png`) });
      }
      hold.release();
      await expect(loading).toHaveCount(0, { timeout: 45_000 });
      expect(hold.errors, name + " browser errors").toEqual([]);
      expect(hold.writes, name + " read-only navigation").toEqual([]);
    } finally {
      hold.release();
      await page.unrouteAll({ behavior: "wait" });
    }
  }
});

test("Primary panels show pending reads and stop on failure", async ({ page }) => {
  const hold = await holdReads(page);
  await page.goto(base + "/?dev=1", { waitUntil: "domcontentloaded" });
  await hydrated(page);
  await expect(page.getByRole("status").filter({ hasText: "Loading governance activity" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Loading AI activity" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Loading resource readings" })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("loading-primary.png") });
  hold.release();
  await expect(page.getByRole("status").filter({ hasText: "Loading governance activity" })).toHaveCount(0);
  expect(hold.writes).toEqual([]);
  expect(hold.errors).toEqual([]);
});

test("Slow waits, failure recovery, close and reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.route(/\/api\/workspace-(registry|continuity)(?:\?|$)/, async route => {
    await gate;
    await route.fulfill({ status: 503, json: { error: "Synthetic inventory unavailable", code: "loading_test_unavailable" } }).catch(() => {});
  });
  await page.goto(base + "/?dev=1", { waitUntil: "domcontentloaded" });
  await hydrated(page);
  await page.locator('button[title="Workspace Registry"]').click();
  const workspace = page.getByRole("dialog", { name: "Workspace Registry", exact: true });
  const loader = workspace.locator('[data-teras-loading="panel"]');
  await expect(loader).toBeVisible();
  const motion = await loader.locator('[data-teras-loading-signal] i').first().evaluate(node => getComputedStyle(node).animationName);
  expect(motion).toBe("none");
  await expect(loader.getByText("Still waiting for a response.")).toBeVisible({ timeout: 12_000 });
  await page.screenshot({ path: test.info().outputPath("loading-reduced-motion.png") });
  release();
  await expect(loader).toHaveCount(0);
  await expect(workspace).toContainText("Registry unavailable");
  await expect(workspace.getByRole("button", { name: "Retry Registry", exact: true })).toBeEnabled();
  await expect(workspace).not.toContainText("Still waiting for a response.");
  await workspace.getByRole("button", { name: "Close modal", exact: true }).click();
  expect(errors).toEqual([]);
});

test("Retained release rows remain visible during refresh and then failure", async ({ page }) => {
  let release, refresh = false;
  const gate = new Promise(resolve => { release = resolve; });
  const projection = governedProductsProjection(), catalog = environmentCatalog();
  const writes = [];
  await page.route("**/api/**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (request.method() !== "GET") { writes.push(path); return route.fulfill({ status: 503, json: { error: "Writes excluded" } }); }
    if (path === "/api/console/capabilities") return route.fulfill({ json: { artifactType: "console-runtime-capability-projection", schemaVersion: 1, mode: "live", capabilities: [] } });
    if (path === "/api/governed-products") {
      if (refresh) { await gate; return route.fulfill({ status: 503, json: { error: "Synthetic refresh unavailable" } }); }
      return route.fulfill({ json: { mode: "live", projection } });
    }
    if (path === "/api/environment-operations") return route.fulfill({ json: { mode: "live", status: "current", observedAt: new Date().toISOString(), catalog, operations: [], historyPage: { workspace: "governed-releases", limit: 10, total: 0, snapshot: "sha256:" + "d".repeat(64), next_cursor: null } } });
    return route.fulfill({ status: 503, json: { error: "Other owners excluded" } });
  });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await hydrated(page);
  await page.locator('button[title="Governed Releases"]').click();
  const workspace = page.getByRole("dialog", { name: "Governed Releases", exact: true });
  const inspect = workspace.getByRole("button", { name: "Inspect openclaw", exact: true });
  await expect(inspect).toBeEnabled();
  refresh = true;
  const button = workspace.getByRole("button", { name: "Refresh products", exact: true });
  await button.click();
  await expect(button).toHaveAttribute("aria-busy", "true");
  await expect(button).toBeDisabled();
  await expect(inspect).toBeVisible();
  await expect(workspace.locator('[data-teras-loading="panel"]')).toHaveCount(0);
  release();
  await expect(button).toBeEnabled();
  await expect(button).not.toHaveAttribute("aria-busy", "true");
  await expect(inspect).toBeVisible();
  await expect(workspace).toContainText("Synthetic refresh unavailable");
  expect(writes).toEqual([]);
});

test("Model refresh signals its own read and retains workflow rows", async ({ page }) => {
  const registry = modelRuntimePreviewRegistry();
  let refreshing = false, release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/console/capabilities") return route.fulfill({ json: { artifactType: "console-runtime-capability-projection", schemaVersion: 1, mode: "live", capabilities: [] } });
    if (path === "/api/model-operations/runtime/registry") {
      if (refreshing) await gate;
      return route.fulfill({ json: registry });
    }
    if (path === "/api/model-operations/runtime/requests") return route.fulfill({ json: { requests: [], next_cursor: null } });
    return route.fulfill({ status: 503, json: { error: "Unrelated owner excluded" } });
  });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await hydrated(page);
  await page.locator('button[title="Open MODEL"]').click();
  const control = page.getByRole("dialog", { name: "Model Operations Control", exact: true });
  await control.getByRole("radio", { name: "Models & routing", exact: true }).click();
  await expect(control.locator("tbody tr")).toHaveCount(3);
  refreshing = true;
  const button = control.getByRole("button", { name: "Refresh", exact: true });
  await button.click();
  await expect(button).toBeDisabled();
  await expect(button).toHaveAttribute("aria-busy", "true");
  await expect(control.locator("tbody tr")).toHaveCount(3);
  release();
  await expect(button).toBeEnabled();
  await expect(button).not.toHaveAttribute("aria-busy", "true");
});

test("Profile history waits before claiming unavailable or empty", async ({ page }) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/console/capabilities") return route.fulfill({ json: { artifactType: "console-runtime-capability-projection", schemaVersion: 1, mode: "live", capabilities: [] } });
    if (path === "/api/dev-integration/profiles") return route.fulfill({ json: { mode: "live", projection: ownerProfileProjection() } });
    if (path === "/api/dev-integration/requests") { await gate; return route.fulfill({ json: { schema_version: 1, requests: [], page: { next_offset: null, total: 0 } } }); }
    if (path === "/api/environment-operations") return route.fulfill({ json: { mode: "live", status: "current", observedAt: new Date().toISOString(), catalog: environmentCatalog(), operations: [] } });
    return route.fulfill({ status: 503, json: { error: "Unrelated owner excluded" } });
  });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await hydrated(page);
  await page.locator('button[title="Dev Integration"]').click();
  const workspace = page.getByRole("dialog", { name: "Dev Integration", exact: true });
  const loader = workspace.getByRole("status").filter({ hasText: "Loading profile request history" });
  await expect(loader).toBeVisible();
  await expect(workspace).not.toContainText("The request owner could not be read.");
  const refresh = workspace.getByRole("button", { name: "Refresh requests", exact: true });
  await expect(refresh).toHaveAttribute("aria-busy", "true");
  release();
  await expect(loader).toHaveCount(0);
  await expect(workspace).toContainText("No profile requests are loaded for this operator.");
  await expect(refresh).toBeEnabled();
});

test("Capture shows one pending submission and retains input on failure", async ({ page }) => {
  let release, posts = 0;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route("**/api/**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (path === "/api/console/capabilities") return route.fulfill({ json: { artifactType: "console-runtime-capability-projection", schemaVersion: 1, mode: "live", capabilities: [] } });
    if (path === "/api/proposals" && request.method() === "GET") return route.fulfill({ json: { mode: "live", status: "current", error: null, observedAt: new Date().toISOString(), records: [] } });
    if (path === "/api/proposals" && request.method() === "POST") { posts++; await gate; return route.fulfill({ status: 503, json: { error: "Synthetic capture unavailable" } }); }
    return route.fulfill({ status: 503, json: { error: "Unrelated owner excluded" } });
  });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await hydrated(page);
  await page.locator('button[title="Open PROPOSAL"]').click();
  const control = page.getByRole("dialog", { name: "Proposal Control", exact: true });
  await control.getByRole("button", { name: "Capture Proposal", exact: true }).click();
  const form = page.getByRole("dialog", { name: "Capture Proposal", exact: true });
  await form.getByLabel("Proposal title", { exact: true }).fill("Synthetic waiting example");
  await form.getByLabel("Proposal context", { exact: true }).fill("A browser-only example. No owner write is made.");
  const submit = form.getByRole("button", { name: "Submit Capture", exact: true });
  await submit.click();
  await expect(submit).toHaveAttribute("aria-busy", "true");
  await expect(submit).toBeDisabled();
  await expect(form.getByRole("status").filter({ hasText: "Recording proposal" })).toBeVisible();
  release();
  await expect(submit).toBeEnabled();
  await expect(form.getByRole("alert")).toBeVisible();
  await expect(form.getByLabel("Proposal title", { exact: true })).toHaveValue("Synthetic waiting example");
  expect(posts).toBe(1);
});
