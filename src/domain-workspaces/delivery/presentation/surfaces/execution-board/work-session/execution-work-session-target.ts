import type { DeliveryPackageSummary } from "../../../../read-model/index.ts";
import type { DeliveryReadModel, DeliveryArtNode } from "../../../../read-model/index.ts";

// Resolves routing only. It does not infer start eligibility or mutation rights.
export function executionInspectionPackage(workItemId: number, model: DeliveryReadModel) {
  if (model.source_truth !== "OpenProject-backed OOS") {
    throw new Error("Reload the current Delivery work before opening this item.");
  }
  const contains = (node: DeliveryArtNode): boolean =>
    node.legacy_work_package_id === workItemId || node.children.some(contains);
  const roots = model.art_tree.roots.filter(contains);
  const matches = model.packages.filter((item) =>
    roots.some((root) => root.id === item.tree_root_id));
  if (roots.length !== 1 || matches.length !== 1) {
    throw new Error("This work item could not be matched to one package. Reload Delivery and try opening it again.");
  }
  return matches[0];
}

export type ExecutionWorkSessionTarget = {
  description: string;
  entry: "direct" | "package";
  sourceLabel: string;
  sourceValue: string;
  title: string;
  workItemId: number | null;
};

export function directExecutionWorkSessionTarget(
  workItemId: number,
  model?: DeliveryReadModel,
  packageSummary?: Pick<DeliveryPackageSummary, "display_name"> | null,
): ExecutionWorkSessionTarget {
  const find = (nodes: DeliveryArtNode[]): DeliveryArtNode | undefined => {
    for (const node of nodes) { if (node.legacy_work_package_id === workItemId) return node; const child = find(node.children); if (child) return child; }
  };
  const item = model ? find(model.art_tree.roots) : undefined;
  return {
    description: packageSummary
      ? "Review the current work requirements and next action."
      : "Check what this work needs before you start or continue.",
    entry: "direct",
    sourceLabel: packageSummary ? "Package" : "Entry route",
    sourceValue: packageSummary?.display_name ?? "Opened by work item number",
    title: item ? `${item.component_type} #${workItemId} · ${item.title}` : `Work item #${workItemId}`,
    workItemId,
  };
}

export function packageExecutionWorkSessionTarget(
  packageSummary: DeliveryPackageSummary,
  workItemId: number | null,
): ExecutionWorkSessionTarget {
  return {
    description: packageSummary.summary,
    entry: "package",
    sourceLabel: "Package",
    sourceValue: `Epic #${packageSummary.legacy_epic_id}`,
    title: packageSummary.display_name,
    workItemId,
  };
}

