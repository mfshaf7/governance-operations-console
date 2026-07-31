import type {
  WorkspaceActiveInventoryDependencies,
  WorkspaceActiveInventoryRecord,
  WorkspaceEntrantPromotionCommand,
} from "./active-inventory.ts";
import type {
  WorkspaceEntrantCandidate,
  WorkspaceValidationBehavior,
} from "./entrant.ts";
import { workspaceEntrantCollection } from "./entrant.ts";
import type {
  WorkspaceEntrantClassificationCommand,
  WorkspaceIntakeContractRecord,
} from "./intake.ts";

export function workspaceEntrantCandidateBlockers(
  candidate: WorkspaceEntrantCandidate,
) {
  const blockers: string[] = [];

  if (
    [
      candidate.candidateRef,
      candidate.candidateVersion,
      candidate.canonicalKey,
      candidate.correlationRef,
      candidate.name,
      candidate.sourceOwnerRef,
    ].some((value) => !present(value)) ||
    !validRefs(candidate.evidenceRefs)
  ) {
    blockers.push(
      "Workspace entrant requires bounded identity, source ownership, correlation, and evidence.",
    );
  }

  switch (candidate.entrantKind) {
    case "repository":
      if (
        !present(candidate.intakeMetadata.repoClass) ||
        (candidate.intakeMetadata.requiresSecurityBindings &&
          !present(candidate.intakeMetadata.securityOwner ?? ""))
      ) {
        blockers.push(
          "Repository entrant requires class and any applicable security owner.",
        );
      }
      break;
    case "product":
      if (
        [
          candidate.intakeMetadata.intendedEndpoint,
          candidate.intakeMetadata.platformOwner,
          candidate.intakeMetadata.runtimeOwner,
          candidate.intakeMetadata.securityOwner,
        ].some((value) => !present(value)) ||
        !validRefs(candidate.intakeMetadata.sourceOwners)
      ) {
        blockers.push(
          "Product entrant requires platform, runtime, security, source-owner, and intended-endpoint truth.",
        );
      }
      break;
    case "component":
      if (
        [
          candidate.intakeMetadata.componentClass,
          candidate.intakeMetadata.ownerRepo,
          candidate.intakeMetadata.securityOwner,
        ].some((value) => !present(value))
      ) {
        blockers.push(
          "Component entrant requires class, owner repository, and security owner.",
        );
      }
      break;
  }

  blockers.push(
    ...workspaceValidationBehaviorBlockers(
      candidate.intakeMetadata.validationBehavior,
    ),
  );

  return unique(blockers);
}

export function workspaceClassificationCommandBlockers(
  command: WorkspaceEntrantClassificationCommand,
) {
  const blockers = workspaceEntrantCandidateBlockers(command.candidate);

  if (
    [
      command.decidedAt,
      command.expectedIntakeRegisterVersion,
      command.idempotencyKey,
      command.operatorRef,
      command.rationale,
      command.requestId,
    ].some((value) => !present(value))
  ) {
    blockers.push(
      "Workspace classification requires source version, operator, rationale, request, and idempotency truth.",
    );
  }

  if (
    command.decisionSource === "ai-suggested" &&
    !validAiSuggestion(command)
  ) {
    blockers.push(
      "AI-suggested classification requires accepted governed-profile evidence and an explicit matching operator decision.",
    );
  }

  return unique(blockers);
}

