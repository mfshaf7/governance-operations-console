import type { DeliveryReadModel } from "../read-model/delivery-read-model.ts";
import type { DeliveryBackendStatus, DeliveryPackagePosture } from "../domain/delivery-common.ts";
import { projectCanonicalDeliveryWorkspace } from "./delivery-workspace-live-projection.ts";

const postures: Record<DeliveryBackendStatus, DeliveryPackagePosture> = {
  new: "New", ready: "Ready", "in-progress": "In Progress", blocked: "Blocked",
  done: "Done", parked: "Deferred", retired: "Retired",
};

// The same complete global register and active board, with archived child
// graphs explicitly deferred. Their exact owner/history reads remain available.
export function projectCanonicalDeliveryOverview(value: unknown, revision: string, at: string): DeliveryReadModel {
  const v = value as { schema_version?: number; workflow_id?: string; project?: {identifier?:string}; roots?: unknown[];
    operational_initiatives?: unknown[]; deferred_history_refs?: string[]; mutation_authority?: string };
  if (!v || v.schema_version !== 1 || v.workflow_id !== "delivery-console-overview" || v.project?.identifier !== "workspace-delivery-art" ||
      v.mutation_authority !== "none" || !Array.isArray(v.roots) || v.roots.length > 8192 || !Array.isArray(v.operational_initiatives) ||
      !Array.isArray(v.deferred_history_refs)) throw Error("Invalid global Delivery overview.");
  const active = projectCanonicalDeliveryWorkspace({workflow_id:"delivery-initiatives",project:v.project,initiatives:v.operational_initiatives},revision,at);
  const activeById = new Map(active.packages.map(p=>[p.legacy_epic_id,p]));
  const activeDetails = new Map(active.selected_packages.map(p=>[p.delivery_package_id,p]));
  const seen = new Set<number>(), deferred = new Set(v.deferred_history_refs);
  const packages: DeliveryReadModel["packages"] = [], selected: DeliveryReadModel["selected_packages"] = [];
  for (const item of v.roots) {
    const root=item as {id:number;record_ref:string;subject:string;status:DeliveryBackendStatus;owner_repo:string|null;target_pi:string|null;architecture_anchor_ref:string|null;required_upstream_ref:string|null};
    if(!root||!Number.isSafeInteger(root.id)||root.id<1||seen.has(root.id)||root.record_ref!==`openproject://work_packages/${root.id}`||
       typeof root.subject!=="string"||!root.subject.trim()||!Object.hasOwn(postures,root.status)||
       [root.owner_repo,root.target_pi,root.architecture_anchor_ref,root.required_upstream_ref].some(x=>x!==null&&typeof x!=="string"))throw Error("Invalid Delivery root identity.");
    seen.add(root.id);
    const id=`delivery-${root.id}`, current=activeById.get(root.id), inactive=["done","retired"].includes(root.status);
    if(inactive ? current!==undefined || !deferred.has(root.record_ref) : !current || deferred.has(root.record_ref))throw Error("Global Delivery scope is incomplete or conflicting.");
    if(current){
      if(current.backend_status!==root.status||current.source_ref!==root.record_ref)throw Error("Active Delivery changed during its read.");
      packages.push(current);selected.push(activeDetails.get(id)!);
    }else{
      packages.push({delivery_package_id:id,legacy_epic_id:root.id,display_name:root.subject,backend_status:root.status,
        package_posture:postures[root.status],open_child_count:null,source_custody:null,source_ref:root.record_ref,target_pi:root.target_pi,
        summary:"Retained package posture. Archived child counts and original workflow outcomes require the exact owner read; no empty tree is inferred.",
        tone:root.status==="done"?"ok":"muted",tree_root_id:`work-item-${root.id}`,workflow_phase:"audit_only",available_actions:[]});
      selected.push({delivery_package_id:id,owner_repo:root.owner_repo??"Unassigned",source_revision:revision,
        active_execution_target_id:null,next_execution_target_id:null,milestones:[],
        lineage_refs:{architecture_anchor_ref:root.architecture_anchor_ref,required_upstream_ref:root.required_upstream_ref},
        advisor_summary:"Original owner history remains available. Overview data grants no work or completion authority."});
    }
  }
  const refs=new Set(packages.map(p=>p.source_ref));
  if(active.packages.some(p=>!seen.has(p.legacy_epic_id))||deferred.size!==v.deferred_history_refs.length||
     [...deferred].some(ref=>!refs.has(ref)))throw Error("Foreign or duplicate Delivery scope.");
  const counts={...active.board_summary.by_posture};for(const key of Object.keys(counts))counts[key as DeliveryPackagePosture]=0;
  for(const p of packages)counts[p.package_posture]++;
  return {...active,packages,selected_packages:selected,selected_delivery_package_id:packages[0]?.delivery_package_id??"",
    deferred_history_tree_refs:[...deferred],board_summary:{...active.board_summary,total_packages:packages.length,by_posture:counts,blocked_count:counts.Blocked},
    projection_state:{...active.projection_state,detail:"Complete global package register and active execution trees. Archived child graphs are read only when their exact owner workflow is inspected."}};
}
