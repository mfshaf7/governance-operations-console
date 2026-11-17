import type { DeliveryWorkSessionProjection } from "../../live-runtime/delivery-work-session-live-types.ts";
export type TechnicalPlanRequirement = {
  status: "unknown" | "required" | "binding" | "covered" | "not-required" | "review";
  title: string; detail: string; actionLabel: string; tone: "info" | "warn" | "ok";
  workItemId: string | null; ownerReason?: string;
};
export function technicalPlanRequirement({deliveryId,projection,available=true,workItemId}: {
  deliveryId: string; projection?: DeliveryWorkSessionProjection | null; available?: boolean; workItemId?: number | null;
}): TechnicalPlanRequirement {
  const unknown: TechnicalPlanRequirement = {status:"unknown",title:"Plan requirement not checked",tone:"info",actionLabel:"Open Technical Plan",workItemId:null,
    detail:available ? "Choose a work item to inspect its execution requirements. Open Technical Plan separately to inspect or prepare an implementation approach." : "This work’s requirement is unverified. Check its work-start requirements before deciding whether approval is needed."};
  if (!available || !projection || projection.delivery_id !== deliveryId || !/^work-item-[1-9][0-9]*$/.test(projection.work_item_id) || workItemId != null && projection.work_item_id !== `work-item-${workItemId}`) return unknown;
  const result = {...unknown,workItemId:projection.work_item_id}, code=projection.next_action?.code;
  if (code === "architecture-packet-required") return {...result,status:"required",title:"Technical plan required",tone:"warn",actionLabel:"Prepare Technical Plan",ownerReason:projection.next_action?.reason,
    detail:"The work-start check requires a recorded technical plan before this work can begin. Prepare and approve the approach for the affected scope."};
  if (code === "architecture-binding-required") return {...result,status:"binding",title:"Existing plan must be linked",tone:"warn",actionLabel:"Review Approved Plan",ownerReason:projection.next_action?.reason,
    detail:"An existing plan defines this work. Review that plan, then link it in the work-start review; creating a replacement is not automatically necessary."};
  if (["architecture-reconstruction-required","architecture-recovery-required","architecture-compatible-refresh-required"].includes(code ?? "")) return {...result,status:"review",title:"Plan binding needs review",tone:"warn",actionLabel:"Review Technical Plan",ownerReason:projection.next_action?.reason,
    detail:"The work-session check reports a binding or recovery issue. Review its instructions before deciding whether the technical plan needs a revision."};
  const path = projection.configured_path, architecture = path?.architecture as Record<string,unknown> | undefined;
  // A generated draft or inferred false is not an accepted applicability decision.
  if (path?.ready === true && path.status === "implementation-ready" && code === "work-session-start-ready") {
    if (architecture?.required === false) return {...result,status:"not-required",title:"Not required for this work",tone:"ok",
      detail:"The work-start check completed without requiring a technical plan for this work. Continue through the normal execution controls."};
    if (architecture?.required === true && architecture.custody_state === "durable" && architecture.decision_status === "architecture-ready") return {...result,status:"covered",title:"Approved plan covers this work",tone:"ok",actionLabel:"View Approved Plan",
      detail:"The work-start check confirmed a recorded approved plan for this work. Reuse it while its design and covered scope remain applicable."};
  }
  return result;
}
