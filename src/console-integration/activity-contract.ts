export type ConsoleActivityActorKind =
  | "agent"
  | "operator"
  | "system"
  | "unknown";

export type ConsoleActivityCategory =
  | "blocker"
  | "command"
  | "receipt"
  | "runtime"
  | "state-change"
  | "transition";

export type ConsoleActivityOutcome =
  | "blocked"
  | "failed"
  | "informational"
  | "stale"
  | "started"
  | "succeeded"
  | "waiting";

export type ConsoleActivitySourceMode =
  | "authority-snapshot"
  | "domain-projection"
  | "prototype-local"
  | "source-projected"
  | "synthetic-scenario";

export type ConsoleActivityEvent = Readonly<{
  action: Readonly<{
    id: string;
    label: string;
  }>;
  actor: Readonly<{
    kind: ConsoleActivityActorKind;
    ref: string;
  }>;
  causationId: string | null;
  category: ConsoleActivityCategory;
  correlationId: string | null;
  durability: "prototype-local" | "source-projected" | "synthetic";
  eventId: string;
  evidenceRefs: readonly string[];
  occurredAt: string;
  outcome: ConsoleActivityOutcome;
  receiptRef: string | null;
  source: Readonly<{
    authority: string;
    label: string;
    mode: ConsoleActivitySourceMode;
    owner: string;
    ref: string;
  }>;
  subject: Readonly<{
    kind: string;
    label: string;
    ref: string;
  }>;
  summary: string;
}>;
