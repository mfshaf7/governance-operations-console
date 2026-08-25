import { NextRequest, NextResponse } from "next/server";

import {
  assertWorkDesignAcceptanceId,
  assertWorkDesignNode,
  assertWorkDesignSourceRevision,
  workDesignLiveIdentity,
} from "../live-runtime/work-design-live-contract.ts";
import type {
  WorkDesignApplyCommand,
  WorkDesignContextAssistCommand,
  WorkDesignTreeAssistCommand,
} from "../live-runtime/work-design-live-types.ts";
import {
  applyWorkDesignDraft,
  readWorkDesignProjection,
  requestWorkDesignContextAdvice,
  requestWorkDesignTreeAdvice,
  workDesignOosConfigured,
  WorkDesignOosError,
} from "./work-design-oos-client.ts";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function readWorkDesignProjectionRoute(packageRef: string) {
  try {
    workDesignLiveIdentity(packageRef);
    if (!workDesignOosConfigured()) {
      return NextResponse.json(
        {
          error: null,
          mode: "disconnected-preview",
          observedAt: new Date().toISOString(),
          projection: null,
          status: "current",
        },
        { headers: noStoreHeaders },
      );
    }
    const projection = await readWorkDesignProjection(packageRef);
    return NextResponse.json(
      {
        error: null,
        mode: "live",
        observedAt: new Date().toISOString(),
        projection,
        status: "current",
      },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    return workDesignErrorResponse(error);
  }
}

export async function requestWorkDesignAdviceRoute(
  request: NextRequest,
  packageRef: string,
) {
  try {
    workDesignLiveIdentity(packageRef);
    const body = record(await request.json().catch(() => null));
    const taskKind = body.taskKind;
    const sourceRevision = assertWorkDesignSourceRevision(body.sourceRevision);
    const operatorPrompt = requiredText(body.operatorPrompt, "operator prompt");
    const result =
      taskKind === "context_advice"
        ? await requestWorkDesignContextAdvice(packageRef, {
            contextDecision: oneOf(
              body.contextDecision,
              ["attach", "proceed", "retire"] as const,
              "context decision",
            ),
            contextNote: text(body.contextNote, "context note"),
            operatorPrompt,
            sourceRevision,
          } satisfies WorkDesignContextAssistCommand)
        : taskKind === "tree_advice"
          ? await requestWorkDesignTreeAdvice(packageRef, {
              operatorPrompt,
              selectedNodeId:
                body.selectedNodeId === null
                  ? null
                  : requiredText(body.selectedNodeId, "selected node identity"),
              sourceRevision,
              tree: assertWorkDesignNode(body.tree),
            } satisfies WorkDesignTreeAssistCommand)
          : invalid("Work Design assist task is invalid.");
    return NextResponse.json(result, { headers: noStoreHeaders });
  } catch (error) {
    return workDesignErrorResponse(error);
  }
}

export async function applyWorkDesignDraftRoute(
  request: NextRequest,
  packageRef: string,
) {
  try {
    workDesignLiveIdentity(packageRef);
    const body = record(await request.json().catch(() => null));
    const advisorEvidence = Array.isArray(body.advisorEvidence)
      ? body.advisorEvidence.map((value) => {
          const evidence = record(value);
          return {
            gatewayAuditRef: requiredText(
              evidence.gatewayAuditRef,
              "advisor gateway audit reference",
            ),
            responseId: requiredText(evidence.responseId, "advisor response identity"),
          };
        })
      : invalid("Work Design advisor evidence is invalid.");
    const command: WorkDesignApplyCommand = {
      acceptanceId: assertWorkDesignAcceptanceId(body.acceptanceId),
      acceptedAt: dateTime(body.acceptedAt, "acceptance time"),
      advisorEvidence,
      note: text(body.note, "acceptance note"),
      sourceRevision: assertWorkDesignSourceRevision(body.sourceRevision),
      tree: assertWorkDesignNode(body.tree),
    };
    const result = await applyWorkDesignDraft(packageRef, command);
    return NextResponse.json(result, {
      headers: noStoreHeaders,
      status: result.status === "reconciled" ? 200 : 201,
    });
  } catch (error) {
    return workDesignErrorResponse(error);
  }
}

function workDesignErrorResponse(error: unknown) {
  const status = error instanceof WorkDesignOosError ? error.status : 400;
  const code =
    error instanceof WorkDesignOosError
      ? error.code
      : "work_design_adapter_request_invalid";
  const message = error instanceof Error ? error.message : "Work Design adapter failed.";
  return NextResponse.json(
    { code, error: message, mode: "live", status: "offline" },
    { headers: noStoreHeaders, status },
  );
}

function dateTime(value: unknown, label: string) {
  const result = requiredText(value, label);
  if (Number.isNaN(Date.parse(result))) invalid(`Work Design ${label} is invalid.`);
  return result;
}

function invalid(message: string): never {
  throw new WorkDesignOosError(message, "work_design_adapter_request_invalid", 400);
}

function oneOf<const T extends string>(
  value: unknown,
  options: readonly T[],
  label: string,
): T {
  if (typeof value !== "string" || !options.includes(value as T)) {
    invalid(`Work Design ${label} is invalid.`);
  }
  return value as T;
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    invalid("Work Design request is invalid.");
  }
  return value as Record<string, unknown>;
}

function requiredText(value: unknown, label: string) {
  const result = text(value, label);
  if (!result.trim()) invalid(`Work Design ${label} is required.`);
  return result;
}

function text(value: unknown, label: string) {
  if (typeof value !== "string") invalid(`Work Design ${label} is invalid.`);
  return value as string;
}
