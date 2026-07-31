"use client";

import { useState } from "react";

import {
  TerasActionButton,
  TerasActionRow,
  TerasStatusItem,
  TerasCardGrid,
  TerasSummaryCard,
  TerasSummaryCardGrid,
  TerasEmptyState,
  TerasMetadataList,
  TerasModalShell,
  TerasPanel,
  TerasPanelHeader,
  TerasPrimarySideLayout,
  TerasRailCard,
  TerasList,
  TerasStatusPill,
  TerasZone,
} from "@/teras";

import type {
  PrototypeProjectedReceipt,
  PrototypeRecord,
} from "../../../read-model/prototype-workspace-read-model.ts";
import {
  prototypeDashboardAreas,
  prototypeDashboardCards,
  prototypeDashboardPostureFacts,
  prototypeOpenIssueTone,
  type PrototypeDashboardStatusAreaId,
} from "./prototype-dashboard-view-model.ts";
import {
  prototypeLandingStatus,
  prototypePreviewStatus,
  prototypeSelectedPanelMeta,
  prototypeSelectedPanelStatus,
} from "../../shared/prototype-record-display-model.ts";
import { prototypeSupportProfileLabel } from "@/domain-workspaces/prototype/domain/support/prototype-support-profile-model";
import { PrototypeDashboardLifecyclePanel } from "./prototype-dashboard-lifecycle-panel.tsx";
import { PrototypeStatusAreaDialog } from "./prototype-dashboard-status-area-dialog.tsx";

