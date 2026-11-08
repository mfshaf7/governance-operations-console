"use client";

import { useEffect, useState } from "react";
import { TerasLoadingState,
  TerasActionButton, TerasActionRow, TerasChoiceGroup, TerasContentRegion,
  TerasContentTray, TerasDraftCloseGuardDialog, TerasFieldGrid, TerasFieldStack,
  TerasList, TerasMetadataList, TerasModalShell, TerasNoteField, TerasPanel,
  TerasPanelHeader, TerasSelectField, TerasSignalItem, TerasStatusPill,
  TerasTechnicalDetails, TerasTextField,
} from "@/teras";
import type { WorkspaceContinuityProduct } from "../../../../../workspace-continuity/workspace-continuity-types.ts";
import type { useProductPublicationLiveRuntime } from "../../../live-runtime/use-product-publication-live-runtime.ts";
import type { GovernedProductPublicationAction, GovernedProductPublicationIntent, GovernedProductPublicationResult } from "../../../live-runtime/product-publication-live-types.ts";
import { preparedPublicationIntent, publicationActionLabels, publicationPostureLabels, type ProductPublicationPreparation } from "../../../live-runtime/product-publication-preparation.ts";
import { OwnerPublicationResult } from "./owner-publication-result.tsx";

type Runtime = ReturnType<typeof useProductPublicationLiveRuntime>;
export function useOwnerPublicationState() {
  const [productId, setProductId] = useState("");
  const [preparation, setPreparation] = useState<ProductPublicationPreparation | null>(null);
  const [action, setAction] = useState<GovernedProductPublicationAction>("publish");
  const [reason, setReason] = useState("");
  const [review, setReview] = useState<{ intent: GovernedProductPublicationIntent; accepted: boolean; expiresAt: string } | null>(null);
  const [result, setResult] = useState<GovernedProductPublicationResult | null>(null);
  const [requestReference, setRequestReference] = useState("");
  const [uncertain, setUncertain] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  return { productId, setProductId, preparation, setPreparation, action, setAction, reason, setReason,
    review, setReview, result, setResult, requestReference, setRequestReference, uncertain, setUncertain,
    error, setError, dirty: reason.trim().length > 0 || review !== null
      || (preparation !== null && preparation.available_actions.length > 0 && action !== preparation.available_actions[0]) };
}

