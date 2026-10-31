import { expect, test } from "@playwright/test";

const base = process.env.CONSOLE_TEST_BASE_URL ?? "http://127.0.0.1:3320";
test.use({ viewport: { width: 1700, height: 1000 } });
test.setTimeout(90000);

test("priority move fits its card and technical facts stay inspectable at supported widths", async ({ page }) => {
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

  const priority = page.getByRole("region", { name: "Selected priority", exact: true });
  const move = priority.getByRole("group", { name: "Required move", exact: true });
  const details = priority.locator("details");
  const queue = page.getByRole("region", { name: "Operator priority", exact: true }).locator('[class*="queueViewport"]');
  await expect(move).toBeVisible();
  await expect(details).toHaveJSProperty("open", false);

  for (const width of [1200, 1440, 1700, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const queueBounds = await queue.evaluate(node => ({ height: node.getBoundingClientRect().height, client: node.clientHeight, scroll: node.scrollHeight }));
    expect(queueBounds.height).toBeGreaterThan(100);
    expect(queueBounds.height).toBeLessThanOrEqual(320);
    expect(queueBounds.scroll).toBeGreaterThan(queueBounds.client);
    await move.scrollIntoViewIfNeeded();
    const bounds = await move.evaluate(node => {
      const card = node.getBoundingClientRect();
      return {
        client: node.clientWidth, scroll: node.scrollWidth,
        children: [...node.children].map(child => {
          const box = child.getBoundingClientRect();
          return { top: box.top - card.top, bottom: card.bottom - box.bottom };
        }),
      };
    });
    expect(bounds.scroll).toBeLessThanOrEqual(bounds.client + 1);
    for (const child of bounds.children) {
      expect(child.top).toBeGreaterThanOrEqual(0);
      expect(child.bottom).toBeGreaterThanOrEqual(0);
    }
  }

  await queue.scrollIntoViewIfNeeded();
  await queue.hover();
  await page.mouse.wheel(0, 10000);
  await expect.poll(() => queue.evaluate(node => node.scrollTop > 0)).toBe(true);

  await details.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(details).toHaveJSProperty("open", true);
  await expect(details.locator("dt")).toHaveText(["Owner", "Authority", "Projection", "Record last changed", "Subject ref"]);
  const reference = await details.locator("dd").last().textContent();
  await details.locator("dd").last().scrollIntoViewIfNeeded();
  await expect(details.locator("dd").last()).toBeInViewport();
  const overflow = await details.locator("dl").evaluate(node => node.scrollWidth - node.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await details.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(details).toHaveJSProperty("open", false);

  await priority.getByRole("button", { name: "Source details", exact: true }).click();
  const source = page.getByRole("dialog");
  await expect(source).toBeVisible();
  await expect(source).toContainText(reference);
  await page.keyboard.press("Escape");
  await expect(priority.getByRole("button", { name: "Source details", exact: true })).toBeFocused();

  // Isolated DOM-only layout stress: no owner record or fixture is changed.
  await move.locator("strong").evaluate(node => { node.textContent = "Review the complete owner recovery information before retrying ".repeat(5); });
  await page.setViewportSize({ width: 1200, height: 900 });
  await move.scrollIntoViewIfNeeded();
  const longMove = await move.evaluate(node => {
    const card = node.getBoundingClientRect(), text = node.querySelector("strong").getBoundingClientRect();
    return { client: node.clientWidth, scroll: node.scrollWidth, top: text.top - card.top, bottom: card.bottom - text.bottom };
  });
  expect(longMove.scroll).toBeLessThanOrEqual(longMove.client + 1);
  expect(longMove.top).toBeGreaterThanOrEqual(0);
  expect(longMove.bottom).toBeGreaterThanOrEqual(0);
  expect(writes).toEqual([]);
});
