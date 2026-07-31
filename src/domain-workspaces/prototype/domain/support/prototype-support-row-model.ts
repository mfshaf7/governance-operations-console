import type {
  PrototypeDataMode,
  PrototypeMutationBoundary,
  PrototypePreviewNeed,
  PrototypeSourceHome,
  PrototypeSupportAreaId,
  PrototypeSupportProfile,
  PrototypeSupportRow,
  PrototypeSupportState,
  PrototypeVisibilityTier,
} from "../prototype-types.ts";
import {
  prototypeSupportProfileIsCustom,
  prototypeSupportStateTone,
} from "./prototype-support-profile-options.ts";

export type PrototypeSupportProfileInput = {
  dataMode: PrototypeDataMode;
  mutationBoundary: PrototypeMutationBoundary;
  previewNeed: PrototypePreviewNeed;
  sourceContext: string;
  sourceHome: PrototypeSourceHome;
  supportProfile: PrototypeSupportProfile;
  visibilityTier: PrototypeVisibilityTier;
};

export function prototypeSupportRowsForProfileView({
  rows,
  supportProfile,
}: {
  rows: PrototypeSupportRow[];
  supportProfile: PrototypeSupportProfile;
}) {
  if (prototypeSupportProfileIsCustom(supportProfile)) {
    return rows;
  }

  const relevantIds = prototypeSupportProfileRelevantAreaIds(supportProfile);

  return rows.filter(
    (row) =>
      relevantIds.has(row.id) ||
      row.state === "blocked" ||
      row.state === "needed" ||
      row.state === "unknown",
  );
}

export function prototypeSupportRowWithState(
  row: PrototypeSupportRow,
  state: PrototypeSupportState,
): PrototypeSupportRow {
  return {
    ...row,
    state,
    tone: prototypeSupportStateTone(state),
  };
}

export function prototypeSupportRowsFromInputs({
  dataMode,
  mutationBoundary,
  previewNeed,
  sourceContext,
  sourceHome,
  supportProfile,
  visibilityTier,
}: PrototypeSupportProfileInput): PrototypeSupportRow[] {
  const hasSourceContext = sourceContext.trim().length > 0;
  const hardBlocked =
    dataMode === "real-mutable" || mutationBoundary === "real-system";
  const hasInterfaceNeed =
    supportProfile === "custom-support" ||
    supportProfile === "interactive-prototype" ||
    supportProfile === "local-runtime" ||
    supportProfile === "external-dependency";
  const hasRuntimeNeed =
    supportProfile === "local-runtime" ||
    previewNeed === "local-backend-stub" ||
    previewNeed === "local-dev-server" ||
    previewNeed === "prototype-devint" ||
    previewNeed === "future-dev-integration";
  const hasExternalNeed =
    supportProfile === "external-dependency" ||
    mutationBoundary === "external-sandbox" ||
    mutationBoundary === "read-only" ||
    mutationBoundary === "real-system";
  const clientVisible =
    visibilityTier === "client-review" || visibilityTier === "public-demo";

  return [
    supportRow(
      "source",
      "Source",
      hasSourceContext ? "ready" : "needed",
      hasSourceContext ? "Origin context captured" : "Origin context needed",
      hasSourceContext
        ? "Landing has enough source context to create a local prototype record."
        : "Capture the origin, useful context, or source reference before baseline decisions.",
    ),
    supportRow(
      "studio-home",
      "Studio home",
      sourceHome === "future-owner-repo" ? "needed" : "ready",
      studioHomeSummary(sourceHome),
      "Decides where docs, fixtures, source, or custody notes belong during incubation.",
    ),
    supportRow(
      "interface",
      "Interface",
      supportProfile === "custom-support"
        ? "unknown"
        : supportProfile === "simple-prototype"
          ? "unknown"
          : supportProfile === "existing-source-review"
            ? "needed"
            : hasInterfaceNeed
              ? "needed"
              : "not-needed",
      interfaceSummary(supportProfile),
      "Describes whether the prototype needs visible UI, command, API, workflow, or review surface support.",
    ),
    supportRow(
      "runtime",
      "Runtime",
      previewNeed === "none"
        ? "not-needed"
        : hasRuntimeNeed
          ? "needed"
          : "ready",
      runtimeSummary(previewNeed),
      "Decides the minimum way an operator can open, run, or preview the work locally.",
    ),
    supportRow(
      "data",
      "Data",
      dataMode === "real-mutable"
        ? "blocked"
        : dataMode === "real-readonly"
          ? "needed"
          : "ready",
      dataSummary(dataMode),
      "Controls whether mock, synthetic, real read-only, or real mutable data is allowed.",
    ),
    supportRow(
      "integration",
      "Integration",
      mutationBoundary === "real-system"
        ? "blocked"
        : hasExternalNeed
          ? "needed"
          : "not-needed",
      integrationSummary(mutationBoundary, supportProfile),
      "Keeps external reads, sandbox writes, real-system mutation, and adapter boundaries explicit.",
    ),
    supportRow(
      "tooling",
      "Tooling",
      "needed",
      "Minimum run and check path",
      "Records the install, start, preview, fixture, smoke, or validation commands needed for continuation.",
    ),
    supportRow(
      "evidence",
      "Evidence",
      "needed",
      "Prototype records and proof path",
      "Identifies brief, backlog, decision log, change log, design profile, validation proof, and receipts.",
    ),
    supportRow(
      "visibility",
      "Visibility",
      clientVisible ? "needed" : "ready",
      visibilitySummary(visibilityTier),
      "Keeps private, operator-review, client-review, and public-demo exposure requirements explicit.",
    ),
    supportRow(
      "recovery",
      "Recovery",
      hardBlocked ? "blocked" : "ready",
      hardBlocked ? "Landing has hard blockers" : "Recovery path available",
      hardBlocked
        ? "Resolve real mutable data or real-system mutation before promotion work continues."
        : "Landing can record missing support as needed items and route the first required move.",
    ),
  ];
}

