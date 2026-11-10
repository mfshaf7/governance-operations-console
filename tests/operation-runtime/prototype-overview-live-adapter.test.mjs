import test from "node:test";
import assert from "node:assert/strict";
import {readCanonicalPrototypeOverview} from "../../src/domain-workspaces/prototype/server/prototype-landing-oos-client.ts";
import {canonicalSourceResponse,assertCanonicalSourceRequest} from "../support/console-source-projection.mjs";
const config={baseUrl:"http://127.0.0.1:8080",callerId:"console-test",callerSecret:"test-secret"};
const binding={recordRef:"repo://workspace-prototype-studio/prototypes",sourceOwner:"workspace-prototype-studio",sourceRef:"repo://workspace-prototype-studio@main"};
const counts={total:3,exploring:1,candidate:1,baselineApproved:1,graduating:0,graduated:0,retired:0,blocked:0,movementReady:1};
const body=()=>({schema_version:1,workflow_id:"prototype-overview",authority_revision:"a".repeat(40),canonical_mutation:false,counts:{...counts}});
test("compact overview negotiates native authority and preserves complete lifecycle counts",async()=>{
 const value=await readCanonicalPrototypeOverview({config,fetchImpl:async(url,init)=>{assert.match(url,/view=overview$/);assertCanonicalSourceRequest(init);return canonicalSourceResponse(body(),binding);}});
 assert.deepEqual(value.counts,counts);assert.equal(value.readPath,"compact-owner");
});
test("overview rejects partial counts and never hides an owner outage behind legacy reads",async()=>{
 let reads=0;
 await assert.rejects(readCanonicalPrototypeOverview({config,fetchImpl:async()=>{reads++;return Response.json({error:"owner_unavailable"},{status:503});}}),/owner_unavailable/);
 assert.equal(reads,1);
 const broken=body();broken.counts.total=30;
 await assert.rejects(readCanonicalPrototypeOverview({config,fetchImpl:async()=>canonicalSourceResponse(broken,binding)}),/incomplete or inconsistent/);
});
test("only the positively identified prior owner version uses the canonical legacy collection",async()=>{
 const paths=[];const legacy={schema_version:1,workflow_id:"prototype-records",authority_revision:"b".repeat(40),registry:{prototypes:[]},captures:[],documents:{},workflows:{landing:[],maturity:[],closure:[]}};
 const result=await readCanonicalPrototypeOverview({config,fetchImpl:async url=>{paths.push(url);return url.endsWith("view=overview")?Response.json({error:"prototype_register_page_invalid",message:"Select one Prototype page or exact original."},{status:400}):canonicalSourceResponse(legacy,binding);}});
 assert.equal(result.readPath,"legacy-owner");assert.equal(result.counts.total,0);assert.equal(paths.length,2);
});
