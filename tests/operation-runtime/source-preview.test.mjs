import assert from 'node:assert/strict';
import test from 'node:test';
import {assertSourcePreview,sourcePreviewEndpoint} from '../../src/console-integration/source-authoring/source-preview-contract.ts';
import {prototypeSourcePreviewAdapter} from '../../src/domain-workspaces/prototype/live-runtime/prototype-source-preview-adapter.ts';
import {assertPrototypeOwnerPreparation} from '../../src/domain-workspaces/prototype/live-runtime/prototype-source-contract.ts';
const origin='http://localhost:4317',subject='prototype:sample';
const snapshot=()=>({subjectId:subject,state:'running',endpoint:'http://127.0.0.1:18191',instanceId:'a'.repeat(24),sourceRevision:'b'.repeat(40),sourceDigest:'sha256:'+'c'.repeat(64),embeddingOrigins:[origin]});
test('preview accepts explicit owner identity and separate runtime version, with a closed inactive state',()=>{
 assert.deepEqual(assertSourcePreview(snapshot(),subject,origin),snapshot());
 assertSourcePreview({...snapshot(),state:'stopped',endpoint:null,instanceId:null},subject,origin);
 for(const value of [null, {...snapshot(),sourceRevision:['b'.repeat(40)]},{...snapshot(),instanceId:42},{...snapshot(),sourceDigest:['sha256:'+'c'.repeat(64)]},{...snapshot(),subjectId:'prototype:other'},{...snapshot(),state:'stale'},{...snapshot(),sourceRevision:'bad'},{...snapshot(),embeddingOrigins:['http://localhost:*']},{...snapshot(),embeddingOrigins:[origin,origin]},{...snapshot(),embeddingOrigins:['http://localhost:4317\n']}])assert.throws(()=>assertSourcePreview(value,subject,origin));
});
test('iframe endpoint rejects Console origin, credentials, external destinations and executable schemes',()=>{
 for(const url of [origin,'http://user:password@127.0.0.1:18191','https://example.com','javascript:alert(1)','data:text/html,test','http://localhost:80','http://127.0.0.1:18191/?token=secret'])assert.throws(()=>sourcePreviewEndpoint(url,origin));
 assert.equal(sourcePreviewEndpoint('http://127.0.0.1:18191',origin),'http://127.0.0.1:18191/');
});
test('Prototype adapter uses the exact read route and signal, never a runtime mutation',async t=>{
 const calls=[];t.mock.method(globalThis,'fetch',async(url,options)=>{calls.push({url,options});return Response.json({schema_version:1,profile_id:'sample',prototype_id:subject,maturity_claim:'prototype-preview-only',runtime_state:'running',endpoint:'http://127.0.0.1:18191',instance_id:'a'.repeat(24),source_revision:'b'.repeat(40),source_digest:'sha256:'+'c'.repeat(64),embedding:{allowed_origins:[origin]}});});
 const adapter=prototypeSourcePreviewAdapter(subject),signal=new AbortController().signal,value=await adapter.read(signal);
 assert.deepEqual(assertSourcePreview(value,subject,origin),snapshot());assert.equal(calls[0].url,'/api/prototypes/sample/preview-runtime');assert.equal(calls[0].options.signal,signal);assert.equal(calls[0].options.method,undefined);assert.throws(()=>prototypeSourcePreviewAdapter('prototype:../escape'));
});
test('Console profile intent carries only an explicit bounded loopback embedding choice',()=>{
 const base={kind:'preview-profile',port:18191,ttl_seconds:3600,support_profile:'interactive',runtime_activation:true,decision_ref:'record://decisions/preview'};
 assert.deepEqual(assertPrototypeOwnerPreparation(base),base);
 assert.deepEqual(assertPrototypeOwnerPreparation({...base,embedding_origins:[origin]}),{...base,embedding_origins:[origin]});
 for(const origins of [['https://external.example'],['http://localhost:99999'],[origin,origin],['http://localhost:4317/path']])assert.throws(()=>assertPrototypeOwnerPreparation({...base,embedding_origins:origins}));
});
