import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { deliveryReadModel } = require("../../src/domain-workspaces/delivery/read-model/projections/root-projection.ts");
const base = process.env.CONSOLE_TEST_BASE_URL ?? "http://127.0.0.1:3320";
test.setTimeout(120_000);
test.use({ viewport: { width: 1700, height: 1000 }, actionTimeout: 15000, navigationTimeout: 60000 });

// Isolated presentation tests. Synthetic owner responses prove browser behaviour,
// never a successful live owner command or operating qualification.
async function deliveryHarness(page, { live = false, online = false } = {}) {
  const model = structuredClone(deliveryReadModel), writes = [], requests = [], errors = [];
  if (live) {
    const now = new Date().toISOString();
    model.generated_at = now; model.projection_state.checked_at = now;
    model.source_truth = "OpenProject-backed OOS";
  }
  page.on("pageerror", e => errors.push(String(e)));
  await page.route("**/api/**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (path === "/api/console/capabilities") return route.fulfill({ json: {
      artifactType: "console-runtime-capability-projection", schemaVersion: 1,
      mode: live ? "live" : "disconnected-preview", capabilities: [],
    } });
    if (path === "/api/delivery/workspace") return route.fulfill({ json: { mode: "live", projection: model } });
    if (path === "/api/delivery/intake") return route.fulfill({ status: 503, json: { error: "Isolated evidence owner unavailable" } });
    if (path.startsWith("/api/saved-work/")) return route.fulfill({ json: { mode: "disconnected-preview" } });
    if (path === "/api/delivery/catalog/projection") return route.fulfill({ json: {
      mode: "disconnected-preview", status: "current", observedAt: new Date().toISOString(), error: null, projection: null,
    } });
    if (path === "/api/agent-interaction" && request.method() === "GET") return route.fulfill({ json: {
      checkedAt: new Date().toISOString(), observedAt: new Date().toISOString(), endpoint: null,
      freshness: "live", model: "inspection-model", modelCount: 1, provider: "governed-ai-gateway",
      safetyMode: "oos-session/cgg-model-safe/governed-ai/manual-operator-request", status: online ? "online" : "offline",
    } });
    if (path === "/api/agent-interaction" && request.method() === "DELETE") return route.fulfill({ json: { closed: true } });
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
      writes.push(path); return route.fulfill({ status: 503, json: { error: "Isolated test: owner unavailable" } });
    }
    return route.fallback();
  });
  page.on("request", r => { if (new URL(r.url()).pathname === "/api/agent-interaction" && r.method() === "POST") requests.push(r.postDataJSON()); });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const b = document.querySelector('button[title="Open DELIVERY"]');
    const k = b && Object.keys(b).find(k => k.startsWith("__reactProps$"));
    return Boolean(k && b[k].onClick);
  });
  await page.locator('button[title="Open DELIVERY"]').click();
  const workspace = page.getByRole("dialog", { name: "Delivery Workspace", exact: true });
  await expect(workspace.locator('[data-delivery-home="home"]')).toBeVisible();
  return { model, writes, requests, errors, workspace,
    section: id => workspace.locator(`[data-delivery-workspace-section="${id}"]`).click(),
    refresh: async () => { const response = page.waitForResponse(r => new URL(r.url()).pathname === "/api/delivery/workspace"); await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange"))); await response; },
  };
}

async function reachable(page, target) {
  await target.scrollIntoViewIfNeeded();
  await expect.poll(async () => target.evaluate(e => {
    const r = e.getBoundingClientRect();
    for (let p = e.parentElement; p; p = p.parentElement) {
      const style = getComputedStyle(p), b = p.getBoundingClientRect();
      if (["auto", "scroll", "hidden", "clip"].includes(style.overflowY) && (r.top < b.top - 2 || r.bottom > b.bottom + 2)) return false;
    }
    return r.top >= 0 && r.bottom <= innerHeight;
  })).toBe(true);
}

const evidenceHeaders = {
  "Content-Type": "text/plain", "X-Agent-Context-Admitted": "true",
  "X-Agent-Context-Artifact": "sha256:" + "a".repeat(64), "X-Agent-CGG-Receipt": "synthetic:cgg-receipt",
  "X-Agent-Invocation": "synthetic:invocation", "X-Agent-Receipt": "synthetic:receipt",
  "X-Agent-Receipt-Digest": "sha256:" + "b".repeat(64), "X-Agent-Session": "synthetic:session",
};

