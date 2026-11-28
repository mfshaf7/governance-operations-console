"use client";

import { useState } from "react";
import { TerasActionButton, TerasActionRow, TerasContentTray, TerasEmptyState,
  TerasFieldStack, TerasList, TerasLoadingState, TerasSelectableRow, TerasTechnicalDetails } from "@/teras";
import { openExternalConsoleRoute } from "../../external-route.ts";
import type { useSavedProjectRuntime } from "../live-runtime/use-saved-project-runtime.ts";
import type { SavedProjectRun } from "../saved-project-runtime-contract.ts";
import type { SourceDraft } from "../source-editor-contract.ts";

const statuses: Record<SavedProjectRun["status"], string> = {
  acknowledged: "Run accepted", preparing: "Preparing", building: "Building", starting: "Starting",
  ready: "Ready", failed: "Run failed", stopped: "Stopped", stale: "Previous run", unknown: "Awaiting confirmation",
};

function previewAddress(reference: string | undefined): string | null {
  if (!reference) return null;
  try {
    const url = new URL(reference);
    if (url.protocol !== "http:" || !/^[a-z0-9][a-z0-9-]{0,62}\.localhost$/.test(url.hostname) ||
        url.origin === window.location.origin || url.username || url.password || url.search || url.hash) return null;
    return url.href;
  } catch { return null; }
}

function sourceLabel(revision: string) {
  const date = Date.parse(revision);
  return Number.isFinite(date) ? new Date(date).toLocaleString() : revision;
}

function RunDetails({ run }: { run: SavedProjectRun }) {
  const observation = run.observation ?? run.last_observation;
  return <TerasTechnicalDetails items={[
    { label: "Run command", value: run.acknowledgement.command_id },
    { label: "Saved source digest", value: run.source_digest },
    { label: "Runtime setup", value: run.configuration_revision },
    ...(observation ? [{ label: run.observation ? "Observed at" : "Last observed at", value: sourceLabel(observation.observed_at) }] : []),
    ...(observation?.owner_receipt_ref ? [{ label: "Owner receipt", value: observation.owner_receipt_ref }] : []),
    ...(observation?.log_ref ? [{ label: "Run output reference", value: observation.log_ref }] : []),
  ]} />;
}

export function SavedProjectRuntimePanel({ runtime, draft, dirty }: {
  runtime: ReturnType<typeof useSavedProjectRuntime>;
  draft: SourceDraft | null;
  dirty: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const run = runtime.latest;
  const selectedRun = runtime.overview?.records.find(record => record.acknowledgement.command_id === selectedId);
  const currentSaved = draft && run?.source_digest === draft.digest && run.source_revision === draft.revision;
  const endpoint = runtime.confirmed && run?.status === "ready" ? previewAddress(run.observation?.endpoint_ref) : null;
  const title = run?.status === "ready" && !runtime.confirmed ? "Last recorded run was ready" :
    run ? statuses[run.status] : "Run a saved draft";
  return <TerasFieldStack spacing="normal">
    <TerasContentTray kicker="Saved draft runtime" title={title}
      description={dirty ? "Unsaved edits stay in the editor. Run saved draft uses the last confirmed save." :
        draft ? `Latest saved draft · ${sourceLabel(draft.revision)}` : "Save your changes before running them."}>
      {runtime.busy || runtime.checking ? <TerasLoadingState inline label={runtime.busy ? "Checking the original run…" : "Reading project setup…"} /> : null}
      {runtime.fault ? <p role="status">{runtime.fault}</p> : null}
      {run ? <TerasFieldStack spacing="compact">
        <p>{currentSaved ? "This run uses your current saved draft." : `Source for this run · ${sourceLabel(run.source_revision)}`}</p>
        {run.status === "ready" && !endpoint ? <p>{runtime.confirmed ? "This run has no confirmed browser address." : "Refresh run status to confirm that this instance is still running."}</p> : null}
        <RunDetails run={run} />
      </TerasFieldStack> : null}
      <TerasActionRow spacing="tight">
        {endpoint ? <TerasActionButton onClick={() => openExternalConsoleRoute(endpoint)}>Open preview</TerasActionButton> : null}
        {runtime.original || run ? <TerasActionButton emphasis="secondary" disabled={runtime.busy} onClick={runtime.check}>
          {runtime.original ? "Check original run" : "Refresh run status"}
        </TerasActionButton> : null}
        {runtime.showRetry ? <TerasActionButton emphasis="secondary" disabled={runtime.busy} onClick={runtime.retry}>Retry original run</TerasActionButton> : null}
        <TerasActionButton emphasis="secondary" disabled={runtime.checking || runtime.busy} onClick={() => void runtime.refresh()}>Refresh setup</TerasActionButton>
      </TerasActionRow>
    </TerasContentTray>
    {runtime.overview?.records.length ? <TerasContentTray title="Run history" description="Select a run to inspect its recorded result.">
      <TerasList ariaLabel="Saved draft runs" frame="contained" scrollHeight="short">
        {runtime.overview.records.map(record => {
          const id = record.acknowledgement.command_id;
          return <div role="listitem" key={id}>
            <TerasSelectableRow label={sourceLabel(record.acknowledgement.accepted_at)}
              detail={`Saved source · ${sourceLabel(record.source_revision)}`}
              status={statuses[record.status]} selected={selectedId === id} onSelect={() => setSelectedId(id)} />
          </div>;
        })}
      </TerasList>
      {selectedRun ? <TerasContentTray title={statuses[selectedRun.status]}
        description={`Saved source · ${sourceLabel(selectedRun.source_revision)}`}>
        <RunDetails run={selectedRun} />
      </TerasContentTray> : null}
      {runtime.overview.before ? <TerasActionRow><TerasActionButton emphasis="secondary" disabled={runtime.checking} onClick={runtime.loadOlder}>Load earlier runs</TerasActionButton></TerasActionRow> : null}
    </TerasContentTray> : !runtime.checking && runtime.overview ? <TerasEmptyState>No saved-source runs have been recorded for this project.</TerasEmptyState> : null}
  </TerasFieldStack>;
}
