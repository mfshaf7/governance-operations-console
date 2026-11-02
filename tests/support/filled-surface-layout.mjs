import { test as base, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";

// Only fixed-height/filling workspaces participate. Content-sized dialogs retain
// their intentional sizing. Aggregate across navigations, not just final DOM.
export const test = base.extend({
  filledSurfaceGeometry: [async ({ page }, use, info) => {
    const surfaces = new Map(), violations = [];
    await page.exposeBinding("__recordFilledSurface", (_source, value) => {
      const previous = surfaces.get(value.id);
      surfaces.set(value.id, { first: previous?.first ?? value, latest: value,
        observations: (previous?.observations ?? 0) + 1 });
      if (Math.abs(value.width - value.availableWidth) > 1 || Math.abs(value.height - value.availableHeight) > 1) {
        if (violations.length < 30) violations.push(value);
      }
    });
    await page.addInitScript(() => {
      const previous = new WeakMap();
      function inspect() {
        for (const modal of document.querySelectorAll('[data-teras-modal][data-height="fill"][data-body-layout="fill"]')) {
          if (!modal.closest("dialog")?.open) continue;
          const body = modal.querySelector(":scope > div");
          const root = body && [...body.children].find(child => child instanceof HTMLElement && child.getBoundingClientRect().width > 0);
          if (!root) continue;
          const rect = root.getBoundingClientRect(), style = getComputedStyle(body);
          const value = { id: modal.dataset.terasModal, viewport: [innerWidth, innerHeight],
            width: rect.width, height: rect.height,
            availableWidth: body.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
            availableHeight: body.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom),
          };
          const key = JSON.stringify(value);
          if (key !== previous.get(modal)) {
            previous.set(modal, key);
            void window.__recordFilledSurface(value).catch(() => {});
          }
        }
        requestAnimationFrame(inspect);
      }
      requestAnimationFrame(inspect);
    });
    await use();
    const path = info.outputPath("filled-surface-geometry.json");
    await writeFile(path, JSON.stringify({ surfaces: Object.fromEntries(surfaces), violations }, null, 2));
    await info.attach("filled-surface-geometry", { path, contentType: "application/json" });
    expect(violations, "Filling workspace content must occupy its available body from first paint.").toEqual([]);
  }, { auto: true }],
});

export { expect };