test("Home advisor sends only on request through the governed Agent path and requires receipt evidence", async ({ page }) => {
  const h = await deliveryHarness(page, { live: true, online: true });
  const advisor = h.workspace.locator('[data-delivery-home-agent-console]');
  await expect(advisor).toContainText("Online");
  expect(h.requests).toHaveLength(0);
  await page.setViewportSize({ width: 1280, height: 720 });
  await advisor.locator("details").last().scrollIntoViewIfNeeded();
  await page.route("**/api/agent-interaction", route => route.request().method() === "POST"
    ? route.fulfill({ body: "Synthetic governed Delivery guidance", headers: evidenceHeaders }) : route.fallback());
  const input = advisor.getByRole("textbox", { name: "Delivery advisor prompt", exact: true });
  await input.fill("Explain the Delivery overview without changing work"); await advisor.getByRole("button", { name: "run", exact: true }).click();
  await expect(advisor).toContainText("Synthetic governed Delivery guidance");
  expect(h.requests).toHaveLength(1);
  const body = JSON.stringify(h.requests[0]);
  expect(body).toContain("Delivery Home"); expect(body).toContain("console:/api/delivery/workspace");
  expect(body).not.toContain("Control Fabric ART Design"); expect(body.length).toBeLessThan(12000);
  await page.route("**/api/agent-interaction", route => route.request().method() === "POST"
    ? route.fulfill({ body: "UNATTESTED TEXT MUST NOT DISPLAY", headers: { "Content-Type": "text/plain" } }) : route.fallback());
  await input.fill("Explain this overview again"); await advisor.getByRole("button", { name: "run", exact: true }).click();
  await expect(advisor).toContainText(/evidence.*incomplete|response was discarded/);
  await expect(advisor).not.toContainText("UNATTESTED TEXT MUST NOT DISPLAY");
  expect(h.errors).toEqual([]);
});

test("Home advisor retains cancellation and rejects fixture context", async ({ page }) => {
  const h = await deliveryHarness(page, { live: true, online: true });
  let release; const pending = new Promise(resolve => { release = resolve; });
  await page.route("**/api/agent-interaction", async route => {
    if (route.request().method() !== "POST") return route.fallback();
    await pending; await route.fulfill({ body: "Late synthetic answer", headers: evidenceHeaders }).catch(() => {});
  });
  const advisor = h.workspace.locator('[data-delivery-home-agent-console]');
  await expect(advisor).toContainText("Online");
  await advisor.getByRole("textbox").fill("Explain the current Delivery overview"); await advisor.getByRole("button", { name: "run", exact: true }).click();
  await expect(advisor.getByRole("button", { name: "cancel", exact: true })).toBeEnabled();
  await expect(advisor.getByRole("textbox")).toBeDisabled();
  await expect(advisor.getByRole("button", { name: "Stop response", exact: true })).toHaveCount(0);
  await advisor.getByRole("button", { name: "cancel", exact: true }).click(); release();
  await expect(advisor.getByRole("textbox")).toBeEnabled();
  await expect(advisor.getByRole("button", { name: "run", exact: true })).toBeVisible();
  await expect(advisor).not.toContainText("Late synthetic answer");
  expect(h.requests).toHaveLength(1);
  h.model.projection_state.checked_at = "2020-01-01T00:00:00Z";
  await h.refresh();
  await advisor.getByRole("textbox").fill("Explain this stale Delivery overview"); await advisor.getByRole("button", { name: "run", exact: true }).click();
  await expect(advisor).toContainText(/unavailable|not available/); expect(h.requests).toHaveLength(1);
  expect(h.errors).toEqual([]);
});

test("Delivery registers, Home and Catalog remain readable at short desktop sizes", async ({ page }) => {
  const h = await deliveryHarness(page);
  for (const [width, height] of [[1700,1000],[1440,800],[1280,720]]) {
    await page.setViewportSize({ width, height }); await h.section("home");
    await reachable(page, h.workspace.locator('[data-delivery-home-agent-console]').getByRole("textbox"));
    for (const section of ["intake", "work-design", "refinement"]) {
      await h.section(section);
      const table = h.workspace.getByRole("table");
      const widths = await table.locator('tbody tr').first().locator('td:not([data-intent="index"])').evaluateAll(cells => cells.map(c => c.getBoundingClientRect().width));
      expect(Math.min(...widths)).toBeGreaterThan(65);
    }
    await h.section("catalog");
    const rail = h.workspace.locator('[data-teras-selector-rail-list]');
    await expect(rail.getByRole("button")).toHaveCount(9);
    await reachable(page, rail.getByRole("button").last());
    const table = h.workspace.getByRole("table");
    expect((await table.boundingBox()).width).toBeGreaterThanOrEqual(575);
    for (const pill of await table.locator('tbody [data-wrap="nowrap"]').all()) await expect(pill).toHaveCSS("white-space", "nowrap");
    await reachable(page, h.workspace.getByRole("button", { name: "Edit", exact: true }).last());
  }
  expect(h.writes).toEqual([]); expect(h.errors).toEqual([]);
});

