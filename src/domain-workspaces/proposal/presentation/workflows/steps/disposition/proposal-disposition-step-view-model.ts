import type { TerasTone } from "@/teras";
import { repositoryOwnerRepoCatalogOptions } from "@/domain-workspaces/operation-integrations/repository-owner-repo-catalog-projection";

import {
  proposalDecisionOutcomeCopy,
  proposalRouteSelectionComplete,
  proposalRouteSelectionHasRepositoryGate,
  proposalRouteSelectionRepoModeLabel,
  proposalRouteSelectionSupportsRepository,
  proposalRouteSelectionTone,
  type ProposalDecisionDraft,
  type ProposalDecisionOutcome,
  type ProposalRouteSelectionDraft,
  type ProposalRouteSelectionRepoMode,
  type ProposalRouteSelectionTarget,
} from "../../../../work-model/proposal-disposition-model.ts";
import type { ProposalWorkspaceScenario } from "../../../../read-model/proposal-workspace-read-model.ts";

export type ProposalDispositionChoiceOption<TId extends string> = {
  id: TId;
  label: string;
  tone: TerasTone;
};

export type ProposalRegisteredRepoOption = {
  label: string;
  owner: string;
  value: string;
};

export type ProposalDispositionStepProjection = ReturnType<
  typeof proposalDispositionStepProjection
>;

export const proposalDispositionOutcomeOptions: Array<
  ProposalDispositionChoiceOption<ProposalDecisionOutcome>
> = [
  { id: "accepted", label: "Accept", tone: "ok" },
  { id: "parked", label: "Park", tone: "muted" },
  { id: "rejected", label: "Reject", tone: "danger" },
];

export const proposalDispositionRouteOptions: Array<
  ProposalDispositionChoiceOption<ProposalRouteSelectionTarget>
> = [
  { id: "Delivery", label: "Delivery", tone: "ok" },
  { id: "Prototype", label: "Prototype", tone: "info" },
];

export const proposalDispositionRepoModeOptions: Array<
  ProposalDispositionChoiceOption<ProposalRouteSelectionRepoMode>
> = [
  { id: "existing", label: "Existing Repo", tone: "ok" },
  { id: "new", label: "New Repo", tone: "warn" },
  { id: "not-required", label: "Not Required", tone: "muted" },
];

export const proposalRegisteredRepoOptions: ProposalRegisteredRepoOption[] =
  repositoryOwnerRepoCatalogOptions().map((repo) => ({
    label: repo.label,
    owner: repo.owner,
    value: `repo://${repo.valueKey}`,
  }));

export function proposalRegisteredRepoSelectOptions(): Array<{
  label: string;
  value: string;
}> {
  return [
    { label: "Select owner repo", value: "" },
    ...proposalRegisteredRepoOptions.map((repo) => ({
      label: `${repo.label} / ${repo.owner}`,
      value: repo.value,
    })),
  ];
}

export function proposalDispositionRouteChoiceOptions({
  dispositionCompleted,
  routeSelectionDraft,
}: {
  dispositionCompleted: boolean;
  routeSelectionDraft: ProposalRouteSelectionDraft;
}) {
  return proposalDispositionRouteOptions.map((option) => ({
    ...option,
    confirmed:
      dispositionCompleted && routeSelectionDraft.routeTarget === option.id,
  }));
}

export function proposalDispositionRepoModeChoiceOptions({
  dispositionCompleted,
  routeSelectionDraft,
}: {
  dispositionCompleted: boolean;
  routeSelectionDraft: ProposalRouteSelectionDraft;
}) {
  return proposalDispositionRepoModeOptions.map((option) => ({
    ...option,
    confirmed:
      dispositionCompleted && routeSelectionDraft.repoMode === option.id,
  }));
}

export function proposalDispositionOutcomeChoiceOptions({
  decisionDraft,
  dispositionCompleted,
}: {
  decisionDraft: ProposalDecisionDraft;
  dispositionCompleted: boolean;
}) {
  return proposalDispositionOutcomeOptions.map((option) => ({
    ...option,
    confirmed: dispositionCompleted && decisionDraft.outcome === option.id,
  }));
}

