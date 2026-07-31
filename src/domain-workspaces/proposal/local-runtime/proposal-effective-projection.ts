import type { ProposalWorkspaceScenario } from "../read-model/proposal-workspace-read-model.ts";
import type { OperationPacketCustodyProjection } from "../../operation-runtime/operation-runtime-types.ts";
import type { ProposalRepositoryGateResolution } from "../../operation-contracts/proposal-repository-request.ts";
import type { ProposalWorkflowCommandStep } from "../work-model/proposal-workflow-command-model.ts";
import type { ProposalWorkflowApplyPayload } from "../work-model/proposal-workflow-command-model.ts";
import type {
  ProposalRuntimeProjectionSnapshot,
  ProposalWorkflowLocalReceipt,
} from "./proposal-runtime.ts";
import { proposalWorkflowReceiptsForSource } from "./proposal-workflow-receipt-projection.ts";

type ProposalHandoffPacketProjection = Readonly<{
  custody: OperationPacketCustodyProjection;
  packet: Readonly<{
    createdAt: string;
    packetId: string;
    sourceRecordId: string;
    sourceVersion: string;
    targetDomain: string;
  }>;
}>;

type ProposalDispositionRoutePayload = NonNullable<
  Extract<ProposalWorkflowApplyPayload, { step: "disposition" }>["route"]
>;

export type ProposalEffectiveProjection = Readonly<{
  records: ProposalWorkspaceScenario[];
  workflowReceiptsByProposal: Record<string, ProposalWorkflowLocalReceipt[]>;
}>;

type ProposalEffectiveProjectionInput = {
  handoffPacketProjections?: readonly ProposalHandoffPacketProjection[];
  repositoryGateResolutions: Record<string, ProposalRepositoryGateResolution>;
  runtimeProjection: ProposalRuntimeProjectionSnapshot;
  sourceRecords: ProposalWorkspaceScenario[];
};

export function projectProposalEffectiveProjection({
  handoffPacketProjections = [],
  repositoryGateResolutions,
  runtimeProjection,
  sourceRecords,
}: ProposalEffectiveProjectionInput): ProposalEffectiveProjection {
  const capturedIds = new Set(
    runtimeProjection.capturedProposals.map((proposal) => proposal.id),
  );
  const sourceProposals = [
    ...runtimeProjection.capturedProposals,
    ...sourceRecords.filter((proposal) => !capturedIds.has(proposal.id)),
  ];
  const workflowReceiptsByProposal = Object.fromEntries(
    sourceProposals.map((proposal) => [
      proposal.id,
      proposalWorkflowReceiptsForSource(
        proposal,
        runtimeProjection.workflowReceipts[proposal.id] ?? [],
      ),
    ]),
  );
  const records = sourceProposals.map((proposal) =>
    projectProposalEffectiveRecord({
      handoffPacketProjections,
      proposal,
      repositoryGateResolution: repositoryGateResolutions[proposal.id] ?? null,
      workflowReceipts: workflowReceiptsByProposal[proposal.id] ?? [],
    }),
  );

  return { records, workflowReceiptsByProposal };
}

export function projectProposalEffectiveRecords(
  input: ProposalEffectiveProjectionInput,
): ProposalWorkspaceScenario[] {
  return projectProposalEffectiveProjection(input).records;
}

export function projectProposalEffectiveRecord({
  handoffPacketProjections,
  proposal,
  repositoryGateResolution,
  workflowReceipts,
}: {
  handoffPacketProjections: readonly ProposalHandoffPacketProjection[];
  proposal: ProposalWorkspaceScenario;
  repositoryGateResolution: ProposalRepositoryGateResolution | null;
  workflowReceipts: ProposalWorkflowLocalReceipt[];
}): ProposalWorkspaceScenario {
  const effectiveWorkflowReceipts = proposalWorkflowReceiptsForSource(
    proposal,
    workflowReceipts,
  );
  const dispositionReceipt = latestMatchingReceipt(
    proposal,
    effectiveWorkflowReceipts,
    "disposition",
  );
  const handoffReceipt = latestMatchingReceipt(
    proposal,
    effectiveWorkflowReceipts,
    "handoff",
  );
  const matchingRepositoryGateResolution = repositoryResolutionMatchesSource(
    proposal,
    repositoryGateResolution,
  )
    ? repositoryGateResolution
    : null;
  let projected = projectRepositoryResolution(
    proposal,
    matchingRepositoryGateResolution,
  );

  if (dispositionReceipt?.payload.step === "disposition") {
    const { decision, route } = dispositionReceipt.payload;

    if (decision.outcome === "rejected") {
      projected = { ...projected, status: "done", tone: "muted" };
    } else if (
      decision.outcome === "parked" ||
      route?.routeTarget === "Parked"
    ) {
      projected = { ...projected, status: "parked", tone: "muted" };
    } else if (route) {
      projected = projectDispositionRoute(
        projected,
        route,
        matchingRepositoryGateResolution,
      );
    }
  }

  if (
    handoffReceipt?.payload.step === "handoff" &&
    handoffReceipt.payload.result === "ready"
  ) {
    const handoffPacketProjection = latestMatchingHandoffPacketProjection(
      projected,
      handoffPacketProjections,
    );
    const handoffCustody = handoffPacketProjection?.custody ?? null;
    projected =
      handoffCustody?.state === "admitted"
        ? { ...projected, status: "done", tone: "ok" }
        : {
            ...projected,
            status: "ready-to-route",
            tone:
              handoffCustody?.state === "rejected" ||
              handoffCustody?.state === "returned"
                ? "danger"
                : "warn",
          };
  }

  return projected;
}

