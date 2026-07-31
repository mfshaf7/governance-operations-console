"use client";

import { useState } from "react";

import type {
  ProposalDecisionDraft,
  ProposalRouteSelectionDraft,
} from "../../../work-model/proposal-disposition-model.ts";
import type { ProposalHandoffDraft } from "../../../work-model/proposal-handoff-model.ts";
import type { ProposalTriageDraft } from "../../../work-model/proposal-triage-model.ts";
import {
  proposalDispositionApplyPayload,
  proposalHandoffApplyPayload,
  proposalTriageApplyPayload,
  type ProposalWorkflowApplyPayload,
} from "../../../work-model/proposal-workflow-command-model.ts";
import {
  proposalWorkflowSourceSnapshot,
  type ProposalWorkflowSourceSnapshot,
} from "../../../work-model/proposal-source-projection-model.ts";
type ProposalWorkflowDraftReceipt = {
  receiptId: string;
  recordedAt: string;
};

type RecordProposalWorkflowReceipt = (input: {
  payload: ProposalWorkflowApplyPayload;
  proposalId: string;
  source: ProposalWorkflowSourceSnapshot;
}) => Promise<ProposalWorkflowDraftReceipt>;

export function useProposalWorkflowDrafts({
  now,
  recordWorkflowReceipt,
}: {
  now: () => string;
  recordWorkflowReceipt: RecordProposalWorkflowReceipt;
}) {
  const [triageDrafts, setTriageDrafts] = useState<
    Record<string, ProposalTriageDraft>
  >({});
  const [decisionDrafts, setDecisionDrafts] = useState<
    Record<string, ProposalDecisionDraft>
  >({});
  const [routeSelectionDrafts, setRouteSelectionDrafts] = useState<
    Record<string, ProposalRouteSelectionDraft>
  >({});
  const [handoffDrafts, setHandoffDrafts] = useState<
    Record<string, ProposalHandoffDraft>
  >({});

  function saveTriageDraft(
    draft: ProposalTriageDraft,
    source: ProposalWorkflowSourceSnapshot,
  ) {
    const savedAt = now();
    setTriageDrafts((current) => ({
      ...current,
      [draft.proposalId]: proposalDraftWithSource({
        draft,
        savedAt,
        source,
      }),
    }));
  }

  async function applyTriageDraft(
    draft: ProposalTriageDraft,
    source: ProposalWorkflowSourceSnapshot,
  ) {
    const receipt = await recordWorkflowReceipt({
      payload: proposalTriageApplyPayload(draft),
      proposalId: draft.proposalId,
      source,
    });
    const appliedAt = receipt.recordedAt;

    setTriageDrafts((current) => ({
      ...current,
      [draft.proposalId]: proposalDraftWithSource({
        appliedAt,
        appliedReceiptId: receipt.receiptId,
        draft,
        savedAt: appliedAt,
        source,
      }),
    }));

    return receipt;
  }

  function saveDecisionDraft(
    draft: ProposalDecisionDraft,
    source: ProposalWorkflowSourceSnapshot,
  ) {
    const savedAt = now();
    setDecisionDrafts((current) => ({
      ...current,
      [draft.proposalId]: proposalDraftWithSource({
        draft,
        savedAt,
        source,
      }),
    }));
  }

  function saveRouteSelectionDraft(
    draft: ProposalRouteSelectionDraft,
    source: ProposalWorkflowSourceSnapshot,
  ) {
    const savedAt = now();
    setRouteSelectionDrafts((current) => ({
      ...current,
      [draft.proposalId]: proposalDraftWithSource({
        draft,
        savedAt,
        source,
      }),
    }));
  }

  async function applyDispositionDraft({
    decisionDraft,
    routeSelectionDraft,
    source,
  }: {
    decisionDraft: ProposalDecisionDraft;
    routeSelectionDraft: ProposalRouteSelectionDraft | null;
    source: ProposalWorkflowSourceSnapshot;
  }) {
    const receipt = await recordWorkflowReceipt({
      payload: proposalDispositionApplyPayload({
        decisionDraft,
        routeSelectionDraft,
      }),
      proposalId: decisionDraft.proposalId,
      source,
    });
    const appliedAt = receipt.recordedAt;

    setDecisionDrafts((current) => ({
      ...current,
      [decisionDraft.proposalId]: proposalDraftWithSource({
        appliedAt,
        appliedReceiptId: receipt.receiptId,
        draft: decisionDraft,
        savedAt: appliedAt,
        source,
      }),
    }));

    setRouteSelectionDrafts((current) => {
      if (!routeSelectionDraft) {
        const next = { ...current };
        delete next[decisionDraft.proposalId];
        return next;
      }

      return {
        ...current,
        [routeSelectionDraft.proposalId]: proposalDraftWithSource({
          appliedAt,
          appliedReceiptId: receipt.receiptId,
          draft: routeSelectionDraft,
          savedAt: appliedAt,
          source,
        }),
      };
    });

    return receipt;
  }

  function saveHandoffDraft(
    draft: ProposalHandoffDraft,
    source: ProposalWorkflowSourceSnapshot,
  ) {
    const savedAt = now();
    setHandoffDrafts((current) => ({
      ...current,
      [draft.proposalId]: proposalDraftWithSource({
        draft,
        savedAt,
        source,
      }),
    }));
  }

  async function applyHandoffDraft(
    draft: ProposalHandoffDraft,
    source: ProposalWorkflowSourceSnapshot,
  ) {
    const receipt = await recordWorkflowReceipt({
      payload: proposalHandoffApplyPayload(draft),
      proposalId: draft.proposalId,
      source,
    });
    const appliedAt = receipt.recordedAt;

    setHandoffDrafts((current) => ({
      ...current,
      [draft.proposalId]: proposalDraftWithSource({
        appliedAt,
        appliedReceiptId: receipt.receiptId,
        draft,
        savedAt: appliedAt,
        source,
      }),
    }));

    return receipt;
  }

  return {
    applyDispositionDraft,
    applyHandoffDraft,
    applyTriageDraft,
    decisionDrafts,
    handoffDrafts,
    routeSelectionDrafts,
    saveDecisionDraft,
    saveHandoffDraft,
    saveRouteSelectionDraft,
    saveTriageDraft,
    triageDrafts,
  };
}

function proposalDraftWithSource<
  TDraft extends {
    appliedAt?: string;
    savedAt?: string;
  },
>({
  appliedAt,
  appliedReceiptId,
  draft,
  savedAt,
  source,
}: {
  appliedAt?: string;
  appliedReceiptId?: string;
  draft: TDraft;
  savedAt: string;
  source: ProposalWorkflowSourceSnapshot;
}): TDraft {
  return {
    ...draft,
    ...proposalWorkflowSourceSnapshot(source),
    appliedAt,
    appliedReceiptId,
    savedAt,
  };
}