export function proposalDispositionDecisionDescription({
  collapsed,
  description,
}: {
  collapsed: boolean;
  description: string;
}) {
  return collapsed ? undefined : description;
}

export function proposalDispositionRoutePanelProjection(accepting: boolean) {
  return {
    description: accepting
      ? "Choose the route target and repository handling that handoff will review."
      : "This outcome closes routing. Handoff stays locked unless the proposal is accepted.",
    title: accepting ? "Route and repository" : "Route closed",
  };
}

export function proposalDispositionStepProjection({
  decisionDraft,
  proposal,
  readOnly,
  routeSelectionDraft,
}: {
  decisionDraft: ProposalDecisionDraft;
  proposal: ProposalWorkspaceScenario;
  readOnly: boolean;
  routeSelectionDraft: ProposalRouteSelectionDraft;
}) {
  const dispositionRecorded = Boolean(
    decisionDraft.appliedAt &&
    (decisionDraft.outcome !== "accepted" || routeSelectionDraft.appliedAt),
  );
  const dispositionReadModelReadOnly = readOnly && !dispositionRecorded;
  const dispositionCompleted =
    dispositionRecorded || dispositionReadModelReadOnly;
  const accepting = decisionDraft.outcome === "accepted";
  const routeSupportsRepository =
    accepting &&
    proposalRouteSelectionSupportsRepository(routeSelectionDraft.routeTarget);
  const routeHasRepositoryGate =
    accepting && proposalRouteSelectionHasRepositoryGate(routeSelectionDraft);
  const selectedRepo =
    proposalRegisteredRepoOptions.find(
      (repo) => repo.value === routeSelectionDraft.repoRef,
    ) ?? null;
  const routeComplete =
    !accepting || proposalRouteSelectionComplete(routeSelectionDraft);
  const notesComplete = decisionDraft.notes.trim().length > 0;
  const sourceParkedRevisit =
    proposal.status === "parked" && !dispositionRecorded;
  const canApply = !dispositionCompleted && routeComplete && notesComplete;
  const decisionCopy = proposalDecisionOutcomeCopy(decisionDraft.outcome);
  const dispositionTone: TerasTone = dispositionCompleted
    ? accepting
      ? proposalRouteSelectionTone(routeSelectionDraft)
      : decisionCopy.tone
    : canApply
      ? accepting
        ? proposalRouteSelectionTone(routeSelectionDraft)
        : decisionCopy.tone
      : "warn";
  const statusLabel = dispositionRecorded
    ? "recorded"
    : dispositionReadModelReadOnly
      ? "complete"
      : !routeComplete
        ? "route needed"
        : !notesComplete
          ? "notes needed"
          : "ready";
  const actionLabel = dispositionRecorded
    ? "Disposition Recorded"
    : dispositionReadModelReadOnly
      ? "Disposition Complete"
      : canApply
        ? sourceParkedRevisit
          ? "Record Revisit"
          : "Record Disposition"
        : "Complete Required Fields";
  const advisorDraft = decisionDraft.advisorDraft ?? "";
  const advisorPrompt = decisionDraft.advisorPrompt ?? "";
  const decisionDescription = sourceParkedRevisit
    ? "Choose whether to accept, reject, or keep this proposal parked. Decision notes are required."
    : "Choose the proposal outcome and record the required decision notes.";
  const decisionTitle = dispositionRecorded
    ? "Receipt Recorded"
    : dispositionReadModelReadOnly
      ? "Disposition Complete"
      : sourceParkedRevisit
        ? "Revisit Decision"
        : decisionCopy.title;
  const advisorStatusLabel = dispositionCompleted ? "read-only" : "draft-only";
  const advisorStatusTitle = dispositionCompleted
    ? "Disposition is recorded or projected; advisor drafting is locked for review."
    : "Advisor output is draft-only and cannot record Disposition.";
  const advisorStatusTone: TerasTone = dispositionCompleted ? "ok" : "warn";
  const progressTitle = dispositionRecorded
    ? "Disposition Recorded"
    : dispositionReadModelReadOnly
      ? "Disposition Ready"
      : sourceParkedRevisit
        ? "Revisit Decision"
        : canApply
          ? "Record Disposition"
          : "Complete Disposition";

  return {
    accepting,
    actionLabel,
    advisorDraft,
    advisorPrompt,
    advisorTranscript: proposalDispositionAdvisorTranscript({
      advisorDraft,
      proposal,
    }),
    canApply,
    decisionCopy,
    decisionDescription,
    decisionTitle,
    dispositionCompleted,
    dispositionReadModelReadOnly,
    dispositionRecorded,
    dispositionTone,
    notesComplete,
    routeComplete,
    routeHasRepositoryGate,
    routeSupportsRepository,
    selectedRepo,
    sourceParkedRevisit,
    advisorStatusLabel,
    advisorStatusTitle,
    advisorStatusTone,
    progressTitle,
    statusLabel,
  };
}

