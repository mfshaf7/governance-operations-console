import { test, expect } from "../support/filled-surface-layout.mjs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { getPrototypeWorkspaceStats } = require("../../src/domain-workspaces/prototype/read-model/selectors/prototype-workspace-selectors.ts");
const { prototypeWorkspaceReadModel } = require("../../src/domain-workspaces/prototype/read-model/prototype-workspace-read-model.ts");

const base = process.env.CONSOLE_TEST_BASE_URL ?? "http://127.0.0.1:3320";
test.setTimeout(120_000);
test.use({ viewport: { width: 1700, height: 1000 }, actionTimeout: 15_000, navigationTimeout: 60_000 });

async function sourceHarness(page) {
  const records = structuredClone(prototypeWorkspaceReadModel.records);
  let revision = 1;
  const writes = [];
  await page.route("**/api/**", async (route) => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (path === "/api/console/capabilities") return route.fulfill({ json: {
      artifactType: "console-runtime-capability-projection", schemaVersion: 1,
      mode: "live", capabilities: [],
    } });
    if (path === "/api/prototypes/records" && new URL(request.url()).searchParams.get("view") === "overview") return route.fulfill({json:{mode:"live",projection:{counts:getPrototypeWorkspaceStats(records),lastRead:new Date().toISOString(),readPath:"compact-owner"}}});
    if (path === "/api/prototypes/records") return route.fulfill({ json: {
      mode: "live", projection: {
        sourceRevision: `test-revision-${revision}`, landing: {}, maturity: {}, closure: {},
        readModel: { ...prototypeWorkspaceReadModel, records,
          source: { ...prototypeWorkspaceReadModel.source, lastRead: new Date().toISOString() } },
      },
    } });
    if (/^\/api\/prototypes\/[^/]+\/preview-runtime$/.test(path) && request.method() === "GET") return route.fulfill({status:503,json:{code:"prototype_preview_live_mode_required",error:"Isolated UI specimen; Preview owner not connected.",retryable:false}});
    // Test responses only; no owner requests or mutations leave this browser.
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
      if (path !== "/api/prototypes/closures/preparations") writes.push(path);
      return route.fulfill({ status: 503, json: { error: "Inspection test: owner unavailable", code: "inspection_test", retryable: false } });
    }
    return route.fallback();
  });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const b = document.querySelector('button[title="Open PROTOTYPE"]');
    const k = b && Object.keys(b).find(k => k.startsWith("__reactProps$"));
    return Boolean(k && b[k].onClick);
  });
  await page.locator('button[title="Open PROTOTYPE"]').click();
  const control = page.getByRole("dialog", { name: "Prototype Control", exact: true });
  await expect(control.locator("tbody tr")).toHaveCount(records.length);
  return { records, writes, control, refresh: async (change) => {
    change?.(records); revision++;
    const response = page.waitForResponse(r => new URL(r.url()).pathname === "/api/prototypes/records");
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await response;
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  } };
}

