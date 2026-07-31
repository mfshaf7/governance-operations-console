import type { TerasTone } from "@/teras";

import type { ProposalWorkspaceScenario } from "../../../../read-model/proposal-workspace-read-model.ts";
import { proposalWorkflowSourceReviewRequired } from "../../../../work-model/proposal-source-projection-model.ts";
import type { ProposalTriageDraft } from "../../../../work-model/proposal-triage-model.ts";
import {
  proposalIngressLabel,
  proposalScenarioStatusLabel,
} from "../../../shared/proposal-display-model.ts";

export type ProposalTriageStepProjection = ReturnType<
  typeof proposalTriageStepProjection
>;

export function proposalTriageStepProjection({
  draft,
  proposal,
  readOnly,
}: {
  draft: ProposalTriageDraft;
  proposal: ProposalWorkspaceScenario;
  readOnly: boolean;
}) {
  const normalizedSummary = draft.summary.trim();
  const triageReceiptRecorded = Boolean(draft.appliedAt);
  const sourceReviewRequired = proposalWorkflowSourceReviewRequired(proposal, [
    draft,
  ]);
  const triageSourceBlocked =
    readOnly && sourceReviewRequired && !triageReceiptRecorded;
  const triageReadModelReadOnly =
    readOnly && !sourceReviewRequired && !triageReceiptRecorded;
  const triageCompleted = triageReceiptRecorded || triageReadModelReadOnly;
  const triageLocked = triageCompleted || triageSourceBlocked;
  const canApply = !triageLocked && normalizedSummary.length > 0;
  const triageTone: TerasTone = triageCompleted ? "ok" : "warn";
  const triageActionLabel = triageReceiptRecorded
    ? "Triage Recorded"
    : triageSourceBlocked
      ? "Source Update Required"
      : triageReadModelReadOnly
        ? "Triage Complete"
        : canApply
          ? "Record Triage Review"
          : "Complete Required Fields";
  const triageActionDescription = triageReceiptRecorded
    ? "Triage has been recorded."
    : triageSourceBlocked
      ? "Source data is not current yet. Review only; record triage after the source refreshes."
      : triageReadModelReadOnly
        ? "Summary is already available for Disposition."
        : canApply
          ? "Summary is ready to record."
          : "Add a summary to continue.";

  return {
    advisorStatusLabel: triageLocked ? "read-only" : "draft-only",
    advisorStatusTitle: triageReceiptRecorded
      ? "Triage review is recorded; advisor drafting is locked for review."
      : triageSourceBlocked
        ? "Source data is not current yet; advisor drafting is locked for review."
        : triageReadModelReadOnly
          ? "Triage summary is already available; advisor drafting is locked for review."
          : "Advisor output is draft-only and cannot apply a route or repository decision.",
    advisorStatusTone: triageCompleted ? ("ok" as const) : ("warn" as const),
    advisorTranscript: proposalTriageAdvisorTranscript({
      advisorDraft: draft.advisorDraft,
      proposal,
    }),
    canApply,
    gateStatusLabel: triageReceiptRecorded
      ? "recorded"
      : triageSourceBlocked
        ? "source"
        : triageReadModelReadOnly
          ? "complete"
          : canApply
            ? "ready"
            : "summary needed",
    gateTitle: triageReceiptRecorded
      ? "Receipt Recorded"
      : triageSourceBlocked
        ? "Source Update Required"
        : triageReadModelReadOnly
          ? "Triage Complete"
          : "Triage Review",
    progressStatusLabel: triageReceiptRecorded
      ? "recorded"
      : triageSourceBlocked
        ? "source update required"
        : triageReadModelReadOnly
          ? "complete"
          : canApply
            ? "ready"
            : "summary needed",
    progressTitle: triageReceiptRecorded
      ? "Triage Review Recorded"
      : triageSourceBlocked
        ? "Source Review Locked"
        : triageReadModelReadOnly
          ? "Triage Summary Ready"
          : canApply
            ? "Record Triage Review"
            : "Complete Triage Summary",
    triageActionDescription,
    triageActionLabel,
    triageCompleted,
    triageLocked,
    triageReadModelReadOnly,
    triageReceiptRecorded,
    triageSourceBlocked,
    triageTone,
  };
}

export function proposalTriageAdvisorDraft({
  proposal,
  prompt,
}: {
  proposal: ProposalWorkspaceScenario;
  prompt: string;
}) {
  return [
    `Advisor review for ${proposal.id}:`,
    `- Source posture: ${proposalScenarioStatusLabel(proposal.status)}.`,
    `- Ingress: ${proposalIngressLabel(proposal.ingress)}.`,
    `- Source context to challenge: ${proposal.bodyPreview}`,
    "- Later steps own disposition, repository handling, and handoff.",
    `- Operator ask: ${prompt}`,
  ].join("\n");
}

function proposalTriageAdvisorTranscript({
  advisorDraft,
  proposal,
}: {
  advisorDraft: string;
  proposal: ProposalWorkspaceScenario;
}) {
  return [
    {
      id: `${proposal.id}-triage-advisor-opening`,
      role: "advisor" as const,
      text: `Locked to ${proposal.id}. I can challenge source completeness, missing context, and disposition readiness. I do not choose route, repository, or handoff outcomes.`,
    },
    {
      id: `${proposal.id}-triage-advisor-boundary`,
      role: "advisor" as const,
      text: "Triage output should be one short source summary. Disposition, Handoff, and History stay in later steps.",
    },
    ...(advisorDraft.trim()
      ? [
          {
            id: `${proposal.id}-triage-advisor-draft`,
            role: "advisor" as const,
            text: advisorDraft,
          },
        ]
      : []),
  ];
}
