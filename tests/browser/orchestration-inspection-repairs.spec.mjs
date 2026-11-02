import { test, expect } from "../support/filled-surface-layout.mjs";
import { ownerWorkspace, retainedRun } from "../support/orchestration-ui-fixture.mjs";
const base = process.env.CONSOLE_TEST_BASE_URL ?? "http://127.0.0.1:3320";
test.setTimeout(120000);
test.use({ actionTimeout: 15000, navigationTimeout: 60000 });

async function setup(page, source = null) {
  const writes = [], errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  let projection = source;
  await page.route("**/api/**", route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) { writes.push(path); return route.abort(); }
    if (path === "/api/orchestration") return projection?.error
      ? route.fulfill({ status: 503, json: projection })
      : route.fulfill({ json: projection ?? { mode: "disconnected-preview", observedAt: new Date().toISOString() } });
    if (path.startsWith("/api/orchestration/runs/")) return route.fulfill({ json: retainedRun() });
    if (path.startsWith("/api/saved-work/")) return route.fulfill({ json: { mode: "disconnected-preview" } });
    return route.continue();
  });
  await page.goto(`${base}/?dev=1`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => { const b = document.querySelector('button[title="Open ORCHESTRATION"]'), k = b && Object.keys(b).find(key => key.startsWith("__reactProps$")); return Boolean(k && b[k].onClick); }, null, { timeout: 60000 });
  await page.locator('button[title="Open ORCHESTRATION"]').click();
  const workspace = page.getByRole("dialog", { name: "Orchestration Workspace", exact: true });
  await expect(workspace.getByRole("heading", { name: source ? "Services connected" : "Design preview", exact: true })).toBeVisible();
  return { workspace, writes, errors, setSource: value => { projection = value; }, section: id => workspace.locator(`[data-orchestration-workspace-section="${id}"]`).click() };
}

for (const width of [1700, 1280]) {
  test(`Home queue fills remaining space and retains clicked run at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1280 ? 800 : 1000 });
    const h = await setup(page);
    const geometry = await h.workspace.getByRole("heading", { name: "Needs attention", exact: true }).evaluate(heading => {
      const panel = heading.closest("section"), list = panel.querySelector("[data-teras-list]");
      const p = panel.getBoundingClientRect(), l = list.getBoundingClientRect();
      return { height: l.height, gap: p.bottom - l.bottom, overflow: getComputedStyle(list).overflowY };
    });
    expect(geometry.height).toBeGreaterThan(width === 1700 ? 300 : 70);
    expect(geometry.gap).toBeLessThan(24);
    expect(geometry.overflow).toBe("auto");
    await h.workspace.getByRole("button", { name: /^Open Runs:.*Run \/ Failed$/ }).click();
    const selected = h.workspace.locator("[data-orchestration-selected-run]");
    await expect(selected).toContainText("Failed");
    await expect(selected.locator("details")).toContainText("scenario-run-failed");
    const widths = await h.workspace.locator("tbody tr").first().locator("td").evaluateAll(cells => cells.map(cell => cell.getBoundingClientRect().width));
    expect(widths.every(value => value > 70)).toBe(true);
    expect(await h.workspace.locator("tbody tr").first().evaluate(row => row.getBoundingClientRect().height)).toBeLessThan(150);
    expect(h.writes).toEqual([]); expect(h.errors).toEqual([]);
  });

  test(`Definition inspection is reachable by mouse scrolling at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1280 ? 800 : 1000 });
    const h = await setup(page, ownerWorkspace());
    await h.section("definitions"); await h.workspace.getByRole("button", { name: "Open Definition", exact: true }).click();
    const dashboard = page.getByRole("dialog", { name: "Definition Dashboard", exact: true });
    const zone = dashboard.locator('[data-teras-zone="true"]').last();
    const box = await zone.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.wheel(0, 3000);
    const history = dashboard.getByRole("button", { name: "Open Version History", exact: true });
    await expect(history).toBeInViewport();
    await history.click();
    await expect(page.getByRole("dialog", { name: "Definition Version History", exact: true })).toContainText("Recording time not supplied");
    expect(h.writes).toEqual([]); expect(h.errors).toEqual([]);
  });
}

test("Empty owner catalog still offers draft design with an explicit endpoint", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const h = await setup(page, ownerWorkspace({ empty: true }));
  await h.section("definitions");
  await expect(h.workspace).toContainText("does not deploy a workflow or submit Delivery work");
  await h.workspace.getByRole("button", { name: "Design Orchestration", exact: true }).click();
  const draft = page.getByRole("dialog", { name: "Design Orchestration", exact: true });
  await expect(draft).toBeVisible();
  for (const width of [1280, 1700]) {
    await page.setViewportSize({ width, height: width === 1280 ? 800 : 1000 });
    const checks = await draft.getByRole("heading", { name: "Boundary readiness", exact: true }).evaluate(h => {
      const panel = h.closest("section"), list = panel.querySelector("[data-teras-list]");
      return { panelOverflow: panel.scrollHeight - panel.clientHeight, listOverflow: list.scrollHeight - list.clientHeight, bottom: panel.getBoundingClientRect().bottom, viewport: innerHeight };
    });
    expect(checks.panelOverflow).toBeLessThan(3); expect(checks.listOverflow).toBeLessThan(3);
    expect(checks.bottom).toBeLessThan(checks.viewport);
  }
  expect(h.writes).toEqual([]); expect(h.errors).toEqual([]);
});

