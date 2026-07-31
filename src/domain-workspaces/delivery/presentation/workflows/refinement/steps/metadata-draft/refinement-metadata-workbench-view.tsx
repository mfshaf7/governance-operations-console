"use client";

import {
  TerasPanel,
  TerasPanelHeader,
  TerasSubjectHero,
  TerasTrayStack,
  TerasZone,
} from "@/teras";
import type {
  DeliveryPackageSummary,
  DeliveryRefinementPacket,
} from "../../../../../read-model/index.ts";

import { refinementMetadataTargets } from "../../view-model/refinement-metadata-model.ts";
import type {
  RefinementMetadataFieldResolutionMap,
  RefinementMetadataSelectionMode,
} from "../../model/refinement-model.ts";
import {
  MetadataSelectionModeSwitch,
  MetadataTargetTree,
} from "./refinement-metadata-workbench-tree.tsx";
import { deliveryPackagePacketMetadata } from "../../../../shared/delivery-package-metadata.ts";

export function RefinementMetadataWorkbenchView({
  deliveryPackage,
  metadataFieldResolutions,
  metadataSelectionMode,
  onOpenHandoff,
  onSelectMetadataField,
  onSelectMetadataSelectionMode,
  onToggleMetadataBulkNode,
  packet,
  selectedMetadataBulkNodeIds,
  selectedMetadataFieldKey,
}: {
  deliveryPackage: DeliveryPackageSummary;
  metadataFieldResolutions: RefinementMetadataFieldResolutionMap;
  metadataSelectionMode: RefinementMetadataSelectionMode;
  onOpenHandoff: () => void;
  onSelectMetadataField: (fieldKey: string) => void;
  onSelectMetadataSelectionMode: (
    mode: RefinementMetadataSelectionMode,
  ) => void;
  onToggleMetadataBulkNode: (nodeId: string) => void;
  packet: DeliveryRefinementPacket;
  selectedMetadataBulkNodeIds: string[];
  selectedMetadataFieldKey: string;
}) {
  const targets = refinementMetadataTargets(packet);
  const selectedTarget =
    targets.find((target) => target.key === selectedMetadataFieldKey) ??
    targets[0];
  const selectedNodeId = selectedTarget?.node.id ?? packet.target_tree.id;

  return (
    <TerasZone fit="fill">
      <TerasSubjectHero
        actionDetail="Receipt and finalized brief source"
        actionLabel="View Work Design Handoff"
        onAction={onOpenHandoff}
        subject={{
          eyebrow: "Selected Package",
          meta: deliveryPackagePacketMetadata({
            deliveryPackage,
            packetId: packet.packet_id,
          }),
          title: deliveryPackage.display_name,
        }}
      />

      <TerasPanel
        frame="padded"
        treatment="state"
        layout="header-body-footer"
        overflow="hidden"
        spacing="compact"
        tone="info"
      >
        <TerasPanelHeader
          kicker="Metadata Workbench"
          actions={
            <MetadataSelectionModeSwitch
              mode={metadataSelectionMode}
              onSelectMode={onSelectMetadataSelectionMode}
            />
          }
          actionsLayout="inline"
          title="Handoff ART Tree"
          description={
            metadataSelectionMode === "shared"
              ? "Select ART items from the Work Design handoff tree, then edit only fields shared by that selected set."
              : "Select the ART item handed off from Work Design, then repair or accept that item's backend-safe metadata."
          }
        />
        <TerasTrayStack
          align="start"
          frame="thin"
          scroll
          spacing="comfortable"
          topOffset="normal"
        >
          <MetadataTargetTree
            metadataSelectionMode={metadataSelectionMode}
            metadataFieldResolutions={metadataFieldResolutions}
            node={packet.target_tree}
            onSelectMetadataField={onSelectMetadataField}
            onToggleMetadataBulkNode={onToggleMetadataBulkNode}
            position={0}
            selectedBulkNodeIds={selectedMetadataBulkNodeIds}
            selectedNodeId={selectedNodeId}
            targets={targets}
          />
        </TerasTrayStack>
      </TerasPanel>
    </TerasZone>
  );
}
