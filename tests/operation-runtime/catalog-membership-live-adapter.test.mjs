import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {membershipApiRoute} from "../../src/domain-workspaces/delivery/server/membership-api-routes.ts";
import {membershipPreview} from "../../src/domain-workspaces/delivery/presentation/surfaces/catalog/membership-preview.ts";
import {assertMembershipProjection} from "../../src/domain-workspaces/delivery/live-runtime/membership-contract.ts";
function configure(t) {
 const values={OOS_BASE_URL:"http://127.0.0.1:18000",OOS_CALLER_ID:"governance-operations-console",OOS_CALLER_SECRET:"server-only-test-secret",GOVERNANCE_CONSOLE_OPERATOR_ID:"operator:test"};
 for(const [key,value] of Object.entries(values)){const prior=process.env[key];process.env[key]=value;t.after(()=>{if(prior===undefined)delete process.env[key];else process.env[key]=prior;});}
}
function request(method="GET",{origin="http://localhost:4317",body,contentType="application/json"}={}) {
 const url="http://localhost:4317/api/delivery/catalog/memberships?search=Alex&page_size=25";
 return Object.assign(new Request(url,{method,headers:{origin,"content-type":contentType},...(body===undefined?{}:{body})}),{nextUrl:new URL(url)});
}
test("member adapter binds the configured operator and keeps credentials server-side",async t=>{
 configure(t);const calls=[];t.mock.method(globalThis,"fetch",async(url,init)=>{calls.push({url,init});return Response.json(membershipPreview());});
 const response=await membershipApiRoute(request());assert.equal(response.status,200);assert.equal(calls[0].init.headers["x-oos-operator-id"],"operator:test");
 assert.equal(calls[0].init.headers["x-oos-caller-secret"],"server-only-test-secret");assert.match(calls[0].url,/\/v1\/delivery-memberships\/projection\?search=Alex&page_size=25$/);
 assert.equal(JSON.stringify(await response.json()).includes("server-only-test-secret"),false);
});
test("cross-origin and non-JSON membership mutations are denied before upstream dispatch",async t=>{
 configure(t);let calls=0;t.mock.method(globalThis,"fetch",async()=>{calls++;throw new Error("must not dispatch");});
 for(const options of [{origin:"https://untrusted.example"},{contentType:"text/plain"}])assert.equal((await membershipApiRoute(request("POST",{body:"{}",...options}))).status,403);
 assert.equal(calls,0);
});
test("duplicate-key mutation text survives forwarding for strict OOS rejection",async t=>{
 configure(t);const raw='{"request_id":"one","request_id":"two"}';let forwarded;
 t.mock.method(globalThis,"fetch",async(_url,init)=>{forwarded=init;return Response.json({code:"request_invalid",message:"Duplicate object key"},{status:400});});
 const response=await membershipApiRoute(request("POST",{body:raw}));assert.equal(response.status,400);assert.equal(forwarded.body,raw);assert.equal(forwarded.headers["x-oos-operator-id"],"operator:test");
});
test("malformed native membership never becomes an empty or preview success",async t=>{
 configure(t);t.mock.method(globalThis,"fetch",async()=>Response.json({members:[]}));
 const response=await membershipApiRoute(request());assert.equal(response.status,502);assert.match((await response.json()).message,/could not be read safely/);
 assert.throws(()=>assertMembershipProjection({...membershipPreview(),project_identifier:"another-project"}));
});
test("membership read and mutation routes retain verified Console authorization",()=>{
 const source=readFileSync(new URL("../../src/app/api/delivery/catalog/memberships/route.ts",import.meta.url),"utf8");
 assert.equal((source.match(/authorizeConsoleMutation\(request/g)??[]).length,2);
});
