import {
  TerasActionButton, TerasActionRow, TerasDetailGrid, TerasEmptyState,
  TerasFieldStack, TerasList, TerasMetadataList, TerasPanel, TerasPanelHeader,
  TerasStatGroup, TerasStatusItem, TerasStatusPill, TerasTechnicalDetails,
} from "@/teras";
import type { PrototypeProjectedReceipt, PrototypeRecord } from "../../../read-model/prototype-workspace-read-model.ts";
import { prototypeDashboardRuntimeFacts, prototypeDashboardStageCards, type PrototypeDashboardPreviewMode } from "./prototype-dashboard-operations-model.ts";
import type { PrototypeDashboardStatusAreaId } from "./prototype-dashboard-view-model.ts";

export function PrototypeDashboardStages({ record, mode }: {
  record: PrototypeRecord; mode: PrototypeDashboardPreviewMode;
}) {
  return <TerasStatGroup columns={4} offset="none" role="group" aria-label="Prototype stage status">
    {prototypeDashboardStageCards(record, mode).map(stage => (
      <TerasPanel key={stage.id} data-prototype-stage={stage.id} frame="padded" treatment="rail" tone="warn" spacing="compact">
        <TerasPanelHeader kicker={stage.category} title={stage.title} actionsLayout="overlay"
          actions={<TerasStatusPill tone={stage.tone}>{stage.label}</TerasStatusPill>} />
        <TerasPanel data-prototype-stage-details="true" frame="padded" density="compact" treatment="neutral">
          <TerasFieldStack spacing="compact">
            {stage.facts.map(fact => <small key={fact.label}>{fact.label}: <strong>{fact.value}</strong></small>)}
          </TerasFieldStack>
        </TerasPanel>
      </TerasPanel>
    ))}
  </TerasStatGroup>;
}

export function PrototypeDashboardOperationsPanels({ record, mode, receipts, onInspect, onPreview, onSourceAuthoring }: {
  record: PrototypeRecord;
  mode: PrototypeDashboardPreviewMode;
  receipts: PrototypeProjectedReceipt[];
  onInspect: (area: PrototypeDashboardStatusAreaId) => void;
  onPreview: () => void;
  onSourceAuthoring?: () => void;
}) {
  const historical = ["graduated", "graduating", "retired"].includes(record.lifecycle);
  const terminal = record.lifecycle === "graduated" || record.lifecycle === "retired";
  return <TerasDetailGrid variant="balanced" data-prototype-operations="true">
    <TerasPanel frame="padded" treatment="neutral" spacing="normal">
      <TerasPanelHeader kicker="Execution" title="Runtime & source" />
      <TerasMetadataList items={prototypeDashboardRuntimeFacts(record, mode)} />
      <TerasTechnicalDetails items={[
        { label: "Source", value: record.sourcePath },
        { label: "Source version", value: record.projectionVersion },
        ...(mode === "live" || mode === "disconnected" ? [
          { label: "Profile reference", value: record.preview.profileRef },
          { label: "Working directory", value: record.preview.workingDirectory },
          { label: "Launch command", value: record.preview.command },
        ] : []),
      ]} />
      <TerasActionRow layout="split" spacing="normal">
        <TerasActionButton emphasis="primary" onClick={onPreview}>Open Preview Runtime</TerasActionButton>
        {onSourceAuthoring && !terminal ? <TerasActionButton emphasis="primary" onClick={onSourceAuthoring}>Open Source Authoring</TerasActionButton> : null}
      </TerasActionRow>
    </TerasPanel>
    <TerasPanel frame="padded" treatment="neutral" spacing="normal">
      <TerasPanelHeader kicker={historical ? "Retained baseline" : "Qualification"} title="Readiness & evidence" />
      <TerasMetadataList items={[
        { label: "Baseline packet", value: record.baseline.baselineTitle || "Not recorded" },
        { label: "Attached evidence", value: `${record.evidence.length} ${record.evidence.length === 1 ? "record" : "records"}` },
        { label: "Receipt trail", value: `${receipts.length} ${receipts.length === 1 ? "receipt" : "receipts"}` },
        { label: "Evidence disposition", value: record.baseline.evidenceDisposition || "Not recorded" },
      ]} />
      {record.baseline.missingItems.length ? <TerasList frame="contained" scrollHeight="short" ariaLabel="Missing baseline items">
        {record.baseline.missingItems.map((item, index) => <TerasStatusItem key={`${index}-${item}`} label={item} detail={null} status="Missing" tone="warn" />)}
      </TerasList> : <TerasEmptyState>No missing baseline items are listed.</TerasEmptyState>}
      <TerasActionRow layout="split" spacing="normal">
        <TerasActionButton emphasis="secondary" aria-label="Open Evidence Snapshot status detail" onClick={() => onInspect("evidence")}>Inspect evidence</TerasActionButton>
        <TerasActionButton emphasis="secondary" aria-label="Open Receipt Trail status detail" onClick={() => onInspect("receipts")}>View receipts</TerasActionButton>
        <TerasActionButton emphasis="secondary" aria-label="Open Support Profile status detail" onClick={() => onInspect("landing")}>View setup</TerasActionButton>
      </TerasActionRow>
    </TerasPanel>
  </TerasDetailGrid>;
}
