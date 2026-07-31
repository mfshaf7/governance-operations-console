import type {
  OrchestrationDefinitionAdvisorPatch,
  OrchestrationDefinitionDesignDraft,
} from "../../../../work-model/definition-design/definition-design-types.ts";
import { definitionDesignSectionLabel } from "../definition-design-view-model.ts";

export type DefinitionAdvisorTranscriptLine = {
  id: string;
  role: "advisor" | "operator";
  text: string;
};

export function initialDefinitionAdvisorTranscript(
  _draft: OrchestrationDefinitionDesignDraft,
): DefinitionAdvisorTranscriptLine[] {
  return [
    {
      id: "definition-advisor-initial",
      role: "advisor",
      text: "Prototype-local advisor locked to the active workflow section. I can challenge the current boundary and prepare one explicit field patch for operator review. I cannot approve, route, or activate this definition.",
    },
  ];
}

export function createDefinitionAdvisorTurn({
  draft,
  prompt,
  sequence,
}: {
  draft: OrchestrationDefinitionDesignDraft;
  prompt: string;
  sequence: number;
}): {
  patch: OrchestrationDefinitionAdvisorPatch;
  response: string;
} {
  const patchId = `definition-advisor-${draft.activeSection}-${sequence}`;

  if (draft.activeSection === "qualification") {
    const durableSignals = qualificationDurableSignalCount(draft);
    const suggestedClassification =
      durableSignals > 0
        ? "durable-candidate"
        : draft.qualification.reevaluationCondition.trim()
          ? "conditional"
          : "synchronous";
    const value =
      suggestedClassification === "durable-candidate"
        ? `${durableSignals} durable execution signal${
            durableSignals === 1 ? "" : "s"
          } require recoverable coordination beyond one bounded command.`
        : suggestedClassification === "conditional"
          ? "The operation can remain synchronous while the recorded reevaluation condition stays false."
          : "The operation has one bounded owner, no durable waits, and no restart-safe recovery requirement.";

    return {
      patch: {
        field: "rationale",
        patchId,
        rationale: `Suggested classification: ${suggestedClassification}. Operator selection remains explicit.`,
        section: "qualification",
        source: "synthetic-advisor",
        value,
      },
      response: `I suggest ${suggestedClassification}. I prepared a rationale patch from the current durability signals; review it before applying.`,
    };
  }

  return definitionSectionAdvisorTurn(draft, prompt, patchId);
}

export function definitionAdvisorPatchLabel(
  patch: OrchestrationDefinitionAdvisorPatch,
) {
  const field = patch.field.replace(/([A-Z])/g, " $1").toLowerCase();
  return `${definitionDesignSectionLabel(patch.section)} / ${field}`;
}

function definitionSectionAdvisorTurn(
  draft: OrchestrationDefinitionDesignDraft,
  prompt: string,
  patchId: string,
): {
  patch: OrchestrationDefinitionAdvisorPatch;
  response: string;
} {
  switch (draft.activeSection) {
    case "identity-ownership":
      return {
        patch: {
          field: "purpose",
          patchId,
          rationale:
            "Keep the definition purpose bounded to one durable backend outcome.",
          section: "identity-ownership",
          source: "synthetic-advisor",
          value:
            draft.identityOwnership.purpose.trim() ||
            `Coordinate ${draft.identityOwnership.title || "the backend operation"} through explicit owners, immutable inputs, and a verified terminal receipt.`,
        },
        response:
          "I prepared a bounded purpose statement. It does not change owner or repository authority.",
      };
    case "trigger-result":
      return {
        patch: {
          field: "completionCondition",
          patchId,
          rationale:
            "Completion should be observable from canonical read-back and a durable receipt.",
          section: "trigger-result",
          source: "synthetic-advisor",
          value:
            draft.triggerResult.completionCondition.trim() ||
            "Canonical read-back matches the accepted request and the final receipt records the verified outcome.",
        },
        response:
          "I prepared a completion condition focused on canonical verification rather than task execution alone.",
      };
    case "execution-plan":
      return {
        patch: {
          field: "resultSummary",
          patchId,
          rationale:
            "The plan result should summarize the verified terminal state.",
          section: "execution-plan",
          source: "synthetic-advisor",
          value:
            draft.executionPlan.resultSummary.trim() ||
            "All required nodes finish or reconcile, retained effects are explicit, and the final projection is verified.",
        },
        response:
          "I prepared a result summary. Node boundaries and dependencies remain operator-authored.",
      };
    case "failure-controls":
      return {
        patch: {
          field: "retryPolicy",
          patchId,
          rationale:
            "Retry must distinguish transient failure from contract or authority failure.",
          section: "failure-controls",
          source: "synthetic-advisor",
          value:
            draft.failureControls.retryPolicy.trim() ||
            "Retry only transient unavailable, timeout, throttling, and server failures; block contract, authority, validation, or ambiguous-effect failures.",
        },
        response:
          "I prepared a bounded retry policy. Confirm the actual activity timeouts and owner-specific failure classes.",
      };
    case "evidence-security":
      return {
        patch: {
          field: "retentionPolicy",
          patchId,
          rationale:
            "Retention should preserve review evidence without retaining raw secrets or mutable payloads.",
          section: "evidence-security",
          source: "synthetic-advisor",
          value:
            draft.evidenceSecurity.retentionPolicy.trim() ||
            "Retain request, event, activity, control, and final receipt references under the owning evidence policy; exclude raw credentials and secret values.",
        },
        response:
          "I prepared a reference-based retention policy. Security Architecture still owns acceptance.",
      };
    case "delivery-versioning":
      return {
        patch: {
          field: "rolloutPlan",
          patchId,
          rationale:
            "Rollout should keep version adoption explicit and reversible.",
          section: "delivery-versioning",
          source: "synthetic-advisor",
          value:
            draft.deliveryVersioning.rolloutPlan.trim() ||
            "Admit the immutable version through owner-repo validation, scoped stage rehearsal, and explicit OOS catalog activation before new requests use it.",
        },
        response:
          "I prepared a staged rollout outline. Platform and security admission remain separate decisions.",
      };
    case "qualification":
      throw new Error(`Unexpected qualification advisor route for ${prompt}.`);
  }
}

function qualificationDurableSignalCount(
  draft: OrchestrationDefinitionDesignDraft,
) {
  return [
    draft.qualification.cancellationRequired,
    draft.qualification.correlatedHistoryRequired,
    draft.qualification.durableRetryRequired,
    draft.qualification.externalWaitRequired,
    draft.qualification.nonAtomicEffects,
    draft.qualification.reconciliationRequired,
    draft.qualification.restartSurvivalRequired,
  ].filter(Boolean).length;
}
