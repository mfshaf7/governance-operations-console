import { createBrowserOperationDraftStore } from "../../../operation-runtime/index.ts";

import type {
  WorkDesignBlockerDispositionReceipt,
  WorkDesignBlockerIssueKind,
  WorkDesignBlockerRecoveryActionId,
  WorkDesignBoardSnapshot,
  WorkDesignBriefVersion,
  WorkDesignContextDecision,
  WorkDesignContextSavedSession,
  WorkDesignNode,
  WorkDesignPersistedSession,
  WorkDesignTreeDraftSnapshot,
} from "../../work-model/work-design/work-design-types.ts";
import { defaultWorkDesignContextSessionName } from "../../work-model/work-design/work-design-session-model.ts";

const workDesignDraftStore = createBrowserOperationDraftStore();

export function workDesignSessionPersistenceKey(packageId: string) {
  return `delivery-work-design-session:${packageId}:v2`;
}

export function loadWorkDesignSessionDraft(
  packageId: string,
): WorkDesignPersistedSession | null {
  return workDesignDraftStore.readJson(
    workDesignSessionPersistenceKey(packageId),
    (value) => normalizeWorkDesignPersistedSession(value, packageId),
  );
}

export function saveWorkDesignSessionDraft(
  packageId: string,
  session: WorkDesignPersistedSession,
) {
  workDesignDraftStore.writeJson(
    workDesignSessionPersistenceKey(packageId),
    session,
  );
}

export function normalizeWorkDesignContextSavedSession(
  value: unknown,
): WorkDesignContextSavedSession | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<WorkDesignContextSavedSession>;
  const snapshot = candidate.snapshot as
    Partial<WorkDesignBoardSnapshot> | undefined;

  const valid =
    typeof candidate.fingerprint === "string" &&
    typeof candidate.id === "string" &&
    typeof candidate.note === "string" &&
    typeof candidate.savedAt === "string" &&
    typeof candidate.sequence === "number" &&
    (candidate.decision === "attach" ||
      candidate.decision === "proceed" ||
      candidate.decision === "retire") &&
    Boolean(snapshot) &&
    Array.isArray(snapshot?.connections) &&
    Array.isArray(snapshot?.customItems) &&
    Boolean(snapshot?.positions) &&
    Array.isArray(snapshot?.removedCoreIds) &&
    Array.isArray(snapshot?.sketchStrokes) &&
    Array.isArray(snapshot?.templateTrays) &&
    (snapshot?.style === "architecture" ||
      snapshot?.style === "flow" ||
      snapshot?.style === "map" ||
      snapshot?.style === "plain");

  if (!valid || !snapshot) {
    return null;
  }

  return {
    decision: candidate.decision as WorkDesignContextDecision,
    fingerprint: candidate.fingerprint as string,
    id: candidate.id as string,
    name:
      typeof candidate.name === "string" && candidate.name.trim()
        ? candidate.name
        : defaultWorkDesignContextSessionName(candidate.sequence as number),
    note: candidate.note as string,
    savedAt: candidate.savedAt as string,
    sequence: candidate.sequence as number,
    snapshot: candidate.snapshot as WorkDesignBoardSnapshot,
  };
}

export function normalizeWorkDesignNode(value: unknown): WorkDesignNode | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<WorkDesignNode>;
  const kind = candidate.kind;

  if (
    kind !== "Epic" &&
    kind !== "Feature" &&
    kind !== "Risk" &&
    kind !== "User story"
  ) {
    return null;
  }

  if (
    typeof candidate.description !== "string" ||
    typeof candidate.draftBody !== "string" ||
    typeof candidate.id !== "string" ||
    typeof candidate.remark !== "string" ||
    typeof candidate.title !== "string" ||
    (candidate.tone !== "danger" &&
      candidate.tone !== "info" &&
      candidate.tone !== "muted" &&
      candidate.tone !== "ok" &&
      candidate.tone !== "stale" &&
      candidate.tone !== "warn")
  ) {
    return null;
  }

  const children = Array.isArray(candidate.children)
    ? candidate.children
        .map(normalizeWorkDesignNode)
        .filter((node): node is WorkDesignNode => Boolean(node))
    : undefined;

  return {
    ...(children ? { children } : {}),
    description: candidate.description,
    draftBody: candidate.draftBody,
    id: candidate.id,
    kind,
    remark: candidate.remark,
    title: candidate.title,
    tone: candidate.tone,
  };
}

