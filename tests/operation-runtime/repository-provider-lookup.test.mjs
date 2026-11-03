import assert from "node:assert/strict";
import test from "node:test";
import {repositoryCoordinatesFromUrl,assertRepositoryProviderLookup} from "../../src/domain-workspaces/repository/live-runtime/repository-provider-lookup.ts";
import {lookupRepositoryProvider} from "../../src/domain-workspaces/repository/server/repository-custody-oos-client.ts";
const metadata={schema_version:1,provider:"github",provider_host:"github.com",provider_repository_id:"123456789",owner:"example-org",name:"manual-source",canonical_url:"https://github.com/example-org/manual-source",visibility:"private",provider_lifecycle_state:"active",observed_at:"2026-11-03T08:00:00Z"};
test("human repository URL resolves only exact supported GitHub coordinates",()=>{
 assert.deepEqual(repositoryCoordinatesFromUrl("https://github.com/example-org/manual-source.git"),{owner:"example-org",name:"manual-source"});
 for(const url of ["http://github.com/org/repo","https://evil.test/org/repo","https://github.com/org/repo/tree/main","https://user@github.com/org/repo","https://github.com/org/repo?q=1","https://github.com/org/repo#ref","https://github.com:8443/org/repo"])
  assert.throws(()=>repositoryCoordinatesFromUrl(url));
});
test("lookup metadata cannot invent an identity or forward unknown fields",()=>{
 assert.deepEqual(assertRepositoryProviderLookup({...metadata,unexpected:"not forwarded"}),metadata);
 for(const row of [{...metadata,provider_repository_id:"R_graphql"},{...metadata,canonical_url:"https://bad.test/repo"},{...metadata,provider_lifecycle_state:"unknown"}])assert.throws(()=>assertRepositoryProviderLookup(row));
});
test("Console lookup uses its existing server caller and strips data to the provider metadata contract",async()=>{
 const digest=`sha256:${"a".repeat(64)}`;
 const env={OOS_BASE_URL:"http://oos.test",OOS_CALLER_SECRET:"test-only",GOVERNANCE_CONSOLE_OPERATOR_ID:"operator:synthetic",REPOSITORY_CUSTODY_CREDENTIAL_BINDING_URI:"https://binding.test",REPOSITORY_CUSTODY_CREDENTIAL_BINDING_DIGEST:digest,REPOSITORY_CUSTODY_POLICY_PROFILE_URI:"https://policy.test",REPOSITORY_CUSTODY_POLICY_PROFILE_DIGEST:digest};
 const calls=[];const result=await lookupRepositoryProvider("example-org","manual-source",{env,fetchImpl:async(url,init)=>{calls.push({url:String(url),init});return Response.json(metadata)}});
 assert.deepEqual(result,metadata);assert.equal(calls[0].init.method,"GET");assert.match(calls[0].url,/provider-repository\?owner=example-org&name=manual-source$/);
 await assert.rejects(lookupRepositoryProvider("example-org","manual-source",{env,fetchImpl:async()=>Response.json({...metadata,owner:"other",canonical_url:"https://github.com/other/manual-source"})}),{code:"repository_provider_identity_mismatch"});
});
