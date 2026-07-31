import {
  TerasActionButton,
  TerasStatusItem,
  TerasDialog,
  TerasMetadataList,
  TerasList,
  TerasTrayStack,
} from "@/teras";

import type { PrototypeRecord } from "../../../read-model/prototype-workspace-read-model.ts";
import type {
  PrototypePreviewRuntimeActionId,
  PrototypePreviewRuntimeMutationActionId,
} from "./prototype-preview-runtime-model.ts";
import {
  prototypePreviewActionDetail,
  prototypePreviewActionDialogShell,
} from "./prototype-preview-runtime-model.ts";

export function PrototypePreviewRuntimeActionDialog({
  actionId,
  onClose,
  onPreviewCheck,
  onPreviewRuntimeAction,
  record,
}: {
  actionId: PrototypePreviewRuntimeActionId | null;
  onClose: () => void;
  onPreviewCheck: (record: PrototypeRecord) => void;
  onPreviewRuntimeAction: (
    record: PrototypeRecord,
    actionId: PrototypePreviewRuntimeMutationActionId,
  ) => void;
  record: PrototypeRecord;
}) {
  const activeAction = actionId
    ? prototypePreviewActionDetail(actionId, record)
    : null;
  const activeActionShell = prototypePreviewActionDialogShell(activeAction);

  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      actions={
        activeAction ? (
          <>
            {activeAction.secondaryAction ? (
              <TerasActionButton onClick={onClose} emphasis="secondary">
                {activeAction.secondaryAction}
              </TerasActionButton>
            ) : null}
            <TerasActionButton
              onClick={() => {
                if (activeAction.primaryBehavior === "record-preview-check") {
                  onPreviewCheck(record);
                }

                if (isPreviewRuntimeMutation(activeAction.primaryBehavior)) {
                  onPreviewRuntimeAction(record, activeAction.primaryBehavior);
                }

                onClose();
              }}
              tone={activeAction.tone === "danger" ? "danger" : "accent"}
            >
              {activeAction.primaryAction}
            </TerasActionButton>
          </>
        ) : null
      }
      closeLabel="Close preview action"
      description={activeActionShell.description}
      kicker="Preview Runtime"
      onClose={onClose}
      open={Boolean(activeAction)}
      width="large"
      title={activeActionShell.title}
    >
      {activeAction ? (
        <TerasTrayStack
          data-prototype-preview-action-dialog="true"
          spacing="wide"
          topOffset="normal"
        >
          <TerasMetadataList items={activeAction.facts} />
          {actionId !== "prepare-proof" ? (
            <TerasList frame="contained">
              {activeAction.rows.map((row) => (
                <TerasStatusItem
                  tone={row.tone}
                  detail={row.detail}
                  key={`${row.label}-${row.status}`}
                  label={row.label}
                  status={row.status}
                />
              ))}
            </TerasList>
          ) : null}
        </TerasTrayStack>
      ) : null}
    </TerasDialog>
  );
}

function isPreviewRuntimeMutation(
  behavior: string | undefined,
): behavior is PrototypePreviewRuntimeMutationActionId {
  return (
    behavior === "restart-preview" ||
    behavior === "start-preview" ||
    behavior === "stop-preview"
  );
}
