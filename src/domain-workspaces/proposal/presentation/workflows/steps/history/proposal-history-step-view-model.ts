import type { TerasTone } from "@/teras";

import type { ProposalWorkflowLocalReceipt } from "../../../../local-runtime/proposal-runtime.ts";
import {
  latestProposalWorkflowReceipt,
  proposalWorkflowReceiptsOldestFirst,
} from "../../../../local-runtime/proposal-workflow-receipt-projection.ts";
import { proposalDecisionOutcomeCopy } from "../../../../work-model/proposal-disposition-model.ts";
import { proposalHandoffResultCopy } from "../../../../work-model/proposal-handoff-model.ts";
import type { ProposalWorkspaceScenario } from "../../../../read-model/proposal-workspace-read-model.ts";
import { proposalIngressLabel } from "../../../shared/proposal-display-model.ts";

export type ProposalHistoryStepProjection = ReturnType<
  typeof proposalHistoryStepProjection
>;

export function proposalHistoryStepProjection({
  proposal,
  workflowReceipts,
}: {
  proposal: ProposalWorkspaceScenario;
  workflowReceipts: ProposalWorkflowLocalReceipt[];
}) {
  const chronologicalReceipts =
    proposalWorkflowReceiptsOldestFirst(workflowReceipts);
  const handoffReceipt = latestProposalWorkflowReceipt(
    chronologicalReceipts,
    "handoff",
  );
  const receiptsRecorded = chronologicalReceipts.length > 0;
  const latestReceipt = chronologicalReceipts.at(-1) ?? null;
  const historyTone: TerasTone = latestReceipt
    ? proposalWorkflowReceiptCopy(latestReceipt).tone
    : "info";
  const receiptTitle = handoffReceipt
    ? handoffReceipt.payload.step === "handoff" &&
      handoffReceipt.payload.result === "blocked"
      ? "Handoff Block Recorded"
      : "Proposal Handoff Recorded"
    : receiptsRecorded
      ? "Workflow Receipts"
      : "No Receipts Recorded";

  return {
    historyTone,
    progressStatusLabel: handoffReceipt
      ? "recorded"
      : receiptsRecorded
        ? "in progress"
        : "archive",
    receiptDescription: receiptsRecorded
      ? "Read-only receipt archive for this Proposal pass."
      : "No workflow receipt has been recorded for this Proposal pass.",
    receiptStatusLabel: receiptsRecorded ? "recorded" : "empty",
    receiptStatusTone: receiptsRecorded ? historyTone : ("muted" as const),
    receiptTitle,
    timelineTitle: "Recorded Trail",
    receiptRows: proposalHistoryReceiptRows(chronologicalReceipts),
    timelineRows: proposalHistoryTimelineRows(proposal, chronologicalReceipts),
  };
}

function proposalHistoryTimelineRows(
  proposal: ProposalWorkspaceScenario,
  workflowReceipts: ProposalWorkflowLocalReceipt[],
) {
  return [
    {
      detail: proposal.bodyPreview,
      label: "Proposal captured",
      status: proposalIngressLabel(proposal.ingress),
      timestamp: proposal.recordedAt,
      tone: "info" as const,
    },
    ...workflowReceipts.map((receipt) => {
      const copy = proposalWorkflowReceiptCopy(receipt);

      return {
        detail: copy.detail,
        label: `${copy.label} recorded`,
        status: copy.status,
        timestamp: receipt.recordedAt,
        tone: copy.tone,
      };
    }),
  ].sort((left, right) => left.timestamp.localeCompare(right.timestamp));
}

function proposalHistoryReceiptRows(
  workflowReceipts: ProposalWorkflowLocalReceipt[],
) {
  return workflowReceipts.map((receipt) => {
    const copy = proposalWorkflowReceiptCopy(receipt);
    return {
      detail: `${receipt.receiptId} / ${copy.detail}`,
      id: receipt.receiptId,
      label: copy.label,
      tone: copy.tone,
      value: receipt.recordedAt,
    };
  });
}

function proposalWorkflowReceiptCopy(receipt: ProposalWorkflowLocalReceipt): {
  detail: string;
  label: string;
  status: string;
  tone: TerasTone;
} {
  switch (receipt.payload.step) {
    case "triage":
      return {
        detail: receipt.payload.summary || receipt.summary,
        label: "Triage",
        status: "recorded",
        tone: "ok",
      };
    case "disposition": {
      const decisionCopy = proposalDecisionOutcomeCopy(
        receipt.payload.decision.outcome,
      );
      const route = receipt.payload.route;
      return {
        detail: route
          ? [`${route.routeTarget} / ${route.repoMode}`, route.rationale]
              .filter(Boolean)
              .join(" | ")
          : receipt.payload.decision.notes || receipt.summary,
        label: "Disposition",
        status: route?.routeTarget ?? decisionCopy.label,
        tone: decisionCopy.tone,
      };
    }
    case "handoff": {
      const handoffCopy = proposalHandoffResultCopy(receipt.payload.result);
      return {
        detail: receipt.payload.notes || receipt.summary,
        label: "Handoff",
        status: receipt.payload.result,
        tone: handoffCopy.tone,
      };
    }
  }
}
