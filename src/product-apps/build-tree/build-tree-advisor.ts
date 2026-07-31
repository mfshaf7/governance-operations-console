export type BuildTreeAdvisorRequiredAction =
  | "apply_patch"
  | "no_change"
  | "review";

export type BuildTreeAdvisorPatchType = "scaffold_text" | "tree_shape";

export type BuildTreeAdvisorRequest<TNode> = {
  operator_prompt: string;
  request_id: string;
  selected_node?: TNode;
  subject_ref?: string;
  trace_refs?: Record<string, string | undefined>;
  tree_snapshot?: TNode;
};

export type BuildTreeAdvisorResponse = {
  affected_node_id?: string;
  confidence: "high" | "low" | "medium";
  patch_proposal?: {
    patch_type: BuildTreeAdvisorPatchType;
    summary: string;
  };
  required_operator_action: BuildTreeAdvisorRequiredAction;
  response_id: string;
  status: "mocked" | "ready";
  text: string;
};

export function buildTreePromptPreview(prompt: string, maxLength = 120) {
  return prompt.length > maxLength
    ? `${prompt.slice(0, Math.max(0, maxLength - 3))}...`
    : prompt;
}
