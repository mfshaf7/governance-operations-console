import test from 'node:test';import assert from 'node:assert/strict';
import {readRegisterWindow} from '../../src/console-integration/registers/read-register-window.ts';
import {readRegisterOffsetWindow} from '../../src/console-integration/registers/read-register-offset-window.ts';
for(const nativeSize of [20,25,100])for(const pageSize of [25,50,100])test(`display ${pageSize} traverses native ${nativeSize} without losing or repeating records`,async()=>{
 const all=Array.from({length:237},(_,id)=>({id})),seen=[],sourceCursors=[];let cursor=null;
 const read=()=>readRegisterWindow({cursor,pageSize,scope:'synthetic-selection',identity:r=>String(r.id),readPage:async c=>{assert.ok(c===null||/^\d+$/.test(c));sourceCursors.push(c);const offset=Number(c??0);return {rows:all.slice(offset,offset+nativeSize),nextCursor:offset+nativeSize<all.length?String(offset+nativeSize):null};}});
 do{const page=await read();assert.ok(page.rows.length<=pageSize);seen.push(...page.rows.map(r=>r.id));cursor=page.nextCursor;}while(cursor);
 assert.deepEqual(seen,all.map(r=>r.id));assert.ok(sourceCursors.length<30);
});
test('a changed size, selection, original native page, source denial or nonadvancing cursor cannot produce a successful continuation',async()=>{
 let reversed=false;const source=Array.from({length:100},(_,id)=>({id}));const readPage=async()=>({rows:reversed?[...source].reverse():source,nextCursor:null});
 const first=await readRegisterWindow({cursor:null,pageSize:25,scope:'same',identity:r=>String(r.id),readPage});
 for(const options of [{pageSize:50,scope:'same'},{pageSize:25,scope:'different'}])await assert.rejects(readRegisterWindow({cursor:first.nextCursor,...options,identity:r=>String(r.id),readPage}));
 reversed=true;await assert.rejects(readRegisterWindow({cursor:first.nextCursor,pageSize:25,scope:'same',identity:r=>String(r.id),readPage}),/changed/);
 await assert.rejects(readRegisterWindow({cursor:null,pageSize:100,scope:'same',identity:r=>String(r.id),readPage:async()=>{throw Error('Denied');}}),/Denied/);
 const stalled=await readRegisterWindow({cursor:null,pageSize:25,scope:'same',identity:r=>String(r.id),readPage:async()=>({rows:[],nextCursor:'same'})});await assert.rejects(readRegisterWindow({cursor:stalled.nextCursor,pageSize:25,scope:'same',identity:r=>String(r.id),readPage:async()=>({rows:[],nextCursor:'same'})}));
});
test('a sparse window retains continuation, and an aborted window never returns partial success',async()=>{
 const sparse=await readRegisterWindow({cursor:null,pageSize:100,scope:'sparse',identity:r=>r.id,readPage:async()=>({rows:[],nextCursor:'later'})});assert.deepEqual(sparse.rows,[]);assert.ok(sparse.nextCursor);
 const controller=new AbortController();await assert.rejects(readRegisterWindow({cursor:null,pageSize:50,scope:'abort',signal:controller.signal,identity:r=>r.id,readPage:async()=>{controller.abort();return {rows:[{id:'private-original'}],nextCursor:null};}}));
});
for(const pageSize of [25,50,100])test(`absolute offset display ${pageSize} preserves source revision and exact end range`,async()=>{
 const all=Array.from({length:237},(_,id)=>({id}));let offset=0;const seen=[];
 do{const page=await readRegisterOffsetWindow({offset,pageSize,readPage:async at=>({rows:all.slice(at,at+25),total:all.length,nextOffset:at+25<all.length?at+25:null,version:'one-source',metadata:{}})});seen.push(...page.rows.map(r=>r.id));offset=page.page.next_offset;}while(offset!==null);
 assert.deepEqual(seen,all.map(r=>r.id));
 await assert.rejects(readRegisterOffsetWindow({offset:0,pageSize:100,readPage:async at=>({rows:all.slice(at,at+25),total:all.length,nextOffset:at+25,version:String(at),metadata:{}})}),/changed/);
});

test('private Registry preserves the exact signed100-row owner page and rejects a response above the requested bound',async()=>{
 const {repositoryCatalogRegistrySnapshot}=await import('../support/repository-catalog-fixture.mjs');
 const current=await repositoryCatalogRegistrySnapshot({count:100,limit:100});assert.equal(current.instance_page.records.length,100);assert.equal(current.instance_page.counts.inventory.active,100);assert.equal(current.instance_page.records.at(-1).name.endsWith('-099'),true);
 await assert.rejects(repositoryCatalogRegistrySnapshot({count:100,limit:25}),/requested page size/);
});
