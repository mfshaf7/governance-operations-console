import { expect, test } from "@playwright/test";
const base = process.env.CONSOLE_TEST_BASE_URL ?? "http://127.0.0.1:3320";
test.use({ viewport: { width: 1700, height: 1000 } });
test.setTimeout(90000);
const snapshot = (mode, status = "current") => ({ mode, status, observedAt: "2026-10-31T12:00:00Z", items: [], nextCursor: null, coverage: "Test owner history", error: null });
async function ready(page) {
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const node = document.querySelector('button[title="Open MODEL"]');
    const key = node && Object.keys(node).find(key => key.startsWith("__reactProps$"));
    return Boolean(key && node[key].onClick);
  }, null, { timeout: 60000 });
}
test("preview activity stays in the existing dock with keyboard-accessible history and retained diagnostics", async ({ page }, testInfo) => {
  const writes = [];
  await page.route("**/api/**", route => {
    if (["GET", "HEAD", "OPTIONS"].includes(route.request().method())) return route.continue();
    writes.push(route.request().url()); return route.abort();
  });
  await page.route("**/api/ai-activity*", route => route.fulfill({ json: snapshot("disconnected-preview") }));
  await ready(page);
  const activity = page.getByRole("region", { name: "Recent AI activity", exact: true });
  await expect(activity).toContainText("Preview examples · no model requests were run");
  await expect(activity.getByRole("button", { name: /^Inspect activity:/ })).toHaveCount(5);
  for (const width of [1200, 1440, 1700, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    const overflow = await activity.evaluate(node => node.scrollWidth - node.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    const list = activity.locator('[class*="runtimeList"]');
    await list.hover(); await page.mouse.wheel(0, 10000);
    await expect.poll(() => list.evaluate(node => node.scrollTop > 0)).toBe(true);
    await expect(activity.getByRole("button", { name: "Inspect activity: Suggest a story breakdown", exact: true })).toBeInViewport();
  }
  await page.setViewportSize({ width: 1700, height: 1000 });
  const history = activity.getByRole("button", { name: "History", exact: true });
  await history.focus(); await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "AI Activity", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("These requests were not executed");
  await dialog.getByRole("button", { name: /Suggest acceptance criteria/ }).click();
  await expect(dialog).toContainText("Example of a failed request");
  await page.keyboard.press("Escape"); await expect(history).toBeFocused();
  await page.getByRole("button", { name: "Open Agent Runtime status", exact: true }).click();
  const status = page.getByRole("dialog", { name: "Agent Runtime Status", exact: true });
  await status.getByText("Open panel diagnostics", { exact: true }).click();
  await expect(status.getByRole("button", { name: "Inspect Docking Agent", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("complementary", { name: "Agent runtime", exact: true }).screenshot({ path: testInfo.outputPath("recent-ai-activity-dock.png") });
  expect(writes).toEqual([]);
});
for (const status of ["current", "offline"]) test(`live ${status} never displays preview activity`, async ({ page }) => {
  await page.route("**/api/ai-activity*", route => route.fulfill({ status: status === "offline" ? 503 : 200, json: snapshot("live", status) }));
  await ready(page);
  const activity = page.getByRole("region", { name: "Recent AI activity", exact: true });
  await expect(activity).toContainText(status === "offline" ? "AI activity refresh is unavailable" : "No recorded AI requests.");
  await expect(activity.getByRole("button", { name: /^Inspect activity:/ })).toHaveCount(0);
  await expect(activity).not.toContainText("Sample application");
});

function recordedPage(id = "recorded-1", nextCursor = "older_cursor") {
  return { mode: "live", status: "current", observedAt: "2026-10-31T12:00:00Z", error: null, coverage: "Retained owner requests; native advice since recording enabled.", nextCursor, items: [{
    id, task: "Proposal triage assistance", surface: "Proposal", subject: "idea-851", subjectRef: "idea-851", kind: "proposal-triage", state: "completed", occurredAt: "2026-10-31T11:58:00Z", detail: "Recorded request outcome. Workflow acceptance remains separate.", receiptRef: "oos://agent-console/receipts/recorded-1", auditRef: "audit:recorded-1", contextRef: "cgg:recorded-1", sessionRef: "oos://agent-console/sessions/recorded-1", errorCode: null,
  }] };
}

test("recorded history retries the same cursor, keeps a bounded page and opens the associated Proposal", async ({ page }) => {
  const { proposalCompletionRecord } = await import("../support/proposal-completion-fixture.mjs");
  const first = proposalCompletionRecord({ proposal_id: "idea-850", title: "Other completed proposal", record_ref: "openproject://work_packages/850" });
  const target = proposalCompletionRecord({ title: "Activity-linked proposal" });
  await page.route("**/api/proposals", route => route.fulfill({ json: { mode: "live", status: "current", error: null, observedAt: "2026-10-31T12:00:00Z", records: [first, target] } }));
  const cursors = []; let fail = true;
  await page.route("**/api/ai-activity*", route => {
    const cursor = new URL(route.request().url()).searchParams.get("cursor");
    if (!cursor) return route.fulfill({ json: recordedPage() });
    cursors.push(cursor);
    if (fail) { fail = false; return route.fulfill({ status: 503, json: { error: "Owner unavailable" } }); }
    return route.fulfill({ json: recordedPage("recorded-older", null) });
  });
  await ready(page);
  const activity = page.getByRole("region", { name: "Recent AI activity", exact: true });
  await expect(activity).not.toContainText("Preview examples");
  await activity.getByRole("button", { name: "History", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "AI Activity", exact: true });
  await dialog.getByRole("button", { name: "Earlier activity", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("This page is retained");
  await expect(dialog).toContainText("recorded-1");
  await dialog.getByRole("button", { name: "Earlier activity", exact: true }).click();
  await expect(dialog.getByRole("status")).toContainText("Page 2");
  expect(cursors).toEqual(["older_cursor", "older_cursor"]);
  await expect(dialog.getByRole("button", { name: /^Inspect activity:/ })).toHaveCount(1);
  await expect(dialog.getByRole("button", { name: "Earlier activity", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  await activity.getByRole("button", { name: "History", exact: true }).click();
  await expect(dialog.getByRole("status")).toContainText("Page 2");
  await dialog.getByRole("button", { name: "Open related item", exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.locator('[data-proposal-open-hub-action="true"]').click();
  await expect(page.getByRole("dialog", { name: "Proposal Hub", exact: true })).toContainText("Activity-linked proposal");
});

test("isolated composed owner records render with their actual request outcomes and evidence", async ({ page }, testInfo) => {
  test.skip(!process.env.CONSOLE_AI_ACTIVITY_COMPOSED_PAGE, "Requires the isolated owner HTTP conformance result.");
  const { readFile } = await import("node:fs/promises");
  const source = JSON.parse(await readFile(process.env.CONSOLE_AI_ACTIVITY_COMPOSED_PAGE, "utf8"));
  await page.route("**/api/ai-activity*", route => route.fulfill({ json: source }));
  await ready(page);
  const activity = page.getByRole("region", { name: "Recent AI activity", exact: true });
  await expect(activity).not.toContainText("Preview examples");
  await expect(activity.getByRole("button", { name: "Inspect activity: Context assistance", exact: true })).toContainText("Completed");
  await expect(activity.getByRole("button", { name: "Inspect activity: Metadata assistance", exact: true })).toContainText("Failed");
  await activity.getByRole("button", { name: "Inspect activity: Context assistance", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "AI Activity", exact: true });
  await dialog.getByText("Technical details", { exact: true }).click();
  await expect(dialog).toContainText("audit:isolated-work-design");
  await expect(dialog.getByText("audit:isolated-work-design", { exact: true })).toBeVisible();
  await expect(dialog).toContainText("cgg:isolated-work-design");
  await dialog.locator("details dl").hover();
  await page.mouse.wheel(0, 10000);
  await expect(dialog.getByText("cgg:isolated-work-design", { exact: true })).toBeInViewport();
  await dialog.screenshot({ path: testInfo.outputPath("composed-ai-activity-details.png") });
  await page.keyboard.press("Escape");
});
