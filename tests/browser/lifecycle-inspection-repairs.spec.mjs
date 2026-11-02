import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { lifecycleTransitionProjectionFixtures } = require("../../src/lifecycle-transitions/fixtures/lifecycle-transition-projections.fixture.ts");
const { prototypeWorkspaceReadModel } = require("../../src/domain-workspaces/prototype/read-model/prototype-workspace-read-model.ts");
const base = process.env.CONSOLE_TEST_BASE_URL ?? "http://127.0.0.1:3320";
test.setTimeout(90000);
test.use({ actionTimeout: 10000, navigationTimeout: 60000 });

function prototypeProjection(records = [], nativeLifecycleOutcomes = []) {
  return { mode: "live", error: null, projection: {
    sourceRevision: "synthetic-inspection-v1", landing: {}, maturity: {}, closure: {}, nativeLifecycleOutcomes,
    readModel: { ...prototypeWorkspaceReadModel, records, source: { ...prototypeWorkspaceReadModel.source, lastRead: new Date().toISOString() } },
  } };
}

async function setup(page, { transitions = lifecycleTransitionProjectionFixtures, records = [], nativeOutcomes = [] } = {}) {
  let journalFailure = false;
  const writes = [], errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.route("**/api/**", route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
      // Dashboard preparation is a separate computation; never reach a real owner.
      if (path !== "/api/prototypes/closures/preparations") writes.push(path);
      return route.fulfill({ status: 503, json: { error: "Inspection: owner unavailable", code: "inspection_test", retryable: false } });
    }
    if (path === "/api/console/capabilities") return route.fulfill({ json: {
      artifactType: "console-runtime-capability-projection", schemaVersion: 1, mode: "live", capabilities: [],
    } });
    if (path === "/api/lifecycle-transitions") return journalFailure ? route.abort("failed") : route.fulfill({ json: {
      mode: "live", status: "current", error: null, observedAt: new Date().toISOString(), truncated: false, transitions,
    } });
    if (path === "/api/proposals") return route.fulfill({ json: { mode: "live", status: "current", records: [] } });
    if (path === "/api/prototypes/records") return route.fulfill({ json: prototypeProjection(records, nativeOutcomes) });
    return route.continue();
  });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const b = document.querySelector('button[title="Lifecycle Transitions"]');
    const k = b && Object.keys(b).find(key => key.startsWith("__reactProps$"));
    return Boolean(k && b[k].onClick);
  });
  await page.locator('button[title="Lifecycle Transitions"]').click();
  const workspace = page.getByRole("dialog", { name: "Lifecycle Transitions", exact: true });
  await expect(workspace.locator("[data-teras-fullscreen-surface-frame] > div").first().getByText("Current", { exact: true })).toBeVisible();
  return { workspace, writes, errors, failJournal: value => { journalFailure = value; } };
}

async function expectUnclipped(locator) {
  await expect.poll(() => locator.evaluate(element => {
    const rect = element.getBoundingClientRect();
    if (!rect.height || !rect.width) return false;
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent), box = parent.getBoundingClientRect();
      const top = box.top + parent.clientTop, left = box.left + parent.clientLeft;
      if (["auto", "scroll", "hidden", "clip"].includes(style.overflowY) &&
        (rect.top < top - 1 || rect.bottom > top + parent.clientHeight + 1)) return false;
      if (["auto", "scroll", "hidden", "clip"].includes(style.overflowX) &&
        (rect.left < left - 1 || rect.right > left + parent.clientWidth + 1)) return false;
    }
    return true;
  })).toBe(true);
}

for (const width of [1280, 1700]) {
  test(`All routes retain readable tables, search and keyboard selection at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1280 ? 800 : 1000 });
    const h = await setup(page), nav = h.workspace.getByRole("navigation", { name: "Lifecycle transition routes" });
    for (const route of ["Proposal → Prototype", "Proposal → Delivery", "Prototype → Delivery"]) {
      const entry = nav.getByRole("button", { name: route, exact: true });
      await entry.click();
      expect(await entry.locator("strong").evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThan(2);
      const rows = h.workspace.locator("tbody tr");
      await expect(rows.first()).toBeVisible(); await rows.last().focus(); await page.keyboard.press("Enter");
      await expect(rows.last()).toHaveAttribute("aria-selected", "true");
      const geometry = await h.workspace.locator("table").evaluate(table => ({
        overflow: table.parentElement.scrollWidth - table.parentElement.clientWidth,
        header: table.querySelector("thead").getBoundingClientRect().height,
        rows: [...table.querySelectorAll("tbody tr")].map(row => row.getBoundingClientRect().height),
      }));
      expect(geometry.overflow).toBeLessThan(3); expect(geometry.header).toBeLessThan(70);
      expect(geometry.rows.every(height => height < 125)).toBe(true);
      const search = h.workspace.getByRole("searchbox", { name: "Search lifecycle transitions" });
      await search.fill("NoMatchingTransitionScenario");
      await expect(h.workspace.getByText("No transition matches the current search and filter.")).toBeVisible();
      await search.clear();
    }
    expect(h.writes).toEqual([]); expect(h.errors).toEqual([]);
  });

  test(`History and every evidence reference are reachable with native scrolling at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1280 ? 800 : 1000 });
    const transitions = structuredClone(lifecycleTransitionProjectionFixtures);
    for (const transition of transitions) for (const event of transition.history) event.evidenceRefs = ["oos://receipts/synthetic-first", "wgcf://validation/synthetic-second"];
    const h = await setup(page, { transitions });
    const side = h.workspace.locator("[data-teras-record-control-layout] aside");
    const scroll = side.locator('[data-teras-panel-stack][data-scroll="true"]');
    const box = await scroll.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.wheel(0, 5000);
    const details = side.locator("details").last(); await details.locator("summary").click();
    await expect(details).toContainText("Original description");
    const event = side.locator("[data-teras-timeline] li").last();
    await event.scrollIntoViewIfNeeded(); await event.locator("summary").click();
    await expect(event).toContainText("oos://receipts/synthetic-first");
    await expect(event).toContainText("wgcf://validation/synthetic-second");
    await event.scrollIntoViewIfNeeded(); await expectUnclipped(event);
    expect(h.writes).toEqual([]); expect(h.errors).toEqual([]);
  });
}

