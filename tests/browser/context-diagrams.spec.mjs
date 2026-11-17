import { test, expect } from "../support/filled-surface-layout.mjs";
const base = process.env.CONSOLE_TEST_BASE_URL ?? "http://127.0.0.1:4317";
if (new URL(base).port === "3317") throw Error("Use an isolated preview for diagram mutation tests.");
test.use({ viewport: { width: 1700, height: 1050 }, actionTimeout: 15000 });
test.setTimeout(120000);

async function waitForShell(page) {
  await page.waitForFunction(() => {
    const button = document.querySelector('button[title="Open DELIVERY"]');
    return button && Object.keys(button).some(key => key.startsWith("__reactProps$"));
  });
}

async function open(page, options = {}) {
  const errors = [], writes = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/**", route => {
    if (options.workDesignProjection && new URL(route.request().url()).pathname.endsWith("/projection") && route.request().url().includes("/api/delivery/work-design/"))
      return route.fulfill({ json: options.workDesignProjection });
    if (!["GET", "HEAD", "OPTIONS"].includes(route.request().method())) {
      writes.push(new URL(route.request().url()).pathname); return route.abort();
    }
    return route.continue();
  });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await waitForShell(page);
  await page.getByTitle("Open DELIVERY", { exact: true }).click();
  await page.getByRole("button", { name: /03.*Work Design/i }).click();
  await page.getByRole("row").filter({ hasText: "Context Admission Work Design" }).click();
  await page.getByRole("button", { name: "Open Design Hub", exact: true }).click();
  await page.getByRole("button", { name: "Open Context Session", exact: true }).click();
  return { errors, writes };
}
const current = page => page.getByRole("dialog").last();

// Isolated transport outcomes exercise the actual advisor UI; these are not
// evidence of model quality, authenticated inference or canonical application.
async function openReasoningAdvisor(page, role) {
  const at = new Date().toISOString();
  const result = await open(page, { workDesignProjection: { mode: "live", status: "current", error: null, observedAt: at,
    projection: { schema_version: 1, package_ref: "delivery-package:712", source: { ref: "openproject://work_packages/712", revision: "version-17" },
      state: "not-applied", pending_application_id: null, latest_application: null, history: [], projected_at: at } } });
  await current(page).getByRole("textbox", { name: "Work Design context note", exact: true }).fill("Retain the complete architecture and its private source custody, runtime boundaries and recovery evidence.");
  if (role === "tree") {
    await current(page).getByRole("button", { name: "Save Session", exact: true }).click();
    await current(page).getByRole("textbox", { name: "Session Name", exact: true }).fill("Isolated complete architecture");
    await current(page).getByRole("button", { name: "Save Session", exact: true }).click();
    await current(page).getByRole("button", { name: "Finalize Brief", exact: true }).click();
    await current(page).getByRole("button", { name: "Finalize Brief", exact: true }).click();
    await page.getByRole("button", { name: "Close finalized brief", exact: true }).click();
    await current(page).getByRole("button", { name: "Build From Brief", exact: true }).click();
  }
  return result;
}

function isolatedAdvice(body, edit = false) {
  return { schema_version: 1, request_id: "synthetic-request:waiting", correlation_id: "synthetic:waiting",
    response_id: "synthetic-response:waiting", task_kind: body.taskKind, status: "ready", confidence: "high",
    required_operator_action: "review", affected_node_id: null, patch_proposal: null,
    text: JSON.stringify({ intent: edit ? "draft" : "answer", message: "Isolated complete response; no provider invoked.",
      edits: edit ? [{ field: "note", value: "Late response must not replace manual work." }] : [] }),
    evidence: { generated_at: new Date().toISOString(), model_profile_id: "delivery-work-design-advisor-v1",
      task_contract_ref: "oos.delivery-work-design.v1", output_schema_ref: "platform-engineering/security/schemas/delivery-work-design-advice.schema.json",
      cgg_packet_ref: "/v1/context/packets/synthetic-waiting", redaction_receipt_ref: "/v1/context/receipts/synthetic-waiting", gateway_audit_ref: "audit:synthetic-waiting" } };
}

for (const role of ["context", "tree"]) for (const ending of ["stopped", "timeout"]) {
  test(`${role} advisor retains a single unconfirmed turn after ${ending}, with the longer allowance`, async ({ page }) => {
    const { errors } = await openReasoningAdvisor(page, role);
    let received = 0, release;
    const held = new Promise(resolve => { release = resolve; });
    await page.route("**/api/delivery/work-design/**/assist", async route => {
      received++; await held;
      await route.fulfill({ json: isolatedAdvice(route.request().postDataJSON()) }).catch(() => {});
    });
    const d = current(page), prompt = `Inspect the full ${role} without changing it.`;
    const before = (await saved(page)).context;
    await page.clock.install();
    await d.getByRole("textbox", { name: `Work Design ${role} advisor prompt`, exact: true }).fill(prompt);
    await d.getByRole("button", { name: "run", exact: true }).click();
    await expect.poll(() => received).toBe(1);
    await expect(d.getByText(/10-minute reasoning allowance/)).toBeVisible();
    if (ending === "timeout") await page.clock.fastForward(181000);
    else await page.clock.runFor(500);
    await expect(d.getByRole("button", { name: "stop waiting", exact: true })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath(`${role}-long-wait.png`) });
    if (ending === "stopped") await d.getByRole("button", { name: "stop waiting", exact: true }).click();
    else await page.clock.fastForward(540000);
    await expect(d.getByText(/provider.*may still be running/i).first()).toBeVisible();
    const retained = await page.evaluate(() => Object.entries(localStorage).filter(([key]) => key.startsWith("advisor-conversation:")).map(([, raw]) => JSON.parse(raw)));
    const conversation = retained.find(value => value.binding.role === `work-design-${role}`);
    expect(conversation.turns.filter(turn => turn.text === prompt)).toHaveLength(1);
    expect(conversation.pending.waitingEnded).toBe(ending);
    expect(conversation.pending.state).toBe("unconfirmed");
    release();
    expect((await saved(page)).context).toEqual(before);
    if (role === "context" && ending === "stopped") {
      await page.clock.setSystemTime(Date.now());
      await open(page);
      await expect(current(page).getByRole("button", { name: "New conversation", exact: true })).toBeEnabled({ timeout: 15000 });
      await expect(current(page).getByText(/Earlier request outcome is unconfirmed/)).toBeVisible();
      await expect(current(page).getByRole("textbox", { name: "Work Design context note", exact: true })).toHaveValue("Retain the complete architecture and its private source custody, runtime boundaries and recovery evidence.");
    }
    expect(received).toBe(1); expect(errors).toEqual([]);
  });
}

