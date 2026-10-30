"use client";
import { useEffect, useState } from "react";
import {
  TerasActionButton, TerasActionRow, TerasDialog, TerasDraftCloseGuardDialog, TerasEmptyState,
  TerasFieldStack, TerasMetadataList, TerasSelectField, TerasTextField,
} from "@/teras";
import type { useProviderConnections } from "../../../live-runtime/use-provider-connections.ts";
import type { ModelRegistry } from "../../../work-model/model-runtime-contract.ts";
import { connectionMetadata, connectionOperationMetadata } from "./provider-connections-view-model.ts";
import { experimentalLabel, type ApiProvider, type ConnectionAction } from "../../../work-model/provider-connections-contract.ts";

type Runtime = ReturnType<typeof useProviderConnections>;
export function ProviderConnectionsDialog({ open, onClose, runtime, registry, changesBlocked }: {
  open: boolean; onClose: () => void; runtime: Runtime; registry: ModelRegistry; changesBlocked: boolean;
}) {
  const [provider, setProvider] = useState<ApiProvider>("claude-api"), [name, setName] = useState("");
  const [connectionId, setConnectionId] = useState(""), [apiKey, setApiKey] = useState("");
  const [confirmation, setConfirmation] = useState<"connection.disconnect" | "connection.remove" | null>(null);
  const snapshot = runtime.snapshot, item = snapshot?.connections.find(value => value.connection_id === connectionId);
  const preset = snapshot?.presets.find(value => value.provider === (item?.provider ?? provider));
  const unresolved = Boolean(runtime.originalId && !runtime.receipt && runtime.operation?.state !== "cancelled");
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
  const close = () => { setApiKey(""); setConfirmation(null); onClose(); };
  const act = (action: ConnectionAction) => { if (item) { setApiKey(""); void runtime.submit(action, { connection_id: item.connection_id }); } };
  return <>
    <TerasDialog open={open} onClose={close} kicker="Models & routing" title="API connections"
      description={experimentalLabel + ". Keys are sent only on your explicit action. They are never saved in the browser or sent to advisors."}
      width="standard" height="content" contentOverflow="auto">
      <TerasFieldStack>
        <TerasSelectField label="Named connection" value={connectionId} disabled={runtime.pending}
          options={[{ value: "", label: "Add a new connection" }, ...(snapshot?.connections ?? []).map(value => ({ value: value.connection_id, label: value.name + " · " + value.state }))]}
          onValueChange={value => { setApiKey(""); setConnectionId(value); }} />
        {!snapshot ? <TerasEmptyState>{runtime.error ?? "Reading provider connections from the owner."}</TerasEmptyState> : !item ? <>
          <TerasSelectField label="Provider" value={provider} disabled={blocked} options={snapshot.presets.map(value => ({ value: value.provider, label: value.label + " · Experimental" }))}
            onValueChange={value => { setApiKey(""); setProvider(value as ApiProvider); }} />
          <TerasTextField label="Connection name" value={name} maxLength={100} autoComplete="off" disabled={blocked} onValueChange={setName} />
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
            onClick={() => void runtime.check(item.pending_operation!)}>Check pending owner operation</TerasActionButton></TerasActionRow> : null}
        </>}
        <TerasMetadataList shape="list" items={connectionOperationMetadata(runtime, preset)} />
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
