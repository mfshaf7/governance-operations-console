"use client";

import { TerasDialog, TerasEmptyState, TerasMetadataList } from "@/teras";

import type { LocalExceptionRuntimeProjection } from "../../../read-model/types/model-operations-types.ts";
import { localExceptionRuntimeMetadata } from "../../shared/model-profile-display-model.ts";

export function LocalExceptionRuntimeDialog({
  onClose,
  open,
  runtime,
}: {
  onClose: () => void;
  open: boolean;
  runtime: LocalExceptionRuntimeProjection;
}) {
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
      <TerasMetadataList items={localExceptionRuntimeMetadata(runtime)} />
      {runtime.models.length === 0 ? (
        <TerasEmptyState>
          No local runtime inventory has been admitted to this projection.
        </TerasEmptyState>
      ) : null}
    </TerasDialog>
  );
}
