"use client";

import {
  ArrowUpRight,
  ChevronRight,
  Clock3,
  Info,
} from "lucide-react";
import { useState } from "react";

import {
  ConsoleSurfaceActionGroup,
  ConsoleSurfaceButton,
  ConsoleSurfaceContentGroup,
  ConsoleSurfaceDialog,
  ConsoleSurfaceEmptyState,
  ConsoleSurfaceFilterBar,
  ConsoleSurfaceMetadataList,
  ConsoleSurfaceTagList,
} from "../../console-shell/console-surface-controls";
import {
  consoleStatusCardClass,
  type ConsoleTone,
} from "../../console-shell/console-shell-status";
import type {
  CommandCenterAttentionCandidate,
  CommandCenterAttentionFreshness,
  CommandCenterAttentionSnapshot,
  CommandCenterAttentionUrgency,
} from "../read-model/command-center-attention";
import { CommandCenterStatusDot } from "./command-center-presentation-support";
import styles from "./command-center-focus.module.css";

function attentionTone(
  candidate: CommandCenterAttentionCandidate,
): ConsoleTone {
  if (candidate.source.freshness === "unavailable") {
    return "danger";
  }

  if (
    candidate.source.freshness === "stale" ||
    candidate.source.freshness === "unverified"
  ) {
    return "stale";
  }

  const urgencyTone = {
    critical: "danger",
    high: "warn",
    low: "muted",
    normal: "info",
  } as const satisfies Record<CommandCenterAttentionUrgency, ConsoleTone>;

  return urgencyTone[candidate.urgency];
}

function projectionTone(
  snapshot: CommandCenterAttentionSnapshot,
): ConsoleTone {
  if (
    snapshot.sources.some(
      (source) => source.source.freshness === "unavailable",
    ) ||
    snapshot.issues.length > 0
  ) {
    return "danger";
  }

  if (
    snapshot.sources.some(
      (source) =>
        source.source.freshness === "stale" ||
        source.source.freshness === "unverified",
    )
  ) {
    return "stale";
  }

  return "ok";
}

function formatToken(value: string) {
  return value
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(timestamp);
}

function timingLabel(candidate: CommandCenterAttentionCandidate) {
  if (candidate.dueAt) {
    return `Due ${formatTimestamp(candidate.dueAt)}`;
  }

  if (candidate.reviewAt) {
    return `Review ${formatTimestamp(candidate.reviewAt)}`;
  }

  return "No due window";
}

function sourcePostureLabel(freshness: CommandCenterAttentionFreshness) {
  if (freshness === "current") {
    return "Current";
  }

  return formatToken(freshness);
}

type AttentionUrgencyFilter =
  | "all"
  | CommandCenterAttentionUrgency;

const attentionUrgencyOptions = [
  { label: "All urgency", value: "all" },
  { label: "Critical", value: "critical" },
  { label: "High", value: "high" },
  { label: "Normal", value: "normal" },
  { label: "Low", value: "low" },
] as const satisfies readonly Readonly<{
  label: string;
  value: AttentionUrgencyFilter;
}>[];

function AttentionQueueRow({
  active,
  candidate,
  index,
  onSelect,
}: {
  active: boolean;
  candidate: CommandCenterAttentionCandidate;
  index: number;
  onSelect: () => void;
}) {
  const tone = attentionTone(candidate);

  return (
    <button
      aria-pressed={active}
      className={consoleStatusCardClass(
        tone,
        `${styles.queueRow} ${active ? styles.queueRowActive : ""}`,
      )}
      data-tone={tone}
      type="button"
      onClick={onSelect}
    >
      <span className={styles.queueRank}>
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className={styles.queueCopy}>
        <span className={styles.queueRowHeader}>
          <span className={styles.toneDot} data-tone={tone}>
            <CommandCenterStatusDot tone={tone} />
          </span>
          <span>{formatToken(candidate.attentionClass)}</span>
        </span>
        <strong title={candidate.subject.title}>
          {candidate.subject.title}
        </strong>
        <small title={candidate.requiredMove.label}>
          {candidate.requiredMove.label}
        </small>
      </span>
      <span className={styles.queueSide}>
        <span>{formatToken(candidate.urgency)}</span>
        <small title={candidate.owner.label}>{candidate.owner.label}</small>
        <ChevronRight aria-hidden="true" size={15} />
      </span>
    </button>
  );
}

