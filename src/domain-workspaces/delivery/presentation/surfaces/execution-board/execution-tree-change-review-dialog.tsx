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
  plan,
  submitting,
}: {
  acceptanceNote: string;
  error: string | null;
  onAcceptanceNoteChange: (value: string) => void;
  onApply: () => void;
  onClose: () => void;
  open: boolean;
  plan: ExecutionTreeChangePlanItem[];
  submitting: boolean;
}) {
  if (!open) return null;

  return (
    <TerasModalShell
      bodyLayout="scroll"
      description="Review the exact changes before OOS applies each mutation against fresh Delivery truth."
      footer={
        <>
          <TerasActionButton
            disabled={submitting}
            emphasis="secondary"
            onClick={onClose}
          >
            Back to Editing
          </TerasActionButton>
          <TerasActionButton
            disabled={
              submitting || plan.length === 0 || !acceptanceNote.trim()
            }
            emphasis="primary"
            onClick={onApply}
          >
            {submitting ? "Applying Changes" : "Apply Changes"}
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
        <TerasPanel frame="flush" spacing="compact" treatment="state" tone="warn">
          <TerasPanelHeader
            kicker="Change Review"
            title={`${plan.length} ${plan.length === 1 ? "change" : "changes"} ready`}
            description="Commands run one at a time and refresh the canonical package between mutations."
          />
          {plan.length > 0 ? (
            <TerasList frame="contained">
              {plan.map((item) => (
                <TerasSignalItem
                  key={item.id}
                  label="Pending"
                  title={item.label}
                  tone="warn"
                />
              ))}
            </TerasList>
          ) : (
            <TerasEmptyState>No canonical tree changes are pending.</TerasEmptyState>
          )}
          <TerasNoteField
            label="Acceptance note"
            minimumHeight="short"
            onValueChange={onAcceptanceNoteChange}
            placeholder="Record why these execution changes are accepted."
            value={acceptanceNote}
          />
          {error ? (
            <TerasList frame="contained">
              <TerasSignalItem
                detail={error}
                label="Apply stopped"
                title="Canonical change was not completed"
                tone="danger"
              />
            </TerasList>
          ) : null}
        </TerasPanel>
      </TerasTrayStack>
    </TerasModalShell>
  );
}
