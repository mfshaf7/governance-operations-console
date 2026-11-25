import type { DeliveryArtNode, DeliveryAvailableAction, DeliveryPackageSummary } from "../../../read-model/index.ts";
import { getChildCounts, getDeliveryEffectivePackageProjection, getPackageAuditEvents, getPackageDetailsById } from "../../../read-model/index.ts";
import { TerasActionButton, TerasActionRow, TerasContentRegion, TerasFieldStack, TerasLoadingState, TerasEmptyState,
  TerasInspectionSection, TerasContentTray, TerasStatusPill, TerasMetadataList, TerasPanelHeader, TerasList, TerasSignalItem, TerasTechnicalDetails, TerasRecordMetaText } from "@/teras";
import { ControlBoardHighlightedMetadata, ControlBoardInspectorActions, ControlBoardKickerStatus } from "@/product-apps/control-board/control-board-inspection-layout";
import { technicalPlanRequirement as uncheckedTechnicalPlan, type TechnicalPlanRequirement } from "../../../work-model/execution/technical-plan-requirement.ts";
import { executionActiveBlockerMetadata, executionSelectedPackageMetadata } from "./execution-board-view-model.ts";
import { executionPackageNextAction, executionPackageText, executionPackageWorkGroups, executionReadableTime, executionWorkChoices } from "../../../work-model/execution/execution-package-content.ts";
import { usePIPlanningPreview } from "../../workspace/pi-planning-preview-context.ts";

const packageActionLabels: Partial<Record<DeliveryAvailableAction["action_type"], string>> = {
  block: "Block Package",
  defer: "Defer",
  resume: "Resume Work",
  retire: "Retire Package",
  "continue-remaining-work": "Review Remaining Work Decision",
  "sync-owner-repo": "Configure Implementation Repository",
};

const technicalPlanStatusLabels: Record<TechnicalPlanRequirement["status"], string> = {
  unknown: "Not checked",
  required: "Required",
  binding: "Link needed",
  covered: "Covered",
  "not-required": "Not required",
  review: "Needs review",
};