function SourceDetailsDialog({
  candidate,
  onClose,
}: {
  candidate: CommandCenterAttentionCandidate | null;
  onClose: () => void;
}) {
  return (
    <ConsoleSurfaceDialog
      description="Projection identity, freshness, and bounded evidence for the selected priority."
      kicker="Priority source"
      onClose={onClose}
      open={Boolean(candidate)}
      title="Source and evidence"
    >
      {candidate ? (
        <div className={styles.dialogContent}>
          <ConsoleSurfaceMetadataList
            items={[
              {
                label: "Authority",
                value: candidate.source.authority,
              },
              {
                label: "Source mode",
                value: formatToken(candidate.source.mode),
              },
              {
                label: "Freshness",
                tone: attentionTone(candidate),
                value: sourcePostureLabel(candidate.source.freshness),
              },
              {
                label: "Version",
                value: candidate.source.version,
              },
              {
                label: "Observed",
                value: formatTimestamp(candidate.source.observedAt),
              },
              {
                label: "Projected",
                value: formatTimestamp(candidate.source.projectedAt),
              },
              {
                label: "Subject ref",
                value: candidate.subject.ref,
              },
              {
                label: "Required move ref",
                value: candidate.requiredMove.id,
              },
              {
                label: "Owner ref",
                value: candidate.owner.ref,
              },
              {
                label: "Source ref",
                value: candidate.source.ref,
              },
            ]}
          />
          <ConsoleSurfaceContentGroup label="Evidence">
            <ConsoleSurfaceTagList
              emptyLabel="No evidence references"
              items={[...candidate.evidenceRefs]}
            />
          </ConsoleSurfaceContentGroup>
          <ConsoleSurfaceContentGroup label="Receipts">
            <ConsoleSurfaceTagList
              emptyLabel="No receipt references"
              items={[...candidate.receiptRefs]}
            />
          </ConsoleSurfaceContentGroup>
        </div>
      ) : null}
    </ConsoleSurfaceDialog>
  );
}

function PriorityDetail({
  candidate,
  onOpen,
  onOpenSource,
}: {
  candidate: CommandCenterAttentionCandidate | null;
  onOpen: (candidate: CommandCenterAttentionCandidate) => void;
  onOpenSource: (candidate: CommandCenterAttentionCandidate) => void;
}) {
  return (
    <section className={`${styles.view} ${styles.priorityView}`}>
      {candidate ? (
        <>
          <header
            className={styles.priorityHeader}
            data-tone={attentionTone(candidate)}
          >
            <div className={styles.priorityEyebrow}>
              <span
                className={styles.toneDot}
                data-tone={attentionTone(candidate)}
              >
                <CommandCenterStatusDot tone={attentionTone(candidate)} />
              </span>
              <span>{formatToken(candidate.attentionClass)}</span>
              <span>{formatToken(candidate.urgency)}</span>
            </div>
            <h3>{candidate.subject.title}</h3>
            <p>{candidate.reason}</p>
          </header>

          <div className={styles.requiredMove}>
            <div>
              <span>Required move</span>
              <strong>{candidate.requiredMove.label}</strong>
            </div>
            <span className={styles.timing}>
              <Clock3 aria-hidden="true" size={14} />
              {timingLabel(candidate)}
            </span>
          </div>

          <ConsoleSurfaceMetadataList
            items={[
              {
                label: "Owner",
                value: candidate.owner.label,
              },
              {
                label: "Authority",
                value: candidate.source.authority,
              },
              {
                label: "Projection",
                meta: formatToken(candidate.source.mode),
                tone: attentionTone(candidate),
                value: sourcePostureLabel(candidate.source.freshness),
              },
              {
                label: "Subject ref",
                value: candidate.subject.ref,
              },
            ]}
          />

          <div className={styles.priorityActions}>
            {candidate.route.availability === "unavailable" ? (
              <p className={styles.routeUnavailable}>
                {candidate.route.unavailableReason}
              </p>
            ) : (
              <span />
            )}
            <ConsoleSurfaceActionGroup align="end">
              <ConsoleSurfaceButton
                icon={<Info aria-hidden="true" size={14} />}
                variant="secondary"
                onClick={() => onOpenSource(candidate)}
              >
                Source details
              </ConsoleSurfaceButton>
              <ConsoleSurfaceButton
                disabled={candidate.route.availability === "unavailable"}
                icon={<ArrowUpRight aria-hidden="true" size={14} />}
                title={candidate.route.unavailableReason ?? undefined}
                variant="primary"
                onClick={() => onOpen(candidate)}
              >
                {candidate.route.label}
              </ConsoleSurfaceButton>
            </ConsoleSurfaceActionGroup>
          </div>
        </>
      ) : (
        <ConsoleSurfaceEmptyState
          detail="Select an owner-projected move from the attention queue."
          title="No selected priority"
        />
      )}
    </section>
  );
}

