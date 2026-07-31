import type {
  ConsoleAttentionCandidate,
  ConsoleAttentionSource,
  ConsoleAttentionSourceSnapshot,
  ConsoleAttentionUrgency,
} from "../../../console-integration/attention-contract.ts";
import { consoleAttentionSourceRegistrations } from "../../../console-integration/attention-source-registry.ts";
import {
  getPrototypeEntryPacketProjections,
  subscribePrototypeEntryPacketProjections,
} from "../local-runtime/prototype-entry-runtime.ts";
import { projectPrototypeEffectiveReadModel } from "../local-runtime/prototype-effective-projection.ts";
import {
  getPrototypeRuntimeProjectionSnapshot,
  subscribePrototypeRuntimeProjection,
} from "../local-runtime/prototype-runtime.ts";
import { prototypeRecordFromEntryPacket } from "../work-model/entry/prototype-entry-packet.ts";
import {
  getPrototypeWorkspaceReadModel,
  type PrototypeRecord,
} from "./prototype-workspace-read-model.ts";

const registration = consoleAttentionSourceRegistrations.prototype;
const sourceReadModel = getPrototypeWorkspaceReadModel();
const sourceObservedAt = "2026-07-28T00:00:00.000Z";
let cachedRuntime = getPrototypeRuntimeProjectionSnapshot();
let cachedEntryPackets = getPrototypeEntryPacketProjections();
let cachedSnapshot = projectPrototypeAttentionSnapshot(
  cachedRuntime,
  cachedEntryPackets,
);

export const prototypeAttentionSource: ConsoleAttentionSource = {
  getSnapshot() {
    const runtime = getPrototypeRuntimeProjectionSnapshot();
    const entryPackets = getPrototypeEntryPacketProjections();

    if (runtime !== cachedRuntime || entryPackets !== cachedEntryPackets) {
      cachedRuntime = runtime;
      cachedEntryPackets = entryPackets;
      cachedSnapshot = projectPrototypeAttentionSnapshot(runtime, entryPackets);
    }

    return cachedSnapshot;
  },
  registration,
  subscribe(listener) {
    const unsubscribeRuntime = subscribePrototypeRuntimeProjection(listener);
    const unsubscribeEntry = subscribePrototypeEntryPacketProjections(listener);

    return () => {
      unsubscribeRuntime();
      unsubscribeEntry();
    };
  },
};

function projectPrototypeAttentionSnapshot(
  runtime: ReturnType<typeof getPrototypeRuntimeProjectionSnapshot>,
  entryPackets: ReturnType<typeof getPrototypeEntryPacketProjections>,
): ConsoleAttentionSourceSnapshot {
  const proposalEntryRecords = entryPackets.map((packet, index) =>
    prototypeRecordFromEntryPacket(packet, index),
  );
  const projection = projectPrototypeEffectiveReadModel({
    proposalEntryRecords,
    runtimeProjection: runtime,
    sourceReadModel,
  });
  const projectedAt = latestPrototypeTimestamp(runtime, entryPackets);
  const localRecordIds = new Set(
    runtime.localRequestRecords.map((record) => record.id),
  );

  return {
    candidates: projection.readModel.records.flatMap((record) => {
      if (
        record.lifecycle === "retired" ||
        record.lifecycle === "graduated" ||
        record.currentMove.id === "archive" ||
        record.currentMove.id === "history"
      ) {
        return [];
      }

      return [
        prototypeAttentionCandidate({
          local:
            localRecordIds.has(record.id) ||
            Boolean(runtime.receiptsByRecord[record.id]?.length),
          projectedAt,
          receiptRefs:
            runtime.receiptsByRecord[record.id]?.map(
              (receipt) => receipt.receiptId,
            ) ?? [],
          record,
        }),
      ];
    }),
    registration,
    schemaVersion: 1,
    source: {
      authority: "workspace-prototype-studio",
      freshness: "current",
      mode: "prototype-local",
      observedAt: sourceObservedAt,
      projectedAt,
      ref: "prototype://attention-projection",
      version: `prototype-attention-v1:${projection.readModel.records.length}`,
    },
  };
}

