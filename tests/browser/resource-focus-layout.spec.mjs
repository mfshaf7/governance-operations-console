import { expect, test } from "@playwright/test";

const base = process.env.CONSOLE_TEST_BASE_URL ?? "http://127.0.0.1:3320";
test.use({ viewport: { width: 1920, height: 1000 } });
test.setTimeout(120000);

test("all resource focus panels fill their slot and connect only in the lateral layout", async ({ page }) => {
  const writes = [];
  await page.route("**/api/**", route => {
    if (["GET", "HEAD", "OPTIONS"].includes(route.request().method())) return route.continue();
    writes.push(route.request().url());
    return route.abort();
  });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const node = document.querySelector('button[title="Open MODEL"]');
    const key = node && Object.keys(node).find(key => key.startsWith("__reactProps$"));
    return Boolean(key && node[key].onClick);
  }, null, { timeout: 60000 });
  const cards = page.locator(".wsl-resource-card");
  await expect(cards).toHaveCount(6);
  const labels = ["CPU", "RAM", "VMEM", "Disk", "Bandwidth", "Uptime"];
  for (const width of [1200, 1440, 1700, 1920, 2560]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const label of labels) {
      const card = cards.filter({ has: page.getByText(label, { exact: true }) });
      await card.click();
      await expect(card).toHaveAttribute("aria-pressed", "true");
      const panel = page.locator(".resource-focus-panel");
      await expect(panel.getByRole("heading", { name: label, exact: true })).toBeVisible();
      const bounds = await panel.evaluate(node => {
        const rect = element => {
          const box = element.getBoundingClientRect();
          return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width };
        };
        const bridge = document.querySelector(".resource-side-bridge");
        return {
          panel: rect(node), anchor: rect(node.parentElement),
          bridge: { ...rect(bridge), display: getComputedStyle(bridge).display },
          card: rect(document.querySelector(".wsl-resource-card-active")),
          overflows: [...node.querySelectorAll("*")].filter(element => element.clientWidth && element.scrollWidth > element.clientWidth + 2).map(element => element.className),
        };
      });
      expect(Math.abs(bounds.panel.width - bounds.anchor.width), `${width} ${label} fills slot`).toBeLessThanOrEqual(1);
      expect(bounds.overflows, `${width} ${label} text containment`).toEqual([]);
      if (width < 2560) {
        expect(bounds.bridge.display).toBe("none");
      } else {
        expect(bounds.bridge.display).toBe("block");
        expect(bounds.bridge.left).toBeLessThanOrEqual(bounds.panel.right + 2);
        expect(bounds.bridge.right).toBeGreaterThanOrEqual(bounds.card.left);
        expect(bounds.bridge.top).toBeGreaterThanOrEqual(bounds.panel.top);
        expect(bounds.bridge.bottom).toBeLessThanOrEqual(bounds.panel.bottom);
      }
    }
    await cards.last().click();
    await expect(page.getByRole("region", { name: "Operator priority", exact: true })).toBeVisible();
  }
  expect(writes).toEqual([]);
});
