import {
  proposalDecisionOutcomeCopy,
  proposalRouteSelectionRepoLabel,
  type ProposalDecisionDraft,
  type ProposalRouteSelectionDraft,
} from "../../work-model/proposal-disposition-model.ts";
import {
  proposalHandoffResultCopy,
  type ProposalHandoffDraft,
} from "../../work-model/proposal-handoff-model.ts";
import type { ProposalWorkspaceScenario } from "../../read-model/proposal-workspace-read-model.ts";
import type { ProposalRepositoryGateResolution } from "../../../operation-integrations/proposal-repository-request-projection.ts";
import {
  proposalIngressLabel,
  proposalRepoGateLabel,
  proposalStatusPillLabel,
} from "../shared/proposal-display-model.ts";
import { proposalRequiredMove as proposalHubCurrentMove } from "../../read-model/proposal-required-move.ts";
import { proposalRouteSelectionProjectionTone } from "./proposal-hub-route-projection.ts";
import type { ProposalHubProjection } from "./proposal-hub-types.ts";

export function proposalHubStatusProjection({
  decisionApplied,
  decisionDraft,
  handoffApplied,
  handoffDraft,
  proposal,
  repositoryGateResolution,
  routeSelectionApplied,
  routeSelectionDraft,
  sourceReviewRequired,
  triageApplied,
}: {
  decisionApplied: boolean;
  decisionDraft: ProposalDecisionDraft | null;
  handoffApplied: boolean;
  handoffDraft: ProposalHandoffDraft | null;
  proposal: ProposalWorkspaceScenario;
  repositoryGateResolution?: ProposalRepositoryGateResolution | null;
  routeSelectionApplied: boolean;
  routeSelectionDraft: ProposalRouteSelectionDraft | null;
  sourceReviewRequired: boolean;
  triageApplied: boolean;
}): ProposalHubProjection["status"] {
  const baseFacts = [
    { label: "Ingress", value: proposalIngressLabel(proposal.ingress) },
    {
      label: "Repo Gate",
      value: repositoryGateResolution
        ? `Resolved / ${repositoryGateResolution.resolvedRepoRef}`
        : proposalRepoGateLabel(proposal),
    },
    { label: "Record Ref", value: proposal.backendRecordId },
    { label: "Updated", value: proposal.lastProjectionUpdate },
  ];

  if (sourceReviewRequired) {
    return {
      description:
        "The source proposal needs review before workflow decisions can continue.",
      facts: [
        { label: "Read State", value: proposal.projectionState },
        { label: "Version", value: proposal.recordVersion },
        ...baseFacts,
      ],
      pillLabel: "Source",
      title: "Source Review Required",
      tone: "warn",
    };
  }

  if (handoffApplied && handoffDraft) {
    const handoffCopy = proposalHandoffResultCopy(handoffDraft.result);

    return {
      description:
        "Handoff review is recorded in the console. The source proposal remains unchanged.",
      facts: [
        {
          label: "Receipt",
          value: handoffDraft.appliedReceiptId ?? "Prototype-local receipt",
        },
        { label: "Recorded", value: handoffDraft.appliedAt ?? "Recorded" },
        { label: "Result", value: handoffCopy.handoff },
        ...baseFacts,
      ],
      pillLabel: handoffDraft.result === "ready" ? "Recorded" : "Blocked",
      title:
        handoffDraft.result === "ready"
          ? "Handoff Review Recorded"
          : "Handoff Block Recorded",
      tone: handoffCopy.tone,
    };
  }

  if (routeSelectionApplied && routeSelectionDraft) {
    const routeSelectionTone = proposalRouteSelectionProjectionTone(
      routeSelectionDraft,
      repositoryGateResolution,
    );

    return {
      description: repositoryGateResolution
        ? "Disposition and repository gate are recorded. Handoff review remains the next step."
        : "Disposition is recorded. Handoff review remains the next step.",
      facts: [
        {
          label: "Outcome",
          value: decisionDraft
            ? proposalDecisionOutcomeCopy(decisionDraft.outcome).label
            : "accepted",
        },
        { label: "Route", value: routeSelectionDraft.routeTarget },
        {
          label: "Repo Gate",
          value: repositoryGateResolution
            ? `Resolved / ${repositoryGateResolution.resolvedRepoRef}`
            : proposalRouteSelectionRepoLabel(routeSelectionDraft),
        },
        ...baseFacts,
      ],
      pillLabel: "Disposition",
      title: "Disposition Recorded",
      tone: routeSelectionTone,
    };
  }

  if (decisionApplied && decisionDraft) {
    const decisionCopy = proposalDecisionOutcomeCopy(decisionDraft.outcome);
    const acceptedWithoutRoute = decisionDraft.outcome === "accepted";

    return {
      description: acceptedWithoutRoute
        ? "Acceptance is recorded. Route target and repository handling still need completion before Handoff."
        : "Disposition is recorded. Handoff stays closed for this outcome.",
      facts: [{ label: "Outcome", value: decisionCopy.label }, ...baseFacts],
      pillLabel: acceptedWithoutRoute ? "Route Needed" : decisionCopy.label,
      title: acceptedWithoutRoute
        ? "Disposition Needs Route"
        : `${decisionCopy.title} Recorded`,
      tone: acceptedWithoutRoute ? "warn" : decisionCopy.tone,
    };
  }

  if (triageApplied) {
    return {
      description: "Triage is recorded. Disposition is the next workflow step.",
      facts: [{ label: "Triage", value: "Recorded" }, ...baseFacts],
      pillLabel: "Triage",
      title: "Triage Recorded",
      tone: "ok",
    };
  }

  if (repositoryGateResolution && proposal.status === "waiting-on-repository") {
    return {
      description: "Repository gate is resolved. Handoff review can proceed.",
      facts: [
        { label: "Receipt", value: repositoryGateResolution.receiptId },
        {
          label: "Resolved Repo",
          value: repositoryGateResolution.resolvedRepoRef,
        },
        { label: "Owner", value: repositoryGateResolution.resolvedOwner },
        ...baseFacts,
      ],
      pillLabel: "Resolved",
      title: "Repository Gate Resolved",
      tone: "ok",
    };
  }

  return {
    description: proposal.handoffRule,
    facts: baseFacts,
    pillLabel: proposalStatusPillLabel(proposal),
    title: proposalHubCurrentMove(proposal).statusTitle,
    tone: proposal.tone,
  };
}
