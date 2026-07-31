"use client";

import type { ReactNode } from "react";

import { TerasEmptyState, TerasPanelHeader, TerasPanelStack } from "@/teras";
import type { DeliveryRefinementPacket } from "../../../../../read-model/index.ts";

import {
  refinementMetadataTargets,
  type RefinementMetadataTarget,
} from "../../view-model/refinement-metadata-model.ts";
import type {
  RefinementMetadataFieldResolution,
  RefinementMetadataFieldResolutionMap,
  RefinementMetadataSelectionMode,
} from "../../model/refinement-model.ts";
import { SelectedMetadataEditor } from "./refinement-selected-metadata-editor.tsx";
import { SharedMetadataEditor } from "./refinement-shared-metadata-editor.tsx";
import { RefinementMetadataEditorPanel } from "./refinement-metadata-editor-panel.tsx";
import { MetadataEditorHeaderActions } from "./refinement-metadata-editor-controls.tsx";

export function RefinementSelectedMetadataFieldEditor({
  advisor,
  draftValue,
  editorCollapsed,
  metadataDraftValues,
  metadataFieldResolutions,
  metadataSelectionMode,
  onMarkMetadataFieldResolution,
  onMarkMetadataFieldResolutions,
  onResetMetadataDraftValue,
  onResetMetadataDraftValues,
  onReviewReadiness,
  onSelectMetadataField,
  onToggleEditorCollapsed,
  onUpdateMetadataDraftValues,
  onUpdateMetadataDraftValue,
  packet,
  selectedMetadataBulkNodeIds,
  selectedMetadataFieldKey,
  selectedTarget,
}: {
  advisor: ReactNode;
  draftValue: string;
  editorCollapsed: boolean;
  metadataDraftValues: Record<string, string>;
  metadataFieldResolutions: RefinementMetadataFieldResolutionMap;
  metadataSelectionMode: RefinementMetadataSelectionMode;
  onMarkMetadataFieldResolution: (
    fieldKey: string,
    resolution: RefinementMetadataFieldResolution,
  ) => void;
  onMarkMetadataFieldResolutions: (
    fieldKeys: string[],
    resolution: RefinementMetadataFieldResolution,
  ) => void;
  onResetMetadataDraftValue: (fieldKey: string, value: string) => void;
  onResetMetadataDraftValues: (values: Record<string, string>) => void;
  onReviewReadiness: () => void;
  onSelectMetadataField: (fieldKey: string) => void;
  onToggleEditorCollapsed: () => void;
  onUpdateMetadataDraftValues: (fieldKeys: string[], value: string) => void;
  onUpdateMetadataDraftValue: (fieldKey: string, value: string) => void;
  packet: DeliveryRefinementPacket;
  selectedMetadataBulkNodeIds: string[];
  selectedMetadataFieldKey: string;
  selectedTarget: RefinementMetadataTarget | undefined;
}) {
  const targets = refinementMetadataTargets(packet);

  if (metadataSelectionMode === "shared") {
    return (
      <SharedMetadataEditor
        advisor={advisor}
        editorCollapsed={editorCollapsed}
        metadataDraftValues={metadataDraftValues}
        metadataFieldResolutions={metadataFieldResolutions}
        onMarkMetadataFieldResolutions={onMarkMetadataFieldResolutions}
        onReviewReadiness={onReviewReadiness}
        onResetMetadataDraftValues={onResetMetadataDraftValues}
        onSelectMetadataField={onSelectMetadataField}
        onToggleEditorCollapsed={onToggleEditorCollapsed}
        onUpdateMetadataDraftValues={onUpdateMetadataDraftValues}
        selectedMetadataBulkNodeIds={selectedMetadataBulkNodeIds}
        selectedMetadataFieldKey={selectedMetadataFieldKey}
        targets={targets}
      />
    );
  }

  const selectedNodeTargets = selectedTarget
    ? targets.filter((target) => target.node.id === selectedTarget.node.id)
    : [];

  if (!selectedTarget) {
    return (
      <NoSelectedMetadataTarget
        advisor={advisor}
        editorCollapsed={editorCollapsed}
        onToggleEditorCollapsed={onToggleEditorCollapsed}
      />
    );
  }

  return (
    <SelectedMetadataEditor
      advisor={advisor}
      draftValue={draftValue}
      editorCollapsed={editorCollapsed}
      metadataFieldResolutions={metadataFieldResolutions}
      onMarkMetadataFieldResolution={onMarkMetadataFieldResolution}
      onResetMetadataDraftValue={onResetMetadataDraftValue}
      onReviewReadiness={onReviewReadiness}
      onSelectMetadataField={onSelectMetadataField}
      onToggleEditorCollapsed={onToggleEditorCollapsed}
      onUpdateMetadataDraftValue={onUpdateMetadataDraftValue}
      selectedMetadataFieldKey={selectedMetadataFieldKey}
      selectedNodeTargets={selectedNodeTargets}
      selectedTarget={selectedTarget}
    />
  );
}

function NoSelectedMetadataTarget({
  advisor,
  editorCollapsed,
  onToggleEditorCollapsed,
}: {
  advisor: ReactNode;
  editorCollapsed: boolean;
  onToggleEditorCollapsed: () => void;
}) {
  return (
    <TerasPanelStack fill={editorCollapsed ? "last" : "first"}>
      <RefinementMetadataEditorPanel
        area="field"
        collapsed={editorCollapsed}
        tone="warn"
      >
        <TerasPanelHeader
          actions={
            <MetadataEditorHeaderActions
              collapsed={editorCollapsed}
              onToggleCollapsed={onToggleEditorCollapsed}
              statusTone="warn"
            />
          }
          actionsLayout="inline"
          kicker="Selected Metadata Field"
          title="No field selected"
          description={
            editorCollapsed
              ? undefined
              : "Select an ART item from the Work Design handoff tree to inspect and edit its backend-safe metadata field."
          }
        />
        {editorCollapsed ? null : (
          <TerasEmptyState>
            Waiting for field. Field controls appear here after the operator
            selects a target.
          </TerasEmptyState>
        )}
      </RefinementMetadataEditorPanel>
      {advisor}
    </TerasPanelStack>
  );
}