function prototypeAttentionCandidate({
  local,
  projectedAt,
  receiptRefs,
  record,
}: {
  local: boolean;
  projectedAt: string;
  receiptRefs: readonly string[];
  record: PrototypeRecord;
}): ConsoleAttentionCandidate {
  const blockedIssue =
    record.openIssues.find((issue) => issue.status === "blocked") ?? null;
  const blocked =
    record.landing.state === "blocked" ||
    record.baseline.state === "blocked" ||
    blockedIssue !== null;
  const returned = record.movementRequest.state === "returned";
  const requiredMoveId = `prototype.${record.currentMove.id}`;
  const ownerLabel = blockedIssue?.owner ?? record.owner;

  return {
    attentionClass: blocked || returned ? "recovery" : "required-action",
    candidateId: `prototype:${record.id}:${requiredMoveId}`,
    correlationRef: record.sourceRef,
    dedupeKey: `${record.id}:${requiredMoveId}`,
    dueAt: null,
    evidenceRefs: [
      ...record.baseline.evidenceRefs,
      ...record.evidence.map(
        (evidence) => `prototype-evidence://${evidence.id}`,
      ),
    ],
    owner: {
      label: ownerLabel,
      ref: `owner://${ownerLabel}`,
    },
    ownerRank: prototypeOwnerRank(record, blocked, returned),
    reason:
      blockedIssue?.requiredFix ??
      (returned
        ? record.movementRequest.requestReason
        : record.currentMove.detail),
    receiptRefs,
    requiredMove: {
      id: requiredMoveId,
      label: record.currentMove.label,
    },
    reviewAt: null,
    route: {
      availability: "available",
      entryIntent: {
        mode: blocked || returned ? "resolve" : "resume",
        requiredMoveRef: requiredMoveId,
        subjectRef: record.id,
        target: {
          id: "workbench:prototype",
          kind: "workbench-domain",
          surfaceLabel: "PROTOTYPE",
        },
      },
      externalHref: null,
      label: "Open Prototype",
      unavailableReason: null,
    },
    schemaVersion: 1,
    source: {
      authority: "workspace-prototype-studio",
      freshness: record.projectionFreshness.includes("stale")
        ? "stale"
        : "current",
      mode: local ? "prototype-local" : "synthetic",
      observedAt: projectedAt,
      projectedAt,
      ref: record.sourceRef,
      version: record.projectionVersion,
    },
    subject: {
      kind: "prototype",
      ref: record.id,
      title: record.name,
    },
    urgency: prototypeUrgency(record, blocked, returned),
  };
}

function prototypeOwnerRank(
  record: PrototypeRecord,
  blocked: boolean,
  returned: boolean,
) {
  if (blocked) return 5;
  if (returned) return 10;
  if (record.currentMove.id === "movement-request") return 20;
  if (record.currentMove.id === "baseline-promotion") return 30;
  return 40;
}

function prototypeUrgency(
  record: PrototypeRecord,
  blocked: boolean,
  returned: boolean,
): ConsoleAttentionUrgency {
  if (blocked) return "critical";
  if (returned) return "high";
  if (record.currentMove.id === "movement-request") return "high";
  return "normal";
}

function latestPrototypeTimestamp(
  runtime: ReturnType<typeof getPrototypeRuntimeProjectionSnapshot>,
  entryPackets: ReturnType<typeof getPrototypeEntryPacketProjections>,
) {
  const timestamps = [
    ...Object.values(runtime.receiptsByRecord).flatMap((receipts) =>
      receipts.map((receipt) => receipt.recordedAt),
    ),
    ...entryPackets.map((packet) => packet.packet.createdAt),
  ].sort();

  return timestamps.at(-1) ?? sourceObservedAt;
}