function supportRow(
  id: PrototypeSupportRow["id"],
  label: string,
  state: PrototypeSupportState,
  summary: string,
  detail: string,
): PrototypeSupportRow {
  return {
    detail,
    id,
    label,
    state,
    summary,
    tone: prototypeSupportStateTone(state),
  };
}

function studioHomeSummary(value: PrototypeSourceHome) {
  switch (value) {
    case "app-folder":
      return "Use an app folder";
    case "console-domain-module":
      return "Use a console domain module";
    case "docs-only":
      return "Docs-only incubation";
    case "existing-source":
      return "Review existing source custody";
    case "future-owner-repo":
      return "Future owner repo candidate";
    case "new-prototype-folder":
      return "Create a new prototype folder";
  }
}

function interfaceSummary(value: PrototypeSupportProfile) {
  switch (value) {
    case "custom-support":
      return "Manual support map";
    case "existing-source-review":
      return "Inspect current surface";
    case "external-dependency":
      return "Surface plus boundary cues";
    case "interactive-prototype":
      return "Visible interaction expected";
    case "local-runtime":
      return "Runtime-backed interaction expected";
    case "simple-prototype":
      return "Shape still open";
  }
}

function prototypeSupportProfileRelevantAreaIds(
  value: PrototypeSupportProfile,
): Set<PrototypeSupportAreaId> {
  switch (value) {
    case "custom-support":
      return new Set([
        "data",
        "evidence",
        "integration",
        "interface",
        "recovery",
        "runtime",
        "source",
        "studio-home",
        "tooling",
        "visibility",
      ]);
    case "existing-source-review":
      return new Set([
        "data",
        "evidence",
        "integration",
        "interface",
        "source",
        "studio-home",
        "tooling",
      ]);
    case "external-dependency":
      return new Set([
        "data",
        "evidence",
        "integration",
        "interface",
        "runtime",
        "source",
        "studio-home",
        "tooling",
      ]);
    case "interactive-prototype":
      return new Set([
        "data",
        "evidence",
        "interface",
        "runtime",
        "source",
        "studio-home",
        "tooling",
        "visibility",
      ]);
    case "local-runtime":
      return new Set([
        "data",
        "evidence",
        "interface",
        "runtime",
        "source",
        "studio-home",
        "tooling",
      ]);
    case "simple-prototype":
      return new Set(["evidence", "source", "studio-home", "tooling"]);
  }
}

function runtimeSummary(value: PrototypePreviewNeed) {
  switch (value) {
    case "future-dev-integration":
      return "Future dev-integration profile";
    case "local-backend-stub":
      return "Local API needed";
    case "local-dev-server":
      return "Local dev server needed";
    case "none":
      return "No runtime preview";
    case "prototype-devint":
      return "Prototype dev-integration preview";
    case "static-review":
      return "Static review path";
  }
}

function dataSummary(value: PrototypeDataMode) {
  switch (value) {
    case "mock":
      return "Mock data only";
    case "real-mutable":
      return "Real mutable data blocked";
    case "real-readonly":
      return "Real read-only evidence needed";
    case "synthetic":
      return "Synthetic data allowed";
  }
}

function integrationSummary(
  mutationBoundary: PrototypeMutationBoundary,
  supportProfile: PrototypeSupportProfile,
) {
  if (supportProfile === "external-dependency") {
    return "External boundary expected";
  }

  switch (mutationBoundary) {
    case "external-sandbox":
      return "External sandbox boundary";
    case "none":
      return "No integration boundary";
    case "prototype-local":
      return "Prototype-local mutation only";
    case "read-only":
      return "Read-only boundary";
    case "real-system":
      return "Real-system mutation blocked";
  }
}

function visibilitySummary(value: PrototypeVisibilityTier) {
  switch (value) {
    case "client-review":
      return "Client-safe review needed";
    case "operator-review":
      return "Operator review only";
    case "private-internal":
      return "Private internal";
    case "public-demo":
      return "Public-demo review needed";
  }
}
