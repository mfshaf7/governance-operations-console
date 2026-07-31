"use client";

import { Clock3 } from "lucide-react";
import { useEffect, useState } from "react";

import { ConsoleShellPanel } from "../console-shell-panel";
import { consoleOperatorAccountFixture } from "../fixtures/console-operator.fixture";
import type { OperatorAccountProfile } from "../identity/operator-account-model";
import { OperatorAccountCard } from "./operator-account/operator-account-card";
import { OperatorAccountCenter } from "./operator-account/operator-account-center";
import { useOperatorAccountController } from "./operator-account/use-operator-account-controller";
import styles from "./console-command-bar.module.css";

function ConsoleCommandClock({
  profile,
}: {
  profile: OperatorAccountProfile;
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const date = now
    ? new Intl.DateTimeFormat(profile.locale, {
        day: "2-digit",
        month: "short",
        timeZone: profile.timeZone,
        weekday: "short",
        year: "numeric",
      }).format(now)
    : "Loading date";
  const time = now
    ? new Intl.DateTimeFormat(profile.locale, {
        hour: "2-digit",
        hour12: profile.timeFormat === "12-hour",
        minute: "2-digit",
        second: "2-digit",
        timeZone: profile.timeZone,
      }).format(now)
    : "--:--:--";

  return (
    <div className="command-clock mt-7 inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[11px]">
      <Clock3 className="h-3.5 w-3.5" />
      <span className="mono uppercase tracking-[0.16em]">
        {profile.timeZone.replaceAll("_", " ")} / {date} / {time}
      </span>
    </div>
  );
}

export function ConsoleCommandBar() {
  const accountController = useOperatorAccountController(
    consoleOperatorAccountFixture,
  );

  return (
    <ConsoleShellPanel className="top-command-panel overflow-hidden p-0">
      <div className="relative p-6 md:p-7">
        <div className={styles.layout}>
          <div className={styles.copy}>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <p className="mono text-xs uppercase tracking-[0.32em] text-[var(--teal)]">
                Workspace Governance Console
              </p>
              <span className="hidden h-px w-8 bg-[var(--line-strong)] sm:block" />
              <p className="mono text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                Operations cockpit
              </p>
            </div>
            <h1 className="display-title max-w-3xl text-4xl font-bold text-[var(--text)] md:text-6xl">
              Command Center
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
              Centralized workspace control for delivery state, operating
              signals, system health, and governed operator decisions before
              any assisted workflow is allowed to act.
            </p>
            <ConsoleCommandClock profile={accountController.account.profile} />
          </div>

          <div className={styles.accountSlot}>
            <OperatorAccountCard
              account={accountController.account}
              onOpen={accountController.openAccount}
            />
          </div>
        </div>
      </div>
      <OperatorAccountCenter controller={accountController} />
    </ConsoleShellPanel>
  );
}
