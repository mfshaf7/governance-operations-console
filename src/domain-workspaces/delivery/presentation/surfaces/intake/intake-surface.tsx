"use client";
import { useWorkspaceViewState } from "../../../../../console-integration/registers/workspace-view-state.ts";
import {useRegisterPageSize} from '../../../../../console-integration/registers/use-register-page-size.ts';

import { DeliveryHistoryDialog } from "../../workflows/shared/history/delivery-history-dialog.tsx";
import { useEffect, useRef, useState } from "react";

import type {
  DeliveryIntakeSource,
  DeliveryIntakeSourceStatus,
  DeliveryReadModel,
} from "../../../read-model/index.ts";
import { getDeliveryIntakeSources } from "../../../read-model/index.ts";

import {
  TerasEmptyState,
  TerasLoadingState,
  TerasContentTray,
  TerasTechnicalDetails,
  TerasRegisterPagination,
  TerasFilterBar,
  TerasRecordControlLayout,
  TerasRegisterPanel,
  TerasActionButton,
} from "@/teras";
import {
  intakeOwnerFilterOptions,
  intakeEvidenceIssuesForView,
  intakeStatusFilterOptions,
} from "./intake-view-model.ts";
import {
  DeliveryIntakeConsumeModal,
  DeliveryIntakeConsumedSummaryModal,
} from "./intake-modals.tsx";
import { DeliveryIntakeRegisterTable } from "./intake-register-table.tsx";
import { DeliveryIntakeSelectedSource } from "./intake-selected-source.tsx";
import type { DeliverySurfaceConfig } from "../../workspace/workspace-types.ts";

import {useDeliveryIntakeRegisterPage} from "../../../live-runtime/use-delivery-intake-register-page.ts";

