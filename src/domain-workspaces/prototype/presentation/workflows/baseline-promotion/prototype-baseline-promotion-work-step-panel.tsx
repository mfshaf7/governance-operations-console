import {
  TerasStatusItem,
  TerasFieldGrid,
  TerasFieldStack,
  TerasNoteField,
  TerasList,
  TerasStatusPill,
  TerasTrayStack,
  TerasWizardPanel,
} from "@/teras";

import type { PrototypeBaselinePromotionStepId } from "../../../work-model/workflows/baseline-promotion/prototype-baseline-promotion-model.ts";
import type { BaselineDraftPatchHandler } from "./prototype-baseline-promotion-panel-types.ts";
import {
  baselineEvidenceChecklistRows,
  baselineReadyTone,
  type PrototypeBaselinePromotionDraft,
} from "./prototype-baseline-promotion-view-model.ts";

export function PrototypeBaselinePromotionStepPanel({
  activeStep,
  draft,
  draftMutable,
  evidenceChecklistRows,
  onDraftChange,
  packetReady,
}: {
  activeStep: PrototypeBaselinePromotionStepId;
  draft: PrototypeBaselinePromotionDraft;
  draftMutable: boolean;
  evidenceChecklistRows: ReturnType<typeof baselineEvidenceChecklistRows>;
  onDraftChange: BaselineDraftPatchHandler;
  packetReady: boolean;
}) {
  if (activeStep === "packet") {
    return (
      <TerasWizardPanel
        actions={
          <TerasStatusPill tone={baselineReadyTone(packetReady)}>
            {packetReady ? "Ready" : "Needs packet"}
          </TerasStatusPill>
        }
        description="Define the baseline and record evidence and issue disposition. Accepted and excluded scope come from Candidate Promotion."
        kicker="Baseline Work"
        title="Baseline Packet"
      >
        <TerasFieldStack spacing="loose">
          <TerasNoteField
            label="Baseline title"
            minimumHeight="short"
            onValueChange={(baselineTitle) => onDraftChange({ baselineTitle })}
            placeholder="Short name for the accepted local baseline."
            readOnly={!draftMutable}
            value={draft.baselineTitle}
          />
          <TerasNoteField
            label="Baseline statement"
            minimumHeight="short"
            onValueChange={(baselineStatement) =>
              onDraftChange({ baselineStatement })
            }
            placeholder="What local product/workflow shape is accepted?"
            readOnly={!draftMutable}
            value={draft.baselineStatement}
          />
          <TerasFieldGrid columns={2} spacing="compact">
            <TerasNoteField
              label="Evidence disposition"
              minimumHeight="short"
              onValueChange={(evidenceDisposition) =>
                onDraftChange({ evidenceDisposition })
              }
              placeholder="How should missing or deferred evidence be handled?"
              readOnly={!draftMutable}
              value={draft.evidenceDisposition}
            />
            <TerasNoteField
              label="Issue disposition"
              minimumHeight="short"
              onValueChange={(issueDisposition) =>
                onDraftChange({ issueDisposition })
              }
              placeholder="Fix before baseline, accept risk, defer, or block with owner."
              readOnly={!draftMutable}
              value={draft.issueDisposition}
            />
          </TerasFieldGrid>
        </TerasFieldStack>
      </TerasWizardPanel>
    );
  }

  return (
    <TerasWizardPanel
      description="Record the local baseline outcome. Movement, runtime, and security authority remain separate."
      kicker="Baseline Work"
      title="Evidence Review"
    >
      <TerasTrayStack spacing="loose">
        <TerasList frame="contained">
          {evidenceChecklistRows.map((row, index) => (
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