export function proposalDispositionAdvisorTranscript({
  advisorDraft,
  proposal,
}: {
  advisorDraft: string;
  proposal: ProposalWorkspaceScenario;
}): Array<{ id: string; role: "advisor" | "operator"; text: string }> {
  return [
    {
      id: `${proposal.id}-disposition-advisor-opening`,
      role: "advisor",
      text: `Locked to ${proposal.id}. I can challenge outcome, route fit, repository requirement, and handoff readiness before you record Disposition.`,
    },
    {
      id: `${proposal.id}-disposition-advisor-boundary`,
      role: "advisor",
      text: "Advisor output is draft-only. The operator still records Disposition manually; I cannot create a repo, route a proposal, or request handoff.",
    },
    ...(advisorDraft.trim()
      ? [
          {
            id: `${proposal.id}-disposition-advisor-draft`,
            role: "advisor" as const,
            text: advisorDraft,
          },
        ]
      : []),
  ];
}

export function proposalDispositionAdvisorDraft({
  accepting,
  decisionDraft,
  proposal,
  prompt,
  routeHasRepositoryGate,
  routeSelectionDraft,
}: {
  accepting: boolean;
  decisionDraft: ProposalDecisionDraft;
  proposal: ProposalWorkspaceScenario;
  prompt: string;
  routeHasRepositoryGate: boolean;
  routeSelectionDraft: ProposalRouteSelectionDraft;
}) {
  return [
    `Advisor review for ${proposal.id}:`,
    `- Current outcome: ${proposalDecisionOutcomeCopy(decisionDraft.outcome).label}.`,
    `- Route target: ${accepting ? routeSelectionDraft.routeTarget : "handoff path closed"}.`,
    `- Repository gate: ${
      accepting && routeHasRepositoryGate
        ? `${proposalRouteSelectionRepoModeLabel(routeSelectionDraft.repoMode)} / ${
            routeSelectionDraft.repoRef || "repo reference missing"
          }`
        : "not required"
    }.`,
    accepting
      ? `- Route rationale posture: ${
          routeSelectionDraft.rationale.trim()
            ? "rationale present"
            : "rationale still required"
        }.`
      : "- Handoff should remain locked for parked or rejected outcomes.",
    `- Operator ask: ${prompt}`,
  ].join("\n");
}

export function proposalAcceptedRouteTarget(
  proposal: ProposalWorkspaceScenario,
): ProposalRouteSelectionTarget {
  switch (proposal.routeTarget) {
    case "Delivery":
    case "Prototype":
      return proposal.routeTarget;
    case "Workspace Proposals":
      return "Delivery";
  }
}

export function proposalRouteCanUseRepository(
  routeTarget: ProposalRouteSelectionTarget,
) {
  return proposalRouteSelectionSupportsRepository(routeTarget);
}