export function OwnerPublicationSurface({ runtime, state, products, productsError, authorityRevision, previewMode = false, onRetryProducts, onApplied }: {
  runtime: Runtime; state: ReturnType<typeof useOwnerPublicationState>;
  products: readonly Pick<WorkspaceContinuityProduct, "product_id" | "name">[] | null; productsError: string | null;
  authorityRevision: string | null;
  previewMode?: boolean;
  onRetryProducts: () => void; onApplied: () => void;
}) {
  const { productId, setProductId, preparation, setPreparation, action, setAction, reason, setReason,
    review, setReview, result, setResult, requestReference, setRequestReference,
    uncertain, setUncertain, error, setError } = state;
  const [replaceProduct, setReplaceProduct] = useState<string | null>(null);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [, wakeExpiry] = useState(0);
  const live = runtime.mode?.mode === "live";
  const canLoad = live || previewMode;
  const locked = runtime.pending || uncertain !== null;
  const selected = products?.find(product => product.product_id === productId);
  const sourceChanged = preparation !== null && (!selected || preparation.authority_revision !== authorityRevision);
  const expired = preparation !== null && Date.parse(preparation.expires_at) <= Date.now();
  const ready = preparation?.status === "prepared" && !expired && !sourceChanged;

  useEffect(() => {
    if (!preparation) return;
    const timer = setTimeout(() => wakeExpiry(value => value + 1), Math.max(0, Date.parse(preparation.expires_at) - Date.now()) + 10);
    return () => clearTimeout(timer);
  }, [preparation]);

  async function loadInformation(id: string, preserveDraft = false) {
    const priorAction = action;
    setProductId(id); setPreparation(null); setReview(null); setError(null);
    if (!preserveDraft) setReason("");
    try {
      const prepared = await runtime.prepare(id);
      setPreparation(prepared); setAction(preserveDraft ? priorAction : prepared.available_actions[0] ?? "publish");
    } catch (failure) { setError(message(failure)); }
  }
  function selectProduct(id: string) {
    if (locked || !id) return;
    if (id === productId) { void loadInformation(id, true); return; }
    if (state.dirty) setReplaceProduct(id);
    else void loadInformation(id);
  }
  function beginReview() {
    try {
      if (!preparation || !selected) throw new Error("Choose a product and load its publication information first.");
      const at = new Date().toISOString();
      const intent = preparedPublicationIntent(preparation, action, reason, `product-publication-request:console-${crypto.randomUUID()}`, at);
      setRequestReference(intent.request_id); setReview({ intent, accepted: false, expiresAt: preparation.expires_at }); setError(null);
    } catch (failure) { setError(message(failure)); }
  }
  function remember(observed: GovernedProductPublicationResult, clearSubmittedDraft = false) {
    setResult(observed); setRequestReference(observed.request_id); setUncertain(null); setReview(null);
    if (clearSubmittedDraft) { setPreparation(null); setReason(""); }
    if (clearSubmittedDraft && observed.state === "applied") onApplied();
  }
  async function recover(id = uncertain ?? requestReference) {
    if (uncertain && id !== uncertain) return;
    setError(null);
    try { remember(await runtime.read(id.trim()), uncertain === id); setRecoveryOpen(false); }
    catch (failure) { setError(message(failure)); }
  }
  async function submit() {
    if (!live || !review?.accepted || locked) return;
    if (Date.parse(review.expiresAt) <= Date.now() || sourceChanged) {
      setError("The loaded information has expired or the product changed. Return to the draft and load current information before approving again."); return;
    }
    setUncertain(review.intent.request_id); setError(null);
    try { remember(await runtime.submit(review.intent), true); }
    catch (failure) { setError(message(failure)); }
  }
  const failure = error ?? runtime.error;
  return <>
    <TerasPanel fit="fill" frame="padded" spacing="normal" layout="header-body-footer" overflow="hidden" treatment="neutral">
      <TerasPanelHeader kicker="Product catalog" title="Publication"
        description="Add a managed product to the workspace catalog, update its entry, or remove its listing. This does not deploy the product."
        actionsLayout="inline" actions={<TerasActionRow>
          <TerasStatusPill tone={live ? "info" : "warn"}>{previewMode ? "Design preview" : live ? "Configured" : runtime.mode === null ? "Checking setup" : "Not connected"}</TerasStatusPill>
          <TerasActionButton emphasis="secondary" disabled={runtime.pending || previewMode} onClick={() => { onRetryProducts(); void runtime.refreshMode().catch(failure => setError(message(failure))); }}>Refresh</TerasActionButton>
          <TerasActionButton emphasis="secondary" disabled={runtime.pending || previewMode} onClick={() => setRecoveryOpen(true)}>Find earlier request</TerasActionButton>
        </TerasActionRow>} />
      <TerasContentRegion fill gap="normal" scroll>
        {previewMode ? <TerasContentTray kicker="Sample products" description="Review the interaction with example product information. Publishing is disabled; no catalog or source data will change." /> : null}
        {live && !products && !productsError ? <TerasLoadingState label="Loading products for publication…" /> : !canLoad || !products ? <TerasContentTray kicker="Publication unavailable"
          description={productsError ?? (!live ? "This preview is not connected to the publication service. Product information and catalog changes are unavailable here." : "Product information is still loading. Choose a product when it becomes available.")} /> : <>
          <TerasFieldGrid columns={2}>
            <TerasSelectField label="Product" ariaLabel="Product to publish" value={productId} disabled={locked}
              options={[...(!productId ? [{ value: "", label: "Choose a product" }] : []), ...products.map(product => ({ value: product.product_id, label: product.name }))]} onValueChange={selectProduct}
              helper="Choose an existing managed product. Its source information and latest catalog state are loaded for you." />
            <TerasSelectField label="Catalog change" value={action} disabled={locked || !ready || !preparation?.available_actions.length}
              options={preparation?.available_actions.length ? [
                ...(!preparation.available_actions.includes(action) ? [{ value: action, label: "Select a new catalog change" }] : []),
                ...preparation.available_actions.map(value => ({ value, label: publicationActionLabels[value] })),
              ]
                : [{ value: action, label: productId ? "Product information needed" : "Choose a product first" }]}
              helper={preparation ? `Current listing: ${publicationPostureLabels[preparation.current.posture]}` : undefined}
              onValueChange={value => { setAction(value); setReview(null); }} />
          </TerasFieldGrid>
          {!products.length ? <TerasContentTray kicker="No managed products" description="Register a product in Workspace Registry before publishing it to the catalog." /> : null}
          {runtime.pending && !uncertain ? <TerasLoadingState inline={!!preparation} label="Loading product information…" detail="Reading the publication file and latest catalog receipt." /> : null}
          {preparation ? <>
            {ready ? <TerasFieldStack spacing="normal">
              <TerasNoteField label="Reason for this change" value={reason} disabled={locked} onValueChange={value => { setReason(value); setReview(null); }} />
            </TerasFieldStack> : null}
            <TerasTechnicalDetails summary="Product information" items={[
                { label: "Product", value: selected?.name ?? productId },
                { label: "Current listing", value: publicationPostureLabels[preparation.current.posture] },
                { label: "Catalog version", value: String(preparation.current.version) },
                { label: preparation.source_available ? "Source repositories" : "Last request's source", value: preparation.owner_repos.join(", ") },
              ]} />
            {preparation.issues.length ? <TerasList frame="contained">{preparation.issues.map(issue => <TerasSignalItem key={issue.code}
              label="Product information needed" title={selected?.name ?? "Selected product"} detail={`${issue.message} ${preparation.source_available ? "Source repositories" : "Last request's source"}: ${preparation.owner_repos.join(", ")}.`} tone="warn" />)}</TerasList> : null}
            {expired || sourceChanged ? <TerasContentTray kicker="Load current information" description="The product information is no longer current. Load it again before reviewing a change." /> : null}
            <TerasActionRow><TerasActionButton emphasis="secondary" disabled={locked} onClick={() => selectProduct(productId)}>Load current information</TerasActionButton></TerasActionRow>
            {preparation.recent_requests.length ? <TerasContentTray kicker="Latest requests for this product"
              description="Up to 20 requests from the publication journal, including requests from earlier browser sessions.">
              <TerasList frame="contained">{preparation.recent_requests.map(row => <TerasSignalItem key={row.request_id}
                label={row.state === "applied" ? "Applied" : "Rejected"} title={publicationActionLabels[row.action]}
                detail={new Date(row.recorded_at).toLocaleString()} actionLabel="View result"
                ariaLabel={`View ${publicationActionLabels[row.action]} result from ${row.recorded_at}`}
                onSelect={() => void recover(row.request_id)} />)}</TerasList>
            </TerasContentTray> : null}
          </> : productId && !runtime.pending ? <TerasActionRow><TerasActionButton emphasis="secondary" onClick={() => selectProduct(productId)}>Load product information</TerasActionButton></TerasActionRow> : null}
        </>}
        {uncertain ? <TerasContentTray kicker="Check the original request" description="The outcome is not confirmed. Check the same request before starting another change.">
          <TerasActionButton disabled={runtime.pending} onClick={() => void recover()}>Check original request</TerasActionButton>
        </TerasContentTray> : null}
        {failure ? <TerasContentTray kicker="Publication needs attention" description={failure} /> : null}
      </TerasContentRegion>
      <TerasActionRow layout="split"><TerasActionButton disabled={!ready || locked || !reason.trim() || !preparation?.available_actions.includes(action)} onClick={beginReview}>Review catalog change</TerasActionButton></TerasActionRow>
    </TerasPanel>
    {review || result ? <TerasModalShell busy={runtime.pending} busyLabel="Contacting publication service…" width="standard" height="content" bodyLayout="scroll" surfaceId="owner-publication-review"
      title={result ? "Catalog result" : "Review catalog change"} kicker="Product publication"
      description={result ? "The recorded service result for this exact request." : "Check the product, current listing and proposed change before approving."}
      onClose={() => { if (!locked) { setReview(null); setResult(null); } }}
      footer={<TerasActionRow>
        <TerasActionButton emphasis="secondary" disabled={locked} onClick={() => { setReview(null); setResult(null); }}>{result ? "Back to Publication" : "Back to draft"}</TerasActionButton>
        {review && !result ? <TerasActionButton title={previewMode ? "Publishing is disabled in design preview" : undefined} disabled={!live || locked || !review.accepted || expired || sourceChanged} onClick={() => void submit()}>Confirm catalog change</TerasActionButton> : null}
        {uncertain ? <TerasActionButton emphasis="secondary" disabled={runtime.pending} onClick={() => void recover()}>Check original request</TerasActionButton> : null}
      </TerasActionRow>}>
      <TerasContentRegion gap="normal">
        {previewMode ? <TerasContentTray kicker="Design preview" description="Sample product information. Publishing is disabled; this review cannot change the catalog." /> : null}
        {result ? <OwnerPublicationResult result={result} /> : review ? <>
          <TerasPanel spacing="normal" frame="padded" fit="content" treatment="neutral"><TerasPanelHeader kicker="Catalog change" title={selected?.name ?? productId}
            description={publicationActionLabels[review.intent.action]} />
            <TerasMetadataList columns={2} items={[
              { label: "Current listing", value: publicationPostureLabels[review.intent.current_publication_posture] },
              { label: "After this change", value: publicationPostureLabels[review.intent.target_publication.posture] },
              { label: "Reason", value: review.intent.operator_reason },
            ]} />
          </TerasPanel>
          <TerasPanel frame="padded" fit="content" treatment="neutral">
            <TerasTechnicalDetails summary="Source and request details" items={[
              { label: "Request reference", value: review.intent.request_id },
              { label: "Source repository", value: review.intent.manifest_source.repo },
              { label: "Manifest path", value: review.intent.manifest_source.path },
              { label: "Source revision", value: review.intent.manifest_source.source_revision },
              { label: "Manifest revision", value: review.intent.manifest_source.manifest_revision },
              { label: "Manifest digest", value: review.intent.manifest_source.manifest_digest },
            ]} />
          </TerasPanel>
          <TerasChoiceGroup ariaLabel="Catalog change approval" frame="tray" label="Your decision" disabled={locked || expired || sourceChanged}
            selectedId={review.accepted ? "approved" : "review"}
            options={[{ id: "review", label: "Review required", tone: "warn" }, { id: "approved", label: "I approve this catalog change", tone: "ok" }]}
            onSelect={value => { const at = new Date().toISOString(); setReview(current => current ? { ...current, accepted: value === "approved", intent: { ...current.intent, decided_at: at, requested_at: at } } : null); }} />
        </> : null}
        {expired || sourceChanged ? <TerasContentTray kicker="Load current information" description="Return to the draft and load current product information before approving again." /> : null}
        {failure ? <TerasContentTray kicker={uncertain ? "Outcome not confirmed" : "Cannot continue"} description={failure} /> : null}
      </TerasContentRegion>
    </TerasModalShell> : null}
    {recoveryOpen ? <TerasModalShell width="medium" height="content" bodyLayout="scroll" surfaceId="owner-publication-recovery" title="Find an earlier request" kicker="Publication recovery"
      description="Select a product to see its latest requests. If you saved a request reference, you can also look it up here."
      onClose={() => setRecoveryOpen(false)} footer={<TerasActionRow>
        <TerasActionButton emphasis="secondary" onClick={() => setRecoveryOpen(false)}>Back</TerasActionButton>
        <TerasActionButton disabled={!live || runtime.pending || !requestReference.trim()} onClick={() => void recover()}>Read request</TerasActionButton>
      </TerasActionRow>}>
      <TerasTextField label="Request reference" value={requestReference} disabled={runtime.pending || uncertain !== null} onValueChange={setRequestReference} />
      {failure ? <TerasContentTray kicker="Request unavailable" description={failure} /> : null}
    </TerasModalShell> : null}
    <TerasDraftCloseGuardDialog open={replaceProduct !== null} title="Replace publication draft?" kicker="Unsaved publication"
      description="Loading product information clears the current reason and review. Nothing will be submitted."
      leaveLabel="Replace draft" onKeepEditing={() => setReplaceProduct(null)} onLeave={() => { const id = replaceProduct; setReplaceProduct(null); if (id) void loadInformation(id); }} />
  </>;
}
function message(error: unknown) { return error instanceof Error ? error.message : "Publication information is unavailable."; }
