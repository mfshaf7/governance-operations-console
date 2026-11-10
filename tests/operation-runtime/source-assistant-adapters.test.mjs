import test from "node:test";
import assert from "node:assert/strict";
import {sourceEditorOwnerFixture} from "../support/source-editor-owner-fixture.mjs";
import {assistPrototypeEditor} from "../../src/domain-workspaces/prototype/server/prototype-source-editor-oos-client.ts";
import {assistDeliveryEditor} from "../../src/domain-workspaces/delivery/server/delivery-source-editor-oos-client.ts";
import {assertAssistantReply,assertAssistantRequest} from "../../src/console-integration/source-authoring/source-assistant-contract.ts";
for(const kind of ["prototype","delivery"]){
 test(`${kind} assistant uses actual owner session and selected unsaved text without saving source`,async()=>{
  const owner=await sourceEditorOwnerFixture(kind);try{
   const input={schema_version:1,request_id:"assistant:sample",snapshot_id:"snapshot:sample",expected_revision:owner.revision,expected_change_set_digest:null,mode:"edit",prompt:"Explain this source and propose a small comment",conversation:[],files:[{path:owner.filePath,content:"// my unsaved source\n",expected_digest:"sha256:"+"a".repeat(64)}]};
   const call=()=>kind==="prototype"?assistPrototypeEditor(owner.requestId,input,{config:owner.config}):assistDeliveryEditor(71,input,{env:owner.env});
   const reply=await call();assert.equal(reply.session_id,owner.sessionId);assert.equal(reply.edits[0].content,"// my unsaved source\n// suggested\n");assert.equal(owner.writes.length,0);assert.equal(owner.assistantRequests.length,1);assert.deepEqual(owner.assistantRequests[0],input);assert.equal(owner.draft,null);
   for(const mutate of [value=>value.request_id="assistant:foreign",value=>value.session_id="session:foreign",value=>value.edits[0].path="other/project.ts"]){owner.setTamper((value,suffix)=>{if(suffix==="assist")mutate(value);return value;});await assert.rejects(call());}
  }finally{await owner.close();}
 });
}
test("assistant input and output stay bounded and answer-only mode cannot change text",()=>{
 const request={schema_version:1,request_id:"assistant:one",snapshot_id:"snapshot:one",expected_revision:"2026-11-09T00:00:00Z",expected_change_set_digest:null,mode:"ask",prompt:"Explain source",conversation:[],files:[{path:"src/a.ts",content:"unchanged",expected_digest:null}]};assertAssistantRequest(request);
 const reply={schema_version:1,request_id:request.request_id,snapshot_id:request.snapshot_id,session_id:"session:one",revision:request.expected_revision,message:"Answer",created_paths:[],edits:[],evidence:{profile_id:"source-realization-v1",audit_ref:"audit:one",context_ref:"context:one"},replayed:false};assertAssistantReply(reply,request);
 assert.throws(()=>assertAssistantReply({...reply,edits:[{path:"src/a.ts",content:"changed"}]},request));
 assert.throws(()=>assertAssistantRequest({...request,files:[{path:"../a.ts",content:"bad",expected_digest:null}]}));
 assert.throws(()=>assertAssistantRequest({...request,operator_id:"forged"}));
});

test("source proposals bind selected content while preserving unrelated work",async()=>{
 const {sourceAssistantFingerprint}=await import("../../src/console-integration/source-authoring/source-editor-model.ts");
 const original={path:"src/a.ts",content:"original",baseline:"original",expectedDigest:"sha256:"+"a".repeat(64),changed:false,deleted:false};
 const other={...original,path:"src/b.ts",content:"unrelated newer work",changed:true};
 assert.equal(sourceAssistantFingerprint([original],[original]),sourceAssistantFingerprint([original,other],[original]));
 assert.equal(sourceAssistantFingerprint([original],[original]),sourceAssistantFingerprint([],[original]));
 assert.notEqual(sourceAssistantFingerprint([original],[original]),sourceAssistantFingerprint([{...original,content:"later selected edit",changed:true}],[original]));
 assert.notEqual(sourceAssistantFingerprint([original],[original]),sourceAssistantFingerprint([{...original,deleted:true}],[original]));
});
