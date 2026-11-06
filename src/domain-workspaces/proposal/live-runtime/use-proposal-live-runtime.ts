"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  assertProposalLiveSnapshot,
  assertProposalOosCommandResult,
  assertProposalOosHandoffApplicationResult,
  assertProposalTargetApplicationResult,
  isProposalLiveApiError,
} from "./proposal-live-contract.ts";
import type {
  ProposalLiveCaptureRequest,
  ProposalRegisterSelection,
  ProposalLiveCommandRequest,
  ProposalLiveHandoffApplicationRequest,
  ProposalLiveSnapshot,
  ProposalOosCommandResult,
  ProposalOosHandoffApplicationResult,
  ProposalLiveTargetApplicationRequest,
  ProposalTargetApplicationResult,
} from "./proposal-live-types.ts";

import { useProposalSourceRead } from "./use-proposal-source-read.ts";

export function useProposalLiveRuntime(selection: ProposalRegisterSelection = {query:"",status:"all",ingress:"all"}, selectedId = "", pinnedId: string | null = null) {
  const source = useProposalSourceRead(selection, selectedId, pinnedId);
  const {refresh,refreshSelected} = source;
  const [targetApplications, setTargetApplications] = useState<
    Record<string, ProposalTargetApplicationResult>
  >({});
  const [targetApplicationErrors, setTargetApplicationErrors] = useState<
    Record<string, string | null>
  >({});
  const [targetApplicationPending, setTargetApplicationPending] = useState<
    Record<string, boolean>
  >({});
  const checkCapture = useCallback(async (request:ProposalLiveCaptureRequest):Promise<{status:"found"|"not-found";proposalId:string|null}> => {
    const response=await fetch("/api/proposals/capture-result",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(request)});
    const value=await response.json();
    if(!response.ok || !["found","not-found"].includes(value.status) || (value.status === "found" && typeof value.proposalId !== "string"))throw proposalClientError(value);
    if(value.status === "found")await refresh(true);
    return value;
  },[refresh]);
  const recoverCapture = useCallback(async (request:ProposalLiveCaptureRequest):Promise<string|null> => {
    try {return (await checkCapture(request)).proposalId;} catch{return null;}
  },[checkCapture]);

  const capture = useCallback(
    async (request: ProposalLiveCaptureRequest) => {
      let response: Response;
      try { response = await fetch("/api/proposals", {
        body: JSON.stringify(request),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      } catch(error) {
        const recovered = await recoverCapture(request);
        if(recovered)return recovered;
        throw Object.assign(new Error("Capture was not confirmed. Check its result before sending again."),{outcomeUnknown:true});
      }
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const recovered = await recoverCapture(request);
        if(recovered)return recovered;
        const error = proposalClientError(body) as Error & {outcomeUnknown?:boolean};
        error.outcomeUnknown = ![400,401,403,422].includes(response.status) && !(body && typeof body === "object" && "code" in body && body.code === "proposal_capture_not_submitted");
        throw error;
      }
      const result = body as { proposalId?: unknown };
      if (typeof result.proposalId !== "string") {
        const recovered=await recoverCapture(request);
        if(recovered)return recovered;
        throw Object.assign(new Error("Capture was not confirmed. Check its original result before sending again."),{outcomeUnknown:true});
      }
      await refresh(true);
      return result.proposalId;
    },
    [refresh,recoverCapture],
  );

  const command = useCallback(
    async (request: ProposalLiveCommandRequest): Promise<ProposalOosCommandResult> => {
      const response = await fetch(
        `/api/proposals/${encodeURIComponent(request.proposalId)}/commands`,
        {
          body: JSON.stringify(request),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        await refresh();
        throw proposalClientError(body);
      }
      const result = assertProposalOosCommandResult(body);
      await refreshSelected();
      await refresh();
      return result;
    },
    [refresh,refreshSelected],
  );

  const applyDeliveryHandoff = useCallback(
    async (
      request: ProposalLiveHandoffApplicationRequest,
    ): Promise<ProposalOosHandoffApplicationResult> => {
      const response = await fetch(
        `/api/proposals/${encodeURIComponent(request.proposalId)}/handoff/apply`,
        {
          body: JSON.stringify(request),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        await refresh();
        throw proposalClientError(body);
      }
      const result = assertProposalOosHandoffApplicationResult(body);
      await refreshSelected();
      await refresh();
      return result;
    },
    [refresh,refreshSelected],
  );

  const targetApplicationCommand = useCallback(
    async (
      proposalId: string,
      method: "DELETE" | "POST",
      input?:
        | (ProposalLiveTargetApplicationRequest & { action: "start" })
        | { action: "continue" },
    ) => {
      setTargetApplicationPending((current) => ({
        ...current,
        [proposalId]: true,
      }));
      try {
        const response = await fetch(
          `/api/proposals/${encodeURIComponent(proposalId)}/target-application`,
          {
            ...(input ? { body: JSON.stringify(input) } : {}),
            headers: { "Content-Type": "application/json" },
            method,
          },
        );
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) throw proposalClientError(body);
        const result = assertProposalTargetApplicationResult(body);
        setTargetApplications((current) => ({
          ...current,
          [proposalId]: result,
        }));
        setTargetApplicationErrors((current) => ({
          ...current,
          [proposalId]: null,
        }));
        if (result.status === "succeeded") {await refreshSelected();await refresh();}
        return result;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Target application failed.";
        setTargetApplicationErrors((current) => ({
          ...current,
          [proposalId]: message,
        }));
        throw error;
      } finally {
        setTargetApplicationPending((current) => ({
          ...current,
          [proposalId]: false,
        }));
      }
    },
    [refresh,refreshSelected],
  );

  const startTargetApplication = useCallback(
    (request: ProposalLiveTargetApplicationRequest) =>
      targetApplicationCommand(request.proposalId, "POST", {
        ...request,
        action: "start",
      }),
    [targetApplicationCommand],
  );
  const continueTargetApplication = useCallback(
    (proposalId: string) =>
      targetApplicationCommand(proposalId, "POST", { action: "continue" }),
    [targetApplicationCommand],
  );
  const cancelTargetApplication = useCallback(
    (proposalId: string) => targetApplicationCommand(proposalId, "DELETE"),
    [targetApplicationCommand],
  );
  return {
    checkCapture,recoverCapture,
    applyDeliveryHandoff,
    cancelTargetApplication,
    capture,
    command,
    continueTargetApplication,
    ...source,
    startTargetApplication,
    targetApplicationErrors,
    targetApplicationPending,
    targetApplications,
  };
}

function proposalClientError(value: unknown) {
  return new Error(
    isProposalLiveApiError(value) ? value.error : "Proposal command failed.",
  );
}
