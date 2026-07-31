import type { OperationTone } from "../../operation-contracts/operation-state.ts";
import type { OperationSourceCustody } from "../../operation-contracts/source-custody.ts";

import type { ProposalWorkspaceScenario } from "../domain/proposal-types.ts";
import type { ProposalWorkflowSourceStampedDraft } from "./proposal-source-projection-model.ts";

export type ProposalDecisionOutcome = "accepted" | "parked" | "rejected";

export type ProposalDecisionDraft = ProposalWorkflowSourceStampedDraft & {
  advisorDraft?: string;
  advisorPrompt?: string;
  notes: string;
  outcome: ProposalDecisionOutcome;
  proposalId: string;
};

export type ProposalRouteSelectionTarget = "Delivery" | "Parked" | "Prototype";
export type ProposalRouteSelectionRepoMode =
  "existing" | "new" | "not-required";

const proposalRouteSelectionTargets = [
  "Delivery",
  "Parked",
  "Prototype",
] as const satisfies readonly ProposalRouteSelectionTarget[];

export type ProposalRouteSelectionDraft = ProposalWorkflowSourceStampedDraft & {
  proposalId: string;
  rationale: string;
  repoMode: ProposalRouteSelectionRepoMode;
  repoOwner: string;
  repoRef: string;
  routeTarget: ProposalRouteSelectionTarget;
};

export function proposalDecisionDraftFromProposal(
  proposal: ProposalWorkspaceScenario,
  draft?: ProposalDecisionDraft | null,
): ProposalDecisionDraft {
  if (draft) {
    return draft;
  }

  return {
    advisorDraft: "",
    advisorPrompt: "",
    notes: "",
    outcome: proposal.status === "parked" ? "parked" : "accepted",
    proposalId: proposal.id,
  };
}

export function proposalDecisionOutcomeCopy(outcome: ProposalDecisionOutcome): {
  label: string;
  title: string;
  tone: OperationTone;
} {
  switch (outcome) {
    case "accepted":
      return { label: "accepted", title: "Accept Proposal", tone: "ok" };
    case "parked":
      return { label: "parked", title: "Park Proposal", tone: "muted" };
    case "rejected":
      return { label: "rejected", title: "Reject Proposal", tone: "danger" };
  }
}

export function proposalRouteSelectionDraftFromProposal(
  proposal: ProposalWorkspaceScenario,
  draft?: ProposalRouteSelectionDraft | null,
): ProposalRouteSelectionDraft {
  if (draft) {
    return draft;
  }

  const repoMode = proposalRouteSelectionRepoModeFromProposal(proposal);

  return {
    proposalId: proposal.id,
    rationale:
      proposal.status === "ready-to-route" ||
      proposal.status === "waiting-on-repository"
        ? proposal.handoffRule
        : "",
    repoMode,
    repoOwner:
      proposal.repoGate.owner ??
      (repoMode === "new" ? "Repository Operation" : ""),
    repoRef:
      proposal.repoGate.ref ??
      (repoMode === "new" ? proposalRepositoryRequestRef(proposal.id) : ""),
    routeTarget: proposalRouteSelectionTargetFromProposal(proposal),
  };
}

export function proposalRepositoryRequestRef(proposalId: string) {
  const proposalSlug = proposalId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `repo-request://proposal/${proposalSlug || "unidentified"}`;
}

export function proposalRepositoryRequestRefValid(repoRef: string) {
  return /^repo-request:\/\/[a-z0-9][a-z0-9._/-]*$/i.test(repoRef.trim());
}

export function proposalRouteSelectionSupportsRepository(
  routeTarget: ProposalRouteSelectionTarget,
) {
  return routeTarget === "Delivery" || routeTarget === "Prototype";
}

export function proposalRouteSelectionTargetValid(
  routeTarget: unknown,
): routeTarget is ProposalRouteSelectionTarget {
  return proposalRouteSelectionTargets.some(
    (candidate) => candidate === routeTarget,
  );
}

export function proposalRouteSelectionHasRepositoryGate(
  draft: ProposalRouteSelectionDraft,
) {
  return (
    proposalRouteSelectionSupportsRepository(draft.routeTarget) &&
    draft.repoMode !== "not-required"
  );
}

export function proposalRouteSelectionNeedsRepositoryResolution(
  draft: ProposalRouteSelectionDraft,
) {
  return (
    proposalRouteSelectionSupportsRepository(draft.routeTarget) &&
    draft.repoMode === "new"
  );
}

