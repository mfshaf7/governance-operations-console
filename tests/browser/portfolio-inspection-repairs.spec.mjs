import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { publicationPreparation } from "../support/product-publication-preparation.mjs";

const base = process.env.CONSOLE_TEST_BASE_URL ?? "http://127.0.0.1:3320";
const continuity = JSON.parse(execFileSync(process.execPath, [
  "--experimental-strip-types", "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "--input-type=module", "-e",
  "import {repositoryUiFixture} from './tests/support/repository-ui-fixture.mjs'; console.log(JSON.stringify((await repositoryUiFixture()).continuity));",
], { encoding: "utf8" }));
const inventoryProduct = { ...structuredClone(continuity.inventory[0]),
  kind: "product", name: "synthetic-product", record_id: "product:synthetic-product", lifecycle: "owner-managed" };
inventoryProduct.lineage.source_ref = inventoryProduct.record_id;
continuity.inventory.push(inventoryProduct);
continuity.products.push({
  name: inventoryProduct.name, product_id: inventoryProduct.record_id,
  record_digest: inventoryProduct.record_digest, record_version: inventoryProduct.record_version,
  lineage: inventoryProduct.lineage, posture: "active", lifecycle: "owner-managed", maturity: "owner-managed",
  highest_real_endpoint: "owner-repository-local-preview", governed_prod_promotion: false, stage_supported: false,
  latest_lifecycle_event: null,
  owners: { source: ["synthetic-source"], platform: "platform-engineering", security: "security-architecture", runtime: "synthetic-source" },
  publication_readiness: { product_id: inventoryProduct.record_id, control_state: "unavailable", actionable: false,
    action: null, authority_revision: null, current_publication_posture: null, expires_at: null,
    outcome: null, readiness_ref: null, stale_reasons: ["no-readiness-evidence"], target_publication: null },
});
test.setTimeout(120_000);
test.use({ viewport: { width: 1700, height: 1000 }, actionTimeout: 15000, navigationTimeout: 60000 });

// Synthetic read responses exercise the actual connected and disconnected UI
// branches. No owner command is submitted or replaced with a fake success.
async function setup(page, { connected = false, unavailable = false, missing = false, unknownWrite = false, recoveryOnly = false } = {}) {
  const writes = [], errors = [], reads = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.route("**/api/**", route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
      writes.push({ path, method: request.method(), body: request.postDataJSON() });
      return unknownWrite && path === "/api/product-portfolio/publications"
        ? route.fulfill({ status: 503, json: { mode: "live", error: "Owner response interrupted", code: "owner_unavailable", retryable: true } })
        : route.abort();
    }
    if (path.startsWith("/api/product-portfolio/publications")) reads.push(path);
    if (path === "/api/console/capabilities") return route.fulfill({ json: {
      artifactType: "console-runtime-capability-projection", schemaVersion: 1,
      mode: connected ? "live" : "disconnected-preview", capabilities: [],
    } });
    if (path === "/api/workspace-continuity") return connected
      ? route.fulfill({ json: continuity })
      : route.fulfill({ status: 503, json: { code: "workspace_continuity_live_mode_required", error: "Explicit disconnected preview", retryable: false } });
    if (path === "/api/product-portfolio/publications") return unavailable
      ? route.fulfill({ status: 503, json: { error: "Publication connection unavailable", code: "owner_unavailable", retryable: true } })
      : route.fulfill({ json: { mode: connected ? "live" : "disconnected-preview", reason_code: connected ? null : "inspection_only" } });
    if (path.includes("/api/product-portfolio/publications/products/") && path.endsWith("/preparation")) {
      if (recoveryOnly) return route.fulfill({ json: publicationPreparation({
        source_available: false, authority_revision: null, status: "blocked", manifest_source: null, manifest_schema_version: null,
        available_actions: [], issues: [{ code: "publication-source-unavailable", message: "Earlier request results remain available." }],
        current: { posture: "internal", version: 1, request_id: "product-publication-request:prior",
          previous_receipt: { publication_posture: "internal", publication_version: 1,
            receipt_id: "product-publication-receipt:prior", receipt_digest: "sha256:" + "e".repeat(64) } },
        recent_requests: [{ request_id: "product-publication-request:prior", action: "publish", state: "applied", recorded_at: new Date().toISOString() }],
      }) });
      return route.fulfill({ json: publicationPreparation(missing ? { status: "blocked", manifest_source: null,
        manifest_schema_version: null, issues: [{ code: "missing-owner-information", message: "The product owner has not prepared publication information yet." }] } : {}) });
    }
    if (path.startsWith("/api/product-portfolio/publications/")) return route.fulfill({ status: 503,
      json: { mode: "live", error: "Original owner response unavailable", code: "owner_unavailable", retryable: true } });
    return route.continue();
  });
  await page.goto(`${base}/?dev=1`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const button = document.querySelector('button[title="Open PORTFOLIO"]');
    const key = button && Object.keys(button).find(key => key.startsWith("__reactProps$"));
    return Boolean(key && button[key].onClick);
  }, null, { timeout: 60000 });
  await page.locator('button[title="Open PORTFOLIO"]').click();
  const workspace = page.getByRole("dialog", { name: "Product Portfolio", exact: true });
  await expect(workspace).toBeVisible();
  return { workspace, writes, errors, reads, section: id => workspace.locator(`[data-product-portfolio-section="${id}"]`).click() };
}

