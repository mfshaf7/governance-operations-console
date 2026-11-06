import { NextRequest, NextResponse } from "next/server";

import { consoleModelOperationsModeSelected, consoleModelOperationsReadMode } from "../../../console-integration/configuration/console-runtime-configuration.ts";
import { modelOperationsReadModel } from "../read-model/model-operations-read-model.ts";
import { projectLiveModelOperationsReadModel } from "../live-runtime/model-operations-live-projection.ts";
import { projectModelOperationsOperatingEvidence } from "../live-runtime/model-operations-operating-projection.ts";
import {
  readModelProfileRequestOptions, submitPreparedModelProfileRequest,
  listModelProfileRequestPage,
  ModelOperationsOosError,
  readModelProfileRequest,
  submitCreateModelProfileRequest,
  commandModelProfileRequest,
  modelProfileLifecycleOwner,
} from "./model-operations-oos-client.ts";
import {
  ModelOperationsPlatformError,
  readPlatformModelOperationsArtifacts,
  readPlatformModelRegistryArtifacts,
} from "./model-operations-platform-adapter.ts";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function modelProfileLifecycleRoute(request:NextRequest,requestId:string|null=null){
 try{
  requireLiveMode();
  if(request.method==='GET'){
   const action=request.nextUrl.searchParams.get('view')==='security'?'security':'operation';
   return NextResponse.json(await modelProfileLifecycleOwner(action,null,requestId),{headers:noStoreHeaders});
  }
  const body=await request.json().catch(()=>null);
  if(!body||!['prepare','submit','revise','operation','security'].includes(body.action)||Object.keys(body).sort().join(',')!=='action,input')throw new ModelOperationsOosError('Choose a supported profile action.','model_profile_lifecycle_input_invalid',400);
  if(requestId===null?!['prepare','submit','revise'].includes(body.action):!['operation','security'].includes(body.action))throw new ModelOperationsOosError('This action does not belong to the selected profile surface.','model_profile_lifecycle_input_invalid',400);
  return NextResponse.json(await modelProfileLifecycleOwner(body.action,body.input,requestId),{headers:noStoreHeaders});
 }catch(error){return errorResponse(error);}
}

export async function listModelOperationsRoute() {
  const mode = consoleModelOperationsReadMode();
  if (mode === "unavailable") {
    return errorResponse(new ModelOperationsOosError(
      "Purpose profiles are unavailable because accepted Platform profile evidence is not configured. Models & routing remains a separate live view.",
      "model_operations_profile_source_unavailable",
      503,
    ));
  }
  if (mode === "disconnected-preview") {
    return NextResponse.json(
      {
        error: null,
        mode: "disconnected-preview",
        observedAt: new Date().toISOString(),
        readModel: modelOperationsReadModel,
        requests: [],
        source: null,
        status: "current",
      },
      { headers: noStoreHeaders },
    );
  }
  try {
    const artifacts = await readPlatformModelRegistryArtifacts();
    return NextResponse.json(
      {
        error: null,
        mode: "live",
        observedAt: new Date().toISOString(),
        readModel: projectLiveModelOperationsReadModel(artifacts),
        requests: [],
        source: sourceSummary(artifacts),
        status: "current",
      },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function modelProfileRequestHistoryRoute(request:NextRequest){
 try{requireLiveMode();const query=request.nextUrl.searchParams;if([...query.keys()].some(key=>key!=='cursor')||query.getAll('cursor').length>1)throw new ModelOperationsOosError('Select one request-history cursor.','model_profile_history_query_invalid',400);return NextResponse.json(await listModelProfileRequestPage(query.get('cursor')),{headers:noStoreHeaders});}catch(error){return errorResponse(error);}
}

export async function modelProfileRequestOptionsRoute(){
 try{requireLiveMode();return NextResponse.json(await readModelProfileRequestOptions(),{headers:noStoreHeaders});}catch(error){return errorResponse(error);}
}

export async function submitModelProfileRequestRoute(request: NextRequest) {
  try {
    requireLiveMode();
    const value:unknown=await request.json().catch(()=>null);
    const prepared=Boolean(value&&typeof value==="object"&&"workflowId" in value);
    return NextResponse.json(
      prepared?await submitPreparedModelProfileRequest(value):await submitCreateModelProfileRequest(value),
      { headers: noStoreHeaders, status: 202 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function readModelProfileRequestRoute(requestId: string) {
  try {
    requireLiveMode();
    return NextResponse.json(await readModelProfileRequest(requestId), { headers: noStoreHeaders });
  } catch (error) { return errorResponse(error); }
}

export async function commandModelProfileRequestRoute(request: NextRequest, requestId: string) {
  try {
    requireLiveMode();
    return NextResponse.json(await commandModelProfileRequest(requestId, await request.json().catch(() => null)), { headers: noStoreHeaders });
  } catch (error) { return errorResponse(error); }
}

export async function modelOperationsOperatingProjectionRoute(requestId: string) {
  try {
    requireLiveMode();
    const [artifacts, request] = await Promise.all([
      readPlatformModelOperationsArtifacts({ requestId }),
      readModelProfileRequest(requestId),
    ]);
    const projection = projectModelOperationsOperatingEvidence(request, artifacts);
    return NextResponse.json(projection, { headers: noStoreHeaders });
  } catch (error) {
    return errorResponse(error);
  }
}

function sourceSummary(artifacts: Awaited<ReturnType<typeof readPlatformModelRegistryArtifacts>>) {
  const source = record(artifacts.sourceProjection.source);
  return {
    lifecycleReceiptDigest: null,
    mergedReadbackDigest: null,
    projectionDigest: text(artifacts.sourceProjection.digest),
    sourceVersion: text(source.source_version),
  };
}

function requireLiveMode() {
  if (!consoleModelOperationsModeSelected()) {
    throw new ModelOperationsOosError(
      "Model Operations live integration is not selected.",
      "model_operations_live_mode_required",
      503,
    );
  }
}

function errorResponse(error: unknown) {
  const known =
    error instanceof ModelOperationsOosError ||
    error instanceof ModelOperationsPlatformError;
  return NextResponse.json(
    {
      code: known ? error.code : "model_operations_adapter_failed",
      error: error instanceof Error ? error.message : "Model Operations adapter failed.",
      mode: "live",
      status: "offline",
    },
    {
      headers: noStoreHeaders,
      status: known ? error.status : 502,
    },
  );
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ModelOperationsPlatformError(
      "Model Operations reconciliation evidence is malformed.",
      "console_model_operations_reconciliation_invalid",
    );
  }
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  if (typeof value !== "string" || !value) {
    throw new ModelOperationsPlatformError(
      "Model Operations reconciliation evidence is malformed.",
      "console_model_operations_reconciliation_invalid",
    );
  }
  return value;
}
