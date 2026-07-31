"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import {
  TerasActionButton,
  TerasActionRow,
  TerasSummaryCard,
  TerasSummaryCardGrid,
  TerasSubjectCard,
  TerasDialog,
  TerasPanelHeader,
  TerasPanelStack,
  TerasUtilityButton,
  TerasList,
  TerasSignalItem,
  TerasTrayStack,
} from "@/teras";

import {
  groupedRefinementSourceValues,
  refinementMissingSourceValueTone,
  refinementMetadataCollapsedValue,
  refinementSharedMetadataEditorDescription,
  refinementSharedMetadataGroupTone,
  refinementSharedMetadataStatusLabel,
  refinementSharedMetadataTargetGroups,
  refinementSourceValueMissing,
  refinementSourceValuePostureTone,
  refinementSourceValueRowProjection,
  uniqueRefinementMetadataValues,
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
import { SharedMetadataEmptyState } from "./refinement-shared-metadata-state.tsx";
import { RefinementMetadataEditorPanel } from "./refinement-metadata-editor-panel.tsx";

export function SharedMetadataEditor({
  advisor,
  editorCollapsed,
  metadataDraftValues,
  metadataFieldResolutions,
  onMarkMetadataFieldResolutions,
  onReviewReadiness,
  onResetMetadataDraftValues,
  onSelectMetadataField,
  onToggleEditorCollapsed,
  onUpdateMetadataDraftValues,
  selectedMetadataBulkNodeIds,
  selectedMetadataFieldKey,
  targets,
}: {
  advisor: ReactNode;
  editorCollapsed: boolean;
  metadataDraftValues: Record<string, string>;
  metadataFieldResolutions: RefinementMetadataFieldResolutionMap;
  onMarkMetadataFieldResolutions: (
    fieldKeys: string[],
    resolution: RefinementMetadataFieldResolution,
  ) => void;
  onReviewReadiness: () => void;
  onResetMetadataDraftValues: (values: Record<string, string>) => void;
  onSelectMetadataField: (fieldKey: string) => void;
  onToggleEditorCollapsed: () => void;
  onUpdateMetadataDraftValues: (fieldKeys: string[], value: string) => void;
  selectedMetadataBulkNodeIds: string[];
  selectedMetadataFieldKey: string;
  targets: RefinementMetadataTarget[];
}) {
  const sharedGroups = refinementSharedMetadataTargetGroups(
    targets,
    selectedMetadataBulkNodeIds,
  );
  const selectedGroup =
    sharedGroups.find((group) =>
      group.targets.some((target) => target.key === selectedMetadataFieldKey),
    ) ?? sharedGroups[0];
  const selectedCount = selectedMetadataBulkNodeIds.length;
  const [detailDialog, setDetailDialog] = useState<"selected-set" | null>(null);

  if (selectedCount < 2) {
    return (
      <SharedMetadataEmptyState
        fieldTone="muted"
        fieldTitle="No Shared Field Selected"
        fieldDescription="Shared field controls appear after at least two selected ART items have an editable field in common."
        fieldStatus="waiting"
        itemTone="info"
        itemTitle="Select Shared Targets"
        itemDescription="Select two or more ART items from the handoff tree to find metadata fields they share."
        advisor={advisor}
        editorCollapsed={editorCollapsed}
        onToggleEditorCollapsed={onToggleEditorCollapsed}
        selectedCount={selectedCount}
        sharedFieldCount={sharedGroups.length}
      >
        Shared mode is explicit. Use it only when several ART items should
        receive the same reviewed metadata value.
      </SharedMetadataEmptyState>
    );
  }

  if (!selectedGroup) {
    return (
      <SharedMetadataEmptyState
        fieldTone="warn"
        fieldTitle="No Shared Field"
        fieldDescription="Shared editing only opens when every selected ART item exposes the same metadata field."
        fieldStatus="unavailable"
        itemTone="warn"
        itemTitle="No Shared Fields"
        itemDescription="The selected ART items do not share an editable metadata field."
        advisor={advisor}
        editorCollapsed={editorCollapsed}
        onToggleEditorCollapsed={onToggleEditorCollapsed}
        selectedCount={selectedCount}
        sharedFieldCount={0}
      >
        No common field. Remove an item or return to single item editing.
      </SharedMetadataEmptyState>
    );
  }

  const selectedFieldKeys = selectedGroup.targets.map((target) => target.key);
  const draftValues = selectedGroup.targets.map(
    (target) => metadataDraftValues[target.key] ?? target.sourceValue,
  );
  const uniqueDraftValues = uniqueRefinementMetadataValues(draftValues);
  const sourceValueGroups = groupedRefinementSourceValues(
    selectedGroup.targets,
  );
  const sourceValueCount = sourceValueGroups.length;
  const missingSourceValueCount = selectedGroup.targets.filter((target) =>
    refinementSourceValueMissing(target.sourceValue),
  ).length;
  const mixedDraftValues = uniqueDraftValues.length > 1;
  const sharedDraftValue = mixedDraftValues ? "" : (uniqueDraftValues[0] ?? "");
  const blocked = selectedGroup.targets.some(
    (target) => target.status === "blocked",
  );
  const edited = selectedGroup.targets.some((target, index) => {
    const draftValue = draftValues[index] ?? "";

    return draftValue.trim() !== target.sourceValue.trim();
  });
  const statusTone = refinementSharedMetadataGroupTone({
    group: selectedGroup,
    resolutions: metadataFieldResolutions,
  });
  const canAcceptSharedCurrentValues =
    !blocked &&
    !mixedDraftValues &&
    !edited &&
    selectedGroup.targets.every(
      (target) =>
        target.status !== "missing" && target.sourceValue.trim().length > 0,
    );
  const sharedValueCanConfirm =
    !blocked &&
    sharedDraftValue.trim().length > 0 &&
    (canAcceptSharedCurrentValues || edited || mixedDraftValues) &&
    (selectedGroup.field.field_kind !== "generated" || !edited);
  const canResetSharedValue =
    !blocked && edited && selectedGroup.field.field_kind !== "generated";
  const confirmResolution: RefinementMetadataFieldResolution =
    edited || mixedDraftValues ? "repaired" : "accepted";
  const showActionRow =
    blocked || mixedDraftValues || sharedValueCanConfirm || canResetSharedValue;
  const statusLabel = refinementSharedMetadataStatusLabel({
    blocked,
    mixedDraftValues,
  });

  return (
    <>
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
            title={selectedGroup.field.label}
            description={refinementMetadataCollapsedValue({
              collapsed: editorCollapsed,
              value: refinementSharedMetadataEditorDescription({
                blocked,
                mixedDraftValues,
              }),
            })}
          />

          {editorCollapsed ? null : (
            <>
              <TerasTrayStack align="start" scroll spacing="loose">
                <TerasSubjectCard
                  actions={
                    <TerasUtilityButton
                      onClick={() => setDetailDialog("selected-set")}
                    >
                      Review
                    </TerasUtilityButton>
                  }
                  description="Review item and current value mapping before shared apply."
                  kicker="Selected Set Review"
                  title={`${selectedGroup.targets.length} items mapped to ${selectedGroup.field.label}`}
                />

                <MetadataValueControl
                  blocked={blocked}
                  draftValue={sharedDraftValue}
                  field={selectedGroup.field}
                  onUpdateMetadataDraftValue={(value) =>
                    onUpdateMetadataDraftValues(selectedFieldKeys, value)
                  }
                />

                <TerasTrayStack
                  align="start"
                  frame="thin"
                  scroll
                  scrollHeight="short"
                  spacing="compact"
                >
                  {sharedGroups.map((group) => {
                    const groupTone = refinementSharedMetadataGroupTone({
                      group,
                      resolutions: metadataFieldResolutions,
                    });
                    const selected = group.identity === selectedGroup.identity;

                    return (
                      <MetadataFieldSelectorButton
                        detail={group.group.title}
                        key={group.identity}
                        label={group.field.label}
                        onSelect={() =>
                          onSelectMetadataField(group.targets[0].key)
                        }
                        selected={selected}
                        status={`${group.targets.length} items`}
                        tone={groupTone}
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
                      {canResetSharedValue ? (
                        <TerasActionButton
                          onClick={() =>
                            onResetMetadataDraftValues(
                              Object.fromEntries(
                                selectedGroup.targets.map((target) => [
                                  target.key,
                                  target.sourceValue,
                                ]),
                              ),
                            )
                          }
                          emphasis="secondary"
                        >
                          Reset
                        </TerasActionButton>
                      ) : null}
                      <TerasActionButton
                        disabled={!sharedValueCanConfirm}
                        onClick={() =>
                          onMarkMetadataFieldResolutions(
                            selectedFieldKeys,
                            confirmResolution,
                          )
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
      <TerasDialog
        contentOverflow="auto"
        height="content"
        width="standard"
        closeLabel="Close selected set review"
        description="Review selected items and current values before shared apply."
        kicker="Shared Target Set"
        onClose={() => setDetailDialog(null)}
        open={detailDialog === "selected-set"}
        title="Selected Set Review"
      >
        <TerasTrayStack spacing="loose">
          <TerasSummaryCardGrid density="compact">
            <TerasSummaryCard
              label="Selected"
              tone="info"
              value={selectedGroup.targets.length}
            />
            <TerasSummaryCard
              label="Values"
              tone={refinementSourceValuePostureTone({
                missingCount: missingSourceValueCount,
                selectedCount: selectedGroup.targets.length,
                valueCount: sourceValueCount,
              })}
              value={sourceValueCount}
            />
            <TerasSummaryCard
              label="Missing"
              tone={refinementMissingSourceValueTone(missingSourceValueCount)}
              value={missingSourceValueCount}
            />
          </TerasSummaryCardGrid>
          <TerasList frame="contained">
            {selectedGroup.targets.map((target) => {
              const sourceValueRow = refinementSourceValueRowProjection(target);

              return (
                <TerasSignalItem
                  statusLabel={sourceValueRow.action}
                  detail={sourceValueRow.detail}
                  key={`selected-${target.key}`}
                  label={target.group.title}
                  meta={`${target.path.map((item) => item.kind).join(" / ")} / ${selectedGroup.field.label}`}
                  title={target.node.title}
                  tone={sourceValueRow.tone}
                />
              );
            })}
          </TerasList>
        </TerasTrayStack>
      </TerasDialog>
    </>
  );
}
