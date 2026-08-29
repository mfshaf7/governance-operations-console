import type { RepositoryWorkspaceRecord } from "../domain/repository-types.ts";
import type { RepositoryCustodyWorkflowResult } from "./repository-custody-live-types.ts";

export function projectRepositoryProvisioningResults(
  records: readonly RepositoryWorkspaceRecord[],
  resultsByRequestId: Readonly<
    Record<string, RepositoryCustodyWorkflowResult>
  >,
): RepositoryWorkspaceRecord[] {
  const projected = [...records];
  const providerIds = new Set(
    records
      .map((record) => record.providerIdentity?.repositoryId)
      .filter((value): value is string => Boolean(value)),
  );

  for (const result of Object.values(resultsByRequestId)) {
    if (
      result.status !== "succeeded" ||
      result.request.action !== "provision-new" ||
      result.receipt?.custody.after !== "provisioned" ||
      !result.provider_readback ||
      !result.receipt.repository_identity
    ) {
      continue;
    }
    const providerId = result.provider_readback.repository_identity.provider_repository_id;
    if (providerIds.has(providerId)) continue;
    providerIds.add(providerId);
    projected.push(repositoryRecordFromProvisioningResult(result));
  }
  return projected;
}

export function repositoryProvisionedRecordId(
  result: RepositoryCustodyWorkflowResult,
) {
  const providerId = result.provider_readback?.repository_identity.provider_repository_id;
  return providerId ? `repo-provider-${providerId}` : null;
}

export function projectRepositoryCustodyResults(
  records: readonly RepositoryWorkspaceRecord[],
  resultsByRepositoryId: Readonly<
    Record<string, RepositoryCustodyWorkflowResult>
  >,
): RepositoryWorkspaceRecord[] {
  return records.map((record) => {
    const result = resultsByRepositoryId[record.id];
    if (
      result?.status !== "succeeded" ||
      !record.custody ||
      !record.providerIdentity ||
      result.request.target.provider !== record.providerIdentity.provider ||
      result.request.target.provider_repository_id !==
        record.providerIdentity.repositoryId ||
      result.request.requested_custody.workspace_owner_ref !==
        record.custody.workspaceOwnerRef ||
      result.receipt?.custody.after !== "linked"
    ) {
      return record;
    }
    return {
      ...record,
      custody: {
        ...record.custody,
        state: "linked" as const,
      },
      nextAction:
        "Review the authoritative custody receipt and use separate downstream actions when required.",
    };
  });
}

function repositoryRecordFromProvisioningResult(
  result: RepositoryCustodyWorkflowResult,
): RepositoryWorkspaceRecord {
  if (
    result.request.action !== "provision-new" ||
    !result.provider_readback ||
    !result.receipt
  ) {
    throw new Error("Repository provisioning result is not projectable.");
  }
  const request = result.request;
  const readback = result.provider_readback;
  const providerId = readback.repository_identity.provider_repository_id;
  return {
    admissionPosture: [
      {
        description: "OOS retained the exact create decision and provider readback.",
        id: "provisioning",
        items: [
          {
            detail: `GitHub repository ${providerId} matches the approved coordinates.`,
            label: "Provider identity",
            state: "clear",
            tone: "ok",
            value: providerId,
          },
          {
            detail: "README, features, visibility, and merge policy match the approved baseline.",
            label: "Provider settings",
            state: "clear",
            tone: "ok",
            value: "verified",
          },
          {
            detail: "The terminal OOS custody receipt is available for review.",
            label: "Provisioning receipt",
            state: "clear",
            tone: "ok",
            value: result.receipt.receipt_id,
          },
        ],
        kicker: "Provisioning",
        title: "Provider Repository",
        tone: "ok",
      },
      {
        description: "Provisioning does not admit the repository to workspace inventory.",
        id: "admission",
        items: [
          {
            detail: "The custody receipt makes a separate intake request available.",
            label: "Workspace intake",
            state: "ready",
            tone: "warn",
            value: result.receipt.downstream_handoffs.workspace_intake,
          },
          {
            detail: "Active inventory remains a separate governed action.",
            label: "Active inventory",
            state: "pending",
            tone: "warn",
            value: result.receipt.downstream_handoffs.active_inventory,
          },
        ],
        kicker: "Admission",
        title: "Workspace Admission",
        tone: "warn",
      },
    ],
    admissionState: "ready",
    blockers: [],
    boundary: request.provisioning.description ?? "Governed repository source.",
    custody: {
      kind: request.requested_custody.custody_kind,
      state: "provisioned",
      workspaceOwnerRef: request.requested_custody.workspace_owner_ref,
    },
    githubUrl: readback.canonical_url,
    id: `repo-provider-${providerId}`,
    lastValidation: `provider readback / ${readback.observed_at}`,
    lifecycle: "provisioned",
    name: readback.canonical_name,
    nextAction:
      "Review onboarding and prepare the separate Workspace Intake request when this repository should enter active inventory.",
    owner: request.requested_custody.workspace_owner_ref,
    purpose: request.provisioning.description ?? "Governed repository source.",
    providerIdentity: {
      host: "github.com",
      name: readback.canonical_name,
      owner: readback.canonical_owner,
      provider: "github",
      repositoryId: providerId,
    },
    repoClass: "owner-repository",
    role: "source-custody",
    routeSource: "OOS repository provisioning receipt",
    runtimeLane: {
      decision: "pending",
      detail: "Runtime selection remains part of repository admission.",
      status: "decision-needed",
      tone: "warn",
    },
    securityBinding: {
      detail: "Security triggers are evaluated during repository admission.",
      required: false,
      status: "review-trigger-check-needed",
      subject: false,
      tone: "warn",
    },
    tone: "warn",
  };
}
