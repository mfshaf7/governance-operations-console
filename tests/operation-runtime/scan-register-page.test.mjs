import assert from 'node:assert/strict';
import test from 'node:test';
import {scanRegisterPage} from '../../src/console-integration/server/scan-register-page.ts';
const records=Array.from({length:176},(_,i)=>({id:`repo-${i+1}`,group:i%2?'other':'wanted'}));
function reader(rows=records){return async(cursor)=>{const start=Number(cursor??0);return{records:rows.slice(start,start+25),next_cursor:start+25<rows.length?String(start+25):null};};}
const identity=row=>row.id;
test('filtered register replaces bounded pages without losing intra-page matches',async()=>{
 const found=[];let cursor=null;
 do{const page=await scanRegisterPage({selection:{q:'wanted'},cursor,readPage:reader(),identity,matches:row=>row.group==='wanted'});assert.ok(page.records.length<=25);found.push(...page.records.map(row=>row.id));cursor=page.next_cursor;}while(cursor);
 assert.deepEqual(found,records.filter(row=>row.group==='wanted').map(row=>row.id));assert.equal(new Set(found).size,found.length);
});
test('sparse searches remain reachable after an empty four-page search window',async()=>{
 let reads=0;const read=reader();const page=await scanRegisterPage({selection:'last',cursor:null,readPage:async c=>{reads++;return read(c);},identity,matches:row=>row.id==='repo-176'});
 assert.equal(reads,4);assert.deepEqual(page.records,[]);assert.ok(page.next_cursor);
 const next=await scanRegisterPage({selection:'last',cursor:page.next_cursor,readPage:read,identity,matches:row=>row.id==='repo-176'});assert.deepEqual(next.records,[records.at(-1)]);assert.equal(next.next_cursor,null);
});
test('changed selectors or continuation anchors fail closed rather than silently skipping records',async()=>{
 const page=await scanRegisterPage({selection:'first',cursor:null,readPage:reader(),identity,matches:row=>row.group==='wanted'});
 await assert.rejects(()=>scanRegisterPage({selection:'different',cursor:page.next_cursor,readPage:reader(),identity,matches:()=>true}),/different search/);
 const changed=structuredClone(records);changed[30].id='changed';
 await assert.rejects(()=>scanRegisterPage({selection:'first',cursor:page.next_cursor,readPage:reader(changed),identity,matches:()=>true}),/source page changed/);
});
test('later owner refusal is not converted into an empty successful search',async()=>{
 let calls=0;await assert.rejects(()=>scanRegisterPage({selection:'q',cursor:null,readPage:async()=>{if(++calls>1)throw Error('owner refused');return{records:records.slice(0,25),next_cursor:'next'};},identity,matches:()=>false}),/owner refused/);
});
