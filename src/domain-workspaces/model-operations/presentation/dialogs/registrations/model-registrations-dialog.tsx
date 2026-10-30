"use client";

import { useEffect, useState } from "react";
import {
  TerasActionButton, TerasActionRow, TerasDialog, TerasEmptyState,
  TerasFieldStack, TerasFilterBar, TerasMetadataList, TerasPanel, TerasPanelHeader,
  TerasRecordCellText, TerasRecordControlLayout, TerasRecordTable, TerasRegisterPanel, TerasSelectField,
  TerasStatusPill, TerasTextField, type TerasRecordTableColumn,
} from "@/teras";
import { modelEffortLabel } from "../../../../../console-integration/governed-ai/model-selection.ts";
import type { useModelRuntime } from "../../../live-runtime/use-model-runtime.ts";
import type { useProviderConnections } from "../../../live-runtime/use-provider-connections.ts";
import type { ModelAction, ModelRegistry } from "../../../work-model/model-runtime-contract.ts";
import {
  modelBackendMetadata, modelBackendStatusMetadata, modelBackendQualificationMetadata,
  modelRegistrationHealthLabel, modelVerificationMetadata,
  registeredModelsForBackend,
} from "./model-registrations-view-model.ts";

type Props = {
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
  open, onClose, runtime, registry, connections, backendLabels, changesBlocked, onSubmit, onOpenConnections,
}: Props) {
  const [backendId, setBackendId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [candidate, setCandidate] = useState("");
  const backend = registry.backends.find(item => item.backend_id === backendId)
    ?? (!backendId ? registry.backends[0] ?? null : null);
  const connection = connections.snapshot?.connections.find(item => item.connection_id === backend?.backend_id);
  const canProbe = !backend?.experimental || Boolean(connections.fresh && connection?.state === "active"
    && connection.credential_present && !connection.pending_operation);
  const blocked = !runtime.fresh || changesBlocked;
  const rows = registeredModelsForBackend(registry, backend?.backend_id);
  const filtered = rows.filter(row => row.model.toLowerCase().includes(search.toLowerCase()));
  const selected = filtered.find(row => row.id === selectedId) ?? filtered[0] ?? null;
  const catalogue = runtime.catalogue?.backend_id === backend?.backend_id ? runtime.catalogue : null;
  const candidates = catalogue?.models.filter(item => !rows.some(row => row.model === item.model)) ?? [];
  const alreadyRegistered = rows.some(row => row.model === candidate);
  const candidateAvailable = backend?.catalogue_supported === false ? Boolean(candidate) : candidates.some(item => item.model === candidate);
  const backendLabel = backend ? backendLabels[backend.backend_id] : "No backend selected";

  useEffect(() => {
    if (backendId && !registry.backends.some(item => item.backend_id === backendId)) {
      setBackendId(""); setSelectedId(""); setCandidate(""); setAdding(false); runtime.clearCatalogue();
    }
  }, [backendId, registry, runtime.clearCatalogue]);

  const submit = (action: ModelAction, input: Record<string, unknown>) => {
    setAdding(false);
    void onSubmit(action, input);
  };
  const columns: Array<TerasRecordTableColumn<ModelRow>> = [
    { key: "model", header: "Model", intent: "primary", render: row => <TerasRecordCellText title={row.model} /> },
    { key: "effort", header: "Native effort options", intent: "secondary", render: row => <TerasRecordCellText title={row.supported_efforts.map(modelEffortLabel).join(", ")} /> },
    { key: "health", header: "Model health", intent: "secondary", render: row => <TerasRecordCellText title={modelRegistrationHealthLabel(registry, row.id)} /> },
  ];

  return <>
    <TerasDialog open={open} onClose={onClose} title="Model registrations"
      kicker="Models & routing" width="wide" height="fill" contentOverflow="hidden"
      actions={<TerasActionButton emphasis="secondary" onClick={onClose}>Back to Models & routing</TerasActionButton>}>
      <TerasRecordControlLayout composition="compact-control" mode="overview-register-selected"
        overview={<TerasPanel data-model-backend-context="true" frame="padded" treatment="neutral" spacing="compact">
          <TerasPanelHeader kicker="Backend connection" title="Selected backend"
            description="Choose the connection whose models you want to manage."
            statusLabel={runtime.preview ? "Sample · read-only" : runtime.fresh ? "Revision " + registry.configuration.revision : "Owner unavailable"}
            statusTone={runtime.fresh || runtime.preview ? "info" : "warn"} />
          <TerasSelectField label="Admitted backend" disabled={changesBlocked || !runtime.fresh && !runtime.preview}
            value={backend?.backend_id ?? ""}
            options={registry.backends.map(item => ({ value: item.backend_id,
              label: item.experimental ? backendLabels[item.backend_id] : item.backend_id + " · " + item.provider }))}
            onValueChange={value => {
              setBackendId(value); setSelectedId(""); setSearch(""); setCandidate(""); setAdding(false); runtime.clearCatalogue();
            }} />
          <TerasActionRow layout="split" end={
            <TerasActionRow>
              <TerasActionButton disabled={blocked || !backend} emphasis="secondary"
                onClick={() => backend && submit(backend.registered ? "backend.remove" : "backend.register", { backend_id: backend.backend_id })}>
                {backend?.registered ? "Remove backend" : "Register backend"}
              </TerasActionButton>
              {backend?.account_login_supported ? <TerasActionButton disabled={blocked || !backend.registered} emphasis="secondary"
                onClick={() => submit("account.login.start", { backend_id: backend.backend_id })}>Connect account</TerasActionButton> : null}
              <TerasActionButton emphasis="secondary" disabled={changesBlocked || runtime.preview}
                onClick={onOpenConnections}>Add / manage API connections</TerasActionButton>
            </TerasActionRow>
          }>
            <TerasMetadataList shape="line" treatment="chip" wrap items={modelBackendStatusMetadata(registry, backend)} />
          </TerasActionRow>
          {backend?.experimental ? <TerasMetadataList shape="line" treatment="chip" wrap items={modelBackendQualificationMetadata(backend)} /> : null}
        </TerasPanel>}
        register={<TerasRegisterPanel data-model-registrations-register="true" density="compact-control"
          kicker="Model inventory" title="Registered models" description={"Models registered through " + backendLabel + "."}
          actions={<TerasActionRow>
            <TerasStatusPill tone="info">{filtered.length}/{rows.length} shown</TerasStatusPill>
            <TerasActionButton disabled={!backend} onClick={() => setAdding(true)}>Register model</TerasActionButton>
          </TerasActionRow>}
          filterBar={<TerasFilterBar search={{ ariaLabel: "Search registered models", value: search,
            onValueChange: setSearch, placeholder: "Search models on this backend..." }} />}>
          {filtered.length ? <TerasRecordTable fill columns={columns} rows={filtered} getRowId={row => row.id}
            selectedRowId={selected?.id} onSelect={row => setSelectedId(row.id)} />
            : <TerasEmptyState>{rows.length ? "No models match this search on the selected backend."
              : "No models are registered on this backend. Use Register model to add one."}</TerasEmptyState>}
        </TerasRegisterPanel>}
        selected={selected ? <TerasPanel data-model-registration-selection="true" frame="padded" treatment="neutral" spacing="compact" fit="fill" overflow="auto">
          <TerasPanelHeader kicker="Selected model" title={selected.model}
            description={"Registered through " + backendLabel + ". Verification keeps existing route references."} />
          <TerasMetadataList shape="line" wrap items={modelVerificationMetadata(registry, selected.backend_id, selected.model)} />
          <TerasActionRow>
            <TerasActionButton disabled={blocked || !backend?.registered || !canProbe}
              onClick={() => submit("model.register", { backend_id: selected.backend_id, model: selected.model })}>Verify & update registration</TerasActionButton>
            <TerasActionButton disabled={blocked} emphasis="secondary"
              onClick={() => submit("model.remove", { model_id: selected.id })}>Remove selected registration</TerasActionButton>
          </TerasActionRow>
        </TerasPanel> : <TerasEmptyState fill>Select a registered model to inspect its verification details.</TerasEmptyState>} />
    </TerasDialog>

    <TerasDialog open={open && adding} onClose={() => setAdding(false)} title="Register model"
      description={"Add a model through " + backendLabel + ". Verification is required before it can be used in routing."}
      kicker="Model registrations" width="standard" height="content" contentOverflow="auto"
      actions={<TerasActionButton emphasis="secondary" onClick={() => setAdding(false)}>Back to registrations</TerasActionButton>}>
      <TerasFieldStack>
        <TerasMetadataList shape="line" wrap items={modelBackendMetadata(registry, backend)} />
        {runtime.preview ? <TerasEmptyState>Read-only sample preview. Discovery and registration are disabled.</TerasEmptyState>
          : !runtime.fresh ? <TerasEmptyState>The model owner is unavailable. Refresh owner state before registering a model.</TerasEmptyState>
          : !backend?.registered ? <TerasEmptyState>Register this backend before discovering or verifying models.</TerasEmptyState> : null}
        {backend?.catalogue_supported === false
          ? <TerasTextField label="Exact model ID" value={candidate} onValueChange={setCandidate}
              disabled={blocked || !backend.registered} maxLength={200} autoComplete="off" spellCheck={false} />
          : <>
              <TerasActionRow><TerasActionButton disabled={blocked || !backend?.registered || !canProbe}
                emphasis="secondary" onClick={() => backend && void runtime.discover(backend.backend_id)}>Discover models</TerasActionButton></TerasActionRow>
              <TerasSelectField label="Model" disabled={blocked || !backend?.registered} value={candidate}
                options={[{ value: "", label: "Choose an unregistered model" }, ...candidates.map(item => ({ value: item.model, label: item.model }))]}
                onValueChange={setCandidate} />
              {!candidates.length ? <TerasEmptyState>{catalogue
                ? "No unregistered models were returned. Existing models can be verified from the registered-model list."
                : "Discover the models available through this backend."}</TerasEmptyState> : null}
            </>}
        {alreadyRegistered ? <TerasEmptyState>This model is already registered. Select it in Registered models to verify or update it.</TerasEmptyState> : null}
        <TerasActionRow><TerasActionButton disabled={blocked || !backend?.registered || !candidateAvailable || alreadyRegistered || !canProbe}
          onClick={() => {
            if (backend) { submit("model.register", { backend_id: backend.backend_id, model: candidate }); setCandidate(""); }
          }}>Verify & register model</TerasActionButton></TerasActionRow>
      </TerasFieldStack>
    </TerasDialog>
  </>;
}