test("Landing displays its authoritative source home without an ignored destination selector", async ({ page }, info) => {
  const h = await sourceHarness(page);
  await h.control.getByRole("row").filter({ hasText: "Client Review Portal Concept" }).click();
  await h.control.getByRole("button", { name: "Open Landing", exact: true }).click();
  const modal = page.getByRole("dialog", { name: "Prototype Landing", exact: true });
  await modal.getByRole("button", { name: "Next", exact: true }).click();
  await expect(modal.getByRole("region", { name: "Source home", exact: true })).toContainText("Prototype Studio");
  await expect(modal.getByRole("button", { name: "Source home", exact: true })).toHaveCount(0);
  await expect(modal).toContainText("Source stays in Studio during incubation.");
  for (const width of [1700, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    await modal.screenshot({ path: info.outputPath(`landing-source-${width}.png`) });
  }
  expect(h.writes).toEqual([]);
});

for (const [name, action, title] of [
  ["Client Review Portal Concept", "Open Landing", "Prototype Landing"],
  ["Candidate Promotion Fixture", "Open Candidate Promotion", "Candidate Promotion"],
  ["Workspace Governance Operations Console", "Open Baseline Promotion", "Baseline Promotion"],
  ["Movement Request Fixture", "Open Movement Request", "Movement Request"],
]) {
  test(`${title}: refresh preserves draft and step; changed source requires guarded reload`, async ({ page }) => {
    const h = await sourceHarness(page);
    await h.control.getByRole("row").filter({ hasText: name }).click();
    await h.control.getByRole("button", { name: action, exact: true }).click();
    const modal = page.getByRole("dialog", { name: title, exact: true });
    const field = modal.locator('input:not([readonly]):not([disabled]):not([type=radio]):not([type=checkbox]), textarea:not([readonly]):not([disabled])').first();
    await expect(field).toBeEditable();
    const original = await field.inputValue(), edited = original + " / unsaved test";
    await field.fill(edited);
    const steps = modal.locator('[data-teras-progress-step-list] button');
    await steps.last().click();
    await expect(steps.last()).toHaveAttribute("aria-current", "step");
    await expect(steps.last().locator("em")).toHaveText("Current");
    await expect(steps.first().locator("em")).toHaveText("Open");
    await h.refresh(records => { records.find(r => r.name !== name).summary += " unrelated change"; });
    await expect(steps.last()).toHaveAttribute("aria-current", "step");
    await expect(modal.getByText("Source changed", { exact: true })).toHaveCount(0);
    await steps.first().click(); await expect(field).toHaveValue(edited);
    await steps.last().click();
    await h.refresh(records => { const r = records.find(r => r.name === name); r.summary += " updated owner context"; r.projectionVersion += "-new"; });
    await expect(modal.getByText("Source changed", { exact: true })).toBeVisible();
    await expect(steps.last()).toHaveAttribute("aria-current", "step");
    const apply = modal.locator('[data-action]');
    for (const button of await apply.all()) await expect(button).toBeDisabled();
    await modal.getByRole("button", { name: "Load latest source", exact: true }).click();
    const guard = page.getByRole("alertdialog", { name: "Replace this draft?", exact: true });
    await expect(guard).toBeVisible();
    await guard.getByRole("button", { name: "Keep Editing", exact: true }).click();
    await steps.first().click(); await expect(field).toHaveValue(edited);
    await page.keyboard.press("Escape");
    await page.getByRole("alertdialog").getByRole("button", { name: "Keep Editing", exact: true }).click();
    await expect(field).toHaveValue(edited);
    await modal.getByRole("button", { name: "Load latest source", exact: true }).click();
    await guard.getByRole("button", { name: "Discard and reload", exact: true }).click();
    await expect(modal.getByText("Source changed", { exact: true })).toHaveCount(0);
    await steps.first().click(); await expect(field).not.toHaveValue(edited);
    expect(h.writes).toEqual([]);
  });
}

test("Dashboard reads preview status without visiting Preview Runtime; unavailable owner is explicit", async ({ page }) => {
  const h = await sourceHarness(page);
  const record = h.records.find(r => r.name === "Client Review Portal Concept");
  record.preview.profileState = "no-profile";
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  let fail = false, reads = 0;
  await page.route("**/api/prototypes/*/preview-runtime", async route => {
    reads++;
    await pending;
    if (fail) return route.fulfill({ status: 503, json: { code: "owner_unavailable", error: "Owner unavailable", retryable: true } });
    return route.fulfill({ json: {
      schema_version: 1, profile_id: "inspection-preview", prototype_id: record.id,
      profile_digest: "sha256:" + "a".repeat(64), source_revision: "b".repeat(40),
      runtime_state: "stopped", endpoint: null, latest_receipt: null,
    } });
  });
  await h.control.getByRole("row").filter({ hasText: record.name }).click();
  await h.control.locator('[data-prototype-open-dashboard-action="true"]').click();
  const dashboard = page.getByRole("dialog", { name: "Prototype Dashboard", exact: true });
  const previewCard = dashboard.locator('[data-prototype-stage="preview"]');
  await expect(previewCard).toContainText("Checking");
  release();
  await expect(previewCard).toContainText("Not started");
  expect(reads).toBe(1);
  await expect(dashboard.locator("h3").filter({ hasText: "preview-runtime://" })).toHaveCount(0);
  await dashboard.getByRole("button", { name: "Open Preview Runtime", exact: true }).click();
  const runtime = page.getByRole("dialog", { name: "Preview Runtime", exact: true });
  await runtime.getByRole("radio", { name: "Profile", exact: true }).click();
  await expect(runtime.getByText("Preview profile", { exact: true })).toBeVisible();
  await runtime.getByText("Technical details", { exact: true }).click();
  await expect(runtime.locator("details[open]").getByText("preview-runtime://profiles/inspection-preview@sha256:" + "a".repeat(64), { exact: true })).toBeVisible();
  await runtime.getByRole("button", { name: "Back to Dashboard", exact: true }).click();
  await expect(previewCard).toContainText("Not started");
  await page.keyboard.press("Escape");
  fail = true;
  await h.control.locator('[data-prototype-open-dashboard-action="true"]').click();
  await expect(previewCard).toContainText("Unavailable");
  await dashboard.getByRole("button", { name: "Open Preview Runtime", exact: true }).click();
  await expect(runtime.getByText("Owner unavailable", { exact: true })).toBeVisible();
  await expect(runtime.getByRole("button", { name: /Start Preview|Edit Profile/ })).toHaveCount(0);
  expect(h.writes).toEqual([]);
});

test("Dashboard operations layout keeps stages, issues and last actions readable", async ({ page }) => {
  const h = await sourceHarness(page);
  await h.control.locator("tbody tr").first().click();
  await h.control.locator('[data-prototype-open-dashboard-action="true"]').click();
  const dashboard = page.getByRole("dialog", { name: "Prototype Dashboard", exact: true });
  const content = dashboard.getByRole("region", { name: "Prototype dashboard content", exact: true });
  const stages = dashboard.locator("[data-prototype-stage]");
  async function contained(region, target) {
    await expect.poll(async () => {
      const a = await region.boundingBox(), b = await target.boundingBox();
      return b.y >= a.y - 1 && b.y + b.height <= a.y + a.height + 1;
    }).toBe(true);
  }
  for (const [width, height] of [[1700, 1000], [1440, 900], [1440, 800], [1280, 720], [1200, 800], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    await expect(content).toHaveCSS("overflow-y", "auto");
    await expect(stages).toHaveCount(4);
    await expect.poll(() => content.evaluate(n => n.scrollWidth - n.clientWidth)).toBeLessThanOrEqual(1);
    await expect.poll(() => content.getByRole("table").evaluate(n => n.parentElement.scrollWidth - n.parentElement.clientWidth)).toBeLessThanOrEqual(1);
    const tops = await stages.evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().top));
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(1);
    await content.focus(); await page.keyboard.press("Home");
    const nextAction = content.getByRole("button", { name: "Open Baseline Promotion", exact: true });
    await contained(content, nextAction);
    await nextAction.click();
    const baseline = page.getByRole("dialog", { name: "Baseline Promotion", exact: true });
    await expect(baseline).toBeVisible();
    await baseline.getByRole("button", { name: "Back to Dashboard", exact: true }).click();
    await expect(dashboard).toBeVisible();
    await content.hover(); await page.mouse.wheel(0, 3000);
    const closure = content.getByRole("button", { name: "Open Closure", exact: true });
    await contained(content, closure);
    await closure.click();
    const closureDialog = page.getByRole("dialog", { name: "Prototype Closure", exact: true });
    await expect(closureDialog).toBeVisible();
    await closureDialog.getByRole("button", { name: "Back to Dashboard", exact: true }).click();
    await expect(dashboard).toBeVisible();
    await expect(dashboard.locator('[data-prototype-stage="preview"]')).not.toContainText("Checking");
    // Exercise the region's actual scroll input after the returned dialog is
    // visible; native End-key targeting is browser-dependent across dialogs.
    await content.hover(); await page.mouse.wheel(0, 3000);
    const movement = content.getByRole("button", { name: "Open Movement Request status detail", exact: true });
    await contained(content, movement);
    await movement.click();
    await expect(page.getByRole("dialog", { name: "Movement Request", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    expect(await dashboard.evaluate(n => n.scrollHeight - n.clientHeight)).toBeLessThanOrEqual(1);
  }
  const fullContext = "Long synthetic inspection context. ".repeat(80) + "End of original context.";
  await page.setViewportSize({ width: 1280, height: 720 });
  await h.refresh(records => {
    const issue = records[0].openIssues[0];
    records[0].openIssues = Array.from({ length: 20 }, (_, i) => ({ ...issue, id: `inspection-issue-${i}`, title: `Inspection issue ${i + 1}` }));
    records[0].summary = fullContext;
  });
  const issueRows = content.getByRole("table").locator("tbody tr");
  await expect(issueRows).toHaveCount(20);
  const issueScroll = content.getByRole("table").locator("..");
  await issueScroll.hover(); await page.mouse.wheel(0, 4000);
  await contained(issueScroll, issueRows.last());
  await dashboard.getByRole("button", { name: "Full context", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Source Context", exact: true }).getByText(fullContext, { exact: true })).toHaveCount(1);
  await page.keyboard.press("Escape");
  expect(h.writes).toEqual([]);
});

test("retired Dashboard retains historical inspection and omits source authoring", async ({ page }) => {
  const h = await sourceHarness(page);
  const retired = h.records.find(record => record.lifecycle === "retired");
  await h.control.getByRole("row").filter({ hasText: retired.name }).click();
  await h.control.locator('[data-prototype-open-dashboard-action="true"]').click();
  const dashboard = page.getByRole("dialog", { name: "Prototype Dashboard", exact: true });
  await expect(dashboard.locator('[data-prototype-stage="baseline"]')).toContainText("Historical approval");
  await expect(dashboard.locator('[data-prototype-stage="handoff"]')).toContainText("Handoff history");
  await expect(dashboard.getByRole("button", { name: "Open Source Authoring", exact: true })).toHaveCount(0);
  await expect(dashboard.getByRole("button", { name: "Open Closure", exact: true })).toHaveCount(0);
  await dashboard.getByRole("button", { name: "View History", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Prototype History", exact: true })).toBeVisible();
  expect(h.writes).toEqual([]);
});

test("Prototype summary keeps the complete overview when the register search is empty",async({page})=>{
 const h=await sourceHarness(page),metrics=h.control.locator('[data-teras-record-control-summary-panel] [data-teras-summary-value]');
 await expect.poll(()=>metrics.first().textContent()).not.toBe("—");const initial=await metrics.allTextContents();
 await expect(h.control.getByRole("columnheader")).toHaveText(["No.","Prototype","Source","Status","Inspect"]);
 await h.control.getByRole("searchbox",{name:"Search prototype records",exact:true}).fill("no-matching-prototype-test");
 await expect(h.control.locator("tbody tr")).toHaveCount(0);await expect(metrics).toHaveText(initial);
 expect(h.writes).toEqual([]);
});
