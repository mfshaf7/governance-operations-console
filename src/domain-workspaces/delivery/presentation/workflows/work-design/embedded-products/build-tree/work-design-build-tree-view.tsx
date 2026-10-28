"use client";

import { useEffect, useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";

import {
  BuildTreeEditor,
  BuildTreeEditorTree,
  buildTreeEditorFieldProps,
} from "@/product-apps/build-tree";
import type { BuildTreeEditorTreeRole } from "@/product-apps/build-tree";

import type { WorkDesignFinalizedBrief } from "../../artifacts/context-brief/index.ts";
import { workDesignBuildTreeContextHandoffMetadata } from "./work-design-build-tree-view-model.ts";
import {
  TerasActionButton,
  TerasActionRow,
  TerasAdvisorPanel,
  TerasFieldStack,
  TerasMetadataList,
  TerasNoteField,
  TerasPanelHeader,
  TerasPanel,
  TerasPanelCollapseActions,
  TerasTextField,
} from "@/teras";
import {
  composeWorkDesignNodeTitle,
  workDesignDraftPlaceholder,
  workDesignEditableTitlePlaceholder,
  workDesignMetrics,
  workDesignNodeDisplayTitle,
  workDesignNodeIndex,
  workDesignNodeKindLabel,
  workDesignNodeSummary,
  workDesignNodeTitleParts,
  workDesignStructuredChildCountLabel,
  workDesignStructuredNodeLayout,
} from "../../../../../product-adapters/build-tree/index.ts";
import type {
  WorkDesignBuildTreeViewMode,
  WorkDesignNode,
  WorkDesignNodeKind,
} from "../../model/work-design-model.ts";

type WorkDesignAdvisorTranscriptLine = {
  id: string;
  role: "advisor" | "operator";
  text: string;
};

type WorkDesignContextDecisionCopy = {
  label: string;
  tone: "danger" | "info" | "muted" | "ok" | "stale" | "warn";
};

type WorkDesignBuildTreeViewProps = {
  contextFinalizedBriefAvailable?: boolean;
  readOnly?: boolean;
  treeAdvisorControls?: import("react").ComponentProps<typeof TerasAdvisorPanel>["draftControls"];
  addFeature: (parentId?: string) => void;
  addRiskBranch: (parentId?: string) => void;
  addStory: (parentId: string) => void;
  buildAdvisorPrompt: string;
  buildAdvisorTranscript: WorkDesignAdvisorTranscriptLine[];
  buildTreeViewMode: WorkDesignBuildTreeViewMode;
  contextDecisionCopy: WorkDesignContextDecisionCopy;
  contextFinalizedBrief: WorkDesignFinalizedBrief;
  contextSnapshotAttachmentStatusLabel: string;
  expandedNodeIds: string[];
  openDetailNodeId: string | null;
  openScaffold: (node?: WorkDesignNode) => void;
  requestDelete: (node: WorkDesignNode) => void;
  selectBuildTreeViewMode: (mode: WorkDesignBuildTreeViewMode) => void;
  selectWorkDesignNode: (
    nodeId: string,
    options?: { editorOpen?: boolean },
  ) => void;
  selectedDraftEditorOpen: boolean;
  selectedNode: WorkDesignNode;
  selectedNodeId: string;
  setBuildAdvisorPrompt: Dispatch<SetStateAction<string>>;
  setContextFinalizeDialogOpen: Dispatch<SetStateAction<boolean>>;
  setOpenDetailNodeId: Dispatch<SetStateAction<string | null>>;
  setSelectedDraftEditorOpen: Dispatch<SetStateAction<boolean>>;
  setTreeAddMenuNodeId: Dispatch<SetStateAction<string | null>>;
  structuredStoryGroupIds: string[];
  submitBuildAdvisorPrompt: (event: FormEvent<HTMLFormElement>) => void;
  toggleAllTreeNodes: () => void;
  toggleNodeExpansion: (nodeId: string) => void;
  toggleStructuredStoryGroup: (nodeId: string) => void;
  tree: WorkDesignNode;
  treeAddMenuNodeId: string | null;
  treeFullyExpanded: boolean;
  updateNodeDraftBody: (nodeId: string, value: string) => void;
  updateNodeRemark: (nodeId: string, value: string) => void;
  updateNodeTitle: (nodeId: string, value: string) => void;
};

export function WorkDesignBuildTreeView({
  contextFinalizedBriefAvailable = true,
  readOnly = false,
  treeAdvisorControls,
  addFeature,
  addRiskBranch,
  addStory,
  buildAdvisorPrompt,
  buildAdvisorTranscript,
  buildTreeViewMode,
  contextDecisionCopy,
  contextFinalizedBrief,
  contextSnapshotAttachmentStatusLabel,
  expandedNodeIds,
  openDetailNodeId,
  openScaffold,
  requestDelete,
  selectBuildTreeViewMode,
  selectWorkDesignNode,
  selectedDraftEditorOpen,
  selectedNode,
  selectedNodeId,
  setBuildAdvisorPrompt,
  setContextFinalizeDialogOpen,
  setOpenDetailNodeId,
  setSelectedDraftEditorOpen,
  setTreeAddMenuNodeId,
  structuredStoryGroupIds,
  submitBuildAdvisorPrompt,
  toggleAllTreeNodes,
  toggleNodeExpansion,
  toggleStructuredStoryGroup,
  tree,
  treeAddMenuNodeId,
  treeFullyExpanded,
  updateNodeDraftBody,
  updateNodeRemark,
  updateNodeTitle,
}: WorkDesignBuildTreeViewProps) {
  const [
    structuredContextHandoffExpanded,
    setStructuredContextHandoffExpanded,
  ] = useState(false);

  useEffect(() => {
    if (buildTreeViewMode !== "structured") {
      setStructuredContextHandoffExpanded(false);
    }
  }, [buildTreeViewMode]);

  const buildTreePanelStackFill =
    buildTreeViewMode === "structured" && selectedDraftEditorOpen
      ? "middle"
      : "last";
  const buildAdvisorCollapsed =
    buildTreeViewMode === "structured" && selectedDraftEditorOpen;
  const treeMetrics = workDesignMetrics(tree);

  function toggleBuildAdvisor() {
    if (buildTreeViewMode !== "structured") {
      return;
    }

    if (buildAdvisorCollapsed) {
      setSelectedDraftEditorOpen(false);
      return;
    }

    setStructuredContextHandoffExpanded(false);
    setSelectedDraftEditorOpen(true);
  }

  function toggleStructuredContextHandoff() {
    const nextExpanded = !structuredContextHandoffExpanded;

    if (nextExpanded) {
      setSelectedDraftEditorOpen(false);
    }

    setStructuredContextHandoffExpanded(nextExpanded);
  }

  function toggleSelectedDraftEditor() {
    if (buildTreeViewMode === "structured" && !selectedDraftEditorOpen) {
      setStructuredContextHandoffExpanded(false);
    }

    setSelectedDraftEditorOpen((current) => !current);
  }

  function renderBuildTreeContextSummaryPanel() {
    const adaptiveSupportPanel = buildTreeViewMode === "structured";
    const contextPanelExpanded =
      !adaptiveSupportPanel || structuredContextHandoffExpanded;

    return (
      <TerasPanel
        collapsed={!contextPanelExpanded}
        frame="padded"
        treatment="rail"
        fit={adaptiveSupportPanel ? "content" : undefined}
        spacing={contextPanelExpanded ? "compact" : undefined}
        tone={contextDecisionCopy.tone}
      >
        <TerasPanelHeader
          actions={
            adaptiveSupportPanel ? (
              <TerasPanelCollapseActions
                collapsed={!contextPanelExpanded}
                onToggle={toggleStructuredContextHandoff}
                statusLabel={contextDecisionCopy.label}
                statusTone={contextDecisionCopy.tone}
              />
            ) : undefined
          }
          actionsLayout={adaptiveSupportPanel ? "inline" : undefined}
          kicker="Context Handoff"
          statusLabel={
            adaptiveSupportPanel ? undefined : contextDecisionCopy.label
          }
          statusTone={contextDecisionCopy.tone}
          description={
            contextPanelExpanded ? readOnly && !contextFinalizedBriefAvailable ? "No original finalized brief is retained in this session." : "Accepted handoff for this tree." : undefined
          }
          title={readOnly && !contextFinalizedBriefAvailable ? "Finalized brief unavailable" : "Accepted Brief"}
          titleOverflow="tooltip"
        />
        {contextPanelExpanded ? (
          <>
            <TerasMetadataList
              items={readOnly && !contextFinalizedBriefAvailable ? [{label:"Brief",value:"Not retained"},{label:"Snapshot",value:"Not retained"},{label:"Decision",value:"Not recorded"},{label:"Draft Tree",value:`${treeMetrics.features} Features / ${treeMetrics.stories} Stories / ${treeMetrics.risks} Risks`}] : workDesignBuildTreeContextHandoffMetadata({
                contextDecisionLabel: contextDecisionCopy.label,
                contextFinalizedBrief,
                contextSnapshotAttachmentStatusLabel,
                treeMetrics,
              })}
            />
            <TerasActionRow spacing="tight">
              <TerasActionButton
                onClick={() => setContextFinalizeDialogOpen(true)}
                emphasis="secondary"
              >
                View Details
              </TerasActionButton>
            </TerasActionRow>
          </>
        ) : null}
      </TerasPanel>
    );
  }

  function renderSelectedDraftItemPanel() {
    const node = selectedNode;
    const titleParts = workDesignNodeTitleParts(node);
    const selectedNodeTitle = workDesignNodeDisplayTitle(node);

    return (
      <TerasPanel
        accentRgb={workDesignNodeAccentRgb(node.kind)}
        collapsed={!selectedDraftEditorOpen}
        frame="padded"
        treatment="rail"
        layout={selectedDraftEditorOpen ? "header-body-footer" : undefined}
        spacing={selectedDraftEditorOpen ? "compact" : undefined}
        tone={node.tone}
      >
        <TerasPanelHeader
          actions={
            <TerasPanelCollapseActions
              collapsed={!selectedDraftEditorOpen}
              collapseLabel="Collapse"
              expandLabel={readOnly ? "View Draft" : "Edit Draft"}
              onToggle={toggleSelectedDraftEditor}
              statusAccentRgb={workDesignNodeAccentRgb(node.kind)}
              statusLabel={workDesignNodeKindLabel(node.kind)}
              statusTone={node.tone}
            />
          }
          actionsLayout="inline"
          kicker="Selected Draft Item"
          title={selectedNodeTitle}
          titleOverflow="tooltip"
        />
        {selectedDraftEditorOpen ? (
          <>
            <TerasFieldStack fill="middle" spacing="comfortable">
              <TerasTextField
                disabled={readOnly}
                {...buildTreeEditorFieldProps}
                accentRgb={workDesignNodeAccentRgb(node.kind)}
                aria-label={`${workDesignNodeKindLabel(node.kind)} title`}
                label="Draft Title"
                onValueChange={(value) =>
                  updateNodeTitle(
                    node.id,
                    composeWorkDesignNodeTitle(node, value),
                  )
                }
                placeholder={workDesignEditableTitlePlaceholder(node.kind)}
                prefix={titleParts.locked}
                value={titleParts.editable}
              />
              <TerasNoteField
                disabled={readOnly}
                {...buildTreeEditorFieldProps}
                accentRgb={workDesignNodeAccentRgb(node.kind)}
                density="compact"
                fill
                label="Draft Notes"
                onValueChange={(value) => updateNodeDraftBody(node.id, value)}
                placeholder={workDesignDraftPlaceholder(node)}
                value={node.draftBody}
              />
              <TerasTextField
                disabled={readOnly}
                {...buildTreeEditorFieldProps}
                accentRgb={workDesignNodeAccentRgb(node.kind)}
                aria-label={`${workDesignNodeKindLabel(node.kind)} operator remark`}
                density="compact"
                label="Operator Remark"
                onValueChange={(value) => updateNodeRemark(node.id, value)}
                placeholder="Add a pickup note, concern, or reminder for this draft item."
                value={node.remark}
              />
            </TerasFieldStack>
            <TerasActionRow
              end={
                <>
                  <TerasActionButton
                    disabled={readOnly}
                    accentRgb={workDesignNodeAccentRgb(node.kind)}
                    onClick={() => openScaffold(node)}
                    emphasis="secondary"
                  >
                    Use Scaffold
                  </TerasActionButton>
                  {node.kind !== "Epic" ? (
                    <TerasActionButton
                      disabled={readOnly}
                      onClick={() => requestDelete(node)}
                      tone="danger"
                    >
                      Delete Item
                    </TerasActionButton>
                  ) : null}
                </>
              }
              layout="split"
              spacing="none"
            >
              {node.kind === "Epic" ? (
                <>
                  <TerasActionButton
                    disabled={readOnly}
                    onClick={() => addFeature(node.id)}
                    emphasis="secondary"
                  >
                    Add Feature
                  </TerasActionButton>
                  <TerasActionButton
                    disabled={readOnly}
                    onClick={() => addRiskBranch(node.id)}
                    emphasis="secondary"
                  >
                    Add Risk
                  </TerasActionButton>
                </>
              ) : null}
              {node.kind === "Feature" ? (
                <TerasActionButton
                  disabled={readOnly}
                  onClick={() => addStory(node.id)}
                  emphasis="secondary"
                >
                  Add Story
                </TerasActionButton>
              ) : null}
            </TerasActionRow>
          </>
        ) : null}
      </TerasPanel>
    );
  }

  return (
    <BuildTreeEditor
      copy={{
        treeDescription: readOnly ? "Locked saved local design, when retained; otherwise current ART design branches. Original draft content is not reconstructed." : "Tree nodes are draft-only until review and Apply Draft.",
        treeKicker: "Work Design Tree",
        treeTitle: "Package Tree Draft",
      }}
      mode={buildTreeViewMode}
      onSelectMode={selectBuildTreeViewMode}
      onToggleAll={toggleAllTreeNodes}
      sideContent={
        <>
          {renderBuildTreeContextSummaryPanel()}
          {buildTreeViewMode === "structured"
            ? renderSelectedDraftItemPanel()
            : null}
          <TerasAdvisorPanel
            draftControls={treeAdvisorControls}
            collapsed={buildAdvisorCollapsed}
            fill
            onToggleCollapsed={
              buildTreeViewMode === "structured"
                ? toggleBuildAdvisor
                : undefined
            }
            profileLabel="Work Design Advisor"
            prompt={{
              disabled: readOnly,
              readOnly,
              ariaLabel: "Work Design tree advisor prompt",
              onChange: setBuildAdvisorPrompt,
              onSubmit: submitBuildAdvisorPrompt,
              placeholder: "Ask about this draft item...",
              rows: 2,
              value: buildAdvisorPrompt,
            }}
            statusLabel="draft assistance"
            statusTitle="An explicit chat request can draft or revise this local tree. Review and Apply remain operator actions."
            statusTone="warn"
            transcript={buildAdvisorTranscript}
          />
        </>
      }
      sideFill={buildTreePanelStackFill}
      treeContent={
        <BuildTreeEditorTree
          readOnly={readOnly}
          addMenuNodeId={treeAddMenuNodeId}
          copy={{
            groupedLeafCollapsedDescription:
              "Summary first. Expand to inspect the full User story stack.",
            groupedLeafEmptyDescription:
              "No draft stories yet. Add the first User Story from this group.",
            groupedLeafExpandedDescription:
              "Full story stack visible for inspection.",
            groupedLeafIndexLabel: "US",
            groupedLeafLabel: "User Stories",
            groupedLeafTitle: (count) =>
              `${count} draft ${count === 1 ? "story" : "stories"}`,
            supportGroupLabel: "Support Branches",
          }}
          expandedNodeIds={expandedNodeIds}
          getAddActions={(node) => {
            if (node.kind === "Epic") {
              return [
                {
                  label: "Add Feature",
                  onSelect: (target) => addFeature(target.id),
                },
                {
                  label: "Add Risk",
                  onSelect: (target) => addRiskBranch(target.id),
                },
              ];
            }

            if (node.kind === "Feature") {
              return [
                {
                  label: "Add Story",
                  onSelect: (target) => addStory(target.id),
                },
              ];
            }

            return [];
          }}
          getChildCountLabel={workDesignStructuredChildCountLabel}
          getDisplayTitle={workDesignNodeDisplayTitle}
          getDraftPlaceholder={workDesignDraftPlaceholder}
          getEditableTitlePlaceholder={(node) =>
            workDesignEditableTitlePlaceholder(node.kind)
          }
          getIndex={workDesignNodeIndex}
          getKindLabel={(kind) => workDesignNodeKindLabel(kind)}
          getNodeRole={workDesignBuildTreeNodeRole}
          getStructuredLayout={workDesignStructuredNodeLayout}
          getSummary={workDesignNodeSummary}
          getTitleParts={workDesignNodeTitleParts}
          mode={buildTreeViewMode}
          onDeleteNode={requestDelete}
          onFocusInlineTitle={(node) => {
            selectWorkDesignNode(node.id);
            setOpenDetailNodeId(node.id);
            setTreeAddMenuNodeId(null);
          }}
          onInlineNodeSelect={(node) => {
            selectWorkDesignNode(node.id);
            setOpenDetailNodeId((current) =>
              buildTreeViewMode === "inline"
                ? current === node.id
                  ? null
                  : node.id
                : node.id,
            );
            setTreeAddMenuNodeId(null);
          }}
          onOpenScaffold={openScaffold}
          onStructuredGroupSelect={(node) => {
            selectWorkDesignNode(node.id);
            setOpenDetailNodeId(node.id);
            toggleStructuredStoryGroup(node.id);
          }}
          onStructuredNodeSelect={(node, { expandable }) => {
            selectWorkDesignNode(node.id);
            setOpenDetailNodeId(node.id);
            setTreeAddMenuNodeId(null);

            if (expandable) {
              toggleNodeExpansion(node.id);
            }
          }}
          onToggleAddMenu={(node) =>
            setTreeAddMenuNodeId((current) =>
              current === node.id ? null : node.id,
            )
          }
          onToggleNode={(node) => toggleNodeExpansion(node.id)}
          onToggleStructuredGroup={(node) => {
            selectWorkDesignNode(node.id);
            setOpenDetailNodeId(node.id);
            toggleStructuredStoryGroup(node.id);
          }}
          onUpdateDraftBody={(node, value) =>
            updateNodeDraftBody(node.id, value)
          }
          onUpdateRemark={(node, value) => updateNodeRemark(node.id, value)}
          onUpdateTitle={(node, value) =>
            updateNodeTitle(node.id, composeWorkDesignNodeTitle(node, value))
          }
          openDetailNodeId={openDetailNodeId}
          selectedNodeId={selectedNodeId}
          structuredGroupIds={structuredStoryGroupIds}
          tree={tree}
        />
      }
      treeFullyExpanded={treeFullyExpanded}
    />
  );
}

function workDesignBuildTreeNodeRole(
  node: WorkDesignNode,
): BuildTreeEditorTreeRole {
  switch (node.kind) {
    case "Epic":
      return "root";
    case "Feature":
      return "group";
    case "Risk":
      return "support";
    case "User story":
      return "leaf";
  }
}

function workDesignNodeAccentRgb(kind: WorkDesignNodeKind) {
  switch (kind) {
    case "Epic":
      return "190, 144, 255";
    case "Feature":
      return "139, 181, 255";
    case "User story":
      return "118, 215, 196";
    case "Risk":
      return "255, 193, 90";
  }
}
