"use client";
import {useEffect} from "react";
import {useConsoleRuntimeCapabilities} from "../../console-integration/configuration/use-console-runtime-capabilities.ts";
import {useRepositoryCatalogChoices} from "../../workspace-registry/live-runtime/use-repository-catalog-choices.ts";
import {repositoryRegistryCatalogOptions} from "../../workspace-registry/repository-catalog-choices.ts";
import {repositoryOwnerRepoCatalogOptions} from "./repository-owner-repo-catalog-projection.ts";

export function useProposalExistingRepositories() {
  const runtime = useConsoleRuntimeCapabilities(), mode = runtime.projection?.mode;
  const search = useRepositoryCatalogChoices(mode === "live");
  useEffect(() => { if (mode !== "live") return; const timer = window.setInterval(() => { if (document.visibilityState === "visible") search.refresh(); }, 15000); return () => window.clearInterval(timer); }, [mode, search.refresh]);
  const snapshot = search.result?.snapshot;
  // Keep the active Studio owner available for its incubation route while the
  // existing-repository field searches bounded private Registry pages.
  const legacy = snapshot?.workflow_id === "workspace-registry-view" ? snapshot.legacy_snapshot : snapshot;
  const options = snapshot ? [...new Map([
    ...(legacy ? repositoryRegistryCatalogOptions(legacy) : []), ...(search.result?.options ?? []),
  ].map(repo => [repo.valueKey, {label: repo.label, owner: `repo:${repo.valueKey}`, value: `repo://${repo.valueKey}`}])).values()] : [];
  const preview = mode === "disconnected-preview";
  return {
    loading: runtime.status === "loading" || search.loading,
    ready: preview || mode === "live" && Boolean(snapshot) && !search.error && !search.loading,
    options: preview ? repositoryOwnerRepoCatalogOptions().map(repo => ({label:repo.label,owner:repo.owner,value:`repo://${repo.valueKey}`})) : options,
    refresh: async () => { search.refresh(); },
    search: {query: search.query, onQueryChange: search.onQueryChange, more: search.result?.more ?? false, error: search.error},
  };
}
