"use client";

import { useState } from "react";
import {
  TerasActionButton, TerasActionRow, TerasContentRegion, TerasContentTray,
  TerasDetailGrid, TerasEmptyState, TerasFieldStack, TerasMetadataList,
  TerasModalShell, TerasPanel, TerasPanelHeader, TerasRecordTable, TerasStatusPill,
} from "@/teras";
import type { PrototypeProjectedReceipt, PrototypeRecord } from "../../../read-model/prototype-workspace-read-model.ts";
import type { PrototypeClosureViewState } from "../../shared/prototype-closure-presentation-model.ts";
import { prototypeDashboardRecord } from "../../shared/prototype-closure-presentation-model.ts";
import { prototypeDashboardAreas, type PrototypeDashboardStatusAreaId } from "./prototype-dashboard-view-model.ts";
import { prototypeLifecycleStatus, prototypeOverviewContext, prototypeVisibilityLabel } from "../../shared/prototype-record-display-model.ts";
import { PrototypeDashboardLifecyclePanel } from "./prototype-dashboard-lifecycle-panel.tsx";
import { PrototypeDashboardStages, PrototypeDashboardOperationsPanels } from "./prototype-dashboard-panels.tsx";
import type { PrototypeDashboardPreviewMode } from "./prototype-dashboard-operations-model.ts";
import { PrototypeStatusAreaDialog } from "./prototype-dashboard-status-area-dialog.tsx";

