import { parseAdvisorReply, type AdvisorScope, type GovernedAdvisorReply } from "../../../agent-console/model/advisor-drafts.ts";
import { effectiveModelLabel } from "../../../console-integration/governed-ai/model-selection.ts";
import { assertWorkDesignOosAssistResult } from "./work-design-live-contract.ts";

/** Draft formatting stays on the existing Work Design profile and caller. */
export function normalizeWorkDesignDraftAdvice(data: unknown, scope: AdvisorScope): GovernedAdvisorReply {
  const result = assertWorkDesignOosAssistResult(data);
  return { ...parseAdvisorReply(result.text, scope), evidence: {
    profileId: result.evidence.model_profile_id, auditRef: result.evidence.gateway_audit_ref, contextRef: result.evidence.cgg_packet_ref,
    ...(result.evidence.effective_selection ? { effectiveModel: effectiveModelLabel(result.evidence.effective_selection) } : {}),
  } };
}
