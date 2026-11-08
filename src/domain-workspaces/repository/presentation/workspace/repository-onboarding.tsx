"use client";

import {useEffect, useMemo, useState} from "react";
import {openExternalConsoleRoute} from "../../../../console-integration/external-route.ts";
import {TerasActionButton, TerasContentTray, TerasFieldStack, TerasLoadingState, TerasMetadataList, TerasModalShell, TerasSelectField} from "@/teras";
import {useWorkspaceContinuityRuntime} from "../../../../workspace-continuity/live-runtime/use-workspace-continuity-runtime.ts";
import {useRepositoryRegistrationStatus} from "../../../../workspace-registry/live-runtime/use-repository-registration-status.ts";
import {useRepositoryCustodyLiveRuntime} from "../../live-runtime/use-repository-custody-live-runtime.ts";
import {readRepositoryCustodyRegister} from "../../live-runtime/repository-custody-live-readback.ts";
import {projectRepositoryCustodyResults, projectRepositoryProvisioningResults} from "../../live-runtime/repository-custody-live-projection.ts";
import {projectRepositoryCurrentInventory} from "../../live-runtime/repository-inventory-live-projection.ts";
import type {RepositoryCustodyWorkflowResult} from "../../live-runtime/repository-custody-live-types.ts";
import type {WorkspaceIntakeDecision} from "../../../../console-integration/workspace-intake/workspace-intake-live-types.ts";
import {RepositoryIntakeDialog} from "../dialogs/admission/repository-intake-dialog.tsx";
import {repositoryProposedRecords} from "../../read-model/fixtures/records/repository-proposed-records.fixture.ts";

// Registry's public adapter to the existing custody-bound repository form.
// No new registration record, approval path or client-owned readiness flag.
export function RepositoryOnboarding(props: {
  providerId?: string | null; fixtureMode?: boolean; onActivate: (name: string, route?: "activation" | "lifecycle") => void; onClose: () => void;
}) {
  if (props.fixtureMode) return <RepositoryIntakeDialog preview repository={{...repositoryProposedRecords[0],
    id: "preview-repository-onboarding", name: "sample-notes-app", githubUrl: "https://github.com/example/sample-notes-app",
    purpose: "A small notes application for an individual user. This repository holds its source and documentation."}}
    ownerRepositories={["sample-notes-app"]} onClose={props.onClose} />;
  return <LiveRepositoryOnboarding {...props} />;
}

