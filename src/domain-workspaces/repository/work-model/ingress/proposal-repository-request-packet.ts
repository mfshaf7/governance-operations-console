import { assertOperationPacketCustody } from "../../../operation-runtime/operation-packet-invariants.ts";
import type {
  ProposalRepositoryGateResolution,
  ProposalRepositoryRequestPacketProjection,
} from "../../../operation-contracts/proposal-repository-request.ts";

import type {
  RepositoryWorkspacePostureGroup,
  RepositoryWorkspacePostureItem,
  RepositoryWorkspacePostureItemState,
  RepositoryWorkspaceRecord,
  RepositoryWorkspaceRecordTone,
} from "../../domain/repository-types.ts";

export function repositoryRecordFromProposalRequestPacket(
  projection: ProposalRepositoryRequestPacketProjection,
  repositoryGateResolutions: ReadonlyMap<
    string,
    ProposalRepositoryGateResolution
  >,
): RepositoryWorkspaceRecord {
  const { custody, packet } = projection;
  assertOperationPacketCustody({ custody, packet });

  if (packet.targetDomain !== "repository") {
    throw new Error(
      `Repository ingress cannot project packet ${packet.packetId} for ${packet.targetDomain}.`,
    );
  }

  const payload = packet.payload;
  const resolution = matchingProposalRepositoryGateResolution(
    projection,
    repositoryGateResolutions.get(payload.proposalId) ?? null,
  );
  const custodyBlocked =
    custody.state === "rejected" || custody.state === "returned";
  const resolved = Boolean(resolution) && !custodyBlocked;
  const name = repositoryRequestNameFromRef(
    payload.repoRef,
    payload.proposalTitle,
  );
  const resolvedOwner =
    resolution?.resolvedOwner ??
    payload.repoGateOwner ??
    "pending repository operation";
  const resolvedRepoRef = resolution?.resolvedRepoRef ?? payload.repoRef;

  return {
    blockers: resolved
      ? []
      : [
          {
            action: custodyBlocked
              ? "Return the rejected packet to Proposal and prepare a corrected repository request."
              : "Resolve the Proposal repository gate to an existing owner repo or complete the approved repository-operation path before admission review.",
            detail: custodyBlocked
              ? `Repository packet custody is ${custody.state}.`
              : payload.repoGateDetail ||
                "Proposal route requires a new repository before handoff can proceed.",
            id: custodyBlocked
              ? "repository-packet-custody"
              : "proposal-repository-gate",
            label: custodyBlocked
              ? "Repository packet custody"
              : "Proposal repository gate",
            owner: custodyBlocked ? packet.sourceOwner : "Repository Operation",
            severity: "blocked",
            sourceRef: packet.packetId,
          },
        ],
    boundary:
      payload.rationale.trim() ||
      `Repository request projected from Proposal ${payload.proposalId}.`,
    admissionPosture: proposalRepositoryAdmissionPosture({
      appliedAt: payload.appliedAt,
      proposalId: payload.proposalId,
      proposalTitle: payload.proposalTitle,
      repoGateDetail: payload.repoGateDetail,
      repoRef: payload.repoRef,
      resolved,
      resolvedOwner,
      resolvedRepoRef,
      resolutionRecordedAt: resolution?.recordedAt,
      routeSource: payload.routeSource,
      sourceLabel: payload.sourceLabel,
      sourceVersion: packet.sourceVersion,
    }),
    admissionState: resolved ? "ready" : "blocked",
    githubUrl: resolvedRepoRef,
    id: `repo-proposal-${slugForId(payload.proposalId)}`,
    lastValidation: resolved
      ? `repository gate resolution / ${resolution?.recordedAt}`
      : `${payload.sourceLabel} / ${custody.recordedAt}`,
    lifecycle: "proposed",
    name,
    nextAction: resolved
      ? "Repository gate is resolved. Proposal handoff can proceed while repository admission remains a separate control."
      : custodyBlocked
        ? "Return the packet to Proposal before Repository admission review."
        : "Keep handoff locked until the Proposal repository gate resolves to an owner repo or approved repository-operation path.",
    owner: resolvedOwner,
    proposalGate: {
      proposalId: payload.proposalId,
      repoRequestRef: payload.repoRef,
      resolvedAt: resolution?.recordedAt,
      resolvedOwner: resolution?.resolvedOwner,
      resolvedRepoRef: resolution?.resolvedRepoRef,
      sourceVersion: packet.sourceVersion,
      status: resolved ? "resolved" : "pending",
    },
    purpose: `${payload.proposalTitle}. ${payload.bodyPreview}`,
    repoClass: `${payload.routeTarget.toLowerCase()}-repository`,
    role: `${payload.routeTarget.toLowerCase()}-repository`,
    routeSource: payload.routeSource,
    runtimeLane: {
      decision: "pending",
      detail: resolved
        ? "Runtime lane decision belongs to admission review after the repository gate is resolved."
        : "Runtime lane cannot be decided while the Proposal repository gate is unresolved.",
      status: resolved ? "decision-needed" : "blocked-by-proposal-gate",
      tone: resolved ? "warn" : "danger",
    },
    securityBinding: {
      detail:
        "Security binding is evaluated during repository admission when the route, data class, and runtime lane are known.",
      required: false,
      status: resolved ? "review-trigger-check-needed" : "not-evaluated",
      subject: false,
      tone: resolved ? "warn" : "muted",
    },
    tone: resolved ? "ok" : "danger",
  };
}

