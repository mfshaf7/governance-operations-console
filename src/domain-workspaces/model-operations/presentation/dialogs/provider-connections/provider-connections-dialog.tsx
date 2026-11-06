"use client";
import { useEffect, useRef, useState } from "react";
import {
  TerasActionButton, TerasActionRow, TerasDialog, TerasDraftCloseGuardDialog, TerasEmptyState, TerasLoadingState,
  TerasFieldStack, TerasMetadataList, TerasSelectField, TerasTextField,
} from "@/teras";
import type { useProviderConnections } from "../../../live-runtime/use-provider-connections.ts";
import type { ModelRegistry } from "../../../work-model/model-runtime-contract.ts";
import { connectionMetadata, connectionOperationMetadata } from "./provider-connections-view-model.ts";
import { experimentalLabel, type ApiProvider, type ConnectionAction } from "../../../work-model/provider-connections-contract.ts";

type Runtime = ReturnType<typeof useProviderConnections>;
export function ProviderConnectionsDialog({ open, onClose, runtime, registry, changesBlocked, onContinueRegistration, preview=false }: {
  preview?:boolean; open: boolean; onClose: () => void; runtime: Runtime; registry: ModelRegistry; changesBlocked: boolean; onContinueRegistration?: (connectionId:string)=>void;
}) {
  const [provider, setProvider] = useState<ApiProvider>("claude-api"), [name, setName] = useState("");
  const [connectionId, setConnectionId] = useState(""), [apiKey, setApiKey] = useState("");
  const seenCreated=useRef<string|null>(null);
  const [confirmation, setConfirmation] = useState<"connection.disconnect" | "connection.remove" | null>(null);
  const snapshot = runtime.snapshot, item = snapshot?.connections.find(value => value.connection_id === connectionId);
  const preset = snapshot?.presets.find(value => value.provider === (item?.provider ?? provider));
  const unresolved = Boolean(runtime.originalId && !runtime.receipt && runtime.operation?.state !== "cancelled");
  const fieldBlocked=runtime.pending || changesBlocked || (!runtime.fresh&&!preview) || !snapshot;
  const blocked = runtime.pending || changesBlocked || !runtime.fresh || !snapshot;
  const models = Object.values(registry.configuration.configuration.models).filter(value => value.backend_id === item?.connection_id);
  const keyValid = apiKey.length >= 8 && apiKey.length <= 8192 && !/[^\x21-\x7e]/.test(apiKey);
  useEffect(() => { setApiKey(""); setConfirmation(null); }, [open, connectionId, provider]);
  useEffect(() => {
    const clear = () => setApiKey(""); window.addEventListener("pagehide", clear);
    return () => { window.removeEventListener("pagehide", clear); };
  }, []);
  useEffect(() => {
    if (snapshot && connectionId && !snapshot.connections.some(value => value.connection_id === connectionId)) { setConnectionId(""); setApiKey(""); }
  }, [snapshot, connectionId]);
  useEffect(()=>{
    const receipt=runtime.receipt;
    if(receipt?.action!=="connection.create"||seenCreated.current===receipt.command_id||!snapshot?.connections.some(value=>value.connection_id===receipt.connection_id))return;
    seenCreated.current=receipt.command_id;setConnectionId(receipt.connection_id);setName("");
  },[runtime.receipt,snapshot]);
  const close = () => { setApiKey(""); setConfirmation(null); onClose(); };
  const act = (action: ConnectionAction) => { if (item) { setApiKey(""); void runtime.submit(action, { connection_id: item.connection_id }); } };
  return <>
    <TerasDialog closeDisabled={runtime.pending} busy={runtime.pending} busyLabel="Contacting connection service…" open={open} onClose={close} kicker="Models & routing" title="API connections"
      description={experimentalLabel + ". Keys are sent only on your explicit action. They are never saved in the browser or sent to advisors."}
      width="standard" height="content" contentOverflow="auto">
      <TerasFieldStack>
        {preview ? <TerasEmptyState>Design preview: inspect a sample connection or draft a new one. Key storage and provider changes are disabled.</TerasEmptyState>:null}
        <TerasSelectField label="Named connection" value={connectionId} disabled={runtime.pending}
          options={[{ value: "", label: "Add a new connection" }, ...(snapshot?.connections ?? []).map(value => ({ value: value.connection_id, label: value.name + " · " + value.state }))]}
          onValueChange={value => { setApiKey(""); setConnectionId(value); }} />
        {!snapshot ? runtime.error ? <TerasEmptyState>{runtime.error}</TerasEmptyState> : <TerasLoadingState label="Loading provider connections…" skeleton="details" /> : !item ? <>
          <TerasSelectField label="Provider" value={provider} disabled={fieldBlocked} options={snapshot.presets.map(value => ({ value: value.provider, label: value.label + " · Experimental" }))}
            onValueChange={value => { setApiKey(""); setProvider(value as ApiProvider); }} />
          <TerasTextField label="Connection name" value={name} maxLength={100} autoComplete="off" disabled={fieldBlocked} onValueChange={setName} />
          <TerasActionRow><TerasActionButton disabled={blocked || unresolved || !name.trim() || /[\x00-\x1f\x7f]/.test(name) || snapshot.connections.length >= 16}
            onClick={() => void runtime.submit("connection.create", { provider, name })}>Create named connection</TerasActionButton></TerasActionRow>
        </> : <>
          <TerasMetadataList shape="list" items={connectionMetadata(item, models.length)} />
          <TerasTextField label={item.credential_present ? "Replacement API key" : "API key"} value={apiKey} onValueChange={setApiKey}
            type="password" autoComplete="off" spellCheck={false} maxLength={8192} disabled={blocked || unresolved || item.state !== "active" || Boolean(item.pending_operation)} />
          <TerasActionRow>
            <TerasActionButton disabled={blocked || unresolved || item.state !== "active" || Boolean(item.pending_operation) || !keyValid}
              onClick={() => { const key = apiKey; setApiKey(""); void runtime.credentials(item.connection_id, key); }}>{item.credential_present ? "Replace stored key" : "Store key securely"}</TerasActionButton>
            <TerasActionButton emphasis="secondary" disabled={blocked || item.state !== "active"} onClick={() => setConfirmation("connection.disconnect")}>Disconnect & clear key</TerasActionButton>
            <TerasActionButton emphasis="secondary" disabled={blocked || unresolved || item.state !== "disconnected" || Boolean(item.pending_operation)} onClick={() => act("connection.reconnect")}>Reconnect</TerasActionButton>
            <TerasActionButton emphasis="secondary" disabled={blocked || models.length > 0 || item.state === "removing"} onClick={() => setConfirmation("connection.remove")}>Remove connection</TerasActionButton>
          </TerasActionRow>
          {item.pending_operation ? <TerasActionRow><TerasActionButton emphasis="secondary" disabled={runtime.pending}
            onClick={() => void runtime.check(item.pending_operation!)}>Check pending service operation</TerasActionButton></TerasActionRow> : null}
        </>}
        <TerasMetadataList shape="list" items={connectionOperationMetadata(runtime, preset, item, preview)} />
        {item?.state==="active" && item.credential_present && !item.pending_operation && onContinueRegistration ? <TerasActionRow>
          <TerasActionButton disabled={fieldBlocked||unresolved} emphasis="primary" onClick={()=>{close();onContinueRegistration(item.connection_id);}}>Continue to model registration</TerasActionButton>
        </TerasActionRow>:null}
        <TerasActionRow>
          <TerasActionButton emphasis="secondary" disabled={runtime.pending} onClick={() => void runtime.refresh().catch(() => undefined)}>Refresh connections</TerasActionButton>
          {runtime.originalId ? <>
            <TerasActionButton emphasis="secondary" disabled={runtime.pending} onClick={() => void runtime.check(runtime.originalId!)}>Check original operation</TerasActionButton>
            <TerasActionButton emphasis="secondary" disabled={runtime.pending} onClick={() => void runtime.check(runtime.originalId!, true)}>Reconcile original operation</TerasActionButton>
          </> : null}
          {unresolved && runtime.command?.action !== "connection.credentials" && !runtime.operation ? <TerasActionButton emphasis="secondary" disabled={blocked}
            onClick={() => void runtime.replayMetadata()}>Replay original metadata command</TerasActionButton> : null}
          {runtime.receipt || runtime.rejected || runtime.operation?.state === "cancelled" ? <TerasActionButton emphasis="secondary" disabled={runtime.pending} onClick={runtime.clearCompleted}>{runtime.rejected ? "Clear rejected command" : "Clear completed operation"}</TerasActionButton> : null}
        </TerasActionRow>
      </TerasFieldStack>
    </TerasDialog>
    <TerasDraftCloseGuardDialog open={confirmation !== null} kicker="Connection custody"
      title={confirmation === "connection.remove" ? "Remove this named connection?" : "Disconnect and clear its stored key?"}
      description="This clears the stored key and fences uncertain prior key writes. Existing defaults and fallbacks are never changed automatically."
      keepEditingLabel="Cancel" leaveLabel={confirmation === "connection.remove" ? "Remove connection" : "Disconnect"}
      onKeepEditing={() => setConfirmation(null)} onLeave={() => { if (confirmation) act(confirmation); setConfirmation(null); }} />
  </>;
}
