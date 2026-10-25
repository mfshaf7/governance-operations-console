import type { DeliveryReadModel } from "../read-model/delivery-read-model.ts";
import type { DeliveryIntakeRecord } from "./delivery-history-live-contract.ts";

export function projectDeliveryIntakeHistory(model: DeliveryReadModel, records: DeliveryIntakeRecord[], issues: Array<{target_ref:string;detail:string}>): DeliveryReadModel {
  const ids=new Set(model.packages.map(p=>p.delivery_package_id));
  for(const item of records)if(!ids.has(item.delivery_id))throw new Error("Intake target is absent from the complete canonical Delivery inventory.");
  const sources=records.map(item=>({
    accepted_source_id:item.source_id,consumed_at:item.recorded_at,consumed_by:item.actor,
    delivery_package_id:item.delivery_id,evidence_refs:[item.receipt_ref,...item.evidence_refs],
    expected_backend_route:"/v1/delivery-intake/sources",gate_summary:"Original owner consumption and approved source custody. Open history to inspect the linked workflow receipts.",
    intake_status:"consumed" as const,owner:item.owner_repo,source_kind:item.source_kind,source_ref:item.source_ref,
    source_custody:{classification:item.custody.classification,owner:item.custody.owner,rationale:item.custody.rationale,
      repo_ref:item.custody.source_ref??item.custody.repo_ref??null,repository_gate_state:item.custody.repository_gate_state},
    status_label:"Consumed",summary:"Native handoff already created or linked this Delivery package.",title:item.title,tone:"ok" as const,
    work_design_session_ref:null,
  }));
  const byPackage=new Map<string,(typeof sources)[number]>();for(const source of sources)if(!byPackage.has(source.delivery_package_id))byPackage.set(source.delivery_package_id,source);
  return {...model,intake_sources:sources,packages:model.packages.map(p=>({...p,source_custody:byPackage.get(p.delivery_package_id)?.source_custody??p.source_custody})),
    audit_events:records.filter(r=>r.recorded_at!==null).map(r=>({actor:r.actor??"owner not projected",category:"receipt" as const,
      delivery_package_id:r.delivery_id,detail:"Original native Intake receipt. Full stage evidence is available in package history.",
      event_id:r.source_id,occurred_at:r.recorded_at!,receipt_id:r.receipt_ref,title:"Intake consumed",tone:"ok" as const})),
    evidence_coverage:{intake:{state:issues.length?"partial":"current",issue_count:issues.length,issues,detail:issues.length?`${issues.length} original source records could not be verified. Readable rows are shown; missing owner proof is unavailable.`:"Target-backed native admissions. Handoffs awaiting application remain in Proposal or Prototype."},
      activity:{state:issues.length?"partial":"current",detail:"Original native Intake receipts in this view. Open package history for Work Design, Refinement and closeout records."}},
  };
}

export function deliveryModelForScope(model:DeliveryReadModel,scope:"current"|"history"):DeliveryReadModel{
  const packages=scope==="history"?model.packages:model.packages.filter(p=>!["done","retired","parked"].includes(p.backend_status));
  const ids=new Set(packages.map(p=>p.delivery_package_id));
  return {...model,history_scope:scope,packages,selected_packages:model.selected_packages.filter(p=>ids.has(p.delivery_package_id)),
    selected_delivery_package_id:ids.has(model.selected_delivery_package_id)?model.selected_delivery_package_id:packages[0]?.delivery_package_id??"",
    art_tree:{roots:model.art_tree.roots.filter(n=>packages.some(p=>p.tree_root_id===n.id))},
    intake_sources:scope==="history"?model.intake_sources:model.intake_sources.filter(s=>s.intake_status!=="consumed"),
    audit_events:model.audit_events.filter(e=>ids.has(e.delivery_package_id)),
  };
}
