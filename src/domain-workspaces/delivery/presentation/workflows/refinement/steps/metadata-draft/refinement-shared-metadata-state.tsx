"use client";

import type { ReactNode } from "react";

import {
  TerasSubjectCard,
  TerasEmptyState,
  TerasPanelHeader,
  TerasPanelStack,
  TerasTrayStack,
} from "@/teras";

import { RefinementMetadataEditorPanel } from "./refinement-metadata-editor-panel.tsx";
import { MetadataEditorHeaderActions } from "./refinement-metadata-editor-controls.tsx";
import {
  refinementMetadataCollapsedValue,
  refinementSharedTargetSetSummaryProjection,
} from "../../view-model/refinement-metadata-model.ts";

export function SharedMetadataEmptyState({
  advisor,
  children,
  editorCollapsed,
  fieldDescription,
  fieldStatus,
  fieldTitle,
  fieldTone,
  itemDescription,
  itemTitle,
  onToggleEditorCollapsed,
  selectedCount,
  sharedFieldCount,
}: {
  advisor: ReactNode;
  children: ReactNode;
  editorCollapsed: boolean;
  fieldDescription: string;
  fieldStatus: string;
  fieldTitle: string;
  fieldTone: "info" | "muted" | "warn";
  itemDescription: string;
  itemTitle: string;
  itemTone: "info" | "warn";
  onToggleEditorCollapsed: () => void;
  selectedCount: number;
  sharedFieldCount: number;
}) {
  return (
    <TerasPanelStack fill={editorCollapsed ? "last" : "first"}>
      <RefinementMetadataEditorPanel
        area="field"
        collapsed={editorCollapsed}
        tone={fieldTone}
      >
        <TerasPanelHeader
          actions={
            <MetadataEditorHeaderActions
              collapsed={editorCollapsed}
              onToggleCollapsed={onToggleEditorCollapsed}
              statusLabel={refinementMetadataCollapsedValue({
                collapsed: editorCollapsed,
                value: fieldStatus,
              })}
              statusTone={fieldTone}
            />
          }
          actionsLayout="inline"
          kicker="Selected Metadata Field"
          statusTone={fieldTone}
          title={fieldTitle}
          description={refinementMetadataCollapsedValue({
            collapsed: editorCollapsed,
            value: fieldDescription,
          })}
        />
        {editorCollapsed ? null : (
          <TerasTrayStack spacing="loose">
            <SharedTargetSetSummary
              description={itemDescription}
              selectedCount={selectedCount}
              sharedFieldCount={sharedFieldCount}
              title={itemTitle}
            />
            <TerasEmptyState>{children}</TerasEmptyState>
            <TerasEmptyState>
              {fieldStatus === "waiting"
                ? "Waiting for shared target set. The field editor stays disabled until the selected set is valid."
                : "Adjust target set. The selected set has no common field to edit safely."}
            </TerasEmptyState>
          </TerasTrayStack>
        )}
      </RefinementMetadataEditorPanel>
      {advisor}
    </TerasPanelStack>
  );
}

export function SharedTargetSetSummary({
  description,
  selectedCount,
  sharedFieldCount,
  title,
}: {
  description?: string;
  selectedCount: number;
  sharedFieldCount: number;
  title?: string;
}) {
  const summary = refinementSharedTargetSetSummaryProjection({
    description,
    selectedCount,
    sharedFieldCount,
    title,
  });

  return (
    <TerasSubjectCard
      kicker="Selected Target Count"
      title={summary.title}
      description={summary.description}
    />
  );
}
