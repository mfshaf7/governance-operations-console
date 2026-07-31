import { buildTreePromptPreview } from "../../../../product-apps/build-tree/index.ts";
import type {
  BuildTreeAdvisorRequest,
  BuildTreeAdvisorResponse,
  BuildTreeAdvisorRequiredAction,
  BuildTreeAdvisorTranscriptLine,
} from "../../../../product-apps/build-tree/index.ts";

import { workDesignNodeDisplayTitle } from "./work-design-tree-model.ts";
import type { WorkDesignNode } from "../../work-model/work-design/work-design-types.ts";

type WorkDesignBuildAdvisorRequest = BuildTreeAdvisorRequest<WorkDesignNode> & {
  finalized_brief_ref?: string;
  operator_prompt: string;
  package_ref: string;
  request_id: string;
  selected_node?: WorkDesignNode;
  source_ref: string;
  tree_snapshot?: WorkDesignNode;
};

type WorkDesignBuildAdvisorResponse = BuildTreeAdvisorResponse;

export type WorkDesignAdvisorRequiredAction = BuildTreeAdvisorRequiredAction;
export type WorkDesignAdvisorTranscriptLine = BuildTreeAdvisorTranscriptLine;

export function workDesignBuildAdvisorOpening(
  request: WorkDesignBuildAdvisorRequest,
) {
  const node = request.selected_node;

  return node
    ? `Selected ${node.kind}: ${workDesignNodeDisplayTitle(node)}. I can help refine tree shape, scaffold wording, missing child branches, and risk coverage without setting execution-only metadata.`
    : "Build Tree mode loaded. Select a draft node to ask for tree or scaffold guidance.";
}

export function workDesignBuildAdvisorAdapter(
  request: WorkDesignBuildAdvisorRequest,
): WorkDesignBuildAdvisorResponse {
  const promptHint = buildTreePromptPreview(request.operator_prompt);
  const baseResponse = {
    confidence: "medium" as const,
    response_id: `advisor-build_tree-${Date.now()}`,
    status: "mocked" as const,
  };
  const node = request.selected_node;

  if (!node) {
    return {
      ...baseResponse,
      required_operator_action: "no_change",
      text: `Mock build advisor: select a draft node before requesting a tree or scaffold patch. Operator ask: ${promptHint}`,
    };
  }

  switch (node.kind) {
    case "Epic":
      return {
        ...baseResponse,
        affected_node_id: node.id,
        patch_proposal: {
          patch_type: "tree_shape",
          summary:
            "Review Feature boundaries, User story coverage, and optional Risk branches.",
        },
        required_operator_action: "review",
        text: `For ${workDesignNodeDisplayTitle(node)}, inspect whether each Feature branch maps to one outcome from the accepted brief, whether User stories cover the minimum evidence expectations, and whether any broad exposure needs a Risk branch. I would keep PI, owner, iteration, and ROAM fields out of Work Design. Operator ask: ${promptHint}`,
      };
    case "Feature":
      return {
        ...baseResponse,
        affected_node_id: node.id,
        patch_proposal: {
          patch_type: "scaffold_text",
          summary:
            "Tighten Feature outcome and add or split User stories when needed.",
        },
        required_operator_action: "review",
        text: `For ${workDesignNodeDisplayTitle(node)}, tighten the Feature around one operator-visible outcome. If the draft has multiple outcomes, split it into separate Feature branches; if it lacks evidence proof, add or refine User stories. Keep benefit and evidence wording here, not final execution metadata. Operator ask: ${promptHint}`,
      };
    case "Risk":
      return {
        ...baseResponse,
        affected_node_id: node.id,
        patch_proposal: {
          patch_type: "scaffold_text",
          summary: "Keep Risk to event, impact, and current handling.",
        },
        required_operator_action: "review",
        text: `For ${workDesignNodeDisplayTitle(node)}, keep the scaffold to Risk Event, Impact, and Current Handling. This should describe broad ART exposure or sequencing concern; ROAM State, owner, review date, and disposition belong to Refinement or later risk posture repair. Operator ask: ${promptHint}`,
      };
    case "User story":
      return {
        ...baseResponse,
        affected_node_id: node.id,
        patch_proposal: {
          patch_type: "scaffold_text",
          summary: "Clarify story outcome, urgency, and evidence expectation.",
        },
        required_operator_action: "review",
        text: `For ${workDesignNodeDisplayTitle(node)}, make the story outcome, urgency, and evidence expectation explicit enough that Refinement can materialize backend-safe metadata without inventing intent. If it describes two outcomes, split it under the same Feature. Operator ask: ${promptHint}`,
      };
  }
}
