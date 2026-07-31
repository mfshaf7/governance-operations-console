"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import type { OrchestrationDefinitionRecord } from "@/domain-workspaces/orchestration/domain/orchestration-definition-types";
import {
  loadOrchestrationDefinitionDraft,
  saveOrchestrationDefinitionDraft,
} from "../../../local-runtime/definition-design/definition-draft-store.ts";
import {
  recordOrchestrationImplementationRequest,
  recordOrchestrationQualification,
} from "../../../local-runtime/definition-design/definition-receipt-store.ts";
import {
  applyOrchestrationDefinitionAdvisorPatch,
  orchestrationDefinitionDesignIsDirty,
  orchestrationDefinitionDesignReadiness,
  orchestrationDefinitionDesignStages,
  rejectOrchestrationDefinitionAdvisorPatch,
} from "../../../work-model/definition-design/definition-design-model.ts";
import type {
  OrchestrationDefinitionAdvisorPatch,
  OrchestrationDefinitionAdvisorPatchResolution,
  OrchestrationDefinitionDesignDraft,
  OrchestrationDefinitionDesignReceipt,
  OrchestrationDefinitionDesignSection,
  OrchestrationDefinitionDesignStage,
  OrchestrationDefinitionValidationFinding,
} from "../../../work-model/definition-design/definition-design-types.ts";
import {
  createDefinitionAdvisorTurn,
  initialDefinitionAdvisorTranscript,
  type DefinitionAdvisorTranscriptLine,
} from "./support/definition-advisor-context.ts";
import {
  createDefinitionDesignInitialDraft,
  definitionDesignWorkflowSteps,
} from "./definition-design-view-model.ts";

export type DefinitionDesignDraftEditor = (
  edit: (draft: OrchestrationDefinitionDesignDraft) => void,
) => void;

