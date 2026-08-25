import type { DeliveryPackageSummary } from "../../../../read-model/index.ts";

import { workDesignContextDecisionCopy } from "./work-design-context-decision-model.ts";
import type { WorkDesignContextDecision } from "../model/work-design-model.ts";

export type WorkDesignAdvisorTranscriptLine = {
  id: string;
  role: "advisor" | "operator";
  text: string;
};

export type WorkDesignContextAdvisorRequest = {
  advisor_mode: "context_session";
  allowed_response_types: Array<"text">;
  context_decision?: WorkDesignContextDecision;
  context_note?: string;
  operator_prompt: string;
  package_ref: string;
  request_id: string;
  source_ref: string;
};

export type WorkDesignContextAdvisorResponse = {
  advisor_mode: "context_session";
  confidence: "high" | "low" | "medium";
  required_operator_action: "no_change" | "review";
  response_id: string;
  status: "mocked" | "ready";
  text: string;
};

export function workDesignContextAdvisorOpening(
  request: WorkDesignContextAdvisorRequest,
) {
  const decisionCopy = workDesignContextDecisionCopy(
    request.context_decision ?? "proceed",
  );

  return `Context mode loaded for ${request.package_ref}. I can inspect source context, duplicate signals, wider ART fit, and whether the operator should ${decisionCopy.label.toLowerCase()}. Advice remains a suggestion until the operator accepts the brief.`;
}

export function workDesignContextAdvisorTranscript({
  contextAdvisorPrompt,
  contextAdvisorTurns,
  contextBriefReadOnly,
  contextDecision,
  contextOperatorNote,
  deliveryPackage,
}: {
  contextAdvisorPrompt: string;
  contextAdvisorTurns: WorkDesignAdvisorTranscriptLine[];
  contextBriefReadOnly: boolean;
  contextDecision: WorkDesignContextDecision;
  contextOperatorNote: string;
  deliveryPackage: DeliveryPackageSummary;
}): WorkDesignAdvisorTranscriptLine[] {
  return [
    {
      id: "advisor-context-opening",
      role: "advisor",
      text: workDesignContextAdvisorOpening({
        advisor_mode: "context_session",
        context_decision: contextDecision,
        context_note: contextOperatorNote,
        operator_prompt: contextAdvisorPrompt,
        package_ref: deliveryPackage.delivery_package_id,
        request_id: "advisor-context-opening",
        source_ref: deliveryPackage.source_ref,
        allowed_response_types: ["text"],
      }),
    },
    {
      id: contextBriefReadOnly
        ? "advisor-context-locked"
        : "advisor-context-guide",
      role: "advisor",
      text: contextBriefReadOnly
        ? `Accepted decision: ${workDesignContextDecisionCopy(contextDecision).label}. This console is locked until the operator reopens the brief.`
        : "Guide: ask me to compare source context, duplicate delivery work, wider ART fit, or the correct draft-tree boundary.",
    },
    ...contextAdvisorTurns,
  ];
}

export function workDesignMockContextAdvisorAdapter(
  request: WorkDesignContextAdvisorRequest,
): WorkDesignContextAdvisorResponse {
  const promptHint =
    request.operator_prompt.length > 120
      ? `${request.operator_prompt.slice(0, 117)}...`
      : request.operator_prompt;
  const baseResponse = {
    advisor_mode: "context_session" as const,
    confidence: "medium" as const,
    response_id: `advisor-context_session-${Date.now()}`,
    status: "mocked" as const,
  };
  const decisionCopy = workDesignContextDecisionCopy(
    request.context_decision ?? "proceed",
  );

  return {
    ...baseResponse,
    required_operator_action: "review",
    text:
      `Mock context advisor: ${decisionCopy.label} remains only a recommendation until the operator finalizes the brief. ` +
      "The future live path must admit source, board, and operator-note context through CGG before OOS invokes the approved Work Design profile. " +
      `Operator ask: ${promptHint}`,
  };
}