export function ExecutionSelectedPackagePanel({ auditEvents, details, onActionSelect, packageSummary, packageTree, selectedActions,
  scheduledWork, scheduledPIs, recordedAssignments, previewPlanRecorded,
  onInspectCloseout, onInspectHistory, readOnly = false, historyDetail,
  historyLoading = false, historyError, actionLoading = false, actionError,
  onInspectTechnicalPlan, onOpenWorkBoard, technicalPlanRequirement: requirementInput,
}: {
  auditEvents: ReturnType<typeof getPackageAuditEvents>; details: ReturnType<typeof getPackageDetailsById>;
  onActionSelect: (action: DeliveryAvailableAction) => void; packageSummary: DeliveryPackageSummary; packageTree: DeliveryArtNode | null;
  selectedActions: DeliveryAvailableAction[];
  scheduledWork: number | null;
  scheduledPIs: readonly string[];
  recordedAssignments: number;
  previewPlanRecorded: boolean;
  onInspectCloseout?: () => void; onInspectHistory?: () => void; readOnly?: boolean; historyDetail?: string;
  historyLoading?: boolean; historyError?: string | null; actionLoading?: boolean; actionError?: string | null;
  onInspectTechnicalPlan?: () => void; onOpenWorkBoard: () => void; technicalPlanRequirement?: TechnicalPlanRequirement;
}) {
  const planning = usePIPlanningPreview();
  const planningSourceId = packageSummary.execution_handoff?.source_package_id ?? packageSummary.delivery_package_id;
  const hasRecordedPlan = previewPlanRecorded || (scheduledWork ?? 0) > 0;
  const canOpenPIPlanning = planning && !readOnly && !["done", "retired", "parked"].includes(packageSummary.backend_status);
  const requirement = requirementInput ?? uncheckedTechnicalPlan({deliveryId:packageSummary.delivery_package_id});
  const checkedWork = requirement.workItemId ? executionWorkChoices(packageTree ? [packageTree] : [],"all").find(item => `work-item-${item.legacy_work_package_id}` === requirement.workItemId) : null;
  const workTitle = checkedWork ? `${checkedWork.component_type} ${checkedWork.legacy_work_package_id} · ${checkedWork.title}` : requirement.workItemId?.replace("work-item-","Work item ");
  const effectiveProjection = getDeliveryEffectivePackageProjection(packageSummary);
  const childCounts = packageTree ? getChildCounts(packageTree) : null;
  const groups = executionPackageWorkGroups(packageTree);
  const [targetPI, ...packageFacts] = executionSelectedPackageMetadata({ childCounts, details, packageSummary, packageTree });
  const workOverview = [
    ...(scheduledWork ? [{
      label: "Scheduled work",
      value: String(scheduledWork),
      title: "Work with an iteration in its dated PI calendar.",
    }] : recordedAssignments ? [{
      label: "Recorded assignments",
      value: String(recordedAssignments),
      title: "Work with a recorded iteration label.",
    }] : []),
    ...packageFacts,
  ];
  const packageActions = selectedActions.filter(action =>
    (action.scope === "package" || action.scope === "package_with_children") && packageActionLabels[action.action_type],
  );
  const latestEvent = auditEvents[0] ?? null;
  const blocker = packageSummary.active_blocker;
  const nextAction = executionPackageNextAction({
    status: packageSummary.backend_status,
    closeoutPending: effectiveProjection.posture === "Closeout Pending",
    hasCloseout: Boolean(onInspectCloseout),
    actions: selectedActions,
    groups,
    hasPackageBlocker: Boolean(blocker),
    readOnly,
    planningPending: Boolean(canOpenPIPlanning && scheduledWork === 0 &&
      packageSummary.execution_navigation?.planning_prepared_work_item_ids?.length),
    technicalPlan: checkedWork && onInspectTechnicalPlan ? requirement : undefined,
  });
  const blockerAction = !readOnly ? selectedActions.find(action =>
    action.action_type === "clear-blocker" && action.scope !== "execution_target",
  ) : undefined;
  const reviewBlocker = blockerAction?.enabled ? (
    <TerasActionButton disabled={actionLoading || Boolean(actionError)} onClick={() => onActionSelect(blockerAction)}>
      Review Blocker
    </TerasActionButton>
  ) : undefined;
  const activityReferencesOnly = latestEvent?.detail.split(/\s+|·/).filter(Boolean).every(word => /^[a-z][a-z0-9+.-]*:\/\//i.test(word));
  return <>
    <header>
      <TerasPanelHeader kicker="Delivery Package" statusLabel={effectiveProjection.posture} statusTone={effectiveProjection.tone}
        title={packageSummary.display_name} description={<span title={packageSummary.source_ref}>Epic {packageSummary.legacy_epic_id}</span>} />
      <ControlBoardInspectorActions>
        <TerasActionButton onClick={onOpenWorkBoard}>Open Work Board</TerasActionButton>
      </ControlBoardInspectorActions>
    </header>
    <TerasContentRegion key={packageSummary.delivery_package_id} data-execution-package-body="true" scroll>
      <TerasInspectionSection title="Work Overview">
        <TerasFieldStack spacing="compact">
          <ControlBoardHighlightedMetadata items={[{
            ...targetPI,
            ...(scheduledPIs.length > 0 ? { label: "Scheduled in", value: scheduledPIs.join(", ") } : {}),
            ...(canOpenPIPlanning && {
              detail: hasRecordedPlan
                ? "Review or revise the saved iteration assignments for this package."
                : "Choose the work, PI objective, and iteration.",
              actions: <TerasActionButton size="table-compact" emphasis="secondary" onClick={() => planning.open(planningSourceId)}>
                {hasRecordedPlan ? "Review PI plan" : "Open PI Planning"}
              </TerasActionButton>,
            }),
          }]} />
          <TerasMetadataList items={workOverview} />
        </TerasFieldStack>
      </TerasInspectionSection>
      <TerasInspectionSection title="Next Action">
        <TerasContentTray title={nextAction.title} description={nextAction.detail} />
      </TerasInspectionSection>
      {blocker || packageSummary.backend_status === "blocked" || Boolean(packageSummary.execution_navigation?.blocked_work_item_ids.length || groups.find(group => group.status === "blocked")?.count) ? <TerasInspectionSection title="What’s Blocking Progress">
        <TerasFieldStack spacing="compact">
          {blocker ? <>
            <TerasList frame="contained"><TerasSignalItem textOverflow="wrap" label="What is blocked?" title={executionPackageText(blocker.statement || "Statement not recorded")}
              detail={blocker.impact ? executionPackageText(blocker.impact) : undefined}
              tone="danger" actions={reviewBlocker} /></TerasList>
            {blockerAction && !blockerAction.enabled ? <TerasRecordMetaText>{executionPackageText(blockerAction.reason)}</TerasRecordMetaText> : null}
            <TerasMetadataList items={executionActiveBlockerMetadata(blocker)} shape="list" />
            <TerasTechnicalDetails summary="Blocker details" items={[
              { label: "Recorded reason", value: blocker.justification || "Not recorded" }, { label: "First recorded", value: blocker.discovered_on || "Not recorded" },
              { label: "Original statement", value: blocker.statement }, { label: "Original impact", value: blocker.impact },
            ]} />
          </> : packageSummary.backend_status === "blocked" ? <TerasList frame="contained">
            <TerasSignalItem label="Package status" title="Blocked" detail="No package blocker details were returned." tone="danger" actions={reviewBlocker} />
          </TerasList> :
            <TerasList frame="contained"><TerasSignalItem label="Blocked child work" title="Some work items are blocked"
              detail="Open the Work Board to see the affected items and their dependencies." tone="warn" /></TerasList>}
        </TerasFieldStack>
      </TerasInspectionSection> : null}
      <TerasInspectionSection title={readOnly ? "Package Records" : "Manage Package"}>
        <TerasFieldStack spacing="compact">
          {onInspectTechnicalPlan ? <TerasContentTray
            title="Technical Plan"
            kicker={readOnly || requirement.status !== "unknown" ? <ControlBoardKickerStatus title={<span>Implementation approach</span>} status={
              <span title={readOnly ? "Recorded history" : requirement.title}>
                <TerasStatusPill tone={requirement.tone}>{readOnly ? "History" : technicalPlanStatusLabels[requirement.status]}</TerasStatusPill>
              </span>
            } /> : "Implementation approach"}
            description={readOnly ? "Inspect the agreement retained for this package." :
              requirement.status === "unknown" ? "Coordinate changes that share a rollout, verification, or recovery plan." : requirement.detail}
          >
            <TerasFieldStack spacing="compact">
              {workTitle && requirement.status !== "unknown" ? <TerasRecordMetaText>Checked work: {workTitle}</TerasRecordMetaText> : null}
              <TerasActionRow spacing="compact"><TerasActionButton emphasis="secondary" onClick={onInspectTechnicalPlan}>{requirement.actionLabel}</TerasActionButton>
              </TerasActionRow>
              {requirement.ownerReason ? <TerasTechnicalDetails summary="Requirement details" items={[{label:"Check explanation",value:requirement.ownerReason}]}/> : null}
            </TerasFieldStack>
          </TerasContentTray> : null}
          {onInspectHistory || onInspectCloseout ? <TerasActionRow spacing="compact">
            {onInspectHistory ? <TerasActionButton emphasis="secondary" onClick={onInspectHistory}>View Records & Evidence</TerasActionButton> : null}
            {onInspectCloseout ? <TerasActionButton onClick={onInspectCloseout}>Review Closeout</TerasActionButton> : null}
          </TerasActionRow> : null}
          {!readOnly && actionLoading ? <TerasLoadingState inline label="Checking package actions…" /> : null}
          {!readOnly && actionError ? <>
            <TerasEmptyState>Package actions could not be checked.</TerasEmptyState>
            <TerasTechnicalDetails summary="Action check details" items={[{ label: "Read problem", value: actionError }]} />
          </> : null}
          {!readOnly && packageActions.length ? <TerasList frame="contained">{packageActions.map(action =>
            <TerasSignalItem textOverflow="wrap" key={action.action_type} label={action.enabled ? "Package action" : "Unavailable"} title={packageActionLabels[action.action_type]}
              detail={executionPackageText(action.reason)} tone={action.tone}
              actions={action.enabled ? <TerasActionButton disabled={actionLoading || Boolean(actionError)} emphasis="secondary"
                tone={action.tone === "danger" ? "danger" : "accent"} onClick={() => onActionSelect(action)}>{packageActionLabels[action.action_type]}</TerasActionButton> : undefined} />)}
          </TerasList> : null}
        </TerasFieldStack>
      </TerasInspectionSection>
      <TerasInspectionSection title="Recent Activity">
        <TerasFieldStack spacing="compact">
          <TerasRecordMetaText>Showing the latest loaded event.</TerasRecordMetaText>
          {historyLoading ? <TerasLoadingState inline label="Reading recent activity…" /> : null}
          {historyError ? <TerasEmptyState>Recent activity could not be loaded. Previously loaded information may be out of date.</TerasEmptyState> : null}
          {latestEvent ? <>
            <TerasList frame="contained"><TerasSignalItem textOverflow="wrap" label="Recorded activity" title={executionPackageText(latestEvent.title)}
              detail={activityReferencesOnly ? undefined : executionPackageText(latestEvent.detail)} meta={executionReadableTime(latestEvent.occurred_at)} tone={latestEvent.tone} /></TerasList>
          </> : !historyLoading && !historyError ? <TerasEmptyState>No recent activity was returned for this package.</TerasEmptyState> : null}
          {latestEvent || historyDetail || historyError ? <TerasTechnicalDetails summary="Activity details" items={[
            ...(latestEvent ? [{ label: "Recorded time", value: latestEvent.occurred_at }, { label: "Recorded by", value: latestEvent.actor },
              { label: "Event reference", value: latestEvent.event_id }, { label: "Receipt reference", value: latestEvent.receipt_id ?? "Not provided" },
              { label: "Recorded detail", value: latestEvent.detail }] : []),
            ...(historyDetail ? [{ label: "History coverage", value: historyDetail }] : []),
            ...(historyError ? [{ label: "Read problem", value: historyError }] : []),
          ]} /> : null}
        </TerasFieldStack>
      </TerasInspectionSection>
    </TerasContentRegion>
  </>;
}
