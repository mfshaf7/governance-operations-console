import type {
  OrchestrationRunFilters,
  OrchestrationRunPosture,
  OrchestrationRunRecord,
  OrchestrationRunSummaryMetric,
} from "../../domain/orchestration-run-types.ts";

export const defaultOrchestrationRunFilters: OrchestrationRunFilters = {
  definitionId: "all",
  query: "",
  sourceDomain: "all",
  state: "all",
};

export function orchestrationRunSummary(
  runs: readonly OrchestrationRunRecord[],
): OrchestrationRunSummaryMetric[] {
  const count = (...states: OrchestrationRunRecord["state"][]) =>
    runs.filter((run) => states.includes(run.state)).length;

  return [
    {
      id: "active",
      label: "Active",
      tone: "info",
      value: String(count("queued", "running")),
    },
    {
      id: "waiting",
      label: "Waiting",
      tone: "warn",
      value: String(count("waiting")),
    },
    {
      id: "blocked",
      label: "Blocked",
      tone: "danger",
      value: String(count("blocked")),
    },
    {
      id: "failed",
      label: "Failed",
      tone: "danger",
      value: String(count("failed")),
    },
    {
      id: "completed",
      label: "Completed",
      tone: "ok",
      value: String(count("completed")),
    },
  ];
}

export function filterOrchestrationRuns(
  runs: readonly OrchestrationRunRecord[],
  filters: OrchestrationRunFilters,
) {
  const query = filters.query.trim().toLowerCase();

  return runs.filter((run) => {
    const currentNode = run.nodes.find((node) => node.id === run.currentNodeId);
    const matchesQuery =
      !query ||
      [
        currentNode?.label ?? "",
        run.definitionId,
        run.requestId,
        run.runId,
        run.sourceDomain,
        run.sourceRecordRef,
      ].some((value) => value.toLowerCase().includes(query));

    return (
      matchesQuery &&
      (filters.state === "all" || run.state === filters.state) &&
      (filters.definitionId === "all" ||
        run.definitionId === filters.definitionId) &&
      (filters.sourceDomain === "all" ||
        run.sourceDomain === filters.sourceDomain)
    );
  });
}

export function selectOrchestrationRun(
  runs: readonly OrchestrationRunRecord[],
  selectedId: string | null,
) {
  return runs.find((run) => run.id === selectedId) ?? runs[0] ?? null;
}

export function orchestrationRunPosture(
  run: OrchestrationRunRecord,
): OrchestrationRunPosture {
  switch (run.state) {
    case "queued":
      return {
        detail: "The synthetic request is accepted and awaiting scheduling.",
        label: "Queued",
        tone: "info",
      };
    case "running":
      return {
        detail: "The synthetic run is executing its current node.",
        label: "Running",
        tone: "info",
      };
    case "waiting":
      return {
        detail:
          run.wait?.reason ?? "The synthetic run is in a structured wait.",
        label: "Waiting",
        tone: "warn",
      };
    case "blocked":
      return {
        detail:
          run.blocker?.detail ?? "The synthetic run requires remediation.",
        label: "Blocked",
        tone: "danger",
      };
    case "failed":
      return {
        detail: run.failure?.detail ?? "The synthetic run failed.",
        label: "Failed",
        tone: "danger",
      };
    case "completed":
      return {
        detail: "The synthetic final result and retained effects are verified.",
        label: "Completed",
        tone: "ok",
      };
    case "cancelled":
      return {
        detail:
          "The synthetic run is terminal; cancellation did not roll back retained effects.",
        label: "Cancelled",
        tone: "muted",
      };
  }
}

export function orchestrationRunRequiredMove(run: OrchestrationRunRecord) {
  switch (run.state) {
    case "queued":
      return "Monitor scheduling";
    case "running":
      return "Monitor current node";
    case "waiting":
      return run.wait?.requiresOperatorAction
        ? "Provide required input"
        : "Monitor structured wait";
    case "blocked":
      return run.blocker?.remediation ?? "Resolve blocker";
    case "failed":
      return run.retry.available ? "Review and retry" : "Correct at source";
    case "completed":
      return "Review final receipt";
    case "cancelled":
      return "Review retained effects";
  }
}

export function orchestrationRunAvailableControls(run: OrchestrationRunRecord) {
  return run.controls.filter((control) => control.available);
}

export function orchestrationAttentionRuns(
  runs: readonly OrchestrationRunRecord[],
  now: string,
) {
  const nowTimestamp = Date.parse(now);

  return runs.filter((run) => {
    if (run.state === "blocked" || run.state === "failed") {
      return true;
    }

    if (run.state !== "waiting" || !run.wait) {
      return false;
    }

    const deadline = run.wait.deadline
      ? Date.parse(run.wait.deadline)
      : Number.POSITIVE_INFINITY;

    return run.wait.requiresOperatorAction || deadline < nowTimestamp;
  });
}

export function orchestrationInFlightRuns(
  runs: readonly OrchestrationRunRecord[],
  now: string,
) {
  const nowTimestamp = Date.parse(now);

  return runs.filter(
    (run) =>
      run.state === "queued" ||
      run.state === "running" ||
      (run.state === "waiting" &&
        !run.wait?.requiresOperatorAction &&
        (!run.wait?.deadline || Date.parse(run.wait.deadline) >= nowTimestamp)),
  );
}

export function orchestrationMaterialEvents(
  runs: readonly OrchestrationRunRecord[],
) {
  return runs
    .flatMap((run) =>
      run.events.map((event) => ({
        ...event,
        definitionId: run.definitionId,
        runId: run.runId,
      })),
    )
    .filter((event) => event.material)
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
}
