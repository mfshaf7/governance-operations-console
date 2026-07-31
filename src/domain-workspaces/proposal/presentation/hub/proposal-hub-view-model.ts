import type { TerasMetadataItem } from "@/teras";

import {
  proposalDecisionOutcomeCopy,
  type ProposalDecisionDraft,
  type ProposalRouteSelectionDraft,
} from "../../work-model/proposal-disposition-model.ts";
import {
  proposalHandoffResultCopy,
  type ProposalHandoffDraft,
} from "../../work-model/proposal-handoff-model.ts";
import type { ProposalTriageDraft } from "../../work-model/proposal-triage-model.ts";
import { proposalWorkflowProgressSteps } from "../../work-model/proposal-workflow-step-model.ts";
import { proposalWorkflowSourceReviewRequired } from "../../work-model/proposal-source-projection-model.ts";
import { proposalRequiredMove } from "../../read-model/proposal-required-move.ts";
import type { ProposalWorkspaceScenario } from "../../read-model/proposal-workspace-read-model.ts";
import type { ProposalRepositoryGateResolution } from "../../../operation-integrations/proposal-repository-request-projection.ts";
import { proposalHubHistory } from "./proposal-hub-history-model.ts";
import { proposalRouteSelectionProjectionTone } from "./proposal-hub-route-projection.ts";
import { proposalHubStatusProjection } from "./proposal-hub-status-model.ts";
import type {
  ProposalHubMove,
  ProposalHubProjection,
} from "./proposal-hub-types.ts";

export type {
  ProposalHubActionTarget,
  ProposalHubMove,
  ProposalHubProjection,
} from "./proposal-hub-types.ts";
export { proposalRequiredMove as proposalHubCurrentMove } from "../../read-model/proposal-required-move.ts";

export function proposalHubSelectedMetadata(
  proposal: ProposalWorkspaceScenario,
): TerasMetadataItem[] {
  return [
    { label: "Proposal", value: proposal.id },
    { label: "Owner", value: proposal.owner },
    { label: "Route", value: proposal.routeTarget },
    {
      label: "Version",
      value: `${proposal.projectionState} / ${proposal.recordVersion}`,
    },
  ];
}

