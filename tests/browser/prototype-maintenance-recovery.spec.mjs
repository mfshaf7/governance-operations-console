import {test,expect} from "../support/filled-surface-layout.mjs";
import {createRequire} from "node:module";
import {createHash} from "node:crypto";
import {sourceIntent,sourceOperation} from "../support/platform-attention-fixture.mjs";
const require=createRequire(import.meta.url);
const {prototypeWorkspaceReadModel}=require("../../src/domain-workspaces/prototype/read-model/prototype-workspace-read-model.ts");
const base=process.env.CONSOLE_TEST_BASE_URL??"http://127.0.0.1:3320";
test.setTimeout(120000);
test.use({viewport:{width:1700,height:1000},actionTimeout:15000,navigationTimeout:60000});

async function harness(page,{sourceState="cancelled",listUnavailable=false,historyItems=0,closureEvents=[]}={}){
 const record={...structuredClone(prototypeWorkspaceReadModel.records[1]),id:"prototype-example",name:"Example source",origin:"Canonical Studio register",sourceRef:"record://prototypes/example",lifecycle:"exploring",dataMode:"synthetic",visibilityTier:"private-internal",sourceEvidence:{authority:"workspace-prototype-studio",posture:"create-studio-source",revision:"a".repeat(40)}};
 record.landing.state="landed";const writes=[];
 if(historyItems){
  record.evidence=Array.from({length:historyItems},(_,i)=>({id:`example-evidence-${i}`,label:`Retained evidence ${i+1}`,detail:`record://examples/retained-source/${i+1}`,status:"source",tone:"info"}));
  record.receipts=Array.from({length:historyItems},(_,i)=>({authority:"source-projected",commandId:"land-prototype-request",commandName:"prototype.landing.apply",id:`example-receipt-${i}`,label:`Retained event ${i+1}`,recordedAt:`2026-01-${String(i+1).padStart(2,"0")}T00:00:00Z`,resultState:"recorded",schemaVersion:1,summary:"Retained source event used by this isolated layout test.",tone:"ok",sourceLabel:"source record",sourceVersion:"a".repeat(40)}));
 }

 const current={request_id:"prototype-source-request:example:retained",prototype_id:"prototype:example",state:"source-work",session_id:"example-session",created_at:"2026-01-01T00:00:00Z",updated_at:"2026-01-01T00:00:00Z",source_start_digest:`sha256:${"a".repeat(64)}`,source_scope:{source_root:"prototypes/example",design_profile:"docs/prototypes/example/design-profile.md"},landing_unit:{landing_unit_id:"example-unit",branch:"example",fetched_base:"a".repeat(40)},next_action:{code:"prototype-source-retry-available",authority:"operator-orchestration-service"},source_request:{objective:"Inspect the retained example source objective."},source_intent_ref:null,source_delivery:{},realization:{session_id:"example-session",revision:"example-1",state:sourceState,attempt:null}};
 await page.route("**/api/**",async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname;
  if(path==="/api/console/capabilities")return route.fulfill({json:{artifactType:"console-runtime-capability-projection",schemaVersion:1,mode:"live",capabilities:[]}});
  if(path==="/api/prototypes/records"){
   if(url.searchParams.get("view")==="overview")return route.fulfill({json:{mode:"live",projection:{lastRead:new Date().toISOString(),counts:{total:1,exploring:1,candidate:0,baselineApproved:0,graduating:0,graduated:0,retired:0,blocked:0,movementReady:0}}}});
   const q=url.searchParams.get("q")??"",records=record.name.toLowerCase().includes(q.toLowerCase())?[record]:[];
   return route.fulfill({json:{mode:"live",projection:{sourceRevision:"test-source",landing:{},maturity:{},closure:{},readModel:{...prototypeWorkspaceReadModel,records,source:{...prototypeWorkspaceReadModel.source,lastRead:new Date().toISOString()}}}}});
  }
  if(historyItems && path==="/api/prototypes/closures/preparations")return route.fulfill({json:{schema_version:1,workflow_id:"prototype-closure",prototype_id:"example",authority_revision:"a".repeat(40),canonical_mutation:false,expected_state:{source_revision:"a".repeat(40),record_digest:`sha256:${"b".repeat(64)}`,lifecycle:"exploring",source_custody:"incubation-repo",design_baseline_ref:null,delivery_packet_ref:null,accepted_delivery_target_receipt_ref:null,retirement_ref:null,project_phase:"incubating"},history:closureEvents,canonical_authority:{repo:"workspace-prototype-studio",branch:"main",registry_path:"prototypes.yaml"}}});
  if(historyItems && /^\/api\/prototypes\/[^/]+\/preview-runtime$/.test(path))return route.fulfill({status:503,json:{code:"prototype_preview_live_mode_required",error:"Isolated layout specimen",retryable:false}});
  if(path==="/api/prototypes/source-requests"&&req.method()==="GET")return listUnavailable?route.fulfill({status:503,json:{error:"Owner source request list unavailable"}}):route.fulfill({json:{mode:"live",projection:[current]}});
  if(path===`/api/prototypes/source-requests/${encodeURIComponent(current.request_id)}`&&req.method()==="GET")return route.fulfill({json:{mode:"live",projection:current}});
  if(!["GET","HEAD","OPTIONS"].includes(req.method())){writes.push(path);return route.fulfill({status:503,json:{error:"Isolated UI test; business submissions blocked"}});}
  if(path.includes("source-authorization"))return route.fulfill({status:503,json:{error:"Isolated UI test; access not issued"}});
  return route.fallback();
 });
 await page.goto(base,{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>{const b=document.querySelector('button[title="Open PROTOTYPE"]'),k=b&&Object.keys(b).find(k=>k.startsWith("__reactProps$"));return Boolean(k&&b[k].onClick);});
 await page.locator('button[title="Open PROTOTYPE"]').click();const control=page.getByRole("dialog",{name:"Prototype Control",exact:true});await expect(control.locator("tbody tr")).toHaveCount(1);
 return {control,writes};
}
test("empty search retains its recovery controls and restores the original register",async({page})=>{
 const h=await harness(page);const search=h.control.getByRole("searchbox",{name:"Search prototype records"});
 await search.fill("no-matches-here");await expect(h.control).toContainText("No prototypes match the current search and filters.");await expect(search).toBeVisible();
 await search.fill("");await expect(h.control.locator("tbody tr")).toHaveCount(1);expect(h.writes).toEqual([]);
});
test("cold source opening restores cancelled work; new objectives require an explicit choice and guard",async({page})=>{
 const h=await harness(page);await h.control.getByRole("button",{name:"Open Source Authoring",exact:true}).click();const modal=page.getByRole("dialog").last();
 await expect(modal).toContainText("Attempt cancelled");await expect(modal.getByLabel("New source-work objective")).toHaveCount(0);
 await modal.getByRole("button",{name:"New source work",exact:true}).click();await modal.getByLabel("New source-work objective").fill("A separate objective that has not been submitted.");
 await modal.locator('button[aria-label^="Close"]').click();const guard=page.getByRole("alertdialog");await expect(guard).toBeVisible();await guard.getByRole("button",{name:/Keep/i}).click();await expect(modal.getByLabel("New source-work objective")).toHaveValue("A separate objective that has not been submitted.");expect(h.writes).toEqual([]);
});
test("Prototype runs only a confirmed saved source revision", async ({ page }, info) => {
  const { control, writes } = await harness(page, { sourceState: "not-started" });
  const requestId = "prototype-source-request:example:retained", sessionId = "example-session";
  const objective = "Inspect the retained example source objective.";
  const sha = value => "sha256:" + createHash("sha256").update(value).digest("hex");
  const baseCommit = "a".repeat(40), file = "prototypes/example/index.html", originalText = "<h1>Original</h1>";
  const intent = sourceIntent({
    subject: { kind: "prototype", prototype_id: "prototype:example", registry_ref: "record://prototypes/example",
      registry_revision: baseCommit, source_ref: "repo://sample/project/prototypes/example", source_revision: baseCommit },
  });
  const receipt = sourceOperation("a".repeat(24), "agent-source.issue", "succeeded", intent).provider_operation.receipt.source_credential;
  await page.route("**/api/platform-operations/source-authorizations", route => route.fulfill({json: {
    mode: "live", projection: [{
      schema_version: 1, workflow_id: "source-credential-preparation", intent_id: intent.intent_id, source_intent: intent,
      source_intent_digest: receipt.source_intent_digest, session_id: sessionId, created_at: "2026-01-01T00:00:00Z",
      operation_refs: { issue: null, revoke: null }, start_decision: null,
      authorization: { state: "approved", approval_ref: "source-approval:example", credential_receipt: receipt },
      authority: "operator-orchestration-service", secret_values_embedded: false,
    }],
  }}));
  let current = { sessionId, revision: "2026-01-01T00:00:00Z", state: "not-started", attempt: null };
  let saved = null, rejectSave = false, attempts = 0, revision = 0;
  const runs = [], results = new Map();
  const previewAddress = "http://project-isolated.localhost:43100/";
  await page.route("**/api/prototypes/source-requests/**", async route => {
    const request = route.request(), url = new URL(request.url()), pathname = decodeURIComponent(url.pathname);
    if (!pathname.startsWith(`/api/prototypes/source-requests/${requestId}/`)) return route.fallback();
    const live = projection => route.fulfill({json: {mode: "live", projection}});
    const unavailable = (status, code, error) => route.fulfill({status, json: {mode: "live", code, error}});
    if (pathname.endsWith("/files")) return live({current, capture: {
      head_commit: baseCommit, tree: { paths: [file], truncated: false },
      files: url.searchParams.has("path") ? [{path: file, content: originalText, content_digest: sha(originalText)}] : [],
    }});
    if (pathname.endsWith("/draft")) {
      if (request.method() === "GET") return saved ? live(saved) :
        unavailable(404, "prototype_source_authoring_draft_missing", "No draft saved.");
      attempts += 1;
      if (rejectSave) return unavailable(409, "prototype_source_authoring_source_changed", "Save refused by the source owner.");
      const command = request.postDataJSON(), sourceRevision = `2026-01-01T00:00:0${attempts}Z`;
      const digest = sha(JSON.stringify(command.operations));
      current = { sessionId, state: "draft-ready", revision: sourceRevision,
        attempt: { requestId: command.command_id, executionId: command.execution_id, objectiveDigest: sha(JSON.stringify(objective)), digest } };
      saved = { session_id: sessionId, revision: sourceRevision, digest, objective, accepted: false,
        provenance: { origin: "operator", inputOrigin: "manual", amendedAt: sourceRevision, originalModel: false },
        editorState: current, change_set: { base_commit: baseCommit, commit_message: command.commit_message, operations: command.operations } };
      return live({ commandId: command.command_id, savedRevision: sourceRevision, savedDigest: digest, current, replayed: false });
    }
    if (pathname.endsWith("/project-runtime")) return live({
      project_ref: "project:example", setup: { recipe_id: "static", configuration_revision: "setup-1" },
      revision, records: [], before: null,
    });
    if (pathname.endsWith("/project-runtime/run") && request.method() === "POST") {
      const intent = request.postDataJSON();
      runs.push(intent);
      const manifest = sha(intent.source_digest);
      const result = { acknowledgement: { command_id: intent.command_id, operation_id: "project-operation:example",
        scope_revision: ++revision, accepted_at: "2026-01-01T00:01:00Z",
        snapshot: {snapshot_id: `project-source:${manifest.slice(7)}`, manifest_digest: manifest} },
        status: "ready", source_revision: intent.source_revision, source_digest: intent.source_digest,
        configuration_revision: intent.configuration_revision, last_observation: null,
        observation: { state: "ready", observed_at: "2026-01-01T00:01:01Z", instance_ref: "project-runtime:example",
          owner_receipt_ref: "platform-project-receipt:example",
          ...(runs.length > 1 ? {endpoint_ref: previewAddress} : {}) },
      };
      results.set(intent.command_id, result);
      return runs.length === 1 ? unavailable(502, "response_unavailable", "The run response was interrupted.") : live(result);
    }
    if (pathname.includes("/project-runtime/commands/") && request.method() === "POST") {
      const original = results.get(pathname.split("/").at(-1));
      expect(request.postDataJSON()).toEqual({});
      return original ? live(original) : unavailable(404, "project_runtime_command_not_found", "Original run unavailable.");
    }
    return route.fallback();
  });
  await control.getByRole("button", {name: "Open Source Authoring", exact: true}).click();
  await page.getByRole("button", {name: "Open source workspace", exact: true}).click();
  const editor = page.getByRole("dialog", {name: "Example source — app/design source", exact: true});
  await editor.getByRole("treeitem", {name: `Open ${file}`, exact: true}).click();
  const contents = editor.locator(".cm-content[contenteditable=true]");
  await contents.fill("<h1>First save</h1>");
  await editor.getByRole("textbox", {name: "Commit message for the saved draft"}).fill("Update the example page");
  await editor.getByRole("button", {name: "Save private draft", exact: true}).click();
  const runSaved = editor.getByRole("button", {name: "Run saved draft", exact: true});
  await expect(runSaved).toBeEnabled();
  const firstSave = saved;
  expect(runs).toHaveLength(0);

  await contents.fill("<h1>Unsaved text</h1>");
  await runSaved.click();
  await expect.poll(() => runs.length).toBe(1);
  expect(runs[0]).toMatchObject({source_revision: firstSave.revision, source_digest: firstSave.digest});
  await expect(editor).toContainText("Unsaved edits stay in the editor.");
  await expect(editor).toContainText("The run response was interrupted.");
  await editor.getByRole("button", {name: "Check original run", exact: true}).click();
  await expect(editor.getByRole("heading", {name: "Ready", exact: true})).toBeVisible();
  const openPreview = editor.getByRole("button", {name: "Open preview", exact: true});
  await expect(openPreview).toHaveCount(0);
  expect(runs).toHaveLength(1);

  const saveAndRun = editor.getByRole("button", {name: "Save and run", exact: true});
  await saveAndRun.click();
  await expect.poll(() => runs.length).toBe(2);
  expect(runs[1]).toMatchObject({source_revision: saved.revision, source_digest: saved.digest});
  expect(runs[1].source_digest).not.toBe(runs[0].source_digest);
  await expect(editor).toContainText("This run uses your current saved draft.");
  await page.context().route(previewAddress, route => route.fulfill({body: "Isolated preview"}));
  const [preview] = await Promise.all([page.context().waitForEvent("page"), openPreview.click()]);
  await expect(preview).toHaveURL(previewAddress);
  await expect(preview.getByText("Isolated preview")).toBeVisible();
  await preview.close();
  const history = editor.getByRole("list", {name: "Saved draft runs", exact: true});
  await expect(history.getByRole("listitem")).toHaveCount(2);
  const historicalRun = history.getByRole("button").last();
  await historicalRun.click();
  await expect(historicalRun).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => history.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
  await editor.screenshot({path: info.outputPath("prototype-saved-source-run.png")});

  await contents.fill("<h1>Preserve after a rejected save</h1>");
  rejectSave = true;
  await saveAndRun.click();
  await expect(editor).toContainText("Save refused by the source owner.");
  await expect(contents).toContainText("Preserve after a rejected save");
  expect(attempts).toBe(3);
  expect(runs).toHaveLength(2);
  expect(writes).toEqual([]);
});

