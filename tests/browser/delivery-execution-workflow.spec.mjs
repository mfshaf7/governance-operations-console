import { test, expect } from "../support/filled-surface-layout.mjs";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { sourceIntent, sourceOperation } from "../support/platform-attention-fixture.mjs";
const require=createRequire(import.meta.url);
const {projectCanonicalDeliveryOverview}=require("../../src/domain-workspaces/delivery/live-runtime/delivery-overview-live-projection.ts");
const {assertSourceOperationPreparation}=require("../../src/environment-lifecycle/live-runtime/source-authorization-contract.ts");
const base=process.env.CONSOLE_TEST_BASE_URL??"http://127.0.0.1:3320";
test.setTimeout(120000);
test.use({viewport:{width:1700,height:1050},actionTimeout:12000});

// Isolated browser protocol proof. Every API is intercepted. These responses
// never stand in for qualification of live OOS, source or ART mutations.
async function harness(page, initial = {}){
  const state={complete:false,reads:0,writes:[],errors:[],failClose:false,code:"landing-unit-closeout-retry-required",...initial};
  function inventory(){
    const at=new Date().toISOString(),epic={id:1,type:"Epic",status:"new",subject:"Connected Execution Check",record_ref:"openproject://work_packages/1",owner_repo:null,target_pi:null,architecture_anchor_ref:null,required_upstream_ref:null};
    const tasks=[3,4].map(id=>({id,type:"Task",subject:`Work ${id}`,status:id===3||state.complete?"done":"in-progress",children:[],ready_contract_satisfied:true}));
    return projectCanonicalDeliveryOverview({schema_version:1,workflow_id:"delivery-console-overview",project:{identifier:"workspace-delivery-art"},roots:[epic],deferred_history_refs:[],mutation_authority:"none",
      operational_initiatives:[{epic,summary:{open_descendant_count:state.complete?0:1},execution_tree:{...epic,children:tasks},work_sessions:state.complete?[]:[{session_id:"work-session:delivery-1:workflow",work_item_ids:["work-item-3","work-item-4"],updated_at:at,state:"recorded"}],
        execution_navigation:{authority:"operator-orchestration-service",eligibility:"check-selected-work-item",native_status:"new",workflow_phase:"execution",package_posture:state.complete?"Closeout Pending":"In Progress",closeout_pending:state.complete,
          active_work_item_ids:state.complete?[]:[4],prepared_work_item_ids:[],blocked_work_item_ids:[],refinement_work_item_ids:[]}}]},"browser-owner-revision",at);
  }
  function session(){return {mode:"live",status:"current",observedAt:new Date().toISOString(),error:null,projection:{
    workflow_id:"delivery-art-work-session",work_item_id:"work-item-3",delivery_id:"delivery-1",covered_work_item_ids:["work-item-3","work-item-4"],
    landing_unit_id:"workflow",session_id:Object.hasOwn(state, "sessionId") ? state.sessionId : "work-session:delivery-1:workflow",session_revision:state.complete?"2026-11-17T02:00:00Z":"2026-11-17T01:00:00Z",state:state.sessionStatus??"closeout-required",
    ...(state.operatingEvidence || state.operatingVerification ? {facts:{
      ...(state.operatingVerification ? {pull_request:"merged",review_packet:"merge-ready",evidence:"ready"} : {}),
      operating_evidence:state.operatingEvidence ?? "required",
    }} : {}),
    ...(state.operatingVerification && state.code === "acquire-operating-evidence" ? {operating_verification:state.operatingVerification} : {}),
    ...(state.pendingRebuild ? {pending_rebuild:{command_id:state.pendingRebuild,expected_session_revision:state.rebuildRevision}} : {}),
    ...(state.sourceScope ? {source_access_scope:state.sourceScope} : {}),
    ...(state.boundAccess ? {source_authorization:{intent_ref:state.boundAccess,session_id:state.sessionId}} : {}),
    ...(state.closedSession ? { cleanup_receipt:{ session_id:state.closedSession, outcome:"complete" },
      source_authorization:{ intent_ref:"source-intent:closed",session_id:state.closedSession,
        state:state.closureConfirmed ? "revoked" : "revocation-pending" } } : {}),
    ...(state.pullRequest ? {pull_request:state.pullRequest} : {}),
    next_action:{authority:"operator-orchestration-service",code:state.code,...(state.requiredWork?{inputs:{work_item_id:`work-item-${state.requiredWork}`}}:{}),reason:state.reason??"Synthetic owner next action for the connected workflow check."}}};}
  page.on("pageerror",error=>state.errors.push(error.message));
  await page.route("**/api/**",async route=>{
    const request=route.request(),path=new URL(request.url()).pathname;
    if(path==="/api/delivery/workspace"){state.reads++;return route.fulfill({json:{mode:"live",projection:inventory()}});}
    if(path==="/api/console/capabilities")return route.fulfill({json:{artifactType:"console-runtime-capability-projection",schemaVersion:1,mode:"live",capabilities:[]}});
    if(path==="/api/delivery/execution/3/work-session")return route.fulfill({json:session()});
    if (state.sourceAccess && (path.includes("/source-authorizations") || path.startsWith("/api/environment-operations/"))) {
      return state.sourceAccess(route, path);
    }
    if(path.startsWith("/api/delivery/execution/3/work-session/commands/")){
      const id=decodeURIComponent(path.split("/").at(-1));
      state.resultReads ??= [];
      state.resultReads.push(id);
      if (id === state.publishCommandId) return route.fulfill({json:state.publishFinished
        ? {state:"completed",result:session().projection}
        : {state:"pending",publication:state.publication}});
      if(state.pendingRebuild === id) return route.fulfill({json:{state:"pending",rebuildRevision:state.rebuildRevision}});
      if(id!==state.lostCommandId || !state.complete) return route.fulfill({json:{state:"pending"}});
      return route.fulfill({json:{state:"completed",result:session().projection}});
    }
    if(request.method()==="POST"){
      state.writes.push({path,body:request.postDataJSON()});
      if (path.endsWith("/work-session/continue") && state.code === "agent-source-publish-required" && state.publication) {
        state.publishCommandId = request.postDataJSON().commandId;
        return route.fulfill({status:502,json:{code:"delivery_oos_unavailable"}});
      }
      if (path.endsWith("/work-session/continue") && state.code === "agent-source-credential-required" && state.pendingSourceOperation) {
        return route.fulfill({ status:409, json:{ mode:"live", status:"offline", code:"platform_source_credential_pending",
          error:"The source operation is pending.", sourceOperationId:state.pendingSourceOperation } });
      }
      if(path.endsWith("/work-session/close")){
        if(state.failClose){
          state.failClose=false;
          state.lostCommandId=request.postDataJSON().commandId;
          return route.fulfill({status:503,json:{mode:"live",status:"offline",error:"Synthetic lost acknowledgement",code:"delivery_work_session_projection_unavailable"}});
        }
        state.complete=true;state.code="initiative-closeout-required";return route.fulfill({json:session()});
      }
      if(path.endsWith("/work-session/continue") && state.code==="acquire-operating-evidence"){
        if(state.failOperatingEvidence){
          state.failOperatingEvidence=false;
          state.operatingEvidence="invalid";
        } else {
          state.operatingEvidence="ready";
          state.code="draft-finalization";
        }
        return route.fulfill({json:session()});
      }
      if (path.endsWith("/work-session/continue") && state.code === "source-worktree-required") {
        state.code = "source-work-required";
        return route.fulfill({ json: session() });
      }
      if(path.endsWith("/work-session/reconstruct")){
        const command=request.postDataJSON();
        if(state.interruptRebuild){
          state.interruptRebuild=false; state.pendingRebuild=command.commandId; state.rebuildRevision=command.expectedSessionRevision;
          return route.fulfill({status:502,json:{code:"delivery_work_session_dependency_failed"}});
        }
        if(state.pendingRebuild){state.pendingRebuild=null; state.sessionId="work-session:delivery-1:workflow:r1";}
        state.code="art-closeout-required";return route.fulfill({json:session()});
      }
      if(path.endsWith("/work-session/recover")){state.code="initiative-work-remains";return route.fulfill({json:session()});}
      return route.fulfill({status:503,json:{error:"Isolated unimplemented owner action"}});
    }
    return route.fulfill({status:503,json:{mode:"live",status:"offline",projection:null,error:"Isolated unavailable owner"}});
  });
  return {state,...await openWorkSession(page)};
}

