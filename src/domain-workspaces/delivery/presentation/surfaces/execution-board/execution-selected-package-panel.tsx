import type {
  DeliveryArtNode,
  DeliveryAvailableAction,
  DeliveryPackageSummary,
} from "../../../read-model/index.ts";
import {
  getAvailableActions,
  getChildCounts,
  getDeliveryEffectivePackageProjection,
  getPackageAuditEvents,
  getPackageDetailsById,
} from "../../../read-model/index.ts";

import {
  TerasActionButton,
  TerasEmptyState,
  TerasInspectionSection,
  TerasMetadataList,
  TerasPanelHeader,
  TerasList,
  TerasSignalItem,
} from "@/teras";
import {
  executionActiveBlockerMetadata,
  executionBoardPrimaryAction,
  executionBoardSecondaryActions,
  executionSelectedPackageMetadata,
} from "./execution-board-view-model.ts";

export function ExecutionSelectedPackagePanel({
  auditEvents,
  details,
  onActionSelect,
  packageSummary,
  packageTree,
  selectedActions,
}: {
  auditEvents: ReturnType<typeof getPackageAuditEvents>;
  details: ReturnType<typeof getPackageDetailsById>;
  onActionSelect: (action: DeliveryAvailableAction) => void;
  packageSummary: DeliveryPackageSummary;
  packageTree: DeliveryArtNode | null;
  selectedActions: ReturnType<typeof getAvailableActions>;
}) {
  const effectiveProjection =
    getDeliveryEffectivePackageProjection(packageSummary);
  const childCounts = packageTree ? getChildCounts(packageTree) : null;
  const primaryAction = executionBoardPrimaryAction(selectedActions);
  const secondaryActions = executionBoardSecondaryActions(
    selectedActions,
    primaryAction,
  );
  const latestEvent = auditEvents[0] ?? null;

  return (
    <>
      <TerasPanelHeader
        kicker="Delivery Package"
        statusLabel={effectiveProjection.posture}
        statusTone={effectiveProjection.tone}
        title={packageSummary.display_name}
        description={packageSummary.source_ref}
      />

      <TerasInspectionSection title="Lifecycle Context">
        <TerasMetadataList
          items={executionSelectedPackageMetadata({
            childCounts,
            details,
            packageSummary,
          })}
        />
      </TerasInspectionSection>

      {packageSummary.active_blocker ? (
        <TerasInspectionSection title="Active Blocker">
          <TerasList frame="contained">
            <TerasSignalItem
              detail={packageSummary.active_blocker.impact}
              label="Cause"
              meta={packageSummary.active_blocker.justification}
              title={packageSummary.active_blocker.statement}
              tone="danger"
            />
          </TerasList>
          <TerasMetadataList
            items={executionActiveBlockerMetadata(
              packageSummary.active_blocker,
            )}
            shape="line"
            treatment="chip"
            wrap
          />
        </TerasInspectionSection>
      ) : null}

      <TerasInspectionSection title="Primary Move">
        {primaryAction ? (
          <TerasList frame="contained">
            <TerasSignalItem
              actions={
                <TerasActionButton
                  emphasis="primary"
                  onClick={() => onActionSelect(primaryAction)}
                  tone={primaryAction.tone === "danger" ? "danger" : "accent"}
                >
                  {primaryAction.label}
                </TerasActionButton>
              }
              detail={primaryAction.reason}
              label="Primary move"
              title={primaryAction.label}
              tone={primaryAction.tone}
            />
          </TerasList>
        ) : (
          <TerasEmptyState>
            No lifecycle move is currently available for this package.
          </TerasEmptyState>
        )}
      </TerasInspectionSection>

      <TerasInspectionSection title="Supporting Actions">
        <TerasList frame="contained">
          {secondaryActions.map((action) => (
            <TerasSignalItem
              actions={
                action.enabled ? (
                  <TerasActionButton
                    aria-label={`${action.label} for ${packageSummary.display_name}`}
                    emphasis="secondary"
                    onClick={() => onActionSelect(action)}
                    tone={action.tone === "danger" ? "danger" : "accent"}
                  >
                    {action.label}
                  </TerasActionButton>
                ) : null
              }
              detail={action.reason}
              key={action.action_type}
              label={action.enabled ? "Available" : "Unavailable"}
              title={action.label}
              tone={action.tone}
            />
          ))}
        </TerasList>
      </TerasInspectionSection>

      <TerasInspectionSection title="Latest History">
        {latestEvent ? (
          <TerasList frame="contained">
            <TerasSignalItem
              detail={latestEvent.detail}
              label={latestEvent.category}
              meta={`${latestEvent.occurred_at} / ${
                latestEvent.receipt_id ?? "no receipt"
              }`}
              title={latestEvent.title}
              tone={latestEvent.tone}
            />
          </TerasList>
        ) : (
          <TerasEmptyState>
            No package-scoped audit events are projected for this package yet.
          </TerasEmptyState>
        )}
      </TerasInspectionSection>
    </>
  );
}
