"use client";

import { Fragment } from "react";

import { TerasContentTray, TerasSegmentedControl, TerasSelectableRow, TerasStatusPill, TerasTrayStack } from "@/teras";
import { BuildTreeEditorTree } from "@/product-apps/build-tree";
import { refinementBuildTreeLayout, refinementBuildTreeNode, refinementBuildTreeRole } from "../../../../../product-adapters/build-tree/index.ts";
import type { DeliveryRefinementTreeNode } from "../../../../../read-model/index.ts";
import { deliveryFieldDisplayLabel } from "../../../../../read-model/terms/copy.ts";
import { refinementSharedMetadataTargetGroups, type RefinementMetadataTarget } from "../../view-model/refinement-metadata-model.ts";
import type { RefinementMetadataFieldResolutionMap, RefinementMetadataSelectionMode } from "../../model/refinement-model.ts";
import { refinementFieldReviewLabel, refinementItemLabel, refinementItemSummary, refinementTargetNeedsReview } from "../../view-model/refinement-workbench-model.ts";

export function MetadataSelectionModeSwitch({ mode, onSelectMode }: {
  mode: RefinementMetadataSelectionMode;
  onSelectMode: (mode: RefinementMetadataSelectionMode) => void;
}) {
  return <TerasSegmentedControl ariaLabel="Metadata target selection mode" onValueChange={onSelectMode}
    options={[{value: "single", label: "One item"}, {value: "shared", label: "Multiple items"}]} value={mode} />;
}

export function MetadataTargetTree({ readOnly = false, metadataDraftValues, collapsedNodeIds, onToggleNode, filtered,
  visibleNodeIds, closedStoryGroups, onToggleStoryGroup, metadataSelectionMode, metadataFieldResolutions, node, onSelectMetadataField,
  onSelectItem, onToggleMetadataBulkNode, selectedBulkNodeIds, selectedNodeId, selectedFieldKey, targets,
}: {
  readOnly?: boolean;
  metadataDraftValues: Record<string, string>;
  collapsedNodeIds: string[];
  onToggleNode: (nodeId: string) => void;
  filtered: boolean;
  visibleNodeIds: string[];
  closedStoryGroups: string[];
  onToggleStoryGroup: (nodeId: string) => void;
  metadataSelectionMode: RefinementMetadataSelectionMode;
  metadataFieldResolutions: RefinementMetadataFieldResolutionMap;
  node: DeliveryRefinementTreeNode;
  onSelectMetadataField: (fieldKey: string) => void;
  onSelectItem: (nodeId: string) => void;
  onToggleMetadataBulkNode: (nodeId: string) => void;
  selectedBulkNodeIds: string[];
  selectedNodeId: string;
  selectedFieldKey: string | null;
  targets: RefinementMetadataTarget[];
}) {
  const tree = refinementBuildTreeNode(node);
  // The tree owns only ART nodes; field rows are presentation details, never children.
  function nodeIds(item: DeliveryRefinementTreeNode): string[] { return [item.id, ...(item.children ?? []).flatMap(nodeIds)]; }
  const ids = nodeIds(node);
  const noop = () => {};

  return <BuildTreeEditorTree
    structureLocked readOnly expansionLocked={filtered} branchLayout="stacked" mode="structured" tree={tree}
    addMenuNodeId={null} openDetailNodeId={null} showScaffoldAction={false}
    selectedNodeId={selectedNodeId} selectedNodeIds={metadataSelectionMode === "shared" ? selectedBulkNodeIds : [selectedNodeId]}
    visibleNodeIds={visibleNodeIds} expandedNodeIds={ids.filter(id => !collapsedNodeIds.includes(id))}
    structuredGroupIds={filtered ? ids : ids.filter(id => !closedStoryGroups.includes(id))}
    getNodeRole={refinementBuildTreeRole} getStructuredLayout={item => refinementBuildTreeLayout(item, visibleNodeIds)}
    getDisplayTitle={item => item.title} getKindLabel={(_kind, item) => refinementItemLabel(item)}
    getIndex={(item, position) => item.kind === "Epic" ? "E" : item.kind === "Risk" ? "R" : String(position + 1).padStart(2, "0")}
    getSummary={item => refinementItemSummary(item.description)}
    getChildCountLabel={item => `${item.children.length} work items`}
    getNodeMeta={item => {
      const fields = targets.filter(target => target.node.id === item.id);
      const blocked = fields.filter(target => target.status === "blocked").length;
      const open = fields.filter(target => refinementTargetNeedsReview(target, metadataFieldResolutions, metadataDraftValues)).length;
      return <>{item.children.length ? <span>{item.children.length} work items</span> : null}<TerasStatusPill size="compact" tone={blocked ? "danger" : open ? "warn" : "ok"}>{metadataSelectionMode === "shared" ? selectedBulkNodeIds.includes(item.id) ? "Selected" : "Select item" : blocked ? `${blocked} fields blocked` : open ? `${open} fields to review` : "Fields ready"}</TerasStatusPill></>;
    }}
    renderNodeDetails={item => metadataSelectionMode === "single" && item.id === selectedNodeId ?
      <MetadataTreeFields readOnly={readOnly} targets={targets.filter(target => target.node.id === item.id)} drafts={metadataDraftValues}
        resolutions={metadataFieldResolutions} selectedFieldKey={selectedFieldKey} onSelect={onSelectMetadataField} /> : null}
    getAddActions={() => []} getDraftPlaceholder={() => ""} getEditableTitlePlaceholder={() => ""}
    getTitleParts={item => ({ editable: item.title, locked: "" })}
    onStructuredNodeSelect={item => {
      if (collapsedNodeIds.includes(item.id)) onToggleNode(item.id);
      if (metadataSelectionMode === "shared") onToggleMetadataBulkNode(item.id); else onSelectItem(item.id);
    }}
    onToggleNode={item => onToggleNode(item.id)} onStructuredGroupSelect={item => onToggleStoryGroup(item.id)} onToggleStructuredGroup={item => onToggleStoryGroup(item.id)}
    onDeleteNode={noop} onFocusInlineTitle={noop} onInlineNodeSelect={noop} onOpenScaffold={noop}
    onToggleAddMenu={noop} onUpdateDraftBody={noop} onUpdateRemark={noop} onUpdateTitle={noop}
    copy={{ groupedLeafLabel: "User stories", groupedLeafIndexLabel: "US",
      groupedLeafTitle: count => `${count} user ${count === 1 ? "story" : "stories"}${filtered ? " shown" : ""}`,
      groupedLeafCollapsedDescription: "Expand to select a story and its fields.",
      groupedLeafExpandedDescription: "Select a story to view its fields.",
      groupedLeafEmptyDescription: "No user stories in this view.", supportGroupLabel: "Other work items" }}
  />;
}