test("publication shows the confirmed PR while the same command finishes its checks", async ({page})=>{
  const publication = { url:"https://github.com/example/work/pull/43", head_commit:"a".repeat(40) };
  const {state,modal} = await harness(page, {code:"agent-source-publish-required", publication});
  await modal.getByRole("button",{name:"Send changes for review",exact:true}).click();
  await expect(modal.getByRole("heading",{name:"Pull request opened",exact:true})).toBeVisible();
  await expect(modal.getByRole("link",{name:"Open Pull Request ↗",exact:true})).toHaveAttribute("href",publication.url);
  await expect(modal.getByRole("button",{name:"Send changes for review",exact:true})).toHaveCount(0);
  state.pullRequest = { state:"open", ...publication };
  state.code = "pull-request-review-required";
  state.publishFinished = true;
  await expect(modal.getByRole("heading",{name:"Review the file changes",exact:true})).toBeVisible({timeout:15000});
  expect(state.writes).toHaveLength(1);
  expect(new Set(state.resultReads)).toEqual(new Set([state.publishCommandId]));
});

test("pending access follows its original Platform operation before offering publication", async ({page})=>{
  const sessionId = "work-session:delivery-1:workflow";
  const digest = `sha256:${"a".repeat(64)}`;
  const access = deliverySourceAccess("source-intent:bound-renewal", digest, sessionId, "approved", { confirmed:true });
  const renewalId = "e".repeat(24);
  const inProgress = sourceOperation(renewalId,"agent-source.renew","running",access.intent);
  const succeeded = sourceOperation(renewalId,"agent-source.renew","succeeded",access.intent);
  let finished = false;
  const {state,modal} = await harness(page, {
    sessionId, code:"agent-source-credential-required", sourceScope:{ work_item_ref:"work-item-3", source_start_digest:digest },
    boundAccess:access.intent.intent_id, pendingSourceOperation:inProgress.operation_id,
    sourceAccess(route,path) {
      if (path.startsWith("/api/environment-operations/")) {
        const operation = decodeURIComponent(path).endsWith(inProgress.operation_id) ? (finished ? succeeded : inProgress) : access.operation;
        return route.fulfill({json:operation});
      }
      return route.fulfill({json:{mode:"live",projection:path.endsWith("/source-authorizations") ? [access.preparation] : access.preparation,error:null}});
    },
  });
  await modal.getByRole("button",{name:"Continue with approved access",exact:true}).click();
  await expect(modal.getByRole("heading",{name:"Checking repository access",exact:true})).toBeVisible();
  await expect(modal.getByRole("button",{name:"Continue with approved access",exact:true})).toBeDisabled();
  state.code = "agent-source-publish-required";
  finished = true;
  await expect(modal.getByRole("button",{name:"Send changes for review",exact:true})).toBeVisible({ timeout:15000 });
  expect(state.writes).toHaveLength(1);
});

