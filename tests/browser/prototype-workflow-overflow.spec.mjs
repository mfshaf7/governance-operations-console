import { test, expect } from "../support/filled-surface-layout.mjs";

const base = process.env.CONSOLE_TEST_BASE_URL ?? "http://127.0.0.1:3320";
test.setTimeout(120_000);
test.use({ viewport: { width: 1700, height: 1000 }, actionTimeout: 15_000, navigationTimeout: 60_000 });

async function examples(page) {
  const writes = [];
  await page.route("**/api/**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (path === "/api/console/capabilities") return route.fulfill({ json: {
      artifactType: "console-runtime-capability-projection", schemaVersion: 1,
      mode: "disconnected-preview", capabilities: [],
    } });
    if (path.startsWith("/api/prototypes/")) {
      // Closure preparation is the existing read-only eligibility query.
      if (!["GET", "HEAD"].includes(request.method()) && path !== "/api/prototypes/closures/preparations") writes.push(path);
      if (path === "/api/prototypes/records") return route.fulfill({ json: {
        mode: "disconnected-preview", projection: null, error: null,
      } });
      const family = path.includes("closures") ? "closure" : path.includes("maturity") ? "maturity" : path.includes("landings") ? "landing" : "preview";
      return route.fulfill({ status: 503, json: {
        code: `prototype_${family}_live_mode_required`,
        error: "Isolated layout example", retryable: false,
      } });
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
      writes.push(path);
      return route.fulfill({ status: 503, json: { error: "No business submissions in layout tests" } });
    }
    return route.continue();
  });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const button = document.querySelector('button[title="Open PROTOTYPE"]');
    const key = button && Object.keys(button).find(key => key.startsWith("__reactProps$"));
    return Boolean(key && button[key].onClick);
  });
  await page.locator('button[title="Open PROTOTYPE"]').click();
  const control = page.getByRole("dialog", { name: "Prototype Control", exact: true });
  await expect(control.locator("tbody tr")).toHaveCount(6);
  return { control, writes };
}

// Scrolling is allowed; hidden overflow that permanently cuts a panel is not.
async function noClippedPanels(dialog) {
  await expect.poll(() => dialog.locator("section,[data-teras-zone]").evaluateAll(nodes =>
    nodes.filter(node => {
      if (!node.getBoundingClientRect().height || node.closest("details:not([open])")) return false;
      const style = getComputedStyle(node);
      return ["hidden", "clip"].includes(style.overflowY) && node.scrollHeight > node.clientHeight + 3;
    }).map(node => node.innerText.slice(0, 80))
  )).toEqual([]);
}

async function reachable(button) {
  await button.scrollIntoViewIfNeeded();
  expect(await button.evaluate(node => {
    const rect = node.getBoundingClientRect();
    for (let parent = node.parentElement; parent; parent = parent.parentElement) {
      if (!parent.closest("dialog")) break;
      const style = getComputedStyle(parent), bounds = parent.getBoundingClientRect();
      if (["auto", "scroll", "hidden", "clip"].includes(style.overflowY) &&
          (rect.top < bounds.top - 2 || rect.bottom > bounds.bottom + 2)) return false;
    }
    return rect.top >= 0 && rect.bottom <= innerHeight;
  })).toBe(true);
}

for (const [record, title, lastChoice] of [
  ["Candidate Promotion Fixture", "Candidate Promotion", "Route to closeout"],
  ["Workspace Governance Operations Console", "Baseline Promotion", "Route closeout"],
  ["Returned Movement Fixture", "Movement Request", null],
]) test(`${title}: compact input and review keep all work and support reachable`, async ({ page }, info) => {
  const h = await examples(page);
  await h.control.locator("tbody tr").filter({ hasText: record }).click();
  await h.control.getByRole("button", { name: `Open ${title}`, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: title, exact: true });
  for (const [width, height] of [[1700, 1000], [1280, 720]]) {
    await page.setViewportSize({ width, height });
    const steps = dialog.locator("[data-teras-progress-step-list] button");
    for (let index = 0; index < await steps.count(); index++) {
      await steps.nth(index).click();
      await noClippedPanels(dialog);
      const support = dialog.getByRole("region", { name: `${title} support`, exact: true });
      await support.focus(); await page.keyboard.press("End");
      await expect.poll(() => support.evaluate(node => node.scrollTop + node.clientHeight >= node.scrollHeight - 2)).toBe(true);
      if (index === 1 && lastChoice) await reachable(dialog.getByRole("radio", { name: lastChoice, exact: true }));
      await reachable(dialog.locator("[data-teras-wizard-footer] button").last());
      await dialog.screenshot({ path: info.outputPath(`${width}-${index}.png`) });
    }
  }
  expect(h.writes).toEqual([]);
});

test("Preview cards retain their contents and actions at compact height", async ({ page }, info) => {
  const h = await examples(page);
  await h.control.locator("tbody tr").filter({ hasText: "Workspace Governance Operations Console" }).click();
  await h.control.getByRole("button", { name: "Open Dashboard", exact: true }).click();
  await page.getByRole("dialog").last().getByRole("button", { name: "Open Preview Runtime", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Preview Runtime", exact: true });
  for (const [width, height] of [[1700, 1000], [1280, 720]]) {
    await page.setViewportSize({ width, height });
    for (const tab of ["Runtime", "Profile", "Evidence"]) {
      await dialog.getByRole("radio", { name: tab, exact: true }).click();
      await noClippedPanels(dialog);
      if (tab === "Profile") await reachable(dialog.getByRole("button", { name: "Edit Profile", exact: true }));
      if (tab === "Evidence") {
        await reachable(dialog.getByRole("button", { name: "Record Preview Check", exact: true }));
        await reachable(dialog.getByRole("button", { name: "Open Evidence Metadata", exact: true }));
      }
      await dialog.screenshot({ path: info.outputPath(`${width}-${tab}.png`) });
    }
  }
  expect(h.writes).toEqual([]);
});
