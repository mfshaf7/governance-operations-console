import {
  TerasStatusItem,
  TerasChoiceGroup,
  TerasFieldGrid,
  TerasFieldStack,
  TerasNoteField,
  TerasList,
  TerasStatusPill,
  TerasTextField,
  TerasWizardPanel,
} from "@/teras";

import type { PrototypeCloseoutRetirementStepId } from "../../../work-model/workflows/closeout-retirement/prototype-closeout-retirement-model.ts";
import type { prototypeCloseoutRetentionRows } from "../../../work-model/workflows/closeout-retirement/prototype-closeout-retirement-model.ts";
import type {
  CloseoutDraftPatchHandler,
  CloseoutStatus,
} from "./prototype-closeout-retirement-panel-types.ts";
import {
  closeoutReasonOptions,
  closeoutRetentionChecklistRows,
  closeoutRetentionOptions,
  type CloseoutDraft,
} from "./prototype-closeout-retirement-view-model.ts";

export function PrototypeCloseoutRetirementStepPanel({
  activeStep,
  draft,
  draftMutable,
  impactStatus,
  onDraftChange,
  retentionRows,
  reviewStatus,
  showSupersededBy,
}: {
  activeStep: PrototypeCloseoutRetirementStepId;
  draft: CloseoutDraft;
  draftMutable: boolean;
  impactStatus: CloseoutStatus;
  onDraftChange: CloseoutDraftPatchHandler;
  retentionRows: ReturnType<typeof prototypeCloseoutRetentionRows>;
  reviewStatus: CloseoutStatus;
  showSupersededBy: boolean;
}) {
  if (activeStep === "impact") {
    return (
      <TerasWizardPanel
        actions={
          <TerasStatusPill tone={impactStatus.tone}>
            {impactStatus.label}
          </TerasStatusPill>
        }
        description="Record why closeout is being considered and whether the impact stays local or needs Movement Control."
        kicker="Closeout Work"
        title="Reason and Impact"
      >
        <TerasFieldStack spacing="wide">
          <TerasFieldGrid columns={2} spacing="loose">
            <TerasChoiceGroup
              ariaLabel="Closeout reason"
              frame="tray"
              label="Closeout reason"
              onSelect={(reason) => onDraftChange({ reason })}
              options={closeoutReasonOptions}
              readOnly={!draftMutable}
              selectedId={draft.reason}
            />
            <TerasChoiceGroup
              ariaLabel="Closeout retention"
              frame="tray"
              label="Retention plan"
              onSelect={(retention) => onDraftChange({ retention })}
              options={closeoutRetentionOptions}
              readOnly={!draftMutable}
              selectedId={draft.retention}
            />
          </TerasFieldGrid>
          <TerasNoteField
            label="Explanation"
            minimumHeight="medium"
            onValueChange={(explanation) => onDraftChange({ explanation })}
            placeholder="Explain why this prototype should stop, move, or stay active."
            readOnly={!draftMutable}
            value={draft.explanation}
          />
          {showSupersededBy ? (
            <TerasTextField
              label="Superseded by"
              onValueChange={(supersededBy) => onDraftChange({ supersededBy })}
              placeholder="Optional record, prototype, or delivery ref"
              readOnly={!draftMutable}
              value={draft.supersededBy}
            />
          ) : null}
        </TerasFieldStack>
      </TerasWizardPanel>
    );
  }

  return (
    <TerasWizardPanel
      actions={
        <TerasStatusPill tone={reviewStatus.tone}>
          {reviewStatus.label}
        </TerasStatusPill>
      }
      description="Choose the closeout outcome to record in this prototype-local session."
      kicker="Closeout Work"
      title="Review and Apply"
    >
      <TerasFieldStack spacing="wide">
        <TerasList frame="contained">
          {closeoutRetentionChecklistRows(retentionRows).map((row, index) => (
            <TerasStatusItem
              tone={row.tone}
              detail={row.detail}
              index={String(index + 1).padStart(2, "0")}
              key={row.id}
              label={row.label}
              status={row.status}
            />
          ))}
        </TerasList>
      </TerasFieldStack>
    </TerasWizardPanel>
  );
}
