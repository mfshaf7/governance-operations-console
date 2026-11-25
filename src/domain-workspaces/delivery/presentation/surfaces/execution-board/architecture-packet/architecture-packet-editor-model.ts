import { architecturePacketDraftIssues } from "../../../../live-runtime/architecture-packet-live-contract.ts";
import type {
  ArchitecturePacketArtifact,
  ArchitecturePacketDecisionStatus,
  ArchitecturePacketDraftInput,
  ArchitecturePacketRepoRevision,
} from "../../../../live-runtime/architecture-packet-live-types.ts";

import type { TechnicalPlanGuidanceScope, TechnicalPlanStarter } from "../../../../work-model/execution/technical-plan-guidance.ts";

export type { TechnicalPlanDraft as ArchitecturePacketEditor } from "../../../../work-model/execution/technical-plan-model.ts";
import type { TechnicalPlanDraft as ArchitecturePacketEditor } from "../../../../work-model/execution/technical-plan-model.ts";
import { isOptionalArchitectureSection, type InactiveArchitectureSections } from "../../../../work-model/execution/technical-plan-model.ts";
import { technicalPlanVerificationCoverage } from "../../../../work-model/execution/technical-plan-preparation.ts";

export function emptyArchitecturePacketEditor({
  deliveryId = "",
  workItemId = null,
}: {
  deliveryId?: string;
  workItemId?: number | null;
} = {}): ArchitecturePacketEditor {
  return {
    architectureJson: "{}",
    conformanceJson: '{"required":true}',
    coveredWorkItemIds: workItemId ? [`work-item-${workItemId}`] : [],
    deliveryId,
    rationale: "",
    repoRevisionsJson: "[]",
  };
}

export function starterTechnicalPlanEditor(scope: TechnicalPlanGuidanceScope, draft: TechnicalPlanStarter): ArchitecturePacketEditor {
  const workRef = `work-item-${scope.work.id}`;
  return {
    ...emptyArchitecturePacketEditor({ deliveryId: scope.deliveryId, workItemId: scope.work.id }),
    rationale: draft.rationale.trim(),
    architectureJson: JSON.stringify({
      rollback_cleanup_terminal_conditions: {
        rollback_units: [...new Set(draft.rollback.map(step => step.trim()))],
        cleanup_obligations: [],
        terminal_conditions: [],
      },
    }, null, 2),
    conformanceJson: JSON.stringify({
      required: true,
      dimensions: [draft.verification.trim()],
      work_item_dimension_applicability: [{ work_item_id: workRef, dimension_ids: [draft.verification.trim()] }],
      cases: [
        { id: "starter-success", polarity: "positive", expected_outcome: draft.success.trim() },
        { id: "starter-failure", polarity: "negative", expected_outcome: draft.failure.trim() },
      ].map(entry => ({ ...entry, applies_to_work_item_ids: [workRef], dimension_ids: [draft.verification.trim()] })),
    }, null, 2),
    starterBasis: { workItemId: scope.work.id, scope: scope.basis },
  };
}

export type SavedTechnicalPlan = { schemaVersion: 1; packageId: string; draft: ArchitecturePacketEditor | null };

export function normalizeSavedTechnicalPlan(value: unknown, packageId: string): SavedTechnicalPlan | null {
  if (!isRecord(value) || value.schemaVersion !== 1 || value.packageId !== packageId) return null;
  const draft = value.draft;
  if (draft === null) return { schemaVersion: 1, packageId, draft: null };
  if (!isRecord(draft) || draft.deliveryId !== packageId || !Array.isArray(draft.coveredWorkItemIds) ||
      draft.coveredWorkItemIds.length > 50 || new Set(draft.coveredWorkItemIds).size !== draft.coveredWorkItemIds.length ||
      draft.coveredWorkItemIds.some(id => typeof id !== "string" || !/^work-item-[1-9][0-9]*$/.test(id)) ||
      typeof draft.architectureJson !== "string" || typeof draft.conformanceJson !== "string" ||
      typeof draft.repoRevisionsJson !== "string" || typeof draft.rationale !== "string") return null;
  const inactive = draft.inactiveArchitectureSections;
  if (inactive !== undefined && (!isRecord(inactive) ||
      Object.entries(inactive).some(([key, value]) => !isOptionalArchitectureSection(key) || !isRecord(value)))) return null;
  const basis = draft.starterBasis;
  if (basis !== undefined && (!isRecord(basis) || Object.keys(basis).sort().join() !== "scope,workItemId" ||
      typeof basis.workItemId !== "number" || !Number.isSafeInteger(basis.workItemId) || basis.workItemId < 1 ||
      typeof basis.scope !== "string" || !basis.scope.length || basis.scope.length > 16_000)) return null;
  return { schemaVersion: 1, packageId, draft: {
    deliveryId: packageId, coveredWorkItemIds: draft.coveredWorkItemIds,
    architectureJson: draft.architectureJson, conformanceJson: draft.conformanceJson,
    repoRevisionsJson: draft.repoRevisionsJson, rationale: draft.rationale,
    ...(inactive === undefined ? {} : { inactiveArchitectureSections: inactive as InactiveArchitectureSections }),
    ...(basis === undefined ? {} : { starterBasis: basis as NonNullable<ArchitecturePacketEditor["starterBasis"]> }),
  } };
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
    const issues = architecturePacketDraftIssues(input, {
      requireApproval: status === "architecture-ready",
    });
    if (status === "draft" && input.conformance_plan.required === false) {
      issues.push("Conformance requirement must be enabled for approval.");
    }
    const { required_human_gates: gates,
      runtime_activation_chains: activation } = input.architecture;
    if (Array.isArray(gates) && gates.some(gate => gate?.blocked_transition === "before_runtime_activation") &&
        Array.isArray(activation) && activation.length === 0) {
      issues.push("Runtime activation steps are required for runtime approvals.");
    }
    const { cases, git_causality: git } = input.conformance_plan;
    if (Array.isArray(cases) && cases.length && (!cases.some(entry => entry?.polarity === "positive") ||
        !cases.some(entry => entry?.polarity === "negative"))) {
      issues.push("Verification cases must include a success case and a failure or rejection case.");
    } else if (Array.isArray(cases) && cases.length && technicalPlanVerificationCoverage(editor).length) {
      issues.push("Verification cases must cover every selected work item with a success and a failure case.");
    }
    if (isRecord(git) && typeof git.applies === "boolean" &&
        (!Array.isArray(git.claims) || git.applies !== (git.claims.length > 0))) {
      issues.push("Git dependency verification needs a claim only when it applies.");
    }
    return issues;
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