export function DeliveryIntakeSurface({
  focusSourceId,
  focusToken,
  model,
  onCloseFocusedSource,
  onConsumeSource,
  surface,
}: {
  focusSourceId?: string | null;
  focusToken?: number | null;
  model: DeliveryReadModel;
  onCloseFocusedSource?: () => void;
  onConsumeSource: (source: DeliveryIntakeSource) => void;
  surface: DeliverySurfaceConfig;
}) {
  const {pageSize}=useRegisterPageSize('Delivery Intake register');
  const [selectedSourceId, setSelectedSourceId] = useWorkspaceViewState<string | null>('delivery-intake:selectedSourceId', null);
  const [nativeHistoryId,setNativeHistoryId] = useState<string|null>(null);
  const [consumeSourceId, setConsumeSourceId] = useState<string | null>(null);
  const [consumedSummarySourceId, setConsumedSummarySourceId] = useState<
    string | null
  >(null);
  const [
    returnToFocusedSourceAfterConsume,
    setReturnToFocusedSourceAfterConsume,
  ] = useState(false);
  const [
    returnToFocusedSourceAfterConsumedSummary,
    setReturnToFocusedSourceAfterConsumedSummary,
  ] = useState(false);
  const handledFocusTokenRef = useRef<number | null>(null);
  const [ownerFilter, setOwnerFilter] = useWorkspaceViewState('delivery-intake:ownerFilter', "all");
  const [search, setSearch] = useWorkspaceViewState('delivery-intake:search', "");
  const [statusFilter, setStatusFilter] = useWorkspaceViewState<
    DeliveryIntakeSourceStatus | "all"
  >('delivery-intake:statusFilter', "all");
  const nativeHistory=model.source_truth==="OpenProject-backed OOS"&&model.history_scope==="history";
  const page=useDeliveryIntakeRegisterPage({query:search,owner:ownerFilter,status:statusFilter},nativeHistory);
  const [localPosition,setLocalPosition]=useState({key:"",offset:0});
  const localKey=JSON.stringify([search,ownerFilter,statusFilter,pageSize]);
  if(localPosition.key!==localKey)setLocalPosition({key:localKey,offset:0});
  const offset=localPosition.key===localKey?localPosition.offset:0;
  const sources = nativeHistory?page.sources:getDeliveryIntakeSources(model);
  const ownerOptions = [...new Set(["all",ownerFilter,...intakeOwnerFilterOptions([...getDeliveryIntakeSources(model),...sources]),...model.packages.map(row=>row.source_custody?.owner).filter((owner):owner is string=>Boolean(owner))])];
  const normalizedSearch = search.trim().toLowerCase();
  const filteredSources = sources.filter((source) => {
    const matchesOwner = ownerFilter === "all" || source.owner === ownerFilter;
    const matchesStatus =
      statusFilter === "all" || source.intake_status === statusFilter;
    const matchesSearch = normalizedSearch
      ? [
          source.accepted_source_id,
          source.delivery_package_id ?? "",
          source.gate_summary,
          source.owner,
          source.source_ref,
          source.status_label,
          source.summary,
          source.title,
          source.work_design_session_ref ?? "",
          ...source.evidence_refs,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch)
      : true;

    return matchesOwner && matchesStatus && matchesSearch;
  });
  const visibleSources=nativeHistory?filteredSources:filteredSources.slice(offset,offset+pageSize);
  const evidenceIssues = nativeHistory?page.issues:intakeEvidenceIssuesForView(model, search, ownerFilter, statusFilter);
  const selectedSource =
    visibleSources.find((source) => source.accepted_source_id === selectedSourceId) ??
    visibleSources[0] ??
    null;
  const consumeSource =
    sources.find((source) => source.accepted_source_id === consumeSourceId) ??
    null;
  const consumedSummarySource =
    sources.find(
      (source) => source.accepted_source_id === consumedSummarySourceId,
    ) ?? null;

  useEffect(() => {
    if (
      !focusSourceId ||
      !focusToken ||
      handledFocusTokenRef.current === focusToken
    ) {
      return;
    }

    const focusedSource = sources.find(
      (source) => source.accepted_source_id === focusSourceId,
    );

    if (!focusedSource) {
      return;
    }

    handledFocusTokenRef.current = focusToken;
    setOwnerFilter("all");
    setSearch("");
    setStatusFilter("all");
    setSelectedSourceId(focusedSource.accepted_source_id);

    if (focusedSource.intake_status === "consumed") {
      if(model.source_truth === "OpenProject-backed OOS") {setNativeHistoryId(focusedSource.delivery_package_id);return;}
      setConsumeSourceId(null);
      setReturnToFocusedSourceAfterConsume(false);
      setReturnToFocusedSourceAfterConsumedSummary(true);
      setConsumedSummarySourceId(focusedSource.accepted_source_id);
      return;
    }

    setConsumedSummarySourceId(null);
    setReturnToFocusedSourceAfterConsumedSummary(false);
    setReturnToFocusedSourceAfterConsume(true);
    if (model.history_scope !== "history") setConsumeSourceId(focusedSource.accepted_source_id);
  }, [focusSourceId, focusToken, sources]);

  function openSourceAction(source: DeliveryIntakeSource) {
    setSelectedSourceId(source.accepted_source_id);
    setReturnToFocusedSourceAfterConsume(false);
    setReturnToFocusedSourceAfterConsumedSummary(false);

    if (source.intake_status === "consumed") {
      if(model.source_truth === "OpenProject-backed OOS") {setNativeHistoryId(source.delivery_package_id);return;}
      setConsumedSummarySourceId(source.accepted_source_id);
      return;
    }

    if (model.history_scope !== "history") setConsumeSourceId(source.accepted_source_id);
  }

  function closeConsumeModal() {
    setConsumeSourceId(null);
    if (returnToFocusedSourceAfterConsume) {
      onCloseFocusedSource?.();
    }
    setReturnToFocusedSourceAfterConsume(false);
  }

  function closeConsumedSummaryModal() {
    setConsumedSummarySourceId(null);
    if (returnToFocusedSourceAfterConsumedSummary) {
      onCloseFocusedSource?.();
    }
    setReturnToFocusedSourceAfterConsumedSummary(false);
  }

  return (
    <>
      <DeliveryHistoryDialog deliveryId={nativeHistoryId} onClose={()=>setNativeHistoryId(null)} focus="intake"/>
      <TerasRecordControlLayout
        composition="fullscreen-register"
        data-delivery-surface-register="intake"
        mode="register-selected"
        register={
          <TerasRegisterPanel
            description={model.history_scope === "history" ? "Sources already transferred to Delivery. Open history to review the original records." : "Review incoming sources. Transferred sources are in History."}
            filterBar={
              <TerasFilterBar
                search={{
                  ariaLabel: "Search intake accepted sources",
                  onValueChange: setSearch,
                  placeholder: "Search accepted source, workspace, evidence...",
                  value: search,
                }}
                filters={[
                  {
                    label: "Filter source workspace",
                    onValueChange: setOwnerFilter,
                    options: ownerOptions.map((owner) => ({
                      label: owner === "all" ? "All source workspaces" : owner,
                      value: owner,
                    })),
                    value: ownerFilter,
                  },
                  {
                    label: "Filter intake status",
                    onValueChange: setStatusFilter,
                    options: intakeStatusFilterOptions,
                    value: statusFilter,
                  },
                ]}
              />
            }
            footer={<TerasRegisterPagination label="Delivery Intake register" offset={nativeHistory?page.offset:offset} count={visibleSources.length} page={nativeHistory?page.page:Math.floor(offset/pageSize)+1} total={nativeHistory?null:filteredSources.length} pending={nativeHistory&&page.loading} unavailable={nativeHistory&&Boolean(page.error)} hasPrevious={nativeHistory?page.hasPrevious:offset>0} hasNext={nativeHistory?Boolean(page.nextCursor):offset+visibleSources.length<filteredSources.length} onPrevious={nativeHistory?page.previous:()=>setLocalPosition({key:localKey,offset:Math.max(0,offset-pageSize)})} onNext={nativeHistory?page.next:()=>setLocalPosition({key:localKey,offset:offset+visibleSources.length})} onReset={nativeHistory&&page.error?page.first:undefined} nextLabel={nativeHistory&&visibleSources.length===0&&page.nextCursor?"Continue search":undefined}/>}
            kicker={surface.title}
            statusLabel={nativeHistory?page.loading?"Loading Intake history":page.error?"Intake unavailable":`${visibleSources.length} on this page`:model.history_scope==="history"&&model.evidence_coverage?.intake.complete===false?"Loading original evidence":`${filteredSources.length}/${sources.length} shown`}
            statusTone="warn"
            title="Accepted Source Register"
          >
            {evidenceIssues.length ? <TerasContentTray kicker="Some source history is unavailable"
              description={`Transfer history could not be verified for ${evidenceIssues.length} ${evidenceIssues.length === 1 ? "item" : "items"}. Open an item’s history to investigate.`}>
              <TerasTechnicalDetails summary="Inspect affected items" items={evidenceIssues.map(issue=>({
                label:model.packages.find(item=>item.source_ref===issue.target_ref)?.display_name ?? `Delivery item #${issue.target_ref.split("/").at(-1)}`,
                value:issue.target_ref,detail:issue.detail,
                actions:<TerasActionButton emphasis="secondary" onClick={()=>setNativeHistoryId(`delivery-${issue.target_ref.split("/").at(-1)}`)}>Open item history</TerasActionButton>,
              }))}/>
            </TerasContentTray> : null}
            {nativeHistory&&page.loading?<TerasLoadingState fill label="Loading source history…"/>:nativeHistory&&page.error?<TerasEmptyState fill><p role="alert">{page.error}</p><TerasActionButton emphasis="secondary" onClick={()=>void page.refresh()}>Retry Intake history</TerasActionButton></TerasEmptyState>:visibleSources.length > 0 ? (
              <DeliveryIntakeRegisterTable
                onAction={openSourceAction}
                onSelect={(source) =>
                  setSelectedSourceId(source.accepted_source_id)
                }
                selectedSourceId={selectedSource?.accepted_source_id ?? null}
                sources={visibleSources}
                rowOffset={nativeHistory?page.offset:offset}
              />
            ) : (
              <TerasEmptyState fill>
                {nativeHistory ? page.nextCursor ? "No matches yet. Continue searching older sources." : "No sources match these filters." : model.history_scope === "current" ? "No incoming sources. Transferred sources are in History." : model.evidence_coverage?.intake.state === "unavailable" ? "Source history could not be loaded. Try again." : model.evidence_coverage?.intake.complete === false ? "Loading source history…" : "No sources match these filters."}
              </TerasEmptyState>
            )}
          </TerasRegisterPanel>
        }
        selected={
          <DeliveryIntakeSelectedSource
            onOpenAction={openSourceAction}
            source={selectedSource}
          />
        }
      />

      {consumeSource && model.history_scope !== "history" ? (
        <DeliveryIntakeConsumeModal
          onClose={closeConsumeModal}
          onConsume={() => {
            onConsumeSource(consumeSource);
            setConsumeSourceId(null);
            setReturnToFocusedSourceAfterConsume(false);
          }}
          source={consumeSource}
        />
      ) : null}

      {consumedSummarySource ? (
        <DeliveryIntakeConsumedSummaryModal
          onClose={closeConsumedSummaryModal}
          source={consumedSummarySource}
        />
      ) : null}
    </>
  );
}
