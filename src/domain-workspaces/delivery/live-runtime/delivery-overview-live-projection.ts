import type { DeliveryReadModel } from "../read-model/delivery-read-model.ts";
import type { DeliveryBackendStatus, DeliveryPackagePosture } from "../domain/delivery-common.ts";
import { projectCanonicalDeliveryWorkspace } from "./delivery-workspace-live-projection.ts";

const postures: Record<DeliveryBackendStatus, DeliveryPackagePosture> = {
  new: "New", ready: "Ready", "in-progress": "In Progress", blocked: "Blocked",
  done: "Done", parked: "Deferred", retired: "Retired",
};

// The same complete global register and active board, with archived child
// graphs explicitly deferred. Their exact owner/history reads remain available.
export function projectCanonicalDeliveryOverview(value: unknown, revision: string, at: string, planning = false): DeliveryReadModel {
  const v = value as { schema_version?: number; workflow_id?: string; project?: {identifier?:string}; roots?: unknown[];
    operational_initiatives?: unknown[]; deferred_history_refs?: string[]; mutation_authority?: string;
    planning_scope?: DeliveryReadModel["planning_scope"]; planning_focus?: string };
  if (!v || v.schema_version !== 1 || v.workflow_id !== "delivery-console-overview" || v.project?.identifier !== "workspace-delivery-art" ||
      v.mutation_authority !== "none" || !Array.isArray(v.roots) || v.roots.length > 8192 || !Array.isArray(v.operational_initiatives) ||
      !Array.isArray(v.deferred_history_refs)) throw Error("Invalid global Delivery overview.");
  const active = projectCanonicalDeliveryWorkspace({workflow_id:"delivery-initiatives",project:v.project,initiatives:v.operational_initiatives},revision,at);
  const activeById = new Map(active.packages.map(p=>[p.legacy_epic_id,p]));
  const activeDetails = new Map(active.selected_packages.map(p=>[p.delivery_package_id,p]));
  const seen = new Set<number>(), deferred = new Set(v.deferred_history_refs);
  const packages: DeliveryReadModel["packages"] = [], selected: DeliveryReadModel["selected_packages"] = [];
  for (const item of v.roots) {
    const root=item as {id:number;record_ref:string;subject:string;status:DeliveryBackendStatus;owner_repo:string|null;target_pi:string|null;architecture_anchor_ref:string|null;required_upstream_ref:string|null;initiative_family?:string|null};
    if(!root||!Number.isSafeInteger(root.id)||root.id<1||seen.has(root.id)||root.record_ref!==`openproject://work_packages/${root.id}`||
       typeof root.subject!=="string"||!root.subject.trim()||!Object.hasOwn(postures,root.status)||
       [root.owner_repo,root.target_pi,root.architecture_anchor_ref,root.required_upstream_ref].some(x=>x!==null&&typeof x!=="string"))throw Error("Invalid Delivery root identity.");
    seen.add(root.id);
    const id=`delivery-${root.id}`, current=activeById.get(root.id), inactive=["done","retired"].includes(root.status);
    if(inactive ? current!==undefined || !deferred.has(root.record_ref) : !current || deferred.has(root.record_ref))throw Error("Global Delivery scope is incomplete or conflicting.");
    if(root.initiative_family !== undefined && root.initiative_family !== null && (typeof root.initiative_family !== "string" || !root.initiative_family.trim())) throw Error("Invalid Delivery family identity.");
    if(current){
      if(current.backend_status!==root.status||current.source_ref!==root.record_ref)throw Error("Active Delivery changed during its read.");
      packages.push({...current, initiative_family: root.initiative_family ?? current.initiative_family ?? null});selected.push(activeDetails.get(id)!);
    }else{
      packages.push({delivery_package_id:id,legacy_epic_id:root.id,display_name:root.subject,backend_status:root.status,
        initiative_family:root.initiative_family??null,
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
  const completed = planning ? collectCompletedPlanningPrerequisites(v.operational_initiatives, active.art_tree.roots) : undefined;
  const scope = v.planning_scope;
  if (scope && (!planning || !/^PI-\d{4}-\d{2}$/.test(scope.target_pi) || !Number.isFinite(Date.parse(scope.indexed_at)))) {
    throw Error("Invalid PI Planning selection evidence.");
  }
  const focus = v.planning_focus;
  if (focus !== undefined && (!planning || scope || packages.length !== 1 || packages[0].delivery_package_id !== focus)) {
    throw Error("Invalid focused PI Planning response.");
  }
  return {...active,packages,selected_packages:selected,selected_delivery_package_id:packages[0]?.delivery_package_id??"",
    ...(completed ? { completed_planning_prerequisite_ids: completed } : {}),
    ...(scope ? {planning_scope: scope} : {}),
    ...(focus ? {planning_focus: focus} : {}),
    ...(scope || focus ? {planning_external_dependencies: collectPlanningRelations(v.operational_initiatives, active.art_tree.roots)} : {}),
    deferred_history_tree_refs:[...deferred],board_summary:{...active.board_summary,total_packages:packages.length,by_posture:counts,blocked_count:counts.Blocked},
    projection_state:{...active.projection_state,detail:"Complete global package register and active execution trees. Archived child graphs are read only when their exact owner workflow is inspected."}};
}

type PlanningDependency = NonNullable<DeliveryReadModel["planning_external_dependencies"]>[number];
function collectPlanningRelations(initiatives: unknown[], roots: DeliveryReadModel["art_tree"]["roots"]): PlanningDependency[] {
  const nodes = [...roots];
  for (const node of nodes) nodes.push(...node.children);
  const loaded = new Set(nodes.map(node => node.legacy_work_package_id));
  const facts = new Map<number, PlanningDependency>();
  function binding(value: unknown): PlanningDependency {
    const row = value as { id: number; top_level_epic_id: number | null; record_ref: string; subject: string; status: string;
      target_pi: string | null; iteration: string | null };
    if (!row || !Number.isSafeInteger(row.id) || row.id < 1 || row.record_ref !== `openproject://work_packages/${row.id}` ||
        row.top_level_epic_id !== null && (!Number.isSafeInteger(row.top_level_epic_id) || row.top_level_epic_id < 1) ||
        typeof row.subject !== "string" || typeof row.status !== "string" ||
        [row.target_pi, row.iteration].some(field => field !== null && typeof field !== "string")) {
      throw Error("Invalid external PI Planning dependency.");
    }
    return {id:row.id,epic_id:row.top_level_epic_id,title:row.subject,status:row.status,target_pi:row.target_pi,iteration:row.iteration,requires:[]};
  }
  for (const entry of initiatives) {
    const relations = (entry as { planning_relations?: Array<{depends_on:unknown;target:unknown}> }).planning_relations;
    if (!Array.isArray(relations) || relations.length > 8192) throw Error("Incomplete PI Planning dependency evidence.");
    for (const relation of relations) {
      const prerequisite = binding(relation.depends_on), target = binding(relation.target);
      const prerequisiteLoaded = loaded.has(prerequisite.id), targetLoaded = loaded.has(target.id);
      if (prerequisiteLoaded === targetLoaded) continue;
      const candidate = prerequisiteLoaded ? target : prerequisite;
      const existing = facts.get(candidate.id);
      if (existing && JSON.stringify({...existing,requires:[]}) !== JSON.stringify(candidate)) throw Error("Conflicting PI Planning dependency.");
      const fact = existing ?? candidate;
      if (prerequisiteLoaded && !fact.requires.includes(prerequisite.id)) fact.requires.push(prerequisite.id);
      facts.set(candidate.id, fact);
    }
  }
  return [...facts.values()];
}

function collectCompletedPlanningPrerequisites(initiatives: unknown[], roots: DeliveryReadModel["art_tree"]["roots"]) {
  const nodes = [...roots];
  const prerequisites = new Map<number, Set<number>>();
  for (const node of nodes) {
    nodes.push(...node.children);
    if (node.legacy_work_package_id !== null) {
      prerequisites.set(node.legacy_work_package_id, new Set(node.depends_on_work_package_ids));
    }
  }
  const completed = new Set<number>();
  for (const value of initiatives) {
    const initiative = value as { dependency_relations?: Array<{
      relation_type?: string; unresolved?: boolean;
      depends_on?: { id?: number; record_ref?: string; status?: string };
      target?: { id?: number; record_ref?: string };
    }> };
    for (const relation of initiative.dependency_relations ?? []) {
      const source = relation.depends_on, target = relation.target;
      if (relation.relation_type !== "follows" || relation.unresolved !== false || source?.status !== "done" ||
          typeof source.id !== "number" || typeof target?.id !== "number" ||
          !Number.isSafeInteger(source.id) || !Number.isSafeInteger(target.id) || source.id < 1 || target.id < 1 ||
          source.record_ref !== `openproject://work_packages/${source.id}` ||
          target.record_ref !== `openproject://work_packages/${target.id}` ||
          !prerequisites.get(target.id)?.has(source.id)) continue;
      completed.add(source.id);
    }
  }
  return [...completed];
}
