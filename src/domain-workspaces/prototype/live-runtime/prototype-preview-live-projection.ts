import type {
  PrototypeProjectedReceipt,
  PrototypeRecord,
} from "../read-model/prototype-workspace-read-model.ts";
import type {
  PrototypePreviewOwnerCommandResult,
  PrototypePreviewOwnerProjection,
  PrototypePreviewOwnerProof,
} from "./prototype-preview-live-types.ts";

export function projectPrototypePreviewOwnerRecord(
  record: PrototypeRecord,
  projection: PrototypePreviewOwnerProjection | null,
  proof: PrototypePreviewOwnerProof | null,
  state: "error" | "live" | "loading",
): PrototypeRecord {
  if (state === "loading") {
    return {
      ...record,
      preview: { ...record.preview, runtimeState: "unknown" },
      projectionFreshness: "Studio Preview Runtime projection loading",
    };
  }
  if (state === "error" || !projection) {
    return {
      ...record,
      preview: { ...record.preview, runtimeState: "unavailable" },
      projectionFreshness: "Studio Preview Runtime projection unavailable",
    };
  }
  const proofRef = proof?.receipt.ref ?? null;
  const evidence = proofRef
    ? upsertEvidence(record, proofRef, projection.source_revision)
    : record.evidence;
  return {
    ...record,
    evidence,
    preview: {
      ...record.preview,
      address: projection.endpoint ?? "Loopback endpoint available while running",
      command: "Workspace Prototype Studio bounded owner command",
      healthcheckPath: "/__preview/health",
      lastCheckLogRef: null,
      lastCheckedAt: proof ? new Date().toISOString() : null,
      lastProofRef: proofRef,
      launchAdapter: "static-server",
      port: projection.endpoint ? new URL(projection.endpoint).port : "owner-managed",
      profileRef: `preview-runtime://profiles/${projection.profile_id}@${projection.profile_digest}`,
      profileSource: `Workspace Prototype Studio ${projection.source_revision}`,
      profileState: "profile-configured",
      proofState: proof ? "proof-ready" : "not-started",
      runtimeState:
        projection.runtime_state === "stale"
          ? "unknown"
          : projection.runtime_state,
      workingDirectory: "Workspace Prototype Studio owner source",
    },
    projectionFreshness: `Studio-owned Preview Runtime / ${projection.source_revision}`,
  };
}

export function projectPrototypePreviewOwnerReceipt(
  recordId: string,
  result: PrototypePreviewOwnerCommandResult,
): PrototypeProjectedReceipt {
  const receipt = result.receipt;
  return {
    authority: "source-projected",
    commandId: `${receipt.action}-preview`,
    commandName: `prototype.preview.${receipt.action}`,
    id: receipt.receipt_id,
    label: `Preview ${receipt.action}`,
    recordedAt: receipt.completed_at,
    recordId,
    resultState: "recorded",
    schemaVersion: 1,
    sourceLabel: "source record",
    sourceVersion: receipt.source_revision,
    summary: `Studio owner command ${result.status}; runtime is ${receipt.after_state}.`,
    tone: receipt.after_state === "stale" ? "warn" : "ok",
  };
}

export function projectPrototypePreviewProofReceipt(
  recordId: string,
  proof: PrototypePreviewOwnerProof,
  sourceRevision: string,
): PrototypeProjectedReceipt {
  return {
    authority: "source-projected",
    commandId: "refresh-preview-proof",
    commandName: "prototype.preview.proof",
    id: proof.receipt.ref,
    label: "Preview proof",
    recordedAt: new Date().toISOString(),
    recordId,
    resultState: "recorded",
    schemaVersion: 1,
    sourceLabel: "source record",
    sourceVersion: sourceRevision,
    summary: "Studio owner proof binds the current loopback runtime, source, profile, and receipt.",
    tone: "ok",
  };
}

function upsertEvidence(
  record: PrototypeRecord,
  proofRef: string,
  sourceRevision: string,
) {
  const evidence = {
    detail: `Studio owner proof from exact source ${sourceRevision}.`,
    id: proofRef,
    label: "Preview proof receipt",
    status: "proof ready",
    tone: "ok" as const,
  };
  return record.evidence.some((item) => item.id === proofRef)
    ? record.evidence.map((item) => (item.id === proofRef ? evidence : item))
    : [...record.evidence, evidence];
}
