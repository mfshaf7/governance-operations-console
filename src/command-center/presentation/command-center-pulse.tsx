"use client";

import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Gauge,
} from "lucide-react";

import {
  ConsoleShellPanel,
  ConsoleShellSectionTitle,
} from "../../console-shell/console-shell-panel";
import {
  consoleStatusCardClass,
  type ConsoleTone,
} from "../../console-shell/console-shell-status";
import type {
  WorkspacePosture,
  WorkspacePulseDesignScenario,
  WorkspacePulseRoute,
  WorkspacePulseSignal,
  WorkspacePulseSignalId,
  WorkspacePulseSnapshot,
  WorkspacePulseSource,
  WorkspacePulseTone,
} from "../read-model/workspace-pulse";
import {
  CommandCenterDevScenarioSwitch,
  CommandCenterStateIcon,
  CommandCenterStatusDot,
} from "./command-center-presentation-support";
import styles from "./command-center-pulse.module.css";

function toneForSource(source: WorkspacePulseSource): WorkspacePulseTone {
  if (source.state === "unavailable") {
    return "danger";
  }

  if (source.state === "stale" || source.state === "unverified") {
    return "stale";
  }

  return source.mode === "synthetic" ? "info" : "ok";
}

function sourceStateLabel(source: WorkspacePulseSource) {
  if (source.state === "unavailable") {
    return "UNAVAILABLE";
  }

  if (source.state === "stale") {
    return "STALE";
  }

  if (source.state === "unverified") {
    return "UNVERIFIED";
  }

  return source.mode === "synthetic" ? "SYNTHETIC" : "CURRENT";
}

function CommandCenterMetricCard({
  active = false,
  onOpen,
  signal,
}: {
  active?: boolean;
  onOpen: () => void;
  signal: WorkspacePulseSignal;
}) {
  return (
    <button
      aria-pressed={active}
      className={consoleStatusCardClass(
        signal.tone as ConsoleTone,
        `workspace-pulse-card workspace-pulse-card-button ${styles.metricCard} ${
          active
            ? `workspace-pulse-card-active ${styles.cardActive}`
            : ""
        }`,
      )}
      data-tone={signal.tone}
      type="button"
      onClick={onOpen}
    >
      {active ? (
        <span
          className={`system-mood-side-bridge ${styles.sideBridge}`}
          aria-hidden="true"
        />
      ) : null}
      <span className={styles.metricTop}>
        <span className={`metric-label ${styles.metricLabel}`}>
          {signal.label}
        </span>
        <CommandCenterStatusDot tone={signal.tone as ConsoleTone} />
      </span>
      <span className={styles.metricBody}>
        <strong>{signal.value}</strong>
        <span className={`metric-detail ${styles.metricDetail}`}>
          {signal.detail}
        </span>
      </span>
      <span className={styles.metricState}>{signal.stateLabel}</span>
    </button>
  );
}

export function CommandCenterWorkspacePulse({
  onPulseSignalChange,
  onSystemMoodChange,
  posture,
  pulseSignals,
  selectedPulseSignal,
  systemMoodOpen,
}: {
  onPulseSignalChange: (signal: WorkspacePulseSignal | null) => void;
  onSystemMoodChange: (open: boolean) => void;
  posture: WorkspacePosture;
  pulseSignals: readonly WorkspacePulseSignal[];
  selectedPulseSignal: WorkspacePulseSignal | null;
  systemMoodOpen: boolean;
}) {
  return (
    <ConsoleShellPanel
      className={`workspace-pulse-panel selective-bright-copy ${
        styles.panel
      } ${
        systemMoodOpen || selectedPulseSignal
          ? `workspace-pulse-system-open ${styles.panelOpen}`
          : ""
      }`}
    >
      <ConsoleShellSectionTitle
        kicker="Workspace Pulse"
        title="Operating State"
      />
      <div className={styles.metricGrid}>
        {pulseSignals.map((signal) => (
          <CommandCenterMetricCard
            active={selectedPulseSignal?.id === signal.id}
            key={signal.id}
            signal={signal}
            onOpen={() => {
              onSystemMoodChange(false);
              onPulseSignalChange(
                selectedPulseSignal?.id === signal.id ? null : signal,
              );
            }}
          />
        ))}
      </div>
      <button
        aria-pressed={systemMoodOpen}
        className={`system-mood-card system-mood-card-button status-card status-card-${posture.tone} ${styles.moodCard} ${
          systemMoodOpen
            ? `system-mood-card-active ${styles.cardActive}`
            : ""
        }`}
        data-tone={posture.tone}
        type="button"
        onClick={() => onSystemMoodChange(!systemMoodOpen)}
      >
        {systemMoodOpen ? (
          <span
            className={`system-mood-side-bridge ${styles.sideBridge}`}
            aria-hidden="true"
          />
        ) : null}
        <span className={`system-mood-label ${styles.moodLabel}`}>
          <Gauge aria-hidden="true" size={16} />
          SYSTEM MOOD
        </span>
        <strong className={`system-mood-posture ${styles.moodPosture}`}>
          {posture.label}
        </strong>
        <span className={styles.moodDetail}>{posture.detail}</span>
      </button>
    </ConsoleShellPanel>
  );
}

