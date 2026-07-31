import {
  TerasChoiceGroup,
  TerasActionButton,
  TerasActionRow,
  TerasFieldStack,
  TerasNoteField,
  TerasPanel,
  TerasPanelCollapseActions,
  TerasPanelHeader,
  type TerasTone,
} from "@/teras";

import type {
  ProposalDecisionDraft,
  ProposalDecisionOutcome,
} from "../../../../work-model/proposal-disposition-model.ts";
import {
  proposalDispositionDecisionDescription,
  proposalDispositionOutcomeChoiceOptions,
} from "./proposal-disposition-step-view-model.ts";

export function ProposalDispositionDecisionPanel({
  actionLabel,
  canApply,
  collapsed,
  decisionDraft,
  description,
  decisionTitle,
  dispositionCompleted,
  dispositionTone,
  onApplyDraft,
  onNotesChange,
  onSelectOutcome,
  onToggleCollapsed,
  statusLabel,
}: {
  actionLabel: string;
  canApply: boolean;
  collapsed: boolean;
  decisionDraft: ProposalDecisionDraft;
  description: string;
  decisionTitle: string;
  dispositionCompleted: boolean;
  dispositionTone: TerasTone;
  onApplyDraft: () => void;
  onNotesChange: (notes: string) => void;
  onSelectOutcome: (outcome: ProposalDecisionOutcome) => void;
  onToggleCollapsed: () => void;
  statusLabel: string;
}) {
  return (
    <TerasPanel
      collapsed={collapsed}
      density={collapsed ? "compact" : undefined}
      frame="padded"
      treatment="rail"
      fit="fill"
      layout={collapsed ? undefined : "header-body"}
      overflow="hidden"
      spacing={collapsed ? "compact" : "normal"}
      tone={dispositionTone}
    >
      <TerasPanelHeader
        actions={
          <TerasPanelCollapseActions
            collapsed={collapsed}
            onToggle={onToggleCollapsed}
            statusLabel={statusLabel}
            statusTone={dispositionTone}
          />
        }
        actionsLayout="inline"
        description={proposalDispositionDecisionDescription({
          collapsed,
          description,
        })}
        kicker="Disposition"
        title={decisionTitle}
      />
      {collapsed ? null : (
        <TerasFieldStack fill="middle" spacing="loose">
          <TerasChoiceGroup
            ariaLabel="Proposal disposition outcome"
            frame="tray"
            label="Outcome"
            onSelect={onSelectOutcome}
            options={proposalDispositionOutcomeChoiceOptions({
              decisionDraft,
              dispositionCompleted,
            })}
            readOnly={dispositionCompleted}
            selectedId={decisionDraft.outcome}
          />
          <TerasNoteField
            fill
            label="Decision notes"
            onValueChange={onNotesChange}
            placeholder="Record why this proposal should be accepted, rejected, or kept parked."
            readOnly={dispositionCompleted}
            value={decisionDraft.notes}
          />
          <TerasActionRow>
            <TerasActionButton
              data-proposal-disposition-primary-action="true"
              disabled={dispositionCompleted || !canApply}
              emphasis="primary"
              onClick={onApplyDraft}
              tone={dispositionTone === "danger" ? "danger" : "accent"}
            >
              {actionLabel}
            </TerasActionButton>
          </TerasActionRow>
        </TerasFieldStack>
      )}
    </TerasPanel>
  );
}
