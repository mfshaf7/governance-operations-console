import type {
  PrototypeRecord,
  PrototypeSupportRow,
} from "../../../read-model/prototype-workspace-read-model.ts";
import {
  type PrototypeLandingDraft,
  type PrototypeLandingPlan,
  prototypeLandingSetupTone,
  prototypePreviewNeedLabel,
  prototypeSourceHomeLabel,
} from "../../../work-model/workflows/landing/prototype-landing-model.ts";
import { prototypeBasePlatformLabel } from "@/domain-workspaces/prototype/domain/support/prototype-setup-profile-model";
import type {
  PrototypeLandingChecklistRow,
  PrototypeLandingRunLogRow,
} from "./prototype-landing-types.ts";
import type { OperationCommandRunEvent } from "@/domain-workspaces/operation-runtime";

export function prototypeLandingRunChecklistRows({
  landingBlocked,
  landingPlan,
  landingRunComplete,
  record,
  setupItemsDraft,
  supportRowsDraft,
}: {
  landingBlocked: boolean;
  landingPlan: PrototypeLandingPlan;
  landingRunComplete: boolean;
  record: PrototypeRecord;
  setupItemsDraft: string[];
  supportRowsDraft: PrototypeSupportRow[];
}): PrototypeLandingChecklistRow[] {
  const blockedSupport = supportRowsDraft.filter(
    (row) => row.state === "blocked",
  ).length;
  const openSupport = supportRowsDraft.filter(
    (row) => row.state === "needed" || row.state === "unknown",
  ).length;
  const landingRunRecorded =
    Boolean(record.landing.lastLandingReceiptRef) ||
    record.landing.state === "blocked" ||
    record.landing.state === "landed";
  const entryBlockers = landingRunRecorded
    ? record.landing.blockedItems
    : landingPlan.blockedItems;
  const entryBlocked = entryBlockers.length > 0;
  const setupItemsPlanned = setupItemsDraft.length > 0;
  const previewAssigned = landingPlan.previewLaunchAdapter !== "unassigned";
  const receiptRef =
    record.landing.lastLandingReceiptRef ??
    `local-receipts/${record.id}-landing.json`;
  const rows: Array<Omit<PrototypeLandingChecklistRow, "index">> = [
    {
      detail: entryBlocked
        ? `${entryBlockers.join(" / ")} must be resolved before clean landing.`
        : `${record.sourceRef} retained for ${landingPlan.owner}.`,
      id: "run-entry",
      label: "Prototype record",
      status: entryBlocked ? "blocked" : landingRunComplete ? "done" : "ready",
      tone: entryBlocked ? "warn" : landingRunComplete ? "ok" : "info",
    },
    {
      detail: `${openSupport} open / ${blockedSupport} blocked`,
      id: "run-support",
      label: "Support profile",
      status:
        blockedSupport > 0 ? "blocked" : landingRunComplete ? "done" : "ready",
      tone: blockedSupport > 0 ? "warn" : landingRunComplete ? "ok" : "info",
    },
    {
      detail: `${prototypeBasePlatformLabel(landingPlan.basePlatform)} / ${supportRowsDraft.length} support rows`,
      id: "run-setup",
      label: "Setup plan",
      status: setupItemsPlanned
        ? landingRunComplete
          ? "done"
          : "pending"
        : "skipped",
      tone: setupItemsPlanned
        ? landingRunComplete
          ? "ok"
          : prototypeLandingSetupTone(landingPlan.basePlatform)
        : "muted",
    },
    {
      detail: landingPlan.previewCommand,
      id: "run-preview",
      label: "Preview seed",
      status: previewAssigned
        ? landingRunComplete
          ? "done"
          : "pending"
        : "open",
      tone: previewAssigned ? (landingRunComplete ? "ok" : "info") : "warn",
    },
    {
      detail: `${landingPlan.validationPlan.length} checks / ${landingPlan.requiredEvidence.length} evidence refs`,
      id: "run-validation",
      label: "Validation plan",
      status: landingRunComplete ? "done" : "pending",
      tone: landingRunComplete ? "ok" : "info",
    },
    {
      detail: receiptRef,
      id: "run-receipt",
      label: "Landing receipt",
      status: landingRunRecorded
        ? record.landing.state === "blocked" || landingBlocked
          ? "blocked"
          : "recorded"
        : landingRunComplete
          ? "ready"
          : "pending",
      tone: landingRunRecorded
        ? record.landing.state === "blocked" || landingBlocked
          ? "warn"
          : "ok"
        : landingRunComplete
          ? "info"
          : "warn",
    },
  ];

  return prototypeLandingIndexedRows(rows);
}

