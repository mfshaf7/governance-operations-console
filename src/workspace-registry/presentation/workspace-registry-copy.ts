export const registryKindLabel = (kind: string) => ({ repo: "Repository", product: "Product", component: "Component" } as Record<string, string>)[kind] ?? kind;
export function registryRequestStatus(status: string) {
  return ({ accepted: "Request received", evaluating: "Checking eligibility", preparing: "Preparing source change", "review-required": "Source review required", succeeded: "Completed", blocked: "Blocked", rejected: "Not accepted", stale: "Source changed", cancelling: "Cancelling", cancelled: "Cancelled", "requires-action": "Action needed" } as Record<string, string>)[status] ?? status.replaceAll("-", " ");
}
export function registryNextAction(action: string) {
  return ({ complete: "No further action", continue: "Continue this request", "inspect-review-or-cancel": "Inspect the source review", "review-and-merge": "Review and merge the source change", "refresh-and-resubmit": "Review updated source", "restore-dependency-and-retry": "Restore the unavailable dependency, then retry", "submit-corrected-promotion": "Correct the registration details", "submit-corrected-lifecycle": "Correct the change details" } as Record<string, string>)[action] ?? action.replaceAll("-", " ");
}
export const registryTimestamp = (value: string) => new Date(value).toLocaleString("en-GB", { timeZone: "UTC" }) + " UTC";

/** Display-only separation: never change authority bindings or digests. */
export function registryResponsibilities(refs: readonly string[], products: readonly string[], repositories: readonly string[] = []) {
  const repositoryNames = new Set(repositories);
  const productNames = new Set(products.filter(name => !repositoryNames.has(name)));
  return {repositories: refs.filter(ref => !productNames.has(ref)), products: refs.filter(ref => productNames.has(ref))};
}
