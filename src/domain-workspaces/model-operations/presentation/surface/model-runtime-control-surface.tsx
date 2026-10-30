"use client";
import { useEffect, useMemo, useState } from "react";
import { openExternalConsoleRoute } from "../../../../console-integration/external-route.ts";
import {
  TerasActionButton, TerasActionRow, TerasDialog, TerasDraftCloseGuardDialog, TerasEmptyState,
  TerasFieldGrid, TerasFieldStack, TerasFilterBar, TerasMetadataList, TerasPanel, TerasPanelHeader, TerasPanelStack,
  TerasRecordControlOverviewGrid, TerasRecordControlSummaryPanel, TerasRecordControlActionPanel,
  TerasSelectedPanel, TerasRecordCellText, TerasRecordControlLayout, TerasRecordTable,
  TerasRegisterPanel, TerasSelectField, TerasStatusPill, TerasTextField, type TerasRecordTableColumn,
} from "@/teras";
import { modelEffortLabel } from "../../../../console-integration/governed-ai/model-selection.ts";
import { useModelRuntime } from "../../live-runtime/use-model-runtime.ts";
import {
  terminalModelStates, type ModelAction, type ModelChoice,
  type ModelRoute, type ModelRuntimeOperation,
} from "../../work-model/model-runtime-contract.ts";
import {
  defaultModelScope, effectiveRouteLabel, eligibleModelIds,
  readRoutingDraft, routingDraftIssue, routingInput, workflowTaskLabel, type RoutingMode,
} from "../../work-model/model-runtime-routing.ts";
import { modelProviderMetadata, modelRouteHealthLabel, modelOperationMetadata, modelOwnerErrorMetadata, modelRoutingConflictMetadata, modelRoutingMetadata, modelRuntimeSummaryStatus, modelSelectedRouteMetadata, modelSavedRouteMetadata } from "./model-runtime-control-view-model.ts";

import { useProviderConnections } from "../../live-runtime/use-provider-connections.ts";
import { ProviderConnectionsDialog } from "../dialogs/provider-connections/provider-connections-dialog.tsx";
import { providerPresets } from "../../work-model/provider-connections-contract.ts";

type Runtime = ReturnType<typeof useModelRuntime>;
type Props = { onDirtyChange?: (dirty: boolean) => void };
const operationLabels: Record<ModelRuntimeOperation["state"], string> = {
  queued: "Queued", running: "Owner verification in progress", "awaiting-account": "Account sign-in needed",
  retryable: "Retry available", unknown: "Completion unconfirmed", blocked: "Owner evidence needs review",
  completed: "Confirmed by owner", cancelled: "Cancelled", rejected: "Request rejected",
};
const actionLabels: Record<ModelAction, string> = {
  "backend.register": "Register backend", "backend.remove": "Remove backend", "model.register": "Verify model",
  "model.remove": "Remove model", "routing.save": "Save model routing", "routing.rollback": "Restore settings",
  "account.login.start": "Connect account", "account.login.cancel": "Cancel account sign-in",
};

