"use client";

import {
  Blocks,
  Cable,
  Database,
  GitPullRequestArrow,
  LayoutDashboard,
  Rocket,
  Settings2,
} from "lucide-react";

import type { OperationWorkbenchSelectorEntry } from "../../operation-workbench/operation-workbench-selector-model";
import type { ConsoleWorkspaceId } from "../../console-architecture";
import {
  consoleOverviewEntry,
  consoleWorkspaceEntryById,
} from "./console-entry-model";
import styles from "./console-primary-navigation.module.css";

export function ConsolePrimaryNavigation({
  activeWorkspaceId,
  onOpenConsole,
  onOpenWorkbenchDomain,
  onOpenWorkspace,
  selectedWorkbenchSurface,
  workspaceEntries = [],
  workbenchEntries,
}: {
  activeWorkspaceId: ConsoleWorkspaceId | null;
  onOpenConsole: () => void;
  onOpenWorkbenchDomain: (entry: OperationWorkbenchSelectorEntry) => void;
  onOpenWorkspace: (workspaceId: ConsoleWorkspaceId) => void;
  selectedWorkbenchSurface: OperationWorkbenchSelectorEntry | null;
  workspaceEntries?: readonly ConsoleWorkspaceId[];
  workbenchEntries: readonly OperationWorkbenchSelectorEntry[];
}) {
  const lifecycleTransitionsAvailable = workspaceEntries.includes(
    "lifecycle-transitions",
  );
  const workspaceRegistryAvailable = workspaceEntries.includes(
    "workspace-registry",
  );
  const devIntegrationAvailable = workspaceEntries.includes("dev-integration");
  const governedReleasesAvailable =
    workspaceEntries.includes("governed-releases");
  const destinationCount =
    1 +
    workbenchEntries.length +
    Number(lifecycleTransitionsAvailable) +
    Number(workspaceRegistryAvailable) +
    Number(devIntegrationAvailable) +
    Number(governedReleasesAvailable);

  return (
    <nav aria-label="Console navigation" className={styles.dock}>
      <div className={styles.identity}>
        <span className={styles.identityMark}>
          <Blocks aria-hidden="true" size={18} />
        </span>
        <span className={styles.identityCopy}>
          <strong>Governance Console</strong>
          <span>Navigation</span>
        </span>
      </div>

      <div className={styles.navigationSurface}>
        <div className={styles.navigationHeader}>
          <p>Console destinations</p>
          <span aria-label={`${destinationCount} destinations`}>
            {destinationCount}
          </span>
        </div>

        <div className={styles.groups}>
          <section
            aria-labelledby="console-navigation-overview"
            className={styles.group}
          >
            <p className={styles.groupLabel} id="console-navigation-overview">
              Overview
            </p>
            <button
              aria-current={
                !activeWorkspaceId && !selectedWorkbenchSurface
                  ? "page"
                  : undefined
              }
              className={styles.entry}
              data-current={
                !activeWorkspaceId && !selectedWorkbenchSurface
                  ? "true"
                  : "false"
              }
              onClick={onOpenConsole}
              title="Console"
              type="button"
            >
              <span className={styles.entryIcon}>
                <LayoutDashboard aria-hidden="true" size={17} />
              </span>
              <span className={styles.entryCopy}>
                <span className={styles.entryLabel}>
                  {consoleOverviewEntry.label}
                </span>
                <span className={styles.entryDescription}>
                  {consoleOverviewEntry.description}
                </span>
              </span>
            </button>
          </section>

          <section
            aria-labelledby="console-navigation-workbench"
            className={`${styles.group} ${styles.workbenchGroup}`}
          >
            <p className={styles.groupLabel} id="console-navigation-workbench">
              Operation Workbench
            </p>
            <div
              aria-label="Operation Workbench destinations"
              className={styles.workbenchList}
              role="group"
            >
              {workbenchEntries.map((entry, index) => {
                const current =
                  selectedWorkbenchSurface?.domain === entry.domain;

                return (
                  <button
                    aria-current={current ? "page" : undefined}
                    className={styles.workbenchEntry}
                    data-current={current ? "true" : "false"}
                    key={entry.domain}
                    onClick={() => onOpenWorkbenchDomain(entry)}
                    title={`Open ${entry.label}`}
                    type="button"
                  >
                    <span className={styles.workbenchIndex}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className={styles.entryCopy}>
                      <span className={styles.entryLabel}>{entry.label}</span>
                      <span className={styles.entryDescription}>
                        {entry.navigationDescription}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {lifecycleTransitionsAvailable || workspaceRegistryAvailable ? (
            <section
              aria-labelledby="console-navigation-coordination"
              className={styles.group}
            >
              <p
                className={styles.groupLabel}
                id="console-navigation-coordination"
              >
                Coordination
              </p>
              <div className={styles.environmentList}>
                {lifecycleTransitionsAvailable ? (
                  <button
                    aria-current={activeWorkspaceId === "lifecycle-transitions" ? "page" : undefined}
                    className={styles.entry}
                    data-current={activeWorkspaceId === "lifecycle-transitions" ? "true" : "false"}
                    onClick={() => onOpenWorkspace("lifecycle-transitions")}
                    title={consoleWorkspaceEntryById["lifecycle-transitions"].label}
                    type="button"
                  >
                    <span className={styles.entryIcon}>
                      <GitPullRequestArrow aria-hidden="true" size={17} />
                    </span>
                    <span className={styles.entryCopy}>
                      <span className={styles.entryLabel}>{consoleWorkspaceEntryById["lifecycle-transitions"].label}</span>
                      <span className={styles.entryDescription}>{consoleWorkspaceEntryById["lifecycle-transitions"].description}</span>
                    </span>
                  </button>
                ) : null}
                {workspaceRegistryAvailable ? (
                  <button
                    aria-current={activeWorkspaceId === "workspace-registry" ? "page" : undefined}
                    className={styles.entry}
                    data-current={activeWorkspaceId === "workspace-registry" ? "true" : "false"}
                    onClick={() => onOpenWorkspace("workspace-registry")}
                    title={consoleWorkspaceEntryById["workspace-registry"].label}
                    type="button"
                  >
                    <span className={styles.entryIcon}>
                      <Database aria-hidden="true" size={17} />
                    </span>
                    <span className={styles.entryCopy}>
                      <span className={styles.entryLabel}>{consoleWorkspaceEntryById["workspace-registry"].label}</span>
                      <span className={styles.entryDescription}>{consoleWorkspaceEntryById["workspace-registry"].description}</span>
                    </span>
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}

          {devIntegrationAvailable || governedReleasesAvailable ? (
            <section
              aria-labelledby="console-navigation-environment"
              className={styles.group}
            >
              <p
                className={styles.groupLabel}
                id="console-navigation-environment"
              >
                Environment
              </p>
              <div className={styles.environmentList}>
                {devIntegrationAvailable ? (
                  <button
                    aria-current={
                      activeWorkspaceId === "dev-integration"
                        ? "page"
                        : undefined
                    }
                    className={styles.entry}
                    data-current={
                      activeWorkspaceId === "dev-integration" ? "true" : "false"
                    }
                    onClick={() => onOpenWorkspace("dev-integration")}
                    title={consoleWorkspaceEntryById["dev-integration"].label}
                    type="button"
                  >
                    <span className={styles.entryIcon}>
                      <Cable aria-hidden="true" size={17} />
                    </span>
                    <span className={styles.entryCopy}>
                      <span className={styles.entryLabel}>
                        {consoleWorkspaceEntryById["dev-integration"].label}
                      </span>
                      <span className={styles.entryDescription}>
                        {
                          consoleWorkspaceEntryById["dev-integration"]
                            .description
                        }
                      </span>
                    </span>
                  </button>
                ) : null}
                {governedReleasesAvailable ? (
                  <button
                    aria-current={
                      activeWorkspaceId === "governed-releases"
                        ? "page"
                        : undefined
                    }
                    className={styles.entry}
                    data-current={
                      activeWorkspaceId === "governed-releases"
                        ? "true"
                        : "false"
                    }
                    onClick={() => onOpenWorkspace("governed-releases")}
                    title={consoleWorkspaceEntryById["governed-releases"].label}
                    type="button"
                  >
                    <span className={styles.entryIcon}>
                      <Rocket aria-hidden="true" size={17} />
                    </span>
                    <span className={styles.entryCopy}>
                      <span className={styles.entryLabel}>
                        {consoleWorkspaceEntryById["governed-releases"].label}
                      </span>
                      <span className={styles.entryDescription}>
                        {
                          consoleWorkspaceEntryById["governed-releases"]
                            .description
                        }
                      </span>
                    </span>
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>

        <section
          aria-labelledby="console-navigation-configuration"
          className={`${styles.group} ${styles.configurationGroup}`}
        >
          <p
            className={styles.groupLabel}
            id="console-navigation-configuration"
          >
            Configuration
          </p>
          <button
            className={`${styles.entry} ${styles.reservedEntry}`}
            disabled
            title="Settings surface is reserved for later design"
            type="button"
          >
            <span className={styles.entryIcon}>
              <Settings2 aria-hidden="true" size={17} />
            </span>
            <span className={styles.entryCopy}>
              <span className={styles.entryLabel}>Settings</span>
              <span className={styles.entryDescription}>
                Configure console behavior.
              </span>
            </span>
          </button>
        </section>
      </div>
    </nav>
  );
}