function LiveRepositoryOnboarding({providerId = null, fixtureMode = false, onActivate, onClose}: {
  providerId?: string | null; fixtureMode?: boolean; onActivate: (name: string, route?: "activation" | "lifecycle") => void; onClose: () => void;
}) {
  const custody = useRepositoryCustodyLiveRuntime(), continuity = useWorkspaceContinuityRuntime();
  const [selection, setSelection] = useState(providerId ?? "");
  const [selected, setSelected] = useState<RepositoryCustodyWorkflowResult | null>(null);
  const [error, setError] = useState<string | null>(null), [reading, setReading] = useState(false), [editing, setEditing] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (fixtureMode) return;
    void continuity.load();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void continuity.load(); }, 15000);
    return () => window.clearInterval(timer);
  }, [fixtureMode, continuity.load]);
  useEffect(() => {
    if (!selection || fixtureMode) return;
    let active = true; const lifetime = new AbortController();
    setReading(true); setSelected(null); setError(null);
    void readRepositoryCustodyRegister(fetch, {view: "register", providerRepositoryId: selection, signal: lifetime.signal})
      .then(page => { if (active) { if (page.records.length !== 1) throw new Error("The exact repository connection could not be confirmed."); setSelected(page.records[0]); } })
      .catch(() => { if (active) setError("The selected repository could not be verified. Retry before onboarding it."); })
      .finally(() => { if (active) setReading(false); });
    return () => { active = false; lifetime.abort(); };
  }, [selection, fixtureMode, reload]);
  const name = selected?.request.requested_custody.workspace_owner_ref?.slice(5) ?? "";
  const registration = useRepositoryRegistrationStatus(name ? [name] : [], Boolean(name && !fixtureMode));
  const native = registration.value?.mode === "current" ? registration.value.records.find(row => row.record_id === `repo:${name}`) : undefined;
  const repository = useMemo(() => {
    if (!selected) return null;
    const records = selected.request.action === "provision-new"
      ? projectRepositoryProvisioningResults([], {[selected.request.request_id]: selected})
      : projectRepositoryCustodyResults([], {selected});
    return projectRepositoryCurrentInventory(records, continuity.projection, registration.value)[0] ?? null;
  }, [selected, continuity.projection, registration.value]);
  const legacy = continuity.projection?.intake.find(row => row.kind === "repo" && row.name === name);
  const classification = native?.phase === "intake" ? native.status as WorkspaceIntakeDecision : legacy?.status;
  const active = repository?.admissionState === "admitted";
  const inventoryPosture = native?.phase === "inventory" ? native.status : continuity.projection?.inventory.find(row => row.kind === "repo" && row.name === name)?.posture;
  const inactiveRecord = inventoryPosture === "suspended" || inventoryPosture === "retired";
  const current = Boolean(!fixtureMode && continuity.mode === "live" && registration.value && repository && !repository.blockers.some(blocker => blocker.id === "current-inventory-unavailable"));
  if (editing && repository && selected) return <RepositoryIntakeDialog key={selected.request.request_id} repository={repository} custodyResult={selected}
    ownerRepositories={continuity.projection?.inventory.filter(row => row.kind === "repo" && row.posture === "active").map(row => row.name) ?? []}
    classification={classification} onActivate={() => onActivate(name)} onClose={() => { setEditing(false); setReload(value => value + 1); void continuity.load(); }} />;
  return <TerasModalShell title="Repository onboarding" kicker="Workspace Registry" width="standard" height="content" bodyLayout="scroll"
    busy={reading} busyLabel="Verifying the selected repository…" surfaceId="repository-onboarding"
    description="Complete workspace review, source controls and activation before this repository can be used for project work."
    onClose={onClose} footer={<TerasActionButton emphasis="secondary" onClick={onClose}>Back to Registry</TerasActionButton>}>
    <TerasFieldStack spacing="loose">
      {!providerId && custody.sourceStatus === "loading" ? <TerasLoadingState label="Loading verified repositories…" /> : null}
      {!providerId ? <TerasSelectField label="Repository to onboard" value={selection} disabled={reading || fixtureMode || custody.sourceStatus === "loading"}
        helper="Choose a repository already created or linked in Repository Control. No GitHub details need to be entered again."
        options={[{label: "Select a verified repository", value: ""}, ...custody.registerResults.map(result => ({
          label: result.provider_readback?.canonical_url?.replace(/^https:\/\/github\.com\//, "") ?? result.request.target.name,
          value: result.provider_readback?.repository_identity.provider_repository_id ?? "",
        })).filter(option => option.value)]} onValueChange={setSelection} /> : null}
      {fixtureMode ? <TerasContentTray kicker="Preview only" description="Live repository onboarding requires the verified repository connection and current workspace records." /> : null}
      {!providerId && custody.sourceError ? <TerasContentTray role="alert" kicker="Repository list unavailable" description={custody.sourceError}
        actions={<TerasActionButton onClick={() => void custody.refresh()}>Retry repository list</TerasActionButton>} /> : null}
      {!providerId && custody.catalog.continuationError ? <TerasContentTray kicker="More repositories could not be loaded" description={custody.catalog.continuationError} /> : null}
      {!providerId && custody.catalog.cursor ? <TerasActionButton busy={custody.catalog.loadingMore} emphasis="secondary" onClick={() => void custody.catalog.loadMore()}>Load more repositories</TerasActionButton> : null}
      {reading ? <TerasLoadingState label="Reading repository and onboarding status…" /> : error ? <TerasContentTray role="alert" kicker="Unable to verify repository" description={error}
        actions={<TerasActionButton onClick={() => setReload(value => value + 1)}>Retry repository</TerasActionButton>} /> : null}
      {selected ? <>
        <TerasContentTray kicker="Selected repository" title={selected.provider_readback?.canonical_url?.replace(/^https:\/\/github\.com\//, "")} description="Creation or linking is complete. Workspace onboarding is tracked separately below."
          actions={selected.provider_readback?.canonical_url ? <TerasActionButton emphasis="secondary" onClick={() => openExternalConsoleRoute(selected.provider_readback?.canonical_url)}>Open on GitHub</TerasActionButton> : undefined}>
          <TerasMetadataList items={[
            {label: "Workspace review", value: active || inactiveRecord ? "Previously recorded" : classification === "admitted" ? "Approved" : classification === "proposed" ? "In progress" : classification === "out-of-scope" ? "Outside managed workspace" : current ? "Required" : "Checking current records"},
            {label: "Source controls", value: inactiveRecord ? "Recheck before restoration" : active || classification === "admitted" ? "Verified for recorded approval" : "Verify during onboarding"},
            {label: "Workspace activation", value: active ? "Active" : inactiveRecord ? inventoryPosture === "suspended" ? "Suspended" : "Retired" : "Not active"},
          ]} />
        </TerasContentTray>
        {!current ? continuity.mode === "loading" || !registration.value && !registration.error ? <TerasLoadingState label="Checking current workspace records…" /> : <TerasContentTray kicker="Onboarding unavailable" description={registration.error ?? continuity.error?.message ?? "Current workspace records must be confirmed before continuing. Project use remains blocked."}
          actions={<TerasActionButton onClick={() => { setReload(value => value + 1); void continuity.load(); }}>Retry onboarding status</TerasActionButton>} /> : active
          ? <TerasContentTray kicker="Onboarding complete" description="This repository is active in the managed workspace. Project actions still recheck current readiness and their own permissions." />
          : inactiveRecord ? <TerasContentTray kicker="Project use blocked" title={inventoryPosture === "suspended" ? "Repository suspended" : "Repository retired"}
            description="This repository already has a Registry record. Review its lifecycle and any required restoration; repeating onboarding will not activate it."
            actions={<TerasActionButton onClick={() => onActivate(name, "lifecycle")}>View existing Registry record</TerasActionButton>} />
          : classification === "admitted" ? <TerasContentTray kicker="Next action" title="Activate repository" description="The registration is approved. Complete the existing activation review to add it to active workspace inventory."
            actions={<TerasActionButton onClick={() => onActivate(name)}>Review activation</TerasActionButton>} />
            : <TerasContentTray kicker="Next action" title="Complete workspace setup" description="Review purpose and responsibilities, then record it for setup. Completed setup can be approved and activated here; project use remains blocked until activation."
              actions={<TerasActionButton onClick={() => setEditing(true)}>Continue onboarding</TerasActionButton>} />}
      </> : !reading && !error && !fixtureMode ? <TerasContentTray kicker="Choose a repository" description="Create or link the repository in Repository Control first. Its verified identity will be reused here." /> : null}
    </TerasFieldStack>
  </TerasModalShell>;
}