export function proposalEffectiveRepositoryGateResolution(
  proposal: ProposalWorkspaceScenario,
  resolution: ProposalRepositoryGateResolution | null,
) {
  if (
    !resolution ||
    !repositoryResolutionMatchesSource(proposal, resolution) ||
    proposal.repoGate.state !== "clear" ||
    proposal.repoGate.ref !== resolution.resolvedRepoRef
  ) {
    return null;
  }

  return resolution;
}

function latestMatchingReceipt(
  proposal: ProposalWorkspaceScenario,
  receipts: ProposalWorkflowLocalReceipt[],
  step: ProposalWorkflowCommandStep,
) {
  for (let index = receipts.length - 1; index >= 0; index -= 1) {
    const receipt = receipts[index];

    if (
      receipt?.step === step &&
      receipt.sourceBackendRecordId === proposal.backendRecordId &&
      receipt.sourceRecordVersion === proposal.recordVersion
    ) {
      return receipt;
    }
  }

  return null;
}

function projectDispositionRoute(
  proposal: ProposalWorkspaceScenario,
  route: ProposalDispositionRoutePayload,
  repositoryGateResolution: ProposalRepositoryGateResolution | null,
): ProposalWorkspaceScenario {
  if (route.routeTarget === "Parked") {
    return { ...proposal, status: "parked", tone: "muted" };
  }

  const resolutionMatches = repositoryResolutionMatchesRoute(
    repositoryGateResolution,
    route.repoRef,
  );
  const repositoryRequired = route.repoMode !== "not-required";
  const repositoryClear =
    !repositoryRequired ||
    (route.repoMode === "existing" &&
      Boolean(route.repoOwner.trim() && route.repoRef.trim())) ||
    resolutionMatches;

  return {
    ...proposal,
    repoGate: repositoryRequired
      ? {
          detail: repositoryClear
            ? "Repository custody is resolved for the selected route."
            : "Repository custody must be resolved before handoff.",
          mode: route.repoMode,
          owner: resolutionMatches
            ? (repositoryGateResolution?.resolvedOwner ?? route.repoOwner)
            : route.repoOwner || null,
          ref: resolutionMatches
            ? (repositoryGateResolution?.resolvedRepoRef ?? route.repoRef)
            : route.repoRef || null,
          state: repositoryClear ? "clear" : "blocked",
        }
      : {
          detail: "The selected route does not require repository custody.",
          mode: "not-required",
          owner: null,
          ref: null,
          state: "not-required",
        },
    routeTarget: route.routeTarget,
    status: repositoryClear ? "ready-to-route" : "waiting-on-repository",
    tone: "warn",
  };
}

function projectRepositoryResolution(
  proposal: ProposalWorkspaceScenario,
  resolution: ProposalRepositoryGateResolution | null,
): ProposalWorkspaceScenario {
  if (
    !resolution ||
    proposal.repoGate.state !== "blocked" ||
    !repositoryResolutionMatchesRoute(resolution, proposal.repoGate.ref ?? "")
  ) {
    return proposal;
  }

  return {
    ...proposal,
    repoGate: {
      ...proposal.repoGate,
      detail: "Repository custody is resolved for the selected route.",
      owner: resolution.resolvedOwner,
      ref: resolution.resolvedRepoRef,
      state: "clear",
    },
    status:
      proposal.status === "waiting-on-repository"
        ? "ready-to-route"
        : proposal.status,
    tone: proposal.status === "waiting-on-repository" ? "warn" : proposal.tone,
  };
}

function repositoryResolutionMatchesRoute(
  resolution: ProposalRepositoryGateResolution | null,
  repoRequestRef: string,
) {
  return Boolean(
    resolution?.result === "resolved" &&
    resolution.repoRequestRef === repoRequestRef,
  );
}

function repositoryResolutionMatchesSource(
  proposal: ProposalWorkspaceScenario,
  resolution: ProposalRepositoryGateResolution | null,
) {
  return Boolean(
    resolution?.result === "resolved" &&
    resolution.proposalId === proposal.id &&
    resolution.sourceVersion === proposal.recordVersion,
  );
}

function latestMatchingHandoffPacketProjection(
  proposal: ProposalWorkspaceScenario,
  projections: readonly ProposalHandoffPacketProjection[],
) {
  const targetDomain =
    proposal.routeTarget === "Delivery"
      ? "delivery"
      : proposal.routeTarget === "Prototype"
        ? "prototype"
        : null;

  if (!targetDomain) {
    return null;
  }

  return projections.reduce<ProposalHandoffPacketProjection | null>(
    (latest, projection) => {
      if (
        projection.packet.sourceRecordId !== proposal.backendRecordId ||
        projection.packet.sourceVersion !== proposal.recordVersion ||
        projection.packet.targetDomain !== targetDomain ||
        projection.custody.packetId !== projection.packet.packetId
      ) {
        return latest;
      }

      if (
        !latest ||
        projection.custody.recordedAt > latest.custody.recordedAt ||
        (projection.custody.recordedAt === latest.custody.recordedAt &&
          projection.packet.packetId > latest.packet.packetId)
      ) {
        return projection;
      }

      return latest;
    },
    null,
  );
}