export function ModelRuntimeControlSurface({ onDirtyChange }: Props) {
  const runtime = useModelRuntime(), registry = runtime.registry, config = registry?.configuration.configuration;
  const connections = useProviderConnections(runtime.refresh, runtime.dataMode === "live");
  const [dialog, setDialog] = useState<"registration" | "routing" | "activity" | null>(null);
  const [closeRouting, setCloseRouting] = useState(false);
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const backendLabels = Object.fromEntries((registry?.backends ?? []).map(item => {
    const connection = connections.snapshot?.connections.find(value => value.connection_id === item.backend_id);
    const label = connection ? connection.name + " · " + providerPresets[connection.provider].label : item.backend_id;
    return [item.backend_id, label + (item.experimental ? " · Experimental" : "")];
  }));
  const [backendId, setBackendId] = useState(""), [catalogueModel, setCatalogueModel] = useState("");
  const [taskSearch, setTaskSearch] = useState("");
  const [scope, setScope] = useState(defaultModelScope), [mode, setMode] = useState<RoutingMode>("source");
  const [route, setRoute] = useState<ModelRoute>({ primary: { model_id: "", effort: null }, fallbacks: [], on_exhausted: "fail-closed" });
  const [editRevision, setEditRevision] = useState<number | null>(null), [dirty, setDirty] = useState(false);
  const [nextScope, setNextScope] = useState<string | null>(null), [reloadGuard, setReloadGuard] = useState(false);
  const [restoreRevision, setRestoreRevision] = useState(""), [restore, setRestore] = useState<{ revision: number; expected: number } | null>(null);
  const backend = registry?.backends.find(item => item.backend_id === backendId) ?? (!backendId ? registry?.backends[0] ?? null : null);
  const selectedConnection = connections.snapshot?.connections.find(item => item.connection_id === backend?.backend_id);
  const canProbe = !backend?.experimental || Boolean(connections.fresh && selectedConnection?.state === "active" && selectedConnection.credential_present && !selectedConnection.pending_operation);
  const selectedRegisteredModel = Object.values(config?.models ?? {}).some(row => row.backend_id === backend?.backend_id && row.model === catalogueModel);
  const modelNames = [...new Set([...Object.values(config?.models ?? {}).filter(row => row.backend_id === backend?.backend_id).map(row => row.model),
    ...(runtime.catalogue && runtime.catalogue.backend_id === backend?.backend_id ? runtime.catalogue.models.map(row => row.model) : [])])];
  const operation = runtime.operation;
  const outstanding = Boolean(runtime.selectedId && (!operation || !terminalModelStates.has(operation.state)));
  const busy = runtime.pending || outstanding || connections.pending;
  const blocked = !runtime.fresh || !registry || busy;
  const registeredIds = Object.keys(config?.models ?? {});
  const taskRows = useMemo(() => [defaultModelScope, ...(registry?.tasks ?? [])].filter(task =>
    (task === defaultModelScope ? "System default" : workflowTaskLabel(task) + " " + task).toLowerCase().includes(taskSearch.toLowerCase())),
  [registry, taskSearch]);
  const eligible = registry ? eligibleModelIds(registry, scope) : [];
  const issue = registry ? routingDraftIssue(registry, scope, mode, route) : null;
  const moved = editRevision !== null && registry?.configuration.revision !== editRevision;

  useEffect(() => { onDirtyChange?.(dirty); return () => onDirtyChange?.(false); }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (!config || dirty) return;
    const next = readRoutingDraft(config, scope); setMode(next.mode); setRoute(next.route); setEditRevision(registry!.configuration.revision);
  }, [config, registry, scope, dirty]);
  useEffect(() => {
    if (backendId && registry && !registry.backends.some(value => value.backend_id === backendId)) {
      setBackendId(""); setCatalogueModel(""); runtime.clearCatalogue();
    }
  }, [registry, backendId, runtime.clearCatalogue]);
  const send = async (action: ModelAction, input: Record<string, unknown>, revision = registry?.configuration.revision) => {
    if (revision === undefined || runtime.preview) return;
    setDialog("activity");
    try { await runtime.submit(action, input, revision); return true; } catch { return false; }
  };
  useEffect(() => { if (runtime.selectedId) setDialog("activity"); }, [runtime.selectedId]);
  const changeScope = (id: string) => { if (id === scope) return; if (dirty) setNextScope(id); else setScope(id); };
  const chooseModel = (id: string): ModelChoice => ({ model_id: id, effort: config?.models[id]?.supported_efforts[0] ?? null });
  const updateChoice = (index: number, value: ModelChoice) => {
    setDirty(true); setRoute(current => index < 0 ? { ...current, primary: value } : { ...current, fallbacks: current.fallbacks.map((item, i) => i === index ? value : item) });
  };
  const choiceFields = (choice: ModelChoice, index: number) => {
    const model = config?.models[choice.model_id];
    return <TerasFieldGrid columns={2}>
      <TerasSelectField label={index < 0 ? "Primary model" : "Fallback " + (index + 1)}
        value={choice.model_id} disabled={blocked} onValueChange={id => updateChoice(index, chooseModel(id))}
        options={[{ value: "", label: "Choose a registered model" }, ...eligible.map(id => ({ value: id, label: config!.models[id].model + " · " + backendLabels[config!.models[id].backend_id] }))]} />
      <TerasSelectField label="Native effort" value={JSON.stringify(choice.effort)} disabled={blocked || !model}
        options={(model?.supported_efforts ?? [null]).map(effort => ({ value: JSON.stringify(effort), label: modelEffortLabel(effort) }))}
        onValueChange={value => updateChoice(index, { ...choice, effort: JSON.parse(value) })} />
    </TerasFieldGrid>;
  };
  const columns: Array<TerasRecordTableColumn<string>> = [
    { key: "workflow", header: "Workflow", intent: "primary", render: task => <TerasRecordCellText title={task === defaultModelScope ? "System default" : workflowTaskLabel(task)} /> },
    { key: "selection", header: "Current selection", intent: "secondary", render: task => <TerasRecordCellText title={config ? effectiveRouteLabel(config, task, backendLabels) : "Unavailable"} /> },
    { key: "health", header: "Primary health", intent: "secondary", render: task => <TerasRecordCellText title={registry ? modelRouteHealthLabel(registry, task) : "Health unknown"} /> },
    { key: "mode", header: "Setting", intent: "status", render: task => <TerasStatusPill tone="info">{task === defaultModelScope ? "Default" : config && Object.hasOwn(config.overrides, task) ? "Override" : "Inherits"}</TerasStatusPill> },
  ];
  if (!registry || !config) return <TerasPanelStack fill="first"><TerasPanel frame="padded" treatment="neutral" fit="fill">
    <TerasPanelHeader kicker="Models & routing" title="Runtime model configuration" statusLabel={runtime.error ? "Unavailable" : "Loading"} statusTone={runtime.error ? "warn" : "info"} />
    <TerasEmptyState fill>{runtime.error ?? "Reading the admitted model registry."}</TerasEmptyState>
    <TerasActionRow><TerasActionButton emphasis="secondary" onClick={() => void runtime.refresh().catch(() => undefined)}>Refresh owner state</TerasActionButton></TerasActionRow>
  </TerasPanel>{runtime.selectedId || runtime.records.length ? <ModelRuntimeActivity runtime={runtime} /> : null}</TerasPanelStack>;
  return <>
    <TerasRecordControlLayout composition="compact-control" mode="overview-register-selected" data-model-runtime-control="true"
      overview={<TerasRecordControlOverviewGrid>
        <TerasRecordControlSummaryPanel kicker="Model summary" title="Models & routing"
          description={runtime.preview ? "Disconnected preview · read-only samples, not current provider or account state." : "Registered models and saved workflow choices. Registration does not grant workflow permissions."}
          surfaceStatus={modelRuntimeSummaryStatus(runtime.fresh, runtime.preview, runtime.error, registry.configuration.revision)}
          metrics={[
            { id: "backends", label: "Backends", value: Object.keys(config.backends).length },
            { id: "models", label: "Models", value: registeredIds.length },
            { id: "workflows", label: "Workflows", value: registry.tasks.length },
          ]} />
        <TerasRecordControlActionPanel kicker="Model controls" title="Manage models and connections"
          description={runtime.error ?? (runtime.selectedId ? operation ? operationLabels[operation.state] : "Original request needs checking." : "Register models, connect providers or inspect previous operations.")}
          boundaryKicker="Saved settings" boundary={runtime.preview ? "Sample inspection only. Changes and account connections are disabled." : "OOS records each request; Platform verifies models and owns account credentials. Purpose-profile permissions remain separate."}
          tone={outstanding || runtime.error ? "warn" : "info"}
          action={<>
            <TerasActionButton emphasis="secondary" onClick={() => setDialog("registration")}>Manage registrations</TerasActionButton>
            <TerasActionButton emphasis="secondary" disabled={busy || dirty || runtime.preview} onClick={() => setConnectionsOpen(true)}>API connections</TerasActionButton>
            <TerasActionButton emphasis="secondary" onClick={() => setDialog("activity")}>Operation history</TerasActionButton>
          </>} />
      </TerasRecordControlOverviewGrid>}
      register={<TerasRegisterPanel density="compact-control" kicker="Workflow routing" title="Choose models by workflow"
        description="Each workflow keeps its permission and output rules. Overrides replace the system default."
        filterBar={<TerasFilterBar search={{ ariaLabel: "Search workflows", onValueChange: setTaskSearch, placeholder: "Search workflows...", value: taskSearch }} />}
        statusLabel={registry.tasks.length + " task(s)"} statusTone="info"
        actions={<TerasActionButton emphasis="secondary" onClick={() => void runtime.refresh().catch(() => undefined)}>Refresh</TerasActionButton>}>
        <TerasRecordTable fill columns={columns} rows={taskRows} getRowId={task => task} onSelect={changeScope} selectedRowId={scope} />
      </TerasRegisterPanel>}
      selected={<TerasSelectedPanel kicker="Selected routing" title={scope === defaultModelScope ? "System default" : workflowTaskLabel(scope)}
        description={effectiveRouteLabel(config, scope, backendLabels)} variant="compact" selected
        status={{ label: dirty ? "Unsaved draft" : runtime.preview ? "Sample" : runtime.fresh ? "Saved configuration" : "Last known settings", tone: dirty || !runtime.fresh && !runtime.preview ? "warn" : "info" }}
        meta={modelSelectedRouteMetadata(registry, scope)}
        action={{ kicker: "Routing settings", title: dirty ? "Continue routing draft" : "Review model choices",
          description: "Inspect primary model, native effort and ordered fallbacks for this workflow.",
          node: <TerasActionButton onClick={() => setDialog("routing")}>Review routing</TerasActionButton> }} />} />
    <TerasDialog open={dialog === "registration"} onClose={() => setDialog(null)} title="Model registrations"
      kicker="Models & routing" width="wide" height="fill" contentOverflow="hidden"
      actions={<TerasActionButton emphasis="secondary" onClick={() => setDialog(null)}>Back to Models & routing</TerasActionButton>}>
      <TerasFieldStack overflow="auto">
      <TerasPanel frame="padded" treatment="neutral" spacing="compact">
        <TerasPanelHeader kicker="Model registration" title="Backends & models" description="Checks leave settings unchanged. Verify explicitly updates the registration and keeps its routes." statusLabel={runtime.preview ? "Sample · read-only" : runtime.fresh ? "Revision " + registry.configuration.revision : "Owner unavailable"} statusTone={runtime.fresh || runtime.preview ? "info" : "warn"} />
        <TerasFieldGrid columns={2}>
          <TerasSelectField label="Admitted backend" disabled={busy || dirty || !runtime.fresh}
            value={backend?.backend_id ?? ""} options={registry.backends.map(item => ({ value: item.backend_id, label: item.experimental ? backendLabels[item.backend_id] : item.backend_id + " · " + item.provider }))}
            onValueChange={value => { setBackendId(value); setCatalogueModel(""); runtime.clearCatalogue(); }} />
          {backend?.catalogue_supported === false ? <TerasTextField label="Exact model ID" value={catalogueModel} onValueChange={setCatalogueModel}
            disabled={busy || dirty || !runtime.fresh} maxLength={200} autoComplete="off" spellCheck={false} /> : <TerasSelectField label="Model" disabled={busy || dirty || !runtime.fresh}
            value={catalogueModel} options={[{ value: "", label: "Select a registered model or discover" }, ...modelNames.map(name => ({ value: name, label: name + (backend?.experimental ? " · Experimental" : "") }))]}
            onValueChange={setCatalogueModel} />}
        </TerasFieldGrid>
        <TerasActionRow>
          <TerasActionButton disabled={blocked || dirty || !backend} emphasis="secondary" onClick={() => backend && void send(backend.registered ? "backend.remove" : "backend.register", { backend_id: backend.backend_id })}>
            {backend?.registered ? "Remove backend" : "Register backend"}</TerasActionButton>
          {backend?.account_login_supported ? <TerasActionButton disabled={blocked || dirty || !backend.registered} emphasis="secondary" onClick={() => void send("account.login.start", { backend_id: backend.backend_id })}>Connect account</TerasActionButton> : null}
          <TerasActionButton disabled={blocked || dirty || !backend?.registered || backend.catalogue_supported === false || !canProbe} emphasis="secondary" onClick={() => backend && void runtime.discover(backend.backend_id)}>Discover models</TerasActionButton>
          <TerasActionButton disabled={blocked || dirty || !backend?.registered || !catalogueModel || !canProbe} onClick={() => backend && void send("model.register", { backend_id: backend.backend_id, model: catalogueModel })}>{selectedRegisteredModel ? "Verify & update registration" : "Verify & register model"}</TerasActionButton>
        </TerasActionRow>
        <TerasActionRow><TerasActionButton emphasis="secondary" disabled={busy || dirty || runtime.preview} onClick={() => setConnectionsOpen(true)}>Add / manage API connections</TerasActionButton></TerasActionRow>
        <TerasMetadataList shape="line" wrap items={modelProviderMetadata(registry, backend, catalogueModel)} />
      </TerasPanel>
      <TerasPanel frame="padded" treatment="neutral" spacing="compact">
        <TerasPanelHeader kicker="Registered models" title="Remove a registration" description="The owner checks existing route references before removing a model." />
            <TerasSelectField label="Registered model" value={catalogueModel && registeredIds.find(id => config?.models[id].backend_id === backend?.backend_id && config.models[id].model === catalogueModel) || ""}
              disabled={blocked || dirty} options={[{ value: "", label: "Select a registration to remove" }, ...registeredIds.map(id => ({ value: id, label: config!.models[id].model + " · " + backendLabels[config!.models[id].backend_id] }))]}
              onValueChange={id => { if (id && config) { setBackendId(config.models[id].backend_id); setCatalogueModel(config.models[id].model); } else setCatalogueModel(""); }} />
            <TerasActionRow><TerasActionButton emphasis="secondary" disabled={blocked || dirty || !registeredIds.some(id => config?.models[id].backend_id === backend?.backend_id && config.models[id].model === catalogueModel)}
              onClick={() => { const id = registeredIds.find(id => config?.models[id].backend_id === backend?.backend_id && config.models[id].model === catalogueModel); if (id) void send("model.remove", { model_id: id }); }}>Remove selected registration</TerasActionButton></TerasActionRow>
      </TerasPanel>
          </TerasFieldStack>
    </TerasDialog>
    <TerasDialog open={dialog === "routing"} onClose={() => dirty ? setCloseRouting(true) : setDialog(null)} title="Workflow routing"
      description={scope === defaultModelScope ? "System default" : workflowTaskLabel(scope)} kicker="Models & routing"
      width="wide" height="fill" contentOverflow="hidden"
      actions={<TerasActionButton emphasis="secondary" onClick={() => dirty ? setCloseRouting(true) : setDialog(null)}>Back to Models & routing</TerasActionButton>}>
      <TerasFieldStack overflow="auto">
      <TerasMetadataList shape="list" items={modelSavedRouteMetadata(registry, scope, backendLabels)} />
          <TerasFieldStack overflow="auto">
            <TerasSelectField label="Selection mode" disabled={blocked} value={mode}
              options={[...(scope !== defaultModelScope ? [{ value: "inherit" as const, label: "Inherit system default" }] : []), { value: "source" as const, label: "Use existing profile binding" }, { value: "configured" as const, label: "Choose registered models" }]}
              onValueChange={value => { setMode(value); setDirty(true); }} />
            {mode === "configured" ? <>
              {choiceFields(route.primary, -1)}
              {route.fallbacks.map((choice, index) => <TerasFieldStack key={index}>
                {choiceFields(choice, index)}
                <TerasActionRow>
                  <TerasActionButton size="table-compact" emphasis="secondary" disabled={blocked || index === 0} onClick={() => { const values = [...route.fallbacks]; [values[index - 1], values[index]] = [values[index], values[index - 1]]; setRoute({ ...route, fallbacks: values }); setDirty(true); }}>Move up</TerasActionButton>
                  <TerasActionButton size="table-compact" emphasis="secondary" disabled={blocked || index === route.fallbacks.length - 1} onClick={() => { const values = [...route.fallbacks]; [values[index + 1], values[index]] = [values[index], values[index + 1]]; setRoute({ ...route, fallbacks: values }); setDirty(true); }}>Move down</TerasActionButton>
                  <TerasActionButton size="table-compact" emphasis="secondary" disabled={blocked} onClick={() => { setRoute({ ...route, fallbacks: route.fallbacks.filter((_, i) => i !== index) }); setDirty(true); }}>Remove fallback</TerasActionButton>
                </TerasActionRow>
              </TerasFieldStack>)}
              <TerasActionRow><TerasActionButton emphasis="secondary" disabled={blocked || route.fallbacks.length >= 4} onClick={() => { setRoute({ ...route, fallbacks: [...route.fallbacks, { model_id: "", effort: null }] }); setDirty(true); }}>Add explicit fallback</TerasActionButton></TerasActionRow>
              <TerasMetadataList shape="list" items={modelRoutingMetadata(issue)} />
            </> : null}
            {moved ? <TerasMetadataList shape="list" items={modelRoutingConflictMetadata()} /> : null}
            <TerasActionRow>
              <TerasActionButton disabled={runtime.pending || runtime.preview} emphasis="secondary" onClick={() => void runtime.refresh().catch(() => undefined)}>Refresh owner state</TerasActionButton>
              <TerasActionButton disabled={blocked || !dirty || Boolean(issue) || moved || editRevision === null} onClick={async () => {
                if (!config || editRevision === null) return;
                if (await send("routing.save", routingInput(config, scope, mode, route), editRevision)) setDirty(false);
              }}>Save routing</TerasActionButton>
              <TerasActionButton disabled={!dirty || runtime.pending} emphasis="secondary" onClick={() => setReloadGuard(true)}>Reload saved settings</TerasActionButton>
            </TerasActionRow>
          </TerasFieldStack>
          </TerasFieldStack>
    </TerasDialog>
    <TerasDialog open={dialog === "activity"} onClose={() => setDialog(null)} title="Model operation history"
      kicker="Models & routing" width="wide" height="fill" contentOverflow="hidden"
      actions={<TerasActionButton emphasis="secondary" onClick={() => setDialog(null)}>Back to Models & routing</TerasActionButton>}>
      <TerasFieldStack overflow="auto">
      <ModelRuntimeActivity runtime={runtime} />
      <TerasPanel frame="padded" treatment="neutral" spacing="compact">
        <TerasPanelHeader kicker="Configuration history" title="Restore previous settings" description="Restoration creates a new revision; existing history is retained." />
            <TerasSelectField label="Previous configuration" value={restoreRevision} disabled={blocked || dirty}
              options={[{ value: "", label: "Choose a retained revision" }, ...registry.configuration.history.filter(item => item.revision !== registry.configuration.revision).map(item => ({ value: String(item.revision), label: "Revision " + item.revision }))]} onValueChange={setRestoreRevision} />
            <TerasActionRow><TerasActionButton emphasis="secondary" disabled={blocked || dirty || !restoreRevision} onClick={() => setRestore({ revision: Number(restoreRevision), expected: registry.configuration.revision })}>Review restoration</TerasActionButton></TerasActionRow>
      </TerasPanel>
          </TerasFieldStack>
    </TerasDialog>
    <ProviderConnectionsDialog open={connectionsOpen} onClose={() => setConnectionsOpen(false)} runtime={connections} registry={registry} changesBlocked={dirty || runtime.pending || outstanding || !runtime.fresh} />
    <TerasDraftCloseGuardDialog kicker="Routing draft" title="Discard unsaved changes?" description="The owner configuration will remain the saved source of truth."
      open={nextScope !== null || reloadGuard || closeRouting} keepEditingLabel="Keep editing" leaveLabel="Discard draft"
      onKeepEditing={() => { setNextScope(null); setReloadGuard(false); setCloseRouting(false); }} onLeave={() => { setDirty(false); if (nextScope) setScope(nextScope); setNextScope(null); setReloadGuard(false); if (closeRouting) setDialog(null); setCloseRouting(false); }} />
    <TerasDraftCloseGuardDialog kicker="Configuration history" title="Restore revision settings?" description={"Revision " + restore?.revision + " will be restored as a new configuration revision."}
      open={restore !== null} keepEditingLabel="Cancel" leaveLabel="Restore settings" onKeepEditing={() => setRestore(null)}
      onLeave={() => { if (restore) void send("routing.rollback", { revision: restore.revision }, restore.expected); setRestore(null); }} />
  </>;
}