export function PrototypeDashboardModal({
  receipts,
  onClose,
  onOpenCloseout,
  onOpenCurrentAction,
  onOpenHistory,
  onOpenPreviewRuntime,
  record,
}: {
  receipts: PrototypeProjectedReceipt[];
  onClose: () => void;
  onOpenCloseout: (record: PrototypeRecord) => void;
  onOpenCurrentAction: (record: PrototypeRecord) => void;
  onOpenHistory: (record: PrototypeRecord) => void;
  onOpenPreviewRuntime: () => void;
  record: PrototypeRecord | null;
}) {
  const [openArea, setOpenArea] =
    useState<PrototypeDashboardStatusAreaId | null>(null);

  if (!record) {
    return null;
  }

  const selectedStatus = prototypeSelectedPanelStatus(record);
  const previewStatus = prototypePreviewStatus(record);
  const landingStatus = prototypeLandingStatus(record);
  const openIssueTone = prototypeOpenIssueTone(record);
  const isTerminal =
    record.lifecycle === "retired" || record.lifecycle === "graduated";
  const statusAreas = prototypeDashboardAreas(record, receipts);
  const openIssuesScrollable = record.openIssues.length > 2;

  function closeDashboard() {
    setOpenArea(null);
    onClose();
  }

  return (
    <>
      <TerasModalShell
        bodyLayout="fill"
        height="fill"
        description="Stable selected-record cockpit for posture, issues, evidence, controls, and the next state-derived action."
        kicker="Prototype Dashboard"
        onClose={closeDashboard}
        surfaceId="prototype-dashboard"
        title="Prototype Dashboard"
        width="large"
      >
        <TerasPrimarySideLayout
          data-prototype-dashboard="true"
          primaryTop={
            <TerasZone fit="content">
              <TerasPanel
                frame="padded"
                treatment="rail"
                tone={selectedStatus.tone}
              >
                <TerasPanelHeader
                  actions={
                    <TerasStatusPill tone={selectedStatus.tone}>
                      {selectedStatus.label}
                    </TerasStatusPill>
                  }
                  actionsLayout="inline"
                  description={record.summary}
                  kicker="Selected Prototype"
                  title={record.name}
                />
                <TerasMetadataList
                  items={prototypeSelectedPanelMeta(record)}
                  shape="line"
                  topOffset="compact"
                  treatment="chip"
                  wrap
                />
              </TerasPanel>

              <TerasSummaryCardGrid columns={5}>
                {prototypeDashboardCards(record).map((card) => (
                  <TerasSummaryCard
                    key={card.label}
                    label={card.label}
                    tone={card.tone}
                    value={card.value}
                    variant="dense"
                  />
                ))}
              </TerasSummaryCardGrid>
            </TerasZone>
          }
          primaryMain={
            <TerasZone fit="content">
              <TerasPanel
                density="comfortable"
                frame="padded"
                treatment="neutral"
              >
                <TerasPanelHeader
                  actions={
                    <TerasStatusPill tone={selectedStatus.tone}>
                      {selectedStatus.label}
                    </TerasStatusPill>
                  }
                  actionsLayout="inline"
                  description="Canonical lifecycle, visibility, data, boundary, and source fields."
                  kicker="Record Status"
                  title="Project posture"
                />
                <TerasMetadataList
                  items={prototypeDashboardPostureFacts(record)}
                  topOffset="compact"
                />
              </TerasPanel>

              <TerasPanel frame="padded" treatment="neutral" spacing="loose">
                <TerasPanelHeader
                  actions={
                    <TerasStatusPill tone={landingStatus.tone}>
                      {prototypeSupportProfileLabel(
                        record.landing.supportProfile,
                      )}
                    </TerasStatusPill>
                  }
                  actionsLayout="inline"
                  description="Open one status area at a time for read-only source, support, blocker, evidence, receipt, and movement facts."
                  kicker="Status Areas"
                  title="Focused status details"
                />
                <TerasCardGrid columns={5}>
                  {statusAreas.map((area) => (
                    <TerasRailCard
                      actionAriaLabel={`Open ${area.title} status detail`}
                      actionEmphasis="secondary"
                      key={area.id}
                      kicker={area.kicker}
                      onOpen={() => setOpenArea(area.id)}
                      status={
                        <TerasStatusPill size="compact" tone={area.tone}>
                          {area.badge}
                        </TerasStatusPill>
                      }
                      title={area.title}
                      tone={area.tone}
                    />
                  ))}
                </TerasCardGrid>
              </TerasPanel>
            </TerasZone>
          }
          sideFill={
            <TerasZone fit="content">
              {!isTerminal ? (
                <TerasPanel
                  fit="content"
                  frame="padded"
                  treatment="rail"
                  spacing="normal"
                  tone={record.currentMove.tone}
                >
                  <TerasPanelHeader
                    description={record.currentMove.detail}
                    kicker="Current Required Move"
                    title={record.currentMove.label}
                  />
                  <TerasActionRow spacing="normal">
                    <TerasActionButton
                      emphasis="primary"
                      onClick={() => onOpenCurrentAction(record)}
                      tone={
                        record.currentMove.tone === "danger"
                          ? "danger"
                          : "accent"
                      }
                    >
                      {record.currentMove.actionLabel}
                    </TerasActionButton>
                  </TerasActionRow>
                </TerasPanel>
              ) : null}

              <TerasPanel
                fit="content"
                frame="padded"
                treatment="rail"
                spacing="normal"
                tone={previewStatus.tone}
              >
                <TerasPanelHeader
                  actions={
                    <TerasStatusPill tone={previewStatus.tone}>
                      {previewStatus.label}
                    </TerasStatusPill>
                  }
                  actionsLayout="inline"
                  description="Inspect runtime ops, profile config, local proof, logs, and receipt path."
                  kicker="Preview Runtime"
                  title={record.preview.profileRef}
                />
                <TerasActionRow spacing="normal">
                  <TerasActionButton
                    emphasis="primary"
                    onClick={onOpenPreviewRuntime}
                    tone={previewStatus.tone === "danger" ? "danger" : "accent"}
                  >
                    Open Preview Runtime
                  </TerasActionButton>
                </TerasActionRow>
              </TerasPanel>

              <TerasPanel
                density="comfortable"
                fit="content"
                frame="padded"
                treatment="state"
                tone={openIssueTone}
              >
                <TerasPanelHeader
                  actions={
                    <TerasStatusPill tone={openIssueTone}>
                      {record.openIssues.length} open
                    </TerasStatusPill>
                  }
                  actionsLayout="inline"
                  description="Issues that affect prototype status, evidence, or movement readiness."
                  kicker="Open Issues"
                  title="Current blockers and fixes"
                />
                {record.openIssues.length > 0 ? (
                  <TerasList
                    frame="contained"
                    scrollHeight={openIssuesScrollable ? "medium" : undefined}
                  >
                    {record.openIssues.map((issue) => (
                      <TerasStatusItem
                        tone={issue.tone}
                        detail={`${issue.owner} / ${issue.requiredFix}`}
                        key={issue.id}
                        label={issue.title}
                        status={issue.status}
                      />
                    ))}
                  </TerasList>
                ) : (
                  <TerasEmptyState>
                    No open issues are listed for this prototype.
                  </TerasEmptyState>
                )}
              </TerasPanel>

              <PrototypeDashboardLifecyclePanel
                onOpenCloseout={onOpenCloseout}
                onOpenHistory={onOpenHistory}
                record={record}
              />
            </TerasZone>
          }
        />
      </TerasModalShell>

      <PrototypeStatusAreaDialog
        areaId={openArea}
        onClose={() => setOpenArea(null)}
        receipts={receipts}
        record={record}
      />
    </>
  );
}