export function normalizeWorkDesignBriefVersion(
  value: unknown,
): WorkDesignBriefVersion | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<WorkDesignBriefVersion>;
  const snapshotSession = normalizeWorkDesignContextSavedSession({
    decision: candidate.decision,
    fingerprint: candidate.finalizedFingerprint,
    id: candidate.savedSessionId ?? candidate.briefVersionId,
    name: candidate.name,
    note: "",
    savedAt: candidate.finalizedAt,
    sequence: 1,
    snapshot: candidate.snapshot,
  });

  if (
    !snapshotSession ||
    typeof candidate.boardSnapshotRef !== "string" ||
    typeof candidate.briefVersionId !== "string" ||
    typeof candidate.finalizedAt !== "string" ||
    typeof candidate.finalizedFingerprint !== "string" ||
    typeof candidate.metadataPacketRef !== "string" ||
    typeof candidate.name !== "string" ||
    typeof candidate.versionLabel !== "string"
  ) {
    return null;
  }

  return {
    boardSnapshotRef: candidate.boardSnapshotRef,
    ...(validRetainedBrief(candidate.finalizedBrief) ? {finalizedBrief:candidate.finalizedBrief} : {}),
    ...(Array.isArray(candidate.coreNodes) && candidate.coreNodes.every(node=>node&&["id","kicker","label","detail","tone"].every(key=>typeof (node as unknown as Record<string,unknown>)[key]==="string")) ? {coreNodes:candidate.coreNodes} : {}),
    briefVersionId: candidate.briefVersionId,
    decision: snapshotSession.decision,
    finalizedAt: candidate.finalizedAt,
    finalizedFingerprint: candidate.finalizedFingerprint,
    metadataPacketRef: candidate.metadataPacketRef,
    name: candidate.name,
    savedSessionId:
      typeof candidate.savedSessionId === "string"
        ? candidate.savedSessionId
        : null,
    snapshot: snapshotSession.snapshot,
    versionLabel: candidate.versionLabel,
  };
}

function validRetainedBrief(value: unknown): value is import("../../work-model/work-design/work-design-artifact-types.ts").WorkDesignFinalizedBrief {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string,unknown>;
  if (!["boardSnapshotRef","diagramSummary","diagramTitle","finalizedBy","metadataPacketRef","name","note","version"].every(key => typeof v[key] === "string") ||
      !["attach","proceed","retire"].includes(String(v.decision)) || (v.finalizedAt !== null && typeof v.finalizedAt !== "string")) return false;
  const tones = ["danger","info","muted","ok","stale","warn"];
  for (const [key,fields] of [["carriedMetadata",["label","value"]],["diagramNodes",["label","summary","title"]],["systemChecks",["detail","label","status"]]] as const) {
    const rows=v[key];if (!Array.isArray(rows) || rows.some(row => !row || typeof row!=="object" || !tones.includes(row.tone) || fields.some(field => typeof row[field]!=="string"))) return false;
  }
  if (v.snapshotArtifact !== null) {
    const a=v.snapshotArtifact as Record<string,unknown> | undefined;
    if (!a || typeof a!=="object" || !["artifact_id","attachment_status","board_snapshot_ref","description","file_name","rendered_content_base64_ref","target_record_ref"].every(key => typeof a[key]==="string") || !["image/png","image/svg+xml"].includes(String(a.content_type))) return false;
  }
  return true;
}

