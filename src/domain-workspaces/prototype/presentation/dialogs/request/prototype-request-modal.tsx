"use client";

import { useState } from "react";

import {
  TerasDraftCloseGuardDialog,
  TerasContentFrame,
  TerasModalShell,
  TerasWizardFooter,
  TerasZone,
  TerasZoneLayout,
} from "@/teras";

import {
  prototypeRequestDraftDirty,
  type PrototypeRequestDraft,
} from "../../../work-model/entry/prototype-request-model.ts";
import { PrototypeRequestEntryPanel } from "./prototype-request-entry-panel.tsx";
import { PrototypeRequestReadinessPanel } from "./prototype-request-readiness-panel.tsx";
import { PrototypeRequestSelectionGuideDialog } from "./prototype-request-selection-guide-dialog.tsx";

export function PrototypeRequestModal({
  canSubmit,
  draft,
  onClose,
  onDraftChange,
  onSubmit,
  open,
}: {
  canSubmit: boolean;
  draft: PrototypeRequestDraft;
  onClose: () => void;
  onDraftChange: <Field extends keyof PrototypeRequestDraft>(
    field: Field,
    value: PrototypeRequestDraft[Field],
  ) => void;
  onSubmit: () => void;
  open: boolean;
}) {
  const [closeGuardOpen, setCloseGuardOpen] = useState(false);
  const [selectionGuideOpen, setSelectionGuideOpen] = useState(false);
  const draftDirty = prototypeRequestDraftDirty(draft);

  if (!open) {
    return null;
  }

  function requestClose() {
    if (draftDirty) {
      setCloseGuardOpen(true);
      return;
    }

    setSelectionGuideOpen(false);
    onClose();
  }

  function discardDraftAndClose() {
    setCloseGuardOpen(false);
    setSelectionGuideOpen(false);
    onClose();
  }

  return (
    <>
      <TerasModalShell
        height="content"
        description="Capture an entry packet. Landing still decides support setup, runtime, baseline, and movement readiness."
        footer={
          <TerasWizardFooter
            apply={{
              dataAction: "submit-request",
              disabled: !canSubmit,
              label: "Submit Request",
              onClick: onSubmit,
            }}
            back={{
              dataAction: "close-request",
              emphasis: "secondary",
              label: "Back To Register",
              onClick: requestClose,
            }}
          />
        }
        kicker="Prototype Request"
        bodyLayout="fill"
        onClose={requestClose}
        surfaceId="prototype-request"
        title="Prototype Request"
        width="medium"
      >
        <TerasContentFrame fill variant="standard">
          <TerasZoneLayout
            data-prototype-request-modal="true"
            variant="main-aside"
          >
            <TerasZone fit="fill">
              <PrototypeRequestEntryPanel
                draft={draft}
                onDraftChange={onDraftChange}
                onOpenSelectionGuide={() => setSelectionGuideOpen(true)}
              />
            </TerasZone>

            <TerasZone fit="fill">
              <PrototypeRequestReadinessPanel
                canSubmit={canSubmit}
                draft={draft}
              />
            </TerasZone>
          </TerasZoneLayout>
        </TerasContentFrame>
      </TerasModalShell>
      <TerasDraftCloseGuardDialog
        description="This request draft has unsaved local fields. Leaving now discards the entry packet instead of submitting it for Landing."
        kicker="Request Close Guard"
        leaveLabel="Discard Draft"
        onKeepEditing={() => setCloseGuardOpen(false)}
        onLeave={discardDraftAndClose}
        open={closeGuardOpen}
        title="Discard Prototype Request?"
      />
      <PrototypeRequestSelectionGuideDialog
        onClose={() => setSelectionGuideOpen(false)}
        open={selectionGuideOpen}
      />
    </>
  );
}
