import {
  TerasActionButton,
  TerasActionRow,
  TerasStatusItem,
  TerasList,
  TerasFieldStack,
  TerasNoteField,
  TerasPanel,
  TerasPanelHeader,
} from "@/teras";

import type { ProposalRouteSelectionDraft } from "../../../../work-model/proposal-disposition-model.ts";
import type { ProposalHandoffDraft } from "../../../../work-model/proposal-handoff-model.ts";
import type { ProposalHandoffStepProjection } from "./proposal-handoff-step-view-model.ts";

export function ProposalHandoffApplyPanel({
  draft,
  onApplyDraft,
  onNotesChange,
  projection,
  routeSelectionDraft,
}: {
  draft: ProposalHandoffDraft;
  onApplyDraft: () => void;
  onNotesChange: (notes: string) => void;
  projection: ProposalHandoffStepProjection;
  routeSelectionDraft: ProposalRouteSelectionDraft;
}) {
  const {
    canApply,
    handoffActionDescription,
    handoffPanelTitle,
    handoffRecorded,
    handoffStatusLabel,
    handoffTone,
    normalizedNotes,
    repositoryGateBlocked,
    repositoryGateRef,
    reviewResultDetail,
    reviewResultStatus,
    routeHasRepositoryGate,
    workflowBlocked,
  } = projection;

  return (
    <TerasPanel
      frame="padded"
      treatment="rail"
      fit="fill"
      layout="header-body"
      spacing="normal"
      tone={handoffTone}
    >
      <TerasPanelHeader
        description={handoffActionDescription}
        kicker="Handoff Gate"
        statusLabel={handoffStatusLabel}
        statusTone={handoffTone}
        title={handoffPanelTitle}
      />
      <TerasFieldStack fill="middle" spacing="compact">
        <TerasList>
          <TerasStatusItem
            tone="ok"
            detail={routeSelectionDraft.routeTarget}
            index="01"
            label="Route Target"
            status="selected"
          />
          <TerasStatusItem
            tone={
              repositoryGateBlocked
                ? "warn"
                : routeHasRepositoryGate
                  ? "ok"
                  : "info"
            }
            detail={routeHasRepositoryGate ? repositoryGateRef : "not required"}
            index="02"
            label="Repository Gate"
            status={
              repositoryGateBlocked
                ? "blocked"
                : routeHasRepositoryGate
                  ? "clear"
                  : "not required"
            }
          />
          <TerasStatusItem
            tone={
              workflowBlocked
                ? "warn"
                : repositoryGateBlocked
                  ? "warn"
                  : normalizedNotes.length > 0
                    ? "ok"
                    : "warn"
            }
            detail={
              workflowBlocked
                ? "complete previous step"
                : repositoryGateBlocked
                  ? "repository gate first"
                  : normalizedNotes.length > 0
                    ? `${normalizedNotes.length} chars`
                    : "empty"
            }
            index="03"
            label="Handoff Notes"
            status={
              workflowBlocked
                ? "locked"
                : repositoryGateBlocked
                  ? "locked"
                  : normalizedNotes.length > 0
                    ? "present"
                    : "needed"
            }
          />
          <TerasStatusItem
            tone={handoffTone}
            detail={reviewResultDetail}
            index="04"
            label="Review Result"
            status={reviewResultStatus}
          />
        </TerasList>
        <TerasNoteField
          density="compact"
          fill
          label="Handoff notes"
          onValueChange={onNotesChange}
          placeholder={
            workflowBlocked
              ? "Complete Triage and Disposition before writing handoff notes."
              : repositoryGateBlocked
                ? "Resolve the repository gate before writing handoff notes."
                : "Record why the selected route is ready for handoff."
          }
          readOnly={handoffRecorded || workflowBlocked || repositoryGateBlocked}
          value={repositoryGateBlocked ? "" : draft.notes}
        />
        <TerasActionRow>
          <TerasActionButton
            data-proposal-handoff-primary-action="true"
            disabled={handoffRecorded || !canApply}
            emphasis="primary"
            onClick={onApplyDraft}
            tone={handoffTone === "danger" ? "danger" : "accent"}
          >
            Apply Handoff
          </TerasActionButton>
        </TerasActionRow>
      </TerasFieldStack>
    </TerasPanel>
  );
}
