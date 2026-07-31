"use client";

import {
  TerasContentFrame,
  TerasEmptyState,
  TerasPanel,
  TerasPanelHeader,
  TerasStatGroup,
  TerasStatItem,
  TerasSubjectHero,
  TerasTimeline,
  TerasTimelineItem,
  TerasZone,
  TerasZoneLayout,
} from "@/teras";

import type { ProposalWorkflowLocalReceipt } from "../../../../local-runtime/proposal-runtime.ts";
import type { ProposalWorkflowNavigationTarget } from "../../../../work-model/proposal-workflow-navigation.ts";
import type { ProposalWorkflowStepProjection } from "../../../../work-model/proposal-workflow-step-model.ts";
import type { ProposalWorkspaceScenario } from "../../../../read-model/proposal-workspace-read-model.ts";
import { ProposalWorkflowProgressPanel } from "../../session/proposal-workflow-progress-panel.tsx";
import {
  proposalIngressLabel,
  proposalRepoGateLabel,
  proposalScenarioStatusLabel,
  proposalSubjectMetadata,
} from "../../../shared/proposal-display-model.ts";
import { proposalHistoryStepProjection } from "./proposal-history-step-view-model.ts";

export function ProposalHistoryStep({
  onOpenDetails,
  onSelectStep,
  proposal,
  progressSteps,
  workflowReceipts,
}: {
  onOpenDetails: () => void;
  onSelectStep: (step: ProposalWorkflowNavigationTarget) => void;
  proposal: ProposalWorkspaceScenario;
  progressSteps: ProposalWorkflowStepProjection[];
  workflowReceipts: ProposalWorkflowLocalReceipt[];
}) {
  const {
    historyTone,
    progressStatusLabel,
    receiptDescription,
    receiptRows,
    receiptStatusLabel,
    receiptStatusTone,
    receiptTitle,
    timelineTitle,
    timelineRows,
  } = proposalHistoryStepProjection({
    proposal,
    workflowReceipts,
  });

  return (
    <TerasContentFrame
      fill
      variant="standard"
      data-proposal-history-modal="true"
    >
      <ProposalWorkflowProgressPanel
        description="Review proposal workflow history. The archive is read-only."
        onSelectStep={onSelectStep}
        statusLabel={progressStatusLabel}
        statusTone={historyTone}
        steps={progressSteps}
        title="Proposal History"
      />

      <TerasZoneLayout variant="main-aside">
        <TerasZone fit="fill">
          <TerasSubjectHero
            actionDetail="Brief and source facts"
            actionLabel="Open Proposal Record"
            onAction={onOpenDetails}
            subject={{
              eyebrow: "Selected Proposal",
              meta: proposalSubjectMetadata(proposal),
              title: proposal.title,
            }}
          />
          <TerasPanel
            frame="padded"
            treatment="neutral"
            layout="header-body"
            overflow="hidden"
          >
            <TerasPanelHeader
              description="A compact read-only trail for this Proposal workflow pass."
              kicker="Event Timeline"
              statusLabel={`${timelineRows.length} events`}
              statusTone="info"
              title={timelineTitle}
            />
            <TerasTimeline>
              {timelineRows.map((row, index) => (
                <TerasTimelineItem
                  detail={row.detail}
                  displayTimestamp={row.timestamp}
                  key={`${row.timestamp}-${row.label}-${index}`}
                  label={row.label}
                  status={row.status}
                  timestamp={row.timestamp}
                  tone={row.tone}
                />
              ))}
            </TerasTimeline>
          </TerasPanel>
        </TerasZone>

        <TerasZone fit="fill">
          <TerasPanel frame="padded" treatment="rail" tone={historyTone}>
            <TerasPanelHeader
              description="Record-level sources available to this archive."
              kicker="Artifacts"
              title="Inspection Sources"
            />
            <TerasStatGroup>
              <TerasStatItem
                detail={proposalIngressLabel(proposal.ingress)}
                label="Source Record"
                value={proposal.id}
              />
              <TerasStatItem
                detail={proposalScenarioStatusLabel(proposal.status)}
                label="Record State"
                value={proposalScenarioStatusLabel(proposal.status)}
              />
              <TerasStatItem
                detail={proposal.owner}
                label="Route Target"
                value={proposal.routeTarget}
              />
              <TerasStatItem
                detail={proposal.repoGate.detail}
                label="Repository Gate"
                value={proposalRepoGateLabel(proposal)}
              />
            </TerasStatGroup>
          </TerasPanel>

          <TerasPanel
            frame="padded"
            treatment="rail"
            layout="header-body"
            overflow="hidden"
            tone={historyTone}
          >
            <TerasPanelHeader
              description={receiptDescription}
              kicker="History Archive"
              statusLabel={receiptStatusLabel}
              statusTone={receiptStatusTone}
              title={receiptTitle}
            />
            {receiptRows.length > 0 ? (
              <TerasStatGroup scroll>
                {receiptRows.map((row) => (
                  <TerasStatItem
                    detail={row.detail}
                    element="article"
                    key={row.id}
                    label={row.label}
                    value={row.value}
                  />
                ))}
              </TerasStatGroup>
            ) : (
              <TerasEmptyState>
                No Proposal workflow receipts have been recorded.
              </TerasEmptyState>
            )}
          </TerasPanel>
        </TerasZone>
      </TerasZoneLayout>
    </TerasContentFrame>
  );
}
