import type { ConsoleEntryIntent } from "../console-architecture";

export type ConsoleAttentionClass =
  | "decision"
  | "external-follow-up"
  | "recovery"
  | "required-action"
  | "review";

export type ConsoleAttentionUrgency =
  | "critical"
  | "high"
  | "low"
  | "normal";

export type ConsoleAttentionSourceMode =
  | "live"
  | "prototype-local"
  | "source-projected"
  | "synthetic";

export type ConsoleAttentionFreshness =
  | "current"
  | "stale"
  | "unavailable"
  | "unverified";

export type ConsoleAttentionSourceDisposition =
  | "admitted"
  | "excluded"
  | "reserved";

export type ConsoleAttentionRoute = Readonly<{
  availability: "available" | "external" | "unavailable";
  entryIntent: ConsoleEntryIntent | null;
  externalHref: string | null;
  label: string;
  unavailableReason: string | null;
}>;

export type ConsoleAttentionCandidate = Readonly<{
  attentionClass: ConsoleAttentionClass;
  candidateId: string;
  correlationRef: string | null;
  dedupeKey: string;
  dueAt: string | null;
  evidenceRefs: readonly string[];
  owner: Readonly<{
    label: string;
    ref: string;
  }>;
  ownerRank: number;
  reason: string;
  receiptRefs: readonly string[];
  requiredMove: Readonly<{
    id: string;
    label: string;
  }>;
  reviewAt: string | null;
  route: ConsoleAttentionRoute;
  schemaVersion: 1;
  source: Readonly<{
    authority: string;
    freshness: ConsoleAttentionFreshness;
    mode: ConsoleAttentionSourceMode;
    observedAt: string | null;
    projectedAt: string;
    ref: string;
    version: string;
  }>;
  subject: Readonly<{
    kind: string;
    ref: string;
    title: string;
  }>;
  urgency: ConsoleAttentionUrgency;
}>;

export type ConsoleAttentionSourceRegistration = Readonly<{
  disposition: ConsoleAttentionSourceDisposition;
  id: string;
  label: string;
  reason: string;
}>;

export type ConsoleAttentionSourceSnapshot = Readonly<{
  candidates: readonly ConsoleAttentionCandidate[];
  registration: ConsoleAttentionSourceRegistration;
  schemaVersion: 1;
  source: Readonly<{
    authority: string;
    freshness: ConsoleAttentionFreshness;
    mode: ConsoleAttentionSourceMode;
    observedAt: string | null;
    projectedAt: string;
    ref: string;
    version: string;
  }>;
}>;

export type ConsoleAttentionSource = Readonly<{
  getSnapshot: () => ConsoleAttentionSourceSnapshot;
  registration: ConsoleAttentionSourceRegistration;
  subscribe: (listener: () => void) => () => void;
}>;