test("Run-control close protects the entered reason without submitting a command", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const h = await setup(page);
  await h.workspace.getByRole("button", { name: /^Open Runs:.*Run \/ Failed$/ }).click();
  await h.workspace.getByRole("button", { name: "Open Run Dashboard", exact: true }).click();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  const control = page.getByRole("dialog", { name: "Run Control", exact: true });
  await control.getByRole("textbox", { name: "Retry reason", exact: true }).fill("Retain this reason while inspecting.");
  await control.getByRole("button", { name: "Back", exact: true }).click();
  const guard = page.getByRole("alertdialog", { name: "Discard this control draft?", exact: true });
  await guard.getByRole("button", { name: "Keep Editing", exact: true }).click();
  await expect(control.getByRole("textbox", { name: "Retry reason", exact: true })).toHaveValue("Retain this reason while inspecting.");
  expect(h.writes).toEqual([]); expect(h.errors).toEqual([]);
});

test("Recovery picker reads the retained identity and exposes owner control history", async ({ page }) => {
  await page.setViewportSize({ width: 1700, height: 1000 });
  const h = await setup(page, ownerWorkspace());
  await h.workspace.getByRole("button", { name: "Read original run", exact: true }).click();
  const recovery = page.getByRole("dialog", { name: "Recover original run", exact: true });
  await recovery.getByLabel("Choose a retained run", { exact: true }).click();
  await page.getByRole("option").filter({ hasText: "Validation readiness run" }).click();
  await expect(recovery.getByLabel("Original run reference", { exact: true })).toHaveValue("run:synthetic");
  await recovery.getByRole("button", { name: "Read original run", exact: true }).click();
  await expect(recovery).toContainText("Owner state");
  await recovery.getByRole("button", { name: "View Run", exact: true }).click();
  await h.workspace.getByRole("button", { name: "Open Run Dashboard", exact: true }).click();
  await page.getByRole("button", { name: "Open Receipts", exact: true }).click();
  const evidence = page.getByRole("dialog", { name: "Run Evidence", exact: true });
  await expect(evidence).toContainText("Resume recorded");
  await expect(evidence).not.toContainText("Local Control Receipts");
  expect(h.writes).toEqual([]); expect(h.errors).toEqual([]);
});

test("Lost owner truth retains records and disables starting without sample fallback", async ({ page }) => {
  await page.setViewportSize({ width: 1700, height: 1000 });
  const h = await setup(page, ownerWorkspace());
  h.setSource({ error: "Owner is unavailable", mode: "live", status: "offline" });
  await h.workspace.getByRole("button", { name: "Refresh status", exact: true }).click();
  await expect(h.workspace.getByRole("heading", { name: "OOS orchestration truth is unavailable", exact: true })).toBeVisible();
  await h.section("definitions");
  await expect(h.workspace.locator("tbody tr")).toHaveCount(1);
  await h.workspace.getByRole("button", { name: "Open Definition", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start Run", exact: true })).toBeDisabled();
  expect(h.writes).toEqual([]); expect(h.errors).toEqual([]);
});

async function expectInteractionInsideClip(target) {
  await expect.poll(() => target.evaluate(element => {
    const r = element.getBoundingClientRect();
    for (let p = element.parentElement; p; p = p.parentElement) {
      const s = getComputedStyle(p), b = p.getBoundingClientRect();
      const top = b.top + p.clientTop, left = b.left + p.clientLeft;
      if (["auto", "scroll", "hidden", "clip"].includes(s.overflowY)
        && (r.top < top - .5 || r.bottom > top + p.clientHeight + .5)) return false;
      if (["auto", "scroll", "hidden", "clip"].includes(s.overflowX)
        && (r.left < left - .5 || r.right > left + p.clientWidth + .5)) return false;
    }
    return true;
  })).toBe(true);
}

for (const width of [1700, 1280]) {
  test(`Run actions have breathing room and edge rows retain hover/focus at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1280 ? 800 : 1000 });
    const h = await setup(page);
    await h.section("runs");
    await h.workspace.getByRole("button", { name: "Open", exact: true }).nth(1).click();
    const dashboard = page.getByRole("dialog", { name: "Run Dashboard", exact: true });
    const gaps = await dashboard.getByRole("button", { name: "Cancel", exact: true }).evaluate(button => {
      const row = button.closest("[data-teras-action-row]"), before = row.previousElementSibling;
      const buttons = row.querySelectorAll("button");
      return { vertical: row.getBoundingClientRect().top - before.getBoundingClientRect().bottom,
        horizontal: buttons[1].getBoundingClientRect().left - buttons[0].getBoundingClientRect().right };
    });
    expect(gaps.vertical).toBeGreaterThanOrEqual(10);
    expect(gaps.horizontal).toBeGreaterThanOrEqual(6);
    for (const name of ["Inspect Acquire source and target locks", "Inspect Verify landing outputs", "Open Artifacts", "Open Runtime Diagnostics"]) {
      const button = dashboard.getByRole("button", { name, exact: true });
      await button.hover();
      await expect(button).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, -1)");
      await expectInteractionInsideClip(button);
      await page.keyboard.press("Tab"); await button.focus();
      await expect(button).toBeFocused();
      await expect.poll(() => button.evaluate(element => element.matches(":focus-visible"))).toBe(true);
      await expect(button).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, -1)");
      await expectInteractionInsideClip(button);
    }
    expect(h.writes).toEqual([]); expect(h.errors).toEqual([]);
  });
}