test("Work Design review action and Context Session advisor are reachable at 1280x720", async ({ page }) => {
  const h = await deliveryHarness(page); await page.setViewportSize({ width:1280,height:720 }); await h.section("work-design");
  await h.workspace.getByRole("row").filter({ hasText: "Control Fabric ART Design" }).click();
  await h.workspace.getByRole("button", { name: "Open Design Hub", exact: true }).click();
  await expect(page.getByRole("group", { name: "Work design steps" })).toBeVisible();
  await page.getByRole("button").filter({ hasText: "Review Draft" }).last().click();
  const review = page.getByRole("dialog", { name: "Review Draft", exact: true });
  await reachable(page, review.getByRole("button", { name:"Mark Reviewed",exact:true }));
  await review.getByRole("button", { name:"Back to Hub",exact:true }).click();
  await page.getByRole("button").filter({ hasText: "Context Session" }).last().click();
  const context = page.getByRole("dialog", { name: "Context Session", exact: true });
  await reachable(page, context.getByRole("button", { name: "run", exact:true }));
  expect(h.writes).toEqual([]); expect(h.errors).toEqual([]);
});

test("Catalog edits survive equivalent owner refresh and closing requires explicit discard", async ({ page }) => {
  const h = await deliveryHarness(page); await h.section("catalog");
  await h.workspace.getByRole("button", { name:"Edit", exact:true }).last().click();
  let modal = page.getByRole("dialog").last();
  await modal.getByRole("button", { name:"Cancel",exact:true }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await h.workspace.getByRole("button", { name:"Edit", exact:true }).last().click();
  modal = page.getByRole("dialog").last();
  const field = modal.getByRole("textbox", { name:"Description",exact:true });
  const original = await field.inputValue(); await field.fill("Unsaved Catalog inspection draft");
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(field).toHaveValue("Unsaved Catalog inspection draft");
  await page.keyboard.press("Escape");
  const guard = page.getByRole("alertdialog", { name:"Discard Catalog edits?", exact:true });
  await expect(guard).toBeVisible(); await guard.getByRole("button", { name:"Keep Editing",exact:true }).click();
  await expect(field).toHaveValue("Unsaved Catalog inspection draft");
  await modal.getByRole("button", { name:"Cancel",exact:true }).click(); await guard.getByRole("button", { name:"Discard Draft",exact:true }).click();
  await h.workspace.getByRole("button", { name:"Edit", exact:true }).last().click();
  await expect(page.getByRole("dialog").last().getByRole("textbox", {name:"Description",exact:true})).toHaveValue(original);
  expect(h.writes).toEqual([]); expect(h.errors).toEqual([]);
});

test("Architecture authoring retains editable JSON and guards unsaved changes", async ({ page }) => {
  const h = await deliveryHarness(page); await h.section("execution-board");
  await h.workspace.getByRole("button", { name:"Architecture Packet",exact:true }).click();
  const modal = page.getByRole("dialog", { name:"Architecture Packet",exact:true });
  const field = modal.getByRole("textbox", { name:"Architecture design (JSON object)",exact:true });
  await field.fill('{"inspection":"unsaved"}'); await page.keyboard.press("Escape");
  const guard = page.getByRole("alertdialog", { name:"Discard Architecture Packet edits?",exact:true });
  await guard.getByRole("button", { name:"Keep Editing",exact:true }).click(); await expect(field).toHaveValue('{"inspection":"unsaved"}');
  await modal.getByRole("button", { name:"Back to Execution Board",exact:true }).click(); await guard.getByRole("button", { name:"Discard Draft",exact:true }).click();
  await expect(modal).toHaveCount(0); expect(h.writes).toEqual([]); expect(h.errors).toEqual([]);
});

function completionContext(n) {
  return { work_item_id:n,record_ref:`openproject://work_packages/${n}`,subject:"Synthetic non-source completion inspection",status:"in-progress",owner_repo:"sample-owner",revision:"sha256:"+"a".repeat(64),open_descendant_count:0,open_child_count:0,completed_related_count:2,source_session_active:false,completion_evidence_valid:false,can_complete:true,blocking_reasons:[] };
}
async function openWorkItem(page,h,path) {
  await h.section("execution-board"); await h.workspace.getByRole("button", { name:"Open Work Item",exact:true }).click();
  const opener = page.getByRole("dialog").last();
  await opener.getByRole("button", { name:"Work path",exact:true }).click(); await page.getByRole("option", { name:path,exact:true }).click();
  await opener.getByRole("textbox", { name:"ART work item",exact:true }).fill("714");
  await opener.getByRole("button", { name:/^Open (Completion|Session)$/ }).click();
}

test("non-source completion protects evidence on both Escape and board navigation", async ({ page }) => {
  const h = await deliveryHarness(page, { live: true });
  await page.route("**/api/delivery/execution/714/completion",route=>route.fulfill({json:{mode:"live",context:completionContext(714)}}));
  await openWorkItem(page,h,"Non-source completion");
  const modal = page.getByRole("dialog", { name:"Complete non-source work",exact:true });
  await expect(modal).toContainText("Synthetic non-source completion inspection");
  const field=modal.getByRole("textbox",{name:"Completion summary",exact:true});await field.fill("Unsubmitted completion evidence");
  await page.keyboard.press("Escape");const guard=page.getByRole("alertdialog",{name:"Leave completion draft?",exact:true});
  await guard.getByRole("button",{name:"Keep Editing",exact:true}).click();await expect(field).toHaveValue("Unsubmitted completion evidence");
  await modal.getByRole("button",{name:"Back to Board",exact:true}).click();await guard.getByRole("button",{name:"Discard Draft",exact:true}).click();
  await expect(modal).toHaveCount(0);expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});

function sessionSnapshot() {
  return { mode:"live",status:"current",observedAt:new Date().toISOString(),error:null,projection:{
    workflow_id:"delivery-art-work-session",work_item_id:"work-item-714",delivery_id:"delivery-698",covered_work_item_ids:["work-item-714"],
    landing_unit_id:null,session_id:null,session_revision:null,state:"decision-required",next_action:{authority:"operator",code:"work-session-start-required",reason:"Synthetic decision inspection only"},
    decision_draft:{artifact_type:"delivery_art_work_session_decision",schema_version:1,caller_id:"governance-operations-console",work_item_id:"work-item-714",covered_work_item_ids:["work-item-714"],
      architecture:{required:false,artifact_location:null},human_gate_work_item_ids:{security_acceptance:[]},operator:{id:"inspection",decision_source:"operator"},
      landing_unit:{base_ref:"origin/main",branch:"inspection/work",decision:"feature_single_landing_unit",id:"inspection-unit",rollback_boundary:"Same reviewed unit",split_reason:"Same owner and rollback boundary"}},
  }};
}

test("source decision preserves edits on refresh and guards changed source and close", async ({ page }) => {
  const h=await deliveryHarness(page,{live:true}),snapshot=sessionSnapshot();
  await page.route("**/api/delivery/execution/714/work-session",r=>r.fulfill({json:snapshot}));
  await openWorkItem(page,h,"Governed source session");
  const modal=page.getByRole("dialog",{name:"Governed Work Session",exact:true});
  const field=modal.getByRole("textbox",{name:"Branch",exact:true});
  await expect(field).toHaveValue("inspection/work");await field.fill("inspection/unsaved");
  const refresh=modal.getByRole("button",{name:"Read Current Session",exact:true});
  await refresh.click();await expect(refresh).toBeEnabled();await expect(field).toHaveValue("inspection/unsaved");
  snapshot.projection.decision_draft.landing_unit.branch="inspection/new-owner";
  await refresh.click();await expect(modal.getByRole("button",{name:"Reload current decision",exact:true})).toBeVisible();
  await expect(field).toHaveValue("inspection/unsaved");
  await modal.getByRole("button",{name:"Reload current decision",exact:true}).click();
  const guard=page.getByRole("alertdialog",{name:"Reload work-session decision?",exact:true});
  await guard.getByRole("button",{name:"Keep Editing",exact:true}).click();await expect(field).toHaveValue("inspection/unsaved");
  await modal.getByRole("button",{name:"Reload current decision",exact:true}).click();await guard.getByRole("button",{name:"Discard and Reload",exact:true}).click();
  await expect(field).toHaveValue("inspection/new-owner");
  await field.fill("inspection/local-again");await page.keyboard.press("Escape");
  await page.getByRole("alertdialog",{name:"Discard work-session edits?",exact:true}).getByRole("button",{name:"Discard Draft",exact:true}).click();
  await expect(modal).toHaveCount(0);expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});

function closeoutSnapshot() {
  return {mode:"live",status:"current",observedAt:new Date().toISOString(),error:null,projection:{
    schema_version:1,delivery_id:"delivery-681",record_ref:"openproject://work_packages/681",source_revision:"delivery-package:sha256:"+"a".repeat(64),projection_state:"ready",projected_at:new Date().toISOString(),last_event_ref:null,
    next_action:{authority:"operator-orchestration-service",code:"prepare_delivery_closeout",label:"Prepare Delivery Closeout"},outcome_history:[],package:{status:"in-progress",subject:"Synthetic closeout inspection"},
    readiness:{counts:{blocked:0,open_descendants:0,weak_done_narrative:0,weak_evidence:0,without_evidence:0,without_owner:0},evidence_refs:["review-packet://inspection/final"],readiness_ref:"openproject://work_packages/681#closeout-readiness@a",ready_for_closing:true,ready_for_closeout:true,reasons:[]},
  }};
}

test("closeout Result remains pending and all impact branches retain nonoverlapping list and field layout", async ({ page }) => {
  const h=await deliveryHarness(page);
  await page.route("**/api/delivery/execution/delivery-681/closeout",r=>r.fulfill({json:closeoutSnapshot()}));
  await h.section("execution-board");await h.workspace.getByRole("button").filter({hasText:"Broker Apply Controls"}).first().click();
  await h.workspace.getByRole("button",{name:"Open Closeout",exact:true}).click();
  const modal=page.getByRole("dialog",{name:"Delivery Closeout",exact:true});
  await expect(modal.locator('[data-teras-progress-step-list] button').last()).toContainText("Pending");
  for(const name of ["Completion summary","Changed surfaces","Test result evidence","Validation evidence"]) await modal.getByRole("textbox",{name,exact:true}).fill("Synthetic layout inspection only");
  await modal.getByRole("button",{name:"Supporting Evidence",exact:true}).click();
  const support=page.getByRole("dialog",{name:"Supporting Evidence",exact:true});
  for(const name of ["Demo summary","Demo outcome","Demo evidence","Inspection summary","Inspection actions"])await support.getByRole("textbox",{name,exact:true}).fill("Synthetic layout inspection only");
  await support.getByRole("button",{name:"Done",exact:true}).click();
  await modal.getByRole("button",{name:"Review Closeout",exact:true}).click();
  await modal.getByRole("radio",{name:"Workspace entrant",exact:true}).click();await modal.getByRole("button",{name:"Configure",exact:true}).click();
  const impact=page.getByRole("dialog",{name:"Workspace Entrant Impact",exact:true});
  for(const [width,height] of [[1700,1000],[1280,720]]) {
    await page.setViewportSize({width,height});
    for(const kind of ["Product","Repository","Component"]) {
      await impact.getByRole("button",{name:"Entrant kind",exact:true}).click();await page.getByRole("option",{name:kind,exact:true}).click();
      await reachable(page,impact.getByRole("textbox",{name:"Validation notes",exact:true}));
      if(kind==="Product") {
        const owners=impact.getByRole("textbox",{name:"Source owner 1",exact:true});
        const next=impact.getByRole("textbox",{name:"Validation posture",exact:true});
        const a=await owners.boundingBox(),b=await next.boundingBox();expect(b.y).toBeGreaterThanOrEqual(a.y+a.height);
      }
    }
    await reachable(page,impact.getByRole("button",{name:"Done",exact:true}));
  }
  expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});

test("Catalog changed owner values retain the draft and require an explicit reload", async ({ page }) => {
  const h=await deliveryHarness(page,{live:true});await h.section("catalog");
  await h.workspace.getByRole("button",{name:"Edit",exact:true}).last().click();
  const modal=page.getByRole("dialog").last(),field=modal.getByRole("textbox",{name:"Description",exact:true});
  await field.fill("Keep this unsaved Catalog text");
  const current=h.model.catalog.values.find(v=>v.catalog_value_id==="catalog-value-target-pi-2026-03");
  current.description="Updated synthetic owner description";h.model.catalog.source_revision="synthetic-owner-refresh";
  await h.refresh();await expect(modal.getByRole("button",{name:"Reload current values",exact:true})).toBeVisible();
  await expect(field).toHaveValue("Keep this unsaved Catalog text");
  await expect(modal.locator('footer').getByRole("button").last()).toBeDisabled();
  await modal.getByRole("button",{name:"Reload current values",exact:true}).click();
  const guard=page.getByRole("alertdialog",{name:"Reload Catalog draft?",exact:true});
  await guard.getByRole("button",{name:"Keep Editing",exact:true}).click();await expect(field).toHaveValue("Keep this unsaved Catalog text");
  await modal.getByRole("button",{name:"Reload current values",exact:true}).click();await guard.getByRole("button",{name:"Discard and Reload",exact:true}).click();
  await expect(field).toHaveValue(current.description);expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});

test("Execution retains all views with readable horizontally navigable lanes",async({page})=>{
  const h=await deliveryHarness(page);await h.section("execution-board");
  for(const [width,height] of [[1700,1000],[1280,720]]){
    await page.setViewportSize({width,height});
    for(const view of ["Control Board","Family Map","ART Tree"]){
      await h.workspace.getByRole("radio",{name:view,exact:true}).click();
      if(view==="Control Board"){
        const lanes=h.workspace.locator('[class*="controlBoardLanePanel"]');await expect(lanes).toHaveCount(8);
        for(const lane of await lanes.all())expect((await lane.boundingBox()).width).toBeGreaterThanOrEqual(239);
        await reachable(page,lanes.last());
        const details=h.workspace.locator('[class*="controlBoardCardDetail"]');
        for(const detail of await details.all()){
          const lines=await detail.locator('p').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return{y:r.y,bottom:r.bottom};}));
          for(let i=1;i<lines.length;i++)expect(lines[i].y).toBeGreaterThanOrEqual(lines[i-1].bottom-1);
        }
      }
      if (view !== "ART Tree") {
        const scroll = h.workspace.locator('[class*="controlBoardLaneRow"]');
        const geometry = await scroll.evaluate(e => {
          const pane = e.parentElement, a = e.getBoundingClientRect(), b = pane.getBoundingClientRect(), style = getComputedStyle(pane);
          return { bottom: a.bottom, expectedBottom: b.bottom - parseFloat(style.paddingBottom) - parseFloat(style.borderBottomWidth),
            width: e.clientWidth, scrollWidth: e.scrollWidth, paneOverflow: pane.scrollHeight - pane.clientHeight };
        });
        expect(Math.abs(geometry.bottom - geometry.expectedBottom)).toBeLessThanOrEqual(2);
        expect(geometry.paneOverflow).toBeLessThanOrEqual(1);
        expect(geometry.scrollWidth).toBeGreaterThan(geometry.width);
        await scroll.hover(); await page.mouse.wheel(4000, 0);
        await expect.poll(() => scroll.evaluate(e => e.scrollLeft)).toBeGreaterThan(0);
      }
      await expect(h.workspace.getByRole("radio",{name:view,exact:true})).toBeChecked();
    }
  }
  expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});

