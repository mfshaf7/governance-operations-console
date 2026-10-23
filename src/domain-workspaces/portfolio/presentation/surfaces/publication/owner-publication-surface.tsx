"use client";

import { useState } from "react";
import { TerasActionButton, TerasActionRow, TerasChoiceGroup, TerasContentRegion, TerasContentTray, TerasFieldGrid, TerasFieldStack, TerasList, TerasMetadataList, TerasNoteField, TerasPanel, TerasPanelHeader, TerasSelectField, TerasSignalItem, TerasStatusPill, TerasTextField } from "@/teras";
import { emptyOwnerPublicationDraft, ownerPublicationIntent, type OwnerPublicationDraft } from "../../../live-runtime/owner-publication-intent.ts";
import type { useProductPublicationLiveRuntime } from "../../../live-runtime/use-product-publication-live-runtime.ts";
import type { GovernedProductPublicationIntent, GovernedProductPublicationResult } from "../../../live-runtime/product-publication-live-types.ts";

type Runtime = ReturnType<typeof useProductPublicationLiveRuntime>;
const locatorFields = [
  ["repo", "Owner repository"], ["path", "Relative manifest path"],
  ["sourceRevision", "Owner source revision"], ["manifestRevision", "Later manifest revision"], ["manifestDigest", "Committed manifest digest"],
] as const;

