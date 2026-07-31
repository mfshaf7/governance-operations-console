import type { ReactNode } from "react";

import type { TerasTone } from "@/teras";

import type { PrototypeLandingDraft } from "../../../work-model/workflows/landing/prototype-landing-model.ts";

export type PrototypeLandingDraftChangeHandler = <
  Field extends keyof PrototypeLandingDraft,
>(
  field: Field,
  value: PrototypeLandingDraft[Field],
) => void;

export type PrototypeLandingRunLogRow = {
  detail: ReactNode;
  formattedTimestamp: ReactNode;
  marker: ReactNode;
  timestamp: string;
  tone: TerasTone;
};

export type PrototypeLandingSupportGuideGroup = {
  detail: string;
  id: string;
  rows: Array<{
    detail: string;
    label: string;
    status: string;
    tone: TerasTone;
  }>;
  title: string;
};

export type PrototypeLandingChecklistRow = {
  detail: ReactNode;
  id: string;
  index: string;
  label: ReactNode;
  status: ReactNode;
  tone: TerasTone;
};

export type PrototypeLandingStatusProjection = {
  emphasis?: "primary" | "secondary";
  label: string;
  tone: TerasTone;
};