function retainedTreeSnapshot(id) {
  const n=Number(id.replace("delivery-",""));
  return{mode:"live",status:"current",observedAt:new Date().toISOString(),error:null,projection:{schema_version:1,delivery_id:id,record_ref:`openproject://work_packages/${n}`,source_revision:"delivery-package:sha256:"+"a".repeat(64),projection_state:"current",projected_at:new Date().toISOString(),last_event_ref:null,
    package:{dependency_relations:[],execution_tree:{id:n,record_ref:`openproject://work_packages/${n}`,type:"Epic",subject:"Synthetic retained inspection tree",description:"Synthetic original tree for locked presentation checks only",status:"done",children:[{id:n*100+1,record_ref:`openproject://work_packages/${n*100+1}`,type:"Feature",subject:"Retained inspection feature",description:"Synthetic retained source",status:"done",children:[]}]}}}};
}

test("History uses the native Work Design flow with navigation enabled and mutations locked",async({page})=>{
  const h=await deliveryHarness(page,{live:true});
  // Stable owner identities are required by the original-tree adapter.
  const encoded=JSON.stringify(h.model);
  const mapped=JSON.parse(encoded.replaceAll('"pkg-design-724"','"delivery-724"'));
  Object.assign(h.model,mapped);
  const p=h.model.packages.find(p=>p.delivery_package_id==="delivery-724");p.backend_status="done";
  await page.route("**/api/delivery/execution/delivery-724/change-control",r=>r.fulfill({json:retainedTreeSnapshot("delivery-724")}));
  await page.route("**/api/delivery/execution/724/change-control",r=>r.fulfill({json:retainedTreeSnapshot("delivery-724")}));
  await h.refresh();await h.workspace.getByRole("radio",{name:"History",exact:true}).click();await h.section("work-design");
  await h.workspace.getByRole("row").filter({hasText:"Control Fabric ART Design"}).click();
  await h.workspace.getByRole("button",{name:"Open Design Hub",exact:true}).click();
  const hub=page.getByRole("dialog",{name:"Design Hub",exact:true});await expect(hub.getByRole("group",{name:"Work design steps"})).toBeVisible();
  for(const label of ["Context Session","Build Tree","Review Draft","Apply Draft"]){
    await hub.getByRole("button").filter({hasText:label}).last().click();
    const step=page.getByRole("dialog").last();
    await expect(step.locator('[data-delivery-workflow-readonly="true"]')).toHaveCount(1);
    const mutation=step.locator('[data-work-design-action="accept-context-brief"], [data-work-design-action="run-apply-draft"]').or(step.getByRole("button",{name:"Mark Reviewed",exact:true}));
    for(const button of await mutation.all())await expect(button).toBeDisabled();
    const back=step.getByRole("button",{name:"Back to Hub",exact:true});await reachable(page,back);await back.click();
  }
  expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});

