import { test, expect } from "../support/filled-surface-layout.mjs";
import { execFileSync } from "node:child_process";

// Actual UI/application checks with explicitly synthetic owner/model responses.
// These prove neither real-provider quality nor canonical workflow application.
const base = process.env.CONSOLE_TEST_BASE_URL ?? "http://127.0.0.1:4317";
if (new URL(base).port === "3317") throw Error("Use isolated preview only.");
test.use({ viewport: { width: 1700, height: 1050 }, actionTimeout: 15000 });
test.setTimeout(120000);
const current = page => page.getByRole("dialog").last();
const blankPatch = () => ({ addItems: [], updateItems: [], removeItemIds: [], addConnections: [], updateConnections: [], removeConnectionIds: [], addTrays: [], updateTrays: [], removeTrayIds: [], arrangements: [], layers: [] });
const card = (id, label, x) => ({ id, label, kind: "component", detail: "Actual selected architecture responsibility, with full text retained.", x, y: 80, width: 300, height: 760 });
async function setup(page) {
  const writes = [], errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/**", route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (path.startsWith("/api/saved-work/")) return route.fulfill({ json: { mode: "disconnected-preview" } });
    if (path.endsWith("/projection") && path.includes("/api/delivery/work-design/")) return route.fulfill({ json: {
      mode: "live", status: "current", error: null, observedAt: new Date().toISOString(), projection: {
        schema_version: 1, package_ref: "delivery-package:712", source: { ref: "openproject://work_packages/712", revision: "version-17" },
        state: "not-applied", pending_application_id: null, latest_application: null, history: [], projected_at: new Date().toISOString(),
      } } });
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) { writes.push(path); return route.abort(); }
    return route.continue();
  });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => { const node = document.querySelector('button[title="Open DELIVERY"]'); return node && Object.keys(node).some(key => key.startsWith("__reactProps$")); });
  return { writes, errors };
}
async function context(page) {
  await page.getByTitle("Open DELIVERY", { exact: true }).click();
  await page.getByRole("button", { name: /03.*Work Design/i }).click();
  await page.getByRole("row").filter({ hasText: "Context Admission Work Design" }).click();
  await page.getByRole("button", { name: "Open Design Hub", exact: true }).click();
  await page.getByRole("button", { name: "Open Context Session", exact: true }).click();
}
async function snapshot(page) {
  return page.evaluate(() => Object.entries(localStorage).filter(([key]) => key.startsWith("delivery-work-design-session:")).map(([, value]) => JSON.parse(value)).find(value => value.context?.current)?.context.current.snapshot);
}
function advice(body, edits, message = "Synthetic requested draft; no provider invoked.") {
  return { schema_version: 1, request_id: "synthetic-request:tools", correlation_id: "synthetic:tools", response_id: "synthetic-response:tools",
    task_kind: body.taskKind, status: "ready", confidence: "high", required_operator_action: "review", affected_node_id: null, patch_proposal: null,
    text: JSON.stringify({ intent: edits.length ? "draft" : "answer", message, edits }),
    evidence: { generated_at: new Date().toISOString(), model_profile_id: "delivery-work-design-advisor-v1", task_contract_ref: "oos.delivery-work-design.v1",
      output_schema_ref: "platform-engineering/security/schemas/delivery-work-design-advice.schema.json", cgg_packet_ref: "/v1/context/packets/synthetic-tools",
      redaction_receipt_ref: "/v1/context/receipts/synthetic-tools", gateway_audit_ref: "audit:synthetic-tools" } };
}

test("ordinary Context request applies fitting groups and centered automatic-height cards, with exact undo", async ({ page }) => {
  const check = await setup(page); let sent;
  await page.route("**/api/delivery/work-design/**/assist", route => {
    sent = route.request().postDataJSON();
    const patch = { ...blankPatch(), addItems: [card("console", "Console", 0), card("workflow", "Workflow", 450)],
      addTrays: [{ id: "runtime", label: "Private runtime", itemIds: ["console", "workflow"], diagramType: "c4", autoFit: true }] };
    return route.fulfill({ json: advice(sent, [{ field: "diagramType", value: "c4" }, { field: "board", value: patch }]) });
  });
  await context(page); const before = await snapshot(page), d = current(page);
  await d.getByRole("textbox", { name: "Work Design context advisor prompt", exact: true }).fill("Draw the system and group the private runtime responsibilities.");
  await d.getByRole("button", { name: "run", exact: true }).click();
  await expect(d.getByRole("textbox", { name: "Edit Console title", exact: true })).toBeVisible();
  const after = await snapshot(page), viewport = JSON.parse(sent.draftScope.scope.context).observations.editor.viewport;
  const group = after.templateTrays.find(item => item.id === "runtime");
  expect(group.x + group.width / 2).toBeCloseTo(viewport.x + viewport.width / 2, 1);
  expect(group.y + group.height / 2).toBeCloseTo(viewport.y + viewport.height / 2, 1);
  expect(after.customItems.every(item => item.height === undefined && item.diagramType === "c4")).toBe(true);
  expect(group.itemIds).toEqual(["console", "workflow"]);
  await d.screenshot({ path: test.info().outputPath("centered-advisor-tray.png") });
  await d.getByRole("button", { name: "Undo advisor edit", exact: true }).click();
  await expect.poll(() => snapshot(page)).toEqual(before);
  expect(check.writes).toEqual([]); expect(check.errors).toEqual([]);
});