function ModelRuntimeActivity({ runtime }: { runtime: Runtime }) {
  const operation = runtime.operation, login = operation?.account_login;
  return <TerasPanel frame="padded" treatment="neutral" overflow="auto" spacing="compact">
    <TerasPanelHeader kicker="Owner activity" title={operation ? actionLabels[operation.request.action] : "Operation progress"} statusLabel={operation ? operationLabels[operation.state] : runtime.selectedId ? "Unconfirmed" : "No operation selected"}
      statusTone={operation?.state === "completed" ? "ok" : runtime.error || operation && ["unknown", "blocked", "rejected"].includes(operation.state) ? "warn" : "info"} />
    <TerasFieldStack>
      {!runtime.selectedId && runtime.records.length === 0 ? <TerasEmptyState>{runtime.preview ? "No owner operations are created in this read-only preview." : runtime.fresh ? "No retained owner operations were returned." : "Owner operation history is unavailable."}</TerasEmptyState> : null}
      {runtime.error ? <TerasMetadataList shape="list" items={modelOwnerErrorMetadata(runtime.error)} /> : null}
      {operation ? <TerasMetadataList shape="list" items={modelOperationMetadata(operation)} /> : null}
      <TerasActionRow>
        {login?.verification_url ? <TerasActionButton onClick={() => openExternalConsoleRoute(login.verification_url)}>Open account sign-in</TerasActionButton> : null}
        {operation?.state === "retryable" ? <TerasActionButton disabled={runtime.pending} onClick={() => void runtime.control("retry")}>Retry original intent</TerasActionButton> : null}
        {operation && ["reconcile-original-operation", "review-owner-evidence"].includes(operation.next_action) ? <TerasActionButton disabled={runtime.pending} onClick={() => void runtime.control("reconcile")}>Reconcile original operation</TerasActionButton> : null}
        {operation && ["awaiting-account", "retryable"].includes(operation.state) ? <TerasActionButton emphasis="secondary" disabled={runtime.pending} onClick={() => void runtime.control("cancel")}>Cancel operation</TerasActionButton> : null}
        {runtime.selectedId ? <TerasActionButton emphasis="secondary" disabled={runtime.pending} onClick={() => void runtime.checkOriginal()}>Check original request</TerasActionButton> : null}
        {operation && terminalModelStates.has(operation.state) || runtime.selectedId && runtime.lookupMissing ? <TerasActionButton emphasis="secondary" disabled={runtime.pending} onClick={runtime.clearSelection}>Clear selection</TerasActionButton> : null}
      </TerasActionRow>
      <TerasSelectField label="Request history" value={runtime.selectedId ?? ""} disabled={runtime.pending || Boolean(operation && !terminalModelStates.has(operation.state))}
        options={[{ value: "", label: "Select an owner record" }, ...runtime.records.map(item => ({ value: item.request_id, label: actionLabels[item.request.action] + " · " +
          String(item.request.input.model ?? item.request.input.backend_id ?? "settings") + " · " + operationLabels[item.state] + " · " + item.request_id.slice(-8) }))]}
        onValueChange={id => { if (id) void runtime.selectOperation(id); }} />
      {runtime.cursor ? <TerasActionRow><TerasActionButton emphasis="secondary" onClick={() => void runtime.loadMore()}>Load more owner records</TerasActionButton></TerasActionRow> : null}
    </TerasFieldStack>
  </TerasPanel>;
}
