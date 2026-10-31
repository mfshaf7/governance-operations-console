import { test, expect } from "@playwright/test";

const base = process.env.CONSOLE_TEST_BASE_URL ?? "http://127.0.0.1:4317";
test.use({ viewport: { width: 1700, height: 1000 }, actionTimeout: 15000 });
test.setTimeout(90000);

async function open(page, { offline = false, view = "runtime" } = {}) {
  // The existing shell context may GET the registry independently.
  const writes = [], ownerReads = [];
  await page.route("**/api/**", route => {
    const req = route.request();
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method())) { writes.push(req.url()); return route.abort(); }
    if (req.url().includes("/model-operations/runtime/")) ownerReads.push(req.url());
    return route.continue();
  });
  if (offline) {
    await page.route("**/api/console/capabilities", route => route.fulfill({ json: {
      artifactType: "console-runtime-capability-projection", schemaVersion: 1, mode: "live", capabilities: [],
    } }));
    await page.route("**/api/model-operations/runtime/**", route => route.fulfill({ status: 503, json: { error: "Synthetic owner unavailable" } }));
  }
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const node = document.querySelector('button[title="Open MODEL"]');
    const key = node && Object.keys(node).find(value => value.startsWith("__reactProps$"));
    return Boolean(key && node[key].onClick);
  }, null, { timeout: 60000 });
  await page.locator('button[title="Open MODEL"]').click();
  const control = page.getByRole("dialog", { name: "Model Operations Control", exact: true });
  if (view === "runtime") await control.getByRole("radio", { name: "Models & routing", exact: true }).click();
  return { control, writes, ownerReads };
}