export function workspaceIntakeRecordForClassification(
  command: WorkspaceEntrantClassificationCommand,
): WorkspaceIntakeContractRecord {
  const common = {
    ...(command.decisionSource === "ai-suggested"
      ? { aiSuggestion: structuredClone(command.aiSuggestion) }
      : {}),
    decisionSource: command.decisionSource,
    notes: command.rationale.trim(),
    status: command.decision,
  };
  const outOfScope = command.decision === "out-of-scope";

  switch (command.candidate.entrantKind) {
    case "repository":
      return {
        id: command.candidate.canonicalKey,
        kind: "repository",
        value: {
          ...common,
          repoClass: outOfScope
            ? null
            : command.candidate.intakeMetadata.repoClass,
          requiresSecurityBindings: outOfScope
            ? null
            : command.candidate.intakeMetadata.requiresSecurityBindings,
          securityOwner: outOfScope
            ? null
            : command.candidate.intakeMetadata.securityOwner,
          ...(outOfScope
            ? {}
            : {
                validationBehavior: structuredClone(
                  command.candidate.intakeMetadata.validationBehavior,
                ),
              }),
        },
      };
    case "product":
      return {
        id: command.candidate.canonicalKey,
        kind: "product",
        value: {
          ...common,
          intendedEndpoint: outOfScope
            ? null
            : command.candidate.intakeMetadata.intendedEndpoint,
          platformOwner: outOfScope
            ? null
            : command.candidate.intakeMetadata.platformOwner,
          runtimeOwner: outOfScope
            ? null
            : command.candidate.intakeMetadata.runtimeOwner,
          securityOwner: outOfScope
            ? null
            : command.candidate.intakeMetadata.securityOwner,
          sourceOwners: outOfScope
            ? []
            : [...command.candidate.intakeMetadata.sourceOwners],
          ...(outOfScope
            ? {}
            : {
                validationBehavior: structuredClone(
                  command.candidate.intakeMetadata.validationBehavior,
                ),
              }),
        },
      };
    case "component":
      return {
        id: command.candidate.canonicalKey,
        kind: "component",
        value: {
          ...common,
          componentClass: outOfScope
            ? null
            : command.candidate.intakeMetadata.componentClass,
          ownerRepo: outOfScope
            ? null
            : command.candidate.intakeMetadata.ownerRepo,
          product: outOfScope
            ? null
            : command.candidate.intakeMetadata.product,
          securityOwner: outOfScope
            ? null
            : command.candidate.intakeMetadata.securityOwner,
          ...(outOfScope
            ? {}
            : {
                validationBehavior: structuredClone(
                  command.candidate.intakeMetadata.validationBehavior,
                ),
              }),
        },
      };
  }
}

export function workspacePromotionCommandBlockers({
  command,
  dependencies,
}: {
  command: WorkspaceEntrantPromotionCommand;
  dependencies: WorkspaceActiveInventoryDependencies;
}) {
  const blockers: string[] = [];

  if (
    [
      command.activeRecordDigest,
      command.correlationRef,
      command.decidedAt,
      command.expectedActiveInventoryVersion,
      command.expectedIntakeRegisterVersion,
      command.idempotencyKey,
      command.intakeEntryRef,
      command.intakeEntryVersion,
      command.operatorRef,
      command.requestId,
    ].some((value) => !present(value)) ||
    !validRefs(command.approvalRefs)
  ) {
    blockers.push(
      "Workspace promotion requires frozen intake, active inventory, approval, operator, correlation, and idempotency truth.",
    );
  }

  blockers.push(
    ...workspaceActiveRecordBlockers(command.activeRecord, dependencies),
  );

  return unique(blockers);
}

