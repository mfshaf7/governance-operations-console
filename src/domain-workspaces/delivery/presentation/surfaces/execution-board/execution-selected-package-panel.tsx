import type { DeliveryArtNode, DeliveryAvailableAction, DeliveryPackageSummary } from "../../../read-model/index.ts";
import { getAvailableActions, getChildCounts, getDeliveryEffectivePackageProjection, getPackageAuditEvents, getPackageDetailsById } from "../../../read-model/index.ts";
import { TerasActionButton, TerasActionRow, TerasContentRegion, TerasFieldStack, TerasLoadingState, TerasEmptyState,
  TerasInspectionSection, TerasContentTray, TerasStatusPill, TerasMetadataList, TerasPanelHeader, TerasList, TerasSignalItem, TerasTechnicalDetails, TerasRecordMetaText } from "@/teras";
import { technicalPlanRequirement as uncheckedTechnicalPlan, type TechnicalPlanRequirement } from "../../../work-model/execution/technical-plan-requirement.ts";
import { executionWorkChoices } from "../../../work-model/execution/execution-package-content.ts";
import { executionActiveBlockerMetadata, executionBoardSecondaryActions, executionSelectedPackageMetadata } from "./execution-board-view-model.ts";
import { executionPackageNextAction, executionPackageText, executionPackageWorkGroups, executionReadableTime, type ExecutionWorkFilter } from "../../../work-model/execution/execution-package-content.ts";

const actionLabels: Partial<Record<DeliveryAvailableAction["action_type"], string>> = {
  "open-closeout": "Review Closeout", "edit-work-tree": "Edit Work Structure", "view-art-tree": "View Work Structure",
  "open-audit-trail": "View Records & Evidence", "sync-owner-repo": "Configure Implementation Repository",
  resume: "Resume Work", "clear-blocker": "Review Blocker",
};