test("read-only preview keeps the shared compact layout, workflow search and selected-route orientation", async ({ page }) => {
  const { control, writes, ownerReads } = await open(page);
  await expect(control.getByText("Disconnected preview · read-only samples, not current provider or account state.", { exact: true })).toBeVisible();
  await expect(control.locator('[data-teras-record-control-overview-grid="true"] > *')).toHaveCount(2);
  await expect(control.getByRole("button", { name: "Primary model", exact: true })).toHaveCount(0);
  const selected = control.locator('[data-teras-selected-panel="compact"]');
  await expect(selected).toContainText("Sample reasoning model");
  await control.getByRole("searchbox", { name: "Search workflows", exact: true }).fill("sample assistant");
  await expect(control.locator("tbody tr")).toHaveCount(1);
  await control.getByRole("row").filter({ hasText: "Sample assistant" }).click();
  await expect(selected).toContainText("Existing profile binding");
  await control.getByRole("searchbox", { name: "Search workflows", exact: true }).fill("");
  for (const width of [1200, 1440, 1700, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    const box = await selected.boundingBox();
    const action = await selected.getByRole("button", { name: "Review routing", exact: true }).boundingBox();
    expect(action.x).toBeGreaterThanOrEqual(box.x);
    expect(action.x + action.width).toBeLessThanOrEqual(box.x + box.width + 1);
    expect(action.y + action.height).toBeLessThanOrEqual(1000);
    expect(await control.evaluate(n => n.scrollWidth - n.clientWidth)).toBeLessThanOrEqual(1);
  }
  await page.setViewportSize({ width: 1700, height: 1000 });
  await control.screenshot({ path: test.info().outputPath("model-control.png") });
  expect(writes).toEqual([]); expect(ownerReads.filter(url => !url.endsWith("/registry"))).toEqual([]);
});

test("focused sample inspectors preserve saved effort and fallback without creating owner requests", async ({ page }) => {
  const { control, writes, ownerReads } = await open(page);
  await control.getByRole("button", { name: "Review routing", exact: true }).click();
  const routing = page.getByRole("dialog", { name: "Workflow routing", exact: true });
  await expect(routing.getByText("Sample reasoning model · sample-cloud · High", { exact: true })).toBeVisible();
  await expect(routing.getByText("Sample local model · sample-local · Thinking off", { exact: true })).toBeVisible();
  await expect(routing.getByRole("button", { name: "Save routing", exact: true })).toBeDisabled();
  await expect(routing.getByRole("button", { name: "Add explicit fallback", exact: true })).toBeDisabled();
  await routing.screenshot({ path: test.info().outputPath("routing-inspector.png") });
  await routing.getByRole("button", { name: "Back to Models & routing", exact: true }).click();
  await control.getByRole("button", { name: "Manage registrations", exact: true }).click();
  const registrations = page.getByRole("dialog", { name: "Model registrations", exact: true });
  await expect(registrations.getByText("Sample · read-only", { exact: true })).toBeVisible();
  await expect(registrations.getByRole("button", { name: "Connect account", exact: true })).toBeDisabled();
  await expect(registrations.getByRole("button", { name: "Verify & update registration", exact: true })).toBeDisabled();
  await expect(registrations.getByRole("button", { name: "Remove selected registration", exact: true })).toBeDisabled();
  await registrations.getByRole("button", { name: "Back to Models & routing", exact: true }).click();
  await control.getByRole("button", { name: "Operation history", exact: true }).click();
  const history = page.getByRole("dialog", { name: "Model operation history", exact: true });
  await expect(history.getByText("No owner operations are created in this read-only preview.", { exact: true })).toBeVisible();
  await expect(history.getByRole("button", { name: "Review restoration", exact: true })).toBeDisabled();
  await history.getByRole("button", { name: "Back to Models & routing", exact: true }).click();
  await expect(control.getByRole("button", { name: "API connections", exact: true })).toBeDisabled();
  expect(writes).toEqual([]); expect(ownerReads.filter(url => !url.endsWith("/registry"))).toEqual([]);
});

test("purpose-profile filtering, checks and evidence inspectors remain separate from model configuration", async ({ page }) => {
  const { control, writes } = await open(page);
  await control.getByRole("radio", { name: "Purpose profiles", exact: true }).click();
  await expect(control.getByRole("button", { name: "Request Profile", exact: true })).toBeDisabled();
  await expect(control.getByRole("button", { name: "Request History", exact: true })).toBeDisabled();
  await control.getByRole("searchbox", { name: "Search model profiles", exact: true }).fill("missing-profile");
  await expect(control.getByText("No profiles match the current search and filters.", { exact: true })).toBeVisible();
  await control.getByRole("searchbox", { name: "Search model profiles", exact: true }).fill("");
  await control.getByRole("button", { name: "Request Requirements", exact: true }).click();
  await page.getByRole("dialog", { name: "Model Profile Request Boundary", exact: true }).getByRole("button", { name: "Close dialog", exact: true }).click();
  await expect(control.getByRole("button", { name: "Inspect local runtime", exact: true })).toHaveCount(0);
  await control.getByRole("button", { name: "Open Profile Dashboard", exact: true }).click();
  const dashboard = page.getByRole("dialog", { name: "Model Profile Dashboard", exact: true });
  const checks = await dashboard.getByRole("button", { name: /^Inspect / }).evaluateAll(nodes => nodes.map(n => n.getAttribute("aria-label")));
  expect(checks.length).toBeGreaterThan(3);
  for (const name of checks) {
    await dashboard.getByRole("button", { name, exact: true }).click();
    const evidence = page.getByRole("dialog", { name: /Model Profile (Inspector|Check)/ });
    if (name === "Inspect Access Plane") {
      await expect(evidence.getByText("Credential owner", { exact: true })).toBeVisible();
      await expect(evidence.getByText("Access reason", { exact: true })).toBeVisible();
      await expect(evidence.getByText(/Live profile activation remains blocked until/)).toBeVisible();
    }
    await evidence.getByRole("button", { name: "Close dialog", exact: true }).click();
  }
  await dashboard.screenshot({ path: test.info().outputPath("profile-dashboard.png") });
  expect(writes).toEqual([]);
});

test("Purpose-profile actions and governed access remain reachable without clipped sidebar content", async ({ page }) => {
  const { control, writes } = await open(page, { view: "default" });
  const sidebar = control.locator('[data-model-operations-selected-profile="true"]');
  const dashboardAction = sidebar.getByRole("button", { name: "Open Profile Dashboard", exact: true });
  const access = sidebar.getByRole("list", { name: "Governed access summary", exact: true });
  await expect(control.getByRole("button", { name: "Inspect local runtime", exact: true })).toHaveCount(0);
  await expect(access).toContainText("Governed access");
  await expect(access).toContainText("Activation blocked.");
  for (const width of [1200, 1440, 1700, 1920]) for (const height of [900, 1000]) {
    await page.setViewportSize({ width, height });
    for (const target of [dashboardAction, access]) {
      await target.scrollIntoViewIfNeeded();
      const clipped = await target.evaluate(node => {
        const rect = node.getBoundingClientRect(), failures = [];
        for (let parent = node.parentElement; parent; parent = parent.parentElement) {
          const style = getComputedStyle(parent), box = parent.getBoundingClientRect();
          if (["hidden", "clip", "auto"].includes(style.overflowY) && (rect.top < box.top - 0.5 || rect.bottom > box.bottom + 0.5)) failures.push("vertical");
          if (["hidden", "clip", "auto"].includes(style.overflowX) && (rect.left < box.left - 0.5 || rect.right > box.right + 0.5)) failures.push("horizontal");
        }
        return failures;
      });
      expect(clipped).toEqual([]);
    }
  }
  await page.setViewportSize({ width: 1700, height: 1000 });
  await control.screenshot({ path: test.info().outputPath("purpose-sidebar.png") });
  await dashboardAction.click();
  await expect(page.getByRole("dialog", { name: "Model Profile Dashboard", exact: true })).toBeVisible();
  expect(writes).toEqual([]);
});

test("local-runtime inspection stays in Ollama backend details and preserves unavailable source truth", async ({ page }) => {
  const { control, writes } = await open(page, { view: "default" });
  await expect(control.getByRole("button", { name: "Inspect local runtime", exact: true })).toHaveCount(0);
  await control.getByRole("radio", { name: "Models & routing", exact: true }).click();
  await expect(control.getByRole("button", { name: /Inspect.*runtime/i })).toHaveCount(0);
  await control.getByRole("button", { name: "Manage registrations", exact: true }).click();
  const registrations = page.getByRole("dialog", { name: "Model registrations", exact: true });
  await expect(registrations.getByRole("button", { name: "Inspect runtime", exact: true })).toHaveCount(0);
  await registrations.getByRole("button", { name: "Admitted backend", exact: true }).click();
  await page.getByRole("option", { name: "sample-local · ollama", exact: true }).click();
  await registrations.getByRole("button", { name: "Inspect runtime", exact: true }).click();
  const inspector = page.getByRole("dialog", { name: "Local Exception Runtime", exact: true });
  await expect(inspector.getByText("Provider", { exact: true })).toBeVisible();
  await expect(inspector.getByText("No local runtime inventory has been admitted to this projection.", { exact: true })).toBeVisible();
  await inspector.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.route("**/api/model-operations", route => route.fulfill({ status: 503, json: { error: "Synthetic inventory unavailable" } }));
  await registrations.getByRole("button", { name: "Inspect runtime", exact: true }).click();
  await expect(inspector.getByText(/could not reconcile|inventory.*unavailable/i)).toBeVisible();
  await expect(inspector.getByText("Provider", { exact: true })).toHaveCount(0);
  await expect(inspector.getByText("No local runtime inventory has been admitted to this projection.", { exact: true })).toHaveCount(0);
  expect(writes).toEqual([]);
});

test("configured-owner failure shows unavailable state without substituting preview samples", async ({ page }) => {
  const { control, writes } = await open(page, { offline: true });
  await expect(control.getByText("Synthetic owner unavailable", { exact: true })).toBeVisible();
  await expect(control.getByText(/Sample reasoning model/)).toHaveCount(0);
  await expect(control.getByRole("button", { name: "Manage registrations", exact: true })).toHaveCount(0);
  expect(writes).toEqual([]);
});

test("Purpose profiles opens by default and page-selector hover/focus stays inside the modal", async ({ page }) => {
  const { control, writes } = await open(page, { view: "default" });
  const group = control.getByRole("radiogroup", { name: "Model Operations pages", exact: true });
  const profiles = group.getByRole("radio", { name: "Purpose profiles", exact: true });
  const runtime = group.getByRole("radio", { name: "Models & routing", exact: true });
  await expect(profiles).toBeChecked();
  await expect(group.getByRole("radio").first()).toHaveText("Purpose profiles");
  for (const width of [1200, 1440, 1700, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const radio of [profiles, runtime]) {
      await radio.hover();
      const clipped = await radio.evaluate(node => {
        const rect = node.getBoundingClientRect(), failures = [];
        for (let parent = node.parentElement; parent; parent = parent.parentElement) {
          const style = getComputedStyle(parent), box = parent.getBoundingClientRect();
          if (["hidden", "clip", "auto"].includes(style.overflowY) && (rect.top < box.top - 0.5 || rect.bottom > box.bottom + 0.5)) failures.push("vertical");
          if (["hidden", "clip", "auto"].includes(style.overflowX) && (rect.left < box.left - 0.5 || rect.right > box.right + 0.5)) failures.push("horizontal");
        }
        return failures;
      });
      expect(clipped).toEqual([]);
    }
  }
  await page.setViewportSize({ width: 1700, height: 1000 });
  await control.screenshot({ path: test.info().outputPath("purpose-default-hover.png") });
  await profiles.focus(); await page.keyboard.press("ArrowRight");
  await expect(runtime).toBeChecked();
  await page.keyboard.press("Home"); await expect(profiles).toBeChecked();
  await control.getByRole("button", { name: "Close modal", exact: true }).click();
  await page.locator('button[title="Open MODEL"]').click();
  await expect(page.getByRole("radio", { name: "Purpose profiles", exact: true })).toBeChecked();
  expect(writes).toEqual([]);
});

test("registration keeps backend status, scoped model inventory and new-model form distinct", async ({ page }) => {
  const { control, writes } = await open(page);
  await control.getByRole("button", { name: "Manage registrations", exact: true }).click();
  const registrations = page.getByRole("dialog", { name: "Model registrations", exact: true });
  const backend = registrations.locator('[data-model-backend-context="true"]');
  const inventory = registrations.locator('[data-model-registrations-register="true"]');
  const selected = registrations.locator('[data-model-registration-selection="true"]');
  await expect(backend.getByText("Backend health", { exact: true })).toBeVisible();
  await expect(backend.getByText("Registered models", { exact: true })).toHaveCount(0);
  await expect(inventory.locator("tbody tr")).toHaveCount(1);
  await expect(inventory).toContainText("Sample reasoning model");
  await expect(inventory).not.toContainText("Sample local model");
  await expect(inventory.getByText("1/1 shown", { exact: true })).toBeVisible();
  await expect(selected.getByRole("heading", { name: "Sample reasoning model", exact: true })).toBeVisible();
  const technical = selected.locator("details");
  const technicalToggle = technical.locator("summary");
  await expect(technical).toHaveJSProperty("open", false);
  await expect(selected.getByRole("list", { name: "Model verification summary", exact: true })).toContainText("Last successful check");
  await technicalToggle.focus(); await page.keyboard.press("Enter");
  await expect(technical).toHaveJSProperty("open", true);
  await expect(technical.getByText("Registered runtime", { exact: true })).toBeVisible();
  await technical.getByText("Registration evidence", { exact: true }).scrollIntoViewIfNeeded();
  await expect(technical.getByText("Registration evidence", { exact: true })).toBeVisible();
  await selected.screenshot({ path: test.info().outputPath("selected-model-technical-details.png") });
  await technicalToggle.click();
  await expect(technical).toHaveJSProperty("open", false);
  await expect(technical.getByText("Registered runtime", { exact: true })).toBeHidden();
  await registrations.getByRole("button", { name: "Admitted backend", exact: true }).click();
  await page.getByRole("option", { name: "sample-local · ollama", exact: true }).click();
  await expect(inventory.locator("tbody tr")).toHaveCount(1);
  await expect(inventory).toContainText("Sample local model");
  await expect(inventory).not.toContainText("Sample reasoning model");
  await expect(selected.getByRole("heading", { name: "Sample local model", exact: true })).toBeVisible();
  await expect(selected.locator("details")).toHaveJSProperty("open", false);
  await expect(backend.getByRole("button", { name: "Connect account", exact: true })).toHaveCount(0);
  await registrations.getByRole("searchbox", { name: "Search registered models", exact: true }).fill("absent");
  await expect(inventory.getByText("No models match this search on the selected backend.", { exact: true })).toBeVisible();
  await expect(selected).toHaveCount(0);
  await registrations.getByRole("searchbox", { name: "Search registered models", exact: true }).fill("");
  for (const width of [1200, 1440, 1700, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await registrations.evaluate(n => n.scrollWidth - n.clientWidth)).toBeLessThanOrEqual(1);
    await expect(selected.getByRole("button", { name: "Remove selected registration", exact: true })).toBeDisabled();
  }
  await page.setViewportSize({ width: 1700, height: 1000 });
  await registrations.screenshot({ path: test.info().outputPath("backend-model-register.png") });
  await registrations.getByRole("button", { name: "Register model", exact: true }).click();
  const form = page.getByRole("dialog", { name: "Register model", exact: true });
  await expect(form).toContainText("Add a model through sample-local");
  await expect(form.getByText("Read-only sample preview. Discovery and registration are disabled.", { exact: true })).toBeVisible();
  await expect(form.getByRole("button", { name: "Verify & register model", exact: true })).toBeDisabled();
  await form.screenshot({ path: test.info().outputPath("register-model-form.png") });
  await form.getByRole("button", { name: "Back to registrations", exact: true }).click();
  await expect(selected.getByRole("heading", { name: "Sample local model", exact: true })).toBeVisible();
  expect(writes).toEqual([]);
});
