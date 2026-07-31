import {
  TerasActionButton,
  TerasStatusItem,
  TerasContentTray,
  TerasFieldGrid,
  TerasFieldStack,
  TerasList,
  TerasNoteField,
  TerasSelectField,
  TerasStatusPill,
  TerasTextField,
  TerasWizardPanel,
} from "@/teras";

import type {
  PrototypeSupportAreaId,
  PrototypeSupportRow,
  PrototypeSupportState,
} from "../../../read-model/prototype-workspace-read-model.ts";
import type { PrototypeLandingDraft } from "../../../work-model/workflows/landing/prototype-landing-model.ts";
import {
  prototypeSupportProfileOptions,
  prototypeSupportStateOptions,
} from "@/domain-workspaces/prototype/domain/support/prototype-support-profile-model";
import type {
  PrototypeLandingDraftChangeHandler,
  PrototypeLandingStatusProjection,
} from "./prototype-landing-types.ts";
import {
  prototypeLandingSelectedSupportRowDisplay,
  prototypeLandingSupportOptionStatus,
  prototypeLandingSupportStateControlStatus,
} from "./prototype-landing-view-model.ts";

export function PrototypeLandingProfileStepPanel({
  activeLandingDraft,
  landingDraftMutable,
  onDraftChange,
  onOpenSupportGuide,
  onSelectedSupportRowChange,
  onSupportRowStateChange,
  selectedSupportRow,
  selectedSupportRowLocked,
  supportPlannerStatus,
  supportProfileCustom,
  supportRowContentMutable,
  visibleSupportRows,
}: {
  activeLandingDraft: PrototypeLandingDraft;
  landingDraftMutable: boolean;
  onDraftChange: PrototypeLandingDraftChangeHandler;
  onOpenSupportGuide: () => void;
  onSelectedSupportRowChange: (rowId: PrototypeSupportAreaId) => void;
  onSupportRowStateChange: (
    rowId: PrototypeSupportAreaId,
    state: PrototypeSupportState,
  ) => void;
  selectedSupportRow: PrototypeSupportRow | undefined;
  selectedSupportRowLocked: boolean;
  supportPlannerStatus: PrototypeLandingStatusProjection;
  supportProfileCustom: boolean;
  supportRowContentMutable: boolean;
  visibleSupportRows: PrototypeSupportRow[];
}) {
  const supportAreaOptions = visibleSupportRows.map((row) => ({
    label: row.label,
    value: row.id,
  }));
  const selectedSupportRowDisplay =
    prototypeLandingSelectedSupportRowDisplay(selectedSupportRow);
  const supportOptionStatus =
    prototypeLandingSupportOptionStatus(supportProfileCustom);
  const supportStateStatus = prototypeLandingSupportStateControlStatus(
    selectedSupportRowLocked,
  );

  return (
    <TerasWizardPanel
      actions={
        <TerasStatusPill tone={supportPlannerStatus.tone}>
          {supportPlannerStatus.label}
        </TerasStatusPill>
      }
      description="Confirm the prototype identity and choose the support profile that generates Landing requirements."
      kicker="Landing Work"
      title="Landing Profile"
    >
      <TerasFieldStack spacing="loose">
        <TerasFieldGrid columns={2} spacing="compact">
          <TerasContentTray
            fit="fill"
            kicker="Entry Packet"
            title="Prototype identity"
          >
            <TerasFieldStack fill="last" spacing="compact">
              <TerasTextField
                disabled={!landingDraftMutable}
                label="Prototype name"
                onValueChange={(value) => onDraftChange("name", value)}
                value={activeLandingDraft.name}
              />
              <TerasTextField
                disabled={!landingDraftMutable}
                label="Owner"
                onValueChange={(value) => onDraftChange("owner", value)}
                value={activeLandingDraft.owner}
              />
              <TerasNoteField
                disabled={!landingDraftMutable}
                fill
                label="Prototype objective"
                onValueChange={(value) => onDraftChange("summary", value)}
                value={activeLandingDraft.summary}
              />
            </TerasFieldStack>
          </TerasContentTray>
          <TerasContentTray
            actions={
              <TerasActionButton
                onClick={onOpenSupportGuide}
                emphasis="secondary"
              >
                Support Guide
              </TerasActionButton>
            }
            kicker="Support Profile"
            title="Support profile configuration"
          >
            <TerasFieldStack>
              <TerasSelectField
                ariaLabel="Support profile"
                disabled={!landingDraftMutable}
                helper="Choose the support profile that seeds Landing rows."
                label="Support profile"
                onValueChange={(value) =>
                  onDraftChange(
                    "supportProfile",
                    value as PrototypeLandingDraft["supportProfile"],
                  )
                }
                options={prototypeSupportProfileOptions}
                tone="warn"
                treatment="highlighted"
                value={activeLandingDraft.supportProfile}
              />
              <TerasContentTray
                kicker="Support Row"
                title={supportOptionStatus.label}
                tone={supportProfileCustom ? "default" : "muted"}
              >
                <TerasFieldStack>
                  <TerasSelectField
                    ariaLabel="Landing support option"
                    disabled={
                      !supportRowContentMutable ||
                      supportAreaOptions.length === 0
                    }
                    helper={
                      supportProfileCustom
                        ? "Choose the support row to edit."
                        : "Rows are generated by the selected profile."
                    }
                    label="Support option"
                    onValueChange={(value) => {
                      if (visibleSupportRows.some((row) => row.id === value)) {
                        onSelectedSupportRowChange(
                          value as PrototypeSupportAreaId,
                        );
                      }
                    }}
                    options={supportAreaOptions}
                    {...(supportProfileCustom
                      ? {
                          tone: supportOptionStatus.tone,
                          treatment: "highlighted" as const,
                        }
                      : { treatment: "default" as const })}
                    value={
                      selectedSupportRow?.id ??
                      activeLandingDraft.supportRows[0]?.id ??
                      "source"
                    }
                  />
                  <TerasList>
                    <TerasStatusItem
                      tone={selectedSupportRowDisplay.tone}
                      detail={selectedSupportRowDisplay.summary}
                      label={selectedSupportRowDisplay.detail}
                      status={selectedSupportRowDisplay.status}
                    />
                  </TerasList>
                  {selectedSupportRow ? (
                    <TerasSelectField
                      ariaLabel={`${selectedSupportRow.label} support state`}
                      disabled={selectedSupportRowLocked}
                      helper={
                        supportProfileCustom
                          ? "Changes stay local until Landing is recorded."
                          : "Select Custom support profile to edit row states."
                      }
                      label="Support state"
                      onValueChange={(value) =>
                        onSupportRowStateChange(
                          selectedSupportRow.id,
                          value as PrototypeSupportState,
                        )
                      }
                      options={prototypeSupportStateOptions}
                      {...(!selectedSupportRowLocked
                        ? {
                            tone: supportStateStatus.tone,
                            treatment: "highlighted" as const,
                          }
                        : { treatment: "default" as const })}
                      value={selectedSupportRow.state}
                    />
                  ) : null}
                </TerasFieldStack>
              </TerasContentTray>
            </TerasFieldStack>
          </TerasContentTray>
        </TerasFieldGrid>
      </TerasFieldStack>
    </TerasWizardPanel>
  );
}