test("a late context proposal cannot overwrite a newer manual architecture note", async ({ page }) => {
  await openReasoningAdvisor(page, "context");
  let received = 0, release;
  const held = new Promise(resolve => { release = resolve; });
  await page.route("**/api/delivery/work-design/**/assist", async route => {
    received++; await held; await route.fulfill({ json: isolatedAdvice(route.request().postDataJSON(), true) });
  });
  const d = current(page), note = d.getByRole("textbox", { name: "Work Design context note", exact: true });
  await d.getByRole("textbox", { name: "Work Design context advisor prompt", exact: true }).fill("Draft an architecture note from supplied evidence.");
  await d.getByRole("button", { name: "run", exact: true }).click(); await expect.poll(() => received).toBe(1);
  await note.fill("Newer manual architecture must survive."); release();
  await expect(d.getByText(/draft or selected context changed/i).first()).toBeVisible();
  await expect(note).toHaveValue("Newer manual architecture must survive.");
  expect(received).toBe(1);
});

test("closing an answering context surface preserves the unconfirmed request without applying a late draft", async ({ page }) => {
  await openReasoningAdvisor(page, "context");
  let received = 0, release;
  const held = new Promise(resolve => { release = resolve; });
  await page.route("**/api/delivery/work-design/**/assist", async route => {
    received++; await held;
    await route.fulfill({ json: isolatedAdvice(route.request().postDataJSON(), true) }).catch(() => {});
  });
  const d = current(page), before = (await saved(page)).context;
  await d.getByRole("textbox", { name: "Work Design context advisor prompt", exact: true }).fill("Draft from the complete architecture.");
  await d.getByRole("button", { name: "run", exact: true }).click(); await expect.poll(() => received).toBe(1);
  await d.getByRole("button", { name: "Back to Hub", exact: true }).click(); release();
  await expect.poll(async () => page.evaluate(() => Object.entries(localStorage).filter(([key]) => key.startsWith("advisor-conversation:")).map(([, value]) => JSON.parse(value)).find(value => value.binding.role === "work-design-context")?.pending?.waitingEnded)).toBe("stopped");
  expect((await saved(page)).context).toEqual(before); expect(received).toBe(1);
});
async function choose(page, label, option) {
  await current(page).getByRole("button", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
async function addCard(page, title) {
  const d = current(page);
  await d.getByRole("button", { name: "Open general tools", exact: true }).click();
  await d.getByRole("button", { name: "Add Component", exact: true }).click();
  const card = d.locator('[data-dragging][data-kind="component"]').last();
  await card.locator("input").fill(title); await card.locator("textarea").fill(`Architecture evidence for ${title}`);
  await d.getByRole("button", { name: "Open general tools", exact: true }).click();
}
async function saved(page) {
  return page.evaluate(() => {
    const key = Object.keys(localStorage).find(key => key.startsWith("delivery-work-design-session:pkg-design-712:"));
    return key ? JSON.parse(localStorage.getItem(key)) : null;
  });
}

test("independent diagrams survive checkpoint/reload and complete finalization remains readonly while navigating", async ({ page }) => {
  const { errors, writes } = await open(page);
  await current(page).getByRole("textbox", { name: "Work Design context note", exact: true }).fill("Shared runtime architecture, source custody and original-operation recovery.");
  await current(page).getByRole("button", { name: "Diagram details", exact: true }).click();
  await current(page).getByRole("textbox", { name: "Diagram name", exact: true }).fill("System architecture");
  await current(page).getByRole("textbox", { name: "What this diagram explains", exact: true }).fill("The Console, workflow authority and isolated runtime responsibilities.");
  await current(page).getByRole("button", { name: "Save changes", exact: true }).click();
  await addCard(page, "Console entry");
  await current(page).getByRole("button", { name: "Add diagram", exact: true }).click();
  await current(page).getByRole("textbox", { name: "Diagram name", exact: true }).fill("Runtime interactions");
  await current(page).getByRole("textbox", { name: "What this diagram explains", exact: true }).fill("Run the exact saved source and reconcile the original command after a restart.");
  await current(page).getByRole("button", { name: "Add diagram", exact: true }).click();
  await addCard(page, "Runtime runner");
  await expect(current(page).getByRole("textbox", { name: "Edit Console entry title", exact: true })).toHaveCount(0);
  await choose(page, "Select brief diagram", "1. System architecture");
  await expect(current(page).getByRole("textbox", { name: "Edit Console entry title", exact: true })).toHaveValue("Console entry");
  await expect(current(page).getByRole("textbox", { name: "Edit Runtime runner title", exact: true })).toHaveCount(0);
  await current(page).getByRole("button", { name: "Save Session", exact: true }).click();
  await current(page).getByRole("textbox", { name: "Session Name", exact: true }).fill("Architecture and runtime views");
  await current(page).getByRole("button", { name: "Save Session", exact: true }).click();
  await expect.poll(async () => (await saved(page))?.context?.current?.snapshot?.diagrams?.length).toBe(2);
  const before = await saved(page), checkpoint = before.context.sessions[0];
  expect(checkpoint.snapshot.diagrams.map(view => view.name)).toEqual(["System architecture", "Runtime interactions"]);
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForShell(page);
  await page.getByText("Shape governed delivery.", { exact: true }).click();
  await page.getByRole("button", { name: /03.*Work Design/i }).click();
  await page.getByRole("row").filter({ hasText: "Context Admission Work Design" }).click();
  await page.getByRole("button", { name: "Open Design Hub", exact: true }).click();
  await page.getByRole("button", { name: "Open Context Session", exact: true }).click();
  await expect(current(page).getByRole("textbox", { name: "Edit Console entry title", exact: true })).toBeVisible();
  await current(page).getByRole("button", { name: "Finalize Brief", exact: true }).click();
  await current(page).getByRole("button", { name: "Finalize Brief", exact: true }).click();
  await expect.poll(async () => (await saved(page))?.briefVersions?.length).toBe(1);
  const frozen = (await saved(page)).briefVersions[0];
  expect(frozen.snapshot.diagrams).toEqual(checkpoint.snapshot.diagrams);
  const image = current(page).locator('img[src^="data:image/svg+xml"]');
  await expect(image).toHaveCount(1);
  const svg = decodeURIComponent((await image.getAttribute("src")).split(",").slice(1).join(","));
  expect(svg).toContain("Console entry"); expect(svg).toContain("Runtime runner");
  await page.screenshot({ path: test.info().outputPath("complete-brief-review.png") });
  await page.keyboard.press("Escape");
  await choose(page, "Select brief diagram", "2. Runtime interactions");
  await expect(current(page).getByRole("textbox", { name: "Edit Runtime runner title", exact: true })).toHaveJSProperty("readOnly", true);
  await expect(current(page).getByRole("button", { name: "Add diagram", exact: true })).toBeDisabled();
  expect((await saved(page)).briefVersions[0]).toEqual(frozen);
  await page.screenshot({ path: test.info().outputPath("readonly-multi-diagram.png") });
  await current(page).getByRole("button", { name: "View Finalized Brief", exact: true }).click();
  await current(page).getByRole("button", { name: "Reopen Brief", exact: true }).click();
  await expect(current(page).getByRole("button", { name: "Add diagram", exact: true })).toBeEnabled();
  await current(page).getByRole("textbox", { name: "Edit Runtime runner title", exact: true }).fill("Updated runtime runner");
  expect((await saved(page)).briefVersions[0]).toEqual(frozen);
  await expect.poll(async () => (await saved(page))?.context?.current?.snapshot?.diagrams?.[1]?.snapshot?.customItems?.[0]?.label).toBe("Updated runtime runner");
  expect(errors).toEqual([]); expect(writes).toEqual([]);
});

test("other architecture views are included only as explicit read-only knowledge, with no diagram mutation on denied advice",async({page})=>{
 const at=new Date().toISOString(),sourceRef='openproject://work_packages/712',seen=[];
 const workDesignProjection={mode:'live',status:'current',error:null,observedAt:at,projection:{schema_version:1,package_ref:'delivery-package:712',source:{ref:sourceRef,revision:'version-17'},state:'not-applied',pending_application_id:null,latest_application:null,history:[],projected_at:at}};
 const {errors}=await open(page,{workDesignProjection});
 await current(page).getByRole('button',{name:'Add diagram',exact:true}).click();
 await current(page).getByRole('textbox',{name:'Diagram name',exact:true}).fill('Recovery supporting view');
 await current(page).getByRole('textbox',{name:'What this diagram explains',exact:true}).fill('A retained operation is reconciled after a restart.');
 await current(page).getByRole('button',{name:'Add diagram',exact:true}).click();await addCard(page,'Original operation');
 await choose(page,'Select brief diagram','1. Diagram 1');
 await page.route('**/api/delivery/work-design/**/assist',route=>{seen.push(route.request().postDataJSON());return route.fulfill({status:422,json:{error:'Synthetic denied request; no model or canonical action.'}});});
 const d=current(page);
 const support=d.getByText('Supporting diagrams · 0 included',{exact:true});await support.click();
 const checkbox=d.getByRole('checkbox',{name:'Use Recovery supporting view as read-only context',exact:true});
 await checkbox.check();await expect(d.getByText('Supporting diagrams · 1 included',{exact:true})).toBeVisible();
 const before=await saved(page);
 await d.getByRole('textbox',{name:'Work Design context advisor prompt',exact:true}).fill('Explain how the other view affects this architecture.');
 await d.getByRole('button',{name:'run',exact:true}).click();
 await expect.poll(()=>seen.length).toBe(1);
 const scope=seen[0].draftScope.scope,context=JSON.parse(scope.context);
 expect(context.observations.readOnlySupportingDiagrams).toHaveLength(1);
 expect(context.observations.readOnlySupportingDiagrams[0].snapshot.customItems[0].label).toBe('Original operation');
 expect(scope.fields.map(field=>field.key)).toEqual(['note','diagramName','diagramDescription','board']);
 await expect.poll(async()=>JSON.stringify((await saved(page))?.context?.current?.snapshot?.diagrams)).toBe(JSON.stringify(before.context.current.snapshot.diagrams));
 expect(errors).toEqual([]);
});

test("diagram management preserves descriptions, requires deletion confirmation and fits the compact desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const { errors, writes } = await open(page);
  await current(page).getByRole("button", { name: "Diagram details", exact: true }).click();
  await current(page).getByRole("textbox", { name: "Diagram name", exact: true }).fill("Source custody");
  await current(page).getByRole("textbox", { name: "What this diagram explains", exact: true }).fill("Private saved drafts and exact base identity.");
  await current(page).getByRole("button", { name: "Save changes", exact: true }).click();
  await addCard(page, "Private draft");
  await current(page).getByRole("button", { name: "Diagram details", exact: true }).click();
  await current(page).getByRole("button", { name: "Duplicate", exact: true }).click();
  await current(page).getByRole("textbox", { name: "Diagram name", exact: true }).fill("Recovery detail");
  await current(page).getByRole("button", { name: "Add diagram", exact: true }).click();
  await expect(current(page).getByRole("textbox", { name: "Edit Private draft title", exact: true })).toHaveCount(1);
  await current(page).getByRole("button", { name: "Diagram details", exact: true }).click();
  await expect(current(page).getByRole("textbox", { name: "What this diagram explains", exact: true })).toHaveValue("Private saved drafts and exact base identity.");
  await current(page).getByRole("button", { name: "Move earlier", exact: true }).click();
  await current(page).getByRole("button", { name: "Delete diagram", exact: true }).click();
  await current(page).getByRole("button", { name: "Keep diagram", exact: true }).click();
  await current(page).getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(current(page).getByRole("button", { name: "Select brief diagram", exact: true })).toContainText("2. Recovery detail");
  await current(page).getByRole("button", { name: "Diagram details", exact: true }).click();
  await current(page).getByRole("button", { name: "Move earlier", exact: true }).click();
  await current(page).getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(current(page).getByRole("button", { name: "Select brief diagram", exact: true })).toContainText("1. Recovery detail");
  await current(page).getByRole("button", { name: "Diagram details", exact: true }).click();
  await current(page).getByRole("button", { name: "Delete diagram", exact: true }).click();
  await current(page).getByRole("button", { name: "Delete diagram", exact: true }).click();
  await expect(current(page).getByRole("button", { name: "Select brief diagram", exact: true })).toContainText("1. Source custody");
  await current(page).getByRole("button", { name: "Undo board action", exact: true }).click();
  await expect(current(page).getByRole("button", { name: "Select brief diagram", exact: true })).toContainText("1. Recovery detail");
  await choose(page, "Select brief diagram", "2. Source custody");
  await expect(current(page).getByRole("textbox", { name: "Edit Private draft title", exact: true })).toHaveCount(1);
  await current(page).getByRole("button", { name: "Redo board action", exact: true }).click();
  await expect(current(page).getByRole("button", { name: "Select brief diagram", exact: true })).toContainText("1. Source custody");
  await page.screenshot({ path: test.info().outputPath("compact-diagram-navigation.png") });
  expect(errors).toEqual([]); expect(writes).toEqual([]);
});