export function prototypeLandingSetupPlanRows({
  landingPlan,
  record,
  setupItemsDraft,
  supportRowsDraft,
}: {
  landingPlan: PrototypeLandingPlan;
  record: PrototypeRecord;
  setupItemsDraft: string[];
  supportRowsDraft: PrototypeSupportRow[];
}): PrototypeLandingChecklistRow[] {
  const docsItemCount = setupItemsDraft.filter((item) =>
    [
      "backlog",
      "brief",
      "change log",
      "decision log",
      "design profile",
    ].includes(item),
  ).length;
  const fixtureNeeded = supportRowsDraft.some(
    (row) => row.id === "interface" && row.state !== "not-needed",
  );
  const previewNeeded = supportRowsDraft.some(
    (row) => row.id === "runtime" && row.state !== "not-needed",
  );
  const integrationNeeded = supportRowsDraft.some(
    (row) => row.id === "integration" && row.state !== "not-needed",
  );
  const rows: Array<Omit<PrototypeLandingChecklistRow, "index">> = [
    {
      detail: `${docsItemCount} docs plus registry record.`,
      id: "setup-registry-docs",
      label: "Registry and docs",
      status: "planned",
      tone: "info",
    },
    {
      detail: prototypeSourceHomeLabel(landingPlan.sourceHome),
      id: "setup-source-home",
      label: "Source home",
      status: prototypeBasePlatformLabel(landingPlan.basePlatform),
      tone: prototypeLandingSetupTone(landingPlan.basePlatform),
    },
    {
      detail: fixtureNeeded
        ? "Scenario fixture is planned for visible review."
        : "No fixture setup required.",
      id: "setup-fixture",
      label: "Scenario data",
      status: fixtureNeeded ? "planned" : "not needed",
      tone: fixtureNeeded ? "info" : "muted",
    },
    {
      detail: landingPlan.previewCommand,
      id: "setup-preview",
      label: "Preview seed",
      status: previewNeeded ? landingPlan.previewLaunchAdapter : "not needed",
      tone: previewNeeded
        ? landingPlan.previewLaunchAdapter === "unassigned"
          ? "warn"
          : "info"
        : "muted",
    },
    {
      detail: `${landingPlan.validationPlan.length} checks retained for later proof.`,
      id: "setup-validation",
      label: "Validation plan",
      status: "retained",
      tone: "info",
    },
    {
      detail: integrationNeeded
        ? "Integration boundary draft is planned."
        : "No integration boundary setup.",
      id: "setup-integration",
      label: "Integration",
      status: integrationNeeded ? "planned" : "not needed",
      tone: integrationNeeded ? "warn" : "muted",
    },
  ];

  if (record.landing.blockedItems.length > 0) {
    rows.push({
      detail: record.landing.blockedItems.join(" / "),
      id: "setup-landing-blocker",
      label: "Landing blocker",
      status: "blocked",
      tone: "warn",
    });
  }

  return prototypeLandingIndexedRows(rows);
}