test("Refinement single/shared editors and every step retain short-window inspection",async({page})=>{
  const h=await deliveryHarness(page);await page.setViewportSize({width:1280,height:720});await h.section("refinement");
  await h.workspace.getByRole("row").filter({hasText:"Adapter Contract Metadata Repair"}).click();await h.workspace.getByRole("button",{name:"Open Refinement Hub",exact:true}).click();
  await expect(page.getByRole("group",{name:"Refinement steps"})).toBeVisible();
  await page.getByRole("button",{name:"Open Metadata Workbench",exact:true}).click();
  const modal=()=>page.getByRole("dialog").last();
  await reachable(page,modal().getByRole("button",{name:"Expand",exact:true}));
  await modal().getByRole("radio",{name:"Shared",exact:true}).click();
  await modal().getByRole("button").filter({hasText:"User Story 1 - Primary Execution Target"}).click();
  await modal().getByRole("button").filter({hasText:"User Story 2 - Readiness Metadata"}).click();
  await expect(modal()).not.toContainText("No Shared Fields");
  await reachable(page,modal().getByRole("button",{name:"Expand",exact:true}));
  await modal().getByRole("button",{name:"Expand",exact:true}).click();
  await reachable(page,modal().getByRole("button",{name:"run",exact:true}));
  await modal().getByRole("button",{name:"Collapse",exact:true}).last().click();
  for(const index of [1,2,3]){
    const steps=modal().locator('[data-teras-progress-step-list] button');await steps.nth(index).click();
    if(index===1) {
      await expect(modal().locator('[data-teras-progress-step-list] button').first()).toContainText("Open");
      await reachable(page,modal().getByRole("button",{name:"Review Apply Plan",exact:true}));
    }
    if(index===2)await expect(modal()).toContainText("Apply");
    await reachable(page,modal().getByRole("button",{name:"Back to Hub",exact:true}));
  }
  expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});