export function normalizeWorkDesignTreeDraftSnapshot(
  value: unknown,
): WorkDesignTreeDraftSnapshot | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<WorkDesignTreeDraftSnapshot>;
  const tree = normalizeWorkDesignNode(candidate.tree);
  const hasUnsavedSessionChanges =
    typeof candidate.hasUnsavedSessionChanges === "boolean"
      ? candidate.hasUnsavedSessionChanges
      : null;
  const reviewHandoffNote =
    typeof candidate.reviewHandoffNote === "string"
      ? candidate.reviewHandoffNote
      : null;

  if (
    !tree ||
    typeof hasUnsavedSessionChanges !== "boolean" ||
    !Array.isArray(candidate.expandedNodeIds) ||
    typeof reviewHandoffNote !== "string" ||
    typeof candidate.savedAt !== "string" ||
    typeof candidate.selectedNodeId !== "string" ||
    typeof candidate.stale !== "boolean" ||
    !Array.isArray(candidate.structuredStoryGroupIds) ||
    (candidate.viewMode !== "inline" && candidate.viewMode !== "structured")
  ) {
    return null;
  }

  return {
    activeBriefVersionId:
      typeof candidate.activeBriefVersionId === "string"
        ? candidate.activeBriefVersionId
        : null,
    hasUnsavedSessionChanges,
    expandedNodeIds: candidate.expandedNodeIds.filter(
      (nodeId): nodeId is string => typeof nodeId === "string",
    ),
    openDetailNodeId:
      typeof candidate.openDetailNodeId === "string"
        ? candidate.openDetailNodeId
        : null,
    reviewHandoffNote,
    savedAt: candidate.savedAt,
    selectedNodeId: candidate.selectedNodeId,
    stale: candidate.stale,
    structuredStoryGroupIds: candidate.structuredStoryGroupIds.filter(
      (nodeId): nodeId is string => typeof nodeId === "string",
    ),
    tree,
    viewMode: candidate.viewMode,
  };
}

export function normalizeWorkDesignBlockerDispositionReceipt(
  value: unknown,
): WorkDesignBlockerDispositionReceipt | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<WorkDesignBlockerDispositionReceipt>;
  const evidenceLines = normalizeWorkDesignStringList(candidate.evidenceLines);

  if (
    candidate.disposition !== "accept-risk" &&
    candidate.disposition !== "defer" &&
    candidate.disposition !== "remove" &&
    candidate.disposition !== "workaround"
  ) {
    return null;
  }

  if (
    typeof candidate.issueId !== "string" ||
    !isWorkDesignBlockerIssueKind(candidate.issueKind)
  ) {
    return null;
  }

  if (
    typeof candidate.justification !== "string" ||
    typeof candidate.packageId !== "string" ||
    typeof candidate.recordedAt !== "string" ||
    typeof candidate.receiptId !== "string" ||
    typeof candidate.recoveryAction !== "string" ||
    typeof candidate.sourceRef !== "string"
  ) {
    return null;
  }

  return {
    ...(typeof candidate.clearsBlocker === "boolean"
      ? { clearsBlocker: candidate.clearsBlocker }
      : {}),
    disposition: candidate.disposition,
    ...(evidenceLines.length > 0 ? { evidenceLines } : {}),
    issueId: candidate.issueId,
    issueKind: candidate.issueKind,
    justification: candidate.justification,
    ...(candidate.outcome === "cleared" ||
    candidate.outcome === "risk-accepted" ||
    candidate.outcome === "still-blocked"
      ? { outcome: candidate.outcome }
      : {}),
    packageId: candidate.packageId,
    recordedAt: candidate.recordedAt,
    receiptId: candidate.receiptId,
    recoveryAction: candidate.recoveryAction,
    ...(isWorkDesignBlockerRecoveryActionId(candidate.recoveryActionId)
      ? { recoveryActionId: candidate.recoveryActionId }
      : {}),
    sourceRef: candidate.sourceRef,
  };
}

export function isWorkDesignBlockerIssueKind(
  value: unknown,
): value is WorkDesignBlockerIssueKind {
  return (
    value === "context_snapshot_attach_failed" ||
    value === "partial_apply_inconsistent" ||
    value === "receipt_persist_failed" ||
    value === "tree_snapshot_persist_failed"
  );
}

export function isWorkDesignBlockerRecoveryActionId(
  value: unknown,
): value is WorkDesignBlockerRecoveryActionId {
  return (
    value === "accept-risk" ||
    value === "attach-snapshot" ||
    value === "complete-missing-step" ||
    value === "inspect-apply-state" ||
    value === "keep-blocked" ||
    value === "link-existing-receipt" ||
    value === "rebuild-tree-snapshot" ||
    value === "rerun-apply" ||
    value === "rollback-apply"
  );
}