export function prototypeLandingRunLogRows({
  basePlatformDraft,
  landingDraftDirty,
  landingRunComplete,
  landingPlan,
  record,
  runEvents,
  setupItemsDraft,
  supportRowsDraft,
}: {
  basePlatformDraft: PrototypeLandingDraft["basePlatform"];
  landingDraftDirty: boolean;
  landingRunComplete: boolean;
  landingPlan: PrototypeLandingPlan;
  record: PrototypeRecord;
  runEvents?: readonly OperationCommandRunEvent[];
  setupItemsDraft: string[];
  supportRowsDraft: PrototypeSupportRow[];
}): PrototypeLandingRunLogRow[] {
  if (runEvents && runEvents.length > 0) {
    return runEvents.map((event) => ({
      detail: event.summary,
      formattedTimestamp: `run ${String(event.sequence).padStart(2, "0")}`,
      marker: prototypeLandingRunEventMarker(event.state),
      timestamp: event.occurredAt,
      tone: prototypeLandingRunEventTone(event.state),
    }));
  }

  const blockedSupport = supportRowsDraft.filter(
    (row) => row.state === "blocked",
  ).length;
  const openSupport = supportRowsDraft.filter(
    (row) => row.state === "needed" || row.state === "unknown",
  ).length;
  const readySupport = supportRowsDraft.length - blockedSupport - openSupport;
  const hasLandingBlockers = landingPlan.hasLandingBlockers;
  const pendingMarker = landingRunComplete ? "DONE" : "PEND";
  const rows: Array<
    Omit<PrototypeLandingRunLogRow, "formattedTimestamp" | "timestamp">
  > = [
    {
      detail: `Entry packet keeps ${record.sourceRef} as source for ${landingPlan.owner}.`,
      marker: pendingMarker,
      tone: landingRunComplete ? "ok" : "info",
    },
    {
      detail: `${readySupport}/${supportRowsDraft.length} support rows ready; ${openSupport} open and ${blockedSupport} blocked.`,
      marker: landingRunComplete
        ? blockedSupport > 0
          ? "FAIL"
          : "DONE"
        : "PEND",
      tone: landingRunComplete
        ? blockedSupport > 0
          ? "warn"
          : "ok"
        : hasLandingBlockers
          ? "warn"
          : "info",
    },
    {
      detail: `${prototypeSourceHomeLabel(landingPlan.sourceHome)} / ${prototypeBasePlatformLabel(basePlatformDraft)} setup plan.`,
      marker: landingRunComplete
        ? basePlatformDraft === "custom-unassigned"
          ? "PEND"
          : "DONE"
        : "PEND",
      tone: landingRunComplete
        ? prototypeLandingSetupTone(basePlatformDraft)
        : "info",
    },
    {
      detail:
        setupItemsDraft.length > 0
          ? `${setupItemsDraft.length} setup item${setupItemsDraft.length === 1 ? "" : "s"} projected for local setup.`
          : "No setup item is listed.",
      marker: landingRunComplete
        ? setupItemsDraft.length > 0
          ? "DONE"
          : "PEND"
        : "PEND",
      tone: landingRunComplete
        ? setupItemsDraft.length > 0
          ? "ok"
          : "warn"
        : "info",
    },
    {
      detail: `${prototypePreviewNeedLabel(landingPlan.previewNeed)} seeds ${landingPlan.previewLaunchAdapter} preview runtime.`,
      marker: landingRunComplete
        ? landingPlan.previewLaunchAdapter === "unassigned"
          ? "PEND"
          : "DONE"
        : "PEND",
      tone: landingRunComplete
        ? landingPlan.previewLaunchAdapter === "unassigned"
          ? "warn"
          : "ok"
        : "info",
    },
    {
      detail: `${landingPlan.validationPlan.length} validation check${landingPlan.validationPlan.length === 1 ? "" : "s"} and ${landingPlan.requiredEvidence.length} evidence ref${landingPlan.requiredEvidence.length === 1 ? "" : "s"} retained as plan.`,
      marker: pendingMarker,
      tone: landingRunComplete ? "ok" : "info",
    },
    {
      detail: hasLandingBlockers
        ? "Blocked landing result will keep Candidate Promotion closed."
        : "No blocked support or entry blocker.",
      marker: landingRunComplete
        ? hasLandingBlockers
          ? "FAIL"
          : "DONE"
        : "PEND",
      tone: landingRunComplete
        ? hasLandingBlockers
          ? "warn"
          : "ok"
        : hasLandingBlockers
          ? "warn"
          : "info",
    },
    {
      detail: record.landing.lastLandingReceiptRef
        ? `Existing receipt: ${record.landing.lastLandingReceiptRef}.`
        : landingRunComplete
          ? `Footer can record ${`local-receipts/${record.id}-landing.json`}.`
          : landingDraftDirty
            ? "Run the changed draft before footer recording."
            : `Run Landing to prepare ${`local-receipts/${record.id}-landing.json`}.`,
      marker: record.landing.lastLandingReceiptRef ? "DONE" : "PEND",
      tone: record.landing.lastLandingReceiptRef
        ? "ok"
        : landingRunComplete
          ? "info"
          : "warn",
    },
  ];

  return rows.map((row, index) => ({
    ...row,
    formattedTimestamp: `plan ${String(index + 1).padStart(2, "0")}`,
    timestamp: "",
  }));
}

function prototypeLandingRunEventMarker(
  state: OperationCommandRunEvent["state"],
) {
  switch (state) {
    case "completed":
      return "DONE";
    case "blocked":
    case "failed":
    case "stale":
      return "FAIL";
    case "canceled":
      return "STOP";
    case "accepted":
    case "queued":
    case "running":
    case "unknown":
      return "RUN";
  }
}

function prototypeLandingRunEventTone(
  state: OperationCommandRunEvent["state"],
) {
  switch (state) {
    case "completed":
      return "ok" as const;
    case "blocked":
    case "failed":
    case "stale":
      return "warn" as const;
    case "canceled":
    case "unknown":
      return "muted" as const;
    case "accepted":
    case "queued":
    case "running":
      return "info" as const;
  }
}

function prototypeLandingIndexedRows(
  rows: Array<Omit<PrototypeLandingChecklistRow, "index">>,
): PrototypeLandingChecklistRow[] {
  return rows.map((row, index) => ({
    ...row,
    index: String(index + 1).padStart(2, "0"),
  }));
}