test("long selected-package prose remains bounded with the complete original available",async({page})=>{
  const h=await deliveryHarness(page,{live:true});
  const full="Synthetic original package context. ".repeat(120)+"End of complete original context.";
  const p=h.model.packages.find(p=>p.display_name==="Adapter Contract Metadata Repair");p.summary=full;
  await h.refresh();await h.section("refinement");await h.workspace.getByRole("row").filter({hasText:p.display_name}).click();
  const selected=h.workspace.locator('[data-teras-selected-panel="rich"]');
  await expect(selected).not.toContainText("End of complete original context.");
  await selected.getByRole("button",{name:"Full context",exact:true}).click();
  const context=page.getByRole("dialog",{name:"Package Context",exact:true});await expect(context.getByText(full,{exact:true})).toBeVisible();
  await context.getByRole("button",{name:"Back to Register",exact:true}).click();
  await selected.getByText("Technical details",{exact:true}).click();await expect(selected.locator('details[open]')).toContainText(p.source_ref);
  expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});

test("Home activity uses the shared timeline and keeps original event evidence behind disclosure", async ({ page }) => {
  const h = await deliveryHarness(page, { live: true });
  const event = h.model.audit_events.at(-1);
  event.title = "Owner marked the projection stale";
  event.detail = "Original owner context. ".repeat(30) + "End of retained event detail.";
  await h.refresh();
  const timeline = h.workspace.getByRole("list", { name: "Recent Delivery activity", exact: true });
  await expect(timeline).toHaveAttribute("data-teras-timeline", "true");
  await expect(timeline).toHaveAttribute("data-frame", "contained");
  const row = timeline.getByRole("listitem").filter({ hasText: event.title });
  for (const [width, height] of [[1700, 1000], [1280, 720]]) {
    await page.setViewportSize({ width, height });
    await expect(row).toContainText(event.title);
    await expect(row.locator("time")).toHaveAttribute("datetime", event.occurred_at);
    expect(await row.innerText()).not.toContain(event.event_id);
    await row.getByText("Technical details", { exact: true }).click();
    await expect(row.locator("details[open]")).toContainText(event.detail);
    await expect(row.locator("details[open]")).toContainText(event.event_id);
    await expect(row.locator("details[open]")).toContainText(event.delivery_package_id);
    const last = row.getByText(event.event_id, { exact: true });
    await reachable(page, last);
    const geometry = await timeline.evaluate(e => ({ client: e.clientWidth, scroll: e.scrollWidth }));
    expect(geometry.scroll - geometry.client).toBeLessThanOrEqual(1);
    await row.getByText("Technical details", { exact: true }).click();
  }
  h.model.audit_events = []; await h.refresh();
  await expect(h.workspace.getByRole("list", { name: "Recent Delivery activity", exact: true })).toHaveCount(0);
  await expect(h.workspace.getByText("No recent Delivery audit events are projected.", { exact: true })).toBeVisible();
  expect(h.writes).toEqual([]); expect(h.errors).toEqual([]);
});

