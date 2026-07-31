import {
  TerasActionButton,
  TerasMetadataList,
  TerasHubFrame,
  TerasHubPanel,
  TerasHubStepList,
  TerasPanelActionLayout,
  TerasPanelHeader,
  TerasProgressStepSelector,
} from "@/teras";

import type { ProposalWorkflowNavigationTarget } from "../../work-model/proposal-workflow-navigation.ts";
import type { ProposalWorkspaceScenario } from "../../read-model/proposal-workspace-read-model.ts";
import type { ProposalHubProjection } from "./proposal-hub-types.ts";
import { proposalHubSelectedMetadata } from "./proposal-hub-view-model.ts";

export function ProposalHubHome({
  hubProjection,
  onOpenHistory,
  onRunCurrentMove,
  onSelectStep,
  proposal,
}: {
  hubProjection: ProposalHubProjection;
  onOpenHistory: () => void;
  onRunCurrentMove: () => void;
  onSelectStep: (step: ProposalWorkflowNavigationTarget) => void;
  proposal: ProposalWorkspaceScenario;
}) {
  const { currentMove } = hubProjection;

  return (
    <TerasHubFrame
      selected={
        <TerasHubPanel slot="selected" tone="info">
          <TerasPanelHeader
            description={proposal.bodyPreview}
            kicker="Selected Proposal"
            statusLabel={hubProjection.status.pillLabel}
            statusTone={hubProjection.status.tone}
            title={proposal.title}
          />
          <TerasMetadataList
            items={proposalHubSelectedMetadata(proposal)}
            shape="line"
            treatment="chip"
            wrap
          />
        </TerasHubPanel>
      }
      primary={
        <TerasHubPanel slot="action" tone={currentMove.tone}>
          <TerasPanelActionLayout
            action={
              <TerasActionButton onClick={onRunCurrentMove} emphasis="primary">
                {currentMove.buttonLabel}
              </TerasActionButton>
            }
            header={
              <TerasPanelHeader
                description={currentMove.description}
                kicker="Current Required Move"
                title={currentMove.title}
              />
            }
          />
        </TerasHubPanel>
      }
      status={
        <TerasHubPanel slot="status" tone={hubProjection.status.tone}>
          <TerasPanelHeader
            description={hubProjection.status.description}
            kicker="Current Status"
            statusLabel={hubProjection.status.pillLabel}
            statusTone={hubProjection.status.tone}
            title={hubProjection.status.title}
          />
          <TerasMetadataList items={hubProjection.status.facts} />
        </TerasHubPanel>
      }
      progress={
        <TerasHubPanel slot="progress" tone={currentMove.tone}>
          <TerasPanelHeader
            description={hubProjection.progressDescription}
            kicker="Progress"
            title="Proposal Steps"
          />
          <TerasHubStepList ariaLabel="Proposal steps">
            {hubProjection.steps.map((step, index) => (
              <TerasProgressStepSelector
                available={step.available}
                current={step.current}
                detail={step.detail}
                index={index + 1}
                key={step.id}
                label={step.label}
                onSelect={() => {
                  onSelectStep(step.id);
                }}
                stateLabel={step.stateLabel}
                tone={step.tone}
              />
            ))}
          </TerasHubStepList>
        </TerasHubPanel>
      }
      history={
        <TerasHubPanel slot="history">
          <TerasPanelActionLayout
            action={
              <TerasActionButton
                disabled={hubProjection.history.actionDisabled}
                onClick={onOpenHistory}
                emphasis="secondary"
              >
                {hubProjection.history.actionLabel}
              </TerasActionButton>
            }
            header={
              <TerasPanelHeader
                description={hubProjection.history.description}
                kicker="History"
                title={hubProjection.history.title}
              />
            }
          />
        </TerasHubPanel>
      }
    />
  );
}