export function useDefinitionDesignController({
  onClose,
  record,
}: {
  onClose: () => void;
  record: OrchestrationDefinitionRecord | null;
}) {
  const initial = useMemo(() => definitionDesignInitialState(record), [record]);
  const [draft, setDraft] = useState(initial.draft);
  const [baseline, setBaseline] = useState(initial.baseline);
  const [receipt, setReceipt] =
    useState<OrchestrationDefinitionDesignReceipt | null>(null);
  const [advisorPrompt, setAdvisorPrompt] = useState("");
  const [advisorTranscript, setAdvisorTranscript] = useState<
    DefinitionAdvisorTranscriptLine[]
  >(() => initialDefinitionAdvisorTranscript(initial.draft));
  const [pendingPatch, setPendingPatch] =
    useState<OrchestrationDefinitionAdvisorPatch | null>(null);
  const [patchResolutions, setPatchResolutions] = useState<
    OrchestrationDefinitionAdvisorPatchResolution[]
  >([]);
  const [selectedNodeId, setSelectedNodeId] = useState(
    initial.draft.executionPlan.nodes[0]?.id ?? "",
  );
  const [closeGuardOpen, setCloseGuardOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(initial.draft);
    setBaseline(initial.baseline);
    setReceipt(null);
    setAdvisorPrompt("");
    setAdvisorTranscript(initialDefinitionAdvisorTranscript(initial.draft));
    setPendingPatch(null);
    setPatchResolutions([]);
    setSelectedNodeId(initial.draft.executionPlan.nodes[0]?.id ?? "");
    setCloseGuardOpen(false);
    setActionError(null);
  }, [initial]);

  useEffect(() => {
    saveOrchestrationDefinitionDraft(draft);
  }, [draft]);

  useEffect(() => {
    if (
      selectedNodeId &&
      draft.executionPlan.nodes.some((node) => node.id === selectedNodeId)
    ) {
      return;
    }

    setSelectedNodeId(draft.executionPlan.nodes[0]?.id ?? "");
  }, [draft.executionPlan.nodes, selectedNodeId]);

  const readiness = orchestrationDefinitionDesignReadiness(draft);
  const dirty = orchestrationDefinitionDesignIsDirty(baseline, draft);
  const stages = orchestrationDefinitionDesignStages(
    draft.qualification.classification,
  );
  const workflowSteps = definitionDesignWorkflowSteps(draft, Boolean(receipt));

  const editDraft: DefinitionDesignDraftEditor = (edit) => {
    setDraft((current) => {
      const next = structuredClone(current);
      edit(next);
      next.savedAt = new Date().toISOString();
      return next;
    });
    setActionError(null);
  };

  function setStage(stage: OrchestrationDefinitionDesignStage) {
    if (!stages.includes(stage)) {
      return;
    }

    setDraft((current) => ({
      ...current,
      activeSection:
        stage === "define" && current.activeSection === "qualification"
          ? "identity-ownership"
          : current.activeSection,
      activeStage: stage,
    }));
  }

  function setSection(section: OrchestrationDefinitionDesignSection) {
    setDraft((current) => ({
      ...current,
      activeSection: section,
    }));
  }

  function nextStage() {
    if (draft.activeStage === "qualify") {
      if (!readiness.canAdvanceFromQualify) {
        return;
      }

      setStage(
        draft.qualification.classification === "durable-candidate"
          ? "define"
          : "review-request",
      );
      return;
    }

    if (draft.activeStage === "define") {
      setStage("review-request");
    }
  }

  function previousStage() {
    const index = stages.indexOf(draft.activeStage);
    const previous = stages[index - 1];

    if (previous) {
      setStage(previous);
    }
  }

  function navigateToFinding(
    finding: OrchestrationDefinitionValidationFinding,
  ) {
    if (finding.section === "qualification") {
      setSection("qualification");
      setStage("qualify");
      return;
    }

    if (finding.section === "request-route") {
      setStage("review-request");
      return;
    }

    setSection(finding.section);
    setStage("define");
  }

  function runAdvisor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = advisorPrompt.trim();

    if (!prompt || draft.activeStage === "review-request") {
      return;
    }

    const turn = createDefinitionAdvisorTurn({
      draft,
      prompt,
      sequence: advisorTranscript.length + 1,
    });

    setAdvisorTranscript((current) => [
      ...current,
      {
        id: `definition-advisor-operator-${current.length + 1}`,
        role: "operator",
        text: prompt,
      },
      {
        id: `definition-advisor-response-${current.length + 2}`,
        role: "advisor",
        text: turn.response,
      },
    ]);
    setAdvisorPrompt("");
    setPendingPatch(turn.patch);
  }

  function applyAdvisorPatch() {
    if (!pendingPatch) {
      return;
    }

    const applied = applyOrchestrationDefinitionAdvisorPatch(
      draft,
      pendingPatch,
      new Date().toISOString(),
    );
    applied.draft.savedAt = new Date().toISOString();
    setDraft(applied.draft);
    setPatchResolutions((current) => [...current, applied.resolution]);
    setPendingPatch(null);
  }

  function rejectAdvisorPatch() {
    if (!pendingPatch) {
      return;
    }

    setPatchResolutions((current) => [
      ...current,
      rejectOrchestrationDefinitionAdvisorPatch(
        pendingPatch,
        new Date().toISOString(),
      ),
    ]);
    setPendingPatch(null);
  }

  function recordOutcome() {
    try {
      const recordedAt = new Date().toISOString();
      const nextReceipt =
        draft.qualification.classification === "durable-candidate"
          ? recordOrchestrationImplementationRequest({
              draft,
              recordedAt,
            })
          : recordOrchestrationQualification({
              draft,
              recordedAt,
            });

      setReceipt(nextReceipt);
      setBaseline(draft);
      saveOrchestrationDefinitionDraft(draft);
      setActionError(null);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The local receipt could not be recorded.",
      );
    }
  }

  function requestClose() {
    if (dirty && !receipt) {
      setCloseGuardOpen(true);
      return;
    }

    onClose();
  }

  function addExecutionNode() {
    let nextNodeId = `node-${draft.executionPlan.nodes.length + 1}`;
    let suffix = draft.executionPlan.nodes.length + 1;

    while (draft.executionPlan.nodes.some((node) => node.id === nextNodeId)) {
      suffix += 1;
      nextNodeId = `node-${suffix}`;
    }

    editDraft((next) => {
      next.executionPlan.nodes.push({
        adapter: "",
        branchCondition: "",
        dependencies: [],
        id: nextNodeId,
        idempotency: "",
        label: "",
        optional: false,
        owner: "",
        parallelGroup: "",
        skipReason: "",
        timeout: "",
        type: "activity",
      });
    });
    setSelectedNodeId(nextNodeId);
  }

  function removeSelectedExecutionNode() {
    if (!selectedNodeId) {
      return;
    }

    editDraft((next) => {
      next.executionPlan.nodes = next.executionPlan.nodes.filter(
        (node) => node.id !== selectedNodeId,
      );
    });
  }

  return {
    actionError,
    advisor: {
      applyPatch: applyAdvisorPatch,
      onPromptChange: setAdvisorPrompt,
      onSubmit: runAdvisor,
      patchResolutions,
      pendingPatch,
      prompt: advisorPrompt,
      rejectPatch: rejectAdvisorPatch,
      transcript: advisorTranscript,
    },
    closeGuard: {
      close: () => setCloseGuardOpen(false),
      leaveWithSavedDraft: onClose,
      open: closeGuardOpen,
    },
    dirty,
    draft,
    editDraft,
    finish: onClose,
    navigateToFinding,
    nextStage,
    previousStage,
    readiness,
    receipt,
    recordOutcome,
    addExecutionNode,
    removeSelectedExecutionNode,
    requestClose,
    selectedNodeId,
    setSection,
    setSelectedNodeId,
    setStage,
    stages,
    workflowSteps,
  };
}

function definitionDesignInitialState(
  record: OrchestrationDefinitionRecord | null,
) {
  const sourceDraft = createDefinitionDesignInitialDraft({
    record,
    savedAt: new Date().toISOString(),
  });
  const storedDraft = loadOrchestrationDefinitionDraft(sourceDraft.draftId);
  const draft = storedDraft ?? sourceDraft;

  return {
    baseline: structuredClone(draft),
    draft,
  };
}
