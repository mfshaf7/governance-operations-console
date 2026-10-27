import { parseAdvisorReply, type AdvisorScope, type GovernedAdvisorReply } from "../../../agent-console/model/advisor-drafts.ts";
import { effectiveModelLabel } from "../../../console-integration/governed-ai/model-selection.ts";
import { assertWorkDesignOosAssistResult } from "./work-design-live-contract.ts";
import { deliveryLiveIdentity, deliveryLivePackageRef } from "./delivery-live-identity.ts";
import type { DeliveryPackageSummary } from "../read-model/index.ts";

import { WORK_DESIGN_CONTEXT_NOTE_MAX_LENGTH } from "../work-model/work-design/work-design-session-model.ts";

/** Public register IDs and native package refs are distinct existing contracts. */
export function createWorkDesignAdvisorScope(
  deliveryPackage: Pick<DeliveryPackageSummary, "legacy_epic_id">,
  draft: Omit<AdvisorScope, "packageRef" | "sourceRef">,
): AdvisorScope {
  const { packageRef, sourceRef } = deliveryLiveIdentity(deliveryLivePackageRef(deliveryPackage));
  return { ...draft, packageRef, sourceRef, fields: draft.fields.map(field =>
    draft.role === "work-design-context" && field.key === "note"
      ? { ...field, maxLength: WORK_DESIGN_CONTEXT_NOTE_MAX_LENGTH } : field),
  };
}

/** Draft formatting stays on the existing Work Design profile and caller. */
export function normalizeWorkDesignDraftAdvice(data: unknown, scope: AdvisorScope): GovernedAdvisorReply {
  const result = assertWorkDesignOosAssistResult(data);
  return { ...parseAdvisorReply(result.text, scope), evidence: {
    profileId: result.evidence.model_profile_id, auditRef: result.evidence.gateway_audit_ref, contextRef: result.evidence.cgg_packet_ref,
    ...(result.evidence.effective_selection ? { effectiveModel: effectiveModelLabel(result.evidence.effective_selection) } : {}),
  } };
}