export function OwnerPublicationSurface({ runtime, onApplied }: { runtime: Runtime; onApplied: () => void }) {
  const [draft, setDraft] = useState<OwnerPublicationDraft>(emptyOwnerPublicationDraft);
  const [review, setReview] = useState<{ intent: GovernedProductPublicationIntent; accepted: boolean } | null>(null);
  const [result, setResult] = useState<GovernedProductPublicationResult | null>(null);
  const [previous, setPrevious] = useState<GovernedProductPublicationResult | null>(null);
  const [requestReference, setRequestReference] = useState("");
  const [uncertain, setUncertain] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const live = runtime.mode?.mode === "live";
  const locked = runtime.pending || uncertain !== null;

  function change<K extends keyof OwnerPublicationDraft>(key: K, value: OwnerPublicationDraft[K]) {
    setDraft(current => ({ ...current, [key]: value })); setReview(null); setError(null);
  }
  function beginReview() {
    try {
      const requestId = `product-publication-request:console-${crypto.randomUUID()}`;
      setReview({ intent: ownerPublicationIntent(draft, requestId, new Date().toISOString(), previous), accepted: false });
      setRequestReference(requestId); setError(null);
    } catch (failure) { setError(message(failure)); }
  }
  function remember(observed: GovernedProductPublicationResult) {
    setResult(observed); setRequestReference(observed.request_id); setUncertain(null); setReview(null);
    if (observed.state === "applied") { setPrevious(observed); onApplied(); }
  }
  async function recover(requestId = requestReference) {
    setError(null);
    try { remember(await runtime.read(requestId.trim())); }
    catch (failure) { setError(message(failure)); }
  }
  async function submit() {
    if (!live || !review?.accepted || locked) return;
    setUncertain(review.intent.request_id); setError(null);
    try { remember(await runtime.submit(review.intent)); }
    catch (failure) { setError(message(failure)); }
  }
  function newAction() {
    setReview(null); setError(null);
    setDraft({ ...emptyOwnerPublicationDraft,
      action: previous?.receipt.publication_posture === "internal" ? "update" : previous?.receipt.publication_posture === "archived" ? "restore" : "publish",
      schemaVersion: previous?.receipt.publication_posture === "archived" || previous?.command.schema_version === 2 ? "2" : "1" });
  }
  const known = Object.values(runtime.results);
  return <TerasContentRegion fill gap="normal" scroll>
    <TerasPanel frame="padded" fit="content" treatment="neutral">
      <TerasPanelHeader kicker="Native Product Publication" title="Review committed owner evidence"
        description="Submit an exact owner-manifest locator to OOS. WGCF verifies the committed source, active product, lifecycle and readiness; entered pointers are not owner attestation."
        actions={<TerasActionRow><TerasStatusPill tone={live ? "ok" : "warn"}>{live ? "Owner path connected" : runtime.mode === null ? "Reading owner path" : "Publication not selected"}</TerasStatusPill>
          <TerasActionButton emphasis="secondary" disabled={runtime.pending} onClick={() => void runtime.refreshMode().catch(failure => setError(message(failure)))}>Refresh owner path</TerasActionButton></TerasActionRow>} />
      {!live ? <TerasContentTray kicker="Owner prerequisite" description="Publication requires its accepted runtime binding. Preview candidates and local receipts are not used in this connected workspace." /> : null}
      <TerasFieldGrid columns={2}>
        <TerasTextField label="Original publication request" value={requestReference} disabled={runtime.pending} onValueChange={setRequestReference}
          placeholder="product-publication-request:..." />
        <TerasActionButton emphasis="secondary" disabled={!live || runtime.pending || !requestReference.trim()} onClick={() => void recover()}>Read original publication request</TerasActionButton>
      </TerasFieldGrid>
      <TerasContentTray kicker="Recovery" description="Keep the displayed request reference before submitting. A fresh browser can read that same OOS request here without repeating its write. An unknown outcome is never an empty journal or permission to submit a replacement." />
      {known.length ? <TerasList frame="contained">{known.map(item => <TerasSignalItem key={item.request_id}
        label={item.request_id} title={`${item.receipt.product_id} / ${item.state}`} detail="Read this original request again from OOS; this workspace list is only a locator."
        actionLabel="Read original request" ariaLabel={`Read original publication request ${item.request_id}`} onSelect={() => void recover(item.request_id)} />)}</TerasList> : null}
    </TerasPanel>
    {result ? <OwnerPublicationResult result={result} /> : null}
    <TerasPanel frame="padded" fit="content" treatment="neutral">
      <TerasPanelHeader kicker="New explicit decision" title="Owner manifest locator"
        description="The product owner commits the source snapshot, then a later manifest commit. This action changes publication only; access, runtime, release, source custody and Security remain with their owners."
        actions={<TerasActionButton emphasis="secondary" disabled={locked} onClick={newAction}>Prepare another action</TerasActionButton>} />
      <TerasFieldStack spacing="normal">
        {previous ? <TerasMetadataList columns={2} items={[
          { label: "Prior native product", value: previous.receipt.product_id }, { label: "Current publication", value: previous.receipt.publication_posture ?? "Not advanced" },
          { label: "Publication version", value: String(previous.receipt.publication_version) }, { label: "Prior receipt", value: previous.receipt.receipt_id },
        ]} /> : <TerasContentTray kicker="Initial publication" description="Without a prior applied receipt, this reviews only initial unlisted/version-zero to internal publication. For an existing product, read its actual latest applied request first." />}
        <TerasFieldGrid columns={2}>
          <TerasSelectField label="Publication action" value={draft.action} disabled={!live || locked}
            onValueChange={value => change("action", value as OwnerPublicationDraft["action"])}
            options={["publish", "update", "unpublish", "archive", "restore"].map(value => ({ label: value, value }))} />
          <TerasSelectField label="Owner manifest schema" value={draft.schemaVersion} disabled={!live || locked} onValueChange={value => change("schemaVersion", value)}
            options={[{ label: "Schema 1 — initial owner evidence", value: "1" }, { label: "Schema 2 — Inventory lifecycle binding", value: "2" }]} />
          {locatorFields.map(([key, label]) => <TerasTextField key={key} label={label} value={draft[key]} disabled={!live || locked} onValueChange={value => change(key, value)} />)}
        </TerasFieldGrid>
        <TerasNoteField label="Publication decision reason" value={draft.reason} disabled={!live || locked} onValueChange={value => change("reason", value)} />
        <TerasActionButton disabled={!live || locked} onClick={beginReview}>Review owner publication</TerasActionButton>
      </TerasFieldStack>
    </TerasPanel>
    {review ? <TerasPanel frame="padded" fit="content" tone="warn" treatment="state">
      <TerasPanelHeader kicker="Operator review" title="Exact publication intent" description="No owner state has changed. Keep this request reference and verify the exact committed-manifest locator before approving." />
      <TerasMetadataList columns={2} items={[
        { label: "Request", value: review.intent.request_id }, { label: "Action", value: review.intent.action },
        { label: "From", value: `${review.intent.current_publication_posture} / version ${review.intent.expected_publication_version}` },
        { label: "Target", value: `${review.intent.target_publication.posture} / ${review.intent.target_publication.audience ?? "none"}` },
        { label: "Listing scope", value: review.intent.target_publication.listing_scope ?? "none" }, { label: "Access class", value: review.intent.target_publication.access_class ?? "none" },
        { label: "Owner path", value: `${review.intent.manifest_source.repo}/${review.intent.manifest_source.path}` },
        { label: "Source revision", value: review.intent.manifest_source.source_revision },
        { label: "Manifest revision", value: review.intent.manifest_source.manifest_revision }, { label: "Manifest digest", value: review.intent.manifest_source.manifest_digest },
      ]} />
      <TerasChoiceGroup ariaLabel="Owner publication acceptance" frame="tray" label="Accountable operator decision" disabled={locked}
        selectedId={review.accepted ? "approved" : "review"} options={[{ id: "review", label: "Review required", tone: "warn" }, { id: "approved", label: "I approve this exact publication intent", tone: "ok" }]}
        onSelect={value => { const at = new Date().toISOString(); setReview(current => current ? { accepted: value === "approved", intent: { ...current.intent, decided_at: at, requested_at: at } } : null); }} />
      <TerasActionButton disabled={!live || locked || !review.accepted} onClick={() => void submit()}>Submit reviewed publication</TerasActionButton>
    </TerasPanel> : null}
    {uncertain ? <TerasContentTray kicker="Original request retained" description={`Outcome unknown for ${uncertain}. Read the original request before another decision; no replacement is submitted automatically.`} /> : null}
    {error || runtime.error ? <TerasList frame="contained"><TerasSignalItem label="Publication unavailable" title="Inspect the original owner result" detail={error ?? runtime.error} tone="danger" /></TerasList> : null}
  </TerasContentRegion>;
}

