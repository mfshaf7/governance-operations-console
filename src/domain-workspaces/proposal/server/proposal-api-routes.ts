import { NextRequest, NextResponse } from "next/server";

import type {
  ProposalLiveCaptureRequest,
  ProposalLiveCommandRequest,
  ProposalLiveHandoffApplicationRequest,
} from "../live-runtime/proposal-live-types.ts";
import {
  applyProposalCommand,
  applyProposalDeliveryHandoff,
  captureProposal,
  listProposalLiveRecords,
  proposalOosConfigured,
  ProposalOosError,
} from "./proposal-oos-client.ts";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function listProposalsRoute() {
  if (!proposalOosConfigured()) {
    return NextResponse.json(
      {
        error: null,
        mode: "disconnected-preview",
        observedAt: new Date().toISOString(),
        records: [],
        status: "current",
      },
      { headers: noStoreHeaders },
    );
  }

  try {
    const records = await listProposalLiveRecords();
    return NextResponse.json(
      {
        error: null,
        mode: "live",
        observedAt: new Date().toISOString(),
        records,
        status: "current",
      },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    return proposalErrorResponse(error);
  }
}

export async function captureProposalRoute(request: NextRequest) {
  try {
    const body = assertCaptureRequest(await request.json().catch(() => null));
    const proposalId = await captureProposal(body);
    return NextResponse.json(
      { proposalId },
      { headers: noStoreHeaders, status: 201 },
    );
  } catch (error) {
    return proposalErrorResponse(error);
  }
}

export async function applyProposalCommandRoute(
  request: NextRequest,
  proposalId: string,
) {
  try {
    const body = assertCommandRequest(
      await request.json().catch(() => null),
      proposalId,
    );
    const result = await applyProposalCommand(body);
    return NextResponse.json(result, {
      headers: noStoreHeaders,
      status: result.replayed ? 200 : 201,
    });
  } catch (error) {
    return proposalErrorResponse(error);
  }
}

export async function applyProposalDeliveryHandoffRoute(
  request: NextRequest,
  proposalId: string,
) {
  try {
    const body = assertHandoffApplicationRequest(
      await request.json().catch(() => null),
      proposalId,
    );
    const result = await applyProposalDeliveryHandoff(body);
    return NextResponse.json(result, {
      headers: noStoreHeaders,
      status: result.replayed ? 200 : 201,
    });
  } catch (error) {
    return proposalErrorResponse(error);
  }
}

function assertCaptureRequest(value: unknown): ProposalLiveCaptureRequest {
  if (
    !isRecord(value) ||
    typeof value.body !== "string" ||
    typeof value.requestId !== "string" ||
    typeof value.title !== "string" ||
    !value.body.trim() ||
    !value.requestId.trim() ||
    !value.title.trim()
  ) {
    throw new ProposalOosError(
      "Proposal capture requires title, context, and request identity.",
      "proposal_capture_invalid",
      400,
    );
  }
  return value as unknown as ProposalLiveCaptureRequest;
}

function assertCommandRequest(
  value: unknown,
  proposalId: string,
): ProposalLiveCommandRequest {
  if (
    !isRecord(value) ||
    value.proposalId !== proposalId ||
    typeof value.commandId !== "string" ||
    !isRecord(value.source) ||
    !isRecord(value.payload)
  ) {
    throw new ProposalOosError(
      "Proposal command request is invalid.",
      "proposal_command_invalid",
      400,
    );
  }
  return value as unknown as ProposalLiveCommandRequest;
}

function assertHandoffApplicationRequest(
  value: unknown,
  proposalId: string,
): ProposalLiveHandoffApplicationRequest {
  if (
    !isRecord(value) ||
    value.proposalId !== proposalId ||
    !isRecord(value.source) ||
    typeof value.source.handoffPacketRef !== "string" ||
    typeof value.source.recordRef !== "string" ||
    typeof value.source.recordVersion !== "string" ||
    value.source.status !== "accepted"
  ) {
    throw new ProposalOosError(
      "Proposal handoff application request is invalid.",
      "proposal_handoff_application_invalid",
      400,
    );
  }
  return value as unknown as ProposalLiveHandoffApplicationRequest;
}

function proposalErrorResponse(error: unknown) {
  const status = error instanceof ProposalOosError ? error.status : 502;
  const code =
    error instanceof ProposalOosError ? error.code : "proposal_adapter_failed";
  const message = error instanceof Error ? error.message : "Proposal adapter failed.";
  return NextResponse.json(
    { code, error: message, mode: "live", status: "offline" },
    { headers: noStoreHeaders, status },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
