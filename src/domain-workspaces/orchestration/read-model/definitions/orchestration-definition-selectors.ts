import type {
  OrchestrationDefinitionFilters,
  OrchestrationDefinitionLifecycle,
  OrchestrationDefinitionPosture,
  OrchestrationDefinitionRecord,
  OrchestrationDefinitionSummaryMetric,
} from "../../domain/orchestration-definition-types.ts";

export const defaultOrchestrationDefinitionFilters: OrchestrationDefinitionFilters =
  {
    classification: "all",
    query: "",
    recordState: "all",
    sourceDomain: "all",
  };

export function orchestrationDefinitionSummary(
  records: readonly OrchestrationDefinitionRecord[],
): OrchestrationDefinitionSummaryMetric[] {
  const count = (lifecycles: readonly OrchestrationDefinitionLifecycle[]) =>
    records.filter(
      (record) =>
        record.lifecycle !== null && lifecycles.includes(record.lifecycle),
    ).length;

  return [
    {
      id: "candidates",
      label: "Candidates",
      tone: "info",
      value: String(count(["candidate"])),
    },
    {
      id: "qualified",
      label: "Qualified",
      tone: "info",
      value: String(count(["qualified"])),
    },
    {
      id: "ready",
      label: "Ready",
      tone: "ok",
      value: String(count(["definition-ready"])),
    },
    {
      id: "in-review",
      label: "In Review",
      tone: "warn",
      value: String(count(["implementation-requested", "admission-review"])),
    },
    {
      id: "active",
      label: "Active",
      tone: "ok",
      value: String(count(["active"])),
    },
  ];
}

export function filterOrchestrationDefinitions(
  records: readonly OrchestrationDefinitionRecord[],
  filters: OrchestrationDefinitionFilters,
) {
  const query = filters.query.trim().toLowerCase();

  return records.filter((record) => {
    const matchesQuery =
      !query ||
      [
        record.definitionId,
        record.executionOwner,
        record.implementationRepo,
        record.purpose,
        record.sourceDomain,
        record.title,
      ].some((value) => value.toLowerCase().includes(query));
    const matchesClassification =
      filters.classification === "all" ||
      (filters.classification === "unclassified"
        ? record.classification === null
        : record.classification === filters.classification);
    const matchesState =
      filters.recordState === "all" ||
      (filters.recordState === "qualification"
        ? record.lifecycle === null
        : record.lifecycle === filters.recordState);
    const matchesSource =
      filters.sourceDomain === "all" ||
      record.sourceDomain === filters.sourceDomain;

    return (
      matchesQuery && matchesClassification && matchesState && matchesSource
    );
  });
}

export function selectOrchestrationDefinition(
  records: readonly OrchestrationDefinitionRecord[],
  selectedId: string | null,
) {
  return (
    records.find((record) => record.id === selectedId) ?? records[0] ?? null
  );
}

export function orchestrationDefinitionPosture(
  record: OrchestrationDefinitionRecord,
): OrchestrationDefinitionPosture {
  if (record.lifecycle === null) {
    if (record.qualification.status === "in-progress") {
      return {
        detail: "Qualification is still being prepared.",
        label: "Under qualification",
        tone: "warn",
      };
    }

    return {
      detail:
        record.classification === "conditional"
          ? "The operation remains synchronous until its recorded reevaluation condition occurs."
          : "The operation stays synchronous and outside the durable definition lifecycle.",
      label:
        record.classification === "conditional" ? "Conditional" : "Synchronous",
      tone: "muted",
    };
  }

  switch (record.lifecycle) {
    case "candidate":
      return {
        detail: "Complete qualification before definition authoring begins.",
        label: "Candidate",
        tone: "warn",
      };
    case "qualified":
      return {
        detail:
          "The durable need is accepted; the definition contract is next.",
        label: "Qualified",
        tone: "info",
      };
    case "definition-ready":
      return {
        detail: "The contract can be routed for implementation review.",
        label: "Definition ready",
        tone: "ok",
      };
    case "implementation-requested":
      return {
        detail: "Implementation work has been requested and awaits evidence.",
        label: "Implementation requested",
        tone: "info",
      };
    case "admission-review":
      return {
        detail:
          "Implementation, validation, platform, security, and runtime evidence are under review.",
        label: "Admission review",
        tone: "warn",
      };
    case "active":
      return {
        detail:
          record.source.mode === "synthetic-scenario"
            ? "Synthetic lifecycle coverage only; no live definition is admitted."
            : "This immutable definition version is admitted for new runs.",
        label: "Active",
        tone: record.source.mode === "synthetic-scenario" ? "info" : "ok",
      };
    case "suspended":
      return {
        detail: "No new runs may start from this retained version.",
        label: "Suspended",
        tone: "warn",
      };
    case "retired":
      return {
        detail:
          "The immutable definition remains available as historical evidence.",
        label: "Retired",
        tone: "muted",
      };
  }
}

export function orchestrationDefinitionRequiredMove(
  record: OrchestrationDefinitionRecord,
) {
  if (record.lifecycle === null) {
    return record.qualification.status === "in-progress"
      ? "Complete qualification"
      : "Review qualification record";
  }

  switch (record.lifecycle) {
    case "candidate":
      return "Complete qualification";
    case "qualified":
      return "Complete definition";
    case "definition-ready":
      return "Request implementation";
    case "implementation-requested":
      return "Prepare admission evidence";
    case "admission-review":
      return "Resolve admission checks";
    case "active":
      return "Review immutable version";
    case "suspended":
      return "Review suspension posture";
    case "retired":
      return "Review retained definition";
  }
}