async function contained(target) {
  await expect.poll(() => target.evaluate(element => {
    const rect = element.getBoundingClientRect();
    if (rect.height < 1 || rect.top < 0 || rect.bottom > innerHeight) return false;
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const bounds = parent.getBoundingClientRect(), style = getComputedStyle(parent);
      if (["auto", "scroll", "hidden", "clip"].includes(style.overflowY)
        && (rect.top < bounds.top - 2 || rect.bottom > bounds.bottom + 2)) return false;
    }
    return true;
  })).toBe(true);
}

for (const width of [1700, 1280]) {
  test(`Products and Listing settings retain readable columns and mouse selection at ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width === 1280 ? 720 : 1000 });
    const h = await setup(page);
    for (const section of ["products", "curation"]) {
      await h.section(section);
      const table = h.workspace.locator("table").first();
      await expect(table).toBeVisible();
      const widths = await table.locator("tbody tr").first().locator("td").evaluateAll(cells => cells.map(cell => cell.getBoundingClientRect().width));
      expect(widths[0]).toBeGreaterThan(220);
      const row = table.locator("tbody tr").nth(1);
      await row.locator("td").first().click();
      await expect(row).toHaveAttribute("aria-selected", "true");
      await page.screenshot({ path: info.outputPath(`${section}.png`) });
    }
    expect(h.writes).toEqual([]); expect(h.errors).toEqual([]);
  });

  test(`Dashboard tabs and side actions can scroll to their last content at ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width === 1280 ? 720 : 1000 });
    const h = await setup(page);
    const row = h.workspace.getByRole("row").filter({ hasText: "OpenClaw" });
    await row.getByRole("button", { name: "Open", exact: true }).click();
    const dashboard = page.getByRole("dialog", { name: "Product Dashboard", exact: true });
    for (const tab of ["Overview", "Operations", "History"]) {
      await dashboard.getByRole("radio", { name: tab, exact: true }).click();
      const scroll = dashboard.locator('[data-teras-content-region="true"][data-scroll="true"]').first();
      await scroll.hover(); await page.mouse.wheel(0, 2000);
      // A short desktop also scrolls the enclosing primary/side layout. A
      // second native wheel event chains there once the inner tray is at end.
      await page.waitForTimeout(150); await page.mouse.wheel(0, 1000);
      await page.screenshot({ path: info.outputPath(`${tab}.png`) });
      // A section can be taller than the tray. Its heading may have scrolled
      // above it; prove its final evidence value is fully reachable instead.
      await contained(scroll.locator("strong").last());
    }
    const side = dashboard.locator('aside [data-teras-content-region="true"][data-scroll="true"]');
    await side.hover(); await page.mouse.wheel(0, 2000);
    await contained(side.getByRole("button").last());
    expect(h.writes).toEqual([]); expect(h.errors).toEqual([]);
  });

  test(`Publication guides product selection and review without engineering inputs at ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width === 1280 ? 720 : 1000 });
    const h = await setup(page, { connected: true });
    await h.section("publication");
    await expect(h.workspace.locator('[data-product-portfolio-section="curation"]')).toHaveCount(0);
    await expect(h.workspace.getByRole("textbox", { name: "Owner repository", exact: true })).toHaveCount(0);
    await expect(h.workspace.getByRole("textbox", { name: "Committed manifest digest", exact: true })).toHaveCount(0);
    await h.workspace.getByRole("button", { name: "Product to publish", exact: true }).click();
    await page.getByRole("option", { name: "synthetic-product", exact: true }).click();
    const productBox = await h.workspace.getByRole("button", { name: "Product to publish", exact: true }).boundingBox();
    const actionBox = await h.workspace.getByRole("button", { name: "Catalog change", exact: true }).boundingBox();
    expect(Math.abs(productBox.y - actionBox.y)).toBeLessThan(2);
    const reviewButton = h.workspace.getByRole("button", { name: "Review catalog change", exact: true });
    await contained(reviewButton);
    const reason = h.workspace.getByRole("textbox", { name: "Reason for this change", exact: true });
    await expect(reason).toBeEditable();
    await reason.fill("Make this managed product discoverable.");
    await h.section("products"); await h.section("publication");
    await expect(reason).toHaveValue("Make this managed product discoverable.");
    await h.workspace.getByRole("button", { name: "Load current information", exact: true }).click();
    await expect(reason).toHaveValue("Make this managed product discoverable.");
    await expect(h.workspace.getByRole("button", { name: "Review catalog change", exact: true })).toBeEnabled();
    await expect(page.getByRole("alertdialog", { name: "Replace publication draft?" })).toHaveCount(0);
    await page.screenshot({ path: info.outputPath("publication-draft.png") });
    await h.workspace.getByRole("button", { name: "Review catalog change", exact: true }).click();
    const review = page.getByRole("dialog", { name: "Review catalog change", exact: true });
    await expect(review).toBeVisible();
    await expect(review.getByText("Workspace catalog", { exact: true })).toBeVisible();
    await expect(review.getByRole("button", { name: "Confirm catalog change", exact: true })).toBeDisabled();
    await review.getByText("Source and request details", { exact: true }).click();
    await expect(review.getByText("sha256:" + "d".repeat(64), { exact: true })).toBeVisible();
    await review.getByRole("radio", { name: "I approve this catalog change", exact: true }).click();
    await expect(review.getByRole("button", { name: "Confirm catalog change", exact: true })).toBeEnabled();
    await page.screenshot({ path: info.outputPath("publication-review.png") });
    await review.getByRole("button", { name: "Back to draft", exact: true }).click();
    await expect(reason).toHaveValue("Make this managed product discoverable.");
    await h.section("products");
    await h.workspace.getByRole("button", { name: "Open Registry Record", exact: true }).click();
    const guard = page.getByRole("alertdialog", { name: "Discard publication draft?" });
    await expect(guard).toBeVisible();
    await guard.getByRole("button", { name: "Keep Editing", exact: true }).click();
    await h.section("publication"); await expect(reason).toHaveValue("Make this managed product discoverable.");
    await page.keyboard.press("Escape");
    await expect(guard).toBeVisible();
    await guard.getByRole("button", { name: "Discard draft", exact: true }).click();
    await expect(h.workspace).toHaveCount(0);
    expect(h.writes).toEqual([]); expect(h.errors).toEqual([]);
  });

  test(`Connected product evidence retains full references and scrolls at ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width === 1280 ? 720 : 1000 });
    const h = await setup(page, { connected: true });
    await expect(h.workspace.getByRole("row").filter({ hasText: "synthetic-product" })).toBeVisible();
    for (const label of await h.workspace.locator('[data-product-portfolio-section] strong').all()) {
      expect(await label.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    }
    const attention = h.workspace.getByText("Attention", { exact: true });
    expect(await attention.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    const details = h.workspace.getByText("Source and readiness details", { exact: true });
    await details.click();
    const digest = h.workspace.getByText(inventoryProduct.record_digest, { exact: true });
    await digest.scrollIntoViewIfNeeded(); await contained(digest);
    const final = h.workspace.getByText("Not available", { exact: true }).last();
    await final.scrollIntoViewIfNeeded(); await contained(final);
    await page.screenshot({ path: info.outputPath("connected-evidence.png") });
    expect(h.writes).toEqual([]); expect(h.errors).toEqual([]);
  });
}