function FocusBackButton({
  label,
  onBack,
}: {
  label: string;
  onBack: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={styles.backButton}
      title={label}
      type="button"
      onClick={onBack}
    >
      <ArrowLeft aria-hidden="true" size={17} />
    </button>
  );
}

function ProjectionStrip({
  projectionLabel,
  sourceSummary,
  stateLabel,
}: {
  projectionLabel: string;
  sourceSummary: string;
  stateLabel: string;
}) {
  return (
    <div className={styles.projectionStrip}>
      <span>{stateLabel}</span>
      <span>{projectionLabel}</span>
      <span>{sourceSummary}</span>
    </div>
  );
}

export function CommandCenterSystemMoodFocus({
  onBack,
  onSelectSignal,
  snapshot,
}: {
  onBack: () => void;
  onSelectSignal: (signal: WorkspacePulseSignal) => void;
  snapshot: WorkspacePulseSnapshot;
}) {
  const { posture } = snapshot;

  return (
    <div className={styles.focusContent}>
      <section className={styles.focusHero}>
        <div className={styles.focusHeader}>
          <div>
            <p className={styles.focusKicker}>System Mood</p>
            <h2 className={styles.focusTitle}>{posture.label}</h2>
            <p className={styles.focusDescription}>{posture.detail}</p>
          </div>
          <FocusBackButton
            label="Back to Command Center"
            onBack={onBack}
          />
        </div>
        <ProjectionStrip
          projectionLabel={posture.projectionLabel}
          sourceSummary={posture.sourceSummary}
          stateLabel={posture.id.toUpperCase()}
        />
      </section>

      <section className={styles.detailSurface}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionKicker}>Why this mood</p>
            <h3>Workspace signals</h3>
            <p>Each signal comes from the same projected snapshot.</p>
          </div>
          <span className={styles.countPill}>
            {snapshot.signals.length} signals
          </span>
        </div>
        <div className={styles.signalList}>
          {snapshot.signals.map((signal) => (
            <button
              className={styles.signalRow}
              data-tone={signal.tone}
              key={signal.id}
              type="button"
              onClick={() => onSelectSignal(signal)}
            >
              <span className={styles.signalIdentity}>
                <CommandCenterStateIcon
                  tone={signal.tone as ConsoleTone}
                />
                <span>
                  <strong>{signal.label}</strong>
                  <small>{signal.detail}</small>
                </span>
              </span>
              <span className={styles.signalValue}>
                <strong>{signal.value}</strong>
                <small>{signal.stateLabel}</small>
              </span>
              <ArrowRight aria-hidden="true" size={18} />
            </button>
          ))}
        </div>
        <p className={styles.boundaryNote}>
          Prototype projection only. Live authorities remain unchanged until
          their read models are connected.
        </p>
      </section>
    </div>
  );
}

function RouteButton({
  onOpen,
  route,
}: {
  onOpen: (route: WorkspacePulseRoute) => void;
  route: WorkspacePulseRoute;
}) {
  return (
    <button
      className={styles.routeButton}
      type="button"
      onClick={() => onOpen(route)}
    >
      {route.label}
      <ArrowUpRight aria-hidden="true" size={15} />
    </button>
  );
}

