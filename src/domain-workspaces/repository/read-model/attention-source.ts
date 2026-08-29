import type {
  ConsoleAttentionCandidate,
  ConsoleAttentionSource,
  ConsoleAttentionSourceSnapshot,
} from "../../../console-integration/attention-contract.ts";
import { consoleAttentionSourceRegistrations } from "../../../console-integration/attention-source-registry.ts";
import {
  getProposalRepositoryRequestRecords,
  subscribeProposalRepositoryRequestRecords,
} from "../local-runtime/ingress/repository-ingress-runtime.ts";
import { projectRepositoryEffectiveRecords } from "../local-runtime/repository-effective-projection.ts";
import {
  getRepositoryRuntimeProjectionSnapshot,
  subscribeRepositoryRuntimeProjection,
} from "../local-runtime/repository-runtime.ts";
import {
  repositoryWorkspaceReadModel,
  type RepositoryWorkspaceRecord,
} from "./repository-workspace-read-model.ts";

const registration = consoleAttentionSourceRegistrations.repository;
const sourceObservedAt = "2026-05-10T00:00:00.000Z";
let cachedRuntime = getRepositoryRuntimeProjectionSnapshot();
let cachedProposalRecords = getProposalRepositoryRequestRecords();
let cachedSnapshot = projectRepositoryAttentionSnapshot(
  cachedRuntime,
  cachedProposalRecords,
);

export const repositoryAttentionSource: ConsoleAttentionSource = {
  getSnapshot() {
    const runtime = getRepositoryRuntimeProjectionSnapshot();
    const proposalRecords = getProposalRepositoryRequestRecords();

    if (
      runtime !== cachedRuntime ||
      proposalRecords !== cachedProposalRecords
    ) {
      cachedRuntime = runtime;
      cachedProposalRecords = proposalRecords;
      cachedSnapshot = projectRepositoryAttentionSnapshot(
        runtime,
        proposalRecords,
      );
    }

    return cachedSnapshot;
  },
  registration,
  subscribe(listener) {
    const unsubscribeRuntime = subscribeRepositoryRuntimeProjection(listener);
    const unsubscribeProposal =
      subscribeProposalRepositoryRequestRecords(listener);

    return () => {
      unsubscribeRuntime();
      unsubscribeProposal();
    };
  },
};

function projectRepositoryAttentionSnapshot(
  runtime: ReturnType<typeof getRepositoryRuntimeProjectionSnapshot>,
  proposalRecords: ReturnType<typeof getProposalRepositoryRequestRecords>,
): ConsoleAttentionSourceSnapshot {
  const records = projectRepositoryEffectiveRecords({
    proposalRequestRecords: proposalRecords,
    runtimeProjection: runtime,
    sourceRecords: repositoryWorkspaceReadModel.records,
  });
  const projectedAt = latestRepositoryTimestamp(runtime);

  return {
    candidates: records.flatMap((record) => {
      const candidate = repositoryAttentionCandidate({
        local: Boolean(runtime.receiptsByRecord[record.id]?.length),
        projectedAt,
        receiptRefs:
          runtime.receiptsByRecord[record.id]?.map(
            (receipt) => receipt.receiptId,
          ) ?? [],
        record,
      });

      return candidate ? [candidate] : [];
    }),
    registration,
    schemaVersion: 1,
    source: {
      authority: "workspace-repository-registry",
      freshness: "current",
      mode: "prototype-local",
      observedAt: sourceObservedAt,
      projectedAt,
      ref: "repository://attention-projection",
      version: `repository-attention-v1:${records.length}`,
    },
  };
}

function repositoryAttentionCandidate({
  local,
  projectedAt,
  receiptRefs,
  record,
}: {
  local: boolean;
  projectedAt: string;
  receiptRefs: readonly string[];
  record: RepositoryWorkspaceRecord;
}): ConsoleAttentionCandidate | null {
  const pendingProposalGate =
    record.proposalGate?.status === "pending" ? record.proposalGate : null;
  const blocker = record.blockers[0] ?? null;
  const blocked = record.admissionState === "blocked";
  const admissionReady = record.admissionState === "ready";

  if (!pendingProposalGate && !blocked && !admissionReady) {
    return null;
  }

  const requiredMove = pendingProposalGate
    ? {
        id: "repository.resolve-proposal-gate",
        label: "Resolve Repository Gate",
      }
    : blocked
      ? {
          id: "repository.resolve-admission-blocker",
          label: blocker?.action ?? "Resolve Admission Blocker",
        }
      : {
          id: "repository.review-admission",
          label: "Review Repository Admission",
        };
  const ownerLabel =
    blocker?.owner ??
    (pendingProposalGate ? "Repository Operation" : record.owner);
  const reason =
    blocker?.detail ??
    (pendingProposalGate
      ? "Resolve repository custody before the proposal handoff can continue."
      : record.nextAction);

  return {
    attentionClass: blocked
      ? "recovery"
      : pendingProposalGate
        ? "required-action"
        : "review",
    candidateId: `repository:${record.id}:${requiredMove.id}`,
    correlationRef: pendingProposalGate?.proposalId ?? null,
    dedupeKey: pendingProposalGate
      ? `${pendingProposalGate.proposalId}:${requiredMove.id}`
      : `${record.id}:${requiredMove.id}`,
    dueAt: null,
    evidenceRefs: [
      ...record.blockers.map((recordBlocker) => recordBlocker.sourceRef),
      ...(pendingProposalGate ? [pendingProposalGate.repoRequestRef] : []),
    ],
    owner: {
      label: ownerLabel,
      ref: `owner://${ownerLabel}`,
    },
    ownerRank: blocked ? 5 : pendingProposalGate ? 10 : 40,
    reason,
    receiptRefs,
    requiredMove,
    reviewAt: null,
    route: {
      availability: "available",
      entryIntent: {
        mode: blocked || pendingProposalGate ? "resolve" : "review",
        requiredMoveRef: requiredMove.id,
        subjectRef: record.id,
        target: {
          id: "workbench:repository",
          kind: "workbench-domain",
          surfaceLabel: "REPOSITORY",
        },
      },
      externalHref: null,
      label: "Open Repository",
      unavailableReason: null,
    },
    schemaVersion: 1,
    source: {
      authority: "workspace-repository-registry",
      freshness: "current",
      mode: local ? "prototype-local" : "synthetic",
      observedAt: sourceObservedAt,
      projectedAt,
      ref: `repository://${record.id}`,
      version: `${record.lifecycle}:${record.admissionState}:${record.lastValidation}`,
    },
    subject: {
      kind: "repository",
      ref: record.id,
      title: record.name,
    },
    urgency: blocked ? "critical" : pendingProposalGate ? "high" : "normal",
  };
}

function latestRepositoryTimestamp(
  runtime: ReturnType<typeof getRepositoryRuntimeProjectionSnapshot>,
) {
  const timestamps = [
    ...Object.values(runtime.receiptsByRecord).flatMap((receipts) =>
      receipts.map((receipt) => receipt.recordedAt),
    ),
  ].sort();

  return timestamps.at(-1) ?? sourceObservedAt;
}