for(const options of [{sourceState:"apply-unknown"},{listUnavailable:true}])test(`unknown source outcome cannot be replaced by new work: ${JSON.stringify(options)}`,async({page})=>{
 const h=await harness(page,options);await h.control.getByRole("button",{name:"Open Source Authoring",exact:true}).click();const modal=page.getByRole("dialog").last();
 await expect(modal).toContainText(options.listUnavailable?"Owner source request list unavailable":"Source outcome needs recovery");
 await expect(modal.getByRole("button",{name:"New source work",exact:true})).toBeDisabled();await expect(modal.getByLabel("New source-work objective")).toHaveCount(0);expect(h.writes).toEqual([]);
});

test("History keeps evidence bounded, its timeline visible and every retained event reachable",async({page},info)=>{
 const h=await harness(page,{historyItems:18});await h.control.getByRole("button",{name:"Open Dashboard",exact:true}).click();
 await page.getByRole("dialog").last().getByRole("button",{name:"View History",exact:true}).click();const history=page.getByRole("dialog",{name:"Prototype History",exact:true});
 const root=history.locator('[data-prototype-history-modal]'),events=history.getByRole("region",{name:"Prototype lifecycle events",exact:true}),details=history.getByRole("region",{name:"Prototype history details",exact:true}),evidence=history.getByRole("list",{name:"Prototype retained evidence",exact:true});
 await expect(events.locator("li")).toHaveCount(18);
 for(const [width,height] of [[1700,1000],[1280,720]]){
  await page.setViewportSize({width,height});
  await expect(events).toHaveCSS("overflow-y","auto");await expect(details).toHaveCSS("overflow-y","auto");await expect(evidence).toHaveCSS("overflow-y","auto");
  await expect.poll(()=>root.evaluate(n=>n.scrollWidth-n.clientWidth)).toBeLessThanOrEqual(1);
  await expect.poll(()=>events.evaluate(n=>n.clientHeight)).toBeGreaterThan(80);
  await expect.poll(()=>root.evaluate(n=>{const zone=n.children[0],a=zone.getBoundingClientRect();return [...zone.children].every(child=>{const b=child.getBoundingClientRect();return b.y>=a.y-1&&b.bottom<=a.bottom+1;});})).toBe(true);
  await expect(history.getByRole("heading",{name:"Receipt trail",exact:true})).toBeInViewport({ratio:1});
  await evidence.hover();await page.mouse.wheel(0,4000);await expect.poll(async()=>{const a=await evidence.boundingBox(),b=await evidence.getByRole("listitem").last().boundingBox();return b.y>=a.y-1&&b.y+b.height<=a.y+a.height+1;}).toBe(true);
  await events.hover();await page.mouse.wheel(0,4000);await expect.poll(async()=>{const a=await events.boundingBox(),b=await events.locator("li").last().boundingBox();return b.y>=a.y-1&&b.y+b.height<=a.y+a.height+1;}).toBe(true);
  await history.screenshot({path:info.outputPath(`history-layout-${width}.png`)});
 }
 expect(h.writes).toEqual([]);
});

