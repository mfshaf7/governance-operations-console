import test from "node:test";
import assert from "node:assert/strict";
import {filterControlBoardPackages} from "../../src/product-apps/control-board/control-board-view-model.ts";

test("column search preserves complete source cards and matches title, identity and posture without mutating the board",()=>{
 const rows=[{packageId:"item-1",displayName:"Account setup",sourceRef:"OpenProject #21",posture:"Done",progress:{totalChildCount:4,completedChildCount:4,progressPercent:100}},
 {packageId:"item-2",displayName:"Profile controls",sourceRef:"OpenProject #22",posture:"Ready",progress:null}];
 const before=JSON.stringify(rows);
 assert.equal(filterControlBoardPackages(rows,"  "),rows);
 for(const query of ["ACCOUNT","#21","item-1","done"])assert.deepEqual(filterControlBoardPackages(rows,query),[rows[0]]);
 assert.deepEqual(filterControlBoardPackages(rows,"missing"),[]);assert.equal(JSON.stringify(rows),before);
});
