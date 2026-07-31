import {
  TerasActionButton,
  TerasEmptyState,
  TerasPanel,
  TerasPanelHeader,
  TerasPanelStack,
  TerasSelectedPanel,
  TerasTimeline,
  TerasTimelineItem,
} from "@/teras";

import type {
  OperationWorkbenchPathLabel,
} from "../../../operation-workbench/operation-workbench-domain-registry";
import {
  resolveLifecycleTransitionWorkbenchRoute,
} from "../../routing/lifecycle-transition-owner-route";
import type {
  LifecycleTransitionOverviewItem,
} from "../lifecycle-transition-overview-view-model";
import {
  lifecycleTransitionDomainLabel,
  lifecycleTransitionShortReference,
  lifecycleTransitionTargetFact,
  lifecycleTransitionTimestamp,
  lifecycleTransitionTitle,
} from "./lifecycle-transitions-workspace-view-model";

export function LifecycleTransitionSelected({
  item,
  onOpenWorkbenchSurface,
}: {
  item: LifecycleTransitionOverviewItem | null;
  onOpenWorkbenchSurface: (surfaceLabel: OperationWorkbenchPathLabel) => void;
}) {
  if (!item) {
    return (
      <TerasEmptyState fill>
        No transition is selected from the current route.
      </TerasEmptyState>
    );
  }

  const ownerRoute = resolveLifecycleTransitionWorkbenchRoute({
    applicationRunRef: item.applicationRunRef,
    nextOwnerRef: item.nextAction?.ownerRef ?? null,
    sourceDomain: item.sourceDomain,
    sourceRecordId: item.sourceRecordId,
    targetDomain: item.targetDomain,
    targetRecordRef: item.targetRecordRef,
    transitionId: item.transitionId,
  });
  const targetFact = lifecycleTransitionTargetFact(item);
  const actionDescription =
    item.attentionDetail ??
    (ownerRoute.kind === "unavailable"
      ? ownerRoute.message
      : item.nextAction
        ? `${item.nextAction.ownerLabel} owns this move. Open the owning workspace to continue.`
        : `Open the owning workspace to inspect the applied ${lifecycleTransitionDomainLabel(item.targetDomain)} record.`);

  return (
    <TerasPanelStack fill="last">
      <TerasSelectedPanel
        action={{
          description: actionDescription,
          kicker: item.nextAction ? "Current Required Move" : "Applied Target",
          node:
            ownerRoute.kind === "workbench" ? (
              <TerasActionButton
                emphasis="secondary"
                onClick={() =>
                  onOpenWorkbenchSurface(ownerRoute.surfaceLabel)
                }
              >
                {ownerRoute.buttonLabel}
              </TerasActionButton>
            ) : undefined,
          title:
            item.nextAction?.actionLabel ??
            `Open ${lifecycleTransitionDomainLabel(item.targetDomain)}`,
        }}
        description={item.reasonDetail}
        facts={[
          {
            label: targetFact.label,
            value: targetFact.value,
          },
          ...item.posture.map((posture) => ({
            label: posture.label,
            tone: posture.tone,
            value: posture.stateLabel,
          })),
        ]}
        kicker="Selected Transition"
        selected
        status={{
          label: item.stateLabel,
          tone: item.tone,
        }}
        title={lifecycleTransitionTitle(item)}
        tone={item.tone}
        variant="rich"
      />
      <TerasPanel
        fit="fill"
        layout="header-body"
        overflow="auto"
        treatment="neutral"
      >
        <TerasPanelHeader
          description="Immutable transition artifacts in newest-first order."
          kicker="History"
          title="Receipt trail"
        />
        {item.history.length > 0 ? (
          <TerasTimeline ariaLabel="Transition receipt history">
            {item.history.map((historyItem) => (
              <TerasTimelineItem
                detail={
                  historyItem.evidenceRef
                    ? lifecycleTransitionShortReference(
                        historyItem.evidenceRef,
                      )
                    : historyItem.ownerLabel
                }
                displayTimestamp={lifecycleTransitionTimestamp(
                  historyItem.recordedAt,
                )}
                key={historyItem.artifactId}
                label={historyItem.label}
                status={historyItem.ownerLabel}
                timestamp={historyItem.recordedAt}
                tone={historyItem.tone}
              />
            ))}
          </TerasTimeline>
        ) : (
          <TerasEmptyState>No receipt history is available.</TerasEmptyState>
        )}
      </TerasPanel>
    </TerasPanelStack>
  );
}
