"use client";

import { Download } from "lucide-react";

import {
  TerasActivityLogPanel,
  TerasStatusItem,
  TerasList,
  TerasActionButton,
  TerasContentRegion,
  TerasContentTray,
  TerasPanel,
  TerasPanelHeader,
  TerasSubjectHero,
  TerasZoneLayout,
  TerasZone,
} from "@/teras";
import { downloadConsoleBlob } from "@/console-integration/browser-download";
import type {
  DeliveryPackageSummary,
  DeliveryRefinementApplyReceipt,
  DeliveryRefinementPacket,
} from "../../../../../read-model/index.ts";
import type { RefinementOosRun } from "../../../../../live-runtime/refinement-live-types.ts";

import {
  formatRefinementApplyTimestamp,
  refinementApplyHeaderProjection,
  refinementApplyInputsProjection,
  refinementApplyLogFacts,
  refinementApplyLogPanelProjection,
  refinementApplyLogRows,
  refinementApplyOperationTone,
  refinementApplyProgressRows,
  refinementApplyRouteSummary,
  refinementApplyRuntimeLines,
} from "../../view-model/refinement-apply-model.ts";
import { deliveryPackagePacketMetadata } from "../../../../shared/delivery-package-metadata.ts";

export function RefinementApplyView({
  applyInFlight,
  applyStartedAt,
  runtimeErrorAt,
  activeReceipt,
  canApply,
  deliveryPackage,
  onOpenHandoff,
  packet,
  runtimeError,
  runtimeRun,
}: {
  applyInFlight: boolean;
  applyStartedAt: string | null;
  runtimeErrorAt: string | null;
  activeReceipt: DeliveryRefinementApplyReceipt | null;
  canApply: boolean;
  deliveryPackage: DeliveryPackageSummary;
  onOpenHandoff: () => void;
  packet: DeliveryRefinementPacket;
  runtimeError: string | null;
  runtimeRun: RefinementOosRun | null;
}) {
  const preparationOnly = !packet.apply_plan.operations.some(operation => operation.kind === "plan_apply");
  const uniqueRoutes = Array.from(new Set(packet.apply_plan.expected_routes));
  const routeSummary = refinementApplyRouteSummary(uniqueRoutes);
  const applyRecorded = Boolean(activeReceipt ?? packet.receipt);
  const headerProjection = refinementApplyHeaderProjection({
    applyInFlight,
    applyRecorded,
    canApply,
  });
  const inputsProjection = refinementApplyInputsProjection({
    applyInFlight,
    applyRecorded,
    canApply,
  });
  const logProjection = refinementApplyLogPanelProjection({
    applyInFlight,
    applyRecorded,
    canApply,
    runtimeError,
    runtimeRun,
  });
  const runtimeLines = refinementApplyRuntimeLines({
    applyStartedAt,
    runtimeErrorAt,
    activeReceipt,
    canApply,
    packet,
    routeSummary,
    runtimeError,
    runtimeRun,
    uniqueRoutes,
  });
  const applyLogRows = refinementApplyLogRows(runtimeLines);
  const applyLogRecordedAt =
    (activeReceipt ?? packet.receipt)?.applied_at ?? packet.last_saved_at;

  function exportRefinementApplyLog() {
    const fileName = `refinement-apply-log-${deliveryPackage.display_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(
        /^-+|-+$/g,
        "",
      )}-${applyLogRecordedAt.replace(/[:.]/g, "-")}.txt`;
    const content = [
      "Refinement Apply Run Log",
      `Package: ${deliveryPackage.display_name}`,
      `Packet: ${packet.packet_id}`,
      `Work Design Receipt: ${packet.handoff.source_work_design_receipt_id}`,
      `Routes: ${routeSummary}`,
      `Recorded: ${formatRefinementApplyTimestamp(applyLogRecordedAt)}`,
      "",
      ...runtimeLines.map(
        (line) =>
          `${formatRefinementApplyTimestamp(line.timestamp)} ${line.marker} ${line.text}`,
      ),
      "",
    ].join("\n");

    downloadConsoleBlob(
      new Blob([content], { type: "text/plain;charset=utf-8" }),
      fileName,
    );
  }

  return (
    <TerasContentRegion fill>
      <TerasZoneLayout variant="main-aside">
        <TerasZone scroll fit="fill">
          <TerasSubjectHero
            actionDetail="Finalized brief and Work Design apply receipt"
            actionLabel="View Work Design Handoff"
            onAction={onOpenHandoff}
            subject={{
              eyebrow: "Selected Package",
              meta: deliveryPackagePacketMetadata({
                deliveryPackage,
                packetId: packet.packet_id,
              }),
              title: deliveryPackage.display_name,
            }}
          />
          <TerasPanel
            frame="padded"
            treatment="state"
            layout="header-toolbar-body"
            overflow="hidden"
            spacing="normal"
            tone="info"
          >
            <TerasPanelHeader
              kicker="Apply Review"
              statusLabel={headerProjection.statusLabel}
              statusTone={headerProjection.statusTone}
              title={preparationOnly ? applyRecorded ? "Preparation recorded" : "Review work preparation" : headerProjection.title}
              description={preparationOnly ? "Confirm the work details before deciding what to commit in PI Planning." : headerProjection.description}
            />
            <TerasContentTray
              description={packet.apply_plan.summary}
              kicker="Apply Boundary"
            />
            <TerasList fit="fill">
              {applyStartedAt || runtimeRun || applyRecorded ? refinementApplyProgressRows({
                applyInFlight, applyRecorded, runtimeError, runtimeRun,
              }).map((row, index) => <TerasStatusItem key={row.label} {...row} index={String(index + 1).padStart(2, "0")} />) : packet.apply_plan.operations.map((operation, index) => {
                const operationTone = refinementApplyOperationTone(operation);

                return (
                  <TerasStatusItem
                    tone={operationTone}
                    detail={operation.detail}
                    index={String(index + 1).padStart(2, "0")}
                    key={operation.operation_id}
                    label={operation.label}
                    status={operation.status}
                  />
                );
              })}
            </TerasList>
          </TerasPanel>
        </TerasZone>

        <TerasZone scroll fit="fill">
          <TerasPanel spacing="normal"
            density="compact"
            frame="padded"
            treatment="rail"
            tone={inputsProjection.tone}
          >
            <TerasPanelHeader
              kicker="Apply Inputs"
              statusLabel={inputsProjection.statusLabel}
              statusTone={inputsProjection.statusTone}
              title={inputsProjection.title}
              description="Inputs checked before Apply Refinement starts."
            />
            <TerasList>
              <TerasStatusItem
                detail={inputsProjection.readinessDetail}
                label="Readiness Review"
                status={inputsProjection.readinessStatus}
                tone={inputsProjection.readinessTone}
              />
              <TerasStatusItem
                detail={packet.handoff.source_work_design_receipt_id}
                label="Work Design Receipt"
                status="present"
                tone="info"
              />
              {!preparationOnly && <TerasStatusItem
                detail={routeSummary}
                label="OOS Routes"
                status={`${uniqueRoutes.length} route${uniqueRoutes.length === 1 ? "" : "s"}`}
                tone="warn"
              />}
            </TerasList>
          </TerasPanel>

          <TerasActivityLogPanel
            description={logProjection.description}
            fullLog={{
              actions: (
                <TerasActionButton onClick={exportRefinementApplyLog}>
                  <Download aria-hidden="true" size={14} />
                  Export Log
                </TerasActionButton>
              ),
              closeLabel: "Close full apply log",
              description:
                "Timestamped refinement apply events for troubleshooting and receipt review.",
              facts: refinementApplyLogFacts({
                deliveryPackageName: deliveryPackage.display_name,
                packet,
                routeSummary,
              }),
              title: "Apply Run Log",
            }}
            rows={applyLogRows}
            statusLabel={logProjection.statusLabel}
            statusTone={logProjection.statusTone}
            title="Apply Run Log"
            tone={logProjection.tone}
          />
        </TerasZone>
      </TerasZoneLayout>
    </TerasContentRegion>
  );
}
