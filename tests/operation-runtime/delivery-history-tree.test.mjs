import test from 'node:test';
import assert from 'node:assert/strict';
import {deliveryHistoryInspectionTree} from '../../src/domain-workspaces/delivery/live-runtime/delivery-history-tree.ts';

const node=(id,type,children=[])=>({id,type,subject:`Retained ${id}`,description:`Original current owner narrative ${id}`,record_ref:`openproject://work_packages/${id}`,status:'done',children});
function projection(){return {delivery_id:'delivery-71',record_ref:'openproject://work_packages/71',package:{execution_tree:node(71,'Epic',[node(72,'Feature',[node(73,'User story')]),node(74,'PI Objective')])}};}
test('selected retained owner tree preserves complete hierarchy, narratives and actual counts without inventing missing data',()=>{
 const tree=deliveryHistoryInspectionTree(projection(),'delivery-71');
 assert.equal(tree.totalChildCount,3);assert.equal(tree.children[0].totalChildCount,1);
 assert.equal(tree.children[0].children[0].description,'Original current owner narrative 73');
 assert.equal(tree.children[1].componentType,'PI Objective');
 assert.equal(deliveryHistoryInspectionTree(null,'delivery-71'),null);
 const partial=projection();delete partial.package.execution_tree.description;
 assert.equal(deliveryHistoryInspectionTree(partial,'delivery-71').description,'Owner narrative not projected.');
});
test('foreign package, root, node binding, duplicate and excessive depth fail closed',()=>{
 const changes=[v=>v.delivery_id='delivery-99',v=>v.record_ref='openproject://work_packages/99',v=>v.package.execution_tree.id=99,v=>v.package.execution_tree.children[0].record_ref='openproject://work_packages/99',v=>v.package.execution_tree.children.push(v.package.execution_tree.children[0]),v=>{let n=v.package.execution_tree;for(let i=0;i<34;i++){n.children=[node(100+i,'Task')];n=n.children[0];}}];
 for(const change of changes){const value=projection();change(value);assert.throws(()=>deliveryHistoryInspectionTree(value,'delivery-71'));}
});