for (const [packageName, actionName, reviewName, recordName] of [
  ["Broker Draft Validation", "Continue Remaining Work", "Review Continue", "Record Continue Receipt"],
  ["Governed AI Control Plane", "Defer", "Review Parking", "Record Parking Receipt"],
  ["Security Baseline Review", "Resume", "Review Resume", "Record Resume Receipt"],
]) {
  test(`${actionName}: rounded panel content stays inset and reachable in draft, review and local receipt`, async ({ page }) => {
    const h = await deliveryHarness(page); await h.section("execution-board");
    await h.workspace.getByRole("button").filter({ hasText: packageName }).first().click();
    await h.workspace.getByRole("button", { name: new RegExp(`^${actionName}(?: for .*)?$`) }).click();
    const modal = page.getByRole("dialog", { name: "Execution Action", exact: true });
    async function verifyContent(step) {
      for (const [width, height] of [[1700, 1000], [1280, 720]]) {
        await page.setViewportSize({ width, height });
        const panel = modal.locator('section[data-spacing="compact"]').first();
        const inset = await panel.evaluate(e => {
          const a = e.getBoundingClientRect(), p = e.querySelector("p").getBoundingClientRect();
          return { left: p.left - a.left, top: p.top - a.top };
        });
        expect(inset.left).toBeGreaterThanOrEqual(12); expect(inset.top).toBeGreaterThanOrEqual(12);
        const last = step === "draft" ? panel.locator("input,textarea,button").last() : step === "review" ? panel.locator('[data-teras-list] > *').last() : panel.locator('[class*="terasMetadataValue"]').last();
        await reachable(page, last);
        expect(await modal.evaluate(e => e.scrollWidth - e.clientWidth)).toBeLessThanOrEqual(1);
        if (actionName === "Continue Remaining Work") await page.screenshot({ path: test.info().outputPath(`${step}-${width}.png`) });
      }
    }
    await verifyContent("draft");
    for (const field of await modal.locator("textarea").all()) await field.fill("Synthetic browser layout evidence only; no owner command is authorized.");
    for (const field of await modal.locator('input[type="date"]').all()) await field.fill("2027-01-08");
    if (actionName === "Resume") {
      await modal.getByRole("button", { name: "Resume posture", exact: true }).click();
      await page.getByRole("option", { name: "Ready", exact: true }).click();
    }
    await modal.getByRole("button", { name: reviewName, exact: true }).click(); await verifyContent("review");
    // Disconnected-only browser-local runtime. The API guard rejects every
    // external mutation; this receipt does not qualify a live owner command.
    await expect(modal.getByRole("button", { name: recordName, exact: true })).toBeEnabled();
    await modal.getByRole("button", { name: recordName, exact: true }).click(); await expect(modal).toContainText("prototype-local");
    await verifyContent("receipt"); expect(h.writes).toEqual([]); expect(h.errors).toEqual([]);
  });
}

