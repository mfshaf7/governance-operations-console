import { architecturePacketDraftIssues } from "../../../../live-runtime/architecture-packet-live-contract.ts";
import type {
  ArchitecturePacketArtifact,
  ArchitecturePacketDecisionStatus,
  ArchitecturePacketDraftInput,
  ArchitecturePacketRepoRevision,
} from "../../../../live-runtime/architecture-packet-live-types.ts";

export type ArchitecturePacketEditor = {
  architectureJson: string;
  conformanceJson: string;
  coveredWorkItemIds: string[];
  deliveryId: string;
  rationale: string;
  repoRevisionsJson: string;
};

export function emptyArchitecturePacketEditor({
  deliveryId = "",
  workItemId = null,
}: {
  deliveryId?: string;
  workItemId?: number | null;
} = {}): ArchitecturePacketEditor {
  return {
    architectureJson: "{}",
    conformanceJson: "{}",
    coveredWorkItemIds: workItemId ? [`work-item-${workItemId}`] : [""],
    deliveryId,
    rationale: "",
    repoRevisionsJson: "[]",
  };
}

export function architecturePacketEditorFromArtifact(
  artifact: ArchitecturePacketArtifact,
): ArchitecturePacketEditor {
  return {
    architectureJson: JSON.stringify(artifact.architecture, null, 2),
    conformanceJson: JSON.stringify(artifact.conformance_plan, null, 2),
    coveredWorkItemIds: [...artifact.covered_work_item_ids],
    deliveryId: artifact.delivery_id,
    rationale: artifact.decision.rationale,
    repoRevisionsJson: JSON.stringify(
      artifact.source_snapshot.repo_revisions,
      null,
      2,
    ),
  };
}

export function architecturePacketInputFromEditor(
  editor: ArchitecturePacketEditor,
  status: ArchitecturePacketDecisionStatus,
): ArchitecturePacketDraftInput {
  const repoRevisions = parsedJson(editor.repoRevisionsJson, "Repository revisions");
  const architecture = parsedJson(editor.architectureJson, "Architecture design");
  const conformance = parsedJson(editor.conformanceJson, "Conformance plan");
  if (!Array.isArray(repoRevisions)) {
    throw new Error("Repository revisions must be a JSON array.");
  }
  if (!isRecord(architecture)) {
    throw new Error("Architecture design must be a JSON object.");
  }
  if (!isRecord(conformance)) {
    throw new Error("Conformance plan must be a JSON object.");
  }
  return {
    architecture,
    conformance_plan: conformance,
    covered_work_item_ids: editor.coveredWorkItemIds
      .map((value) => value.trim())
      .filter(Boolean),
    decision: { rationale: editor.rationale.trim(), status },
    delivery_id: editor.deliveryId.trim(),
    repo_revisions: repoRevisions as ArchitecturePacketRepoRevision[],
    schema_version: 1,
  };
}

export function architecturePacketEditorIssues(
  editor: ArchitecturePacketEditor,
  status: ArchitecturePacketDecisionStatus,
) {
  try {
    const input = architecturePacketInputFromEditor(editor, status);
    return architecturePacketDraftIssues(input, {
      requireApproval: status === "architecture-ready",
    });
  } catch (error) {
    return [error instanceof Error ? error.message : "Architecture input is invalid."];
  }
}

function parsedJson(value: string, label: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
