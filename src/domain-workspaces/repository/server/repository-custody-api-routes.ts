import { NextRequest, NextResponse } from "next/server";

import type {
  RepositoryCustodyLinkIntent,
  RepositoryProvisionIntent,
} from "../live-runtime/repository-custody-live-types.ts";
import {
  assertRepositoryCustodyRequestId,
  linkExistingRepositoryCustody,
  lookupRepositoryProvider,
  readRepositoryConnections,
  listRepositoryCustodyResults,
  provisionRepository,
  readRepositoryCustodyResult,
  resumeRepositoryProvisioning,
  RepositoryCustodyOosError,
} from "./repository-custody-oos-client.ts";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function listRepositoryConnectionsRoute() {
  try { return NextResponse.json(await readRepositoryConnections(), {headers: noStoreHeaders}); }
  catch (error) { return repositoryCustodyErrorResponse(error); }
}

export async function listRepositoryCustodyRequestsRoute(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams;
    if ([...query.keys()].some(key => !["cursor", "view", "provider_repository_id", "proposal_id"].includes(key) || query.getAll(key).length !== 1)) throw invalidIntent();
    const page = await listRepositoryCustodyResults(query.get("cursor"), {
      ...(query.has("view") ? {view: query.get("view") as "register" | "requests"} : {}),
      ...(query.has("provider_repository_id") ? {providerRepositoryId: query.get("provider_repository_id")!} : {}),
      ...(query.has("proposal_id") ? {proposalId: query.get("proposal_id")!} : {}),
    });
    return NextResponse.json(
      { ...page, mode: "live", status: "current", error: null },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    return repositoryCustodyErrorResponse(error);
  }
}

export async function lookupRepositoryProviderRoute(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    if ([...params.keys()].some(key => !["owner","name"].includes(key)) || params.getAll("owner").length !== 1 || params.getAll("name").length !== 1) throw invalidIntent();
    return NextResponse.json(await lookupRepositoryProvider(params.get("owner")!,params.get("name")!), {headers:noStoreHeaders});
  } catch(error) { return repositoryCustodyErrorResponse(error); }
}

export async function linkExistingRepositoryCustodyRoute(
  request: NextRequest,
) {
  try {
    const result = await linkExistingRepositoryCustody(
      assertLinkIntent(await request.json().catch(() => null)),
    );
    return NextResponse.json(result, {
      headers: noStoreHeaders,
      status: result.replayed ? 200 : 201,
    });
  } catch (error) {
    return repositoryCustodyErrorResponse(error);
  }
}

export async function provisionRepositoryRoute(request: NextRequest) {
  try {
    const input: unknown = await request.json().catch(() => null);
    if (isRecord(input) && input.resume === true &&
        Object.keys(input).some(key => !["requestId", "resume"].includes(key))) throw invalidProvisionIntent();
    const result = isRecord(input) && input.resume === true
      ? await resumeRepositoryProvisioning(assertRepositoryCustodyRequestId(input.requestId))
      : await provisionRepository(assertProvisionIntent(input));
    return NextResponse.json(result, {
      headers: noStoreHeaders,
      status: result.replayed ? 200 : 201,
    });
  } catch (error) {
    return repositoryCustodyErrorResponse(error);
  }
}

export async function readRepositoryCustodyResultRoute(requestId: string) {
  try {
    const result = await readRepositoryCustodyResult(
      assertRepositoryCustodyRequestId(requestId),
    );
    return NextResponse.json(result, { headers: noStoreHeaders });
  } catch (error) {
    return repositoryCustodyErrorResponse(error);
  }
}

export async function readRepositoryProvisioningResultRoute(requestId: string) {
  try {
    const result = await readRepositoryCustodyResult(
      assertRepositoryCustodyRequestId(requestId),
      { credentialKind: "provisioning" },
    );
    if (result.request.action !== "provision-new") {
      throw new RepositoryCustodyOosError(
        "Repository provisioning projection returned the wrong action.",
        "repository_provisioning_projection_action_mismatch",
        502,
      );
    }
    return NextResponse.json(result, { headers: noStoreHeaders });
  } catch (error) {
    return repositoryCustodyErrorResponse(error);
  }
}

function assertLinkIntent(value: unknown): RepositoryCustodyLinkIntent {
  if (!isRecord(value)) {
    throw invalidIntent();
  }
  return {
    approvalNote: text(value.approvalNote),
    ...(value.proposalId === undefined ? {} : {proposalId:text(value.proposalId),createdForRequest:attachmentPurpose(value.createdForRequest)}),
    custodyKind: text(value.custodyKind) as RepositoryCustodyLinkIntent["custodyKind"],
    providerHost: text(value.providerHost),
    providerRepositoryId: text(value.providerRepositoryId),
    repositoryId: text(value.repositoryId),
    repositoryName: text(value.repositoryName),
    repositoryOwner: text(value.repositoryOwner),
    requestedAt: text(value.requestedAt),
    requestId: text(value.requestId),
    workspaceOwnerRef: text(value.workspaceOwnerRef),
  };
}

function attachmentPurpose(value: unknown): true {
  if (value !== true) throw new RepositoryCustodyOosError("Confirm that this repository was created to fulfil the request.","repository_attachment_purpose_required",400);
  return true;
}

function assertProvisionIntent(value: unknown): RepositoryProvisionIntent {
  if (!isRecord(value)) {
    throw invalidProvisionIntent();
  }
  return {
    approvalNote: text(value.approvalNote),
    ...(value.correctionOfRequestId === undefined ? {} : {
      correctionOfRequestId: assertRepositoryCustodyRequestId(value.correctionOfRequestId),
    }),
    ...(value.proposalId === undefined ? {} : { proposalId: text(value.proposalId) }),
    custodyKind: text(value.custodyKind) as RepositoryProvisionIntent["custodyKind"],
    repositoryDescription: text(value.repositoryDescription),
    repositoryName: text(value.repositoryName),
    repositoryOwner: text(value.repositoryOwner),
    requestedAt: text(value.requestedAt),
    requestId: text(value.requestId),
    templateReviewed: truth(value.templateReviewed),
    visibility: text(value.visibility) as RepositoryProvisionIntent["visibility"],
    workspaceOwnerRef: text(value.workspaceOwnerRef),
  };
}

function text(value: unknown) {
  if (typeof value !== "string") throw invalidIntent();
  return value;
}

function truth(value: unknown): true {
  if (value !== true) throw invalidProvisionIntent();
  return true;
}

function invalidIntent() {
  return new RepositoryCustodyOosError(
    "Repository custody request input is invalid.",
    "repository_custody_link_intent_invalid",
    400,
  );
}

function invalidProvisionIntent() {
  return new RepositoryCustodyOosError(
    "Repository provisioning request input is invalid.",
    "repository_provisioning_intent_invalid",
    400,
  );
}

function repositoryCustodyErrorResponse(error: unknown) {
  const status = error instanceof RepositoryCustodyOosError ? error.status : 502;
  const code =
    error instanceof RepositoryCustodyOosError
      ? error.code
      : "repository_custody_adapter_failed";
  const message =
    error instanceof Error ? error.message : "Repository custody adapter failed.";
  return NextResponse.json(
    {
      code,
      error: message,
      mode: "live",
      retryable:
        error instanceof RepositoryCustodyOosError && error.retryable,
      status: "offline",
    },
    { headers: noStoreHeaders, status },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
