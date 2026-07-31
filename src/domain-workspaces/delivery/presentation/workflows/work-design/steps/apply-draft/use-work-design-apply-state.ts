"use client";

import { useState } from "react";

import type { WorkDesignAdvisorTranscriptLine } from "../../view-model/work-design-context-advisor-view-model.ts";
import type {
  WorkDesignBlockerDispositionReceipt,
  WorkDesignBlockerRecoveryActionId,
} from "../../model/work-design-model.ts";

export function useWorkDesignApplyState() {
  const [applyLogDialogOpen, setApplyLogDialogOpen] = useState(false);
  const [applyRunStartedAt, setApplyRunStartedAt] = useState<string | null>(
    null,
  );
  const [applyViewOpenedAt, setApplyViewOpenedAt] = useState(() =>
    new Date().toISOString(),
  );
  const [blockerDispositionOpen, setBlockerDispositionOpen] = useState(false);
  const [blockerRecoveryActionId, setBlockerRecoveryActionId] =
    useState<WorkDesignBlockerRecoveryActionId>("inspect-apply-state");
  const [blockerDispositionJustification, setBlockerDispositionJustification] =
    useState("");
  const [blockerDispositionReceipt, setBlockerDispositionReceipt] =
    useState<WorkDesignBlockerDispositionReceipt | null>(null);
  const [blockerActionInfoDialogOpen, setBlockerActionInfoDialogOpen] =
    useState(false);
  const [blockerAdvisorPrompt, setBlockerAdvisorPrompt] = useState("");
  const [blockerAdvisorTurns, setBlockerAdvisorTurns] = useState<
    WorkDesignAdvisorTranscriptLine[]
  >([]);

  return {
    applyLogDialogOpen,
    applyRunStartedAt,
    applyViewOpenedAt,
    blockerActionInfoDialogOpen,
    blockerAdvisorPrompt,
    blockerAdvisorTurns,
    blockerDispositionJustification,
    blockerDispositionOpen,
    blockerDispositionReceipt,
    blockerRecoveryActionId,
    setApplyLogDialogOpen,
    setApplyRunStartedAt,
    setApplyViewOpenedAt,
    setBlockerActionInfoDialogOpen,
    setBlockerAdvisorPrompt,
    setBlockerAdvisorTurns,
    setBlockerDispositionJustification,
    setBlockerDispositionOpen,
    setBlockerDispositionReceipt,
    setBlockerRecoveryActionId,
  };
}

export type WorkDesignApplyState = ReturnType<typeof useWorkDesignApplyState>;