export function proposalRouteSelectionComplete(
  draft: ProposalRouteSelectionDraft,
) {
  if (
    !proposalRouteSelectionTargetValid(draft.routeTarget) ||
    !draft.rationale.trim()
  ) {
    return false;
  }

  if (!proposalRouteSelectionHasRepositoryGate(draft)) {
    return true;
  }

  if (draft.repoMode === "existing") {
    return Boolean(draft.repoOwner.trim() && draft.repoRef.trim());
  }

  if (draft.repoMode === "new") {
    return proposalRepositoryRequestRefValid(draft.repoRef);
  }

  return false;
}

export function proposalRouteSelectionTone(
  draft: ProposalRouteSelectionDraft,
): OperationTone {
  if (draft.routeTarget === "Parked") {
    return "muted";
  }

  if (proposalRouteSelectionNeedsRepositoryResolution(draft)) {
    return "warn";
  }

  return proposalRouteSelectionComplete(draft) ? "ok" : "warn";
}

export function proposalRouteSelectionRepoLabel(
  draft: ProposalRouteSelectionDraft,
) {
  if (!proposalRouteSelectionHasRepositoryGate(draft)) {
    return "No Repo";
  }

  if (draft.repoMode === "new") {
    return "Repo Needed";
  }

  return draft.repoRef ? "Repo Selected" : "Repo Missing";
}

export function proposalRouteSelectionRepoModeLabel(
  repoMode: ProposalRouteSelectionRepoMode,
) {
  switch (repoMode) {
    case "existing":
      return "Existing repo";
    case "new":
      return "New repo";
    case "not-required":
      return "Not required";
  }
}

export function proposalRouteSelectionSourceCustody(
  draft: ProposalRouteSelectionDraft,
  repositoryGateResolution?: {
    resolvedOwner: string;
    resolvedRepoRef: string;
  } | null,
): OperationSourceCustody {
  if (!proposalRouteSelectionSupportsRepository(draft.routeTarget)) {
    return {
      classification: "non-source-work",
      owner: "Workspace Proposals",
      rationale:
        "This proposal is not being handed to a source-owning Delivery or Prototype route.",
      repo_ref: null,
      repository_gate_state: "not-required",
    };
  }

  if (draft.repoMode === "not-required") {
    return {
      classification: "non-source-work",
      owner: draft.routeTarget,
      rationale:
        "The selected route does not require repository custody before handoff.",
      repo_ref: null,
      repository_gate_state: "not-required",
    };
  }

  if (draft.repoMode === "existing") {
    const resolved = Boolean(draft.repoOwner.trim() && draft.repoRef.trim());

    return {
      classification: "existing-repo",
      owner: draft.repoOwner || "Owner repo not selected",
      rationale:
        "The selected route uses an existing owner repository as the source custody home.",
      repo_ref: draft.repoRef || null,
      repository_gate_state: resolved ? "resolved" : "pending",
    };
  }

  return {
    classification: "new-repo-required",
    owner:
      repositoryGateResolution?.resolvedOwner ||
      draft.repoOwner ||
      "pending repository operation",
    rationale:
      "The selected route requires Repository to resolve source custody before handoff can be treated as clear.",
    repo_ref:
      repositoryGateResolution?.resolvedRepoRef || draft.repoRef || null,
    repository_gate_state: repositoryGateResolution ? "resolved" : "pending",
  };
}

export function proposalRouteSelectionSourceCustodyLabel(
  custody: OperationSourceCustody,
) {
  switch (custody.classification) {
    case "existing-repo":
      return "Existing repo";
    case "new-repo-required":
      return "New repo required";
    case "non-source-work":
      return "Non-source work";
    case "platform-internal":
      return "Platform internal";
  }
}

function proposalRouteSelectionTargetFromProposal(
  proposal: ProposalWorkspaceScenario,
): ProposalRouteSelectionTarget {
  switch (proposal.routeTarget) {
    case "Delivery":
    case "Prototype":
      return proposal.routeTarget;
    case "Workspace Proposals":
      return "Parked";
  }
}

function proposalRouteSelectionRepoModeFromProposal(
  proposal: ProposalWorkspaceScenario,
): ProposalRouteSelectionRepoMode {
  switch (proposal.repoGate.mode) {
    case "existing":
      return "existing";
    case "new":
      return "new";
    case "not-required":
      return "not-required";
  }
}
