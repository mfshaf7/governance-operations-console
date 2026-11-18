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
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/delivery/workspace") return route.fulfill({ json: { mode: "disconnected-preview", projection: null, error: null } });
    if (path === "/api/console/capabilities") return route.fulfill({ json: { artifactType: "console-runtime-capability-projection", schemaVersion: 1, mode: "disconnected-preview", capabilities: [] } });
    if (path.startsWith("/api/saved-work/")) return route.fulfill({ json: { mode: "disconnected-preview" } });
    if (!options.workDesignProjection && path.startsWith("/api/delivery/work-design/") && path.endsWith("/projection")) return route.fulfill({ json: { mode: "disconnected-preview", status: "current", projection: null, error: null, observedAt: new Date().toISOString() } });
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
  await page.getByRole("button", { name: /03.*Work Design/i }).click({ timeout: 60000 });
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
  const fullNote = "Shared runtime architecture, source custody and original-operation recovery.\n\n" + "Retain the exact source identity, independent execution boundary and restart evidence. ".repeat(35) + "\n\nFinal retained paragraph.";
  await current(page).getByRole("textbox", { name: "Work Design context note", exact: true }).fill(fullNote);
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
  await page.getByRole("button", { name: /03.*Work Design/i }).click({ timeout: 60000 });
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
  expect(svg).toContain("Console entry"); expect(svg).not.toContain("Runtime runner");
  await expect(current(page).getByRole("button", { name: "Previous diagram", exact: true })).toBeDisabled();
  await expect(current(page).getByRole("status").filter({ hasText: "Diagram 1 of 2" })).toBeVisible();
  const preview = current(page).getByRole("button", { name: "View full context snapshot", exact: true });
  const navigation = current(page).getByRole("group", { name: "Diagram navigation", exact: true });
  const overlay = navigation.locator("..");
  await current(page).getByRole("button", { name: "Close finalized brief", exact: true }).focus();
  await page.mouse.move(0, 0);
  await expect(overlay).toHaveCSS("opacity", "0");
  await preview.hover();
  await expect(overlay).toHaveCSS("opacity", "1");
  await expect(navigation).toContainText("System architecture");
  const frameBox = await preview.boundingBox(), navBox = await navigation.boundingBox();
  expect(navBox.x).toBeGreaterThanOrEqual(frameBox.x);
  expect(navBox.x + navBox.width).toBeLessThanOrEqual(frameBox.x + frameBox.width);
  expect(frameBox.y + frameBox.height - navBox.y - navBox.height).toBeLessThan(12);
  await current(page).getByRole("button", { name: "Close finalized brief", exact: true }).focus();
  await page.mouse.move(0, 0); await expect(overlay).toHaveCSS("opacity", "0");
  await preview.focus(); await page.keyboard.press("Tab");
  await expect(current(page).getByRole("button", { name: "Next diagram", exact: true })).toBeFocused();
  await expect(overlay).toHaveCSS("opacity", "1");
  await current(page).getByRole("button", { name: "Next diagram", exact: true }).click();
  await expect(overlay).toHaveCSS("opacity", "0");
  await preview.hover();
  await expect(overlay).toHaveCSS("opacity", "1");
  const secondSvg = decodeURIComponent((await image.getAttribute("src")).split(",").slice(1).join(","));
  expect(secondSvg).toContain("Runtime runner"); expect(secondSvg).not.toContain("Console entry");
  await expect(current(page).getByRole("button", { name: "Next diagram", exact: true })).toBeDisabled();
  await current(page).getByRole("button", { name: "View Snapshot", exact: true }).click();
  await expect(current(page).getByRole("status").filter({ hasText: "Diagram 2 of 2" })).toBeVisible();
  const expandedImage = current(page).locator("img");
  await expandedImage.hover();
  await expect(current(page).getByRole("group", { name: "Diagram navigation", exact: true })).toContainText("Runtime interactions");
  await current(page).getByRole("button", { name: "Zoom in snapshot", exact: true }).click();
  await expect(current(page).getByRole("button", { name: "Fit snapshot", exact: true })).toContainText("125%");
  await current(page).locator("img").hover();
  await current(page).getByRole("button", { name: "Previous diagram", exact: true }).click();
  await expect(current(page).getByRole("status").filter({ hasText: "Diagram 1 of 2" })).toBeVisible();
  await expect(current(page).getByRole("button", { name: "Fit snapshot", exact: true })).toContainText("100%");
  const expandedOverlay = current(page).getByRole("group", { name: "Diagram navigation", exact: true }).locator("..");
  await expect(expandedOverlay).toHaveCSS("opacity", "0");
  await current(page).getByRole("button", { name: "Next diagram", exact: true }).focus();
  await expect(expandedOverlay).toHaveCSS("opacity", "1");
  await page.keyboard.press("Enter");
  await expect(current(page).getByRole("status").filter({ hasText: "Diagram 2 of 2" })).toBeVisible();
  await expect(expandedOverlay).toHaveCSS("opacity", "0");
  await page.getByRole("button", { name: "Close snapshot viewer", exact: true }).click();
  const readFullNote = current(page).getByRole("button", { name: "Read full note", exact: true });
  await readFullNote.scrollIntoViewIfNeeded();
  const noteTray = readFullNote.locator("xpath=ancestor::section[1]");
  const excerptBox = await noteTray.locator(":scope > p").last().boundingBox();
  const readBox = await readFullNote.boundingBox(), noteBox = await noteTray.boundingBox();
  expect(readBox.y).toBeGreaterThanOrEqual(excerptBox.y + excerptBox.height);
  expect(noteBox.x + noteBox.width - readBox.x - readBox.width).toBeLessThan(24);
  await readFullNote.click();
  await expect(current(page).getByText(fullNote, { exact: true })).toBeVisible();
  expect(await current(page).getByText(fullNote, { exact: true }).evaluate(el => getComputedStyle(el).whiteSpace)).toBe("pre-wrap");
  await page.getByRole("button", { name: "Close handoff note", exact: true }).click();
  await expect(current(page).getByText("Final retained paragraph.", { exact: false })).toHaveCount(0);
  const downloadPromise = page.waitForEvent("download");
  await current(page).getByRole("button", { name: "Export Preview", exact: true }).click();
  const download = await downloadPromise;
  const bytes = await download.createReadStream();
  const chunks = []; for await (const chunk of bytes) chunks.push(chunk);
  const completeExport = Buffer.concat(chunks);
  expect(download.suggestedFilename()).toBe("context-brief-diagrams.png");
  expect(completeExport.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
  const dimensions = value => ({ width: Number(value.match(/<svg[^>]* width="(\d+)"/)[1]), height: Number(value.match(/<svg[^>]* height="(\d+)"/)[1]) });
  const one = dimensions(svg), two = dimensions(secondSvg);
  const collectionWidth = Math.max(one.width, two.width), collectionHeight = one.height + two.height + 80;
  const scale = Math.max(1, Math.min(2, 4200 / Math.max(collectionWidth, collectionHeight)));
  expect(completeExport.readUInt32BE(16)).toBe(Math.round(collectionWidth * scale));
  expect(completeExport.readUInt32BE(20)).toBe(Math.round(collectionHeight * scale));
  expect((await saved(page)).briefVersions[0]).toEqual(frozen);
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

test("Review Draft reuses the finalized diagram preview, selected-view zoom and complete export without changing retained work", async ({ page }) => {
  const { errors, writes } = await open(page);
  await addCard(page, "Console entry");
  await current(page).getByRole("button", { name: "Add diagram", exact: true }).click();
  await current(page).getByRole("textbox", { name: "Diagram name", exact: true }).fill("Runtime interactions");
  await current(page).getByRole("button", { name: "Add diagram", exact: true }).click();
  await addCard(page, "Runtime runner");
  await current(page).getByRole("button", { name: "Save Session", exact: true }).click();
  await current(page).getByRole("textbox", { name: "Session Name", exact: true }).fill("Review parity architecture");
  await current(page).getByRole("button", { name: "Save Session", exact: true }).click();
  await current(page).getByRole("button", { name: "Finalize Brief", exact: true }).click();
  await current(page).getByRole("button", { name: "Finalize Brief", exact: true }).click();
  await expect.poll(async () => (await saved(page))?.briefVersions?.length).toBe(1);
  const referenceImage = await current(page).locator("img").getAttribute("src");
  const frozen = (await saved(page)).briefVersions;
  await current(page).getByRole("button", { name: "Close finalized brief", exact: true }).click();
  await current(page).getByRole("button", { name: "Build From Brief", exact: true }).click();
  await current(page).getByRole("button", { name: "Review Draft", exact: true }).click();
  const review = current(page);
  await expect(review.locator("img")).toHaveCount(1);
  await expect(review.locator("img")).toHaveAttribute("src", referenceImage);
  await expect(review.getByRole("status").filter({ hasText: "Diagram 1 of 2" })).toBeVisible();
  await review.getByRole("button", { name: "View finalized context snapshot", exact: true }).hover();
  await review.getByRole("button", { name: "Next diagram", exact: true }).click();
  await expect(review.getByRole("status").filter({ hasText: "Diagram 2 of 2" })).toBeVisible();
  const selectedImage = await review.locator("img").getAttribute("src");
  expect(decodeURIComponent(selectedImage)).toContain("Runtime runner");
  expect(selectedImage).not.toBe(referenceImage);
  await review.getByRole("button", { name: "View Snapshot", exact: true }).click();
  await expect(current(page).locator("img")).toHaveAttribute("src", selectedImage);
  await current(page).getByRole("button", { name: "Zoom in snapshot", exact: true }).click();
  await expect(current(page).getByRole("button", { name: "Fit snapshot", exact: true })).toContainText("125%");
  await current(page).getByRole("button", { name: "Close snapshot viewer", exact: true }).click();
  const downloadReady = page.waitForEvent("download");
  await review.getByRole("button", { name: "Export Preview", exact: true }).click();
  const download = await downloadReady;
  expect(download.suggestedFilename()).toBe("context-brief-diagrams.png");
  const stream = await download.createReadStream(), chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const png = Buffer.concat(chunks);
  expect(png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
  expect(png.readUInt32BE(20)).toBeGreaterThan(png.readUInt32BE(16));
  expect((await saved(page)).briefVersions).toEqual(frozen);
  expect((await saved(page)).applyReceiptRecorded).not.toBe(true);
  await page.screenshot({ path: test.info().outputPath("review-draft-diagram-parity.png") });
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

test("single retained snapshot and short note stay compact without redundant navigation", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const { errors, writes } = await open(page);
  const shortNote = "A single retained architecture view with its original short handoff note.";
  await current(page).getByRole("textbox", { name: "Work Design context note", exact: true }).fill(shortNote);
  await current(page).getByRole("button", { name: "Save Session", exact: true }).click();
  await current(page).getByRole("textbox", { name: "Session Name", exact: true }).fill("Single retained view");
  await current(page).getByRole("button", { name: "Save Session", exact: true }).click();
  await current(page).getByRole("button", { name: "Finalize Brief", exact: true }).click();
  await current(page).getByRole("button", { name: "Finalize Brief", exact: true }).click();
  await expect(current(page).getByRole("button", { name: "Next diagram", exact: true })).toHaveCount(0);
  await expect(current(page).getByRole("button", { name: "Previous diagram", exact: true })).toHaveCount(0);
  await expect(current(page).getByRole("button", { name: "Read full note", exact: true })).toHaveCount(0);
  const note = current(page).getByText(shortNote, { exact: true });
  await note.scrollIntoViewIfNeeded();
  await expect(note).toBeVisible();
  await expect.poll(async () => {
    await note.scrollIntoViewIfNeeded();
    return note.evaluate(el => {
    const box = el.getBoundingClientRect();
    for (let parent = el.parentElement; parent; parent = parent.parentElement) {
      if (["hidden", "auto", "scroll", "clip"].includes(getComputedStyle(parent).overflowY)) {
        const bounds = parent.getBoundingClientRect();
        if (box.top < bounds.top - 2 || box.bottom > bounds.bottom + 2) return false;
      }
    }
    return box.left >= 0 && box.right <= innerWidth && box.bottom <= innerHeight;
    });
  }).toBe(true);
  await page.screenshot({ path: test.info().outputPath("single-brief-compact.png") });
  await current(page).getByRole("button", { name: "View Snapshot", exact: true }).click();
  await expect(current(page).getByRole("button", { name: "Next diagram", exact: true })).toHaveCount(0);
  await current(page).getByRole("button", { name: "Zoom in snapshot", exact: true }).click();
  await expect(current(page).getByRole("button", { name: "Fit snapshot", exact: true })).toContainText("125%");
  expect(errors).toEqual([]); expect(writes).toEqual([]);
});

test("expanded note edits share the draft and finalization reviews the saved version in the full modal", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { errors, writes } = await open(page);
  const fullNote = "Current system and target architecture.\n\n" + "Explain source custody, execution boundaries and recovery. ".repeat(22);
  const compact = current(page).getByRole("textbox", { name: "Work Design context note", exact: true });
  const expand = current(page).getByRole("button", { name: "Expand context note", exact: true });
  const fieldBox = await compact.boundingBox(), expandBox = await expand.boundingBox();
  expect(expandBox.x).toBeGreaterThan(fieldBox.x);
  expect(expandBox.x + expandBox.width).toBeLessThan(fieldBox.x + fieldBox.width);
  expect(expandBox.y).toBeGreaterThanOrEqual(fieldBox.y);
  expect(expandBox.y + expandBox.height).toBeLessThan(fieldBox.y + fieldBox.height);
  expect(expandBox.width).toBeLessThanOrEqual(28);
  expect(expandBox.height).toBeLessThanOrEqual(28);
  expect(fieldBox.x + fieldBox.width - expandBox.x - expandBox.width).toBeGreaterThanOrEqual(14);
  const expandGlyph = await expand.locator("svg").boundingBox();
  expect(expandGlyph.width).toBeGreaterThanOrEqual(12);
  expect(expandGlyph.height).toBeGreaterThanOrEqual(12);
  await compact.locator("..").screenshot({ path: test.info().outputPath("compact-note-expand-placement.png") });
  await expand.click();
  const editor = current(page).getByRole("textbox", { name: "Expanded Work Design context note", exact: true });
  await expect(editor).toBeEditable();
  expect((await editor.boundingBox()).height).toBeGreaterThan(350);
  await expect(editor).toHaveAttribute("maxlength", "8000");
  await editor.fill(fullNote);
  await current(page).getByRole("button", { name: "Done", exact: true }).click();
  await expect(compact).toHaveValue(fullNote);
  await current(page).getByRole("button", { name: "Expand context note", exact: true }).click();
  await expect(current(page).getByRole("textbox", { name: "Expanded Work Design context note", exact: true })).toHaveValue(fullNote);
  await current(page).getByRole("button", { name: "Close context note editor", exact: true }).click();
  await addCard(page, "Original boundary");
  await current(page).getByRole("button", { name: "Save Session", exact: true }).click();
  await current(page).getByRole("textbox", { name: "Session Name", exact: true }).fill("Saved architecture review");
  await current(page).getByRole("button", { name: "Save Session", exact: true }).click();
  await current(page).getByRole("button", { name: "Finalize Brief", exact: true }).click();
  await expect(current(page).locator('[data-width="wide"]')).toBeVisible();
  await expect(current(page).getByText("Not finalized", { exact: true })).toBeVisible();
  await expect(current(page).getByRole("button", { name: "Finalize Brief", exact: true })).toBeEnabled();
  await expect(current(page).getByRole("button", { name: "Read full note", exact: true })).toBeVisible();
  const image = current(page).locator('img[src^="data:image/svg+xml"]');
  expect(decodeURIComponent((await image.getAttribute("src")).split(",").slice(1).join(","))).toContain("Original boundary");
  expect((await saved(page)).briefVersions).toHaveLength(0);
  await page.screenshot({ path: test.info().outputPath("full-pre-finalization-review.png") });
  await current(page).getByRole("button", { name: "Close finalize brief", exact: true }).click();
  await expect(compact).toBeEditable();
  expect((await saved(page)).briefVersions).toHaveLength(0);
  await current(page).getByRole("button", { name: "Finalize Brief", exact: true }).click();
  await current(page).getByRole("button", { name: "Finalize Brief", exact: true }).click();
  await expect(current(page).getByText("Brief Finalized", { exact: true })).toBeVisible();
  await expect.poll(async () => (await saved(page))?.briefVersions?.length).toBe(1);
  const frozen = (await saved(page)).briefVersions[0];
  await current(page).getByRole("button", { name: "Close finalized brief", exact: true }).click();
  await current(page).getByRole("button", { name: "Expand context note", exact: true }).click();
  await expect(current(page).getByRole("textbox", { name: "Expanded Work Design context note", exact: true })).toHaveValue(fullNote);
  await expect(current(page).getByRole("textbox", { name: "Expanded Work Design context note", exact: true })).toHaveJSProperty("readOnly", true);
  await current(page).getByRole("button", { name: "Done", exact: true }).click();
  await current(page).getByRole("button", { name: "View Finalized Brief", exact: true }).click();
  await current(page).getByRole("button", { name: "Reopen Brief", exact: true }).click();
  await compact.fill("Changed draft note: the saved revision must be reviewed before a second finalization.");
  await current(page).getByRole("textbox", { name: "Edit Original boundary title", exact: true }).fill("Updated boundary");
  await current(page).getByRole("button", { name: "Finalize Brief", exact: true }).click();
  await expect(current(page).getByRole("button", { name: "Finalize Brief", exact: true })).toBeDisabled();
  await expect(current(page).getByText(/Save the current Context Session before reviewing/)).toBeVisible();
  await expect(current(page).locator("img")).toHaveCount(0);
  await current(page).getByRole("button", { name: "Close finalize brief", exact: true }).click();
  await current(page).getByRole("button", { name: "Save Session", exact: true }).click();
  await current(page).getByRole("textbox", { name: "Session Name", exact: true }).fill("Revised architecture review");
  await current(page).getByRole("button", { name: "Save Session", exact: true }).click();
  await current(page).getByRole("button", { name: "Finalize Brief", exact: true }).click();
  await expect(current(page).getByRole("button", { name: "Finalize Brief", exact: true })).toBeEnabled();
  const revised = decodeURIComponent((await current(page).locator('img[src^="data:image/svg+xml"]').getAttribute("src")).split(",").slice(1).join(","));
  expect(revised).toContain("Updated boundary"); expect(revised).not.toContain("Original boundary");
  await expect(current(page).getByText("Changed draft note: the saved revision must be reviewed before a second finalization.", { exact: true })).toBeVisible();
  expect((await saved(page)).briefVersions).toHaveLength(1);
  expect((await saved(page)).briefVersions[0]).toEqual(frozen);
  await page.screenshot({ path: test.info().outputPath("current-saved-review-preserves-old-version.png") });
  expect(errors).toEqual([]); expect(writes).toEqual([]);
});

for (const [option, target] of [["Link To Existing Work", "Existing Work Link"], ["Retire Duplicate", "Retirement Record"]]) {
  test(`shared brief review retains the ${option} decision before and after finalization`, async ({ page }) => {
    const { errors, writes } = await open(page);
    await current(page).getByRole("button", { name: new RegExp(`^${option}`) }).click();
    await current(page).getByRole("textbox", { name: "Work Design context note", exact: true }).fill(`${option}: retain the system context and recorded reason.`);
    await current(page).getByRole("button", { name: "Save Session", exact: true }).click();
    await current(page).getByRole("textbox", { name: "Session Name", exact: true }).fill(`${option} context`);
    await current(page).getByRole("button", { name: "Save Session", exact: true }).click();
    await current(page).getByRole("button", { name: "Finalize Brief", exact: true }).click();
    await expect(current(page).getByRole("heading", { name: target, exact: true })).toBeVisible();
    await expect(current(page).getByText(target, { exact: true }).last()).toBeVisible();
    await current(page).getByRole("button", { name: "Finalize Brief", exact: true }).click();
    await expect(current(page).getByText("Brief Finalized", { exact: true })).toBeVisible();
    await expect(current(page).getByRole("heading", { name: target, exact: true })).toBeVisible();
    expect(errors).toEqual([]); expect(writes).toEqual([]);
  });
}

test("Build Tree sends the selected item identity from the admitted observations envelope", async ({ page }) => {
  const { errors } = await openReasoningAdvisor(page, "tree");
  const before = await saved(page), received = [];
  await page.route("**/api/delivery/work-design/**/assist", async route => {
    const body = route.request().postDataJSON(); received.push(body);
    await route.fulfill({ json: isolatedAdvice(body) });
  });
  const d = current(page);
  await d.getByRole("textbox", { name: "Work Design tree advisor prompt", exact: true }).fill("Inspect this draft tree without changing it.");
  await d.getByRole("button", { name: "run", exact: true }).click();
  await expect.poll(() => received.length).toBe(1);
  const body = received[0], context = JSON.parse(body.draftScope.scope.context);
  expect(body.taskKind).toBe("tree_advice");
  expect(body.selectedNodeId).toBe(context.observations.selectedNodeId);
  expect(body.selectedNodeId).toBe(body.tree.id);
  expect(typeof body.selectedNodeId).toBe("string");
  expect(body.sourceRevision).toBe("version-17");
  expect(context.observations.finalizedBrief.ref).toBeTruthy();
  await expect(d.getByText("Isolated complete response; no provider invoked.", { exact: true })).toBeVisible();
  expect((await saved(page)).treeDraft.tree).toEqual(before.treeDraft.tree);
  expect(errors).toEqual([]);
});


test("Build Tree applies a complete large structured reply and undo preserves the finalized brief", async ({ page }) => {
  const { errors, writes } = await openReasoningAdvisor(page, "tree");
  const before = await saved(page); let requests = 0;
  await page.route("**/api/delivery/work-design/**/assist", async route => {
    requests++; const body = route.request().postDataJSON(), response = isolatedAdvice(body);
    response.text = JSON.stringify({ intent: "draft", message: "Three complete local outcomes proposed; no provider invoked.", edits: [{ field: "tree", value: {
      addNodes: Array.from({ length: 3 }, (_, i) => ({ parentId: body.tree.id, node: {
        id: `synthetic-large-feature-${i}`, kind: "Feature", title: `Complete outcome ${i + 1}`, description: "A complete synthetic draft outcome",
        draftBody: "Retained evidence and acceptance. ".repeat(550), remark: "Local draft only", children: [] } })), updateNodes: [], removeNodeIds: [] } }] });
    expect(response.text.length).toBeGreaterThan(48000);
    await route.fulfill({ json: response });
  });
  const d = current(page);
  await d.getByRole("textbox", { name: "Work Design tree advisor prompt", exact: true }).fill("Add the requested complete outcomes to this local tree.");
  await d.getByRole("button", { name: "run", exact: true }).click();
  await expect(d.getByText("Three complete local outcomes proposed; no provider invoked.", { exact: true })).toBeVisible();
  await expect.poll(async () => (await saved(page)).treeDraft.tree.children.filter(n => n.id.startsWith("synthetic-large-feature-")).length).toBe(3);
  const after = await saved(page);
  expect(after.treeDraft.tree.children.find(n => n.id === "synthetic-large-feature-2").draftBody).toBe("Retained evidence and acceptance. ".repeat(550));
  expect(after.briefVersions).toEqual(before.briefVersions);
  await d.getByRole("button", { name: "Undo advisor edit", exact: true }).click();
  await expect.poll(async () => (await saved(page)).treeDraft.tree).toEqual(before.treeDraft.tree);
  expect((await saved(page)).briefVersions).toEqual(before.briefVersions);
  expect(requests).toBe(1); expect(errors).toEqual([]); expect(writes).toEqual([]);
});
