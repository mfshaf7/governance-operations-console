"use client";

import { useState } from "react";
import { TerasActionButton, TerasDraftCloseGuardDialog, TerasPanel, TerasPanelHeader } from "@/teras";

export function PrototypeWorkflowSourceWarning({ stale, dirty, busy = false, onReload }: {
  stale: boolean;
  dirty: boolean;
  busy?: boolean;
  onReload: () => void;
}) {
  const [confirmReload, setConfirmReload] = useState(false);
  if (!stale) return null;
  return <>
    <TerasPanel frame="padded" treatment="state" tone="warn" spacing="compact">
      <TerasPanelHeader kicker="Draft source" title="Source changed" description="Your draft and current step are preserved. Load the latest source before submitting another decision." />
      <TerasActionButton disabled={busy} emphasis="secondary" onClick={() => dirty ? setConfirmReload(true) : onReload()}>Load latest source</TerasActionButton>
    </TerasPanel>
    <TerasDraftCloseGuardDialog
      open={confirmReload}
      title="Replace this draft?"
      kicker="Source changed"
      description="Loading the latest source will discard this unsaved draft. Keep editing to retain your current input."
      leaveLabel="Discard and reload"
      onKeepEditing={() => setConfirmReload(false)}
      onLeave={() => { if (busy) return; setConfirmReload(false); onReload(); }}
    />
  </>;
}
