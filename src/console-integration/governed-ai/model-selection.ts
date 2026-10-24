export type NativeModelEffort = string | boolean | null;
export type EffectiveModelSelection = Readonly<{
  revision: number;
  configuration_digest: string;
  task: string;
  selection_ref: string;
  attempts: ReadonlyArray<Readonly<{
    backend_id: string;
    model: string;
    effort: NativeModelEffort;
    outcome: string;
  }>>;
}>;

export function assertEffectiveModelSelection(
  value: unknown,
  task: string,
  successful = true,
): EffectiveModelSelection {
  const fail = () => { throw new Error("The model-selection evidence does not match this workflow."); };
  const object = (input: unknown): Record<string, unknown> => {
    if (!input || typeof input !== "object" || Array.isArray(input)) return fail();
    return input as Record<string, unknown>;
  };
  const exact = (input: Record<string, unknown>, keys: string[]) => {
    if (Object.keys(input).sort().join(",") !== keys.sort().join(",")) fail();
  };
  const text = (input: unknown, max = 300) => typeof input === "string" && input.length > 0 && input.length <= max;
  const source = object(value);
  exact(source, ["revision", "configuration_digest", "task", "selection_ref", "attempts"]);
  if (!Number.isSafeInteger(source.revision) || Number(source.revision) < 0 ||
      !/^sha256:[0-9a-f]{64}$/.test(String(source.configuration_digest)) ||
      source.task !== task || !/^ai-routing-selection:[0-9a-f]{64}$/.test(String(source.selection_ref)) ||
      !Array.isArray(source.attempts) || source.attempts.length > 5) fail();
  const attempts = source.attempts as unknown[];
  for (const item of attempts) {
    const attempt = object(item);
    exact(attempt, ["backend_id", "model", "effort", "outcome"]);
    if (!text(attempt.backend_id) || !text(attempt.model, 200) ||
        !(attempt.effort === null || typeof attempt.effort === "boolean" || text(attempt.effort, 200)) ||
        !/^[a-z][a-z0-9-]{0,100}$/.test(String(attempt.outcome))) fail();
  }
  if (successful && (!attempts.length ||
      object(attempts.at(-1)).outcome !== "suggestion-produced" ||
      attempts.slice(0, -1).some(item => !["provider-unavailable", "provider-busy"].includes(String(object(item).outcome))))) fail();
  return structuredClone(value) as EffectiveModelSelection;
}

export function modelEffortLabel(effort: NativeModelEffort): string {
  if (effort === null) return "Model default";
  if (typeof effort === "boolean") return effort ? "Thinking on" : "Thinking off";
  return effort.charAt(0).toUpperCase() + effort.slice(1);
}

export function effectiveModelLabel(value: EffectiveModelSelection): string {
  const last = value.attempts.at(-1);
  return last ? last.model + " · " + modelEffortLabel(last.effort) : "Completion unknown";
}