test("Explicit design preview uses the normal guided screen and cannot publish", async ({ page }, info) => {
  const h = await setup(page);
  await h.section("publication");
  await expect(h.workspace.getByText("Design preview", { exact: true })).toBeVisible();
  await h.workspace.getByRole("button", { name: "Product to publish", exact: true }).click();
  await page.getByRole("option", { name: "OpenClaw", exact: true }).click();
  await h.workspace.getByRole("textbox", { name: "Reason for this change", exact: true }).fill("Inspect the publication interaction.");
  await h.workspace.getByRole("button", { name: "Product to publish", exact: true }).click();
  await page.getByRole("option").nth(2).click();
  const replacement = page.getByRole("alertdialog", { name: "Replace publication draft?" });
  await expect(replacement).toBeVisible();
  await replacement.getByRole("button", { name: "Keep Editing", exact: true }).click();
  await expect(h.workspace.getByRole("textbox", { name: "Reason for this change", exact: true })).toHaveValue("Inspect the publication interaction.");

  await h.workspace.getByRole("button", { name: "Review catalog change", exact: true }).click();
  const review = page.getByRole("dialog", { name: "Review catalog change", exact: true });
  await review.getByRole("radio", { name: "I approve this catalog change", exact: true }).click();
  await expect(review.getByRole("button", { name: "Confirm catalog change", exact: true })).toBeDisabled();
  await page.screenshot({ path: info.outputPath("design-preview.png") });
  expect(h.writes).toEqual([]); expect(h.errors).toEqual([]);
});

