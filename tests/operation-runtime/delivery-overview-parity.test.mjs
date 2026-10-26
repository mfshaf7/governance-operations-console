import test from 'node:test';
import assert from 'node:assert/strict';
import {projectCanonicalDeliveryWorkspace} from '../../src/domain-workspaces/delivery/live-runtime/delivery-workspace-live-projection.ts';
import {projectCanonicalDeliveryOverview} from '../../src/domain-workspaces/delivery/live-runtime/delivery-overview-live-projection.ts';
import {deliveryModelForScope,projectDeliveryIntakeHistory,deliveryIntakeRefreshSnapshot} from '../../src/domain-workspaces/delivery/live-runtime/delivery-history-projection.ts';
import {deliveryWorkspaceSummaryStats} from '../../src/domain-workspaces/delivery/presentation/workspace/workspace-summary-model.ts';
import {getDeliveryPackagesByWorkflowPhase,getExecutionBoardPackages} from '../../src/domain-workspaces/delivery/read-model/selectors/workflow-package-selectors.ts';
import {deliveryOverviewStats,deliverySurfaceItemCount} from '../../src/domain-workspaces/delivery/presentation/workspace/workspace-count-model.ts';

const at='2026-10-26T00:00:00Z',revision='synthetic-source';
const ref=id=>`openproject://work_packages/${id}`;

test('background Intake pages cannot erase a complete verified register or advance its observation',()=>{
 const previous={complete:true,full:true,started:1000,sources:['original-source'],revisions:['original-version']};
 const partial={complete:false,full:true,started:2000,sources:[],revisions:['new-page-1']};
 assert.deepEqual(deliveryIntakeRefreshSnapshot(previous,partial,2100),previous);
 const failed=deliveryIntakeRefreshSnapshot(previous,partial,2200,true);assert.deepEqual(failed.sources,['original-source']);assert.equal(failed.started,1000);assert.equal(failed.refresh_failed,true);
 const complete={...partial,complete:true,sources:['original-source','new-source']};assert.deepEqual(deliveryIntakeRefreshSnapshot(previous,complete,2300),complete);
 assert.equal(deliveryIntakeRefreshSnapshot(previous,partial,302000,true),null);
 assert.deepEqual(deliveryIntakeRefreshSnapshot(null,partial,2100),partial);
 assert.deepEqual(deliveryIntakeRefreshSnapshot({...previous,full:false},partial,2100),partial);
});
function initiative(id,status,children=[]){
 const epic={id,type:'Epic',subject:`Synthetic package ${id}`,status,record_ref:ref(id),owner_repo:'sample-owner',target_pi:'sample-pi',architecture_anchor_ref:null,required_upstream_ref:null};
 return {epic,execution_tree:{...epic,children},summary:{open_descendant_count:children.filter(n=>!['done','retired'].includes(n.status)).length}};
}
function fixtures(){
 const initiatives=[initiative(1,'done',[{...initiative(11,'done').epic,type:'User story',children:[]}]),initiative(2,'new'),initiative(3,'parked'),initiative(4,'in-progress',[{...initiative(41,'in-progress').epic,type:'User story',children:[]}]),initiative(5,'retired')];
 const inventory={workflow_id:'delivery-initiatives',project:{identifier:'workspace-delivery-art'},initiatives};
 const overview={schema_version:1,workflow_id:'delivery-console-overview',project:inventory.project,mutation_authority:'none',roots:initiatives.map(i=>({...i.epic,record_version:'version-1'})),operational_initiatives:initiatives.filter(i=>!['done','retired'].includes(i.epic.status)),deferred_history_refs:[ref(1),ref(5)]};
 return {inventory,overview};
}

test('global Current board, filters, active and parked details preserve full inventory semantics',()=>{
 const {inventory,overview}=fixtures();
 const before=projectCanonicalDeliveryWorkspace(inventory,revision,at),after=projectCanonicalDeliveryOverview(overview,revision,at);
 const oldCurrent=deliveryModelForScope(before,'current'),newCurrent=deliveryModelForScope(after,'current');
 for(const key of ['packages','selected_packages','art_tree','selected_delivery_package_id'])assert.deepEqual(newCurrent[key],oldCurrent[key]);
 assert.deepEqual(getExecutionBoardPackages(newCurrent),getExecutionBoardPackages(oldCurrent));
 for(const phase of ['work_design','refinement','execution','audit_only'])assert.deepEqual(getDeliveryPackagesByWorkflowPhase(phase,newCurrent),getDeliveryPackagesByWorkflowPhase(phase,oldCurrent));
 assert.deepEqual(after.board_summary,before.board_summary);
 assert.deepEqual(after.packages.find(p=>p.backend_status==='parked'),before.packages.find(p=>p.backend_status==='parked'));
 assert.deepEqual(after.apply_intents,[]);assert.ok(after.packages.every(p=>p.available_actions.length===0));
});

