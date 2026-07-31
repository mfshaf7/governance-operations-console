"use client";

import type { ReactNode } from "react";

import {
  TerasActionButton,
  TerasActionRow,
  TerasSubjectCard,
  TerasContentTray,
  TerasPanelHeader,
  TerasPanelStack,
  TerasTrayStack,
} from "@/teras";

import {
  refinementFieldStatusTone,
  refinementMetadataCollapsedValue,
  refinementMetadataResolutionLabel,
  refinementSelectedMetadataEditorDescription,
  type RefinementMetadataTarget,
} from "../../view-model/refinement-metadata-model.ts";
import type {
  RefinementMetadataFieldResolution,
  RefinementMetadataFieldResolutionMap,
} from "../../model/refinement-model.ts";
import {
  MetadataFieldSelectorButton,
  MetadataEditorHeaderActions,
  MetadataValueControl,
} from "./refinement-metadata-editor-controls.tsx";
import { RefinementMetadataEditorPanel } from "./refinement-metadata-editor-panel.tsx";

export function SelectedMetadataEditor({
  advisor,
  draftValue,
  editorCollapsed,
  metadataFieldResolutions,
  onMarkMetadataFieldResolution,
  onResetMetadataDraftValue,
  onReviewReadiness,
  onSelectMetadataField,
  onToggleEditorCollapsed,
  onUpdateMetadataDraftValue,
  selectedMetadataFieldKey,
  selectedNodeTargets,
  selectedTarget,
}: {
  advisor: ReactNode;
  draftValue: string;
  editorCollapsed: boolean;
  metadataFieldResolutions: RefinementMetadataFieldResolutionMap;
  onMarkMetadataFieldResolution: (
    fieldKey: string,
    resolution: RefinementMetadataFieldResolution,
  ) => void;
  onResetMetadataDraftValue: (fieldKey: string, value: string) => void;
  onReviewReadiness: () => void;
  onSelectMetadataField: (fieldKey: string) => void;
  onToggleEditorCollapsed: () => void;
  onUpdateMetadataDraftValue: (fieldKey: string, value: string) => void;
  selectedMetadataFieldKey: string;
  selectedNodeTargets: RefinementMetadataTarget[];
  selectedTarget: RefinementMetadataTarget;
}) {
  const { field, key, node, sourceValue, status } = selectedTarget;
  const fieldNeedsAction = status !== "complete";
  const blocked = status === "blocked";
  const resolution = metadataFieldResolutions[key];
  const statusTone = refinementFieldStatusTone({
    resolution,
    status,
  });
  const edited = draftValue.trim() !== sourceValue.trim();
  const aiDrafted = resolution === "ai_drafted";
  const workbenchValueCanConfirm =
    !blocked &&
    draftValue.trim().length > 0 &&
    (fieldNeedsAction || edited) &&
    (field.field_kind !== "generated" || !edited);
  const canResetWorkbenchValue =
    !blocked && edited && field.field_kind !== "generated";
  const confirmResolution: RefinementMetadataFieldResolution = edited
    ? "repaired"
    : "accepted";
  const showActionRow =
    blocked || workbenchValueCanConfirm || canResetWorkbenchValue;
  const statusLabel = resolution
    ? refinementMetadataResolutionLabel(resolution)
    : status;

  return (
    <TerasPanelStack fill={editorCollapsed ? "last" : "first"}>
      <RefinementMetadataEditorPanel
        area="field"
        collapsed={editorCollapsed}
        tone={statusTone}
      >
        <TerasPanelHeader
          actions={
            <MetadataEditorHeaderActions
              collapsed={editorCollapsed}
              onToggleCollapsed={onToggleEditorCollapsed}
              statusLabel={refinementMetadataCollapsedValue({
                collapsed: editorCollapsed,
                value: statusLabel,
              })}
              statusTone={statusTone}
            />
          }
          actionsLayout="inline"
          kicker="Selected Metadata Field"
          statusTone={statusTone}
          title={field.label}
          description={refinementMetadataCollapsedValue({
            collapsed: editorCollapsed,
            value: refinementSelectedMetadataEditorDescription({
              blocked,
              resolution,
            }),
          })}
        />

        {editorCollapsed ? null : (
          <>
            <TerasTrayStack align="start" scroll spacing="loose">
              <TerasSubjectCard
                kicker="Target Record"
                description={node.description}
                title={node.title}
              />

              <MetadataValueControl
                blocked={blocked}
                draftValue={draftValue}
                field={field}
                onUpdateMetadataDraftValue={(value) =>
                  onUpdateMetadataDraftValue(key, value)
                }
              />

              {aiDrafted ? (
                <TerasContentTray
                  description="Drafted by the locked Refinement Advisor from local Work Design handoff and ART metadata context. Review this value before Apply Refinement."
                  kicker="AI Draft Source"
                />
              ) : null}

              <TerasTrayStack
                align="start"
                frame="thin"
                scroll
                scrollHeight="short"
                spacing="compact"
              >
                {selectedNodeTargets.map((target) => {
                  const targetResolution = metadataFieldResolutions[target.key];
                  const targetTone = refinementFieldStatusTone({
                    resolution: targetResolution,
                    status: target.status,
                  });

                  return (
                    <MetadataFieldSelectorButton
                      detail={target.group.title}
                      key={target.key}
                      label={target.field.label}
                      onSelect={() => onSelectMetadataField(target.key)}
                      selected={selectedMetadataFieldKey === target.key}
                      status={
                        targetResolution
                          ? refinementMetadataResolutionLabel(targetResolution)
                          : target.status
                      }
                      tone={targetTone}
                    />
                  );
                })}
              </TerasTrayStack>
            </TerasTrayStack>

            {showActionRow ? (
              <TerasActionRow spacing="none">
                {blocked ? (
                  <TerasActionButton
                    onClick={onReviewReadiness}
                    emphasis="secondary"
                  >
                    Review Gate
                  </TerasActionButton>
                ) : (
                  <>
                    {canResetWorkbenchValue ? (
                      <TerasActionButton
                        onClick={() =>
                          onResetMetadataDraftValue(key, sourceValue)
                        }
                        emphasis="secondary"
                      >
                        Reset
                      </TerasActionButton>
                    ) : null}
                    <TerasActionButton
                      disabled={!workbenchValueCanConfirm}
                      onClick={() =>
                        onMarkMetadataFieldResolution(key, confirmResolution)
                      }
                      emphasis="primary"
                    >
                      Confirm
                    </TerasActionButton>
                  </>
                )}
              </TerasActionRow>
            ) : null}
          </>
        )}
      </RefinementMetadataEditorPanel>
      {advisor}
    </TerasPanelStack>
  );
}
