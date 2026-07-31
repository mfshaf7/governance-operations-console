import {
  TerasActionButton,
  TerasActionRow,
  TerasStatusItem,
  TerasContentRegion,
  TerasPanel,
  TerasPanelHeader,
  TerasList,
  TerasStatGroup,
  TerasStatItem,
  TerasStatusPill,
} from "@/teras";
import type { TerasTone } from "@/teras";

import type { PrototypeRecord } from "../../../read-model/prototype-workspace-read-model.ts";
import type { PrototypePreviewRuntimeActionId } from "./prototype-preview-runtime-model.ts";
import {
  prototypePreviewEvidenceCommandProjection,
  prototypePreviewEvidenceMetrics,
  prototypePreviewEvidenceReceiptProjection,
  prototypePreviewPacketEligibilityRows,
  prototypePreviewProofResult,
  prototypePreviewReceiptRows,
} from "./prototype-preview-runtime-model.ts";

export function PrototypePreviewEvidenceMode({
  proofResult,
  record,
}: {
  proofResult: ReturnType<typeof prototypePreviewProofResult>;
  record: PrototypeRecord;
}) {
  const proofMetrics = prototypePreviewEvidenceMetrics(record, proofResult);
  const receiptRows = prototypePreviewReceiptRows(record);
  const receiptProjection = prototypePreviewEvidenceReceiptProjection(
    record,
    proofResult,
  );

  return (
    <TerasContentRegion fill gap="normal" scroll>
      <TerasPanel frame="padded" treatment="neutral" spacing="normal">
        <TerasPanelHeader
          actions={
            <TerasStatusPill tone={proofResult.tone}>
              {proofResult.statusLabel}
            </TerasStatusPill>
          }
          actionsLayout="inline"
          description="Local proof state for the selected preview profile."
          kicker="Evidence Summary"
          title={proofResult.title}
        />
        <TerasStatGroup columns={3} offset="none">
          {proofMetrics.map((metric) => (
            <TerasStatItem
              key={metric.label}
              label={metric.label}
              value={metric.value}
            />
          ))}
        </TerasStatGroup>
      </TerasPanel>

      <TerasPanel frame="padded" treatment="neutral" spacing="normal">
        <TerasPanelHeader
          actions={
            <TerasStatusPill tone={receiptProjection.tone}>
              {receiptProjection.statusLabel}
            </TerasStatusPill>
          }
          actionsLayout="inline"
          description="Shows the current receipt and local log output. Packet eligibility stays in the inspector."
          kicker="Evidence Output"
          title="Local receipt state"
        />
        <TerasList frame="contained">
          {receiptRows.map((row) => (
            <TerasStatusItem
              tone={row.tone}
              detail={row.detail}
              key={row.label}
              label={row.label}
              status={row.status}
            />
          ))}
        </TerasList>
      </TerasPanel>
    </TerasContentRegion>
  );
}

export function PrototypePreviewEvidenceModeDock({
  commandDisabled,
  commandLabel,
  commandTone,
  onActionSelect,
  onRecordReceipt,
  proofResult,
  record,
}: {
  commandDisabled: boolean;
  commandLabel: string;
  commandTone: TerasTone;
  onActionSelect: (actionId: PrototypePreviewRuntimeActionId) => void;
  onRecordReceipt: () => void;
  proofResult: ReturnType<typeof prototypePreviewProofResult>;
  record: PrototypeRecord;
}) {
  const inspectorRows = prototypePreviewPacketEligibilityRows(record);
  const commandProjection = prototypePreviewEvidenceCommandProjection(
    commandDisabled,
    commandTone,
  );
  const receiptProjection = prototypePreviewEvidenceReceiptProjection(
    record,
    proofResult,
  );

  return (
    <TerasContentRegion data-layout="evidence" fill gap="normal" scroll>
      <TerasPanel
        frame="padded"
        treatment="rail"
        spacing="compact"
        tone={commandTone}
      >
        <TerasPanelHeader
          actions={
            <TerasStatusPill tone={commandProjection.tone}>
              {commandProjection.statusLabel}
            </TerasStatusPill>
          }
          actionsLayout="inline"
          description="Saves preview evidence by recording the current local check for Baseline Promotion. It does not approve baseline promotion or platform readiness."
          kicker="Evidence Action"
          title={commandLabel}
        />
        <TerasActionRow spacing="normal">
          <TerasActionButton
            disabled={commandDisabled}
            onClick={onRecordReceipt}
            tone={commandTone === "danger" ? "danger" : "accent"}
          >
            {commandLabel}
          </TerasActionButton>
        </TerasActionRow>
      </TerasPanel>

      <TerasPanel frame="padded" treatment="neutral" spacing="compact">
        <TerasPanelHeader
          actions={
            <TerasStatusPill tone={receiptProjection.tone}>
              {receiptProjection.statusLabel}
            </TerasStatusPill>
          }
          actionsLayout="inline"
          description="Open log reference, receipt state, and packet eligibility without changing preview state."
          kicker="Evidence Inspectors"
          title="Review evidence details"
        />
        <TerasList frame="contained">
          {inspectorRows.map((row) => (
            <TerasStatusItem
              tone={row.tone}
              detail={row.detail}
              key={`${row.label}-${row.status}`}
              label={row.label}
              status={row.status}
            />
          ))}
        </TerasList>
        <TerasActionRow spacing="normal">
          <TerasActionButton
            onClick={() => onActionSelect("prepare-proof")}
            emphasis="secondary"
          >
            Open Evidence Metadata
          </TerasActionButton>
        </TerasActionRow>
      </TerasPanel>
    </TerasContentRegion>
  );
}
