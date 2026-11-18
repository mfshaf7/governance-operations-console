"use client";

import { useState } from "react";

import { TerasContentTray, TerasPanelHeader, TerasPanelStack, TerasSubjectHero, TerasZone, TerasZoneLayout } from "@/teras";
import type {
  DeliveryPackageSummary,
  DeliveryRefinementPacket,
} from "../../../../../read-model/index.ts";

import {
  refinementMetadataTargets,
  refinementTargetNodes,
  refinementSharedMetadataTargetGroups,
} from "../../view-model/refinement-metadata-model.ts";
import type {
  DeliveryRefinementModalStep,
  RefinementMetadataFieldResolution,
  RefinementMetadataFieldResolutionMap,
  RefinementMetadataSelectionMode,
} from "../../model/refinement-model.ts";
import type {
  RefinementAssistCommand,
  RefinementLiveMode,
  RefinementOosAssistResult,
} from "../../../../../live-runtime/refinement-live-types.ts";
import { RefinementMetadataEditorPanel } from "./refinement-metadata-editor-panel.tsx";
import { RefinementWorkItemDetails } from "./refinement-work-item-details.tsx";
import { refinementItemLabel, refinementItemSummary } from "../../view-model/refinement-workbench-model.ts";
import { RefinementMetadataAdvisor } from "./refinement-metadata-advisor.tsx";
import { RefinementMetadataWorkbenchView } from "./refinement-metadata-workbench-view.tsx";
import { RefinementSelectedMetadataFieldEditor } from "./refinement-metadata-field-editor.tsx";

type RefinementAdvisorLine = {
  id: string;
  role: "advisor" | "operator";
  text: string;
};

