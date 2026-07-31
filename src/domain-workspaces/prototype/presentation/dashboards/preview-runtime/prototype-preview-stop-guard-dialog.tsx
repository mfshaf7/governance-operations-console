import { TerasActionButton, TerasDialog } from "@/teras";

import type { PrototypeRecord } from "../../../read-model/prototype-workspace-read-model.ts";

export function PrototypePreviewStopGuardDialog({
  onClose,
  onStopPreview,
  open,
  record,
}: {
  onClose: () => void;
  onStopPreview: (record: PrototypeRecord) => void;
  open: boolean;
  record: PrototypeRecord;
}) {
  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      actions={
        <>
          <TerasActionButton onClick={onClose} emphasis="secondary">
            Cancel
          </TerasActionButton>
          <TerasActionButton
            onClick={() => {
              onStopPreview(record);
              onClose();
            }}
            tone="danger"
            emphasis="primary"
          >
            Stop Preview
          </TerasActionButton>
        </>
      }
      closeLabel="Cancel stop preview"
      description="Stop the prototype-local preview and clear the active proof state. Existing receipts stay in History."
      kicker="Runtime Control"
      onClose={onClose}
      open={open}
      width="standard"
      title="Stop preview"
    />
  );
}
