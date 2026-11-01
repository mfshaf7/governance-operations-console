"use client";

import { useState } from "react";
import type { PrototypeRecord } from "../../../read-model/prototype-workspace-read-model.ts";

// Keep the source that an open draft was derived from. A background read may
// replace object identities without changing any facts; it must not reset edits.
export function usePrototypeWorkflowDraftSource<Dependency = null>(
  record: PrototypeRecord | null,
  dependency: Dependency = null as Dependency,
) {
  const next = { record, dependency, key: JSON.stringify([record, dependency]) };
  const [source, setSource] = useState(next);
  const changedSelection = source.record?.id !== record?.id;
  if (changedSelection) setSource(next);
  const current = changedSelection ? next : source;

  return {
    record: current.record,
    dependency: current.dependency,
    stale: Boolean(record && current.key !== next.key),
    reload: () => setSource(next),
  };
}