export function RefinementMetadataDraftStep({
  readOnly = false,
  activeStep,
  advisorTranscript,
  deliveryPackage,
  markMetadataFieldResolution,
  markMetadataFieldResolutions,
  metadataDraftValues,
  metadataFieldResolutions,
  metadataSelectionMode,
  onOpenHandoff,
  onReviewReadiness,
  packet,
  requestMetadataAdvice,
  runtimeMode,
  runtimeStatus,
  resetMetadataDraftValue,
  resetMetadataDraftValues,
  selectedMetadataBulkNodeIds,
  selectedMetadataFieldKey,
  setMetadataSelectionMode,
  setSelectedMetadataFieldKey,
  toggleMetadataBulkNode,
  updateMetadataDraftValue,
  updateMetadataDraftValues,
}: {
  readOnly?: boolean;
  activeStep: DeliveryRefinementModalStep;
  advisorTranscript: RefinementAdvisorLine[];
  deliveryPackage: DeliveryPackageSummary;
  markMetadataFieldResolution: (
    fieldKey: string,
    resolution: RefinementMetadataFieldResolution,
  ) => void;
  markMetadataFieldResolutions: (
    fieldKeys: string[],
    resolution: RefinementMetadataFieldResolution,
  ) => void;
  metadataDraftValues: Record<string, string>;
  metadataFieldResolutions: RefinementMetadataFieldResolutionMap;
  metadataSelectionMode: RefinementMetadataSelectionMode;
  onOpenHandoff: () => void;
  onReviewReadiness: () => void;
  packet: DeliveryRefinementPacket;
  requestMetadataAdvice: (
    command: RefinementAssistCommand,
  ) => Promise<{
    mode: RefinementLiveMode;
    result: RefinementOosAssistResult | null;
  }>;
  resetMetadataDraftValue: (fieldKey: string, value: string) => void;
  resetMetadataDraftValues: (values: Record<string, string>) => void;
  runtimeMode: RefinementLiveMode;
  runtimeStatus: "current" | "offline";
  selectedMetadataBulkNodeIds: string[];
  selectedMetadataFieldKey: string;
  setMetadataSelectionMode: (mode: RefinementMetadataSelectionMode) => void;
  setSelectedMetadataFieldKey: (fieldKey: string) => void;
  toggleMetadataBulkNode: (nodeId: string) => void;
  updateMetadataDraftValue: (fieldKey: string, value: string) => void;
  updateMetadataDraftValues: (fieldKeys: string[], value: string) => void;
}) {
  const [advisorCollapsed, setAdvisorCollapsed] = useState(false);
  const [metadataEditorCollapsed, setMetadataEditorCollapsed] = useState(false);
  const metadataTargets = refinementMetadataTargets(packet);
  const selectedMetadataTarget =
    metadataTargets.find((target) => target.key === selectedMetadataFieldKey);
  const [focusedItemId, setFocusedItemId] = useState(selectedMetadataTarget?.node.id ?? packet.target_tree.id);
  const [fieldSelected, setFieldSelected] = useState(false);
  const focusedItem = refinementTargetNodes(packet.target_tree).find(item => item.node.id === focusedItemId)?.node ?? packet.target_tree;
  const selectItem = (nodeId: string) => { setFocusedItemId(nodeId); setFieldSelected(false); };
  const selectField = (key: string) => {
    const target = metadataTargets.find(item => item.key === key);
    if (!target) return;
    setSelectedMetadataFieldKey(key); setFocusedItemId(target.node.id); setFieldSelected(true); setMetadataEditorCollapsed(false);
  };
  const selectedSharedMetadataGroups = refinementSharedMetadataTargetGroups(
    metadataTargets,
    selectedMetadataBulkNodeIds,
  );
  const selectedSharedMetadataGroup =
    metadataSelectionMode === "shared"
      ? (selectedSharedMetadataGroups.find((group) =>
          group.targets.some(
            (target) => target.key === selectedMetadataFieldKey,
          ),
        ))
      : undefined;
  const hasSelectedField = fieldSelected && Boolean(metadataSelectionMode === "shared" ? selectedSharedMetadataGroup : selectedMetadataTarget);
  const selectedMetadataDraftValue = selectedMetadataTarget
    ? (metadataDraftValues[selectedMetadataTarget.key] ??
      selectedMetadataTarget.sourceValue)
    : "";
  const toggleAdvisorCollapsed = () =>
    setAdvisorCollapsed((current) => !current);

  const advisor = (
    <RefinementMetadataAdvisor
      readOnly={readOnly}
      sourceRef={deliveryPackage.source_ref}
      sourceRevision={packet.packet_revision ?? packet.last_saved_at}
      metadataDraftValues={metadataDraftValues}
      contextTargets={metadataTargets}
      activeStep={activeStep}
      advisorTranscript={advisorTranscript}
      collapsed={advisorCollapsed}
      deliveryPackageName={deliveryPackage.display_name}
      draftValue={selectedMetadataDraftValue}
      markMetadataFieldResolution={markMetadataFieldResolution}
      markMetadataFieldResolutions={markMetadataFieldResolutions}
      onToggleCollapsed={toggleAdvisorCollapsed}
      requestMetadataAdvice={requestMetadataAdvice}
      runtimeMode={runtimeMode}
      runtimeStatus={runtimeStatus}
      selectedSharedMetadataGroup={hasSelectedField && metadataSelectionMode === "shared" ? selectedSharedMetadataGroup : undefined}
      selectedTarget={hasSelectedField && metadataSelectionMode === "single" ? selectedMetadataTarget : undefined}
      updateMetadataDraftValue={updateMetadataDraftValue}
      updateMetadataDraftValues={updateMetadataDraftValues}
    />
  );

  return (
    <TerasZoneLayout variant="main-aside">
      <RefinementMetadataWorkbenchView
        metadataDraftValues={metadataDraftValues}
        metadataFieldResolutions={metadataFieldResolutions}
        metadataSelectionMode={metadataSelectionMode}
        onSelectMetadataField={selectField}
        onSelectMetadataSelectionMode={mode => { setMetadataSelectionMode(mode); setFieldSelected(false); }}
        onToggleMetadataBulkNode={id => { toggleMetadataBulkNode(id); selectItem(id); }}
        packet={packet}
        selectedMetadataBulkNodeIds={selectedMetadataBulkNodeIds}
        selectedMetadataFieldKey={hasSelectedField ? selectedMetadataFieldKey : null}
        focusedItemId={focusedItemId}
        onSelectItem={selectItem}
      />
      <TerasZone fit="fill">
        <TerasSubjectHero
          actionDetail="Receipt and finalized brief source"
          actionLabel="View Work Design Handoff"
          onAction={onOpenHandoff}
          subject={{
            eyebrow: "Selected Package",
            meta: [{ label: "Epic", value: `#${deliveryPackage.legacy_epic_id}` }],
            title: deliveryPackage.display_name,
          }}
        />
        {hasSelectedField ? <RefinementSelectedMetadataFieldEditor
          readOnly={readOnly}
          advisor={advisor}
          draftValue={selectedMetadataDraftValue}
          editorCollapsed={metadataEditorCollapsed}
          metadataDraftValues={metadataDraftValues}
          metadataFieldResolutions={metadataFieldResolutions}
          metadataSelectionMode={metadataSelectionMode}
          onToggleEditorCollapsed={() => setMetadataEditorCollapsed(current => !current)}
          onMarkMetadataFieldResolution={markMetadataFieldResolution}
          onMarkMetadataFieldResolutions={markMetadataFieldResolutions}
          onResetMetadataDraftValue={resetMetadataDraftValue}
          onResetMetadataDraftValues={resetMetadataDraftValues}
          onReviewReadiness={onReviewReadiness}
          onUpdateMetadataDraftValue={updateMetadataDraftValue}
          onUpdateMetadataDraftValues={updateMetadataDraftValues}
          packet={packet}
          selectedMetadataBulkNodeIds={selectedMetadataBulkNodeIds}
          selectedMetadataFieldKey={selectedMetadataFieldKey}
          selectedTarget={selectedMetadataTarget}
        /> : <TerasPanelStack scroll minimumFillHeight="medium" fill="last">
          <RefinementMetadataEditorPanel area="field" collapsed={false} tone="info">
            <TerasPanelHeader kicker={metadataSelectionMode === "shared" ? "Shared edit" : refinementItemLabel(focusedItem)}
              title={metadataSelectionMode === "shared" ? `${selectedMetadataBulkNodeIds.length} work items selected` : focusedItem.title}
              actions={metadataSelectionMode === "single" ? <RefinementWorkItemDetails node={focusedItem} /> : undefined}
              description={metadataSelectionMode === "shared" ? "Choose a common field from Fields for selected items. Only that selection will receive the draft value." : refinementItemSummary(focusedItem.description)} />
            <TerasContentTray kicker="Review fields" description={metadataSelectionMode === "shared" ? "Select at least two items, then choose a shared field on the left. Changes stay in your draft until Apply Refinement." : "Select a field beneath this item in the tree. Required and review statuses show what needs attention; current and optional values remain available."} />
          </RefinementMetadataEditorPanel>
          {advisor}
        </TerasPanelStack>}
      </TerasZone>
    </TerasZoneLayout>
  );
}