test("a retired session follows its original access closure and returns to closeout", async ({page})=>{
  const closedSession = "work-session:delivery-1:workflow";
  let closureConfirmed = false;
  const {state,modal} = await harness(page, {
    sessionId:null, closedSession, sessionStatus:"closed", code:"source-revocation-pending",
    async sourceAccess(route, path) {
      expect(decodeURIComponent(path)).toBe("/api/platform-operations/source-authorizations/source-intent:closed");
      const access = deliverySourceAccess("source-intent:closed", `sha256:${"a".repeat(64)}`, closedSession,
        closureConfirmed ? "revoked" : "revocation-requested");
      return route.fulfill({json:{mode:"live",projection:access.preparation,error:null}});
    },
  });
  await expect(modal.getByRole("heading",{name:"Confirm repository access ended",exact:true})).toBeVisible();
  await expect(modal.getByRole("button",{name:"Approve repository access",exact:true})).toHaveCount(0);
  await expect(modal.getByRole("button",{name:"Show replacement access request",exact:true})).toHaveCount(0);
  state.closureConfirmed = closureConfirmed = true;
  state.code = "initiative-closeout-required";
  await modal.getByRole("button",{name:"Check access status",exact:true}).click();
  await expect(modal.getByRole("button",{name:"Review Closeout",exact:true})).toBeVisible();
  expect(state.writes).toEqual([]);
});

function deliverySourceAccess(id, digest, sessionId, state, { prior = null, confirmed = false } = {}) {
  const intent = sourceIntent({ intent_id: id, source_start_digest: digest,
    subject: { kind: "delivery", work_item_ref: "work-item-3", snapshot_digest: `sha256:${"c".repeat(64)}` },
    landing_unit_id: "workflow", supersedes_intent_digest: prior });
  const action = state === "revoked" ? "agent-source.revoke" : "agent-source.issue";
  const operation = sourceOperation(createHash("sha256").update(id).digest("hex").slice(0, 24), action, "succeeded", intent);
  const receipt = operation.provider_operation.receipt.source_credential;
  return { intent, operation, preparation: assertSourceOperationPreparation({
    schema_version: 1, workflow_id: "source-credential-preparation", intent_id: id,
    source_intent: intent, source_intent_digest: receipt.source_intent_digest, session_id: sessionId,
    created_at: state === "revoked" ? "2026-11-17T01:00:00Z" : "2026-11-17T02:00:00Z",
    start_decision: { schema_version: 1, artifact_type: "delivery_art_work_session_decision",
      work_item_id: "work-item-3", covered_work_item_ids: ["work-item-3", "work-item-4"], caller_id: "governance-operations-console",
      operator: { id: intent.operator_id, decision_source: "operator" },
      landing_unit: { id: "workflow", decision: "feature_single_landing_unit", split_reason: "One scope", base_ref: "origin/main", branch: intent.branch, rollback_boundary: "Revert expected source" },
      architecture: { required: false, artifact_location: null }, human_gate_work_item_ids: { security_acceptance: [] } },
    operation_refs: { issue: confirmed && state === "approved" ? operation.operation_id : null, revoke: confirmed && state === "revoked" ? operation.operation_id : null },
    authorization: { state, approval_ref: state === "approved" ? "source-approval:browser" : null, credential_receipt: confirmed ? receipt : null },
    authority: "operator-orchestration-service", secret_values_embedded: false,
  })};
}

