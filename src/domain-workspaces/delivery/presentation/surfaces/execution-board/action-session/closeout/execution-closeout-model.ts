import type {
  DeliveryCloseoutImpact,
  DeliveryCloseoutOperation,
  DeliveryCloseoutProjection,
  DeliveryCloseoutValidationBehavior,
} from "../../../../../live-runtime/delivery-closeout-live-types.ts";
import { derivedIntakeRole } from "../../../../../../../workspace-registry/model/workspace-intake-guidance.ts";
import { completionEvidenceFromForm, type CompletionResult } from "../../../../../work-model/execution/completion-evidence-form.ts";

function entrantRole(entrant: ExecutionCloseoutDraft["workspaceEntrant"]) {
  return entrant.entrantKind === "repository" ? entrant.validationWgcfGraphRole
    : derivedIntakeRole(entrant.entrantKind, entrant.componentClass, entrant.validationPosture) || entrant.validationWgcfGraphRole;
}

export type ExecutionCloseoutImpactKind =
  | "existing-product-change"
  | "none"
  | "workspace-entrant";

export type ExecutionCloseoutEntrantKind =
  | "component"
  | "product"
  | "repository";

export type ExecutionCloseoutDraft = {
  acceptanceNote: string;
  changedSurfaces: string;
  completionNote: string;
  completionSummary: string;
  demoEvidence: string;
  demoOutcome: string;
  demoSummary: string;
  existingProduct: {
    changeSummary: string;
    productId: string;
    productOwnerRef: string;
    registryRef: string;
    registryVersion: string;
  };
  impactKind: ExecutionCloseoutImpactKind;
  inspectActionItems: string;
  inspectSummary: string;
  residualFollowUp: string;
  testResultEvidence: string;
  testResult: CompletionResult;
  validationEvidence: string;
  validationResult: CompletionResult;
  workspaceEntrant: {
    candidateRef: string;
    candidateVersion: string;
    canonicalKey: string;
    componentClass: string;
    entrantKind: ExecutionCloseoutEntrantKind;
    intendedEndpoint: string;
    name: string;
    ownerRepo: string;
    platformOwner: string;
    product: string;
    repoClass: string;
    requiresSecurityBindings: "no" | "yes";
    runtimeOwner: string;
    securityOwner: string;
    sourceOwnerRef: string;
    sourceOwners: string[];
    validationCatalogRefs: string[];
    validationNotes: string;
    validationPosture: string;
    validationWgcfGraphRole: string;
  };
};

export const initialExecutionCloseoutDraft: ExecutionCloseoutDraft = {
  acceptanceNote: "",
  changedSurfaces: "",
  completionNote: "",
  completionSummary: "",
  demoEvidence: "",
  demoOutcome: "",
  demoSummary: "",
  existingProduct: {
    changeSummary: "",
    productId: "",
    productOwnerRef: "",
    registryRef: "",
    registryVersion: "",
  },
  impactKind: "none",
  inspectActionItems: "",
  inspectSummary: "",
  residualFollowUp: "",
  testResultEvidence: "",
  testResult: "",
  validationEvidence: "",
  validationResult: "",
  workspaceEntrant: {
    candidateRef: "",
    candidateVersion: "",
    canonicalKey: "",
    componentClass: "",
    entrantKind: "product",
    intendedEndpoint: "",
    name: "",
    ownerRepo: "",
    platformOwner: "",
    product: "",
    repoClass: "",
    requiresSecurityBindings: "no",
    runtimeOwner: "",
    securityOwner: "",
    sourceOwnerRef: "",
    sourceOwners: [""],
    validationCatalogRefs: [],
    validationNotes: "",
    validationPosture: "",
    validationWgcfGraphRole: "",
  },
};

const evidenceFields: Array<keyof ExecutionCloseoutDraft> = [
  "changedSurfaces",
  "completionSummary",
  "demoEvidence",
  "demoOutcome",
  "demoSummary",
  "inspectActionItems",
  "inspectSummary",
  "testResultEvidence",
  "validationEvidence",
];