test("Unavailable Publication explains the missing connection and exposes no engineering form", async ({ page }) => {
  const h = await setup(page, { connected: true, unavailable: true });
  await h.section("publication");
  await expect(h.workspace.getByText("Publication connection unavailable", { exact: true })).toBeVisible();
  await expect(h.workspace.getByRole("textbox", { name: "Owner repository", exact: true })).toHaveCount(0);
  await expect(h.workspace.getByRole("button", { name: "Review catalog change", exact: true })).toBeDisabled();
  expect(h.writes).toEqual([]); expect(h.errors).toEqual([]);
});

test("Missing owner information is an actionable product prerequisite, not a request for hashes", async ({ page }) => {
  const h = await setup(page, { connected: true, missing: true });
  await h.section("publication");
  await h.workspace.getByRole("button", { name: "Product to publish", exact: true }).click();
  await page.getByRole("option", { name: "synthetic-product", exact: true }).click();
  await expect(h.workspace.getByText(/The product owner has not prepared publication information yet/)).toBeVisible();
  await expect(h.workspace.getByRole("button", { name: "Review catalog change", exact: true })).toBeDisabled();
  await expect(h.workspace.getByRole("textbox", { name: "Committed manifest digest", exact: true })).toHaveCount(0);
  expect(h.writes).toEqual([]); expect(h.errors).toEqual([]);
});


test("an interrupted confirmation retains the exact original request and cannot submit a replacement", async ({ page }) => {
  const h = await setup(page, { connected: true, unknownWrite: true });
  await h.section("publication");
  await h.workspace.getByRole("button", { name: "Product to publish", exact: true }).click();
  await page.getByRole("option", { name: "synthetic-product", exact: true }).click();
  await h.workspace.getByRole("textbox", { name: "Reason for this change", exact: true }).fill("Isolated interrupted request test");
  await h.workspace.getByRole("button", { name: "Review catalog change", exact: true }).click();
  const review = page.getByRole("dialog", { name: "Review catalog change", exact: true });
  await expect(review.getByRole("button", { name: "Confirm catalog change", exact: true })).toBeDisabled();
  await review.getByRole("radio", { name: "I approve this catalog change", exact: true }).click();
  await review.getByRole("button", { name: "Confirm catalog change", exact: true }).click();
  await expect(review.getByText("Outcome not confirmed", { exact: true })).toBeVisible();
  expect(h.writes).toHaveLength(1);
  const intent = h.writes[0].body;
  expect(intent.manifest_source).toEqual(publicationPreparation().manifest_source);
  await page.keyboard.press("Escape"); await expect(review).toBeVisible();
  await review.getByRole("button", { name: "Check original request", exact: true }).click();
  await expect.poll(() => h.reads.includes(`/api/product-portfolio/publications/${encodeURIComponent(intent.request_id)}`)).toBe(true);
  await expect(review.getByRole("button", { name: "Confirm catalog change", exact: true })).toBeDisabled();
  expect(h.writes).toHaveLength(1); expect(h.errors).toEqual([]);
});

test("earlier journal requests remain inspectable when current owner source is unavailable", async ({ page }) => {
  const h = await setup(page, { connected: true, recoveryOnly: true });
  await h.section("publication");
  await h.workspace.getByRole("button", { name: "Product to publish", exact: true }).click();
  await page.getByRole("option", { name: "synthetic-product", exact: true }).click();
  await expect(h.workspace.getByText(/Earlier request results remain available/)).toBeVisible();
  await expect(h.workspace.getByRole("button", { name: "Review catalog change", exact: true })).toBeDisabled();
  await h.workspace.getByRole("button", { name: /View Add to catalog result from/ }).click();
  await expect.poll(() => h.reads.includes("/api/product-portfolio/publications/product-publication-request%3Aprior")).toBe(true);
  expect(h.writes).toEqual([]); expect(h.errors).toEqual([]);
});
