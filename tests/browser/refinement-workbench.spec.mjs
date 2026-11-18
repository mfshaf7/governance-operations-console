import { test, expect } from "../support/filled-surface-layout.mjs";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { refinementWorkbenchProjection } from "../support/refinement-workbench-fixture.mjs";
const require = createRequire(import.meta.url);
const { deliveryReadModel } = require("../../src/domain-workspaces/delivery/read-model/projections/root-projection.ts");
const base = process.env.CONSOLE_TEST_BASE_URL ?? "http://127.0.0.1:4317";
if (new URL(base).port === "3317") throw Error("Use isolated preview for synthetic workbench tests.");
test.use({ actionTimeout: 15000, navigationTimeout: 60000 }); test.setTimeout(120000);
const modal = page => page.getByRole("dialog").last();
async function openWorkbench(page, { saved = false, projectionHold = null, assist = null, configure = null, openMetadata = true, projectionResponse = null } = {}) {
  const adviceRequests = [];
  const model = structuredClone(deliveryReadModel), projection = refinementWorkbenchProjection(), writes = [], errors = [], saves = [];
  model.source_truth = "OpenProject-backed OOS"; model.generated_at = new Date().toISOString(); model.projection_state.checked_at = model.generated_at;
  configure?.(projection);
  let record = null;
  let packetReads = 0;
  page.on("pageerror", e => errors.push(e.message));
  await page.route("**/api/**", async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname;
    if (path === "/api/delivery/workspace") {
      const q = url.searchParams, sliced = q.get("view") === "register" ? { ...model, packages: model.packages.filter(row => q.has("id") ? row.delivery_package_id === q.get("id") : row.workflow_phase === "refinement") } : model;
      return route.fulfill({ json: { mode: "live", status: "current", error: null, projection: sliced, ...(q.get("view") === "register" ? { page: { selection: { surface: q.get("surface"), scope: q.get("scope"), query: q.get("q"), status: q.get("status") }, next_cursor: null } } : {}) } });
    }
    if (path === "/api/console/capabilities") return route.fulfill({ json: { artifactType: "console-runtime-capability-projection", schemaVersion: 1, mode: "live", capabilities: [] } });
    if (path.startsWith("/api/saved-work/")) {
      if (!saved || !path.includes("/refinement/")) return route.fulfill({ json: { mode: "disconnected-preview" } });
      if (req.method() === "POST") { const body = req.postDataJSON(); saves.push(body); record = { revision: (record?.revision ?? 0) + 1, payload_json: body.payload_json, content_digest: "sha256:" + createHash("sha256").update(body.payload_json).digest("hex"), acknowledgement_id: "ack:synthetic", saved_at: new Date().toISOString() }; }
      return route.fulfill({ json: { mode: "live", operatorId: "operator:synthetic", snapshot: { kind: "refinement", subject_id: decodeURIComponent(path.split("/").at(-1)), record, recoveries: [] } } });
    }
    if (path.includes("/api/delivery/refinement/") && path.endsWith("/projection")) { packetReads++; if (projectionHold) await projectionHold; if (projectionResponse) return route.fulfill(await projectionResponse(packetReads, projection)); return route.fulfill({ json: { mode: "live", status: "current", error: null, observedAt: new Date().toISOString(), projection } }); }
    if (assist && path.includes("/api/delivery/refinement/") && path.endsWith("/assist")) {
      const body = req.postDataJSON(); adviceRequests.push(body);
      return route.fulfill({ json: await assist(body) });
    }
    if (req.method() !== "GET") writes.push({ path, method: req.method() });
    return route.fulfill({ status: 503, json: { error: "Unrelated synthetic owner unavailable" } });
  });
  await page.goto(base + "/?dev=1", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => { const b = document.querySelector('button[title="Open DELIVERY"]'); return b && Object.keys(b).some(k => k.startsWith("__reactProps$")); });
  await page.getByTitle("Open DELIVERY", { exact: true }).click();
  await page.getByRole("button", { name: /04.*Refinement/i }).click();
  await page.getByRole("row").filter({ hasText: "Adapter Contract Metadata Repair" }).click();
  await page.getByRole("button", { name: "Open Refinement Hub", exact: true }).click();
  if (openMetadata) await modal(page).getByRole("group", { name: "Refinement steps", exact: true }).getByRole("button", { name: /Metadata Workbench/i }).click();
  return { model, projection, writes, errors, saves, adviceRequests, record: () => record, packetReads: () => packetReads };
}

