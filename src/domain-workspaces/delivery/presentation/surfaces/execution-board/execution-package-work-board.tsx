"use client";

import type { ReactNode } from "react";
import {
  TerasActionButton,
  TerasActionRow,
  TerasContentRegion,
  TerasContentTray,
  TerasFieldStack,
  TerasInspectionSection,
  TerasList,
  TerasMetadataList,
  TerasPanelHeader,
  TerasRecordMetaText,
  TerasSignalItem,
  TerasStatusPill,
  type TerasMetadataItem,
  type TerasSurfaceSummaryMetric,
} from "@/teras";
import {
  controlBoardPostureOrder,
  controlBoardPostureTone,
  type ControlBoardPackagePosture,
} from "@/product-apps/control-board";
import { ControlBoardCard } from "@/product-apps/control-board/control-board-dashboard";
import { ControlBoardStatusBoard } from "@/product-apps/control-board/control-board-view";
import { ControlBoardCardDisclosure, ControlBoardInspectorHeader } from "@/product-apps/control-board/control-board-inspection-layout";
import { deliveryControlBoardPostureTerms } from "../../../product-adapters/control-board/index.ts";
import { getDeliveryEffectivePackageProjection, type DeliveryArtNode, type DeliveryPackageSummary } from "../../../read-model/index.ts";
import { executionPackageText } from "../../../work-model/execution/execution-package-content.ts";
import { executionActiveBlockerMetadata } from "./execution-board-view-model.ts";

const postureByStatus = {
  new: "New",
  ready: "Ready",
  "in-progress": "In Progress",
  blocked: "Blocked",
  parked: "Deferred",
  done: "Done",
  retired: "Retired",
} as const satisfies Record<DeliveryArtNode["backend_status"], ControlBoardPackagePosture>;

const workPostureTerms = {
  ...deliveryControlBoardPostureTerms,
  Blocked: { label: "Blocked", description: "Waiting on a blocker or dependency." },
  Done: { label: "Done", description: "Recorded as complete." },
};

export type ExecutionWorkBoardSummary = {
  title: "Epic Work" | "Feature Work" | "All Work";
  metrics: TerasSurfaceSummaryMetric[];
};

type FeatureProgress = { total: number; completed: number; retired: number };

export type ExecutionPackageWorkItem = {
  feature: { id: string; title: string } | null;
  node: DeliveryArtNode;
  featureProgress: FeatureProgress | null;
  sessionRecorded: boolean;
  prepared: boolean;
  lane: {
    status: DeliveryArtNode["backend_status"];
    title: ControlBoardPackagePosture;
    tone: ReturnType<typeof controlBoardPostureTone>;
  };
};

export function executionPackageWorkItems(tree: DeliveryArtNode | null, deliveryPackage?: DeliveryPackageSummary | null): ExecutionPackageWorkItem[] {
  const recordedSessions = new Set(deliveryPackage?.work_sessions?.flatMap(session => session.work_item_ids));
  const preparedItems = new Set(deliveryPackage?.execution_navigation?.prepared_work_item_ids);
  const items: ExecutionPackageWorkItem[] = [];
  const progressByFeature = new Map<string, FeatureProgress>();
  function visit(node: DeliveryArtNode, feature: ExecutionPackageWorkItem["feature"]) {
    const isFeature = node.component_type === "Feature";
    if (isFeature || ["User story", "Task", "Defect"].includes(node.component_type)) {
      const recordedStatus = node.backend_status;
      const blocked = !["done", "parked", "retired"].includes(recordedStatus)
        && Boolean(node.blocker || node.dependency_blocked);
      const status = blocked ? "blocked" : recordedStatus;
      const title = postureByStatus[status];
      const workItemId = node.legacy_work_package_id;
      const parentProgress = feature ? progressByFeature.get(feature.id) : undefined;
      if (parentProgress) {
        parentProgress.total += 1;
        if (recordedStatus === "done") parentProgress.completed += 1;
        if (recordedStatus === "retired") parentProgress.retired += 1;
      }

      const featureProgress = isFeature ? { total: 0, completed: 0, retired: 0 } : null;
      if (featureProgress) progressByFeature.set(node.id, featureProgress);
      items.push({
        feature,
        node,
        featureProgress,
        sessionRecorded: workItemId !== null && recordedSessions.has(`work-item-${workItemId}`),
        prepared: status === "new" && workItemId !== null && preparedItems.has(workItemId),
        lane: { status, title, tone: controlBoardPostureTone(title) },
      });
    }
    const scope = isFeature ? { id: node.id, title: node.title } : feature;
    node.children.forEach(child => visit(child, scope));
  }
  if (tree) visit(tree, null);
  return items;
}

