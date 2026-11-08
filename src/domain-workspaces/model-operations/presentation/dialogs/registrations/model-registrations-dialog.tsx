"use client";

import { useEffect, useState } from "react";
import {
  TerasActionButton, TerasActionRow, TerasDialog, TerasEmptyState,
  TerasFieldStack, TerasFilterBar, TerasMetadataList, TerasPanel, TerasPanelHeader,
  TerasRecordCellText, TerasRecordControlLayout, TerasRecordTable, TerasRegisterPanel, TerasSelectField,
  TerasStatusPill, TerasTextField, TerasRegisterPagination, useRegisterPage, type TerasRecordTableColumn,
} from "@/teras";
import { modelEffortLabel } from "../../../../../console-integration/governed-ai/model-selection.ts";
import type { useModelRuntime } from "../../../live-runtime/use-model-runtime.ts";
import type { useProviderConnections } from "../../../live-runtime/use-provider-connections.ts";
import type { ModelAction, ModelRegistry } from "../../../work-model/model-runtime-contract.ts";
import {
  modelBackendMetadata, modelBackendStatusMetadata, modelBackendQualificationMetadata,
  modelRegistrationHealthLabel,
  registeredModelsForBackend,
} from "./model-registrations-view-model.ts";

import { LocalExceptionRuntimeDialog } from "../local-runtime/local-exception-runtime-dialog.tsx";
import { RegisteredModelInspector } from "./registered-model-inspector.tsx";

type Props = {
  preferredBackendId?:string|null;
  open: boolean;
  onClose: () => void;
  runtime: ReturnType<typeof useModelRuntime>;
  registry: ModelRegistry;
  connections: ReturnType<typeof useProviderConnections>;
  backendLabels: Record<string, string>;
  changesBlocked: boolean;
  onSubmit: (action: ModelAction, input: Record<string, unknown>) => Promise<boolean | undefined>;
  onOpenConnections: () => void;
};

type ModelRow = ReturnType<typeof registeredModelsForBackend>[number];

