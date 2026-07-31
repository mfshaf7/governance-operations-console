"use client";

import { Download } from "lucide-react";

import type { DeliveryTone } from "../../../../../read-model/index.ts";

import { formatWorkDesignDateTime } from "../../view-model/work-design-display-formatters.ts";
import { workDesignApplyLogFacts } from "../../view-model/work-design-apply-model.ts";
import { TerasActivityLogDialog, TerasActionButton } from "@/teras";

type WorkDesignApplyExecutionLogLine = {
  marker: string;
  text: string;
  timestamp: string;
  tone: DeliveryTone;
};

type WorkDesignApplyLogDialogProps = {
  applyDraftRef: string;
  applyExecutionLogLines: WorkDesignApplyExecutionLogLine[];
  applyLogRecordedAt: string;
  applyTargetRecordRef: string;
  exportApplyLog: () => void;
  onClose: () => void;
  open: boolean;
  packageName: string;
};

export function WorkDesignApplyLogDialog({
  applyDraftRef,
  applyExecutionLogLines,
  applyLogRecordedAt,
  applyTargetRecordRef,
  exportApplyLog,
  onClose,
  open,
  packageName,
}: WorkDesignApplyLogDialogProps) {
  return (
    <TerasActivityLogDialog
      actions={
        <TerasActionButton onClick={exportApplyLog}>
          <Download aria-hidden="true" size={14} />
          Export Log
        </TerasActionButton>
      }
      closeLabel="Close full apply log"
      description="Timestamped preview record for apply troubleshooting. Live wiring will replace these mock rows with streamed backend events."
      facts={workDesignApplyLogFacts({
        applyDraftRef,
        applyLogRecordedAt,
        applyTargetRecordRef,
        packageName,
      })}
      kicker="Execution Log"
      onClose={onClose}
      open={open}
      rows={applyExecutionLogLines.map((line) => ({
        detail: line.text,
        formattedTimestamp: formatWorkDesignDateTime(line.timestamp),
        marker: line.marker,
        timestamp: line.timestamp,
        tone: line.tone,
      }))}
      title="Apply Run Log"
    />
  );
}
