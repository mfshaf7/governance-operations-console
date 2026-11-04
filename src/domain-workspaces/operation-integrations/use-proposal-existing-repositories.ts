"use client";
import { useEffect } from "react";
import { useWorkspaceContinuityRuntime } from "../../workspace-continuity/live-runtime/use-workspace-continuity-runtime.ts";
import { useConsoleRuntimeCapabilities } from "../../console-integration/configuration/use-console-runtime-capabilities.ts";
import { repositoryOwnerRepoCatalogOptions, repositoryCurrentOwnerRepoCatalogOptions } from "./repository-owner-repo-catalog-projection.ts";

export function useProposalExistingRepositories() {
  const runtime = useWorkspaceContinuityRuntime();
  const consoleRuntime = useConsoleRuntimeCapabilities();
  const mode = consoleRuntime.projection?.mode;
  useEffect(() => {
    if (mode !== "live") return;
    let pending = false;
    const refresh = async () => {
      if (pending) return;
      pending = true;
      try { await runtime.load(); } catch { /* Unavailable Inventory cannot authorize a selection. */ }
      finally { pending = false; }
    };
    void refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 15_000);
    return () => window.clearInterval(timer);
  }, [mode, runtime.load]);
  const preview = mode === "disconnected-preview";
  return {
    loading: consoleRuntime.status === "loading" || (mode === "live" && runtime.mode === "loading"),
    ready: preview || (mode === "live" && runtime.mode === "live"),
    options: preview ? repositoryOwnerRepoCatalogOptions().map(repo => ({ label: repo.label, owner: repo.owner, value: `repo://${repo.valueKey}` })) :
      mode === "live" && runtime.mode === "live" ? repositoryCurrentOwnerRepoCatalogOptions(runtime.projection) : [],
    refresh: runtime.load,
  };
}