test("a rebuilt session waits for the current access receipt before preparing source", async ({ page }, info) => {
  const priorSession = "work-session:delivery-1:workflow";
  const sessionId = `${priorSession}:r1`;
  const digest = `sha256:${"b".repeat(64)}`;
  const oldId = "source-intent:prior-access", newId = "source-intent:replacement-access";
  const old = deliverySourceAccess(oldId, `sha256:${"a".repeat(64)}`, priorSession, "revoked", { confirmed: true });
  const stale = deliverySourceAccess("source-intent:wrong-session", digest, priorSession, "approved", { confirmed: true });
  const successor = options => deliverySourceAccess(newId, digest, sessionId, options.state, { prior: old.preparation.source_intent_digest, confirmed: options.confirmed });
  const oldReads = [];
  let current = null;
  const { state, modal } = await harness(page, {
    sessionId, code: "source-worktree-required", sessionStatus: "implementation-ready",
    sourceScope: { work_item_ref: "work-item-3", source_start_digest: digest, predecessor_intent_ref: oldId },
    async sourceAccess(route, path) {
      const request = route.request();
      const success = projection => route.fulfill({ json: { mode: "live", projection, error: null } });
      if (path.startsWith("/api/environment-operations/")) return route.fulfill({ json: decodeURIComponent(path).endsWith(old.operation.operation_id) ? old.operation : current.operation });
      if (request.method() === "POST" && path.endsWith("/source-authorizations")) {
        expect(request.postDataJSON().supersedesIntentDigest).toBe(old.preparation.source_intent_digest);
        current = successor({ state: "prepared" });
        return success(current.preparation);
      }
      if (request.method() === "POST") {
        expect(request.postDataJSON().action).toBe("issue");
        current = successor({ state: "approved" });
        return success(current.preparation);
      }
      if (decodeURIComponent(path).endsWith(oldId)) {
        oldReads.push(path);
        return success(old.preparation);
      }
      if (decodeURIComponent(path).endsWith(newId)) return success(current.preparation);
      expect(new URL(request.url()).searchParams.get("work_item_ref")).toBe("work-item-3");
      return success(current ? [stale.preparation, current.preparation] : [stale.preparation]);
    },
  });
  await expect(modal.getByRole("heading", { name: "Previous repository access", exact: true })).toBeVisible();
  const prepareWorkspace = modal.getByRole("button", { name: "Set up work files", exact: true });
  await expect(prepareWorkspace).toHaveCount(0);
  await expect(modal.getByRole("button", { name: "Edit or import files", exact: true })).toHaveCount(0);
  await modal.screenshot({path:info.outputPath("rebuilt-session-review-access.png")});
  await modal.getByRole("button", { name: "Show replacement access request", exact: true }).click();
  await modal.getByRole("button", { name: "Approve repository access", exact: true }).click();
  await expect(modal.getByRole("button", { name: "Check access activation", exact: true })).toBeVisible();
  await expect(prepareWorkspace).toHaveCount(0);
  current = successor({ state: "approved", confirmed: true });
  await modal.getByRole("button", { name: "Check access status", exact: true }).click();
  await expect(prepareWorkspace).toBeEnabled();
  await prepareWorkspace.click();
  expect(state.writes[0].body.sourceIntentRef).toBe(newId);
  expect(oldReads.length).toBeGreaterThan(0);
  expect(state.errors).toEqual([]);
});

async function openWorkSession(page){
  await page.goto(base,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>{const b=document.querySelector('button[title="Open DELIVERY"]');return b&&Object.keys(b).some(key=>key.startsWith("__reactProps$"));});
  await page.locator('button[title="Open DELIVERY"]').click();
  const workspace=page.getByRole("dialog",{name:"Delivery Workspace",exact:true});
  await workspace.locator('[data-delivery-workspace-section="execution-board"]').click();
  await workspace.getByRole("button",{name:"Open Work Board",exact:true}).click();
  const completed = workspace.locator('[data-execution-work-item]').filter({ hasText: "Work 3" });
  await expect(completed).toContainText("Session Recorded");
  await completed.click();
  await workspace.getByRole("button",{name:"Open Work Session",exact:true}).click();
  return {workspace,modal:page.getByRole("dialog",{name:"Work Session",exact:true})};
}

test("lost closeout acknowledgement recovers the original result across reload without resubmitting",async({page},info)=>{
  const {state,workspace,modal}=await harness(page);state.failClose=true;
  await expect(workspace.getByRole("heading",{name:"New",exact:true})).toHaveCount(0);
  const before=state.reads;
  await modal.getByRole("button",{name:"Retry completing the work",exact:true}).click();
  await expect(modal.getByRole("heading",{name:"Checking the original result",exact:true})).toBeVisible();
  await expect(modal.getByRole("button",{name:"Retry completing the work",exact:true})).toHaveCount(0);
  const recovered=await openWorkSession(page);
  await expect(recovered.modal.getByRole("heading",{name:"Checking the original result",exact:true})).toBeVisible();
  await recovered.modal.getByRole("heading",{name:"Checking the original result",exact:true}).scrollIntoViewIfNeeded();
  await recovered.modal.screenshot({path:info.outputPath("checking-original-work-session-result.png")});
  state.complete=true;
  state.code="initiative-closeout-required";
  await expect(recovered.modal.getByRole("button",{name:"Review Closeout",exact:true})).toBeVisible({timeout:15000});
  await expect.poll(()=>state.reads).toBeGreaterThan(before);
  expect(state.writes).toHaveLength(1);
  expect(new Set(state.resultReads)).toEqual(new Set([state.writes[0].body.commandId]));
  for (const [width,height] of [[1700,1050],[1280,720]]) {
    await page.setViewportSize({width,height});
    await modal.getByRole("button",{name:"Review Closeout",exact:true}).scrollIntoViewIfNeeded();
    await modal.screenshot({path:info.outputPath(`execution-session-follow-up-${width}.png`)});
    expect(await modal.evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);
  }
  await modal.getByRole("button",{name:"Review Closeout",exact:true}).click();
  await expect(page.getByRole("dialog",{name:"Delivery Closeout",exact:true})).toBeVisible();
  expect(state.writes.map(item=>item.path)).toEqual(["/api/delivery/execution/3/work-session/close"]);
  expect(state.errors).toEqual([]);
});