export function workspaceActiveRecordBlockers(
  activeRecord: WorkspaceActiveInventoryRecord,
  dependencies: WorkspaceActiveInventoryDependencies,
) {
  const blockers: string[] = [];

  if (!present(activeRecord.id)) {
    blockers.push("Workspace active record requires a canonical id.");
  }

  blockers.push(
    ...workspaceValidationBehaviorBlockers(
      activeRecord.value.validationBehavior,
    ),
  );

  switch (activeRecord.kind) {
    case "repository":
      if (
        !present(activeRecord.value.repoClass) ||
        !validRefs(activeRecord.value.owns) ||
        !validRefs(activeRecord.value.mustNotOwn) ||
        !validRefs(activeRecord.value.allowedAuthoritativeRefs)
      ) {
        blockers.push(
          "Active repository requires class, ownership, exclusion, and authority-reference truth.",
        );
      }
      if (
        !refsBelongTo(
          activeRecord.value.allowedAuthoritativeRefs,
          dependencies.activeRepositoryIds,
        )
      ) {
        blockers.push(
          "Active repository references an authority outside active repository inventory.",
        );
      }
      break;
    case "product": {
      const repositoryRefs = [
        activeRecord.value.platformOwner,
        activeRecord.value.runtimeOwner,
        activeRecord.value.securityOwner,
        ...activeRecord.value.sourceOwners,
      ];

      if (
        !present(activeRecord.value.highestRealEndpoint) ||
        !validRefs(activeRecord.value.sourceOwners) ||
        !refsBelongTo(repositoryRefs, dependencies.activeRepositoryIds)
      ) {
        blockers.push(
          "Active product requires endpoint and owner references from active repository inventory.",
        );
      }
      break;
    }
    case "component":
      if (
        !present(activeRecord.value.componentClass) ||
        !refsBelongTo(
          [activeRecord.value.ownerRepo, activeRecord.value.securityOwner],
          dependencies.activeRepositoryIds,
        ) ||
        (activeRecord.value.product !== null &&
          !dependencies.activeProductIds.includes(activeRecord.value.product))
      ) {
        blockers.push(
          "Active component requires active owner, security, and optional product references.",
        );
      }
      if (
        activeRecord.value.interfaceContract &&
        (!present(activeRecord.value.interfaceContract.path) ||
          !present(activeRecord.value.interfaceContract.validationCommand))
      ) {
        blockers.push(
          "Active component interface contract requires path and validation command.",
        );
      }
      break;
  }

  return unique(blockers);
}

export function workspaceIntakeEntryRef(candidate: WorkspaceEntrantCandidate) {
  return (
    `workspace-governance://intake/` +
    `${workspaceEntrantCollection(candidate.entrantKind)}/` +
    workspaceContractSlug(candidate.canonicalKey)
  );
}

export function workspaceActiveRecordRef(
  record: WorkspaceActiveInventoryRecord,
) {
  return (
    `workspace-governance://` +
    `${workspaceEntrantCollection(record.kind)}/` +
    workspaceContractSlug(record.id)
  );
}

export function workspaceContractSlug(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    throw new Error("Workspace contract identity cannot be empty.");
  }

  return slug;
}

function workspaceValidationBehaviorBlockers(
  behavior: WorkspaceValidationBehavior,
) {
  return !present(behavior.posture) ||
    !present(behavior.wgcfGraphRole) ||
    !present(behavior.notes) ||
    !validRefs(behavior.catalogRefs)
    ? ["Workspace validation behavior requires posture, graph role, catalog refs, and notes."]
    : [];
}

function validAiSuggestion(
  command: Extract<
    WorkspaceEntrantClassificationCommand,
    { decisionSource: "ai-suggested" }
  >,
) {
  const suggestion = command.aiSuggestion;
  const values = [
    suggestion.acceptedAt,
    suggestion.acceptedBy,
    suggestion.auditRef,
    suggestion.callerId,
    suggestion.decisionId,
    suggestion.generatedAt,
    suggestion.invocationPath,
    suggestion.policyStatus,
    suggestion.profileId,
  ];
  const decisionsMatch = suggestion.operatorDecision === command.decision;
  const accepted =
    suggestion.acceptanceState === "accepted" &&
    suggestion.suggestedDecision === suggestion.operatorDecision;
  const overridden =
    suggestion.acceptanceState === "overridden" &&
    suggestion.suggestedDecision !== suggestion.operatorDecision &&
    present(suggestion.overrideReason ?? "");

  return (
    values.every(present) &&
    decisionsMatch &&
    (accepted || overridden)
  );
}

function refsBelongTo(refs: string[], allowed: string[]) {
  const allowedRefs = new Set(allowed);
  return refs.every((ref) => allowedRefs.has(ref));
}

function validRefs(refs: string[]) {
  return (
    refs.length > 0 &&
    refs.every(present) &&
    new Set(refs).size === refs.length
  );
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function present(value: string) {
  return value.trim().length > 0;
}