export function CommandCenterFocus({
  onOpenCandidate,
  onSelectCandidate,
  selectedCandidate,
  snapshot,
}: {
  onOpenCandidate: (candidate: CommandCenterAttentionCandidate) => void;
  onSelectCandidate: (candidateId: string) => void;
  selectedCandidate: CommandCenterAttentionCandidate | null;
  snapshot: CommandCenterAttentionSnapshot;
}) {
  const [searchValue, setSearchValue] = useState("");
  const [sourceDialogCandidate, setSourceDialogCandidate] =
    useState<CommandCenterAttentionCandidate | null>(null);
  const [urgencyFilter, setUrgencyFilter] =
    useState<AttentionUrgencyFilter>("all");
  const sourceTone = projectionTone(snapshot);
  const degradedSourceCount = snapshot.sources.filter(
    (source) => source.source.freshness !== "current",
  ).length;
  const projectionPostureLabel =
    snapshot.issues.length > 0
      ? `${snapshot.issues.length} projection ${
          snapshot.issues.length === 1 ? "issue" : "issues"
        }`
      : degradedSourceCount > 0
        ? `${degradedSourceCount} sources need review`
        : `${snapshot.sources.length} sources current`;
  const normalizedSearch = searchValue.trim().toLowerCase();
  const filteredCandidates = snapshot.candidates.filter((candidate) => {
    if (
      urgencyFilter !== "all" &&
      candidate.urgency !== urgencyFilter
    ) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return [
      candidate.attentionClass,
      candidate.owner.label,
      candidate.requiredMove.label,
      candidate.source.authority,
      candidate.subject.ref,
      candidate.subject.title,
    ].some((value) => value.toLowerCase().includes(normalizedSearch));
  });

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <p>Command Center Focus</p>
          <h2>Operator priority</h2>
          <span>Ranked moves from admitted owner projections.</span>
        </div>
        <div className={styles.projectionPosture} data-tone={sourceTone}>
          <span className={styles.toneDot} data-tone={sourceTone}>
            <CommandCenterStatusDot tone={sourceTone} />
          </span>
          <span>
            {projectionPostureLabel}
          </span>
        </div>
      </header>

      <div className={styles.deck}>
        <div className={styles.filterRow}>
          <ConsoleSurfaceFilterBar
            filters={[
              {
                label: "Urgency",
                onChange: (value) =>
                  setUrgencyFilter(value as AttentionUrgencyFilter),
                options: attentionUrgencyOptions,
                value: urgencyFilter,
              },
            ]}
            onSearchChange={setSearchValue}
            searchPlaceholder="Search priorities"
            searchValue={searchValue}
          />
        </div>

        <section className={`${styles.view} ${styles.attentionView}`}>
          <header className={styles.viewHeader}>
            <div>
              <p>Needs attention</p>
              <h3>{filteredCandidates.length} matching priorities</h3>
              <span>
                Ranked by urgency, source freshness, and ownership.
              </span>
            </div>
            <span className={styles.visibleCount}>
              {Math.min(filteredCandidates.length, 5)} visible
            </span>
          </header>
          {filteredCandidates.length > 0 ? (
            <div className={styles.queueViewport}>
              {filteredCandidates.map((candidate, index) => (
                <AttentionQueueRow
                  active={
                    candidate.candidateId ===
                    selectedCandidate?.candidateId
                  }
                  candidate={candidate}
                  index={index}
                  key={candidate.candidateId}
                  onSelect={() =>
                    onSelectCandidate(candidate.candidateId)
                  }
                />
              ))}
            </div>
          ) : (
            <ConsoleSurfaceEmptyState
              detail="Adjust the search or urgency filter to see other priorities."
              title="No matching priorities"
            />
          )}
        </section>

        <PriorityDetail
          candidate={selectedCandidate}
          onOpen={onOpenCandidate}
          onOpenSource={setSourceDialogCandidate}
        />
      </div>

      <SourceDetailsDialog
        candidate={sourceDialogCandidate}
        onClose={() => setSourceDialogCandidate(null)}
      />
    </div>
  );
}
