import {
  TerasStatusItem,
  TerasContentTray,
  TerasFieldGrid,
  TerasFieldStack,
  TerasTextListField,
  TerasNoteField,
  TerasSelectField,
  TerasList,
  TerasStatusPill,
  TerasTextField,
  TerasTrayStack,
  TerasWizardPanel,
} from "@/teras";

import type { PrototypeRecord } from "../../../read-model/prototype-workspace-read-model.ts";
import {
  prototypeCandidatePromotionFieldLimits,
  type PrototypeCandidatePromotionStepId,
} from "../../../work-model/workflows/candidate-promotion/prototype-candidate-promotion-model.ts";
import type { CandidateDraftPatchHandler } from "./prototype-candidate-promotion-panel-types.ts";
import {
  candidateAudienceOptions,
  candidatePromotionDraftStatus,
  candidateProofMethodOptions,
  candidatePromotionReadyTone,
  candidatePromotionReviewStatus,
  candidateReviewRows,
  type PrototypeCandidatePromotionDraft,
} from "./prototype-candidate-promotion-view-model.ts";

export function PrototypeCandidatePromotionStepPanel({
  activeStep,
  draft,
  draftComplete,
  draftMutable,
  issueTone,
  onDraftChange,
  record,
  reviewActionLabel,
  reviewReady,
}: {
  activeStep: PrototypeCandidatePromotionStepId;
  draft: PrototypeCandidatePromotionDraft;
  draftComplete: boolean;
  draftMutable: boolean;
  issueTone: ReturnType<typeof candidatePromotionReadyTone>;
  onDraftChange: CandidateDraftPatchHandler;
  record: PrototypeRecord;
  reviewActionLabel: string;
  reviewReady: boolean;
}) {
  if (activeStep === "interview") {
    const draftStatus = candidatePromotionDraftStatus(draftComplete);

    return (
      <TerasWizardPanel
        actions={
          <TerasStatusPill tone={draftStatus.tone}>
            {draftStatus.label}
          </TerasStatusPill>
        }
        description="Capture the minimum candidate proof, scope, and boundary context before review."
        kicker="Candidate Work"
        title="Candidate Interview"
      >
        <TerasFieldStack spacing="loose">
          <TerasNoteField
            label="Candidate objective"
            maxLength={prototypeCandidatePromotionFieldLimits.objective}
            minimumHeight="short"
            onValueChange={(objective) => onDraftChange({ objective })}
            placeholder="State the outcome this candidate should make possible."
            readOnly={!draftMutable}
            value={draft.objective}
          />
          <TerasFieldGrid align="end">
            <TerasSelectField
              disabled={!draftMutable}
              label="Audience type"
              onValueChange={(kind) =>
                onDraftChange({
                  audience: {
                    ...draft.audience,
                    kind,
                  },
                })
              }
              options={candidateAudienceOptions}
              value={draft.audience.kind}
            />
            <TerasTextField
              label="Intended user or role"
              maxLength={prototypeCandidatePromotionFieldLimits.audienceLabel}
              onValueChange={(label) =>
                onDraftChange({
                  audience: {
                    ...draft.audience,
                    label,
                  },
                })
              }
              placeholder="Example: delivery operator"
              readOnly={!draftMutable}
              value={draft.audience.label}
            />
          </TerasFieldGrid>
          <TerasFieldGrid align="end">
            <TerasSelectField
              disabled={!draftMutable}
              label="Proof method"
              onValueChange={(method) =>
                onDraftChange({
                  proof: {
                    ...draft.proof,
                    method,
                  },
                })
              }
              options={candidateProofMethodOptions}
              value={draft.proof.method}
            />
            <TerasTextField
              label="Success criterion"
              maxLength={prototypeCandidatePromotionFieldLimits.proofCriterion}
              onValueChange={(criterion) =>
                onDraftChange({
                  proof: {
                    ...draft.proof,
                    criterion,
                  },
                })
              }
              placeholder="State the observable result that proves value."
              readOnly={!draftMutable}
              value={draft.proof.criterion}
            />
          </TerasFieldGrid>
          <TerasFieldGrid spacing="loose">
            <TerasContentTray>
              <TerasTextListField
                addLabel="Add item"
                description="Work this candidate will actively shape."
                itemLabel={(index) => `Included scope item ${index + 1}`}
                items={draft.scope.included}
                label="Included scope"
                maxItems={prototypeCandidatePromotionFieldLimits.scopeItems}
                maxLength={prototypeCandidatePromotionFieldLimits.scopeItem}
                minItems={1}
                onItemsChange={(included) =>
                  onDraftChange({
                    scope: {
                      ...draft.scope,
                      included,
                    },
                  })
                }
                placeholder="Add one bounded deliverable or capability."
                readOnly={!draftMutable}
                visibleItems={4}
              />
            </TerasContentTray>
            <TerasContentTray>
              <TerasTextListField
                addLabel="Add item"
                description="Work deliberately deferred from this candidate."
                itemLabel={(index) => `Excluded scope item ${index + 1}`}
                items={draft.scope.excluded}
                label="Excluded scope"
                maxItems={prototypeCandidatePromotionFieldLimits.scopeItems}
                maxLength={prototypeCandidatePromotionFieldLimits.scopeItem}
                minItems={1}
                onItemsChange={(excluded) =>
                  onDraftChange({
                    scope: {
                      ...draft.scope,
                      excluded,
                    },
                  })
                }
                placeholder="Add one explicit non-goal."
                readOnly={!draftMutable}
                visibleItems={4}
              />
            </TerasContentTray>
          </TerasFieldGrid>
        </TerasFieldStack>
      </TerasWizardPanel>
    );
  }

  const reviewStatus = candidatePromotionReviewStatus({
    actionLabel: reviewActionLabel,
    issueTone,
    reviewReady,
  });

  return (
    <TerasWizardPanel
      actions={
        <TerasStatusPill tone={reviewStatus.tone}>
          {reviewStatus.label}
        </TerasStatusPill>
      }
      description="Review the current candidate packet. Baseline, Movement, security, and runtime authority remain separate workflows."
      kicker="Candidate Work"
      title="Candidate Packet"
    >
      <TerasTrayStack spacing="loose">
        <TerasList frame="contained">
          {candidateReviewRows(draft, record).map((row, index) => (
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
      </TerasTrayStack>
    </TerasWizardPanel>
  );
}
