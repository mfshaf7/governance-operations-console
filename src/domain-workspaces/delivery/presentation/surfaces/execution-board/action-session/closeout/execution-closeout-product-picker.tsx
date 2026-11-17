"use client";
import { useEffect, useState } from "react";
import { TerasActionButton, TerasEmptyState, TerasFieldStack, TerasLoadingState, TerasNoteField, TerasSelectField, TerasTechnicalDetails, TerasTextField } from "@/teras";
import { assertWorkspaceRegistrySnapshot } from "../../../../../../../workspace-registry/workspace-registry-contract.ts";
import type { WorkspaceRegistryRecord } from "../../../../../../../workspace-registry/model/workspace-registry-types.ts";
import { workspaceRegistryFixture } from "../../../../../../../workspace-registry/fixtures/workspace-registry.fixture.ts";
import type { ExecutionCloseoutDraft } from "./execution-closeout-model.ts";

export function ExecutionCloseoutProductPicker({ value, onChange, live }: {
  value: ExecutionCloseoutDraft["existingProduct"]; onChange: (value: ExecutionCloseoutDraft["existingProduct"]) => void; live: boolean;
}) {
  const [query, setQuery] = useState(""), [retry, setRetry] = useState(0);
  const [state, setState] = useState<{ key: string; rows: readonly WorkspaceRegistryRecord[]; error: string | null } | null>(null);
  useEffect(() => {
    if (!live) return;
    let active = true; const lifetime = new AbortController();
    const timer = setTimeout(() => { void (async () => {
      try {
        const response = await fetch(`/api/workspace-registry?${new URLSearchParams({ scope: "inventory", query })}`, { cache: "no-store", signal: AbortSignal.any([lifetime.signal, AbortSignal.timeout(15000)]) });
        if (!response.ok) throw Error("Registered products could not be read. Retry before selecting a product.");
        const raw = await response.text(); if (raw.length > 2_097_152) throw Error("The product register exceeded its read limit.");
        const snapshot = assertWorkspaceRegistrySnapshot(JSON.parse(raw));
        if (snapshot.workflow_id === "workspace-registry-view" && (snapshot.instance_page.selection.scope !== "inventory" || snapshot.instance_page.selection.query !== query || snapshot.instance_page.after !== null)) throw Error("The product register does not match this search.");
        if (active) setState({ key: query, rows: snapshot.records, error: null });
      } catch (error) { if (active) setState({ key: query, rows: [], error: error instanceof Error ? error.message : "Registered products are unavailable." }); }
    })(); }, query ? 250 : 0);
    return () => { active = false; lifetime.abort(); clearTimeout(timer); };
  }, [live, query, retry]);
  const current = state?.key === query ? state : null;
  const products = (live ? current?.rows ?? [] : workspaceRegistryFixture.records).filter(item => item.kind === "product" && item.posture === "active" && item.name.toLowerCase().includes(query));
  const selected = products.find(item => item.id === `product:${value.productId}`);
  function select(record: WorkspaceRegistryRecord) {
    const id = record.id.replace(/^product:/, "");
    onChange({ ...value, productId: id, registryRef: `workspace-governance://products/${id}`, registryVersion: String(record.version),
      productOwnerRef: record.owner_refs.length === 1 ? record.owner_refs[0] : record.owner_refs.includes(value.productOwnerRef) ? value.productOwnerRef : "" });
  }
  return <TerasFieldStack spacing="normal">
    <TerasTextField label="Find registered product" value={query} placeholder="Search by product name" onValueChange={next => setQuery(next.trim().toLowerCase().slice(0, 128))} />
    {live && !current ? <TerasLoadingState inline label="Reading registered products…" /> : null}
    {current?.error ? <TerasEmptyState>{current.error}<TerasActionButton emphasis="secondary" onClick={() => { setState(null); setRetry(value => value + 1); }}>Retry product register</TerasActionButton></TerasEmptyState> : null}
    <TerasSelectField label="Registered product" disabled={live && (!current || Boolean(current.error))} value={value.productId}
      options={[{ label: "Choose a registered product", value: "" }, ...products.map(item => ({ label: `${item.name}${live ? "" : " · preview example"}`, value: item.id.replace(/^product:/, "") })),
        ...(value.productId && !selected ? [{ label: `${value.productId} · retained selection, not in this result`, value: value.productId }] : [])]}
      onValueChange={id => { const record = products.find(item => item.id === `product:${id}`); if (record) select(record); else onChange({ ...value, productId: "", registryRef: "", registryVersion: "", productOwnerRef: "" }); }} />
    {selected && String(selected.version) !== value.registryVersion ? <TerasEmptyState>The registration changed since this draft was prepared.
      <TerasActionButton emphasis="secondary" onClick={() => select(selected)}>Use current registration</TerasActionButton></TerasEmptyState> : null}
    <TerasSelectField label="Responsible repository" value={value.productOwnerRef} disabled={!selected}
      helper="Choose which registered repository is responsible for this product change."
      options={[{ value: "", label: "Choose responsibility" }, ...(selected?.owner_refs ?? []).map(ref => ({ value: ref, label: ref.replace(/^repo:\/\//, "") }))]}
      onValueChange={productOwnerRef => onChange({ ...value, productOwnerRef })} />
    <TerasNoteField label="What changed in this product?" value={value.changeSummary}
      placeholder="Describe the delivered change and its impact on the existing product." onValueChange={changeSummary => onChange({ ...value, changeSummary })} />
    <TerasTechnicalDetails items={[{ label: "Registry reference", value: value.registryRef || "Select a product first" }, { label: "Recorded version", value: value.registryVersion || "Not selected" }]} />
  </TerasFieldStack>;
}
