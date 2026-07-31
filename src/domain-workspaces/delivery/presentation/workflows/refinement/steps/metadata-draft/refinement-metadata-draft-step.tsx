"use client";

import { useState } from "react";

import { TerasZoneLayout } from "@/teras";
import type {
  DeliveryPackageSummary,
  DeliveryRefinementPacket,
} from "../../../../../read-model/index.ts";

import {
  refinementMetadataTargets,
  refinementSharedMetadataTargetGroups,
} from "../../view-model/refinement-metadata-model.ts";
import type {
  DeliveryRefinementModalStep,
  RefinementMetadataFieldResolution,
  RefinementMetadataFieldResolutionMap,
  RefinementMetadataSelectionMode,
} from "../../model/refinement-model.ts";
import { RefinementMetadataAdvisor } from "./refinement-metadata-advisor.tsx";
import { RefinementMetadataWorkbenchView } from "./refinement-metadata-workbench-view.tsx";
import { RefinementSelectedMetadataFieldEditor } from "./refinement-metadata-field-editor.tsx";

type RefinementAdvisorLine = {
  id: string;
  role: "advisor" | "operator";
  text: string;
};

export function RefinementMetadataDraftStep({
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
  resetMetadataDraftValue: (fieldKey: string, value: string) => void;
  resetMetadataDraftValues: (values: Record<string, string>) => void;
  selectedMetadataBulkNodeIds: string[];
  selectedMetadataFieldKey: string;
  setMetadataSelectionMode: (mode: RefinementMetadataSelectionMode) => void;
  setSelectedMetadataFieldKey: (fieldKey: string) => void;
  toggleMetadataBulkNode: (nodeId: string) => void;
  updateMetadataDraftValue: (fieldKey: string, value: string) => void;
  updateMetadataDraftValues: (fieldKeys: string[], value: string) => void;
}) {
  const [advisorCollapsed, setAdvisorCollapsed] = useState(true);
  const metadataTargets = refinementMetadataTargets(packet);
  const selectedMetadataTarget =
    metadataTargets.find((target) => target.key === selectedMetadataFieldKey) ??
    metadataTargets[0];
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
        ) ?? selectedSharedMetadataGroups[0])
      : undefined;
  const selectedMetadataDraftValue = selectedMetadataTarget
    ? (metadataDraftValues[selectedMetadataTarget.key] ??
      selectedMetadataTarget.sourceValue)
    : "";
  const metadataEditorCollapsed =
    activeStep === "metadata_draft" && !advisorCollapsed;
  const toggleAdvisorCollapsed = () =>
    setAdvisorCollapsed((current) => !current);

  return (
    <TerasZoneLayout variant="main-aside">
      <RefinementMetadataWorkbenchView
        deliveryPackage={deliveryPackage}
        metadataFieldResolutions={metadataFieldResolutions}
        metadataSelectionMode={metadataSelectionMode}
        onOpenHandoff={onOpenHandoff}
        onSelectMetadataField={setSelectedMetadataFieldKey}
        onSelectMetadataSelectionMode={setMetadataSelectionMode}
        onToggleMetadataBulkNode={toggleMetadataBulkNode}
        packet={packet}
        selectedMetadataBulkNodeIds={selectedMetadataBulkNodeIds}
        selectedMetadataFieldKey={selectedMetadataFieldKey}
      />
      <RefinementSelectedMetadataFieldEditor
        advisor={
          <RefinementMetadataAdvisor
            activeStep={activeStep}
            advisorTranscript={advisorTranscript}
            collapsed={advisorCollapsed}
            deliveryPackageName={deliveryPackage.display_name}
            draftValue={selectedMetadataDraftValue}
            markMetadataFieldResolution={markMetadataFieldResolution}
            markMetadataFieldResolutions={markMetadataFieldResolutions}
            onToggleCollapsed={toggleAdvisorCollapsed}
            selectedSharedMetadataGroup={selectedSharedMetadataGroup}
            selectedTarget={selectedMetadataTarget}
            updateMetadataDraftValue={updateMetadataDraftValue}
            updateMetadataDraftValues={updateMetadataDraftValues}
          />
        }
        draftValue={selectedMetadataDraftValue}
        editorCollapsed={metadataEditorCollapsed}
        metadataDraftValues={metadataDraftValues}
        metadataFieldResolutions={metadataFieldResolutions}
        metadataSelectionMode={metadataSelectionMode}
        onToggleEditorCollapsed={toggleAdvisorCollapsed}
        onMarkMetadataFieldResolution={markMetadataFieldResolution}
        onMarkMetadataFieldResolutions={markMetadataFieldResolutions}
        onResetMetadataDraftValue={resetMetadataDraftValue}
        onResetMetadataDraftValues={resetMetadataDraftValues}
        onReviewReadiness={onReviewReadiness}
        onSelectMetadataField={setSelectedMetadataFieldKey}
        onUpdateMetadataDraftValue={updateMetadataDraftValue}
        onUpdateMetadataDraftValues={updateMetadataDraftValues}
        packet={packet}
        selectedMetadataBulkNodeIds={selectedMetadataBulkNodeIds}
        selectedMetadataFieldKey={selectedMetadataFieldKey}
        selectedTarget={selectedMetadataTarget}
      />
    </TerasZoneLayout>
  );
}