export function executionCloseoutEvidenceComplete(
  draft: ExecutionCloseoutDraft,
) {
  if (!evidenceFields.every((field) => present(draft[field] as string))) return false;
  try { closeoutCompletionEvidence(draft); return true; } catch { return false; }
}

function closeoutCompletionEvidence(draft: ExecutionCloseoutDraft) {
  return completionEvidenceFromForm({ completion_summary: draft.completionSummary,
    changed_surfaces: draft.changedSurfaces, test_result_evidence: draft.testResultEvidence,
    validation_evidence: draft.validationEvidence, completion_note: draft.completionNote }, draft.testResult, draft.validationResult);
}

export function executionCloseoutEvidenceIssue(draft: ExecutionCloseoutDraft): string | null {
  if (![draft.completionSummary, draft.changedSurfaces, draft.testResultEvidence, draft.validationEvidence].every(present)) return null;
  try { closeoutCompletionEvidence(draft); return null; }
  catch (error) { return error instanceof Error ? error.message : "Review the evidence and observed results."; }
}

export function executionCloseoutImpactComplete(
  draft: ExecutionCloseoutDraft,
) {
  if (draft.impactKind === "none") return true;
  if (draft.impactKind === "existing-product-change") {
    return Object.values(draft.existingProduct).every(present);
  }
  const entrant = draft.workspaceEntrant;
  const commonComplete = [
    entrant.canonicalKey,
    entrant.name,
    entrant.sourceOwnerRef,
    entrant.validationNotes,
    entrant.validationPosture,
    entrantRole(entrant),
  ].every(present);
  if (!commonComplete) return false;
  if (entrant.entrantKind === "repository") {
    return (
      present(entrant.repoClass) &&
      (entrant.requiresSecurityBindings === "no" ||
        present(entrant.securityOwner))
    );
  }
  if (entrant.entrantKind === "product") {
    return (
      [
        entrant.intendedEndpoint,
        entrant.platformOwner,
        entrant.runtimeOwner,
        entrant.securityOwner,
      ].every(present) && entrant.sourceOwners.some(present)
    );
  }
  return [
    entrant.componentClass,
    entrant.ownerRepo,
    entrant.securityOwner,
  ].every(present);
}

export function executionCloseoutReadyToApply({
  draft,
  projection,
}: {
  draft: ExecutionCloseoutDraft;
  projection: DeliveryCloseoutProjection | null;
}) {
  return Boolean(
    projection &&
      ((projection.projection_state === "ready" && projection.readiness.ready_for_closeout) ||
        (projection.projection_state === "not_ready" && projection.next_action.code === "prepare_delivery_closeout")) &&
      projection.readiness.evidence_refs.length > 0 &&
      executionCloseoutEvidenceComplete(draft) &&
      executionCloseoutImpactComplete(draft) &&
      present(draft.acceptanceNote),
  );
}

export function executionCloseoutDraftDirty(draft: ExecutionCloseoutDraft) {
  return JSON.stringify(draft) !== JSON.stringify(initialExecutionCloseoutDraft);
}

export function executionCloseoutOperation({
  draft,
  projection,
}: {
  draft: ExecutionCloseoutDraft;
  projection: DeliveryCloseoutProjection;
}): DeliveryCloseoutOperation {
  const completion = closeoutCompletionEvidence(draft);
  const optionalEvidence = {
    ...(present(draft.completionNote)
      ? { completion_note: draft.completionNote.trim() }
      : {}),
    ...(present(draft.residualFollowUp)
      ? { residual_follow_up: draft.residualFollowUp.trim() }
      : {}),
  };
  return {
    payload: {
      evidence: {
        changed_surfaces: completion.changed_surfaces,
        completion_summary: completion.completion_summary,
        demo_evidence: draft.demoEvidence.trim(),
        demo_outcome: draft.demoOutcome.trim(),
        demo_summary: draft.demoSummary.trim(),
        evidence_refs: [...projection.readiness.evidence_refs],
        inspect_action_items: draft.inspectActionItems.trim(),
        inspect_summary: draft.inspectSummary.trim(),
        test_result_evidence: completion.test_result_evidence,
        validation_evidence: completion.validation_evidence,
        ...optionalEvidence,
      },
      impact: executionCloseoutImpact(draft, projection),
    },
    type: "apply_closeout",
  };
}

