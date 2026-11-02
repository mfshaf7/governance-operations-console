import { test, expect } from "@playwright/test";

const base = process.env.CONSOLE_TEST_BASE_URL ?? "http://127.0.0.1:4317";
if (new URL(base).port === "3317") throw Error("Use the isolated preview for layout qualification.");
test.setTimeout(60_000);
test.use({ navigationTimeout: 45_000, actionTimeout: 10_000 });

for (const width of [1280, 1700]) for (const outcome of ["ready", "error"]) {
  test(`Model content keeps its full size from first paint: ${width} / ${outcome}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1280 ? 800 : 1000 });
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    const errors = [], writes = [];
    page.on("pageerror", error => errors.push(String(error)));
    await page.route("**/api/**", async route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
        writes.push(path);
        return route.fulfill({ status: 503, json: { error: "Layout qualification excludes writes." } });
      }
      if (path === "/api/model-operations") {
        const response = outcome === "ready" ? route.fetch() : null;
        await gate;
        if (outcome === "error") return route.fulfill({ status: 503, json: { error: "Synthetic model source unavailable" } });
        return route.fulfill({ response: await response });
      }
      return route.continue();
    });
    await page.addInitScript(() => {
      window.__modelGeometry = [];
      window.__watchModelGeometry = true;
      function record() {
        const modal = document.querySelector('[data-teras-modal="model-operations-control"]');
        const stack = modal?.querySelector('[data-teras-field-stack="true"]');
        const body = modal?.querySelector(":scope > div");
        if (modal?.closest("dialog")?.open && stack && body) {
          const rect = stack.getBoundingClientRect(), style = getComputedStyle(body);
          window.__modelGeometry.push({ width: rect.width, height: rect.height,
            availableWidth: body.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
            availableHeight: body.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom),
            modalWidth: modal.getBoundingClientRect().width,
          });
        }
        if (window.__watchModelGeometry) requestAnimationFrame(record);
      }
      requestAnimationFrame(record);
    });
    try {
      await page.goto(base + "/?dev=1", { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => {
        const button = document.querySelector('button[title="Open MODEL"]');
        return button && Object.keys(button).some(key => key.startsWith("__reactProps$"));
      });
      await page.locator('button[title="Open MODEL"]').click();
      const control = page.getByRole("dialog", { name: "Model Operations Control", exact: true });
      const loading = control.getByRole("status").filter({ hasText: "Loading purpose profiles" });
      await expect(loading).toBeVisible();
      await expect.poll(() => page.evaluate(() => window.__modelGeometry.length)).toBeGreaterThan(0);
      await control.screenshot({ path: test.info().outputPath("model-loading.png") });
      release();
      await expect(loading).toHaveCount(0, { timeout: 30_000 });
      await control.getByRole("radio", { name: "Models & routing", exact: true }).click();
      await expect(control.getByRole("heading", { name: "Choose models by workflow", exact: true })).toBeVisible();
      await control.getByRole("radio", { name: "Purpose profiles", exact: true }).click();
      await expect(control.getByRole("heading", { name: "Governed profile register", exact: true })).toBeVisible();
      await control.screenshot({ path: test.info().outputPath("model-settled.png") });
      const frames = await page.evaluate(() => { window.__watchModelGeometry = false; return window.__modelGeometry; });
      await test.info().attach("model-geometry", { body: JSON.stringify(frames, null, 2), contentType: "application/json" });
      expect(frames.length).toBeGreaterThan(2);
      for (const frame of frames) {
        expect(Math.abs(frame.width - frame.availableWidth), JSON.stringify(frame)).toBeLessThanOrEqual(1);
        expect(Math.abs(frame.height - frame.availableHeight), JSON.stringify(frame)).toBeLessThanOrEqual(1);
        expect(Math.abs(frame.modalWidth - frames[0].modalWidth)).toBeLessThanOrEqual(1);
      }
      expect(errors).toEqual([]);
      expect(writes).toEqual([]);
    } finally { release(); }
  });
}
