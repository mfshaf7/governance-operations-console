"use client";
import {readRegisterWindow} from '../../registers/read-register-window.ts';
import {useRegisterPageSize} from '../../registers/use-register-page-size.ts';

import { useCallback, useEffect, useRef, useState } from "react";

import {
  assertWorkspaceIntakePreparation,
  assertWorkspaceIntakeResult,
  assertWorkspaceIntakeRequestPage,
} from "../workspace-intake-live-contract.ts";
import type {
  WorkspaceIntakeCandidate,
  WorkspaceIntakeCustodyPreparation,
  WorkspaceIntakeDecision,
  WorkspaceIntakePreparation,
  WorkspaceIntakeResult,
  WorkspaceIntakeRequestPage,
} from "../workspace-intake-live-types.ts";

export class WorkspaceIntakeClientError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, code: string, retryable = false) {
    super(message);
    this.code = code;
    this.retryable = retryable;
  }
}

export function useWorkspaceIntakeLiveRuntime(registerKey="Workspace onboarding requests") {
  const {pageSize}=useRegisterPageSize(registerKey);
  const [preparation, setPreparation] =
    useState<WorkspaceIntakePreparation | null>(null);
  const [result, setResult] = useState<WorkspaceIntakeResult | null>(null);
  const [error, setError] = useState<WorkspaceIntakeClientError | null>(null);
  const [pending, setPending] = useState(false);
  const [requestPage, setRequestPage] = useState<WorkspaceIntakeRequestPage | null>(null);

  type RequestPosition = {cursor:string|null;offset:number};
  type RequestBinding = {kind:"repo"|"product"|"component";name:string;custody:string|null};
  const [requestHistory,setRequestHistory]=useState<{binding:RequestBinding;position:RequestPosition;previous:RequestPosition[];count:number}|null>(null);
  const requestListSequence=useRef(0),requestRead=useRef<AbortController|null>(null);
  useEffect(()=>()=>{requestListSequence.current++;requestRead.current?.abort();},[]);
  function rememberRequestPage(binding:RequestBinding,cursor:string|null,count:number){
    setRequestHistory(previous=>{
      if(!previous||JSON.stringify(previous.binding)!==JSON.stringify(binding)||cursor===null)return {binding,position:{cursor,offset:0},previous:[],count};
      if(previous.position.cursor===cursor)return {...previous,count};
      const index=previous.previous.findIndex(item=>item.cursor===cursor);
      return index>=0?{binding,position:previous.previous[index],previous:previous.previous.slice(0,index),count}:
        {binding,position:{cursor,offset:previous.position.offset+previous.count},previous:[...previous.previous,previous.position],count};
    });
  }
  const list = useCallback(async (targetName: string, custodyRequestId: string, cursor: string | null = null, background = false) => {
    const sequence=++requestListSequence.current;requestRead.current?.abort();const controller=new AbortController();requestRead.current=controller;const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]);if (!background) setRequestPage(null);
    return run(async () => {
      let metadata:WorkspaceIntakeRequestPage|null=null;
      const window=await readRegisterWindow({cursor,pageSize,signal,scope:JSON.stringify([registerKey,"repo",targetName,custodyRequestId]),identity:(row:WorkspaceIntakeRequestPage["records"][number])=>row.request_id,readPage:async nativeCursor=>{
      const query = new URLSearchParams({ target_name: targetName, custody_request_id: custodyRequestId });
      if (nativeCursor !== null) query.set("cursor", nativeCursor);
      const body = await jsonRequest(`/api/workspace-intake/requests?${query}`, { method: "GET", cache: "no-store",signal });
      const page = assertWorkspaceIntakeRequestPage(body, targetName, custodyRequestId);
        if(metadata&&(metadata.revision!==page.revision||metadata.pending_request_count!==page.pending_request_count))throw Error("Onboarding history changed. Refresh the first page.");metadata=page;
        return {rows:page.records,nextCursor:page.next_cursor};
      }});
      const page={...metadata!,records:window.rows,next_cursor:window.nextCursor};
      if(sequence===requestListSequence.current){setRequestPage(page);rememberRequestPage({kind:"repo",name:targetName,custody:custodyRequestId},cursor,page.records.length);}
      return page;
    },()=>sequence===requestListSequence.current,background).catch(error=>{if(sequence===requestListSequence.current)setRequestPage(null);throw error;});
  }, [pageSize,registerKey]);

  const listDirect = useCallback(async (kind: "product" | "component", targetName: string, cursor: string | null = null, background = false) => {
    const sequence=++requestListSequence.current;requestRead.current?.abort();const controller=new AbortController();requestRead.current=controller;const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]);if (!background) setRequestPage(null);
    return run(async () => {
      let metadata:WorkspaceIntakeRequestPage|null=null;
      const window=await readRegisterWindow({cursor,pageSize,signal,scope:JSON.stringify([registerKey,kind,targetName,null]),identity:(row:WorkspaceIntakeRequestPage["records"][number])=>row.request_id,readPage:async nativeCursor=>{
      const query = new URLSearchParams({ target_kind: kind, target_name: targetName, source_class: "direct" });
      if (nativeCursor !== null) query.set("cursor", nativeCursor);
      const body = await jsonRequest(`/api/workspace-intake/requests?${query}`, { method: "GET", cache: "no-store",signal });
      const page = assertWorkspaceIntakeRequestPage(body, targetName, null, kind);
        if(metadata&&(metadata.revision!==page.revision||metadata.pending_request_count!==page.pending_request_count))throw Error("Onboarding history changed. Refresh the first page.");metadata=page;
        return {rows:page.records,nextCursor:page.next_cursor};
      }});
      const page={...metadata!,records:window.rows,next_cursor:window.nextCursor};
      if(sequence===requestListSequence.current){setRequestPage(page);rememberRequestPage({kind,name:targetName,custody:null},cursor,page.records.length);}
      return page;
    },()=>sequence===requestListSequence.current,background).catch(error=>{if(sequence===requestListSequence.current)setRequestPage(null);throw error;});
  }, [pageSize,registerKey]);

  const prepare = useCallback(async (candidate: Pick<WorkspaceIntakeCandidate, "target">, custody?: WorkspaceIntakeCustodyPreparation) => {
    setPreparation(null);
    return run(async () => {
      const body = await jsonRequest("/api/workspace-intake/preparations", {
        body: JSON.stringify({ target: candidate.target, ...(custody ? { repository_custody: custody } : {}) }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const next = assertWorkspaceIntakePreparation(body);
      setPreparation(next);
      setResult(null);
      return next;
    });
  }, []);

  const submit = useCallback(
    async ({
      candidate,
      decision,
      requestId,
    }: {
      candidate: WorkspaceIntakeCandidate;
      decision: WorkspaceIntakeDecision;
      requestId: string;
    }) => {
      if (!preparation) {
        throw new WorkspaceIntakeClientError(
          "Review current Workspace Intake authority before submission.",
          "workspace_intake_preparation_required",
        );
      }
      return run(async () => {
        const body = await jsonRequest("/api/workspace-intake/requests", {
          body: JSON.stringify({
            candidate,
            decision,
            request_id: requestId,
            reviewed_preparation: preparation,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const next = assertWorkspaceIntakeResult(body, requestId);
        setResult(next);
        return next;
      });
    },
    [preparation],
  );

  const read = useCallback(async (requestId: string) => {
    return runResult(requestId, "GET");
  }, []);

  const continueRequest = useCallback(async (requestId: string) => {
    return runResult(requestId, "POST", "continue");
  }, []);

  const cancel = useCallback(async (requestId: string) => {
    return runResult(requestId, "POST", "cancel");
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  async function run<T>(operation: () => Promise<T>,isCurrent=()=>true,background=false) {
    if(!background)setPending(true);
    setError(null);
    try {
      return await operation();
    } catch (caught) {
      const failure = normalizeError(caught);
      if(isCurrent())setError(failure);
      throw failure;
    } finally {
      if(isCurrent()&&!background)setPending(false);
    }
  }

  async function runResult(
    requestId: string,
    method: "GET" | "POST",
    action?: "cancel" | "continue",
  ) {
    return run(async () => {
      const suffix = action ? `/${action}` : "";
      const body = await jsonRequest(
        `/api/workspace-intake/requests/${encodeURIComponent(requestId)}${suffix}`,
        method === "GET"
          ? { cache: "no-store", method }
          : {
              body: "{}",
              headers: { "Content-Type": "application/json" },
              method,
            },
      );
      const next = assertWorkspaceIntakeResult(body, requestId);
      setResult(next);
      return next;
    });
  }

  const refreshRequestPage = useCallback((background=false) => {
    if(!requestHistory||pending)return Promise.resolve();
    const {binding,position}=requestHistory;
    return binding.kind==="repo" ? list(binding.name,binding.custody!,position.cursor,background)
      : listDirect(binding.kind,binding.name,position.cursor,background);
  },[requestHistory,pending,list,listDirect]);
  useEffect(()=>{if(requestHistory)void requestPageAt(null).catch(()=>undefined);},[pageSize]);
  function requestPageAt(cursor:string|null){
    if(!requestHistory||pending)return Promise.resolve();const binding=requestHistory.binding;
    return binding.kind==="repo"?list(binding.name,binding.custody!,cursor):listDirect(binding.kind,binding.name,cursor);
  }
  return {
    list,
    listDirect,
    refreshRequestPage,
    requestPage,
    requestPageOffset:requestHistory?.position.offset ?? 0,
    requestPageNumber:(requestHistory?.previous.length ?? 0)+1,
    hasPreviousRequestPage:Boolean(requestHistory?.previous.length),
    previousRequestPage:()=>requestPageAt(requestHistory?.previous.at(-1)?.cursor ?? null),
    nextRequestPage:()=>requestPage?.next_cursor?requestPageAt(requestPage.next_cursor):Promise.resolve(),
    cancel,
    continueRequest,
    error,
    pending,
    preparation,
    prepare,
    read,
    reset,
    result,
    submit,
  };
}

async function jsonRequest(path: string, init: RequestInit) {
  try {
    const response = await fetch(path, {...init, signal: init.signal ? AbortSignal.any([init.signal,AbortSignal.timeout(init.method === "GET" ? 15_000 : 135_000)]) : AbortSignal.timeout(init.method === "GET" ? 15_000 : 135_000)});
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) throw clientError(body);
    return body;
  } catch (error) {
    if (error instanceof WorkspaceIntakeClientError) throw error;
    throw new WorkspaceIntakeClientError(init.method === "GET" || path.endsWith("/preparations")
      ? "The service did not respond. Your draft is kept; retry loading this section."
      : "The response was interrupted. The service may still be working. Check the original request before submitting again.", "workspace_intake_transport_interrupted", true);
  }
}

function clientError(value: unknown) {
  if (isRecord(value)) {
    return new WorkspaceIntakeClientError(
      typeof value.error === "string"
        ? value.error
        : "Workspace Intake request failed.",
      typeof value.code === "string"
        ? value.code
        : "workspace_intake_request_failed",
      value.retryable === true,
    );
  }
  return new WorkspaceIntakeClientError(
    "Workspace Intake request failed.",
    "workspace_intake_request_failed",
  );
}

function normalizeError(error: unknown) {
  return error instanceof WorkspaceIntakeClientError
    ? error
    : new WorkspaceIntakeClientError(
        error instanceof Error ? error.message : "Workspace Intake request failed.",
        "workspace_intake_projection_invalid",
      );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