export function executionCloseoutReadinessRows(
  projection: DeliveryCloseoutProjection,
) {
  const counts = projection.readiness.counts;
  return [
    ["Open descendants", counts.open_descendants],
    ["Blocked work", counts.blocked],
    ["Missing evidence", counts.without_evidence],
    ["Weak evidence", counts.weak_evidence],
    ["Weak done narrative", counts.weak_done_narrative],
    ["Missing repository", counts.without_owner],
  ] as const;
}

function executionCloseoutImpact(
  draft: ExecutionCloseoutDraft,
  projection: DeliveryCloseoutProjection,
): DeliveryCloseoutImpact {
  if (draft.impactKind === "none") return { kind: "none" };
  if (draft.impactKind === "existing-product-change") {
    return {
      active_product: {
        product_id: draft.existingProduct.productId.trim(),
        registry_ref: draft.existingProduct.registryRef.trim(),
        registry_version: draft.existingProduct.registryVersion.trim(),
      },
      change_summary: draft.existingProduct.changeSummary.trim(),
      kind: "existing_product_change",
      product_owner_ref: draft.existingProduct.productOwnerRef.trim(),
    };
  }
  const entrant = draft.workspaceEntrant;
  const validationBehavior: DeliveryCloseoutValidationBehavior = {
    catalog_refs: entrant.validationCatalogRefs.filter(present).map(trim),
    notes: entrant.validationNotes.trim(),
    posture: entrant.validationPosture.trim(),
    wgcf_graph_role: entrantRole(entrant).trim(),
  };
  const common = {
    candidate_ref: entrant.candidateRef.trim() || `oos://delivery-closeout-candidates/${projection.delivery_id}`,
    candidate_version: entrant.candidateVersion.trim() || projection.source_revision,
    canonical_key: entrant.canonicalKey.trim(),
    correlation_ref: `delivery-closeout:${projection.delivery_id}`,
    evidence_refs: [...projection.readiness.evidence_refs],
    name: entrant.name.trim(),
    source_owner_ref: entrant.sourceOwnerRef.trim(),
  };
  if (entrant.entrantKind === "repository") {
    return {
      candidate: {
        ...common,
        entrant_kind: "repository",
        intake_metadata: {
          repo_class: entrant.repoClass.trim(),
          requires_security_bindings:
            entrant.requiresSecurityBindings === "yes",
          security_owner: present(entrant.securityOwner)
            ? entrant.securityOwner.trim()
            : null,
          validation_behavior: validationBehavior,
        },
      },
      kind: "workspace_entrant",
    };
  }
  if (entrant.entrantKind === "product") {
    return {
      candidate: {
        ...common,
        entrant_kind: "product",
        intake_metadata: {
          intended_endpoint: entrant.intendedEndpoint.trim(),
          platform_owner: entrant.platformOwner.trim(),
          runtime_owner: entrant.runtimeOwner.trim(),
          security_owner: entrant.securityOwner.trim(),
          source_owners: entrant.sourceOwners.filter(present).map(trim),
          validation_behavior: validationBehavior,
        },
      },
      kind: "workspace_entrant",
    };
  }
  return {
    candidate: {
      ...common,
      entrant_kind: "component",
      intake_metadata: {
        component_class: entrant.componentClass.trim(),
        owner_repo: entrant.ownerRepo.trim(),
        product: present(entrant.product) ? entrant.product.trim() : null,
        security_owner: entrant.securityOwner.trim(),
        validation_behavior: validationBehavior,
      },
    },
    kind: "workspace_entrant",
  };
}

function present(value: string) {
  return value.trim().length > 0;
}

function trim(value: string) {
  return value.trim();
}