export function parseExecutionWorkItemReference(value: string) {
  const match = /^(?:#|work-item-)?([1-9][0-9]*)$/i.exec(value.trim());
  const workItemId = match ? Number(match[1]) : Number.NaN;
  if (!Number.isSafeInteger(workItemId)) {
    throw new Error("Enter a work item number such as 1175 or #1175.");
  }
  return workItemId;
}

const continueCommandLabels: Record<string, string> = {
  "acquire-operating-evidence": "Verify Runtime Results",
  "architecture-compatible-refresh-required": "Refresh Session Plan",
  "agent-source-publish-required": "Send changes for review",
  "draft-finalization": "Prepare Final Evidence",
  "draft-review-packet": "Prepare the review summary",
  "draft-work-start": "Prepare work setup",
  "evaluate-work-start": "Check whether work can start",
  "finalize-review-packet": "Save the review record",
  "issue-operating-readiness": "Check whether the work is ready to run",
  "mark-merge-ready": "Check whether changes can merge",
  "owner-evidence-acquisition-required": "Run verification checks",
  "persist-architecture": "Save the Technical Plan",
  "project-review-evidence": "Prepare verification results",
  "source-worktree-required": "Set up work files",
};

export function workSessionCommand(code: string | null | undefined) {
  if (!code) return null;
  if (["architecture-reconstruction-required", "source-binding-reconstruction-required"].includes(code)) return "reconstruct" as const;
  if (code === "source-merge-approval-required") return "merge" as const;
  if (
    ["art-closeout-required", "landing-unit-closeout-retry-required", "cleanup-required", "cleanup-retry-required"].includes(
      code,
    )
  ) {
    return "close" as const;
  }
  return Object.hasOwn(continueCommandLabels, code) ? ("continue" as const) : null;
}

export function workSessionCommandLabel(code: string) {
  if (["architecture-reconstruction-required", "source-binding-reconstruction-required"].includes(code)) return "Rebuild work session";
  if (code === "landing-unit-closeout-retry-required") return "Retry completing the work";
  if (code === "source-merge-approval-required") return "Merge reviewed changes";
  if (code === "art-closeout-required") return "Complete the covered work";
  if (code === "cleanup-required") return "Finish Cleanup";
  if (code === "cleanup-retry-required") return "Retry Cleanup";
  return Object.hasOwn(continueCommandLabels, code) ? continueCommandLabels[code] : "Continue";
}

// These descriptions explain broker actions to operators. The raw owner reason is
// still available in the session's technical details.
const workSessionMoves: Record<string, { title: string; description: string; status?: string }> = {
  "work-scope-held": { title: "Review the hold on this work", description: "Inspect the recorded reason before starting.", status: "Waiting" },
  "work-prerequisites-review-required": { title: "Review prerequisite work", description: "Inspect the recorded dependencies before starting.", status: "Waiting" },
  "work-planning-required": { title: "Schedule this work", description: "Assign this item to an iteration in PI Planning.", status: "Needs scheduling" },
  "work-session-start-required": { title: "Prepare this work", description: "Check what this item needs before you start a session.", status: "Ready to check" },
  "work-session-start-ready": { title: "Review before starting", description: "Confirm the work covered by this session and approve repository access when it is requested." },
  "landing-unit-decision-required": { title: "Review before starting", description: "Confirm the work that will be reviewed and merged together." },
  "landing-unit-decision-invalid": { title: "Review the work scope", description: "Correct the session decision before starting work." },
  "architecture-compatible-refresh-required": { title: "Refresh the session plan", description: "The approved Technical Plan changed. Link this session to the latest version to keep working with the same scope.", status: "Refresh needed" },
  "architecture-packet-required": { title: "Prepare a Technical Plan", description: "Prepare and approve the plan for the work you want to start." },
  "architecture-binding-required": { title: "Review the approved plan", description: "Review the plan covering this work before linking it to the session." },
  "architecture-prerequisite-required": { title: "Finish prerequisite work", description: "Check the item that must be complete before this work can proceed.", status: "Waiting" },
  "architecture-human-gate-required": { title: "Review the required approval", description: "Open the work item where this approval is recorded.", status: "Waiting for approval" },
  "architecture-reconstruction-required": { title: "Rebuild the work session", description: "The plan changed. Review and rebuild the work session before continuing.", status: "Review needed" },
  "source-binding-reconstruction-required": { title: "Review repository setup", description: "The repository setup changed. Review it before continuing this session.", status: "Review needed" },
  "architecture-recovery-required": { title: "Review the previous session", description: "Review the retained work and evidence before archiving this attempt.", status: "Review needed" },
  "architecture-status-unavailable": { title: "Plan status unavailable", description: "Read the current session to check whether the approved plan is available.", status: "Unavailable" },
  "source-worktree-required": { title: "Set up work files", description: "Set up the branch and workspace for this session before editing." },
  "source-work-required": { title: "Edit the work files", description: "Use Edit or import files to open the editor or bring in your changes. Keep changes on this session’s branch until they are ready for review.", status: "In progress" },
  "agent-source-credential-required": { title: "Confirm repository access", description: "Check the requested repository and branch before continuing.", status: "Access needed" },
  "agent-source-publish-required": { title: "Publish changes for review", description: "Push the committed changes on this session’s branch and open the pull request." },
  "source-base-refresh-required": { title: "Check the starting revision", description: "Review the current repository revision before continuing this session.", status: "Refresh needed" },
  "source-revocation-required": { title: "End repository access", description: "Check that the session’s permission to use the repository has ended." },
  "source-revocation-pending": { title: "Repository access is ending", description: "Read the current session to confirm that repository access has closed.", status: "Waiting" },
  "pull-request-required": { title: "Open the pull request", description: "This session is waiting for a pull request for its reviewed branch." },
  "pull-request-review-required": { title: "Review the file changes", description: "Open the pull request to inspect the changes and record the review.", status: "Waiting for review" },
  "pull-request-base-update-required": { title: "Update the pull request branch", description: "Open the pull request to check the required branch update. The updated revision needs fresh checks and review before merge.", status: "Branch behind" },
  "source-merge-approval-required": { title: "Merge the reviewed changes", description: "Merge the approved pull request for this session." },
  "owner-evidence-acquisition-required": { title: "Run the verification checks", description: "Run the required checks on the changes being reviewed." },
  "acquire-operating-evidence": { title: "Verify the runtime results", description: "Run the approved checks against the merged changes before completing the work." },
  "security-acceptance-required": { title: "Waiting for security approval", description: "The required security decision must be recorded before the changes can merge.", status: "Waiting for approval" },
  "exception-or-risk-acceptance-required": { title: "Review the remaining risk", description: "Review the required exception or risk decision before continuing.", status: "Review needed" },
  "art-blocker-review-required": { title: "Review the blocker", description: "Open the work board to see what is blocking this work.", status: "Blocked" },
  "work-blocked": { title: "Work is blocked", description: "Review the recorded reason in Technical details before continuing.", status: "Blocked" },
  "art-closeout-required": { title: "Complete the covered work", description: "Record completion for the work covered by this session." },
  "landing-unit-closeout-retry-required": { title: "Finish recording completion", description: "Review the current result and retry the remaining closeout work." },
  "cleanup-required": { title: "Clean up session resources", description: "Remove temporary resources owned by this session and retain the completion evidence." },
  "cleanup-retry-required": { title: "Finish session cleanup", description: "Review the current cleanup result before retrying the remaining steps." },
  "initiative-closeout-required": { title: "Review package closeout", description: "Open the package closeout review to check the completion evidence." },
  "initiative-closeout-gates-required": { title: "Review package closeout", description: "Check the remaining approvals and evidence for this package." },
  "initiative-work-remains": { title: "Continue remaining work", description: "Return to the work board to see which items are still open." },
  "initiative-follow-up-required": { title: "Review the follow-up work", description: "Open the work board to review the next item." },
  "work-complete": { title: "Work session complete", description: "The session’s completion is recorded.", status: "Complete" },
};

export function workSessionMove(code: string, operatingEvidence?: string) {
  if (code === "acquire-operating-evidence" && operatingEvidence === "invalid") {
    return {
      title: "Runtime results need attention",
      description: "The recorded results could not be verified for this version. Check that the matching rehearsal completed, then try again.",
      status: "Verification needed",
    };
  }
  if (Object.hasOwn(workSessionMoves, code)) {
    const move = workSessionMoves[code];
    return { ...move, status: move.status ?? "Action required" };
  }
  if (workSessionCommand(code)) return {
    title: workSessionCommandLabel(code), description: "The result will appear here once the step finishes.", status: "Action required",
  };
  return { title: "Review the session status", description: "Open Technical details to see what the session reported.", status: "Review needed" };
}

export function workSessionReviewUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "github.com" && !url.username && !url.password && !url.port && /^\/[^/]+\/[^/]+\/pull\/[1-9][0-9]*$/.test(url.pathname) ? url.href : null; }
  catch { return null; }
}
