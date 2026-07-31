import {
  TerasStatusItem,
  TerasList,
  TerasPanel,
  TerasPanelHeader,
  TerasStatusPill,
} from "@/teras";

import {
  prototypeRequestReadinessRows,
  type PrototypeRequestDraft,
} from "../../../work-model/entry/prototype-request-model.ts";

export function PrototypeRequestReadinessPanel({
  canSubmit,
  draft,
}: {
  canSubmit: boolean;
  draft: PrototypeRequestDraft;
}) {
  const readinessRows = prototypeRequestReadinessRows(draft);
  const readyRows = readinessRows.filter((row) => row.tone === "ok").length;
  const blockedRows = readinessRows.filter(
    (row) => row.tone === "danger",
  ).length;
  const readinessTone = blockedRows > 0 ? "danger" : canSubmit ? "ok" : "warn";

  return (
    <TerasPanel
      frame="padded"
      treatment="rail"
      layout="header-body"
      overflow="hidden"
      tone={readinessTone}
    >
      <TerasPanelHeader
        actions={
          <TerasStatusPill tone={readinessTone}>
            {canSubmit ? "Ready" : "Incomplete"}
          </TerasStatusPill>
        }
        actionsLayout="inline"
        description="Required rows before local capture."
        kicker="Request Readiness"
        title={`${readyRows}/${readinessRows.length} ready`}
      />
      <TerasList data-prototype-request-readiness="true">
        {readinessRows.map((row) => (
          <TerasStatusItem
            tone={row.tone}
            detail={row.detail}
            index={row.indexLabel}
            key={row.id}
            label={row.label}
            status={row.status}
          />
        ))}
      </TerasList>
    </TerasPanel>
  );
}
