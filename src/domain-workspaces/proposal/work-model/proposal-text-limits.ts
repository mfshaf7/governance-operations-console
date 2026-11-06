// Matches the triage, disposition and handoff text limits in the OOS command contract.
export const proposalWorkflowTextLimit = 2_000;
export function proposalWorkflowTextLength(value: string) { return Array.from(value.trim()).length; }
export function proposalWorkflowTextValid(value: string) {
  const length = proposalWorkflowTextLength(value);
  return length > 0 && length <= proposalWorkflowTextLimit;
}
export function proposalWorkflowTextLabel(label: string, value: string) {
  const length = proposalWorkflowTextLength(value);
  return `${label} · ${length.toLocaleString("en-US")} / 2,000 characters${length > proposalWorkflowTextLimit ? " — shorten before submitting" : ""}`;
}