export function executionPackageWorkMetrics(items: ExecutionPackageWorkItem[]): TerasSurfaceSummaryMetric[] {
  const counts = new Map<ControlBoardPackagePosture, number>();
  for (const { lane } of items) counts.set(lane.title, (counts.get(lane.title) ?? 0) + 1);
  return controlBoardPostureOrder.filter(posture =>
    ["Ready", "In Progress", "Blocked", "Done"].includes(posture) || counts.has(posture),
  ).map(posture => {
    const count = counts.get(posture) ?? 0;
    return {
      id: posture,
      label: posture,
      tone: count ? controlBoardPostureTone(posture) : "muted",
      value: String(count),
    };
  });
}

function workItemLabel(node: DeliveryArtNode) {
  return node.legacy_work_package_id === null
    ? node.component_type
    : `${node.component_type} #${node.legacy_work_package_id}`;
}

export function ExecutionPackageWorkBoard({ items, selectedId, showFeatureName, onSelect }: {
  items: ExecutionPackageWorkItem[];
  selectedId: string | null;
  showFeatureName: boolean;
  onSelect: (item: ExecutionPackageWorkItem) => void;
}) {
  const groups = controlBoardPostureOrder
    .filter(posture => posture !== "Closeout Pending")
    .map(posture => ({ posture, items: items.filter(item => item.lane.title === posture) }))
    .filter(group => group.posture !== "New" || group.items.length > 0);

  return (
    <ControlBoardStatusBoard
      groups={groups}
      postureTerms={workPostureTerms}
      emptyMessage="No work items in this status."
      filterItems={(group, query) => group.filter(({ node, feature }) =>
        `${workItemLabel(node)} ${node.title} ${feature?.title ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()))}
      renderItem={item => {
        const { node, feature, featureProgress, lane, sessionRecorded, prepared } = item;
        return <ControlBoardCard
          key={node.id}
          aria-pressed={featureProgress ? undefined : node.id === selectedId}
          data-execution-work-item={node.id}
          data-opens-feature={featureProgress ? true : undefined}
          detail={featureProgress
            ? featureProgress.total > 0
              ? `${featureProgress.completed} / ${featureProgress.total} completed${featureProgress.retired ? ` · ${featureProgress.retired} retired` : ""}`
              : "No child work"
            : showFeatureName ? feature?.title : undefined}
          kicker={workItemLabel(node)}
          onClick={() => onSelect(item)}
          pills={<>
            <TerasStatusPill tone={lane.tone}>{lane.title}</TerasStatusPill>
            {sessionRecorded ? <TerasStatusPill tone="info">Session Recorded</TerasStatusPill>
              : prepared ? <TerasStatusPill tone="info">Prepared</TerasStatusPill> : null}
            {featureProgress ? <ControlBoardCardDisclosure /> : null}
          </>}
          selected={node.id === selectedId}
          title={executionPackageText(node.title)}
          tone={lane.tone}
        />;
      }}
    />
  );
}

export function ExecutionWorkBoardContextPanel({ deliveryPackage, items, view }: {
  deliveryPackage: DeliveryPackageSummary;
  items: ExecutionPackageWorkItem[] | null;
  view: "Epic Board" | "Feature Board" | "All Work" | "ART Tree";
}) {
  const projection = getDeliveryEffectivePackageProjection(deliveryPackage);
  const features = items?.filter(item => item.featureProgress).length;
  const workItems = items && features !== undefined ? items.length - features : null;
  const facts: TerasMetadataItem[] = [{ label: "Target PI", value: deliveryPackage.target_pi ?? "Not committed" }];
  if (view !== "All Work") facts.push({ label: "Features", value: features === undefined ? "Not loaded" : String(features) });
  if (view !== "Feature Board") facts.push({
    label: view === "Epic Board" ? "Direct work" : "Work items",
    value: workItems === null ? "Not loaded" : String(workItems),
    title: view === "Epic Board" ? "Work items directly under this Epic, outside a Feature." : undefined,
  });

  let nextAction: { title: string; description: string } | undefined;
  if (view === "Epic Board" && features) {
    nextAction = {
      title: workItems ? "Choose work to inspect" : "Open a Feature",
      description: workItems ? "Open a Feature to see its child work, or select an item directly on this board."
        : "Select a Feature card to see its progress and child work.",
    };
  } else if ((view === "Epic Board" || view === "All Work") && workItems) {
    nextAction = { title: "Select a work item", description: "Choose a card to see its details and next step." };
  } else if (view === "Feature Board" && features) {
    nextAction = { title: "Choose a Feature", description: "Use the Feature filter on the board to see its progress and child work." };
  }

  return <>
    <TerasPanelHeader
      kicker={view}
      title={deliveryPackage.display_name}
      description={deliveryPackage.legacy_epic_id ? `Epic ${deliveryPackage.legacy_epic_id}` : undefined}
      statusLabel={projection.posture}
      statusTone={projection.tone}
    />
    <TerasContentRegion data-execution-board-context={view} scroll>
      <TerasInspectionSection title="Work Overview">
        <TerasMetadataList items={facts} />
      </TerasInspectionSection>
      {nextAction ? <TerasInspectionSection title="Next Action">
        <TerasContentTray title={nextAction.title} description={nextAction.description} />
      </TerasInspectionSection> : null}
    </TerasContentRegion>
  </>;
}

export type ExecutionWorkDependency = { id: number; node?: DeliveryArtNode; onOpen?: () => void };

export function ExecutionPackageWorkItemPanel({ item, planningPlacement, action, blockerAction, dependencies, readOnly, onClose }: {
  item: ExecutionPackageWorkItem;
  planningPlacement?: { pi: string; iteration: string; dates?: string };
  action: ReactNode;
  blockerAction?: ReactNode;
  dependencies: ExecutionWorkDependency[];
  readOnly: boolean;
  onClose?: () => void;
}) {
  const { node, feature, featureProgress, lane } = item;
  const blocker = node.blocker;
  const facts: TerasMetadataItem[] = [];
  if (planningPlacement) {
    facts.push(
      { label: "Planning increment", value: planningPlacement.pi },
      { label: planningPlacement.dates ? "Iteration" : "Recorded iteration", value: planningPlacement.iteration },
    );
    if (planningPlacement.dates) facts.push({ label: "Iteration dates", value: planningPlacement.dates });
  }
  if (feature) facts.push({ label: "Feature", value: executionPackageText(feature.title) });
  if (featureProgress) {
    facts.push(
      { label: "Child work", value: String(featureProgress.total) },
      { label: "Completed", value: String(featureProgress.completed) },
    );
    if (featureProgress.retired) facts.push({ label: "Retired", value: String(featureProgress.retired) });
  }
  const repository = node.owner_repo?.trim();
  if (repository) facts.push({ label: "Repository", value: repository, title: repository, truncateValue: true });
  let nextActionDescription: string | undefined;
  if (!readOnly && lane.status === "blocked") {
    if (blockerAction) nextActionDescription = "Review the recorded blocker and choose a return status once it’s resolved.";
    else if (node.dependency_blocked && dependencies.length) nextActionDescription = "Review the dependencies above to see what needs to finish first.";
    else if (blocker) nextActionDescription = "Use the blocker details above to see what needs to be resolved.";
    else if (!action) nextActionDescription = "Confirm what’s blocking this item before continuing.";
  }
  return (
    <>
      <ControlBoardInspectorHeader closeLabel="Close work item details" onClose={onClose}>
        <TerasPanelHeader kicker={workItemLabel(node)} title={executionPackageText(node.title)} statusLabel={lane.title} statusTone={lane.tone} />
      </ControlBoardInspectorHeader>
      <TerasContentRegion data-execution-work-item-details={node.id} scroll>
        {node.description.trim() ? <TerasInspectionSection title="Description">
          <TerasRecordMetaText>{executionPackageText(node.description)}</TerasRecordMetaText>
        </TerasInspectionSection> : null}
        {facts.length ? <TerasInspectionSection title="Work Context">
          <TerasMetadataList items={facts} columns={1} wrap />
        </TerasInspectionSection> : null}
        {lane.status === "blocked" ? <TerasInspectionSection title="What’s Blocking Progress">
          <TerasFieldStack spacing="compact">
            <TerasList frame="contained">
              <TerasSignalItem label="Blocker" tone="warn" textOverflow="wrap"
                title={blocker?.statement.trim() ? executionPackageText(blocker.statement)
                  : node.dependency_blocked ? "Waiting on a dependency" : "No blocker details were returned"}
                detail={blocker?.impact.trim() ? executionPackageText(blocker.impact) : undefined} />
            </TerasList>
            {blocker ? <TerasMetadataList items={executionActiveBlockerMetadata(blocker)} /> : null}
          </TerasFieldStack>
        </TerasInspectionSection> : null}
        {dependencies.length ? <TerasInspectionSection title="Depends on">
          <TerasList frame="contained">{dependencies.map(dependency => {
            const label = dependency.node ? workItemLabel(dependency.node) : `Work item #${dependency.id}`;
            const title = dependency.node ? executionPackageText(dependency.node.title) : "Details unavailable in Delivery";
            return <TerasSignalItem key={dependency.id} label={label} title={title} textOverflow="wrap"
              actions={dependency.onOpen ? <TerasActionButton size="table-compact" emphasis="secondary"
                aria-label={`Open ${label}: ${title}`} onClick={dependency.onOpen}>Open item</TerasActionButton> : undefined} />;
          })}</TerasList>
        </TerasInspectionSection> : null}
        {action || blockerAction || nextActionDescription ? <TerasInspectionSection title="Next Action">
          <TerasContentTray description={nextActionDescription}>
            {blockerAction ? <TerasActionRow layout="split" end={action}>{blockerAction}</TerasActionRow> : action}
          </TerasContentTray>
        </TerasInspectionSection> : null}
      </TerasContentRegion>
    </>
  );
}