export function normalizeWorkDesignPersistedSession(
  value: unknown,
  packageId: string,
): WorkDesignPersistedSession | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<WorkDesignPersistedSession>;

  if (
    candidate.schemaVersion !== 2 ||
    candidate.packageId !== packageId ||
    typeof candidate.workDesignSessionId !== "string"
  ) {
    return null;
  }

  const contextCandidate =
    candidate.context && typeof candidate.context === "object"
      ? candidate.context
      : null;
  const sessions = Array.isArray(contextCandidate?.sessions)
    ? contextCandidate.sessions
        .map(normalizeWorkDesignContextSavedSession)
        .filter((session): session is WorkDesignContextSavedSession =>
          Boolean(session),
        )
    : [];
  const current = normalizeWorkDesignContextSavedSession(
    contextCandidate?.current,
  );
  const briefVersions = Array.isArray(candidate.briefVersions)
    ? candidate.briefVersions
        .map(normalizeWorkDesignBriefVersion)
        .filter((version): version is WorkDesignBriefVersion =>
          Boolean(version),
        )
    : [];
  const treeDraft = normalizeWorkDesignTreeDraftSnapshot(candidate.treeDraft);
  const reviewCandidate: Partial<WorkDesignPersistedSession["review"]> =
    candidate.review && typeof candidate.review === "object"
      ? candidate.review
      : {};
  const applyCandidate: Partial<WorkDesignPersistedSession["apply"]> =
    candidate.apply && typeof candidate.apply === "object"
      ? candidate.apply
      : {};

  if (
    typeof reviewCandidate.draftReviewAccepted !== "boolean" ||
    typeof reviewCandidate.draftValidationAccepted !== "boolean" ||
    typeof applyCandidate.applyReceiptRecorded !== "boolean"
  ) {
    return null;
  }

  const blocker = normalizeWorkDesignBlockerDispositionReceipt(
    candidate.blocker,
  );
  const applyReceiptId =
    typeof applyCandidate.receiptId === "string"
      ? applyCandidate.receiptId
      : null;

  return {
    activeBriefVersionId:
      typeof candidate.activeBriefVersionId === "string"
        ? candidate.activeBriefVersionId
        : null,
    apply: {
      applyReceiptRecorded:
        applyCandidate.applyReceiptRecorded && Boolean(applyReceiptId),
      applyRunStartedAt:
        typeof applyCandidate.applyRunStartedAt === "string"
          ? applyCandidate.applyRunStartedAt
          : null,
      applyViewOpenedAt:
        typeof applyCandidate.applyViewOpenedAt === "string"
          ? applyCandidate.applyViewOpenedAt
          : null,
      draftRef:
        typeof applyCandidate.draftRef === "string"
          ? applyCandidate.draftRef
          : null,
      receiptId: applyReceiptId,
      snapshotStatus:
        typeof applyCandidate.snapshotStatus === "string"
          ? applyCandidate.snapshotStatus
          : null,
      targetRecordRef:
        typeof applyCandidate.targetRecordRef === "string"
          ? applyCandidate.targetRecordRef
          : null,
    },
    blocker,
    briefVersions,
    context: {
      current,
      finalizedFingerprint:
        typeof contextCandidate?.finalizedFingerprint === "string"
          ? contextCandidate.finalizedFingerprint
          : null,
      loadedSessionId:
        typeof contextCandidate?.loadedSessionId === "string"
          ? contextCandidate.loadedSessionId
          : null,
      sessions,
    },
    lastSavedAt:
      typeof candidate.lastSavedAt === "string"
        ? candidate.lastSavedAt
        : new Date().toISOString(),
    packageId,
    review: {
      draftReviewAccepted: reviewCandidate.draftReviewAccepted,
      draftValidationAccepted: reviewCandidate.draftValidationAccepted,
    },
    schemaVersion: 2,
    treeDraft,
    workDesignSessionId: candidate.workDesignSessionId,
  };
}

function normalizeWorkDesignStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0,
  );
}
