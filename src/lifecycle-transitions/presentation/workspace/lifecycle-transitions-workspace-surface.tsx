"use client";
import {useRegisterPageSize} from '../../../console-integration/registers/use-register-page-size.ts';

import { useEffect, useMemo, useState } from "react";
import type { LifecycleTransitionRuntimePosture } from "../../live-runtime/lifecycle-transition-live-types.ts";

import {
  TerasEmptyState,
  TerasActionButton,
  TerasLoadingState,
  TerasRegisterPagination,
  TerasFilterBar,
  TerasRecordControlLayout,
  TerasRegisterPanel,
} from "@/teras";

import type {
  ConsoleSurfaceEntryIntent,
} from "../../../console-architecture";
import type {
  OperationWorkbenchPathLabel,
} from "../../../operation-workbench/operation-workbench-domain-registry";
import type {
  LifecycleTransitionState,
} from "../../model/lifecycle-transition-types";
import type {
  LifecycleTransitionOverviewItem,
  LifecycleTransitionRouteOverview,
} from "../lifecycle-transition-overview-view-model";
import { LifecycleTransitionRegister } from "./lifecycle-transition-register";
import { LifecycleTransitionSelected } from "./lifecycle-transition-selected";
import {
  lifecycleTransitionStateOptions,
} from "./lifecycle-transitions-workspace-view-model";

import {useLifecycleTransitionJournalPage} from "../../live-runtime/use-lifecycle-transition-journal-page.ts";

type LifecycleTransitionStateFilter = LifecycleTransitionState | "all";