test("an interrupted work-session rebuild resumes with the original id and revision after reload", async ({ page }) => {
  const { state, modal }=await harness(page);
  state.code="architecture-reconstruction-required";
  state.sessionStatus="architecture-superseded";
  state.interruptRebuild=true;
  await modal.getByRole("button", { name:"Refresh session", exact:true }).click();
  await modal.getByRole("button", { name:"Rebuild work session", exact:true }).click();
  await expect(modal.getByRole("button", { name:"Resume Saved Rebuild", exact:true })).toBeVisible();
  await page.evaluate(() => window.sessionStorage.clear());
  const { modal: reopened }=await openWorkSession(page);
  await reopened.getByRole("button", { name:"Resume Saved Rebuild", exact:true }).click();
  await expect(reopened.getByRole("button", { name:"Complete the covered work", exact:true })).toBeVisible();
  expect(state.writes).toHaveLength(2);
  expect(state.writes[0]).toEqual(state.writes[1]);
  expect(state.errors).toEqual([]);
});

test("the editor reviews and rechecks retained source before staging it in a new draft", async ({ page }, info) => {
  const { state, modal }=await harness(page);
  state.code="source-work-required";
  state.sessionStatus="source-work";
  state.sessionId="work-session:delivery-1:workflow:r1";
  const revision="2026-11-17T01:00:00Z", baseCommit="a".repeat(40);
  const previous="work-session:delivery-1:workflow", digest=`sha256:${"b".repeat(64)}`;
  const current={sessionId:state.sessionId,revision,state:"not-started",attempt:null};
  const operations=[{action:"replace",path:"src/export.ts",expected_digest:digest,content:"export const ENABLE_EXPORT = true;\n"}];
  let checkMatches=false;
  await page.route("**/api/delivery/execution/3/work-session/realization**", async route => {
    const request=route.request(), url=new URL(request.url());
    if(request.method()!=="GET") { state.writes.push(request.method()); return route.abort(); }
    const success=projection=>route.fulfill({json:{mode:"live",projection,error:null}});
    if(url.pathname.endsWith("/realization"))return success({
      schema_version:1, workflow_id:"delivery-art-source-realization", work_item_id:"work-item-3", session_id:state.sessionId,
      revision,state:"not-started",attempt:null,replayed:false,retained_draft_available:true,
      next_action:{authority:"operator-orchestration-service",code:"source-realization-start-required",reason:"The workspace is ready for source work."},
    });
    if(url.pathname.endsWith("/draft") && url.searchParams.has("retained"))return success({
      sessionId:state.sessionId, sameRepository:true,
      draft:{session_id:previous,revision,digest,objective:"Add an export action to the workspace.",accepted:false,provenance:null,
        change_set:{schema_version:1,change_set_id:"source-saved:proof",session_id:previous,base_commit:baseCommit,objective_digest:digest,commit_message:"Add the export action",operations}},
    });
    if(url.pathname.endsWith("/draft"))return route.fulfill({status:404,json:{mode:"live",projection:null,code:"delivery_art_source_realization_draft_missing",error:"Save a draft to begin."}});
    return success({current,capture:{head_commit:baseCommit,tree:{paths:["src/export.ts"],truncated:false},files:url.searchParams.has("path")?
      [{path:"src/export.ts",content:"export const ENABLE_EXPORT = false;\n",content_digest:checkMatches?digest:`sha256:${"c".repeat(64)}`}]:[]}});
  });
  await modal.getByRole("button", { name:"Refresh session", exact:true }).click();
  await modal.getByRole("button", { name:"Refresh file status", exact:true }).click();
  await modal.getByRole("button", { name:"Edit or import files", exact:true }).click();
  const editor=page.getByRole("dialog",{name:"Delivery source workspace",exact:true});
  await editor.getByRole("button",{name:"Review Previous Draft",exact:true}).click();
  await expect(editor.locator(".cm-content")).toContainText("ENABLE_EXPORT = true");
  await expect(editor.getByRole("button",{name:"Save private draft",exact:true})).toHaveCount(0);
  await editor.screenshot({path:info.outputPath("review-previous-source-draft.png")});
  await editor.getByRole("button",{name:"Check and Recover Files",exact:true}).click();
  await expect(editor.getByText(/src\/export\.ts has changed since the draft was saved/)).toBeVisible();
  checkMatches=true;
  await editor.getByRole("button",{name:"Check and Recover Files",exact:true}).click();
  await expect(editor.getByText(/Recovered files are ready for review/)).toBeVisible();
  await expect(editor.getByRole("button",{name:"Save private draft",exact:true})).toBeEnabled();
  expect(state.writes).toEqual([]);
});

