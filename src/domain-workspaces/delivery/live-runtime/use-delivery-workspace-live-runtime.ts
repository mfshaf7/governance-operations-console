"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DeliveryReadModel } from "../read-model/delivery-read-model.ts";
import { assertDeliveryIntakeSnapshot, type DeliveryIntakeRecord } from "./delivery-history-live-contract.ts";
import { projectDeliveryIntakeHistory } from "./delivery-history-projection.ts";

type Evidence = { sources: DeliveryIntakeRecord[]; issues: Array<{target_ref:string;detail:string}>;
  inspected: Set<string>; revisions: string[]; complete: boolean; full: boolean; started: number };

export function useDeliveryWorkspaceLiveRuntime(enabled: boolean, includeHistoryEvidence = false) {
  const [model, setModel] = useState<DeliveryReadModel | null>(null), [error, setError] = useState<string | null>(null);
  const request = useRef<number | null>(null), evidenceRequest = useRef<number | null>(null), active = useRef(enabled), requested = useRef(includeHistoryEvidence);
  const inventory = useRef<DeliveryReadModel | null>(null), evidence = useRef<Evidence | null>(null), generation = useRef(0);
  const inventoryStale = useRef(false);
  active.current = enabled;requested.current = includeHistoryEvidence;

  const compose = useCallback(() => {
    if (!active.current || !inventory.current) return;
    let next = inventory.current;
    const proof = evidence.current;
    if (proof && Date.now() - proof.started <= 300000) {
      try {
        const expected=proof.full?next.packages:next.packages.filter(p=>!["done","retired"].includes(p.backend_status));
        if (proof.complete && (proof.inspected.size !== expected.length || expected.some(p => !proof.inspected.has(p.source_ref)))) {
          throw Error("Intake inventory changed during paging.");
        }
        next = projectDeliveryIntakeHistory(next, proof.sources, proof.issues);
        next = {...next,projection_state:{...next.projection_state,
          source_revision:`${next.projection_state.source_revision}:${proof.revisions.join(":")}`},
          evidence_coverage:{...next.evidence_coverage!,intake:{...next.evidence_coverage!.intake,complete:proof.complete&&proof.full,
            ...(!proof.full?{detail:"Operational package custody has its own current owner reads. Retained admissions are read independently when History is requested."}:
            !proof.complete?{state:"partial" as const,detail:"Loading original owner evidence across bounded pages. Visible rows are verified; global evidence totals remain pending."}:{})}}};
      } catch { evidence.current = null; }
    }
    if (inventoryStale.current) next={...next,projection_state:{...next.projection_state,status:"stale",detail:"Last verified global overview. Refresh failed; workflow actions require their own current owner proof."}};
    setModel(next);
  }, []);

  const refreshEvidence = useCallback(async function readEvidence() {
    if (!active.current || (!requested.current&&!inventory.current) || evidenceRequest.current === generation.current) return;
    const ticket = generation.current;evidenceRequest.current=ticket;
    const full=requested.current;
    const operational=inventory.current?.packages.filter(p=>!["done","retired"].includes(p.backend_status))??[];
    const next: Evidence = {sources:[],issues:[],inspected:new Set(),revisions:[],complete:false,full,started:Date.now()};
    const identities = new Set<string>();
    try {
      if(!full&&operational.length===0){next.complete=true;evidence.current=next;compose();return;}
      for (let page = 1; page <= (full?410:operational.length); page++) {
        if (!active.current || generation.current !== ticket || requested.current!==full || Date.now()-next.started > 240000) throw Error("Evidence read is no longer current.");
        const query=full?`page=${page}`:`delivery_id=${encodeURIComponent(operational[page-1].delivery_package_id)}`;
        const response = await fetch(`/api/delivery/intake?${query}`,{cache:"no-store"}),body = await response.json();
        if ([401,403].includes(response.status)) {
          if(active.current&&generation.current===ticket){inventory.current=null;evidence.current=null;setModel(null);setError("Delivery owner denied access. Refresh the current authorized session.");}
          throw Error("Delivery owner denied access.");
        }
        if (!response.ok || body.mode !== "live") throw Error("Intake owner unavailable.");
        const value = assertDeliveryIntakeSnapshot(body.projection);
        if (value.page?.number !== (full?page:1) || !value.inspected_target_refs || Date.now()-Date.parse(value.observed_at)>300000 || Date.parse(value.observed_at)>Date.now()+30000) throw Error("Invalid Intake page.");
        for (const ref of value.inspected_target_refs) { if(next.inspected.has(ref))throw Error("Repeated owner target.");next.inspected.add(ref); }
        for (const source of value.sources) {if(identities.has(source.source_id))throw Error("Conflicting owner source.");identities.add(source.source_id);next.sources.push(source);}
        next.issues.push(...value.issues);next.revisions.push(value.source_revision);next.complete=full?!value.page.has_more:page===operational.length;
        if (!active.current || generation.current !== ticket) return;
        evidence.current=next;compose();
        if(next.complete)return;
      }
      throw Error("Evidence exceeds the bounded overview scope.");
    } catch { if(active.current && generation.current===ticket){evidence.current=null;compose();} }
    finally { if(evidenceRequest.current===ticket)evidenceRequest.current=null;if(active.current&&generation.current===ticket&&requested.current!==full)void readEvidence(); }
  }, [compose]);

  const refresh = useCallback(async () => {
    if (!active.current || request.current === generation.current) return;
    const ticket=generation.current;request.current=ticket;
    if(requested.current)void refreshEvidence();
    try {
      const response=await fetch("/api/delivery/workspace",{cache:"no-store"});
      if(response.status===401||response.status===403){if(active.current&&generation.current===ticket){inventory.current=null;evidence.current=null;setModel(null);}throw Error("Delivery owner denied access.");}
      const value=await response.json(),next=value?.projection;
      if(!response.ok||value.mode!=="live"||next?.schema_version!==1||next.source_truth!=="OpenProject-backed OOS"||!Array.isArray(next.packages)||!Array.isArray(next.art_tree?.roots)||
         !Number.isFinite(Date.parse(next.generated_at))||Date.now()-Date.parse(next.generated_at)>300000||Date.parse(next.generated_at)>Date.now()+30000)throw Error("Canonical Delivery records unavailable.");
      if(active.current&&generation.current===ticket){inventoryStale.current=false;inventory.current=next;compose();setError(null);void refreshEvidence();}
    }catch{
      if(active.current&&generation.current===ticket){
        inventoryStale.current=true;
        setModel(current=>current?{...current,projection_state:{...current.projection_state,status:"stale",detail:"Last verified global overview. Refresh failed; workflow actions require their own current owner proof."}}:null);
        setError("Canonical Delivery overview is unavailable. Last verified rows are shown with stale status; no authority is inferred from them.");
      }
    }finally{if(request.current===ticket)request.current=null;}
  },[compose,refreshEvidence]);

  useEffect(()=>{
    active.current=enabled;generation.current++;
    if(!enabled){inventory.current=null;evidence.current=null;inventoryStale.current=false;setModel(null);setError(null);return;}
    void refresh();const visible=()=>{if(document.visibilityState==="visible")void refresh();};const timer=setInterval(visible,30000);
    document.addEventListener("visibilitychange",visible);
    return()=>{active.current=false;generation.current++;clearInterval(timer);document.removeEventListener("visibilitychange",visible);};
  },[enabled,refresh]);
  useEffect(()=>{if(enabled&&includeHistoryEvidence)void refreshEvidence();},[enabled,includeHistoryEvidence,refreshEvidence]);
  return {error,model,refresh};
}
