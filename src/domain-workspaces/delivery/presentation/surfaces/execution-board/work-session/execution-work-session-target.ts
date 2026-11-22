import type { DeliveryPackageSummary } from "../../../../read-model/index.ts";
import type { DeliveryReadModel, DeliveryArtNode } from "../../../../read-model/index.ts";

// Resolves routing only. It does not infer start eligibility or mutation rights.
export function executionInspectionPackage(workItemId: number, model: DeliveryReadModel) {
  if (model.source_truth !== "OpenProject-backed OOS") {
    throw new Error("Canonical initiative inspection requires the current OOS inventory.");
  }
  const contains = (node: DeliveryArtNode): boolean =>
    node.legacy_work_package_id === workItemId || node.children.some(contains);
  const roots = model.art_tree.roots.filter(contains);
  const matches = model.packages.filter((item) =>
    roots.some((root) => root.id === item.tree_root_id));
  if (roots.length !== 1 || matches.length !== 1) {
    throw new Error("The ART item is not uniquely present in the current initiative inventory. Refresh canonical records before inspecting it.");
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
      : "Authoritative OOS state determines whether this Delivery work item can start or continue.",
    entry: "direct",
    sourceLabel: packageSummary ? "Package" : "Entry route",
    sourceValue: packageSummary?.display_name ?? "Direct ART target",
    title: item ? `${item.component_type} ${workItemId} · ${item.title}` : `Work Item ${workItemId}`,
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
    sourceValue: packageSummary.source_ref,
    title: packageSummary.display_name,
    workItemId,
  };
}

export function parseExecutionWorkItemReference(value: string) {
  const match = /^(?:#|work-item-)?([1-9][0-9]*)$/i.exec(value.trim());
  const workItemId = match ? Number(match[1]) : Number.NaN;
  if (!Number.isSafeInteger(workItemId)) {
    throw new Error("Enter a valid ART work item such as 1175, #1175, or work-item-1175.");
  }
  return workItemId;
}

const continueCommandLabels: Record<string, string> = {
  "architecture-compatible-refresh-required": "Refresh Architecture Binding",
  "agent-source-publish-required": "Publish Source",
  "draft-finalization": "Prepare Final Evidence",
  "draft-review-packet": "Draft Review Packet",
  "draft-work-start": "Draft Work Start",
  "evaluate-work-start": "Evaluate Work Start",
  "finalize-review-packet": "Finalize Review Packet",
  "issue-operating-readiness": "Evaluate Operating Readiness",
  "mark-merge-ready": "Evaluate Merge Readiness",
  "owner-evidence-acquisition-required": "Run Evidence Checks",
  "persist-architecture": "Persist Architecture",
  "project-review-evidence": "Project Evidence",
  "source-worktree-required": "Prepare Source Workspace",
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
  return continueCommandLabels[code] ? ("continue" as const) : null;
}

export function workSessionCommandLabel(code: string) {
  if (["architecture-reconstruction-required", "source-binding-reconstruction-required"].includes(code)) return "Rebuild Session Binding";
  if (code === "landing-unit-closeout-retry-required") return "Retry Landing Unit Closeout";
  if (code === "source-merge-approval-required") return "Merge Source";
  if (code === "art-closeout-required") return "Close Landing Unit";
  if (code === "cleanup-required") return "Finish Cleanup";
  if (code === "cleanup-retry-required") return "Retry Cleanup";
  return continueCommandLabels[code] ?? "Continue";
}

export function workSessionReviewUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "github.com" && !url.username && !url.password && !url.port && /^\/[^/]+\/[^/]+\/pull\/[1-9][0-9]*$/.test(url.pathname) ? url.href : null; }
  catch { return null; }
}