test("History reports receipt loading and keeps the latest selection when earlier reads finish late",async({page})=>{
 const ids=["prototype-closure-request:example:11111111-1111-4111-8111-111111111111","prototype-closure-request:example:22222222-2222-4222-8222-222222222222"];
 const closureEvents=["incubation-retired","incubation-reopened"].map((event_type,i)=>({event_id:`example-event-${i}`,event_type,request_ref:ids[i],expected_source_revision:"a".repeat(40),previous_lifecycle:i?"retired":"exploring",observed_lifecycle:i?"exploring":"retired",previous_source_custody:"incubation-repo",observed_source_custody:"incubation-repo",recorded_at:`2026-01-${20+i}T00:00:00Z`}));
 const h=await harness(page,{historyItems:18,closureEvents});let releaseFirst;const firstGate=new Promise(resolve=>{releaseFirst=resolve;});
 await page.route("**/api/prototypes/closures/requests/*",async route=>{
  if(route.request().method()!=="GET")return route.fallback();
  if(decodeURIComponent(new URL(route.request().url()).pathname).endsWith(ids[0])){await firstGate;return route.fulfill({status:503,json:{error:"Earlier receipt read failed",code:"owner_unavailable",retryable:true}});}
  return route.fulfill({status:503,json:{error:"Selected receipt read failed",code:"owner_unavailable",retryable:true}});
 });
 await h.control.getByRole("button",{name:"Open Dashboard",exact:true}).click();await page.getByRole("dialog").last().getByRole("button",{name:"View History",exact:true}).click();const history=page.getByRole("dialog",{name:"Prototype History",exact:true});
 const firstResponse=page.waitForResponse(response=>decodeURIComponent(response.url()).endsWith(ids[0]));
 await history.getByRole("button",{name:"Inspect Closure receipt for incubation-retired",exact:true}).click();await expect(history.getByText("Loading receipt details…",{exact:true}).first()).toBeVisible();
 await history.getByRole("button",{name:"Inspect Closure receipt for incubation-reopened",exact:true}).click();await expect(history.getByText("Selected receipt read failed",{exact:true})).toBeVisible();
 releaseFirst();await firstResponse;await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await expect(history.getByText("Selected receipt read failed",{exact:true})).toBeVisible();await expect(history.getByText("Earlier receipt read failed",{exact:true})).toHaveCount(0);expect(h.writes).toEqual([]);
});