test("panning during a requested diagram edit retains the proposal and does not move the viewport back", async ({ page }) => {
  const check = await setup(page); let sent, release;
  const held = new Promise(resolve => { release = resolve; });
  await page.route("**/api/delivery/work-design/**/assist", async route => {
    sent = route.request().postDataJSON(); await held;
    await route.fulfill({ json: advice(sent, [{ field: "board", value: { ...blankPatch(), addItems: [card("new", "New component", 0)] } }]) });
  });
  await context(page); const d = current(page);
  await d.getByRole("textbox", { name: "Work Design context advisor prompt", exact: true }).fill("Draft the first component.");
  await d.getByRole("button", { name: "run", exact: true }).click(); await expect.poll(() => Boolean(sent)).toBe(true);
  await d.getByLabel("Board navigator", { exact: true }).click({ position: { x: 25, y: 20 } });
  const canvas = d.locator("div[data-panning]"), position = await canvas.evaluate(node => ({ x: node.scrollLeft, y: node.scrollTop }));
  release(); await expect.poll(async () => (await snapshot(page))?.customItems.some(item => item.id === "new")).toBe(true);
  expect(await canvas.evaluate(node => ({ x: node.scrollLeft, y: node.scrollTop }))).toEqual(position);
  expect(check.writes).toEqual([]); expect(check.errors).toEqual([]);
});

test("first orchestration step draft renders in the form and survives auto-selection with usable undo", async ({ page }) => {
  const draft = JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "--input-type=module", "-e",
    'import {createOrchestrationDefinitionDesignDraft} from "./src/domain-workspaces/orchestration/work-model/definition-design/definition-design-model.ts"; process.stdout.write(JSON.stringify(createOrchestrationDefinitionDesignDraft({draftId:"orchestration-definition-new",savedAt:"2026-11-18T00:00:00Z"})));'], { encoding: "utf8" }));
  draft.activeStage = "define"; draft.activeSection = "execution-plan";
  await page.addInitScript(value => localStorage.setItem(`orchestration-definition-design:${value.draftId}:v1`, JSON.stringify(value)), draft);
  const check = await setup(page); let sent;
  await page.route("**/api/advisor-interaction", route => {
    sent = route.request().postDataJSON();
    return route.fulfill({ json: { intent: "draft", message: "Synthetic proposed first step; implementation facts remain unknown.",
      edits: [{ field: "executionPlan.nodesJson", value: JSON.stringify([{ label: "Check service availability" }]) }],
      evidence: { profileId: "agent-console-assistant-v1", auditRef: "audit:synthetic", contextRef: "context:synthetic" } } });
  });
  await page.getByTitle("Open ORCHESTRATION", { exact: true }).click();
  await page.locator('[data-orchestration-workspace-section="definitions"]').click();
  await page.getByRole("button", { name: "Design Orchestration", exact: true }).click();
  const d = current(page);
  await d.getByRole("textbox", { name: "Definition advisor prompt", exact: true }).fill("Add a first step that checks whether the service is online.");
  await d.getByRole("button", { name: "run", exact: true }).click();
  await expect.poll(() => sent?.scope.fields.some(field => field.key === "executionPlan.nodesJson")).toBe(true);
  await expect(d.getByRole("textbox", { name: "Node label", exact: true })).toHaveValue("Check service availability");
  await d.screenshot({ path: test.info().outputPath("first-advisor-step.png") });
  await d.getByRole("button", { name: "Undo advisor edit", exact: true }).click();
  await expect(d.getByRole("textbox", { name: "Node label", exact: true })).toHaveCount(0);
  expect(check.writes).toEqual([]); expect(check.errors).toEqual([]);
});
