"use client";
import { useEffect, useMemo, useState } from "react";
import { openExternalConsoleRoute } from "../../../../console-integration/external-route.ts";
import {
  TerasActionButton, TerasActionRow, TerasDraftCloseGuardDialog, TerasEmptyState,
  TerasFieldGrid, TerasFieldStack, TerasFilterBar, TerasMetadataList, TerasPanel, TerasPanelHeader,
  TerasPanelStack, TerasRecordCellText, TerasRecordControlLayout, TerasRecordTable,
  TerasRegisterPanel, TerasSelectField, TerasStatusPill, type TerasRecordTableColumn,
} from "@/teras";
import { modelEffortLabel } from "../../../../console-integration/governed-ai/model-selection.ts";
import { useModelRuntime } from "../../live-runtime/use-model-runtime.ts";
import {
  terminalModelStates, type ModelAction, type ModelChoice, type ModelRegistry,
  type ModelRoute, type ModelRuntimeOperation,
} from "../../work-model/model-runtime-contract.ts";
import {
  choiceLabel, defaultModelScope, effectiveRouteLabel, eligibleModelIds,
  readRoutingDraft, routingDraftIssue, routingInput, workflowTaskLabel, type RoutingMode,
} from "../../work-model/model-runtime-routing.ts";
import { modelBackendMetadata, modelOperationMetadata, modelOwnerErrorMetadata, modelRoutingConflictMetadata, modelRoutingMetadata } from "./model-runtime-control-view-model.ts";

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
  const [backendId, setBackendId] = useState(""), [catalogueModel, setCatalogueModel] = useState("");
  const [taskSearch, setTaskSearch] = useState("");
  const [scope, setScope] = useState(defaultModelScope), [mode, setMode] = useState<RoutingMode>("source");
  const [route, setRoute] = useState<ModelRoute>({ primary: { model_id: "", effort: null }, fallbacks: [], on_exhausted: "fail-closed" });
  const [editRevision, setEditRevision] = useState<number | null>(null), [dirty, setDirty] = useState(false);
  const [nextScope, setNextScope] = useState<string | null>(null), [reloadGuard, setReloadGuard] = useState(false);
  const [restoreRevision, setRestoreRevision] = useState(""), [restore, setRestore] = useState<{ revision: number; expected: number } | null>(null);
  const backend = registry?.backends.find(item => item.backend_id === backendId) ?? registry?.backends[0] ?? null;
  const operation = runtime.operation;
  const outstanding = Boolean(runtime.selectedId && (!operation || !terminalModelStates.has(operation.state)));
  const busy = runtime.pending || outstanding;
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
  const send = async (action: ModelAction, input: Record<string, unknown>, revision = registry?.configuration.revision) => {
    if (revision === undefined) return;
    try { await runtime.submit(action, input, revision); return true; } catch { return false; }
  };
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
        options={[{ value: "", label: "Choose a registered model" }, ...eligible.map(id => ({ value: id, label: config!.models[id].model + " · " + config!.models[id].backend_id }))]} />
      <TerasSelectField label="Native effort" value={JSON.stringify(choice.effort)} disabled={blocked || !model}
        options={(model?.supported_efforts ?? [null]).map(effort => ({ value: JSON.stringify(effort), label: modelEffortLabel(effort) }))}
        onValueChange={value => updateChoice(index, { ...choice, effort: JSON.parse(value) })} />
    </TerasFieldGrid>;
  };
  const columns: Array<TerasRecordTableColumn<string>> = [
    { key: "workflow", header: "Workflow", intent: "primary", render: task => <TerasRecordCellText title={task === defaultModelScope ? "System default" : workflowTaskLabel(task)} /> },
    { key: "selection", header: "Current selection", intent: "secondary", render: task => <TerasRecordCellText title={config ? effectiveRouteLabel(config, task) : "Unavailable"} /> },
    { key: "mode", header: "Setting", intent: "status", render: task => <TerasStatusPill tone="info">{task === defaultModelScope ? "Default" : config && Object.hasOwn(config.overrides, task) ? "Override" : "Inherits"}</TerasStatusPill> },
  ];
  if (!registry || !config) return <TerasPanel frame="padded" treatment="neutral" fit="fill">
    <TerasPanelHeader kicker="Models & routing" title="Runtime model configuration" statusLabel={runtime.error ? "Unavailable" : "Loading"} statusTone={runtime.error ? "warn" : "info"} />
    <TerasEmptyState fill>{runtime.error ?? "Reading the admitted model registry."}</TerasEmptyState>
    <TerasActionRow><TerasActionButton emphasis="secondary" onClick={() => void runtime.refresh().catch(() => undefined)}>Refresh owner state</TerasActionButton></TerasActionRow>
  </TerasPanel>;
  return <>
    <TerasRecordControlLayout composition="compact-control" mode="overview-register-selected" data-model-runtime-control="true"
      overview={<TerasPanel frame="padded" treatment="neutral" spacing="compact">
        <TerasPanelHeader kicker="Model registration" title="Backends & models" statusLabel={runtime.fresh ? "Revision " + registry.configuration.revision : "Owner unavailable"} statusTone={runtime.fresh ? "info" : "warn"} />
        <TerasFieldGrid columns={2}>
          <TerasSelectField label="Admitted backend" disabled={busy || dirty || !runtime.fresh}
            value={backend?.backend_id ?? ""} options={registry.backends.map(item => ({ value: item.backend_id, label: item.backend_id + " · " + item.provider }))}
            onValueChange={value => { setBackendId(value); setCatalogueModel(""); runtime.clearCatalogue(); }} />
          <TerasSelectField label="Discovered model" disabled={busy || dirty || !runtime.fresh}
            value={catalogueModel} options={[{ value: "", label: "Discover models, then select" }, ...(runtime.catalogue && runtime.catalogue.backend_id === backend?.backend_id ? runtime.catalogue.models.map(item => ({ value: item.model, label: item.model })) : [])]}
            onValueChange={setCatalogueModel} />
        </TerasFieldGrid>
        <TerasActionRow>
          <TerasActionButton disabled={blocked || dirty || !backend} emphasis="secondary" onClick={() => backend && void send(backend.registered ? "backend.remove" : "backend.register", { backend_id: backend.backend_id })}>
            {backend?.registered ? "Remove backend" : "Register backend"}</TerasActionButton>
          {backend?.account_login_supported ? <TerasActionButton disabled={blocked || dirty || !backend.registered} emphasis="secondary" onClick={() => void send("account.login.start", { backend_id: backend.backend_id })}>Connect account</TerasActionButton> : null}
          <TerasActionButton disabled={blocked || dirty || !backend?.registered} emphasis="secondary" onClick={() => backend && void runtime.discover(backend.backend_id)}>Discover models</TerasActionButton>
          <TerasActionButton disabled={blocked || dirty || !backend?.registered || !catalogueModel} onClick={() => backend && void send("model.register", { backend_id: backend.backend_id, model: catalogueModel })}>Verify & register model</TerasActionButton>
        </TerasActionRow>
        <TerasMetadataList shape="line" items={modelBackendMetadata(registry, backend)} />
      </TerasPanel>}
      register={<TerasRegisterPanel density="compact-control" kicker="Workflow routing" title="Choose models by workflow"
        description="Each workflow keeps its permission and output rules. Overrides replace the system default."
        filterBar={<TerasFilterBar search={{ ariaLabel: "Search workflows", onValueChange: setTaskSearch, placeholder: "Search workflows...", value: taskSearch }} />}
        statusLabel={registry.tasks.length + " task(s)"} statusTone="info"
        actions={<TerasActionButton emphasis="secondary" onClick={() => void runtime.refresh().catch(() => undefined)}>Refresh</TerasActionButton>}>
        <TerasRecordTable fill columns={columns} rows={taskRows} getRowId={task => task} onSelect={changeScope} selectedRowId={scope} />
      </TerasRegisterPanel>}
      selected={<TerasPanelStack fill="first">
        <TerasPanel frame="padded" treatment="neutral" fit="fill" overflow="auto" spacing="compact">
          <TerasPanelHeader kicker="Selected routing" title={scope === defaultModelScope ? "System default" : workflowTaskLabel(scope)} statusLabel={dirty ? "Unsaved" : "Owner configuration"} statusTone={dirty ? "warn" : "info"} />
          <TerasFieldStack>
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
              <TerasActionButton disabled={blocked || !dirty || Boolean(issue) || moved || editRevision === null} onClick={async () => {
                if (!config || editRevision === null) return;
                if (await send("routing.save", routingInput(config, scope, mode, route), editRevision)) setDirty(false);
              }}>Save routing</TerasActionButton>
              <TerasActionButton disabled={!dirty || runtime.pending} emphasis="secondary" onClick={() => setReloadGuard(true)}>Reload saved settings</TerasActionButton>
            </TerasActionRow>
            <TerasSelectField label="Registered model" value={catalogueModel && registeredIds.find(id => config?.models[id].backend_id === backend?.backend_id && config.models[id].model === catalogueModel) || ""}
              disabled={blocked || dirty} options={[{ value: "", label: "Select a registration to remove" }, ...registeredIds.map(id => ({ value: id, label: config!.models[id].model + " · " + config!.models[id].backend_id }))]}
              onValueChange={id => { if (id && config) { setBackendId(config.models[id].backend_id); setCatalogueModel(config.models[id].model); } else setCatalogueModel(""); }} />
            <TerasActionRow><TerasActionButton emphasis="secondary" disabled={blocked || dirty || !registeredIds.some(id => config?.models[id].backend_id === backend?.backend_id && config.models[id].model === catalogueModel)}
              onClick={() => { const id = registeredIds.find(id => config?.models[id].backend_id === backend?.backend_id && config.models[id].model === catalogueModel); if (id) void send("model.remove", { model_id: id }); }}>Remove selected registration</TerasActionButton></TerasActionRow>
            <TerasSelectField label="Previous configuration" value={restoreRevision} disabled={blocked || dirty}
              options={[{ value: "", label: "Choose a retained revision" }, ...registry.configuration.history.filter(item => item.revision !== registry.configuration.revision).map(item => ({ value: String(item.revision), label: "Revision " + item.revision }))]} onValueChange={setRestoreRevision} />
            <TerasActionRow><TerasActionButton emphasis="secondary" disabled={blocked || dirty || !restoreRevision} onClick={() => setRestore({ revision: Number(restoreRevision), expected: registry.configuration.revision })}>Review restoration</TerasActionButton></TerasActionRow>
          </TerasFieldStack>
        </TerasPanel>
        <ModelRuntimeActivity runtime={runtime} />
      </TerasPanelStack>} />
    <TerasDraftCloseGuardDialog kicker="Routing draft" title="Discard unsaved changes?" description="The owner configuration will remain the saved source of truth."
      open={nextScope !== null || reloadGuard} keepEditingLabel="Keep editing" leaveLabel="Discard draft"
      onKeepEditing={() => { setNextScope(null); setReloadGuard(false); }} onLeave={() => { setDirty(false); if (nextScope) setScope(nextScope); setNextScope(null); setReloadGuard(false); }} />
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