test("Journal transport loss becomes partial coverage and recovers without sample substitution", async ({ page }) => {
  await page.clock.install();
  const nativeOutcomes = [{
    id: "native:synthetic-retained", routeId: "prototype-to-delivery", sourceId: "prototype-synthetic", sourceVersion: "synthetic:v1",
    title: "Retained native handoff", owner: "workspace-prototype-studio", sourceRef: "record://prototypes/synthetic",
    targetRef: "openproject://work_packages/99", receiptRef: "receipt://synthetic/native", recordedAt: new Date().toISOString(),
    observationKind: "owner-confirmation", evidenceRefs: ["receipt://synthetic/native"], detail: "Synthetic retained owner confirmation.",
  }];
  const h = await setup(page, { nativeOutcomes });
  h.failJournal(true); await page.clock.fastForward(16000);
  await expect(h.workspace.locator("[data-teras-fullscreen-surface-frame] > div").first().getByText("Partial", { exact: true })).toBeVisible();
  await expect(h.workspace.locator("tbody tr")).toHaveCount(0);
  await expect(h.workspace.getByText("Preview", { exact: true })).toHaveCount(0);
  h.failJournal(false); await page.clock.fastForward(16000);
  await expect(h.workspace.locator("[data-teras-fullscreen-surface-frame] > div").first().getByText("Current", { exact: true })).toBeVisible();
  await expect(h.workspace.locator("tbody tr").first()).toBeVisible();
  expect(h.writes).toEqual([]); expect(h.errors).toEqual([]);
});

for (const state of ["cancelled", "superseded"]) {
  test(`${state} never implies an applied target or exposes an owner action`, async ({ page }) => {
    const transition = structuredClone(lifecycleTransitionProjectionFixtures[0]);
    transition.state = state; transition.nextAction = null;
    const h = await setup(page, { transitions: [transition] });
    const selected = h.workspace.locator("[data-teras-record-control-layout] aside");
    await expect(selected.getByText("Transition outcome", { exact: true })).toBeVisible();
    await expect(selected.getByText("Applied target", { exact: true })).toHaveCount(0);
    await expect(selected.getByRole("button", { name: /^Open / })).toHaveCount(0);
    expect(h.writes).toEqual([]); expect(h.errors).toEqual([]);
  });
}

for (const missing of [false, true]) {
  test(`Prototype handoff ${missing ? "rejects unknown identity without fallback" : "resolves a retained capture to its exact current record"}`, async ({ page }) => {
    const other = { ...structuredClone(prototypeWorkspaceReadModel.records[0]), id: "prototype-unrelated", name: "Unrelated prototype", sourceRef: "record://prototypes/unrelated", linkedRecords: [] };
    const target = { ...structuredClone(other), id: "prototype-scenario-retained", name: "Retained prototype sample", sourceRef: "record://prototypes/scenario-retained" };
    const transition = structuredClone(lifecycleTransitionProjectionFixtures.find(record => record.route.routeId === "proposal-to-prototype" && record.state === "applied"));
    transition.application.targetRecordRef = `record://prototype-captures/${missing ? "missing" : "scenario-retained"}`;
    const h = await setup(page, { transitions: [transition], records: [other, target] });
    await h.workspace.getByRole("button", { name: "Open Prototype", exact: true }).click();
    const control = page.getByRole("dialog", { name: "Prototype Control", exact: true });
    if (missing) {
      await expect(control).toContainText("The requested Prototype is not present in current owner records.");
      await expect(control.getByRole("button", { name: "Open Landing", exact: true })).toHaveCount(0);
      await expect(control.getByText("Unrelated prototype", { exact: true })).toHaveCount(0);
    } else {
      const dashboard = page.getByRole("dialog", { name: "Prototype Dashboard", exact: true });
      await expect(dashboard.getByRole("heading", { name: "Retained prototype sample", exact: true })).toBeVisible();
      await expect(dashboard.getByRole("heading", { name: "Unrelated prototype", exact: true })).toHaveCount(0);
    }
    expect(h.writes).toEqual([]); expect(h.errors).toEqual([]);
  });
}
