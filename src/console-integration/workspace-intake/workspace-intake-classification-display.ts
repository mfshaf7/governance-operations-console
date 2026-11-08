import type {WorkspaceIntakeDecision, WorkspaceIntakeResult} from "./workspace-intake-live-types.ts";

type Decision = WorkspaceIntakeDecision | "unselected";
export function classificationResultTitle(status: WorkspaceIntakeResult["status"]) {
  return ({accepted:"Classification submitted", succeeded:"Classification recorded", rejected:"Classification not accepted",
    "requires-action":"Classification needs attention", cancelled:"Classification cancelled", cancelling:"Cancelling classification",
    evaluating:"Checking classification", preparing:"Preparing classification", "review-required":"Classification awaiting review"})[status];
}
export function classificationResultGuidance(result: WorkspaceIntakeResult, decision: Decision) {
  if (result.status === "succeeded") return decision === "admitted"
    ? "Admission is recorded. Review activation in Eligible items to add this item to active inventory. This decision alone does not activate it."
    : decision === "proposed" ? "Recorded for planning and review. This item is not active. Reopen its details to request admission when it is ready."
      : decision === "out-of-scope" ? "Recorded outside the managed workspace. This item is not active and has no activation step."
        : "The classification is recorded. Check the current Registry status before choosing a further action.";
  if (result.status === "cancelled") return "This request was cancelled. Check the current classification before starting another.";
  if (result.status === "cancelling") return "Cancellation is still being checked. Keep following this original request.";
  if (result.next_action === "submit-corrected-request") return "The request did not complete. Review the reported problem and correct the classification details.";
  if (result.status === "review-required" || result.review) return "The source change is awaiting review. Open its review, then check this original request after the change is merged.";
  if (result.status === "requires-action") return "Resolve the reported problem, then continue this same request. Do not create a duplicate.";
  return "The request is saved; its classification is not complete. Continue this original request to process the decision.";
}
export function classificationNextAction(result: WorkspaceIntakeResult, decision: Decision) {
  if (result.status === "succeeded") return decision === "admitted" ? "Review activation" : decision === "proposed" ? "Complete planning before admission" : decision === "out-of-scope" ? "No activation required" : "Check current Registry status";
  return ({complete:"Classification recorded", continue:"Continue the saved request", "inspect-review-or-cancel":"Inspect the review or cancel", "restore-dependency-and-retry":"Resolve the problem, then continue", "review-and-merge":"Review the source change, then check progress", "submit-corrected-request":"Correct the classification details"})[result.next_action];
}