function OwnerPublicationResult({ result }: { result: GovernedProductPublicationResult }) {
  const posture = result.maintenance_projection;
  const findings = posture.evidence_posture.findings;
  return <TerasPanel frame="padded" fit="content" tone={result.state === "applied" ? "ok" : "warn"} treatment="state">
    <TerasPanelHeader kicker="Native owner result" title={result.state === "applied" ? "Publication applied" : "Publication rejected"}
      description="Validated OOS, WGCF and owner receipt evidence. Publication does not grant product access or operating approval." />
    <TerasMetadataList columns={2} items={[
      { label: "Request", value: result.request_id }, { label: "Product", value: result.receipt.product_id },
      { label: "Publication", value: posture.publication.posture }, { label: "Version", value: String(posture.publication.version) },
      { label: "Readiness", value: posture.evidence_posture.state }, { label: "Receipt", value: result.receipt.receipt_id },
      { label: "Receipt digest", value: result.receipt_digest }, { label: "Owner receipt", value: result.owner_receipt.uri },
      { label: "Owner source", value: posture.owner_route.repo }, { label: "Manifest digest", value: posture.owner_route.manifest_digest },
      { label: "Next action", value: result.next_action }, { label: "Lifecycle", value: posture.lifecycle.state },
    ]} />
    {findings.length ? <TerasList frame="contained">{findings.map((finding, index) => <TerasSignalItem key={index} label={String(finding.code ?? "owner-finding")}
      title="Owner readiness finding" detail={typeof finding.message === "string" ? finding.message : "Inspect current owner evidence."} tone="warn" />)}</TerasList> : null}
  </TerasPanel>;
}

function message(error: unknown) { return error instanceof Error ? error.message : "Product Publication is unavailable."; }
