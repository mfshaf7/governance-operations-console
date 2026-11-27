"use client";

import {
  TerasActionButton,
  TerasEmptyState,
  TerasList,
  TerasModalShell,
  TerasNoteField,
  TerasPanel,
  TerasPanelHeader,
  TerasSignalItem,
  TerasTrayStack,
} from "@/teras";

import type { ExecutionTreeChangePlanItem } from "../../../work-model/execution/execution-tree-change-plan.ts";

export function ExecutionTreeChangeReviewDialog({
  acceptanceNote,
  error,
  onAcceptanceNoteChange,
  onApply,
  onClose,
  open,
  operationStatus = "idle",
  plan,
  submitting,
  appliedIds=[],
  activeId=null,
}: {
  acceptanceNote: string;
  error: string | null;
  onAcceptanceNoteChange: (value: string) => void;
  onApply: () => void;
  onClose: () => void;
  open: boolean;
  operationStatus?: "idle" | "checking" | "completed" | "failed";
  plan: ExecutionTreeChangePlanItem[];
  submitting: boolean;
  appliedIds?:string[];
  activeId?:string|null;
}) {
  if (!open) return null;
  const checking = operationStatus === "checking";

  return (
    <TerasModalShell busy={submitting} busyLabel="Applying reviewed changes…"
      bodyLayout="scroll"
      description="Review the changes before applying them to the work items."
      footer={
        <>
          <TerasActionButton busy={submitting}
            disabled={submitting}
            emphasis="secondary"
            onClick={onClose}
          >
            Back to Editing
          </TerasActionButton>
          <TerasActionButton busy={submitting}
            disabled={
              submitting || checking || plan.length === 0 || !acceptanceNote.trim()
            }
            emphasis="primary"
            onClick={onApply}
          >
            {checking ? "Checking Result" : submitting ? "Applying Changes" : plan.length>0&&appliedIds.length===plan.length ? "Refresh Result" : appliedIds.length?"Retry Remaining Changes":"Apply Changes"}
          </TerasActionButton>
        </>
      }
      height="content"
      kicker="Execution Tree"
      onClose={onClose}
      surfaceId="delivery-execution-tree-change-review"
      title="Review Execution Changes"
      width="standard"
    >
      <TerasTrayStack spacing="compact">
        <TerasPanel frame="padded" spacing="compact" treatment="state" tone="warn">
          <TerasPanelHeader
            kicker="Change Review"
            title={appliedIds.length?`${appliedIds.length} of ${plan.length} changes applied`:`${plan.length} ${plan.length === 1 ? "change" : "changes"} ready`}
            description="Changes are saved one at a time. The list shows which ones have been applied."
          />
          {plan.length > 0 ? (
            <TerasList frame="contained">
              {plan.map((item) => (
                <TerasSignalItem
                  key={item.id}
                  label={appliedIds.includes(item.id)?"Applied":activeId===item.id?"Applying…":"Pending"}
                  title={item.label}
                  tone={appliedIds.includes(item.id)?"ok":"warn"}
                />
              ))}
            </TerasList>
          ) : (
            <TerasEmptyState>No work item changes to apply.</TerasEmptyState>
          )}
          <TerasNoteField
            label="Acceptance note"
            minimumHeight="short"
            onValueChange={onAcceptanceNoteChange}
            placeholder="Record why these execution changes are accepted."
            value={acceptanceNote}
          />
          {checking ? (
            <TerasSignalItem label="Checking result" title="Following the original change"
              detail="Delivery has yet to confirm the result. The Console will check that request before another change can start." tone="info" />
          ) : error ? (
            <TerasList frame="contained">
              <TerasSignalItem
                detail={error}
                label="Apply stopped"
                title="The change could not be confirmed"
                tone="danger"
              />
            </TerasList>
          ) : null}
        </TerasPanel>
      </TerasTrayStack>
    </TerasModalShell>
  );
}