test("Execution tree-change review keeps its heading and acceptance input inside the padded panel", async ({ page }) => {
  const h = await deliveryHarness(page);
  await page.route("**/api/delivery/execution/**/change-control", route => {
    const id = /execution\/(?:delivery-)?([0-9]+)\/change-control/.exec(new URL(route.request().url()).pathname)?.[1] ?? "714";
    return route.fulfill({ json: retainedTreeSnapshot(`delivery-${id}`) });
  });
  await h.section("execution-board");
  await h.workspace.getByRole("button").filter({ hasText: "Broker Draft Validation" }).first().click();
  await h.workspace.getByRole("button", { name: "Edit Work", exact: true }).click();
  await h.workspace.getByRole("textbox", { name: "Epic draft title", exact: true }).fill("Synthetic reviewed title draft");
  await h.workspace.getByRole("button", { name: "Done Editing", exact: true }).click();
  const modal = page.getByRole("dialog", { name: "Review Execution Changes", exact: true });
  await expect(modal).toBeVisible();
  for (const [width, height] of [[1700, 1000], [1280, 720]]) {
    await page.setViewportSize({ width, height });
    const panel = modal.locator('section[data-spacing="compact"]').first();
    const inset = await panel.evaluate(e => {
      const a = e.getBoundingClientRect(), p = e.querySelector("p").getBoundingClientRect();
      return { left: p.left - a.left, top: p.top - a.top };
    });
    expect(inset.left).toBeGreaterThanOrEqual(12); expect(inset.top).toBeGreaterThanOrEqual(12);
    await reachable(page, modal.getByRole("textbox", { name: "Acceptance note", exact: true }));
    await expect(modal.getByRole("button", { name: "Apply Changes", exact: true })).toBeDisabled();
  }
  expect(h.writes).toEqual([]); expect(h.errors).toEqual([]);
});