test("source editor explains blocked source, resumes an expired save, and reviews only the saved section", async ({page}, info) => {
  const {state,modal}=await harness(page,{code:"source-work-required",sessionStatus:"source-work"});
  const sessionId="work-session:delivery-1:workflow", base="a".repeat(40), file="large.txt";
  const baselineDigest="sha256:"+"b".repeat(64), savedDigest="sha256:"+"c".repeat(64);
  const sectionText="Original selected range\n";
  let current={sessionId,revision:"2026-11-17T01:00:00Z",state:"not-started",attempt:null};
  let dirtyRepo=true, expired=false, saved=null, originalSave=null;
  const writes=[];
  await page.route("**/api/delivery/execution/3/work-session/realization**", async route => {
    const request=route.request(),url=new URL(request.url());
    const success=projection=>route.fulfill({json:{mode:"live",projection,error:null}});
    const failure=(status,code,error)=>route.fulfill({status,json:{mode:"live",projection:null,code,error}});
    if (url.pathname.endsWith("/realization")) return success({
      schema_version:1,workflow_id:"delivery-art-source-realization",work_item_id:"work-item-3",session_id:sessionId,
      revision:current.revision,state:"not-started",attempt:null,replayed:false,
      next_action:{authority:"operator-orchestration-service",code:"source-realization-start-required",reason:"Source work is ready."},
    });
    if (url.pathname.endsWith("/draft")) {
      if (request.method()==="POST") {
        originalSave??=request.postDataJSON();
        if (expired) return failure(401,"console_session_projection_stale","The session expired.");
        const command=request.postDataJSON();
        writes.push(command);
        current={...current,state:"draft-ready",revision:"2026-11-17T01:01:00Z",
          attempt:{requestId:command.command_id,executionId:command.execution_id,objectiveDigest:"",digest:savedDigest}};
        saved={session_id:sessionId,revision:current.revision,digest:savedDigest,objective:command.objective,accepted:false,
          provenance:null,editorState:current,change_set:{base_commit:base,commit_message:command.commit_message,operations:command.operations}};
        return success({commandId:command.command_id,savedRevision:current.revision,savedDigest,current,replayed:false});
      }
      if (expired) return failure(401,"console_session_projection_stale","The session expired.");
      return saved ? success(saved) : failure(404,"delivery_art_source_realization_draft_missing","No draft saved.");
    }
    if (dirtyRepo) return failure(409,"delivery_art_source_realization_worktree_dirty","The prepared repository has uncommitted changes.");
    const line=url.searchParams.get("line");
    if (url.searchParams.has("path")&&!line) return failure(409,"delivery_art_source_realization_patch_required","Choose a source section.");
    return success({current,capture:{head_commit:base,tree:{paths:[file],truncated:false},files:line?[{
      path:file,content:sectionText,content_digest:"sha256:"+"d".repeat(64),
      region:{start_line:Number(line),end_line:Number(line),total_lines:5400,offset_utf16:Number(line)*12,baseline_digest:baselineDigest,baseline_bytes:80000},
    }]:[]}});
  });
  await modal.getByRole("button",{name:"Refresh file status",exact:true}).click();
  await modal.getByRole("button",{name:"Edit or import files",exact:true}).click();
  const editor=page.getByRole("dialog",{name:"Delivery source workspace",exact:true});
  await expect(editor.getByRole("heading",{name:"Repository has uncommitted changes",exact:true})).toBeVisible();
  await editor.screenshot({path:info.outputPath("editor-dirty-baseline.png")});
  dirtyRepo=false;
  await editor.getByRole("button",{name:"Check source workspace",exact:true}).click();
  await editor.getByRole("treeitem",{name:"Open large.txt",exact:true}).click();
  await expect(editor.getByRole("heading",{name:"Source lines 1–1 of 5400"})).toBeVisible();
  await editor.getByRole("textbox",{name:"Starting line",exact:true}).fill("200");
  await editor.getByRole("button",{name:"Load section",exact:true}).click();
  await expect(editor.getByRole("heading",{name:"Source lines 200–200 of 5400"})).toBeVisible();
  await expect(editor.locator(".cm-lineNumbers .cm-gutterElement").filter({hasText:/^200$/})).toBeVisible();
  await editor.locator(".cm-content[contenteditable=true]").fill("Revised selected range");
  await editor.getByRole("textbox",{name:"Source objective",exact:true}).fill("Revise a selected source section in the sample project.");
  await editor.getByRole("textbox",{name:"Commit message for the saved draft",exact:true}).fill("Update the selected source range");
  expired=true;
  await editor.getByRole("button",{name:"Save private draft",exact:true}).click();
  await expect(editor.getByRole("heading",{name:"Console access expired",exact:true})).toBeVisible();
  await expect(editor.locator(".cm-content")).toContainText("Revised selected range");
  await expect(editor.getByRole("button",{name:"Retry original save",exact:true})).toBeDisabled();
  await editor.screenshot({path:info.outputPath("editor-expired-session.png")});
  expired=false;
  await editor.getByRole("button",{name:"Check source workspace",exact:true}).click();
  await editor.getByRole("button",{name:"Retry original save",exact:true}).click();
  await expect(editor.getByRole("button",{name:"Mark saved digest inspected",exact:true})).toBeEnabled();
  await editor.getByRole("radio",{name:"Review diff",exact:true}).click();
  await expect(editor.locator(".cm-content").first()).toContainText("Original selected range");
  await expect(editor.locator(".cm-content").last()).toContainText("Revised selected range");
  await editor.screenshot({path:info.outputPath("editor-saved-section.png")});
  expect(writes).toEqual([originalSave]);
  expect(writes[0].operations).toEqual([{action:"patch",path:file,expected_digest:baselineDigest,
    content:"Revised selected range",patch:{offset_utf16:2400,before:sectionText}}]);
  expect(state.errors).toEqual([]);
});

