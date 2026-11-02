import assert from 'node:assert/strict';
import test from 'node:test';
import {governedProductsProjection} from '../support/governed-products-ui-fixture.mjs';
import {assertGovernedProductProjection} from '../../src/environment-lifecycle/live-runtime/governed-product-contract.ts';
import {toGovernedProduct} from '../../src/environment-lifecycle/live-runtime/governed-product-mapper.ts';
import {assertPlatformHistoryPage} from '../../src/environment-lifecycle/live-runtime/platform-operation-contract.ts';
import {readGovernedProducts} from '../../src/environment-lifecycle/server/governed-product-oos-client.ts';
const config={baseUrl:'http://127.0.0.1:9',callerId:'console',callerSecret:'synthetic-secret',operatorId:'operator:synthetic'};
test('owner contracts remain inspectable without inventing completed steps, live health or Console execution',()=>{
 const projection=assertGovernedProductProjection(governedProductsProjection());
 const claw=toGovernedProduct(projection.products[0],projection);
 assert.equal(claw.releaseOperations.length,0);assert.equal(claw.runtimeLifecycle,null);assert.equal(claw.recordedRuntime.state,'suspended');assert.equal(claw.releasePath.length,0);assert.equal(claw.recordedEvidence[0].status,'pending');assert.ok(claw.ownerWorkflows.length);assert.equal(claw.nextMove,null);
 const product=toGovernedProduct(projection.products[2],projection);assert.equal(product.maturity,'owner-managed');assert.equal(product.stageSupported,false);assert.equal(product.releasePath.length,0);assert.equal(product.nextMove,null);
 for(const edit of [d=>d.products[0].private_path='/private',d=>d.products[0].workflows[0].url='javascript:alert(1)',d=>d.products[0].runtime.recorded_at='invalid',d=>d.page.total=1]){const d=structuredClone(projection);edit(d);assert.throws(()=>assertGovernedProductProjection(d));}
});
test('product client uses the authenticated bounded read path and rejects duplicate filters',async()=>{
 const calls=[];const projection=governedProductsProjection();const fetchImpl=async(url,init)=>{calls.push({url:String(url),method:init.method,headers:init.headers});return Response.json(projection);};
 const result=await readGovernedProducts(new URLSearchParams({limit:'20'}),{config,fetchImpl});assert.equal(result.products.length,4);assert.match(calls[0].url,/\/v1\/governed-products\?limit=20$/);assert.equal(calls[0].method,'GET');await assert.rejects(()=>readGovernedProducts(new URLSearchParams('q=a&q=b'),{config,fetchImpl}));assert.equal(calls.length,1);
});
test('history continuation metadata is bounded and bound to its requested workspace',()=>{
 const page={workspace:'governed-releases',limit:10,total:30,snapshot:'sha256:'+'a'.repeat(64),next_cursor:'opaque'};assert.equal(assertPlatformHistoryPage(page,'governed-releases'),page);assert.throws(()=>assertPlatformHistoryPage(page,'dev-integration'));assert.throws(()=>assertPlatformHistoryPage({...page,limit:200}));assert.throws(()=>assertPlatformHistoryPage({...page,secret:'private'}));
});

test('source snapshots have explicit posture and cannot invent owner-main freshness',()=>{
 const doc=governedProductsProjection();doc.source_posture='accepted-snapshot';doc.source_notice='Reviewed source snapshot';assertGovernedProductProjection(doc);
 for(const value of ['owner-main','retained-owner-main'])assertGovernedProductProjection({...doc,source_posture:value});
 assert.throws(()=>assertGovernedProductProjection({...doc,source_posture:'current'}));
 assert.throws(()=>assertGovernedProductProjection({...doc,source_notice:{token:'private'}}));
});