export function ExecutionSelectedPackagePanel({ auditEvents, details, onActionSelect, packageSummary, packageTree, selectedActions,
  onEditCanonicalTree, canonicalTreeAvailable = false, onInspectCloseout, onInspectHistory, readOnly = false, historyDetail,
  historyLoading = false, historyError, live = false, actionLoading = false, actionError, onChooseWorkItem, onBrowseWorkItems,
  onInspectTechnicalPlan, technicalPlanRequirement: requirementInput,
}: {
  auditEvents: ReturnType<typeof getPackageAuditEvents>; details: ReturnType<typeof getPackageDetailsById>;
  onActionSelect: (action: DeliveryAvailableAction) => void; packageSummary: DeliveryPackageSummary; packageTree: DeliveryArtNode | null;
  selectedActions: ReturnType<typeof getAvailableActions>; onEditCanonicalTree?: () => void; canonicalTreeAvailable?: boolean;
  onInspectCloseout?: () => void; onInspectHistory?: () => void; readOnly?: boolean; historyDetail?: string;
  historyLoading?: boolean; historyError?: string | null; live?: boolean; actionLoading?: boolean; actionError?: string | null;
  onChooseWorkItem?: (status?: ExecutionWorkFilter) => void; onBrowseWorkItems?: (status: ExecutionWorkFilter) => void;
  onInspectTechnicalPlan?: () => void; technicalPlanRequirement?: TechnicalPlanRequirement;
}) {
  const requirement = requirementInput ?? uncheckedTechnicalPlan({deliveryId:packageSummary.delivery_package_id});
  const technicalPlanRequired = ["required","binding"].includes(requirement.status);
  const checkedWork = requirement.workItemId ? executionWorkChoices(packageTree ? [packageTree] : [],"all").find(item => `work-item-${item.legacy_work_package_id}` === requirement.workItemId) : null;
  const workTitle = checkedWork ? `${checkedWork.component_type} ${checkedWork.legacy_work_package_id} · ${checkedWork.title}` : requirement.workItemId?.replace("work-item-","Work item ");
  const effectiveProjection = getDeliveryEffectivePackageProjection(packageSummary);
  const childCounts = packageTree ? getChildCounts(packageTree) : null;
  const groups = executionPackageWorkGroups(packageTree);
  const next = executionPackageNextAction({ status: packageSummary.backend_status, closeoutPending: effectiveProjection.posture === "Closeout Pending",
    hasCloseout: Boolean(onInspectCloseout || selectedActions.some(action => action.action_type === "open-closeout" && action.enabled)), actions: selectedActions, groups });
  const primaryChoosesWork = !readOnly && !(live && (actionLoading || actionError)) && !technicalPlanRequired && next.kind === "work" && Boolean(onChooseWorkItem);
  const nextAction = "action" in next ? next.action : next.kind === "closeout" ? selectedActions.find(action => action.action_type === "open-closeout" && action.enabled) : null;
  const secondaryActions = executionBoardSecondaryActions(selectedActions, nextAction ?? null);
  const latestEvent = auditEvents[0] ?? null;
  const blocker = packageSummary.active_blocker;
  const blockerAction = !readOnly ? selectedActions.find(action => action.action_type === "clear-blocker") : undefined;
  const displayAction = (action: DeliveryAvailableAction) => actionLabels[action.action_type] ?? action.label;
  const activityReferencesOnly = latestEvent?.detail.split(/\s+|·/).filter(Boolean).every(word => /^[a-z][a-z0-9+.-]*:\/\//i.test(word));
  function nextControl() {
    if (technicalPlanRequired && onInspectTechnicalPlan) return <TerasActionButton onClick={onInspectTechnicalPlan}>{requirement.actionLabel}</TerasActionButton>;
    if (next.kind === "work" && onChooseWorkItem) return <TerasActionButton onClick={() => onChooseWorkItem(next.filter)}>Choose Work Item</TerasActionButton>;
    if (next.kind === "closeout" && onInspectCloseout) return <TerasActionButton onClick={onInspectCloseout}>Review Closeout</TerasActionButton>;
    if (next.kind === "evidence") return onInspectHistory ? <TerasActionButton emphasis="secondary" onClick={onInspectHistory}>View Records & Evidence</TerasActionButton> : null;
    if (nextAction && !(blocker && nextAction.action_type === "clear-blocker")) return <TerasActionButton onClick={() => onActionSelect(nextAction)}>{displayAction(nextAction)}</TerasActionButton>;
    return null;
  }
  return <>
    <TerasPanelHeader kicker="Delivery Package" statusLabel={effectiveProjection.posture} statusTone={effectiveProjection.tone}
      title={packageSummary.display_name} description={<span title={packageSummary.source_ref}>Epic {packageSummary.legacy_epic_id}</span>} />
    <TerasContentRegion key={packageSummary.delivery_package_id} data-execution-package-body="true" scroll>
      <TerasInspectionSection title="Work Overview">
        <TerasFieldStack spacing="compact">
          <TerasMetadataList items={executionSelectedPackageMetadata({ childCounts, details, packageSummary, packageTree })} />
          <TerasRecordMetaText>Open work items includes all descendant levels. Status counts cover stories, defects and tasks.</TerasRecordMetaText>
          {groups.some(group => group.items.length > 0) ? <TerasList frame="contained">
            {groups.filter(group => group.items.length > 0).map(group => <TerasSignalItem key={group.status} textOverflow="wrap"
              label={group.label} title={`${group.count} ${group.count === 1 ? "work item" : "work items"}`}
              detail={group.items.slice(0, 2).map(item => `${item.component_type}${item.legacy_work_package_id ? ` ${item.legacy_work_package_id}` : ""} · ${executionPackageText(item.title)}`).join("; ")}
              tone={group.status === "blocked" ? "danger" : "info"}
              actions={onBrowseWorkItems ? <TerasActionButton emphasis="secondary" onClick={() => onBrowseWorkItems(group.status)}>{group.items.length > 2 ? `View all ${group.count}` : "View work"}</TerasActionButton> : undefined} />)}
          </TerasList> : null}
        </TerasFieldStack>
      </TerasInspectionSection>
      {blocker || packageSummary.backend_status === "blocked" || Boolean(packageSummary.execution_navigation?.blocked_work_item_ids.length || groups.find(group => group.status === "blocked")?.count) ? <TerasInspectionSection title="What’s Blocking Progress">
        <TerasFieldStack spacing="compact">
          {blocker ? <>
            <TerasList frame="contained"><TerasSignalItem textOverflow="wrap" label="What is blocked?" title={executionPackageText(blocker.statement || "Statement not recorded")}
              detail={<><strong>Impact: </strong>{executionPackageText(blocker.impact || "Not recorded")}</>} tone="danger"
              actions={blockerAction ? <TerasActionButton disabled={!blockerAction.enabled || Boolean(live && (actionLoading || actionError))} onClick={() => onActionSelect(blockerAction)}>Review Blocker</TerasActionButton> : undefined} /></TerasList>
            {blockerAction && !blockerAction.enabled ? <TerasRecordMetaText>{executionPackageText(blockerAction.reason)}</TerasRecordMetaText> : null}
            <TerasMetadataList items={executionActiveBlockerMetadata(blocker)} shape="list" />
            <TerasTechnicalDetails summary="Blocker details" items={[
              { label: "Recorded reason", value: blocker.justification || "Not recorded" }, { label: "First recorded", value: blocker.discovered_on || "Not recorded" },
              { label: "Original statement", value: blocker.statement }, { label: "Original impact", value: blocker.impact },
            ]} />
          </> : packageSummary.backend_status === "blocked" ? <TerasEmptyState>This package is marked blocked, but its blocker details were not returned. Review its records before changing the status.</TerasEmptyState> :
            <TerasList frame="contained"><TerasSignalItem label="Blocked child work" title="Review blocked work items" detail="A child work item has a recorded blocker or unresolved dependency. This is separate from a blocker on the package itself."
              tone="warn" actions={onBrowseWorkItems ? <TerasActionButton emphasis="secondary" onClick={() => onBrowseWorkItems("blocked")}>View Blocked Work</TerasActionButton> : undefined} /></TerasList>}
        </TerasFieldStack>
      </TerasInspectionSection> : null}
      <TerasInspectionSection title="Next Action">
        {readOnly ? <TerasEmptyState>This is a read-only history record. Browse its work structure and recorded evidence.</TerasEmptyState>
          : live && actionLoading ? <TerasLoadingState inline label="Checking available actions…" />
          : live && actionError ? <TerasFieldStack spacing="compact"><TerasEmptyState>Available actions could not be checked. Review the package records or try again after the connection recovers.</TerasEmptyState>
              <TerasTechnicalDetails summary="Action check details" items={[{ label: "Read problem", value: actionError }]} /></TerasFieldStack>
          : <TerasList frame="contained"><TerasSignalItem textOverflow="wrap" label="Next action" title={technicalPlanRequired ? requirement.title : next.title} detail={technicalPlanRequired ? `${workTitle ?? "The checked work"}: ${requirement.detail}` : next.detail}
              actions={nextControl()} tone={packageSummary.backend_status === "blocked" ? "warn" : "info"} /></TerasList>}
      </TerasInspectionSection>
      <TerasInspectionSection title="Manage Package">
        <TerasFieldStack spacing="compact">
          {onInspectTechnicalPlan ? <TerasContentTray title="Technical Plan" kicker="Implementation approach" description={readOnly ? "Inspect the agreement retained for this package. History does not establish current work-start eligibility." : requirement.detail}>
            <TerasFieldStack spacing="compact">
              <span><TerasStatusPill tone={requirement.tone}>{readOnly ? "Recorded history" : requirement.title}</TerasStatusPill></span>
              {workTitle ? <TerasRecordMetaText>Checked work: {workTitle}</TerasRecordMetaText> : null}
              <TerasActionRow spacing="compact"><TerasActionButton emphasis="secondary" onClick={onInspectTechnicalPlan}>{requirement.status === "covered" ? "View Approved Plan" : requirement.status === "review" ? "Review Technical Plan" : "Open Technical Plan"}</TerasActionButton>
              </TerasActionRow>
              {requirement.ownerReason ? <TerasTechnicalDetails summary="Requirement details" items={[{label:"Check explanation",value:requirement.ownerReason}]}/> : null}
            </TerasFieldStack>
          </TerasContentTray> : null}
          {onInspectHistory || onInspectCloseout || onEditCanonicalTree || onChooseWorkItem ? <TerasActionRow spacing="compact">
            {onInspectHistory && (next.kind !== "evidence" || readOnly) ? <TerasActionButton emphasis="secondary" onClick={onInspectHistory}>View Records & Evidence</TerasActionButton> : null}
            {onInspectCloseout && next.kind !== "closeout" ? <TerasActionButton emphasis="secondary" onClick={onInspectCloseout}>Review Closeout</TerasActionButton> : null}
            {onEditCanonicalTree ? <TerasActionButton disabled={!canonicalTreeAvailable} emphasis="secondary" onClick={onEditCanonicalTree}>Edit Work Structure</TerasActionButton> : null}
            {onChooseWorkItem && !primaryChoosesWork ? <TerasActionButton emphasis="secondary" onClick={() => onChooseWorkItem("all")}>Choose Work Item</TerasActionButton> : null}
          </TerasActionRow> : null}
          {!readOnly && secondaryActions.length ? <TerasList frame="contained">{secondaryActions.filter(action => !(blocker && action.action_type === "clear-blocker")).map(action =>
            <TerasSignalItem textOverflow="wrap" key={action.action_type} label={action.enabled ? "Package action" : "Unavailable"} title={displayAction(action)}
              detail={executionPackageText(action.reason)} tone={action.tone}
              actions={action.enabled ? <TerasActionButton aria-label={`${displayAction(action)} for ${packageSummary.display_name}`} emphasis="secondary"
                tone={action.tone === "danger" ? "danger" : "accent"} onClick={() => onActionSelect(action)}>{displayAction(action)}</TerasActionButton> : undefined} />)}</TerasList> : null}
        </TerasFieldStack>
      </TerasInspectionSection>
      <TerasInspectionSection title="Recent Activity">
        <TerasFieldStack spacing="compact">
          <TerasRecordMetaText>Showing the latest loaded event. View Records &amp; Evidence shows available history and coverage.</TerasRecordMetaText>
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
