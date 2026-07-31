"use client";

import { UserRound } from "lucide-react";

import {
  ConsoleSurfaceDialog,
  ConsoleSurfaceTabPanel,
  ConsoleSurfaceTabs,
} from "../../console-surface-controls";
import { projectOperatorIdentity } from "../../identity/operator-identity-projection";
import { OperatorAccountAccessView } from "./operator-account-access-view";
import { OperatorAccountProfileView } from "./operator-account-profile-view";
import { OperatorAccountSecurityView } from "./operator-account-security-view";
import { OperatorAccountSupportDialogs } from "./operator-account-support-dialogs";
import styles from "./operator-account.module.css";
import type {
  OperatorAccountController,
  OperatorAccountView,
} from "./use-operator-account-controller";

const accountViews = [
  { id: "profile", label: "Profile" },
  { id: "access", label: "Access" },
  { id: "security", label: "Security & Sessions" },
] as const;

function AccountView({
  controller,
  view,
}: {
  controller: OperatorAccountController;
  view: OperatorAccountView;
}) {
  switch (view) {
    case "access":
      return <OperatorAccountAccessView controller={controller} />;
    case "security":
      return <OperatorAccountSecurityView controller={controller} />;
    case "profile":
      return <OperatorAccountProfileView controller={controller} />;
  }
}

export function OperatorAccountCenter({
  controller,
}: {
  controller: OperatorAccountController;
}) {
  const identity = projectOperatorIdentity(controller.account.identity);

  return (
    <>
      <ConsoleSurfaceDialog
        className={styles.accountDialog}
        description="Manage local profile preferences and inspect access and session controls."
        kicker="Console identity"
        onClose={controller.requestAccountClose}
        open={controller.accountOpen}
        size="wide"
        title="Operator Account"
      >
        <div className={styles.accountContent}>
          <div className={styles.accountNavigation}>
            <div className={styles.accountIdentity}>
              <span className={styles.accountIdentityIcon}>
                <UserRound aria-hidden="true" size={17} />
              </span>
              <span className={styles.accountIdentityCopy}>
                <span className={styles.accountIdentityName}>
                  <strong>{controller.account.profile.displayName}</strong>
                  <span
                    className={styles.accountIdentityStatus}
                    data-tone={identity.tone}
                  >
                    {identity.statusLabel}
                  </span>
                </span>
                <small>
                  {identity.roleSummary} / {identity.authoritySummary}
                </small>
              </span>
            </div>
            <ConsoleSurfaceTabs
              activeId={controller.activeView}
              groupId="operator-account"
              onChange={controller.setActiveView}
              tabs={accountViews}
            />
          </div>
          <ConsoleSurfaceTabPanel
            activeId={controller.activeView}
            groupId="operator-account"
          >
            <AccountView
              controller={controller}
              view={controller.activeView}
            />
          </ConsoleSurfaceTabPanel>
        </div>
      </ConsoleSurfaceDialog>
      <OperatorAccountSupportDialogs controller={controller} />
    </>
  );
}
