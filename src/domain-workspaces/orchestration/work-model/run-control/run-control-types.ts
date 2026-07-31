import type {
  OrchestrationRunControlId,
  OrchestrationRunEffectPosture,
  OrchestrationRunLifecycle,
} from "../../domain/orchestration-run-types.ts";

export type OrchestrationRunControlInput =
  | {
      controlId: "cancel";
      acknowledgement: "cancel-is-not-rollback";
      reason: string;
    }
  | {
      controlId: "defer";
      owner: string;
      reason: string;
      resumeCondition: string;
      reviewAt: string;
    }
  | {
      controlId: "provide-signal";
      note: string;
      signalName: string;
      signalRef: string;
    }
  | {
      controlId: "resume";
      reason: string;
    }
  | {
      controlId: "retry";
      reason: string;
    };

export type OrchestrationRunControlRequest = {
  commandName: string;
  controlId: OrchestrationRunControlId;
  expectedEffect: string;
  idempotencyKey: string;
  input: OrchestrationRunControlInput;
  requestedAt: string;
  runId: string;
  sourceOwner: string;
  sourceVersion: string;
};

export type OrchestrationRunControlReceipt = {
  controlId: OrchestrationRunControlId;
  effectPosture: OrchestrationRunEffectPosture;
  idempotencyKey: string;
  receiptId: string;
  recordedAt: string;
  resultState: "recorded";
  resultingRunState: OrchestrationRunLifecycle;
  runId: string;
  schemaVersion: 1;
  summary: string;
};

export type OrchestrationRunControlValidation = {
  available: boolean;
  findings: string[];
};