test("human review remains a link and reconstruction uses its bounded owner action",async({page})=>{
  const {state,workspace,modal}=await harness(page, { code:"pull-request-review-required",
    pullRequest: {state:"open",url:"https://github.com/example/work/pull/1",head_commit:"a".repeat(40)} });
  await modal.getByRole("button",{name:"Refresh session",exact:true}).click();
  await expect(modal.getByRole("link",{name:"Open Pull Request ↗",exact:true})).toHaveAttribute("href","https://github.com/example/work/pull/1");
  await expect(modal.getByRole("button",{name:"Merge reviewed changes",exact:true})).toHaveCount(0);expect(state.writes).toEqual([]);
  state.code="pull-request-base-update-required";
  await modal.getByRole("button",{name:"Refresh session",exact:true}).click();
  await expect(modal.getByText("Branch behind",{exact:true})).toBeVisible();
  await expect(modal.getByRole("button",{name:"Merge reviewed changes",exact:true})).toHaveCount(0);
  state.code="source-merge-approval-required";
  await modal.getByRole("button",{name:"Refresh session",exact:true}).click();
  await expect(modal.getByRole("button",{name:"Merge reviewed changes",exact:true})).toBeVisible();
  await expect(modal.getByRole("link",{name:"Open Pull Request ↗",exact:true})).toBeVisible();
  state.code="architecture-reconstruction-required";
  await modal.getByRole("button",{name:"Refresh session",exact:true}).click();
  await modal.getByRole("button",{name:"Rebuild work session",exact:true}).click();
  expect(state.writes.map(item=>item.path)).toEqual(["/api/delivery/execution/3/work-session/reconstruct"]);
  state.code="architecture-human-gate-required";state.requiredWork=4;
  await modal.getByRole("button",{name:"Refresh session",exact:true}).click();
  await modal.getByRole("button",{name:"Open Required Work",exact:true}).click();
  await expect(workspace.locator('[data-execution-work-item]').filter({hasText:"Work 4"})).toHaveAttribute("aria-pressed","true");
  expect(state.writes).toHaveLength(1);
  expect(state.errors).toEqual([]);
});

test("recovery requires an explicit substantive reason and then offers remaining-work navigation",async({page})=>{
  const {state,workspace,modal}=await harness(page, { code:"architecture-recovery-required",
    pullRequest: {state:"merged",url:"https://github.com/example/work/pull/1",head_commit:"a".repeat(40),merge_commit:"b".repeat(40)} });
  await modal.getByRole("button",{name:"Refresh session",exact:true}).click();
  const archive=modal.getByRole("button",{name:"Archive Superseded Session",exact:true});
  await expect(archive).toBeDisabled();
  await modal.getByRole("textbox",{name:"Reason for archiving",exact:true}).fill("Preserve this attempt while preparing work against the accepted replacement architecture.");
  await archive.click();
  expect(state.writes).toHaveLength(1);expect(state.writes[0].path).toBe("/api/delivery/execution/3/work-session/recover");
  expect(state.writes[0].body.recovery.pull_request.head_commit).toBe("a".repeat(40));
  await modal.getByRole("button",{name:"Open Work Board",exact:true}).click();
  await expect(workspace.locator('[data-execution-work-item]').filter({hasText:"Work 4"})).toBeVisible();
  await expect(modal).toHaveCount(0);
  expect(state.errors).toEqual([]);
});


