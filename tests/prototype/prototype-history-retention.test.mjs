import test from "node:test";
import assert from "node:assert/strict";
import {prototypeHistoryTimelineRows,prototypeHistoryReceiptFacts} from "../../src/domain-workspaces/prototype/presentation/dialogs/history/prototype-history-view-model.ts";
const receipt=(id,at,label)=>({id,recordedAt:at,label,summary:"Retained owner event",resultState:"recorded",tone:"ok",sourceLabel:"source record"});
test("Closure preparation augments the earlier lifecycle trail instead of replacing it",()=>{
 const landing=receipt("landing","2026-01-01T00:00:00Z","Prototype Landing"),baseline=receipt("baseline","2026-01-02T00:00:00Z","Baseline Promotion");
 const preparation={history:[{event_id:"closed",request_ref:"request://example",event_type:"source-graduated",observed_lifecycle:"graduated",previous_lifecycle:"graduating",recorded_at:"2026-01-03T00:00:00Z"}]};
 assert.deepEqual(prototypeHistoryTimelineRows({},[baseline,landing,landing],preparation).map(row=>row.label),["Prototype Landing","Baseline Promotion","source graduated"]);
 assert.equal(prototypeHistoryTimelineRows({},[landing],{history:[]}).length,1);
});
test("receipt sources retain more than six available receipts",()=>{
 const receipts=Array.from({length:9},(_,i)=>receipt(`receipt-${i}`,`2026-01-${String(i+1).padStart(2,"0")}T00:00:00Z`,`Event ${i}`));
 assert.equal(prototypeHistoryReceiptFacts(receipts).length,9);
});
