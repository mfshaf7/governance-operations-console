import type {WorkspaceIntakeDecision, WorkspaceIntakeResult} from "./workspace-intake-live-types.ts";

export function onboardingDecisionLabel(decision: WorkspaceIntakeDecision | "unselected") {
  return {proposed:"Record for setup and review", admitted:"Approve for activation", "out-of-scope":"Keep outside managed workspace", unselected:"Choose an onboarding decision"}[decision];
}

export function onboardingResultGuidance(result: WorkspaceIntakeResult, decision: WorkspaceIntakeDecision | "unselected") {
  if (result.status === "succeeded") return decision === "proposed"
    ? "Recorded for setup and review. Complete repository setup next. Project use remains blocked until approval and activation."
    : decision === "admitted" ? "Approved for activation. Add the repository to active Registry inventory next; approval alone does not enable project use."
      : decision === "out-of-scope" ? "Recorded outside the managed workspace. This repository is not available for governed project work."
        : "The recorded decision is complete. Return to onboarding to check its current setup and activation status.";
  if (result.status === "cancelled") return "The request was cancelled. Return to onboarding to check the current repository status before starting another decision.";
  if (result.status === "cancelling") return "Cancellation is still being checked. Continue this original request to confirm its outcome.";
  if (result.next_action === "submit-corrected-request") return "This request did not complete. Review the reported problem and correct the details before submitting another decision.";
  if (result.status === "review-required" || result.review) return "The source change is awaiting review. Open its review, then check this original request after the reviewed change is merged.";
  if (result.status === "requires-action" || result.next_action === "restore-dependency-and-retry") return "This request needs attention. Resolve the reported problem, then continue this same request; do not create a duplicate.";
  return "Your request is saved, but onboarding is not complete. Continue this original request to process the recorded decision.";
}

export function onboardingNextAction(result: WorkspaceIntakeResult, decision: WorkspaceIntakeDecision | "unselected") {
  if (result.status === "succeeded") return decision === "proposed" ? "Complete repository setup" : decision === "admitted" ? "Activate in Registry" : decision === "out-of-scope" ? "No governed project use" : "Check current onboarding";
  return ({complete:"Decision recorded", continue:"Continue the saved request", "inspect-review-or-cancel":"Inspect the review or cancel", "restore-dependency-and-retry":"Resolve the problem, then continue", "review-and-merge":"Review the source change, then check progress", "submit-corrected-request":"Correct the decision details"})[result.next_action];
}

export function onboardingStatusLabel(result: WorkspaceIntakeResult) {
  return ({accepted:"Saved; processing pending", evaluating:"Checking requirements", preparing:"Preparing the decision", "review-required":"Awaiting source review", "requires-action":"Needs attention", rejected:"Not accepted", cancelling:"Cancellation pending", cancelled:"Cancelled", succeeded:"Decision recorded"})[result.status];
}
