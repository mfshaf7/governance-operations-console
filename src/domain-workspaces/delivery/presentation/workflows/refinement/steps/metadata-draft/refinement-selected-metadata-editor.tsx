"use client";

import { deliveryFieldDisplayLabel } from "../../../../../read-model/terms/copy.ts";

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
  refinementSelectedMetadataEditorDescription,
  type RefinementMetadataTarget,
} from "../../view-model/refinement-metadata-model.ts";
import type {
  RefinementMetadataFieldResolution,
  RefinementMetadataFieldResolutionMap,
} from "../../model/refinement-model.ts";
import {
  MetadataEditorHeaderActions,
  MetadataValueControl,
} from "./refinement-metadata-editor-controls.tsx";
import { RefinementMetadataEditorPanel } from "./refinement-metadata-editor-panel.tsx";
import { RefinementWorkItemDetails } from "./refinement-work-item-details.tsx";
import { refinementFieldReviewLabel, refinementItemLabel, refinementValueError, refinementPlanningValueError, refinementPlanningField } from "../../view-model/refinement-workbench-model.ts";

export function SelectedMetadataEditor({
  metadataDraftValues,
  readOnly = false,
  advisor,
  draftValue,
  editorCollapsed,
  metadataFieldResolutions,
  onMarkMetadataFieldResolution,
  onResetMetadataDraftValue,
  onReviewReadiness,
  onToggleEditorCollapsed,
  onUpdateMetadataDraftValue,
  selectedTarget,
  targets, planningRules,
}: {
  metadataDraftValues: Record<string, string>;
  readOnly?: boolean;
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
  onToggleEditorCollapsed: () => void;
  onUpdateMetadataDraftValue: (fieldKey: string, value: string) => void;
  selectedTarget: RefinementMetadataTarget;
  targets: RefinementMetadataTarget[];
  planningRules?: { backlog_iteration_label: string; iteration_prefix_templates: string[] };
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
  const valueError = refinementValueError(field, draftValue) ?? refinementPlanningValueError(selectedTarget, targets, metadataDraftValues, planningRules);
  const workbenchValueCanConfirm =
    !blocked &&
    !valueError &&
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
  const statusLabel = refinementFieldReviewLabel(selectedTarget, metadataFieldResolutions, metadataDraftValues);

  return (
    <TerasPanelStack scroll minimumFillHeight="medium" fill="last">
      <RefinementMetadataEditorPanel
        area="field"
        hasActions={showActionRow}
        collapsed={editorCollapsed}
        tone={statusTone}
      >
        <TerasPanelHeader
            actions={<MetadataEditorHeaderActions
              collapsed={editorCollapsed}
              onToggleCollapsed={onToggleEditorCollapsed}
              statusLabel={refinementMetadataCollapsedValue({ collapsed: editorCollapsed, value: statusLabel })}
              statusTone={statusTone}
            />}
            actionsLayout="inline"
            kicker="Selected field"
            statusTone={statusTone}
            title={deliveryFieldDisplayLabel(field.label)}
            description={refinementMetadataCollapsedValue({ collapsed: editorCollapsed, value: refinementSelectedMetadataEditorDescription({ blocked, resolution }) })}
          />

        {editorCollapsed ? null : (
          <>
            <TerasTrayStack align="start" scroll spacing="loose">
              <TerasSubjectCard
                kicker="Selected work item"
                description={refinementItemLabel(node)}
                title={node.title}
                actions={<RefinementWorkItemDetails node={node} />}
              />

              {valueError && draftValue.trim() ? <TerasContentTray kicker="Check this value" description={valueError} /> : null}

              <MetadataValueControl
                blocked={readOnly || blocked}
                draftValue={draftValue}
                field={refinementPlanningField(selectedTarget, targets, metadataDraftValues, planningRules)}
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

            </TerasTrayStack>

            {showActionRow ? (
              <TerasActionRow spacing="none">
                {blocked ? (
                  <TerasActionButton
                    disabled={readOnly}
                    onClick={onReviewReadiness}
                    emphasis="secondary"
                  >
                    Review Gate
                  </TerasActionButton>
                ) : (
                  <>
                    {canResetWorkbenchValue ? (
                      <TerasActionButton
                        disabled={readOnly}
                        onClick={() =>
                          onResetMetadataDraftValue(key, sourceValue)
                        }
                        emphasis="secondary"
                      >
                        Reset
                      </TerasActionButton>
                    ) : null}
                    <TerasActionButton
                      disabled={readOnly || !workbenchValueCanConfirm}
                      onClick={() =>
                        onMarkMetadataFieldResolution(key, confirmResolution)
                      }
                      emphasis="primary"
                    >
                      Mark reviewed
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