export function ModelRegistrationsDialog({
  open, onClose, preferredBackendId, runtime, registry, connections, backendLabels, changesBlocked, onSubmit, onOpenConnections,
}: Props) {
  const [backendId, setBackendId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [candidate, setCandidate] = useState("");
  const [localRuntimeOpen, setLocalRuntimeOpen] = useState(false);
  const backend = registry.backends.find(item => item.backend_id === backendId)
    ?? (!backendId ? (preferredBackendId ? registry.backends.find(item=>item.backend_id===preferredBackendId) ?? null : registry.backends[0] ?? null) : null);
  const connection = connections.snapshot?.connections.find(item => item.connection_id === backend?.backend_id);
  const canProbe = !backend?.experimental || Boolean(connections.fresh && connection?.state === "active"
    && connection.credential_present && !connection.pending_operation);
  const blocked = !runtime.fresh || changesBlocked;
  const entryBlocked=(!runtime.fresh&&!runtime.preview)||changesBlocked;
  const rows = registeredModelsForBackend(registry, backend?.backend_id);
  const filtered = rows.filter(row => row.model.toLowerCase().includes(search.toLowerCase()));
  const page = useRegisterPage(filtered, JSON.stringify([backend?.backend_id, search.trim().toLowerCase(), open]), 'Registered models');
  const selected = filtered.find(row => row.id === selectedId) ?? page.rows[0] ?? null;
  const catalogue = runtime.catalogue?.backend_id === backend?.backend_id ? runtime.catalogue : null;
  const candidates = catalogue?.models.filter(item => !rows.some(row => row.model === item.model)) ?? [];
  const alreadyRegistered = rows.some(row => row.model === candidate);
  const candidateAvailable = backend?.catalogue_supported === false ? Boolean(candidate) : candidates.some(item => item.model === candidate);
  const backendLabel = backend ? backendLabels[backend.backend_id] : "No backend selected";

  useEffect(() => {
    if (backendId && !registry.backends.some(item => item.backend_id === backendId)) {
      setBackendId(""); setSelectedId(""); setCandidate(""); setAdding(false); setLocalRuntimeOpen(false); runtime.clearCatalogue();
    }
  }, [backendId, registry, runtime.clearCatalogue]);

  useEffect(()=>{if(open&&preferredBackendId){setBackendId(preferredBackendId);setSelectedId("");setSearch("");setCandidate("");setAdding(false);runtime.clearCatalogue();}},[open,preferredBackendId,runtime.clearCatalogue]);
  useEffect(() => { if (!open) setLocalRuntimeOpen(false); }, [open]);

  const submit = (action: ModelAction, input: Record<string, unknown>) => {
    setAdding(false);
    void onSubmit(action, input);
  };
  const columns: Array<TerasRecordTableColumn<ModelRow>> = [
    { key: "model", header: "Model", intent: "primary", render: row => <TerasRecordCellText title={row.model} /> },
    { key: "effort", header: "Reasoning / thinking options", intent: "secondary", render: row => <TerasRecordCellText title={row.supported_efforts.map(modelEffortLabel).join(", ")} /> },
    { key: "health", header: "Model health", intent: "secondary", render: row => <TerasRecordCellText title={modelRegistrationHealthLabel(registry, row.id)} /> },
  ];

  return <>
    <TerasDialog busy={runtime.pending} busyLabel="Updating model registration…" open={open} onClose={onClose} title="Model registrations"
      kicker="Models & routing" width="wide" height="fill" contentOverflow="hidden"
      actions={<TerasActionButton emphasis="secondary" onClick={onClose}>Back to Models & routing</TerasActionButton>}>
      <TerasRecordControlLayout composition="compact-control" mode="overview-register-selected"
        overview={<TerasPanel data-model-backend-context="true" frame="padded" treatment="neutral" spacing="compact">
          <TerasPanelHeader kicker="Provider connection" title="Selected connection"
            description="Choose the connection whose models you want to manage."
            statusLabel={runtime.preview ? "Sample · read-only" : runtime.fresh ? "Revision " + registry.configuration.revision : "Source unavailable"}
            statusTone={runtime.fresh || runtime.preview ? "info" : "warn"} />
          <TerasSelectField label="Provider connection" disabled={changesBlocked || !runtime.fresh && !runtime.preview}
            value={backend?.backend_id ?? ""}
            options={registry.backends.map(item => ({ value: item.backend_id,
              label: item.experimental ? backendLabels[item.backend_id] : item.backend_id + " · " + item.provider }))}
            onValueChange={value => {
              setBackendId(value); setSelectedId(""); setSearch(""); setCandidate(""); setAdding(false); setLocalRuntimeOpen(false); runtime.clearCatalogue();
            }} />
          <TerasActionRow layout="split" end={
            <TerasActionRow>
              <TerasActionButton disabled={blocked || !backend} emphasis="secondary"
                onClick={() => backend && submit(backend.registered ? "backend.remove" : "backend.register", { backend_id: backend.backend_id })}>
                {backend?.registered ? "Unregister connection" : "Register connection"}
              </TerasActionButton>
              {backend?.account_login_supported ? <TerasActionButton disabled={blocked || !backend.registered} emphasis="secondary"
                onClick={() => submit("account.login.start", { backend_id: backend.backend_id })}>Connect account</TerasActionButton> : null}
              {backend?.provider === "ollama" ? <TerasActionButton emphasis="secondary" size="table-compact"
                onClick={() => setLocalRuntimeOpen(true)}>Inspect runtime</TerasActionButton> : null}
              <TerasActionButton emphasis="secondary" disabled={changesBlocked}
                onClick={onOpenConnections}>Add / manage API connections</TerasActionButton>
            </TerasActionRow>
          }>
            <TerasMetadataList shape="line" treatment="chip" wrap items={modelBackendStatusMetadata(registry, backend)} />
          </TerasActionRow>
          {backend?.experimental ? <TerasMetadataList shape="line" treatment="chip" wrap items={modelBackendQualificationMetadata(backend)} /> : null}
        </TerasPanel>}
        register={<TerasRegisterPanel data-model-registrations-register="true" density="compact-control"
          footer={<TerasRegisterPagination label="Registered models" disabled={runtime.pending} offset={page.offset} count={page.rows.length} total={filtered.length} page={page.page} pending={runtime.refreshing} unavailable={!runtime.fresh && !runtime.preview} hasPrevious={page.hasPrevious} hasNext={page.hasNext} onPrevious={page.previous} onNext={page.next} />}
          kicker="Model inventory" title="Registered models" description={"Models registered through " + backendLabel + "."}
          actions={<TerasActionRow>
            <TerasStatusPill tone="info">{filtered.length}/{rows.length} matched</TerasStatusPill>
            <TerasActionButton disabled={!backend} onClick={() => setAdding(true)}>Register model</TerasActionButton>
          </TerasActionRow>}
          filterBar={<TerasFilterBar search={{ ariaLabel: "Search registered models", value: search,
            onValueChange: setSearch, placeholder: "Search models on this backend..." }} />}>
          {filtered.length ? <TerasRecordTable ariaLabel="Registered models" fill columns={columns} rows={page.rows} getRowId={row => row.id}
            selectedRowId={selected?.id} onSelect={row => setSelectedId(row.id)} />
            : <TerasEmptyState>{rows.length ? "No models match this search on the selected backend."
              : "No models are registered on this backend. Use Register model to add one."}</TerasEmptyState>}
        </TerasRegisterPanel>}
        selected={selected ? <RegisteredModelInspector key={selected.id} registry={registry}
          modelId={selected.id} backendLabel={backendLabel}
          verificationBlocked={blocked || !backend?.registered || !canProbe} removalBlocked={blocked}
          onVerify={() => submit("model.register", { backend_id: selected.backend_id, model: selected.model })}
          onRemove={() => submit("model.remove", { model_id: selected.id })} /> : <TerasEmptyState fill>Select a registered model to inspect its verification details.</TerasEmptyState>} />
    </TerasDialog>

    <TerasDialog open={open && adding} onClose={() => setAdding(false)} title="Register model"
      description={"Add a model through " + backendLabel + ". Verification is required before it can be used in routing."}
      kicker="Model registrations" width="standard" height="content" contentOverflow="auto"
      actions={<TerasActionButton emphasis="secondary" onClick={() => setAdding(false)}>Back to registrations</TerasActionButton>}>
      <TerasFieldStack>
        <TerasMetadataList shape="line" wrap items={modelBackendMetadata(registry, backend)} />
        {runtime.preview ? <TerasEmptyState>Design preview: edit sample selections. Discovery uses a sample catalogue; registration is disabled.</TerasEmptyState>
          : !runtime.fresh ? <TerasEmptyState>The model service is unavailable. Refresh source state before registering a model.</TerasEmptyState>
          : !backend?.registered ? <TerasEmptyState>Register this connection before discovering or verifying models.</TerasEmptyState> : null}
        {backend?.catalogue_supported === false
          ? <TerasTextField label="Exact model ID" value={candidate} onValueChange={setCandidate}
              disabled={entryBlocked || (!backend.registered&&!runtime.preview)} maxLength={200} autoComplete="off" spellCheck={false} />
          : <>
              <TerasActionRow><TerasActionButton disabled={entryBlocked || (!runtime.preview && (!backend?.registered || !canProbe))}
                emphasis="secondary" onClick={() => backend && void runtime.discover(backend.backend_id)}>Discover models</TerasActionButton></TerasActionRow>
              <TerasSelectField label="Model" disabled={entryBlocked || (!backend?.registered&&!runtime.preview)} value={candidate}
                options={[{ value: "", label: "Choose an unregistered model" }, ...candidates.map(item => ({ value: item.model, label: item.model }))]}
                onValueChange={setCandidate} />
              {!candidates.length ? <TerasEmptyState>{catalogue
                ? "No unregistered models were returned. Existing models can be verified from the registered-model list."
                : "Discover the models available through this connection."}</TerasEmptyState> : null}
            </>}
        {alreadyRegistered ? <TerasEmptyState>This model is already registered. Select it in Registered models to verify or update it.</TerasEmptyState> : null}
        <TerasActionRow><TerasActionButton disabled={blocked || !backend?.registered || !candidateAvailable || alreadyRegistered || !canProbe}
          onClick={() => {
            if (backend) { submit("model.register", { backend_id: backend.backend_id, model: candidate }); setCandidate(""); }
          }}>Verify & register model</TerasActionButton></TerasActionRow>
      </TerasFieldStack>
    </TerasDialog>
    {open && localRuntimeOpen && backend?.provider === "ollama" ? <LocalExceptionRuntimeDialog open onClose={() => setLocalRuntimeOpen(false)} /> : null}
  </>;
}
