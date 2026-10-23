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
): ExecutionWorkSessionTarget {
  return {
    description:
      "Authoritative OOS state determines whether this Delivery work item can start or continue.",
    entry: "direct",
    sourceLabel: "Entry route",
    sourceValue: "Direct ART target",
    title: `ART Work Item #${workItemId}`,
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
