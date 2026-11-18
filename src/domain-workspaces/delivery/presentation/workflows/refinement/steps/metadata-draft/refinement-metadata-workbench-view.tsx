"use client";
import { useState } from "react";

import {
  TerasPanel,
  TerasPanelHeader,
  TerasTrayStack,
  TerasZone,
  TerasTextField,
  TerasActionRow,
  TerasActionButton,
  TerasEmptyState,
} from "@/teras";
import type {
  DeliveryRefinementPacket,
} from "../../../../../read-model/index.ts";

import { refinementMetadataTargets, refinementTargetNodes } from "../../view-model/refinement-metadata-model.ts";
import { refinementVisibleTreeIds } from "../../view-model/refinement-workbench-model.ts";
import type {
  RefinementMetadataFieldResolutionMap,
  RefinementMetadataSelectionMode,
} from "../../model/refinement-model.ts";
import {
  MetadataSelectionModeSwitch,
  MetadataTargetTree,
  SharedMetadataTreeFields,
} from "./refinement-metadata-workbench-tree.tsx";

export function RefinementMetadataWorkbenchView({
  metadataDraftValues,
  metadataFieldResolutions,
  metadataSelectionMode,
  onSelectMetadataField,
  onSelectMetadataSelectionMode,
  onToggleMetadataBulkNode,
  packet,
  selectedMetadataBulkNodeIds,
  selectedMetadataFieldKey,
  focusedItemId,
  onSelectItem,
}: {
  metadataDraftValues: Record<string, string>;
  metadataFieldResolutions: RefinementMetadataFieldResolutionMap;
  metadataSelectionMode: RefinementMetadataSelectionMode;
  onSelectMetadataField: (fieldKey: string) => void;
  onSelectMetadataSelectionMode: (
    mode: RefinementMetadataSelectionMode,
  ) => void;
  onToggleMetadataBulkNode: (nodeId: string) => void;
  packet: DeliveryRefinementPacket;
  selectedMetadataBulkNodeIds: string[];
  selectedMetadataFieldKey: string | null;
  focusedItemId: string;
  onSelectItem: (nodeId: string) => void;
}) {
  const targets = refinementMetadataTargets(packet);
  const selectedTarget =
    targets.find((target) => target.key === selectedMetadataFieldKey) ??
    targets[0];
  const selectedNodeId = focusedItemId;
  const allNodes = refinementTargetNodes(packet.target_tree).map(item => item.node);
  const [query, setQuery] = useState("");
  const [needsReview, setNeedsReview] = useState(false);
  const [closedStoryGroups, setClosedStoryGroups] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState<string[]>(() => allNodes.filter(node => node.id !== packet.target_tree.id && node.children?.length && !selectedTarget?.path.some(parent => parent.id === node.id)).map(node => node.id));
  const visibleIds = refinementVisibleTreeIds(packet.target_tree, targets, metadataFieldResolutions, query, needsReview, metadataDraftValues);
  const filtered = Boolean(query.trim() || needsReview);
  const hiddenSelections = selectedMetadataBulkNodeIds.filter(id => !visibleIds.includes(id)).length;

  return (
    <TerasZone scroll fit="fill">
      <TerasPanel
        frame="padded"
        treatment="state"
        layout="header-toolbar-body"
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
          title="Work items"
          description={
            metadataSelectionMode === "shared"
              ? `${selectedMetadataBulkNodeIds.length} items selected${hiddenSelections ? ` (${hiddenSelections} hidden by filters)` : ""}. Select two or more items to edit one common field across that exact set.`
              : "Select a work item, then a field beneath it. Its value and guidance open on the right."
          }
        />
        <TerasTrayStack spacing="compact">
          <TerasTextField label="Find work items" type="search" value={query} onValueChange={setQuery} placeholder="Search titles, item numbers or descriptions" />
          <TerasActionRow spacing="compact">
            <TerasActionButton emphasis={needsReview ? "primary" : "secondary"} aria-pressed={needsReview} onClick={() => setNeedsReview(value => !value)}>Needs review</TerasActionButton>
            <TerasActionButton emphasis="secondary" disabled={filtered} onClick={() => { setCollapsed([]); setClosedStoryGroups([]); }}>Expand all</TerasActionButton>
            <TerasActionButton emphasis="secondary" disabled={filtered} onClick={() => setCollapsed(allNodes.filter(node => node.id !== packet.target_tree.id && node.children?.length).map(node => node.id))}>Collapse groups</TerasActionButton>
            {metadataSelectionMode === "shared" && selectedMetadataBulkNodeIds.length ? <TerasActionButton emphasis="secondary" onClick={() => selectedMetadataBulkNodeIds.forEach(onToggleMetadataBulkNode)}>Clear selection ({selectedMetadataBulkNodeIds.length})</TerasActionButton> : null}
          </TerasActionRow>
        </TerasTrayStack>
        <TerasTrayStack
          align="start"
          frame="thin"
          scroll
          spacing="comfortable"
          topOffset="normal"
        >
          {metadataSelectionMode === "shared" ? <SharedMetadataTreeFields targets={targets} selectedIds={selectedMetadataBulkNodeIds}
            drafts={metadataDraftValues} resolutions={metadataFieldResolutions} selectedFieldKey={selectedMetadataFieldKey} onSelect={onSelectMetadataField} /> : null}
          {visibleIds.length ? <MetadataTargetTree
            metadataDraftValues={metadataDraftValues}
            collapsedNodeIds={filtered ? [] : collapsed}
            filtered={filtered}
            closedStoryGroups={closedStoryGroups}
            onToggleStoryGroup={id => setClosedStoryGroups(values => values.includes(id) ? values.filter(value => value !== id) : [...values, id])}
            onToggleNode={id => setCollapsed(values => values.includes(id) ? values.filter(value => value !== id) : [...values, id])}
            visibleNodeIds={visibleIds}
            metadataSelectionMode={metadataSelectionMode}
            metadataFieldResolutions={metadataFieldResolutions}
            node={packet.target_tree}
            onSelectMetadataField={onSelectMetadataField}
            onToggleMetadataBulkNode={onToggleMetadataBulkNode}
            onSelectItem={onSelectItem}
            selectedFieldKey={selectedMetadataFieldKey}
            selectedBulkNodeIds={selectedMetadataBulkNodeIds}
            selectedNodeId={selectedNodeId}
            targets={targets}
          /> : <TerasEmptyState>No work items match. Clear the search or the Needs review filter to see the full tree.</TerasEmptyState>}
        </TerasTrayStack>
      </TerasPanel>
    </TerasZone>
  );
}