function PulseRecordList({
  onOpenRoute,
  signal,
  snapshot,
}: {
  onOpenRoute: (route: WorkspacePulseRoute) => void;
  signal: WorkspacePulseSignal;
  snapshot: WorkspacePulseSnapshot;
}) {
  if (signal.id === "source-coverage") {
    return (
      <div className={styles.recordViewport}>
        {snapshot.sources.map((source) => {
          const tone = toneForSource(source);

          return (
            <article
              className={styles.recordRow}
              data-tone={tone}
              key={source.id}
            >
              <span className={styles.recordState}>
                <CommandCenterStateIcon tone={tone as ConsoleTone} />
                {sourceStateLabel(source)}
              </span>
              <span className={styles.recordCopy}>
                <strong>{source.label}</strong>
                <small>
                  Fixture owner: {source.authority} · Live authority:{" "}
                  {source.intendedAuthority}
                </small>
                <span>{source.reference}</span>
              </span>
              <span className={styles.recordAction}>
                {source.route ? (
                  <RouteButton
                    route={source.route}
                    onOpen={onOpenRoute}
                  />
                ) : (
                  <small>No dedicated surface</small>
                )}
              </span>
            </article>
          );
        })}
      </div>
    );
  }

  if (signal.records.length === 0) {
    return (
      <div className={styles.emptyState}>
        <strong>No records in this state.</strong>
        <span>The signal remains visible so its zero state is explicit.</span>
      </div>
    );
  }

  return (
    <div className={styles.recordViewport}>
      {signal.records.map((record) => {
        const source = snapshot.sources.find(
          ({ id }) => id === record.sourceId,
        );

        return (
          <article
            className={styles.recordRow}
            data-tone={record.tone}
            key={record.id}
          >
            <span className={styles.recordState}>
              <CommandCenterStateIcon
                tone={record.tone as ConsoleTone}
              />
              {record.stateLabel}
            </span>
            <span className={styles.recordCopy}>
              <strong>{record.title}</strong>
              <small>{record.summary}</small>
              <span>
                {record.owner} · {record.timingLabel}
                {source ? ` · ${source.label}` : ""}
              </span>
            </span>
            <span className={styles.recordAction}>
              <RouteButton route={record.route} onOpen={onOpenRoute} />
            </span>
          </article>
        );
      })}
    </div>
  );
}

export function CommandCenterPulseMetricFocus({
  activeScenarioId,
  designMode,
  onBack,
  onOpenRoute,
  onScenarioChange,
  scenarioOptions,
  signal,
  snapshot,
}: {
  activeScenarioId: string;
  designMode: boolean;
  onBack: () => void;
  onOpenRoute: (route: WorkspacePulseRoute) => void;
  onScenarioChange: (scenarioId: string) => void;
  scenarioOptions: readonly WorkspacePulseDesignScenario[];
  signal: WorkspacePulseSignal;
  snapshot: WorkspacePulseSnapshot;
}) {
  return (
    <div className={styles.focusContent}>
      <section className={styles.focusHero}>
        <div className={styles.focusHeader}>
          <div>
            <p className={styles.focusKicker}>Workspace Pulse</p>
            <h2 className={styles.focusTitle}>{signal.label}</h2>
            <p className={styles.focusDescription}>{signal.description}</p>
          </div>
          <div className={styles.focusSummary}>
            <strong>{signal.value}</strong>
            <small>{signal.stateLabel}</small>
            <FocusBackButton
              label="Back to Command Center"
              onBack={onBack}
            />
          </div>
        </div>
        <ProjectionStrip
          projectionLabel={signal.projectionLabel}
          sourceSummary={signal.sourceSummary}
          stateLabel={signal.stateLabel}
        />
        <CommandCenterDevScenarioSwitch
          activeId={activeScenarioId}
          className={styles.designSwitcher}
          devMode={designMode}
          label={signal.label}
          options={scenarioOptions.map((scenario) => ({
            description: scenario.description,
            id: scenario.id,
            label: scenario.label,
            tone: scenario.tone as ConsoleTone,
          }))}
          onChange={onScenarioChange}
        />
      </section>

      <section className={styles.detailSurface}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionKicker}>Current records</p>
            <h3>{signal.label}</h3>
            <p>{signal.detail}</p>
          </div>
          <span className={styles.countPill}>
            {signal.id === "source-coverage"
              ? `${snapshot.sources.length} sources`
              : `${signal.records.length} ${
                  signal.records.length === 1 ? "record" : "records"
                }`}
          </span>
        </div>
        <PulseRecordList
          signal={signal}
          snapshot={snapshot}
          onOpenRoute={onOpenRoute}
        />
      </section>
    </div>
  );
}
