"use client";

import { TerasDialog, TerasEmptyState, TerasMetadataList } from "@/teras";

import {
  resolveConsoleFixtureIsolation,
  selectConsoleAuthorityProjection,
} from "../../../../../console-integration/fixture-isolation/console-fixture-isolation.ts";
import { useModelOperationsLiveRuntime } from "../../../live-runtime/use-model-operations-live-runtime.ts";
import { modelOperationsReadModel } from "../../../read-model/model-operations-read-model.ts";
import { localExceptionRuntimeMetadata } from "../../shared/model-profile-display-model.ts";

export function LocalExceptionRuntimeDialog({
  onClose,
  open,
}: {
  onClose: () => void;
  open: boolean;
}) {
  const source = useModelOperationsLiveRuntime();
  const snapshot = source.snapshot;
  const decision = resolveConsoleFixtureIsolation({
    mode: snapshot?.mode ?? null,
    status: snapshot?.status ?? "loading",
  });
  const runtime = selectConsoleAuthorityProjection({
    decision,
    fixture: modelOperationsReadModel,
    live: snapshot?.readModel ?? null,
  })?.localExceptionRuntime;
  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      description="Local model inventory is a separate exception-runtime projection and does not establish governed profile availability."
      kicker="Runtime Inspector"
      onClose={onClose}
      open={open}
      width="standard"
      title="Local Exception Runtime"
    >
      {runtime ? <TerasMetadataList items={localExceptionRuntimeMetadata(runtime)} />
        : <TerasEmptyState>{snapshot ? snapshot.error ?? "Local runtime inventory is unavailable." : "Reading local runtime inventory."}</TerasEmptyState>}
      {runtime && runtime.models.length === 0 ? (
        <TerasEmptyState>
          No local runtime inventory has been admitted to this projection.
        </TerasEmptyState>
      ) : null}
    </TerasDialog>
  );
}
