import type { LifecycleTransitionRuntimePosture } from "../../live-runtime/lifecycle-transition-live-types.ts";
import {
  TerasActionButton,
  TerasEmptyState,
  TerasPanel,
  TerasPanelHeader,
  TerasPanelStack,
  TerasSelectedPanel,
  TerasTimeline,
  TerasTimelineItem,
  TerasTechnicalDetails,
} from "@/teras";

import type {
  ConsoleSurfaceEntryIntent,
} from "../../../console-architecture";
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
  lifecycleTransitionTargetFact,
  lifecycleTransitionTimestamp,
  lifecycleTransitionTitle,
} from "./lifecycle-transitions-workspace-view-model";

export function LifecycleTransitionSelected({
  item,
  runtimePosture,
  onOpenWorkbenchSurface,
}: {
  item: LifecycleTransitionOverviewItem | null;
  runtimePosture: LifecycleTransitionRuntimePosture | null;
  onOpenWorkbenchSurface: (
    surfaceLabel: OperationWorkbenchPathLabel,
    focusIntent?: ConsoleSurfaceEntryIntent | null,
  ) => void;
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
    nextAction: item.nextAction,
    sourceDomain: item.sourceDomain,
    sourceRecordId: item.sourceRecordId,
    state: item.state,
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
    <TerasPanelStack fill="last" scroll>
      <TerasSelectedPanel
        action={{
          description: actionDescription,
          kicker: item.nextAction ? "Next step" : item.state === "applied" ? "Applied target" : "Transition outcome",
          node:
            ownerRoute.kind === "workbench" ? (
              <TerasActionButton
                emphasis="secondary"
                onClick={() =>
                  onOpenWorkbenchSurface(
                    ownerRoute.surfaceLabel,
                    ownerRoute.entryIntent,
                  )
                }
              >
                {ownerRoute.buttonLabel}
              </TerasActionButton>
            ) : undefined,
          title:
            item.nextAction?.actionLabel ??
            (item.state === "applied" && ownerRoute.kind === "workbench" ? `Open ${lifecycleTransitionDomainLabel(item.targetDomain)}` : item.stateLabel),
        }}
        description={item.stateLabel === "Source reported"
          ? "The source reports this handoff as applied; independent target confirmation is not projected."
          : item.stateLabel === "Owner confirmed"
            ? "The Prototype owner confirmed graduation and references the Delivery handoff."
            : item.reasonDetail}
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
        fit="content"
        treatment="neutral"
      >
        <TerasPanelHeader
          description="Newest recorded evidence first. Owner readbacks may contain fewer events than the original workflow."
          kicker="History"
          title="Evidence history"
        />
        {item.history.length > 0 ? (
          <TerasTimeline ariaLabel="Transition receipt history">
            {item.history.map((historyItem) => (
              <TerasTimelineItem
                detail={historyItem.ownerLabel}
                evidence={<TerasTechnicalDetails summary="Evidence details" items={[
                  { label: "Event", value: historyItem.artifactId },
                  { label: "Recorded", value: historyItem.recordedAt },
                  ...historyItem.evidenceRefs.map((value, index) => ({ label: `Reference ${index + 1}`, value })),
                ]} />}
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
      <TerasPanel fit="content" treatment="neutral">
        <TerasTechnicalDetails summary="Record details" items={[
          ...(runtimePosture ? [
            { label: "Source coverage", value: runtimePosture.mode === "disconnected-preview" ? "Preview" : runtimePosture.status !== "current" ? "Unavailable" : runtimePosture.truncated ? "Partial" : "Current" },
            { label: "Observed", value: runtimePosture.observedAt },
            ...(runtimePosture.error ? [{ label: "Source detail", value: runtimePosture.error }] : []),
          ] : []),
          ...item.references,
        ]} />
      </TerasPanel>
    </TerasPanelStack>
  );
}
