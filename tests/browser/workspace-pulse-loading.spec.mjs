import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
import { proposalCompletionRecord } from "../support/proposal-completion-fixture.mjs";

const require = createRequire(import.meta.url);
const { workspacePulseFixture } = require("../../src/command-center/fixtures/workspace-pulse.fixture.ts");

const base = process.env.CONSOLE_TEST_BASE_URL ?? "http://127.0.0.1:4317";
if (new URL(base).port === "3317") throw Error("Use an isolated preview for loading tests.");
test.setTimeout(90_000);

function deferred() {
  let release;
  const promise = new Promise(resolve => { release = resolve; });
  return { promise, release };
}

for (const width of [1280, 1700]) test(`Pulse loading preserves known results and original wording at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: width === 1280 ? 800 : 1000 });
  const proposal = deferred(), failedSource = deferred(), rest = deferred();
  const errors = [], writes = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.route("**/api/**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (request.method() !== "GET") {
      writes.push(path);
      return route.fulfill({ status: 503, json: { error: "Writes excluded from loading qualification" } });
    }
    try {
      if (path === "/api/proposals") {
        await proposal.promise;
        return await route.fulfill({ json: { mode: "live", status: "current", error: null,
          observedAt: new Date().toISOString(), records: [proposalCompletionRecord({
            status: "captured", updated_at: new Date().toISOString(),
          })] } });
      }
      await (path === "/api/orchestration" ? failedSource.promise : rest.promise);
      return await route.fulfill({ status: 503, json: { error: "Synthetic owner unavailable" } });
    } catch { /* Browser teardown cancels outstanding read-only requests. */ }
  });
  try {
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => {
      const button = document.querySelector('button[title="Console"]');
      return button && Object.keys(button).some(key => key.startsWith("__reactProps$"));
    });
    const panel = page.locator(".workspace-pulse-panel");
    const cards = panel.locator("[data-pulse-signal]");
    const mood = panel.locator("[data-pulse-mood]");
    await expect(cards).toHaveCount(4);
    await expect(panel.locator('[data-teras-loading-signal]')).toHaveCount(5);
    for (const card of await panel.locator('[data-pulse-signal]:not([data-pulse-signal="source-coverage"])').all()) {
      await expect(card).toHaveAttribute("aria-busy", "true");
      await expect(card.locator("strong")).toHaveText("—");
      await expect(card.locator(".metric-detail")).toHaveText("Reading status…");
    }
    await expect(mood).toHaveAttribute("data-pulse-mood", "loading");
    await expect(mood.locator("strong")).toHaveText("Checking…");
    const motion = await cards.first().locator('[data-teras-loading-signal] i').first()
      .evaluate(node => getComputedStyle(node).animationName);
    expect(motion).not.toBe("none");
    const initialWidths = await cards.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().width));
    await panel.screenshot({ path: test.info().outputPath(`pulse-pending-${width}.png`) });

    proposal.release();
    const decisions = panel.locator('[data-pulse-signal="required-decisions"]');
    await expect(decisions.locator("strong")).toHaveText("1+");
    await expect(decisions).not.toHaveAttribute("aria-busy", "true");
    // Known data keeps the original detail, including its coverage qualification.
    await expect(decisions.locator(".metric-detail")).toContainText("1 projected operator decision needs review.");
    await expect(decisions.locator(".metric-detail")).toContainText("Source coverage");
    await expect(decisions.locator('[data-teras-loading-signal]')).toHaveCount(1);
    await expect(panel.locator('[data-pulse-signal="source-coverage"] strong')).toHaveText("2/9");

    failedSource.release();
    await expect(mood).toHaveAttribute("data-pulse-mood", "unavailable");
    await expect(mood).toContainText("An expected source is unavailable, so the aggregate cannot claim a complete workspace state.");
    await expect(panel.locator('[data-pulse-signal="source-coverage"] .metric-detail')).toHaveText("1 expected source is unavailable.");
    // A failed source is explicit while remaining owner reads continue.
    await expect(panel.locator('[data-teras-loading-signal]')).toHaveCount(4);

    rest.release();
    await expect(panel.locator('[data-teras-loading-signal]')).toHaveCount(0);
    await expect(panel.getByRole("status")).toHaveCount(0);
    await expect(panel.locator('[data-pulse-signal="source-coverage"] .metric-detail')).toHaveText("8 expected sources are unavailable.");
    await expect(decisions.locator("strong")).toHaveText("1+");
    await expect(panel.locator('[data-pulse-signal="active-operations"] .metric-detail')).toContainText("No required action is projected by current sources.");
    for (const [index, card] of (await cards.all()).entries()) {
      expect(await card.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
      expect((await card.boundingBox()).width).toBeCloseTo(initialWidths[index], 0);
    }
    // Inspecting a loaded signal keeps the full original source explanation.
    await decisions.click();
    await expect(decisions).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Back to Command Center", exact: true })).toBeVisible();
    await panel.screenshot({ path: test.info().outputPath(`pulse-settled-${width}.png`) });
    expect(errors).toEqual([]);
    expect(writes).toEqual([]);
  } finally {
    proposal.release(); failedSource.release(); rest.release();
    await page.unrouteAll({ behavior: "wait" });
  }
});

test("Pulse waiting indicators respect reduced motion", async ({ page }) => {
  const gate = deferred();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/**", async route => {
    await gate.promise;
    await route.fulfill({ status: 503, json: { error: "Synthetic owner unavailable" } }).catch(() => {});
  });
  try {
    await page.goto(base, { waitUntil: "domcontentloaded" });
    const panel = page.locator(".workspace-pulse-panel");
    await expect(panel.locator('[data-teras-loading-signal]')).toHaveCount(5);
    for (const bar of await panel.locator('[data-teras-loading-signal] i').all()) {
      expect(await bar.evaluate(node => getComputedStyle(node).animationName)).toBe("none");
    }
    gate.release();
    await expect(panel.locator('[data-teras-loading-signal]')).toHaveCount(0);
  } finally {
    gate.release();
    await page.unrouteAll({ behavior: "wait" });
  }
});

test("Loaded Pulse cards retain every original description", async ({ page }) => {
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/lifecycle-transitions") return route.fulfill({ json: {
      mode: "disconnected-preview", status: "current", observedAt: new Date().toISOString(),
      error: null, transitions: [], truncated: false,
    } });
    return route.fulfill({ status: 503, json: { error: "Unrelated owner excluded" } });
  });
  await page.goto(base + "/?dev=1", { waitUntil: "domcontentloaded" });
  const panel = page.locator(".workspace-pulse-panel");
  for (const signal of workspacePulseFixture.signals) {
    const card = panel.locator(`[data-pulse-signal="${signal.id}"]`);
    await expect(card.locator(".metric-detail")).toHaveText(signal.detail);
    await expect(card.locator("strong")).toHaveText(signal.value);
  }
  await expect(panel.locator("[data-pulse-mood] strong")).toHaveText(workspacePulseFixture.posture.label);
  await expect(panel.getByText(workspacePulseFixture.posture.detail, { exact: true })).toBeVisible();
  await expect(panel.locator('[data-teras-loading-signal]')).toHaveCount(0);
});
