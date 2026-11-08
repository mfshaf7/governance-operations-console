import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";

const base = process.env.CONSOLE_TEST_BASE_URL ?? "http://127.0.0.1:4317";
if (new URL(base).port === "3317") throw Error("Use the isolated preview.");
const fixture = JSON.parse(execFileSync(process.execPath, [
  "--experimental-strip-types", "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "--input-type=module", "-e", `
import { proposalCompletionRecord } from './tests/support/proposal-completion-fixture.mjs';
import { prototypeWorkspaceReadModel } from './src/domain-workspaces/prototype/read-model/prototype-workspace-read-model.ts';
const seed=structuredClone(prototypeWorkspaceReadModel.records[0]);
const record={...seed,id:'prototype-colour-action',name:'High urgency action example',lifecycle:'exploring',
 landing:{...seed.landing,state:'ready'},baseline:{...seed.baseline,state:'approved'},openIssues:[],
 movementRequest:{...seed.movementRequest,state:'idle'},currentMove:{...seed.currentMove,id:'movement-request',label:'Request movement'}};
const recovery={...record,id:'prototype-colour-recovery',name:'High urgency recovery example',movementRequest:{...record.movementRequest,state:'returned',requestReason:'Review the returned movement request'}};
const proposals=[['201','Normal urgency review example','captured']].map(([id,title,status])=>({...proposalCompletionRecord({proposal_id:'idea-'+id,record_ref:'openproject://work_packages/'+id,title,status,updated_at:new Date().toISOString()}),summaryOnly:false}));
process.stdout.write(JSON.stringify({proposals,prototypes:{mode:'live',projection:{readModel:{...prototypeWorkspaceReadModel,records:[record,recovery]},nativeLifecycleOutcomes:[]}}}));
`,
], { encoding: "utf8" }));

test.use({ actionTimeout: 15000, navigationTimeout: 60000 });
test.setTimeout(90000);
for (const width of [1280, 1700]) test(`Pulse and Focus share category colours independently of urgency at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: width === 1280 ? 800 : 1000 });
  const errors = [], writes = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/**", route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
      writes.push(path);
      return route.fulfill({ status: 503, json: { error: "Read-only fixture" } });
    }
    if (path === "/api/proposals") return route.fulfill({ json: { mode: "live", status: "current", records: fixture.proposals, observedAt: new Date().toISOString(), error: null } });
    if (path === "/api/prototypes/records") return route.fulfill({ json: fixture.prototypes });
    return route.fulfill({ status: 503, json: { error: "Unrelated fixture source unavailable" } });
  });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const button = document.querySelector('button[title="Console"]');
    return button && Object.keys(button).some(key => key.startsWith("__reactProps$"));
  }, null, { timeout: 60000 });
  const queue = page.getByRole("region", { name: "Operator priority", exact: true });
  const selected = page.getByRole("region", { name: "Selected priority", exact: true });
  const rows = queue.locator('button[class*="queueRow"]');
  await expect(rows).toHaveCount(3);
  await expect(queue.locator('[class*="visibleCount"]')).toHaveText("3 listed");
  const palette = [
    { title: "Normal urgency review example", urgency: "Normal", tone: "warn", pulse: "required-decisions" },
    { title: "High urgency recovery example", urgency: "High", tone: "danger", pulse: "blocked-operations" },
    { title: "High urgency action example", urgency: "High", tone: "info", pulse: "active-operations" },
  ];
  for (const item of palette) {
    const row = rows.filter({ hasText: item.title });
    const card = page.locator(`[data-pulse-signal="${item.pulse}"]`);
    await expect(row).toHaveAttribute("data-tone", item.tone);
    await expect(row).toContainText(item.urgency);
    await expect(card).toHaveAttribute("data-tone", item.tone);
    await expect(card.locator("strong")).toHaveText("1+");
    expect(await row.evaluate(node => getComputedStyle(node).getPropertyValue("--status-rgb").trim()))
      .toBe(await card.evaluate(node => getComputedStyle(node).getPropertyValue("--status-rgb").trim()));
    await row.scrollIntoViewIfNeeded(); await row.focus(); await row.press("Enter");
    await expect(selected.locator("header[data-tone]")).toHaveAttribute("data-tone", item.tone);
    await expect(selected).toContainText(item.urgency);
    await selected.getByRole("button", { name: "Source details", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Source and evidence", exact: true });
    await expect(dialog.getByText("Current", { exact: true })).toHaveAttribute("data-tone", "ok");
    await dialog.locator('button[aria-label^="Close"]').first().click();
    await card.click();
    const record = page.locator('.pulse-focus-panel article[class*="recordRow"]');
    await expect(record).toHaveCount(1);
    await expect(record).toHaveAttribute("data-tone", item.tone);
    await expect(record).toContainText(item.title);
    await page.getByRole("button", { name: "Back to Command Center", exact: true }).click();
  }
  await expect(page.locator('[data-pulse-signal="source-coverage"]')).toHaveAttribute("data-tone", "danger");
  expect(errors).toEqual([]); expect(writes).toEqual([]);
  await queue.screenshot({ path: test.info().outputPath("matching-category-colours.png") });
});