function matchingProposalRepositoryGateResolution(
  projection: ProposalRepositoryRequestPacketProjection,
  resolution: ProposalRepositoryGateResolution | null,
) {
  const { packet } = projection;

  if (
    !resolution ||
    resolution.result !== "resolved" ||
    resolution.proposalId !== packet.payload.proposalId ||
    resolution.repoRequestRef !== packet.payload.repoRef ||
    resolution.sourceVersion !== packet.sourceVersion
  ) {
    return null;
  }

  return resolution;
}

function proposalRepositoryAdmissionPosture({
  appliedAt,
  proposalId,
  proposalTitle,
  repoGateDetail,
  repoRef,
  resolved,
  resolvedOwner,
  resolvedRepoRef,
  resolutionRecordedAt,
  routeSource,
  sourceLabel,
  sourceVersion,
}: {
  appliedAt: string;
  proposalId: string;
  proposalTitle: string;
  repoGateDetail: string;
  repoRef: string;
  resolved: boolean;
  resolvedOwner: string;
  resolvedRepoRef: string;
  resolutionRecordedAt?: string;
  routeSource: string;
  sourceLabel: string;
  sourceVersion: string;
}): RepositoryWorkspacePostureGroup[] {
  return [
    {
      description: resolved
        ? `Repository gate resolution was recorded at ${resolutionRecordedAt}.`
        : "Proposal handoff is blocked until the repository gate is resolved.",
      id: "proposal-gate",
      items: [
        postureItem(
          "Proposal",
          proposalId,
          `${proposalTitle} requires repository handling before handoff.`,
          "clear",
          "info",
        ),
        postureItem(
          "Gate",
          resolved ? "resolved" : "blocked",
          repoGateDetail ||
            "Repository gate handling is required by Disposition.",
          resolved ? "clear" : "blocked",
          resolved ? "ok" : "danger",
        ),
        postureItem(
          "Source",
          sourceLabel,
          `${routeSource} / ${appliedAt} / ${sourceVersion}`,
          resolved ? "clear" : "review",
          resolved ? "ok" : "warn",
        ),
      ],
      kicker: "Proposal",
      title: "Proposal Repository Gate",
      tone: resolved ? "ok" : "danger",
    },
    {
      description: resolved
        ? "Owner and repository reference are selected for admission review."
        : "Owner and repository reference are still missing.",
      id: "repository-resolution",
      items: [
        postureItem(
          "Request ref",
          repoRef,
          "Repository request reference from the proposal route decision.",
          "clear",
          "info",
        ),
        postureItem(
          "Owner",
          resolved ? resolvedOwner : "pending",
          resolved
            ? "Resolved owner can carry the repository admission record."
            : "Repository owner must be selected before admission review.",
          resolved ? "clear" : "pending",
          resolved ? "ok" : "warn",
        ),
        postureItem(
          "Repository ref",
          resolved ? resolvedRepoRef : "pending",
          resolved
            ? "Resolved repository reference is available to the proposal handoff gate."
            : "Repository reference must be selected before admission review.",
          resolved ? "clear" : "pending",
          resolved ? "ok" : "danger",
        ),
      ],
      kicker: "Repository",
      title: "Repository Resolution",
      tone: resolved ? "ok" : "warn",
    },
    {
      description:
        "Repository Control records only the repo admission posture; dev-integration and stage admission are separate controls.",
      id: "admission-boundary",
      items: [
        postureItem(
          "Admission",
          resolved ? "ready" : "blocked",
          resolved
            ? "Repository admission can be reviewed from the resolved gate."
            : "Admission review is locked by the unresolved proposal gate.",
          resolved ? "ready" : "blocked",
          resolved ? "warn" : "danger",
        ),
        postureItem(
          "Runtime lane",
          "separate",
          "Dev-integration profile or stage admission is decided outside Repository Control.",
          "external",
          "muted",
        ),
        postureItem(
          "Security binding",
          "separate",
          "Security review trigger checks happen during admission review when route and runtime posture are known.",
          "external",
          "muted",
        ),
      ],
      kicker: "Boundary",
      title: "Admission Boundary",
      tone: resolved ? "warn" : "danger",
    },
  ];
}

function postureItem(
  label: string,
  value: string,
  detail: string,
  state: RepositoryWorkspacePostureItemState,
  tone: RepositoryWorkspaceRecordTone,
): RepositoryWorkspacePostureItem {
  return {
    detail,
    label,
    state,
    tone,
    value,
  };
}

function repositoryRequestNameFromRef(repoRef: string, fallback: string) {
  const refName = repoRef.replace(/^repo-request:\/\//, "").trim();
  return refName || fallback;
}

function slugForId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