for (const width of [1280, 1700]) test(`long real-shaped work tree is navigable and full descriptions are safely formatted at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: width === 1280 ? 800 : 1050 });
  const h = await openWorkbench(page), d = modal(page), tree = d.locator('[data-structure-locked="true"]');
  await expect(tree.getByRole("button").filter({ hasText: "Story 1.1" })).toHaveCount(0);
  await expect(tree.locator('button[aria-label^="Delete"], button[aria-label^="Add"], input')).toHaveCount(0);
  await expect(tree.locator('[data-kind="Epic"]')).toHaveCount(1);
  await expect(d.getByRole("textbox", { name: "Refinement metadata advisor prompt", exact: true })).toBeDisabled();
  await d.getByRole("button", { name: "Expand all", exact: true }).click();
  await expect(tree.locator('[data-kind][data-role]')).toHaveCount(36);
  await expect(tree.locator('[data-kind="Epic"]')).toContainText("7 work items");
  await tree.getByRole("button", { name: "Collapse User stories under Feature 1 — reviewed outcome", exact: true }).click();
  await expect(tree.locator('[data-kind][data-role]')).toHaveCount(29);
  await d.getByRole("button", { name: "Expand all", exact: true }).click();
  await expect(tree.locator('[data-kind][data-role]')).toHaveCount(36);
  await expect.poll(() => tree.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(2);
  await d.getByRole("button", { name: "Collapse groups", exact: true }).click();
  expect(await tree.locator("small").first().innerText()).not.toContain("##");
  expect((await tree.locator("small").first().innerText()).length).toBeLessThanOrEqual(160);
  await d.getByRole("button", { name: "Read work item", exact: true }).click();
  const details = modal(page), body = details.getByRole("article", { name: "Full work description", exact: true });
  await expect(body.getByRole("heading", { name: "What this achieves", exact: true })).toBeVisible();
  await expect(body.locator('xpath=ancestor::section[@data-description-format][1]')).toHaveAttribute("data-description-format", "lines");
  await expect(body.locator('section[data-frame="padded"]')).toHaveCount(0);
  await expect(body.getByRole("listitem")).toHaveCount(2);
  await expect(body.locator("pre")).toContainText("<script>literal work content, never executable</script>");
  await expect(body.locator("script")).toHaveCount(0);
  await expect(body.getByRole("link", { name: "Documentation", exact: true })).toHaveAttribute("rel", "noopener noreferrer");
  await page.screenshot({ path: test.info().outputPath("formatted-work-description.png") });
  await details.getByRole("button", { name: "Close work item details", exact: true }).click();
  await d.getByRole("searchbox", { name: "Find work items", exact: true }).fill("Story 1.1");
  await expect(tree.getByRole("button").filter({ hasText: "Story 1.1" })).toBeVisible();
  await expect(tree.getByRole("button").filter({ hasText: "Story 2.1" })).toHaveCount(0);
  await tree.getByRole("button").filter({ hasText: "Story 1.1" }).click();
  await expect(d.getByRole("textbox", { name: "Implementation repository", exact: true })).toHaveCount(0);
  await expect(d.getByRole("button", { name: "Change field", exact: true })).toHaveCount(0);
  await tree.getByRole("button", { name: /^Edit Implementation repository for User story/ }).click();
  await expect(d.getByRole("textbox", { name: "Implementation repository", exact: true })).toBeVisible();
  await expect(d.getByRole("heading", { name: "Implementation repository", exact: true })).toBeVisible();
  await expect(d.getByRole("textbox", { name: "Refinement metadata advisor prompt", exact: true })).toBeEnabled();
  await d.getByRole("searchbox", { name: "Find work items", exact: true }).fill("");
  await d.getByRole("button", { name: "Expand Feature 1 — reviewed outcome", exact: true }).click();
  await expect(tree.getByRole("button").filter({ hasText: "Story 1.1" })).toBeVisible();
  await tree.getByRole("button", { name: /^Edit Effort for User story/ }).click();
  await expect(d.getByRole("spinbutton", { name: "Effort", exact: true })).toHaveAttribute("min", "0");
  await d.getByRole("spinbutton", { name: "Effort", exact: true }).fill("-2");
  await expect(d.getByRole("button", { name: "Mark reviewed", exact: true })).toBeDisabled();
  await d.getByRole("button", { name: "Needs review", exact: true }).click();
  await expect(d.getByRole("button", { name: "Needs review", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(tree.getByRole("button").filter({ hasText: "Story 1.1" })).toBeVisible();
  await expect(tree.getByRole("button").filter({ hasText: "Story 1.2" })).toHaveCount(0);
  await d.getByRole("button", { name: "Needs review", exact: true }).click();
  await d.getByRole("button", { name: "Reset", exact: true }).click();
  await tree.getByRole("button", { name: /^Edit Notes for User story/ }).click();
  await expect(d.getByRole("textbox", { name: "Notes", exact: true })).toHaveAttribute("maxlength", "120");
  await expect(tree.getByRole("button", { name: /^Edit Notes for User story/ })).toContainText("Optional · not set");
  await tree.getByRole("button", { name: /^Edit Source Shape for User story/ }).click();
  await expect(d.getByText("Generated value · read-only", { exact: true })).toBeVisible();
  await d.getByRole("searchbox", { name: "Find work items", exact: true }).fill("no matching item exists");
  await expect(d.getByText("No work items match. Clear the search or the Needs review filter to see the full tree.", { exact: true })).toBeVisible();
  await d.getByRole("searchbox", { name: "Find work items", exact: true }).fill("");
  await page.screenshot({ path: test.info().outputPath("workbench-layout.png") });
  expect(h.writes).toEqual([]); expect(h.errors).toEqual([]);
});

test("shared field review targets only the explicit selection and idle renders do not generate saves", async ({ page }) => {
  await page.setViewportSize({ width: 1700, height: 1050 });
  const h = await openWorkbench(page, { saved: true }), d = modal(page), tree = d.locator('[data-structure-locked="true"]');
  await expect(d.locator('[data-saved-work-status="saved"]')).toBeVisible();
  const before = h.saves.length;
  await page.waitForTimeout(10500);
  expect(h.saves.length).toBe(before);
  await d.getByRole("radio", { name: "Multiple items", exact: true }).click();
  await expect(d.getByText("Select two or more work items below to see their common fields.", { exact: true })).toBeVisible();
  await d.getByRole("button", { name: "Expand Feature 1 — reviewed outcome", exact: true }).click();
  await tree.getByRole("button").filter({ hasText: "Story 1.1" }).click();
  await tree.getByRole("button").filter({ hasText: "Story 1.2" }).click();
  await expect(d.getByRole("textbox", { name: "Implementation repository", exact: true })).toHaveCount(0);
  await d.getByRole("button", { name: "Edit shared Implementation repository", exact: true }).click();
  await expect(d.getByText("Different current values", { exact: true })).toBeVisible();
  await d.getByRole("textbox", { name: "Implementation repository", exact: true }).fill("repository-reviewed");
  await d.getByRole("button", { name: "Mark 2 items reviewed", exact: true }).click();
  await expect(d.locator('[data-saved-work-status="saved"]')).toBeVisible();
  await expect(d.getByRole("button", { name: "Edit shared Implementation repository", exact: true })).toContainText("2 reviewed");
  const value = JSON.parse(h.record().payload_json), edited = Object.entries(value.metadata.draftValues).filter(([, v]) => v === "repository-reviewed");
  expect(edited).toHaveLength(2);
  expect(Object.keys(value.metadata.fieldResolutions)).toHaveLength(2);
  await d.getByRole("button", { name: "Edit shared Priority", exact: true }).click();
  await d.getByLabel("Priority", { exact: true }).click();
  await page.getByRole("option", { name: "High", exact: true }).click();
  await d.getByRole("button", { name: "Mark 2 items reviewed", exact: true }).click();
  await page.screenshot({ path: test.info().outputPath("shared-draft-review.png") });
  await d.getByRole("button", { name: "Clear selection (2)", exact: true }).click();
  await expect(d.getByText("Select two or more work items below to see their common fields.", { exact: true })).toBeVisible();
  await tree.getByRole("button").filter({ hasText: "Adapter Contract Metadata Repair" }).click();
  await tree.getByRole("button").filter({ hasText: "Story 1.1" }).click();
  await expect(d.getByText("These items have no editable field in common. Change the selection or edit one item at a time.", { exact: true })).toBeVisible();
  await expect(d.getByRole("button", { name: "Mark 2 items reviewed", exact: true })).toHaveCount(0);
  expect(h.writes).toEqual([]); expect(h.errors).toEqual([]);
});

test("a slow live packet shows loading without exposing sample fields", async ({ page }) => {
  let release;
  const held = new Promise(resolve => { release = resolve; });
  const opening = openWorkbench(page, { projectionHold: held });
  try {
    await expect(page.getByText("Loading Refinement…", { exact: true })).toBeVisible({ timeout: 30000 });
    await expect(page.locator('[data-structure-locked="true"]')).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Open Metadata Workbench", exact: true })).toHaveCount(0);
    release();
    const h = await opening;
    await expect(modal(page).getByRole("heading", { name: "Work items", exact: true })).toBeVisible();
    expect(h.writes).toEqual([]); expect(h.errors).toEqual([]);
  } finally { release(); await opening.catch(() => {}); }
});


function fieldAdvice(body) {
 return {schema_version:1,request_id:"advice:synthetic",correlation_id:"correlation:synthetic",response_id:"response:synthetic",status:"ready",confidence:"high",required_operator_action:"review",
  suggestion:{field_key:body.fieldKey,value:"reviewed-repo",summary:"Drafted only for the selected work items.",rationale:"Synthetic transport proof; no provider invoked.",resolution:"ai_drafted"},
  evidence:{generated_at:new Date().toISOString(),model_profile_id:"delivery-refinement-advisor-v1",task_contract_ref:"oos.delivery-refinement.v1",output_schema_ref:"test://refinement",cgg_packet_ref:"test://packet",redaction_receipt_ref:"test://redaction",gateway_audit_ref:"test://audit"}};
}

test("individual advice carries ancestor drafts and stays unreviewed until explicit review",async({page})=>{
 await page.setViewportSize({width:1700,height:1050});
 const h=await openWorkbench(page,{assist:async body=>fieldAdvice(body)}),d=modal(page),tree=d.locator('[data-structure-locked="true"]');
 await tree.getByRole("button",{name:/^Edit Target PI for Epic/}).click();
 await d.getByLabel("Target PI",{exact:true}).click();await page.getByRole("option",{name:"PI-2026-04",exact:true}).click();
 await d.getByRole("searchbox",{name:"Find work items",exact:true}).fill("Story 1.1");
 await tree.getByRole("button").filter({hasText:"Story 1.1"}).click();
 await tree.getByRole("button",{name:/^Edit Implementation repository for User story/}).click();
 await d.getByRole("textbox",{name:"Refinement metadata advisor prompt",exact:true}).fill("Help fill this in using the project settings.");
 await d.getByRole("button",{name:"run",exact:true}).click();
 await expect(d.getByRole("textbox",{name:"Implementation repository",exact:true})).toHaveValue("reviewed-repo");
 expect(h.adviceRequests).toHaveLength(1);const request=h.adviceRequests[0];
 expect(request.packetRevision).toBe(h.projection.packet.packet_revision); expect(request.sourceRevision).toBe(h.projection.source_revision);
 expect(request.selectedNodeIds).toHaveLength(1);
 expect(request.relatedDrafts.some(value=>value.value==="PI-2026-04" && value.node_id!==request.selectedNodeIds[0])).toBe(true);
 await expect(tree.getByRole("button",{name:/^Edit Implementation repository for User story/})).toContainText("AI draft · review needed");
 await d.getByRole("button",{name:"Mark reviewed",exact:true}).click();
 await expect(tree.getByRole("button",{name:/^Edit Implementation repository for User story/})).toContainText("Reviewed draft");
 expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});

test("shared advice keeps mixed per-item values and applies only to the selected set",async({page})=>{
 await page.setViewportSize({width:1700,height:1050});
 const h=await openWorkbench(page,{assist:async body=>fieldAdvice(body)}),d=modal(page),tree=d.locator('[data-structure-locked="true"]');
 await d.getByRole("radio",{name:"Multiple items",exact:true}).click();
 await d.getByRole("button",{name:"Expand Feature 1 — reviewed outcome",exact:true}).click();
 await tree.getByRole("button").filter({hasText:"Story 1.1"}).click();await tree.getByRole("button").filter({hasText:"Story 1.2"}).click();
 await d.getByRole("button",{name:"Edit shared Implementation repository",exact:true}).click();
 await d.getByRole("textbox",{name:"Refinement metadata advisor prompt",exact:true}).fill("Fill this for the selected items.");
 await d.getByRole("button",{name:"run",exact:true}).click();
 await expect(d.getByRole("textbox",{name:"Implementation repository",exact:true})).toHaveValue("reviewed-repo");
 expect(h.adviceRequests).toHaveLength(1);const request=h.adviceRequests[0];
 expect(request.selectedNodeIds).toHaveLength(2);expect(request.sourceValue).toBe("");expect(request.draftValue).toBe("");
 const values=request.relatedDrafts.filter(value=>value.field_key===request.fieldKey);
 expect(values).toHaveLength(2);expect(new Set(values.map(value=>value.value)).size).toBe(2);
 await expect(d.getByRole("button",{name:"Edit shared Implementation repository",exact:true})).toContainText("2 to review");
 expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});


test("native per-item choices survive individual and shared review while integer controls reject fractions", async ({page}) => {
 await page.setViewportSize({width:1700,height:1050});
 const h=await openWorkbench(page,{configure:projection=>{
  const fields=projection.packet.draft_groups.flatMap(group=>group.fields),priority=fields.find(field=>field.backend_field==="priority");
  priority.allowed_values=[];
  priority.target_allowed_values=Object.fromEntries(priority.target_node_ids.map(id=>[id,id==="1100"?["Normal","High"]:id==="1101"?["Normal"]:["Critical"]]));
  priority.target_values=Object.fromEntries(priority.target_node_ids.map(id=>[id,["1100","1101"].includes(id)?"Normal":"Critical"]));
  fields.find(field=>field.backend_field==="effort").numeric_type="integer";
 }}),d=modal(page),tree=d.locator('[data-structure-locked="true"]');
 await d.getByRole("searchbox",{name:"Find work items",exact:true}).fill("Story 1.1");
 await tree.getByRole("button").filter({hasText:"Story 1.1"}).click();
 await tree.getByRole("button",{name:/^Edit Priority for User story/}).click();
 await d.getByLabel("Priority",{exact:true}).click();
 await expect(page.getByRole("option",{name:"High",exact:true})).toBeVisible();
 await expect(page.getByRole("option",{name:"Critical",exact:true})).toHaveCount(0);
 await page.getByRole("option",{name:"High",exact:true}).click();
 await d.getByRole("button",{name:"Mark reviewed",exact:true}).click();
 await tree.getByRole("button",{name:/^Edit Effort for User story/}).click();
 const number=d.getByRole("spinbutton",{name:"Effort",exact:true});
 await expect(number).toHaveAttribute("step","1");await number.fill("1.5");
 await expect(d.getByText("Enter a whole number of zero or more.",{exact:true})).toBeVisible();
 await expect(d.getByRole("button",{name:"Mark reviewed",exact:true})).toBeDisabled();
 await number.fill("2");await d.getByRole("button",{name:"Mark reviewed",exact:true}).click();
 await d.getByRole("searchbox",{name:"Find work items",exact:true}).fill("Story 1.");
 await d.getByRole("radio",{name:"Multiple items",exact:true}).click();
 await tree.getByRole("button").filter({hasText:"Story 1.1"}).click();
 await tree.getByRole("button").filter({hasText:"Story 1.2"}).click();
 await d.getByRole("button",{name:"Edit shared Priority",exact:true}).click();
 await d.getByLabel("Priority",{exact:true}).click();
 await expect(page.getByRole("option",{name:"Normal",exact:true})).toBeVisible();
 await expect(page.getByRole("option",{name:"High",exact:true})).toHaveCount(0);
 await expect(page.getByRole("option",{name:"Critical",exact:true})).toHaveCount(0);
 await page.getByRole("option",{name:"Normal",exact:true}).click();
 await d.getByRole("button",{name:"Mark 2 items reviewed",exact:true}).click();
 await page.screenshot({path:test.info().outputPath("native-choice-review.png")});
 expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});


for (const width of [1280,2560]) test(`Refinement read states fill their shell and retry in place without mutation at ${width}`, async({page})=>{
 await page.setViewportSize({width,height:width===1280?800:1337});
 let release;const held=new Promise(resolve=>{release=resolve;});
 const h=await openWorkbench(page,{openMetadata:false,projectionResponse:async count=>{
  if(count===1)return {status:502,json:{code:"delivery_oos_unavailable",error:"The operation was aborted due to timeout",mode:"live",status:"offline"}};
  await held;return {json:{mode:"live",status:"current",error:null,observedAt:new Date().toISOString(),projection:h.projection}};
 }});
 try{
  const d=modal(page),shell=d.locator('[data-teras-modal="delivery-refinement-unavailable"]');
  await expect(d.getByRole("heading",{name:"Refinement couldn’t load",exact:true})).toBeVisible();
  await expect(shell).toHaveAttribute("data-width","medium");
  await expect(d.getByText("Missing Packet",{exact:true})).toHaveCount(0);
  await expect(d.getByText("not ready",{exact:true})).toHaveCount(0);
  await expect(d.getByText("The operation was aborted due to timeout",{exact:true})).toBeHidden();
  const frame=d.locator('[class*="terasEmptyStateFill"]'),a=await shell.boundingBox(),b=await frame.boundingBox();
  expect(b.width/a.width).toBeGreaterThan(.9);
  await page.screenshot({path:test.info().outputPath("refinement-read-error.png")});
  await d.getByText("Technical details",{exact:true}).click();
  await expect(d.getByText("The operation was aborted due to timeout",{exact:true})).toBeVisible();
  await d.getByRole("button",{name:"Retry loading",exact:true}).click();
  await expect(d.getByRole("status").filter({hasText:"Loading Refinement…"})).toBeVisible();
  await expect(d.getByRole("button",{name:"Retry loading",exact:true})).toHaveCount(0);
  await expect(d.getByText("Missing Packet",{exact:true})).toHaveCount(0);
  const loader=d.locator('[data-teras-loading="panel"]'),c=await loader.boundingBox();expect(c.width/a.width).toBeGreaterThan(.9);
  await expect(loader.locator('[data-teras-loading-signal="true"]')).toBeVisible();
  await page.screenshot({path:test.info().outputPath("refinement-read-loading.png")});
  expect(h.packetReads()).toBe(2);release();
  await expect(d.getByRole("heading",{name:"Refinement Hub",exact:true})).toBeVisible();
  expect(h.packetReads()).toBe(2);expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
 }finally{release();}
});
