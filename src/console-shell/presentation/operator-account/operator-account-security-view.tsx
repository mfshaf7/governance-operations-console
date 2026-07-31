"use client";

import { LogOut, ShieldCheck, UserRound } from "lucide-react";

import {
  ConsoleSurfaceButton,
  ConsoleSurfaceChecklist,
  ConsoleSurfaceMetadataList,
  ConsoleSurfacePanel,
  ConsoleSurfaceTwoZone,
} from "../../console-surface-controls";
import { projectOperatorIdentity } from "../../identity/operator-identity-projection";
import type { OperatorAccountController } from "./use-operator-account-controller";

export function OperatorAccountSecurityView({
  controller,
}: {
  controller: OperatorAccountController;
}) {
  const { account } = controller;
  const identity = projectOperatorIdentity(account.identity);

  return (
    <ConsoleSurfaceTwoZone
      primary={
        <ConsoleSurfacePanel
          description="Authentication commands remain unavailable until a federated adapter exists."
          footer={
            <>
              <ConsoleSurfaceButton
                disabled
                icon={<ShieldCheck aria-hidden="true" size={15} />}
                title="No authentication-management adapter is available"
                variant="muted"
              >
                Manage authentication
              </ConsoleSurfaceButton>
              <ConsoleSurfaceButton
                disabled
                icon={<UserRound aria-hidden="true" size={15} />}
                title="No account-switching adapter is available"
                variant="muted"
              >
                Switch account
              </ConsoleSurfaceButton>
            </>
          }
          kicker="Authentication"
          title="Sign-in controls"
          tone="info"
        >
          <ConsoleSurfaceChecklist
            items={[
              {
                detail: identity.authenticationLabel,
                id: "authentication-state",
                label: "Authentication state",
                status: identity.statusLabel,
                tone: identity.tone,
              },
              {
                detail: `Owned by ${account.capabilities.manageAuthentication.owner}.`,
                id: "authentication-adapter",
                label: "Federated identity adapter",
                status: "UNAVAILABLE",
                tone: "muted",
              },
            ]}
          />
        </ConsoleSurfacePanel>
      }
      support={
        <ConsoleSurfacePanel
          description="Session commands require source-issued session authority."
          footer={
            <>
              <ConsoleSurfaceButton
                disabled
                icon={<LogOut aria-hidden="true" size={15} />}
                title="No sign-out adapter is available"
                variant="muted"
              >
                Sign out
              </ConsoleSurfaceButton>
              <ConsoleSurfaceButton
                disabled
                title="No session-revocation adapter is available"
                variant="muted"
              >
                Revoke session
              </ConsoleSurfaceButton>
            </>
          }
          kicker="Session"
          title="Current session"
        >
          <ConsoleSurfaceMetadataList
            items={[
              {
                label: "Mode",
                value: identity.sessionModeLabel,
              },
              {
                label: "Session reference",
                value: account.identity.session.reference || "Not issued",
              },
              {
                label: "Authenticated at",
                value: identity.sessionAuthenticatedAtLabel,
              },
              {
                label: "Expires at",
                value: identity.expiresAtLabel,
              },
            ]}
          />
        </ConsoleSurfacePanel>
      }
    />
  );
}
