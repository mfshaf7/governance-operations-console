export type RecentAiActivity = Readonly<{
  id: string;
  task: string;
  surface: string;
  subject: string;
  state: "working" | "completed" | "cancelled" | "failed" | "interrupted";
  occurredAt: string;
  detail: string;
  kind?: string | null;
  subjectRef?: string | null;
  receiptRef?: string | null;
  auditRef?: string | null;
  contextRef?: string | null;
  sessionRef?: string | null;
  errorCode?: string | null;
}>;

export type AiActivitySnapshot = Readonly<{
  mode: "live" | "disconnected-preview" | null;
  status: "current" | "loading" | "offline" | "stale";
  observedAt: string | null;
  items: readonly RecentAiActivity[];
  nextCursor: string | null;
  coverage: string;
  error: string | null;
}>;

export const aiActivityTasks: Readonly<Record<string, readonly [string, string]>> = {
  "assistant-response": ["Assistant request", "Agent Console"],
  "proposal-triage": ["Proposal triage assistance", "Proposal"],
  "proposal-disposition": ["Proposal disposition assistance", "Proposal"],
  "prototype-candidate": ["Candidate promotion assistance", "Prototype"],
  "prototype-baseline": ["Baseline review assistance", "Prototype"],
  "work-design-context": ["Context assistance", "Work Design"],
  "work-design-tree": ["Work breakdown assistance", "Work Design"],
  "refinement-metadata": ["Metadata assistance", "Refinement"],
  "execution-tree": ["Execution tree assistance", "Execution"],
  "work-design-blocker": ["Blocker assistance", "Work Design"],
  "refinement-blocker": ["Blocker assistance", "Refinement"],
  "definition-design": ["Definition design assistance", "Orchestration"],
};

/** Closed navigation targets; owner references are never interpreted as URLs. */
export function aiActivityWorkspace(item: RecentAiActivity): "PROPOSAL" | "PROTOTYPE" | "DELIVERY" | "ORCHESTRATION" | null {
  if (!item.kind || !item.subjectRef) return null;
  if (item.kind.startsWith("proposal-")) return "PROPOSAL";
  if (item.kind.startsWith("prototype-")) return "PROTOTYPE";
  if (["work-design-context", "work-design-tree", "refinement-metadata", "execution-tree", "work-design-blocker", "refinement-blocker"].includes(item.kind) && /^(delivery-[1-9][0-9]*|delivery-package:[1-9][0-9]*)$/.test(item.subjectRef)) return "DELIVERY";
  return item.kind === "definition-design" && item.subjectRef.startsWith("definition:") ? "ORCHESTRATION" : null;
}