export function MetadataTreeFields({ readOnly = false, targets, drafts, resolutions, selectedFieldKey, onSelect }: {
  readOnly?: boolean;
  targets: RefinementMetadataTarget[]; drafts: Record<string, string>; resolutions: RefinementMetadataFieldResolutionMap;
  selectedFieldKey: string | null; onSelect: (key: string) => void;
}) {
  const sorted = [...targets].sort((a,b) => Number(refinementTargetNeedsReview(b,resolutions,drafts)) - Number(refinementTargetNeedsReview(a,resolutions,drafts)));
  return <TerasContentTray kicker={readOnly ? "Metadata" : "Fields to review"} description={readOnly ? "Select a field to expand its full value." : "Select a field to inspect or change its value on the right."}>
    <TerasTrayStack spacing="compact">{sorted.map(target => {
      const value = drafts[target.key] ?? target.sourceValue;
      const status = refinementFieldReviewLabel(target, resolutions, drafts);
      return <Fragment key={target.key}><TerasSelectableRow ariaLabel={`${readOnly ? "View" : "Edit"} ${deliveryFieldDisplayLabel(target.field.label)} for ${refinementItemLabel(target.node)}`}
        aria-expanded={readOnly ? target.key === selectedFieldKey : undefined}
        label={deliveryFieldDisplayLabel(target.field.label)}
        detail={`${target.field.required ? "Required" : "Optional"} · ${value.trim() ? value.length > 70 ? `${value.slice(0,67)}…` : value : "Not set"}`}
        status={status} tone={target.status === "blocked" ? "danger" : refinementTargetNeedsReview(target,resolutions,drafts) ? "warn" : "ok"}
        selected={target.key === selectedFieldKey} onSelect={() => onSelect(target.key)} />
        {readOnly && target.key === selectedFieldKey ? <TerasContentTray title={deliveryFieldDisplayLabel(target.field.label)} descriptionFormat="lines" description={value || "Not set"} /> : null}
      </Fragment>;
    })}</TerasTrayStack>
  </TerasContentTray>;
}

export function SharedMetadataTreeFields({ targets, selectedIds, drafts, resolutions, selectedFieldKey, onSelect }: {
  targets: RefinementMetadataTarget[]; selectedIds: string[]; drafts: Record<string,string>;
  resolutions: RefinementMetadataFieldResolutionMap; selectedFieldKey: string | null; onSelect: (key: string) => void;
}) {
  const groups = refinementSharedMetadataTargetGroups(targets, selectedIds);
  return <TerasContentTray kicker="Fields for selected items"
    description={selectedIds.length < 2 ? "Select two or more work items below to see their common fields." : !groups.length ? "These items have no editable field in common. Change the selection or edit one item at a time." : `Choose one field to edit across exactly ${selectedIds.length} selected items.`}>
    {selectedIds.length >= 2 && groups.length ? <TerasTrayStack spacing="compact">{[...groups].sort((a,b) => Number(b.targets.some(t => refinementTargetNeedsReview(t,resolutions,drafts))) - Number(a.targets.some(t => refinementTargetNeedsReview(t,resolutions,drafts)))).map(group => {
      const open = group.targets.filter(t => refinementTargetNeedsReview(t,resolutions,drafts)).length;
      const blocked = group.targets.some(target => target.status === "blocked");
      const reviewed = group.targets.filter(target => resolutions[target.key] && resolutions[target.key] !== "ai_drafted").length;
      return <TerasSelectableRow key={group.identity} ariaLabel={`Edit shared ${deliveryFieldDisplayLabel(group.field.label)}`}
        label={deliveryFieldDisplayLabel(group.field.label)} detail={`${group.field.required ? "Required" : "Optional"} · ${group.targets.length} selected items`}
        status={blocked ? "Blocked" : open ? `${open} to review` : reviewed ? `${reviewed} reviewed` : "Current values"} tone={blocked ? "danger" : open ? "warn" : "ok"}
        selected={group.targets.some(target => target.key === selectedFieldKey)} onSelect={() => onSelect(group.targets[0].key)} />;
    })}</TerasTrayStack> : null}
  </TerasContentTray>;
}