test('History keeps every global package and totals; archived children are explicitly deferred',()=>{
 const {inventory,overview}=fixtures();const before=deliveryModelForScope(projectCanonicalDeliveryWorkspace(inventory,revision,at),'history'),after=deliveryModelForScope(projectCanonicalDeliveryOverview(overview,revision,at),'history');
 assert.deepEqual(after.packages.map(p=>[p.delivery_package_id,p.display_name,p.backend_status,p.source_ref]),before.packages.map(p=>[p.delivery_package_id,p.display_name,p.backend_status,p.source_ref]));
 assert.deepEqual(deliveryOverviewStats(after,5),deliveryOverviewStats(before,5));
 for(const phase of ['work_design','refinement','execution'])assert.equal(getDeliveryPackagesByWorkflowPhase(phase,after).length,5);
 assert.deepEqual(after.deferred_history_tree_refs,[ref(1),ref(5)]);
 const unread={...after,evidence_coverage:{intake:{state:'unavailable',issue_count:0,detail:'Independent owner read not yet available'},activity:{state:'unavailable',detail:'Not yet loaded'}}};
 assert.equal(deliverySurfaceItemCount({surfaceId:'intake',executionCount:5,model:unread}),'Unavailable');
 assert.ok(deliveryWorkspaceSummaryStats({activeSurfaceId:'intake',executionCount:5,model:unread}).every(s=>s.value==='Unavailable'));
 assert.ok(deliveryWorkspaceSummaryStats({activeSurfaceId:'intake',executionCount:5,model:{...unread,evidence_coverage:{...unread.evidence_coverage,intake:{...unread.evidence_coverage.intake,state:'partial',complete:false}}}}).every(s=>s.value==='Loading'));
 assert.equal(deliverySurfaceItemCount({surfaceId:'intake',executionCount:5,model:{...unread,evidence_coverage:{...unread.evidence_coverage,intake:{...unread.evidence_coverage.intake,state:'partial',complete:false}}}}),'Loading');
 assert.equal(after.packages[0].open_child_count,null);assert.equal(after.art_tree.roots.some(n=>n.legacy_work_package_id===1),false);
 const admission={source_id:'prototype:original',source_kind:'prototype',source_ref:'record://prototype/example',source_version:'v1',packet_ref:'packet:original',delivery_id:'delivery-1',target_ref:ref(1),title:'Original title',owner_repo:'original-owner',state:'consumed',custody:{classification:'existing-repo',owner:'original-owner',rationale:'Original accepted custody',source_ref:'repo://original-owner',repository_gate_state:'resolved'},receipt_ref:'receipt:original',receipt_digest:'sha256:original',recorded_at:at,actor:'operator:sample',evidence_refs:[ref(1)]};
 const original=projectDeliveryIntakeHistory(before,[admission],[]),optimized=projectDeliveryIntakeHistory(after,[admission],[]);
 assert.deepEqual(optimized.intake_sources,original.intake_sources);assert.deepEqual(optimized.audit_events,original.audit_events);
 assert.equal(optimized.packages[0].source_custody.owner,'original-owner');
});

test('thousands of terminal projects preserve the global register without expanding operational trees',()=>{
 const {overview}=fixtures();const original=overview.roots.length;
 for(let id=100;id<2100;id++){overview.roots.push({...initiative(id,'done').epic,record_version:'v1'});overview.deferred_history_refs.push(ref(id));}
 const model=projectCanonicalDeliveryOverview(overview,revision,at);
 assert.equal(model.packages.length,original+2000);assert.equal(model.art_tree.roots.length,3);
 assert.equal(model.board_summary.by_posture.Done,2001);
 for(const mutate of [v=>v.roots.push(v.roots[0]),v=>v.operational_initiatives.pop(),v=>v.deferred_history_refs.push(ref(99999)),v=>v.operational_initiatives[0].epic.status='ready']){
  const bad=structuredClone(overview);mutate(bad);assert.throws(()=>projectCanonicalDeliveryOverview(bad,revision,at));
 }
});
