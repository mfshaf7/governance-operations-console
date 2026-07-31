import type { ReactNode } from "react";

export type TerasDataAttributes = {
  [key: `data-${string}`]: string | undefined;
};

export type TerasLayoutSpacing =
  | "compact"
  | "comfortable"
  | "loose"
  | "normal"
  | "wide";

export type TerasLayoutTopOffset = "none" | "normal" | "section";

export type TerasTone = "danger" | "info" | "muted" | "ok" | "stale" | "warn";

export type TerasSubjectSummary = {
  detail?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
};

export type TerasSurfaceStatusFact = {
  label: ReactNode;
  value: ReactNode;
};

export type TerasSurfaceStatusItem = {
  detail: ReactNode;
  facts: TerasSurfaceStatusFact[];
  id: string;
  label: ReactNode;
  stateLabel: ReactNode;
  tone: TerasTone;
};

export type TerasSurfaceStatusModel = {
  ariaLabel: string;
  detailDataAttribute?: string;
  items: TerasSurfaceStatusItem[];
  kicker: string;
  statusLabel: ReactNode;
  summary: ReactNode;
  title: ReactNode;
  tone: TerasTone;
};
