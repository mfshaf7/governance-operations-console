"use client";

import { BadgeInfo, KeyRound } from "lucide-react";

import {
  ConsoleSurfaceButton,
  ConsoleSurfaceChecklist,
  ConsoleSurfaceContentGroup,
  ConsoleSurfaceMetadataList,
  ConsoleSurfacePanel,
  ConsoleSurfaceStack,
  ConsoleSurfaceTagList,
  ConsoleSurfaceTwoZone,
} from "../../console-surface-controls";
import { projectOperatorIdentity } from "../../identity/operator-identity-projection";
import type { OperatorAccountController } from "./use-operator-account-controller";

export function OperatorAccountAccessView({
  controller,
}: {
  controller: OperatorAccountController;
}) {
  const { account, openIdentityDetails } = controller;
  const identity = projectOperatorIdentity(account.identity);
  const requestCapability = account.capabilities.requestAccess;

  return (
    <ConsoleSurfaceTwoZone
      primary={
        <ConsoleSurfacePanel
          description="Roles and named authority projected by the current identity source."
          kicker="Assigned access"
          title="Current access context"
        >
          <ConsoleSurfaceStack>
            <ConsoleSurfaceMetadataList
              items={[
                {
                  label: "Environment",
                  value: identity.environmentLabel,
                },
                {
                  label: "Enforcement",
                  tone: identity.trusted ? "ok" : "muted",
                  value: identity.trusted
                    ? "Server enforced"
                    : "Display only",
                },
              ]}
            />
            <ConsoleSurfaceContentGroup label="Roles">
              <ConsoleSurfaceTagList items={account.identity.access.roles} />
            </ConsoleSurfaceContentGroup>
            <ConsoleSurfaceContentGroup label="Named authority">
              <ConsoleSurfaceTagList
                items={account.identity.access.authorities}
              />
            </ConsoleSurfaceContentGroup>
          </ConsoleSurfaceStack>
        </ConsoleSurfacePanel>
      }
      support={
        <ConsoleSurfaceStack>
          <ConsoleSurfacePanel
            description="Access changes require an admitted owner workflow."
            footer={
              <ConsoleSurfaceButton
                disabled={requestCapability.state === "unavailable"}
                icon={<KeyRound aria-hidden="true" size={15} />}
                title="No access-request adapter is available"
                variant="muted"
              >
                Request access
              </ConsoleSurfaceButton>
            }
            kicker="Access changes"
            title="Request path"
            tone="muted"
          >
            <ConsoleSurfaceChecklist
              items={[
                {
                  detail: `Owned by ${requestCapability.owner}.`,
                  id: "access-request-adapter",
                  label: "Access-request adapter",
                  status: "UNAVAILABLE",
                  tone: "muted",
                },
              ]}
            />
          </ConsoleSurfacePanel>
          <ConsoleSurfacePanel
            description="Inspect the references behind the visible identity projection."
            footer={
              <ConsoleSurfaceButton
                icon={<BadgeInfo aria-hidden="true" size={15} />}
                onClick={openIdentityDetails}
              >
                Identity details
              </ConsoleSurfaceButton>
            }
            kicker="Source"
            title="Identity evidence"
          >
            <ConsoleSurfaceChecklist
              items={[
                {
                  detail: identity.sourceModeLabel,
                  id: "identity-source",
                  label: "Current source",
                  status: identity.freshnessLabel,
                  tone: identity.tone,
                },
              ]}
            />
          </ConsoleSurfacePanel>
        </ConsoleSurfaceStack>
      }
    />
  );
}