test("Next action presents the next step and keeps owner diagnostics available on demand", async ({ page }, info) => {
  const sessionId = "work-session:delivery-1:workflow";
  const access = deliverySourceAccess("source-intent:bound", `sha256:${"a".repeat(64)}`, sessionId, "approved", { confirmed: true });
  const { state, modal } = await harness(page, {
    sessionId, boundAccess: access.intent.intent_id,
    sourceScope: { work_item_ref: "work-item-3", source_start_digest: `sha256:${"b".repeat(64)}` },
    sourceAccess(route, path) {
      if (path.startsWith("/api/environment-operations/")) return route.fulfill({ json: access.operation });
      const projection = path.endsWith("/source-authorizations") ? [access.preparation] : access.preparation;
      return route.fulfill({ json: { mode: "live", projection, error: null } });
    },
  });
  state.code = "architecture-compatible-refresh-required";
  state.sessionStatus = "architecture-refresh-required";
  state.reason = "The active Landing Unit design is unchanged; refresh its durable architecture and work-start bindings before continuing.";
  const read = modal.getByRole("button", { name: "Refresh session", exact: true });
  await read.click();
  const refreshTitle = modal.getByRole("heading", { name: "Refresh the session plan", exact: true });
  await expect(refreshTitle).toBeVisible();
  const move = modal.getByText("Next action", { exact: true }).locator("xpath=ancestor::section[1]");
  await expect(move.getByRole("button", { name: "Refresh Session Plan", exact: true })).toBeEnabled();
  await expect(move.getByText(state.reason, { exact: true })).toBeHidden();
  await expect(move.getByText("Refresh needed", { exact: true })).toBeVisible();
  await move.getByText("Technical details", { exact: true }).click();
  await expect(move.getByText(state.reason, { exact: true })).toBeVisible();
  await expect(move.getByText(state.code, { exact: true })).toBeVisible();
  await move.getByText("Technical details", { exact: true }).click();

  state.code = "source-work-required";
  state.sessionStatus = "source-work";
  state.reason = "Source must descend from the recorded base, remain on the recorded branch, and be clean and pushed before review evidence can advance.";
  await read.click();
  await expect(move.getByRole("heading", { name: "Edit the work files", exact: true })).toBeVisible();
  await expect(move.getByText("In progress", { exact: true })).toBeVisible();
  await expect(move.getByText(/Use Edit or import files/)).toBeVisible();
  await expect(move.getByText(state.reason, { exact: true })).toBeHidden();
  await expect(move.getByRole("button", { name: "Refresh Session Plan", exact: true })).toHaveCount(0);
  expect(state.writes).toEqual([]);
  for (const [width, height] of [[1700, 1050], [1280, 720]]) {
    await page.setViewportSize({ width, height });
    await move.screenshot({ path: info.outputPath(`current-move-${width}.png`) });
    expect(await move.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  }
  expect(state.errors).toEqual([]);
});


test("the merged session can request verification of recorded runtime results", async ({ page }) => {
  const { state, modal } = await harness(page, {
    pullRequest: {state:"merged",url:"https://github.com/example/work/pull/1",head_commit:"a".repeat(40),merge_commit:"b".repeat(40)},
  });
  state.code = "acquire-operating-evidence";
  state.sessionStatus = "implementation-ready";
  state.failOperatingEvidence = true;
  await modal.getByRole("button", { name: "Refresh session", exact: true }).click();

  await expect(modal.getByRole("heading", { name: "Verify the runtime results", exact: true })).toBeVisible();
  await expect(modal.getByRole("link", { name: "Open Merged Pull Request ↗", exact: true })).toBeVisible();
  await expect(modal.getByRole("button", { name: "Edit or import files", exact: true })).toHaveCount(0);
  await expect(modal.getByRole("heading", { name: "Review repository access", exact: true })).toHaveCount(0);
  const verify = modal.getByRole("button", { name: "Verify Runtime Results", exact: true });
  await verify.click();
  await expect(modal.getByRole("heading", { name: "Runtime results need attention", exact: true })).toBeVisible();
  await expect(modal.getByRole("button", { name: "Prepare Final Evidence", exact: true })).toHaveCount(0);

  await verify.click();
  await expect(modal.getByRole("button", { name: "Prepare Final Evidence", exact: true })).toBeVisible();
  expect(state.writes).toHaveLength(2);
  expect(state.writes[0]).toMatchObject({
    path: "/api/delivery/execution/3/work-session/continue",
    body: { expectedSessionRevision: "2026-11-17T01:00:00Z" },
  });
  expect(state.errors).toEqual([]);
});

test("reviewed runtime verification shows the original merge, verifier and approved cases before submitting", async ({ page }, info) => {
  const pr = { state:"merged", url:"https://github.com/mfshaf7/operator-orchestration-service/pull/433",
    head_commit:"0a713fe77eb034dc570886db31b4418e1aa672f5", merge_commit:"de3df94439f1741954087ec5f5718b098d10cf12" };
  const operatingVerification = {
    digest: "sha256:" + "c".repeat(64), review_packet_digest: "sha256:" + "a".repeat(64),
    source: { pull_request_url:pr.url, head_commit:pr.head_commit, merge_commit:pr.merge_commit },
    verifier: { pull_request_url:"https://github.com/mfshaf7/operator-orchestration-service/pull/435",
      revision:"7391da772326acc8a3706d95c59be9af04d1aebd" },
    cases: [{id:"case:recovery",title:"Recover the original run after a Broker restart"},
      {id:"case:rejections",title:"Reject invalid source and replays while preserving results"}],
  };
  const { state, modal } = await harness(page, { code:"acquire-operating-evidence", sessionStatus:"implementation-ready", pullRequest:pr, operatingVerification });
  const details = modal.getByRole("region", { name:"Work details", exact:true });
  const actions = modal.getByRole("region", { name:"Session actions", exact:true });
  await expect(details.getByRole("link", {name:/PR #433/})).toHaveAttribute("href", pr.url);
  await expect(details.getByRole("link", {name:/PR #435/})).toHaveAttribute("href", operatingVerification.verifier.pull_request_url);
  await expect(details.getByText("Merge review recorded", { exact:true })).toBeVisible();
  for (const { title } of operatingVerification.cases) await expect(details.getByText(title, { exact:true })).toBeVisible();
  await modal.screenshot({path:info.outputPath("reviewed-verification-original-merge.png")});
  await actions.getByRole("button", {name:"Verify Runtime Results", exact:true}).click();
  await expect(modal.getByRole("button", {name:"Prepare Final Evidence", exact:true})).toBeVisible();
  expect(state.writes).toHaveLength(1);
  expect(state.writes[0].body.reviewedVerificationDigest).toBe(operatingVerification.digest);
  expect(state.writes[0].body).not.toHaveProperty("sourceIntentRef");
});