export function LifecycleTransitionsWorkspaceSurface({
  focusTransitionId = null,
  onOpenWorkbenchSurface,
  route,
  runtimePosture,
}: {
  focusTransitionId?: string | null;
  onOpenWorkbenchSurface: (
    surfaceLabel: OperationWorkbenchPathLabel,
    focusIntent?: ConsoleSurfaceEntryIntent | null,
  ) => void;
  route: LifecycleTransitionRouteOverview;
  runtimePosture: LifecycleTransitionRuntimePosture | null;
}) {
  const {pageSize}=useRegisterPageSize('Lifecycle transition register');
  const [recordSource,setRecordSource]=useState("overview");
  const [localPosition,setLocalPosition]=useState({key:"",offset:0});
  const [query, setQuery] = useState("");
  const [selectedTransitionId, setSelectedTransitionId] = useState<string | null>(
    route.items[0]?.transitionId ?? null,
  );
  const [state, setState] = useState<LifecycleTransitionStateFilter>("all");
  const live=runtimePosture?.mode==="live",journalMode=live&&recordSource==="journal";
  const journal=useLifecycleTransitionJournalPage({routeId:route.routeId,state,query},journalMode,route.items.some(item=>item.transitionId===focusTransitionId)?null:focusTransitionId);
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return route.items.filter((item) => {
      const matchesState = state === "all" || item.state === state;
      const matchesQuery =
        !normalizedQuery ||
        [
          item.sourceRecordId,
          item.sourceTitle ?? "",
          item.transitionId,
          item.nextAction?.ownerLabel ?? "",
          item.targetRecordRef ?? item.targetHomeRef,
        ].some((value) => value.toLowerCase().includes(normalizedQuery));

      return matchesState && matchesQuery;
    });
  }, [query, route.items, state]);
  const localKey=JSON.stringify([route.routeId,query,state,pageSize]);
  if(localPosition.key!==localKey)setLocalPosition({key:localKey,offset:0});
  const offset=localPosition.key===localKey?localPosition.offset:0;
  const visibleItems=journalMode?journal.items:filteredItems.slice(offset,offset+pageSize);
  const selectedTransition =
    (journalMode&&journal.original?.transitionId===selectedTransitionId?journal.original:null) ?? visibleItems.find(
      (item) => item.transitionId === selectedTransitionId,
    ) ??
    visibleItems[0] ??
    null;

  useEffect(() => {
    if (
      focusTransitionId &&
      route.items.some(
        (item) => item.transitionId === focusTransitionId,
      )
    ) {
      setQuery("");
      setState("all");
      setSelectedTransitionId(focusTransitionId);
      setRecordSource("overview");
      const index=route.items.findIndex(item=>item.transitionId===focusTransitionId);
      setLocalPosition({key:JSON.stringify([route.routeId,"","all",pageSize]),offset:Math.floor(index/pageSize)*pageSize});
    }
  }, [focusTransitionId, route.items]);

  useEffect(()=>{
    if(journalMode&&focusTransitionId&&!route.items.some(item=>item.transitionId===focusTransitionId))setSelectedTransitionId(focusTransitionId);
  },[journalMode,focusTransitionId,route.items]);

  function selectTransition(item: LifecycleTransitionOverviewItem) {
    setSelectedTransitionId(item.transitionId);
  }

  return (
    <TerasRecordControlLayout
      composition="fullscreen-register"
      data-lifecycle-transitions-workspace-surface="true"
      mode="register-selected"
      register={
        <TerasRegisterPanel
          description={`${journalMode?"Recorded workflow decisions and their original evidence. Search includes older journal pages.":route.description}${runtimePosture?.mode === "live" && (runtimePosture.status !== "current" || runtimePosture.truncated) ? " Some source reads are unavailable or incomplete." : ""}`}
          filterBar={
            <TerasFilterBar
              filters={[
                {label:"Filter handoff record source",value:recordSource,onValueChange:setRecordSource,options:live?[{label:"Workspace overview",value:"overview"},{label:"Workflow journal",value:"journal"}]:[{label:"Workspace overview",value:"overview"}]},
                {label:"Filter transition state",onValueChange:(value:string)=>setState(value as LifecycleTransitionStateFilter),options:lifecycleTransitionStateOptions(route.items,journalMode),value:state},
              ]}
              search={{
                ariaLabel: "Search lifecycle transitions",
                onValueChange: setQuery,
                placeholder: "Search source, transition, responsible component, or target...",
                value: query,
              }}
            />
          }
          footer={<TerasRegisterPagination label="Lifecycle transition register" offset={journalMode?journal.offset:offset} count={visibleItems.length} page={journalMode?journal.page:Math.floor(offset/pageSize)+1} total={journalMode?null:filteredItems.length} pending={journalMode&&journal.loading} unavailable={journalMode&&Boolean(journal.error)} hasPrevious={journalMode?journal.hasPrevious:offset>0} hasNext={journalMode?Boolean(journal.nextCursor):offset+visibleItems.length<filteredItems.length} onPrevious={journalMode?journal.previous:()=>setLocalPosition({key:localKey,offset:Math.max(0,offset-pageSize)})} onNext={journalMode?journal.next:()=>setLocalPosition({key:localKey,offset:offset+visibleItems.length})} onReset={journalMode&&journal.error?journal.first:undefined} nextLabel={visibleItems.length===0&&journal.nextCursor?"Continue search":undefined}/>}
          kicker="Transition Register"
          statusLabel={journalMode?journal.loading?"Loading journal":journal.error?"Journal unavailable":`${visibleItems.length} on this page`:`${filteredItems.length}/${route.totalCount} in overview`}
          statusTone={route.tone}
          title={`${route.sourceLabel} to ${route.targetLabel}`}
        >
          {journalMode&&journal.error?<TerasEmptyState fill>{journal.error}<TerasActionButton emphasis="secondary" onClick={()=>void journal.refresh()}>Retry journal</TerasActionButton></TerasEmptyState>:journalMode&&journal.loading?<TerasLoadingState fill label="Loading handoff journal…"/>:visibleItems.length > 0 ? (
            <LifecycleTransitionRegister
              items={visibleItems}
              onSelect={selectTransition}
              selectedTransitionId={selectedTransition?.transitionId ?? null}
            />
          ) : (
            <TerasEmptyState fill>
              {journalMode ? journal.nextCursor?"No match in this search window. Continue searching older journal records.":"No journal record matches this search and filter." : runtimePosture?.mode === "live" && runtimePosture.status !== "current"
                ? "Handoff records are unavailable. Waiting for a current source read."
                : runtimePosture?.truncated && route.totalCount === 0
                  ? "No handoff is available from the sources currently read. Coverage is incomplete."
                  : "No transition matches the current search and filter."}
            </TerasEmptyState>
          )}
        </TerasRegisterPanel>
      }
      selected={
        <LifecycleTransitionSelected
          item={selectedTransition}
          runtimePosture={runtimePosture}
          onOpenWorkbenchSurface={onOpenWorkbenchSurface}
        />
      }
    />
  );
}
