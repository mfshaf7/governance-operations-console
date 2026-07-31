import {
  TerasStatusItem,
  TerasDialog,
  TerasEmptyState,
  TerasMetadataList,
  TerasList,
  TerasTrayStack,
} from "@/teras";

import type {
  PrototypeProjectedReceipt,
  PrototypeRecord,
} from "../../../read-model/prototype-workspace-read-model.ts";
import { prototypeReceiptsNewestFirst } from "../../../read-model/selectors/prototype-workspace-selectors.ts";
import {
  prototypeDashboardAreaDialogShell,
  prototypeDashboardAreas,
  prototypeDashboardFacts,
  prototypeDashboardMovementFacts,
  type PrototypeDashboardStatusAreaId,
} from "./prototype-dashboard-view-model.ts";
import { prototypeSupportStateLabel } from "@/domain-workspaces/prototype/domain/support/prototype-support-profile-model";

export function PrototypeStatusAreaDialog({
  areaId,
  onClose,
  receipts,
  record,
}: {
  areaId: PrototypeDashboardStatusAreaId | null;
  onClose: () => void;
  receipts: PrototypeProjectedReceipt[];
  record: PrototypeRecord;
}) {
  const area = prototypeDashboardAreas(record, receipts).find(
    (candidate) => candidate.id === areaId,
  );
  const dialogShell = prototypeDashboardAreaDialogShell(area);

  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      width="standard"
      closeLabel={dialogShell.closeLabel}
      description={dialogShell.description}
      kicker="Prototype Dashboard Detail"
      onClose={onClose}
      open={Boolean(area)}
      title={dialogShell.title}
    >
      {area ? (
        <TerasTrayStack
          data-prototype-dashboard-detail={area.id}
          spacing="wide"
        >
          {renderStatusAreaDetail(area.id, record, receipts)}
        </TerasTrayStack>
      ) : null}
    </TerasDialog>
  );
}

function renderStatusAreaDetail(
  areaId: PrototypeDashboardStatusAreaId,
  record: PrototypeRecord,
  receipts: PrototypeProjectedReceipt[],
) {
  switch (areaId) {
    case "source":
      return (
        <>
          <TerasMetadataList
            items={prototypeDashboardFacts(record)}
            topOffset="compact"
          />
          {record.linkedRecords.length > 0 ? (
            <TerasList frame="contained">
              {record.linkedRecords.map((linkedRecord) => (
                <TerasStatusItem
                  tone={linkedRecord.tone}
                  detail={`${linkedRecord.system} / ${linkedRecord.level} / ${linkedRecord.ref}`}
                  key={`${linkedRecord.role}-${linkedRecord.ref}`}
                  label={linkedRecord.label}
                  status={linkedRecord.role}
                />
              ))}
            </TerasList>
          ) : (
            <TerasEmptyState>
              No linked records are attached to this prototype.
            </TerasEmptyState>
          )}
        </>
      );
    case "landing":
      return (
        <TerasList frame="contained">
          {record.landing.supportRows.map((row) => (
            <TerasStatusItem
              tone={row.tone}
              detail={`${row.summary} / ${row.detail}`}
              key={row.id}
              label={row.label}
              status={prototypeSupportStateLabel(row.state)}
            />
          ))}
        </TerasList>
      );
    case "evidence":
      return record.evidence.length > 0 ? (
        <TerasList frame="contained">
          {record.evidence.map((evidence) => (
            <TerasStatusItem
              tone={evidence.tone}
              detail={evidence.detail}
              key={evidence.id}
              label={evidence.label}
              status={evidence.status}
            />
          ))}
        </TerasList>
      ) : (
        <TerasEmptyState>
          No evidence is attached to this prototype.
        </TerasEmptyState>
      );
    case "receipts": {
      return receipts.length > 0 ? (
        <TerasList frame="contained">
          {prototypeReceiptsNewestFirst(receipts)
            .slice(0, 8)
            .map((receipt) => (
              <TerasStatusItem
                tone={receipt.tone}
                detail={`${receipt.recordedAt} / ${receipt.summary}`}
                key={receipt.id}
                label={receipt.id}
                status={receipt.resultState}
              />
            ))}
        </TerasList>
      ) : (
        <TerasEmptyState>
          No receipts are recorded for this prototype yet.
        </TerasEmptyState>
      );
    }
    case "movement":
      return (
        <>
          <TerasMetadataList
            items={prototypeDashboardMovementFacts(record)}
            topOffset="compact"
          />
          <TerasList frame="contained">
            {record.movementRequest.gateSnapshot.map((gate) => (
              <TerasStatusItem
                tone={gate.tone}
                detail={`${gate.owner} / ${gate.requiredFix ?? gate.summary}`}
                key={gate.gateId}
                label={gate.gateKind}
                status={gate.status}
              />
            ))}
          </TerasList>
        </>
      );
  }
}