export function proposalHubProjection(
  proposal: ProposalWorkspaceScenario,
  triageDraft: ProposalTriageDraft | null,
  decisionDraft: ProposalDecisionDraft | null,
  routeSelectionDraft: ProposalRouteSelectionDraft | null,
  handoffDraft: ProposalHandoffDraft | null,
  repositoryGateResolution?: ProposalRepositoryGateResolution | null,
): ProposalHubProjection {
  const baseMove = proposalRequiredMove(proposal);
  const sourceReviewRequired = proposalWorkflowSourceReviewRequired(proposal, [
    triageDraft,
    decisionDraft,
    routeSelectionDraft,
    handoffDraft,
  ]);
  const triageApplied = Boolean(triageDraft?.appliedAt);
  const triageSavedOnly = Boolean(
    triageDraft?.savedAt && !triageDraft.appliedAt,
  );
  const decisionApplied = Boolean(decisionDraft?.appliedAt);
  const decisionSavedOnly = Boolean(
    decisionDraft?.savedAt && !decisionDraft.appliedAt,
  );
  const routeSelectionApplied = Boolean(routeSelectionDraft?.appliedAt);
  const routeSelectionSavedOnly = Boolean(
    routeSelectionDraft?.savedAt && !routeSelectionDraft.appliedAt,
  );
  const handoffApplied = Boolean(handoffDraft?.appliedAt);
  const handoffSavedOnly = Boolean(
    handoffDraft?.savedAt && !handoffDraft.appliedAt,
  );
  let currentMove: ProposalHubMove = baseMove;
  let progressDescription =
    "Open the next available workflow step. The source proposal stays unchanged in this preview.";

  if (sourceReviewRequired) {
    progressDescription =
      "The source proposal needs review before this workflow can continue.";
    currentMove = {
      buttonLabel: "Review Source",
      description:
        "Review the proposal source before recording or continuing workflow decisions.",
      statusTitle: "Source Review Required",
      target: "triage",
      title: "Review Source Record",
      tone: "warn",
    };
  } else if (handoffDraft) {
    const handoffCopy = proposalHandoffResultCopy(handoffDraft.result);
    progressDescription =
      "Progress includes console-recorded workflow decisions.";

    if (handoffSavedOnly) {
      currentMove = {
        buttonLabel: "Resume Handoff",
        description: "Review or apply the saved local handoff draft.",
        statusTitle: baseMove.statusTitle,
        target: "handoff",
        title: "Resume Handoff Draft",
        tone: handoffCopy.tone,
      };
    } else if (handoffApplied && handoffDraft.result === "ready") {
      currentMove = {
        buttonLabel: "View History",
        description:
          "Handoff review is recorded. Review the read-only history.",
        statusTitle: baseMove.statusTitle,
        target: "history",
        title: "History Current",
        tone: "ok",
      };
    } else if (handoffApplied) {
      currentMove = {
        buttonLabel: "View History",
        description:
          "Handoff block is recorded. Review history before resolving the external gate.",
        statusTitle: baseMove.statusTitle,
        target: "history",
        title: "Handoff Block Recorded",
        tone: handoffCopy.tone,
      };
    }
  } else if (routeSelectionDraft) {
    const routeSelectionTone = proposalRouteSelectionProjectionTone(
      routeSelectionDraft,
      repositoryGateResolution,
    );
    progressDescription =
      "Progress includes console-recorded workflow decisions.";

    if (routeSelectionSavedOnly) {
      currentMove = {
        buttonLabel: "Resume Disposition",
        description: "Review or apply the saved local disposition draft.",
        statusTitle: baseMove.statusTitle,
        target: "disposition",
        title: "Resume Disposition Draft",
        tone: routeSelectionTone,
      };
    } else if (
      routeSelectionApplied &&
      routeSelectionDraft.routeTarget === "Parked"
    ) {
      currentMove = {
        buttonLabel: "Review Disposition",
        description: "Disposition is recorded as parked; Handoff stays locked.",
        statusTitle: baseMove.statusTitle,
        target: "disposition",
        title: "Disposition Parked",
        tone: "muted",
      };
    } else if (routeSelectionApplied) {
      currentMove = {
        buttonLabel: "Open Handoff",
        description: repositoryGateResolution
          ? "Disposition is recorded and the repository gate is resolved. Review Handoff."
          : "Disposition is recorded. Review the selected route and repository handling before Handoff.",
        statusTitle: baseMove.statusTitle,
        target: "handoff",
        title: "Handoff Next",
        tone: routeSelectionTone,
      };
    }
  } else if (decisionDraft) {
    const decisionCopy = proposalDecisionOutcomeCopy(decisionDraft.outcome);
    progressDescription =
      "Progress includes console-recorded workflow decisions.";

    if (decisionSavedOnly) {
      currentMove = {
        buttonLabel: "Resume Disposition",
        description: "Review or apply the saved local disposition draft.",
        statusTitle: baseMove.statusTitle,
        target: "disposition",
        title: "Resume Disposition Draft",
        tone: decisionCopy.tone,
      };
    } else if (decisionApplied && decisionDraft.outcome === "accepted") {
      currentMove = {
        buttonLabel: "Complete Disposition",
        description:
          "Acceptance is recorded. Complete route target and repository handling before Handoff.",
        statusTitle: baseMove.statusTitle,
        target: "disposition",
        title: "Disposition Needs Route",
        tone: "warn",
      };
    } else if (decisionApplied) {
      currentMove = {
        buttonLabel: "Review Disposition",
        description:
          "Disposition is recorded and Handoff stays closed until the outcome is revised.",
        statusTitle: baseMove.statusTitle,
        target: "disposition",
        title: `${decisionCopy.title} Recorded`,
        tone: decisionCopy.tone,
      };
    }
  } else if (triageDraft) {
    progressDescription =
      "Progress includes console-recorded workflow decisions.";

    if (triageSavedOnly) {
      currentMove = {
        buttonLabel: "Resume Triage",
        description: "Review or apply the saved local triage draft.",
        statusTitle: baseMove.statusTitle,
        target: "triage",
        title: "Resume Triage Draft",
        tone: "warn",
      };
    } else {
      currentMove = {
        buttonLabel: "Open Disposition",
        description:
          "Triage is recorded. Record the proposal outcome, route, and repository handling.",
        statusTitle: baseMove.statusTitle,
        target: "disposition",
        title: "Disposition Next",
        tone: "info",
      };
    }
  }

  const statusProjection = proposalHubStatusProjection({
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
  });

  return {
    currentMove,
    history: proposalHubHistory(),
    progressDescription,
    status: statusProjection,
    steps: proposalWorkflowProgressSteps({
      activeStep: "hub",
      drafts: {
        decisionDraft,
        handoffDraft,
        repositoryGateResolution,
        routeSelectionDraft,
        triageDraft,
      },
      presentation: "hub",
      proposal,
    }),
  };
}
