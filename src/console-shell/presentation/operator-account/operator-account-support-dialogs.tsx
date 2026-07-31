"use client";

import {
  ConsoleSurfaceButton,
  ConsoleSurfaceChecklist,
  ConsoleSurfaceDialog,
  ConsoleSurfaceMetadataList,
} from "../../console-surface-controls";
import { projectOperatorIdentity } from "../../identity/operator-identity-projection";
import type { OperatorAccountController } from "./use-operator-account-controller";

export function OperatorAccountSupportDialogs({
  controller,
}: {
  controller: OperatorAccountController;
}) {
  const { account, closeIdentityDetails, identityDetailsOpen } = controller;
  const identity = projectOperatorIdentity(account.identity);

  return (
    <>
      <ConsoleSurfaceDialog
        description="Source evidence for the identity shown in this Console."
        kicker="Identity source"
        onClose={closeIdentityDetails}
        open={identityDetailsOpen}
        title="Identity details"
      >
        <ConsoleSurfaceMetadataList
          items={[
            {
              label: "Principal reference",
              value: account.identity.principal.reference || "Unavailable",
            },
            {
              label: "Actor type",
              value: account.identity.principal.kind,
            },
            {
              label: "Source authority",
              value: account.identity.source.authority || "Unavailable",
            },
            {
              label: "Source mode",
              value: identity.sourceModeLabel,
            },
            {
              label: "Freshness",
              tone: identity.tone,
              value: identity.freshnessLabel,
            },
            {
              label: "Source reference",
              value: account.identity.source.reference || "Unavailable",
            },
            {
              label: "Observed at",
              value: identity.observedAtLabel,
            },
            {
              label: "Schema",
              value: account.identity.schemaVersion,
            },
          ]}
        />
      </ConsoleSurfaceDialog>

      <ConsoleSurfaceDialog
        description="The current profile draft has not been saved."
        footer={
          <>
            <ConsoleSurfaceButton onClick={controller.cancelDiscard}>
              Keep editing
            </ConsoleSurfaceButton>
            <ConsoleSurfaceButton
              onClick={controller.discardProfileAndClose}
              variant="danger"
            >
              Discard changes
            </ConsoleSurfaceButton>
          </>
        }
        kicker="Unsaved profile"
        onClose={controller.cancelDiscard}
        open={controller.discardGuardOpen}
        title="Discard profile changes?"
      >
        <ConsoleSurfaceChecklist
          items={[
            {
              detail: "Display name and time preferences will return to their saved values.",
              id: "discard-profile",
              label: "Profile draft",
              status: "UNSAVED",
              tone: "warn",
            },
          ]}
        />
      </ConsoleSurfaceDialog>
    </>
  );
}
