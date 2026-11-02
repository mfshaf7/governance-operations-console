import assert from "node:assert/strict";
import test from "node:test";
import { platformCanonicalDigest } from "../../src/environment-lifecycle/server/platform-operation-oos-client.ts";
import { submitProfileRequest, readProfileRequest, listProfileRequests } from "../../src/environment-lifecycle/server/dev-integration-oos-client.ts";
import { assertOwnerProfileProjection, toDevIntegrationProfile, requestOptionsFromOwner } from "../../src/environment-lifecycle/live-runtime/dev-integration-profile-contract.ts";
import { ownerProfileProjection } from "../support/environment-operations-ui-fixture.mjs";

const NOW = "2026-11-02T00:00:00.000Z";
const config = {baseUrl:"http://127.0.0.1:8080",callerId:"console",callerSecret:"synthetic-secret",operatorId:"operator:bound-owner"};
function intent() {
  return {request_id:"devint-request:unit-one",expected_source_version:`registry:${"a".repeat(40)}`,
    request:{profileId:"new-runtime",ownerRepo:"owner",purpose:"An isolated runtime for integration work.",laneClass:"integration-devint",
      participatingRepos:["owner"],runtimePlatform:"local-k3s",runtimeStateModel:"disposable",dependencies:[],
      expectedWrites:{classification:"none",targets:[]},securityTriggers:[],persistence:null,replacesProfileId:null}};
}
function record(value = intent()) {
  const digest = platformCanonicalDigest(value);
  const claims={request_ref:`oos://dev-integration/requests/${value.request_id}`,request_id:value.request_id,intent_digest:digest,
    operator_id:config.operatorId,recorded_at:NOW,outcome:"request-recorded"};
  return {schema_version:1,workflow_id:"dev-integration-profile-request",...value,intent_digest:digest,operator_id:config.operatorId,
    state:"recorded",created_at:NOW,updated_at:NOW,request_ref:claims.request_ref,receipt:{...claims,digest:platformCanonicalDigest(claims)},
    admission:{state:"not-checked",lifecycle:null,source_version:null,observed_at:null,profile_ref:null},readback:"current",
    next_action:{code:"review-profile-request",owner:"owner",reason:"Request recorded for owner review; no admission or launch."}};
}

test("native request submission binds exact approved intent and strips browser actor/time",async()=>{
  const calls=[];const value=intent();
  const result=await submitProfileRequest({requestId:value.request_id,reviewedSourceVersion:value.expected_source_version,approved:true,
    request:{...value.request,requestedBy:"operator:injected",requestedAt:"1900-01-01T00:00:00Z"}}, {config,fetchImpl:async(url,init)=>{
      calls.push({url:String(url),init,body:JSON.parse(init.body)});return Response.json(record());
    }});
  assert.equal(result.request_ref,`oos://dev-integration/requests/${value.request_id}`);
  assert.equal(calls.length,1);assert.ok(calls[0].url.endsWith("/v1/dev-integration/requests"));
  assert.deepEqual(calls[0].body.request,value.request);
  assert.equal(calls[0].body.approval.intent_digest,platformCanonicalDigest(value));
  assert.equal(calls[0].init.headers["x-oos-operator-id"],config.operatorId);
  assert.equal("proposal_ref" in result,false);
});

test("original read rejects changed receipt or intent and preserves exact encoded identity",async()=>{
  const value=record();let observed;
  const read=await readProfileRequest(value.request_id,{config,fetchImpl:async url=>{observed=String(url);return Response.json(value);}});
  assert.ok(observed.endsWith("/v1/dev-integration/requests/devint-request%3Aunit-one"));
  assert.equal(read.receipt.digest,value.receipt.digest);
  const corrupt=structuredClone(value);corrupt.request.purpose="Changed after recording";
  await assert.rejects(readProfileRequest(value.request_id,{config,fetchImpl:async()=>Response.json(corrupt)}),error=>error.code==="dev_integration_receipt_invalid");
  await assert.rejects(readProfileRequest("devint-request:different",{config,fetchImpl:async()=>Response.json(value)}),error=>error.code==="dev_integration_request_mismatch");
});

test("native request history validates receipts and rejects unexpected owner fields",async()=>{
  const response={schema_version:1,requests:[record()],page:{offset:0,limit:20,total:1,next_offset:null}};
  assert.equal((await listProfileRequests(new URLSearchParams(),{config,fetchImpl:async()=>Response.json(response)})).requests.length,1);
  await assert.rejects(listProfileRequests(new URLSearchParams(),{config,fetchImpl:async()=>Response.json({...response,private_provider_state:"must-not-project"})}));
});

test("registered lifecycle does not fabricate runtime or missing support evidence",()=>{
  const projection=assertOwnerProfileProjection(ownerProfileProjection());
  const profile=toDevIntegrationProfile(projection.profiles[0],projection);
  assert.equal(profile.lifecycle,"active");assert.equal(profile.runtime.observation.state,"unknown");
  assert.equal(profile.stageHandoff.result,"unknown");assert.equal(profile.expectedWrites.classification,"unknown");
  assert.equal(profile.persistence,null);assert.deepEqual(profile.actions,[]);
  assert.ok(profile.supportGaps.includes("security-triggers"));
  assert.deepEqual(requestOptionsFromOwner(projection).ownerRepos,["owner"]);
  assert.deepEqual(requestOptionsFromOwner(projection).runtimePlatforms,["local-k3s"]);
});