export function PrototypeDashboardModal({
  previewOwnerMode, closure, receipts, onClose, onOpenCloseout, onOpenCurrentAction,
  onOpenHistory, onOpenPreviewRuntime, onOpenSourceAuthoring, record,
}: {
  previewOwnerMode: PrototypeDashboardPreviewMode;
  closure: PrototypeClosureViewState | null;
  receipts: PrototypeProjectedReceipt[];
  onClose: () => void;
  onOpenCloseout: (record: PrototypeRecord) => void;
  onOpenCurrentAction: (record: PrototypeRecord) => void;
  onOpenHistory: (record: PrototypeRecord) => void;
  onOpenPreviewRuntime: () => void;
  onOpenSourceAuthoring?: () => void;
  record: PrototypeRecord | null;
}) {
  const [openArea, setOpenArea] = useState<PrototypeDashboardStatusAreaId | null>(null);
  if (!record) return null;
  const displayRecord = prototypeDashboardRecord(record, closure?.preparation);
  const sourceLifecycle = record.sourceEvidence?.authority === "workspace-prototype-studio"
    ? record.lifecycle : closure?.preparation?.expected_state.lifecycle;
  const lifecycle = prototypeLifecycleStatus(displayRecord);
  const terminal = displayRecord.lifecycle === "retired" || displayRecord.lifecycle === "graduated";
  const currentActionAvailable = !terminal && (!sourceLifecycle || sourceLifecycle === record.lifecycle);
  const areas = prototypeDashboardAreas(displayRecord, receipts);
  const handoff = areas.find(area => area.id === "movement")!;

  return <>
    <TerasModalShell bodyLayout="fill" height="fill" kicker="Prototype" title="Prototype Dashboard" width="large"
      surfaceId="prototype-dashboard" onClose={() => { setOpenArea(null); onClose(); }}>
      <TerasContentRegion fill gap="normal" scroll role="region" aria-label="Prototype dashboard content" tabIndex={0} data-prototype-dashboard="true">
        <TerasPanel frame="padded" treatment="neutral" spacing="normal">
          <TerasPanelHeader kicker="Project overview" title={record.name} description={prototypeOverviewContext(record.summary, 200)}
            actionsLayout="inline" actions={<TerasStatusPill tone={lifecycle.tone}>{lifecycle.label}</TerasStatusPill>} />
          <TerasMetadataList shape="line" treatment="chip" wrap items={[
            { label: "Owner", value: record.owner },
            { label: "Visibility", value: prototypeVisibilityLabel(record.visibilityTier) },
          ]} />
          {currentActionAvailable ? <TerasContentTray kicker="Next required action">
            <TerasActionRow layout="split" end={
              <TerasActionButton emphasis="primary" tone={record.currentMove.tone === "danger" ? "danger" : "accent"} onClick={() => onOpenCurrentAction(record)}>{record.currentMove.actionLabel}</TerasActionButton>
            }>
              <TerasFieldStack spacing="compact">
                <strong>{record.currentMove.label}</strong>
                <span>{prototypeOverviewContext(record.currentMove.detail, 180)}</span>
              </TerasFieldStack>
            </TerasActionRow>
          </TerasContentTray> : terminal ? <TerasEmptyState>{lifecycle.label}. History and owner receipts remain available.</TerasEmptyState> : null}
          {record.summary.length > 200 ? <TerasActionRow layout="split" spacing="compact"><TerasActionButton size="table-compact" emphasis="secondary" onClick={() => setOpenArea("source")}>Full context</TerasActionButton></TerasActionRow> : null}
        </TerasPanel>

        <PrototypeDashboardStages record={displayRecord} mode={previewOwnerMode} />
        <PrototypeDashboardOperationsPanels record={displayRecord} mode={previewOwnerMode} receipts={receipts}
          onInspect={setOpenArea} onPreview={onOpenPreviewRuntime} onSourceAuthoring={onOpenSourceAuthoring} />

        <TerasPanel frame="padded" treatment="neutral" spacing="normal" data-prototype-issues="true">
          <TerasPanelHeader kicker="Attention" title="Open issues and required fixes" actionsLayout="inline"
            actions={<TerasStatusPill tone={record.openIssues.length ? "warn" : "muted"}>{record.openIssues.length} open</TerasStatusPill>} />
          {record.openIssues.length ? <TerasRecordTable profile="register" density="normal" rows={record.openIssues} getRowId={issue => issue.id} columns={[
            { key: "issue", header: "Issue", intent: "primary", render: issue => issue.title },
            { key: "status", header: "Status", intent: "status", render: issue => <TerasStatusPill tone={issue.tone}>{issue.status}</TerasStatusPill> },
            { key: "owner", header: "Owner", render: issue => issue.owner },
            { key: "fix", header: "Required fix", render: issue => issue.requiredFix },
          ]} /> : <TerasEmptyState>No open issues are listed.</TerasEmptyState>}
        </TerasPanel>

        <TerasDetailGrid variant="balanced">
          <TerasPanel frame="padded" treatment="neutral" spacing="normal">
            <TerasPanelHeader kicker="Inspection" title="Source and handoff" description="Inspect the project source and its handoff records." />
            <TerasActionRow layout="split" spacing="normal">
              <TerasActionButton emphasis="secondary" aria-label="Open Source Context status detail" onClick={() => setOpenArea("source")}>Inspect source</TerasActionButton>
              <TerasActionButton emphasis="secondary" aria-label={`Open ${handoff.title} status detail`} onClick={() => setOpenArea("movement")}>{terminal ? "Handoff history" : "Inspect handoff"}</TerasActionButton>
              {!terminal ? <TerasActionButton emphasis="secondary" onClick={() => onOpenHistory(record)}>View History</TerasActionButton> : null}
            </TerasActionRow>
          </TerasPanel>
          <PrototypeDashboardLifecyclePanel lifecycle={displayRecord.lifecycle}
            pendingClosure={Boolean(closure?.result && !["succeeded", "denied", "failed"].includes(closure.result.status))}
            onOpenCloseout={onOpenCloseout} onOpenHistory={onOpenHistory} record={record} />
        </TerasDetailGrid>
      </TerasContentRegion>
    </TerasModalShell>
    <PrototypeStatusAreaDialog areaId={openArea} onClose={() => setOpenArea(null)} receipts={receipts} record={displayRecord} />
  </>;
}
