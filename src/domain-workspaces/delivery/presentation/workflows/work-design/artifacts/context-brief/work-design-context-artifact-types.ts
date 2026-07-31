import type { DeliveryPackageSummary } from "../../../../../read-model/index.ts";

export type WorkDesignInitialContextSession =
  DeliveryPackageSummary["work_design_context_session"] | null;

export type WorkDesignContextBriefState =
  "finalized" | "stale" | "loaded" | "unsaved";

export type WorkDesignContextArtifactFact = {
  label: string;
  value: string;
};
