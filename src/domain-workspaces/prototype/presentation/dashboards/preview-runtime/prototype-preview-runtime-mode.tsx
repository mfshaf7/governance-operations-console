import {
  TerasActivityLogPanel,
  TerasActionButton,
  TerasContentFrame,
  TerasContentRegion,
  TerasContentTray,
  TerasFieldGrid,
  TerasMetadataList,
  TerasPanel,
  TerasPanelHeader,
  TerasRailCard,
  TerasStatusPill,
} from "@/teras";

import type {
  PrototypeProjectedReceipt,
  PrototypeRecord,
} from "../../../read-model/prototype-workspace-read-model.ts";
import type {
  PrototypePreviewRuntimeActionId,
  PrototypePreviewRuntimeMutationActionId,
} from "./prototype-preview-runtime-model.ts";
import {
  prototypePreviewCommandLogProjection,
  prototypePreviewCommandLogRows,
  prototypePreviewProofResult,
  prototypePreviewRuntimeActions,
  prototypePreviewRuntimeContractFacts,
  prototypePreviewRuntimeStatusRows,
} from "./prototype-preview-runtime-model.ts";

export function PrototypePreviewRuntimeMode({
  proofResult,
  record,
}: {
  proofResult: ReturnType<typeof prototypePreviewProofResult>;
  record: PrototypeRecord;
}) {
  return (
    <TerasContentRegion fill gap="normal" scroll>
      <TerasPanel
        data-prototype-preview-runtime-ops="true"
        frame="padded"
        treatment="neutral"
        overflow="visible"
        spacing="normal"
      >
        <TerasPanelHeader
          actions={
            <TerasStatusPill tone={proofResult.tone}>
              {proofResult.statusLabel}
            </TerasStatusPill>
          }
          actionsLayout="inline"
          description={proofResult.summary}
          kicker="Runtime Ops"
          title={proofResult.title}
        />

        <TerasFieldGrid columns={2}>
          {prototypePreviewRuntimeStatusRows(record).map((row) => (
            <TerasRailCard
              detail={row.detail}
              kicker={row.label}
              key={row.label}
              selected={row.label === "Check"}
              title={row.status}
              titleTreatment="tray"
              tone={row.tone}
            />
          ))}
        </TerasFieldGrid>
      </TerasPanel>

      <TerasPanel
        data-prototype-preview-runtime-state="true"
        frame="padded"
        treatment="neutral"
        overflow="visible"
        spacing="compact"
      >
        <TerasPanelHeader
          actions={<TerasStatusPill tone="info">Local profile</TerasStatusPill>}
          actionsLayout="inline"
          description="Launch command, working directory, and profile source used by the preview runtime."
          kicker="Launch Context"
          title="Preview launch contract"
        />
        <TerasMetadataList
          items={prototypePreviewRuntimeContractFacts(record)}
        />
      </TerasPanel>
    </TerasContentRegion>
  );
}

export function PrototypePreviewRuntimeModeDock({
  onActionSelect,
  onRuntimeAction,
  onStopRequest,
  receipts,
  record,
}: {
  onActionSelect: (actionId: PrototypePreviewRuntimeActionId) => void;
  onRuntimeAction: (actionId: PrototypePreviewRuntimeMutationActionId) => void;
  onStopRequest: () => void;
  receipts: PrototypeProjectedReceipt[];
  record: PrototypeRecord;
}) {
  const actions = prototypePreviewRuntimeActions(record);
  const commandRows = prototypePreviewCommandLogRows(receipts);
  const commandLog = prototypePreviewCommandLogProjection(commandRows);
  const outputDisabledReason =
    "No raw command output has been captured for this prototype-local command log.";

  return (
    <TerasContentFrame data-layout="panels" fill variant="standard">
      <TerasPanel frame="padded" treatment="rail" spacing="compact" tone="warn">
        <TerasPanelHeader
          actions={
            <TerasStatusPill tone="warn">
              {actions.filter((action) => !action.disabled).length}/
              {actions.length}
            </TerasStatusPill>
          }
          actionsLayout="inline"
          description="Start, stop, restart, or check the prototype-local preview from the confirmed profile."
          kicker="Control Dock"
          title="Runtime controls"
        />
        <TerasContentTray>
          <TerasFieldGrid columns={2} spacing="compact">
            {actions.map((action) => (
              <TerasActionButton
                disabled={action.disabled}
                key={action.id}
                onClick={() => {
                  if (action.disabled) {
                    return;
                  }

                  if (
                    action.id === "start-preview" ||
                    action.id === "restart-preview"
                  ) {
                    onRuntimeAction(action.id);
                    return;
                  }

                  if (action.id === "stop-preview") {
                    onStopRequest();
                    return;
                  }

                  onActionSelect(action.id);
                }}
                treatment="tonal"
                tone={action.tone}
              >
                {action.label}
              </TerasActionButton>
            ))}
          </TerasFieldGrid>
        </TerasContentTray>
      </TerasPanel>

      <TerasActivityLogPanel
        data-prototype-preview-command-log="true"
        description="Receipts created by Preview Runtime commands in this local prototype session. Raw output opens only after a captured artifact exists."
        footerActions={
          <TerasActionButton
            aria-label="View command output unavailable"
            disabled
            title={outputDisabledReason}
            tone="info"
            treatment="tonal"
          >
            View Output
          </TerasActionButton>
        }
        kicker="Command Log"
        rows={commandRows}
        statusLabel={commandLog.statusLabel}
        statusTone={commandLog.statusTone}
        title="Preview action receipts"
        tone="info"
      />
    </TerasContentFrame>
  );
}
