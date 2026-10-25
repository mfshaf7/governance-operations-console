import test from 'node:test';
import assert from 'node:assert/strict';
import {concurrentSourceRead} from '../../src/console-integration/source-authority/concurrent-source-read.ts';
const config={baseUrl:'http://127.0.0.1:8080',callerId:'console',callerSecret:'synthetic',operatorId:'operator:sample'};

test('simultaneous same-authority reads share only the pending operation, with private results and a fresh subsequent read',async()=>{
 let calls=0,release;const gate=new Promise(r=>release=r);const read=async()=>{calls++;await gate;return {rows:[{id:1}]};};const transport=async()=>{};
 const first=concurrentSourceRead('register',config,transport,read),second=concurrentSourceRead('register',config,transport,read);
 await Promise.resolve();assert.equal(calls,1);release();const [a,b]=await Promise.all([first,second]);a.rows[0].id=9;assert.equal(b.rows[0].id,1);
 await concurrentSourceRead('register',config,transport,read);assert.equal(calls,2);
});

test('operators, credentials, endpoints, read scopes and transports cannot share pending reads; failures do not poison retries',async()=>{
 let calls=0,release;const gate=new Promise(r=>release=r);const read=async()=>{calls++;await gate;return calls;};const transport=async()=>{};
 const jobs=[concurrentSourceRead('list',config,transport,read),
  ...[{operatorId:'operator:other'},{callerSecret:'other-synthetic'},{baseUrl:'http://127.0.0.1:8081'},{callerId:'other-console'}].map(change=>concurrentSourceRead('list',{...config,...change},transport,read)),
  concurrentSourceRead('other-list',config,transport,read),concurrentSourceRead('list',config,async()=>{},read)];
 await Promise.resolve();assert.equal(calls,7);release();await Promise.all(jobs);
 await assert.rejects(concurrentSourceRead('failed',config,transport,async()=>{throw Error('owner unavailable');}),/owner unavailable/);
 assert.equal(await concurrentSourceRead('failed',config,transport,async()=>42),42);
});
