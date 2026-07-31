"use client";

import { useEffect, useState } from "react";

import {
  TerasDraftCloseGuardDialog,
  TerasList,
  TerasMetadataList,
  TerasPanel,
  TerasPanelHeader,
  TerasStatusItem,
  TerasWizardFooter,
  TerasWizardModal,
  type TerasTone,
  type TerasWizardStep,
} from "@/teras";

import type {
  DevIntegrationProfile,
} from "../../model/dev-integration-profile";
import type {
  DevIntegrationProfileRequest as DevIntegrationProfileRequestRecord,
} from "../../model/dev-integration-profile-request";
import {
  devIntegrationProfileRequestRoute,
} from "../../model/dev-integration-profile-request";
import type {
  EnvironmentLifecycleOperation,
  EnvironmentLifecycleOperationReceipt,
} from "../../model/environment-lifecycle-command";
import {
  buildDevIntegrationProfileRequest,
  createDevIntegrationProfileRequestDraft,
  isDevIntegrationProfileRequestDraftDirty,
  validateDevIntegrationProfileRequestDraft,
  type DevIntegrationProfileRequestDraft,
} from "../../work-model/profile-request/dev-integration-profile-request-draft";
import {
  environmentProfileSubjectRef,
} from "../../work-model/commands/environment-lifecycle-command-factory";
import {
  EnvironmentOperationPanel,
} from "../operations/environment-operation-panel";
import {
  buildProfileIntentChecks,
  buildRuntimeContractChecks,
  profileRequestCheckItem,
  type ProfileRequestCheckItem,
} from "./request/profile-request-checks";
import { ProfileRequestIntentStep } from "./request/profile-request-intent-step";
import { ProfileRequestPersistenceDialog } from "./request/profile-request-persistence-dialog";
import { ProfileRequestReviewStep } from "./request/profile-request-review-step";
import { ProfileRequestRuntimeStep } from "./request/profile-request-runtime-step";

type RequestStep = "intent" | "runtime" | "review";

function requestStepTone(
  available: boolean,
  complete: boolean,
  active: boolean,
): TerasTone {
  if (!available) return "muted";
  if (complete) return "ok";
  return active ? "warn" : "info";
}

function RequestCheckPanel({
  checks,
  complete,
  description,
  title,
}: {
  checks: readonly ProfileRequestCheckItem[];
  complete: boolean;
  description: string;
  title: string;
}) {
  return (
    <TerasPanel
      fit="fill"
      frame="padded"
      tone={complete ? "ok" : "warn"}
      treatment="rail"
    >
      <TerasPanelHeader
        description={description}
        kicker="Readiness Check"
        statusLabel={complete ? "Ready" : "Incomplete"}
        statusTone={complete ? "ok" : "warn"}
        title={title}
      />
      <TerasList ariaLabel={title}>
        {checks.map((check, index) => (
          <TerasStatusItem
            detail={check.detail}
            index={String(index + 1).padStart(2, "0")}
            key={check.id}
            label={check.label}
            status={check.status}
            tone={check.tone}
          />
        ))}
      </TerasList>
    </TerasPanel>
  );
}

export function DevIntegrationProfileRequest({
  existingProfiles,
  onBack,
  onCompleted,
  onDirtyChange,
  onRetryOperation,
  onSubmitted,
  operations,
  receipts,
}: {
  existingProfiles: readonly DevIntegrationProfile[];
  onBack: () => void;
  onCompleted: (profileId: string) => void;
  onDirtyChange: (dirty: boolean) => void;
  onRetryOperation: (
    operationId: string,
  ) => Promise<EnvironmentLifecycleOperation>;
  onSubmitted: (
    request: DevIntegrationProfileRequestRecord,
  ) => Promise<EnvironmentLifecycleOperation>;
  operations: readonly EnvironmentLifecycleOperation[];
  receipts: readonly EnvironmentLifecycleOperationReceipt[];
}) {
  const [draft, setDraft] = useState(createDevIntegrationProfileRequestDraft);
  const [exitGuardOpen, setExitGuardOpen] = useState(false);
  const [failedCorrelationId, setFailedCorrelationId] =
    useState<string | null>(null);
  const [persistentDialogOpen, setPersistentDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<RequestStep>("intent");
  const existingProfileIds = existingProfiles.map(
    (profile) => profile.profileId,
  );
  const disposableProfileIds = existingProfiles
    .filter((profile) => profile.runtime.stateModel === "disposable")
    .map((profile) => profile.profileId);
  const dirty = isDevIntegrationProfileRequestDraftDirty(draft);
  const intentChecks = buildProfileIntentChecks(draft, existingProfileIds);
  const runtimeChecks = buildRuntimeContractChecks(
    draft,
    disposableProfileIds,
  );
  const intentComplete = intentChecks.every((item) => item.tone === "ok");
  const runtimeComplete = runtimeChecks.every((item) => item.tone === "ok");
  const validationContext = {
    disposableProfileIds,
    existingProfileIds,
    requestedAt: new Date().toISOString(),
    requestedBy: "operator:local-console",
  };
  const validationErrors = validateDevIntegrationProfileRequestDraft(
    draft,
    validationContext,
  );
  const reviewChecks = [
    profileRequestCheckItem(
      "intent-complete",
      "Profile intent",
      "Identity, ownership, and participation are complete.",
      intentComplete,
    ),
    profileRequestCheckItem(
      "runtime-complete",
      "Runtime contract",
      "Runtime, write, and persistence boundaries are complete.",
      runtimeComplete,
    ),
    profileRequestCheckItem(
      "projection-boundary",
      "Projection boundary",
      "Submission creates proposed local truth only.",
      true,
    ),
  ];
  const reviewReady = validationErrors.length === 0;
  const steps: TerasWizardStep[] = [
    {
      available: true,
      id: "intent",
      label: "Profile Intent",
      stateLabel: intentComplete ? "Ready" : "Current",
      tone: requestStepTone(true, intentComplete, step === "intent"),
    },
    {
      available: intentComplete,
      id: "runtime",
      label: "Runtime Contract",
      stateLabel: !intentComplete
        ? "Locked"
        : runtimeComplete
          ? "Ready"
          : "Required",
      tone: requestStepTone(
        intentComplete,
        runtimeComplete,
        step === "runtime",
      ),
    },
    {
      available: intentComplete && runtimeComplete,
      id: "review",
      label: "Review and Request",
      stateLabel:
        !intentComplete || !runtimeComplete
          ? "Locked"
          : failedCorrelationId
            ? "Failed"
            : reviewReady
              ? "Ready"
              : "Required",
      tone: failedCorrelationId
        ? "danger"
        : requestStepTone(
            intentComplete && runtimeComplete,
            reviewReady,
            step === "review",
          ),
    },
  ];

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  function updateDraft(
    update: Partial<DevIntegrationProfileRequestDraft>,
  ) {
    setDraft((current) => ({ ...current, ...update }));
  }

  function exitRequest() {
    if (dirty) {
      setExitGuardOpen(true);
      return;
    }

    onBack();
  }

  function discardAndExit() {
    setDraft(createDevIntegrationProfileRequestDraft());
    setExitGuardOpen(false);
    onDirtyChange(false);
    onBack();
  }

  function selectStep(stepId: string) {
    const selectedStep = steps.find(
      (candidate) => candidate.id === stepId,
    );
    if (selectedStep?.available === false) return;
    if (stepId === step) return;

    setFailedCorrelationId(null);
    setStep(stepId as RequestStep);
  }

  async function submitRequest() {
    const requestedAt = new Date().toISOString();
    const request = buildDevIntegrationProfileRequest(draft, {
      disposableProfileIds,
      existingProfileIds,
      requestedAt,
      requestedBy: "operator:local-console",
    });
    const errors = validateDevIntegrationProfileRequestDraft(draft, {
      disposableProfileIds,
      existingProfileIds,
      requestedAt,
      requestedBy: "operator:local-console",
    });

    if (errors.length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      const operation = await onSubmitted(request);
      if (operation.state !== "succeeded") {
        setFailedCorrelationId(operation.correlationId);
        return;
      }

      setDraft(createDevIntegrationProfileRequestDraft());
      onDirtyChange(false);
      onCompleted(request.profileId);
    } finally {
      setSubmitting(false);
    }
  }

  const support =
    step === "intent" ? (
      <RequestCheckPanel
        checks={intentChecks}
        complete={intentComplete}
        description="Complete each required part before defining the runtime contract."
        title="Intent readiness"
      />
    ) : step === "runtime" ? (
      <RequestCheckPanel
        checks={runtimeChecks}
        complete={runtimeComplete}
        description="The contract must fail closed before the request can be reviewed."
        title="Runtime readiness"
      />
    ) : failedCorrelationId ? (
      <EnvironmentOperationPanel
        correlationId={failedCorrelationId}
        description="The profile request did not complete."
        onReturnToDraft={() => {
          setFailedCorrelationId(null);
          setStep("runtime");
        }}
        onRetry={onRetryOperation}
        onRetrySucceeded={() => {
          setDraft(createDevIntegrationProfileRequestDraft());
          onDirtyChange(false);
          onCompleted(draft.profileId);
        }}
        operations={operations}
        receipts={receipts}
        subjectRef={environmentProfileSubjectRef(draft.profileId)}
        title="Profile request result"
      />
    ) : (
      <TerasPanel
        fit="fill"
        frame="padded"
        tone={reviewReady ? "ok" : "warn"}
        treatment="rail"
      >
        <TerasPanelHeader
          description={
            reviewReady
              ? "The request can be recorded as prototype-local proposed truth."
              : validationErrors[0]
          }
          kicker="Final Check"
          statusLabel={reviewReady ? "Ready" : "Incomplete"}
          statusTone={reviewReady ? "ok" : "warn"}
          title="Record request"
        />
        <TerasMetadataList
          columns={1}
          items={[
            {
              detail: devIntegrationProfileRequestRoute.destinationRef,
              label: "Destination",
              value: devIntegrationProfileRequestRoute.destinationLabel,
            },
            {
              label: "Owner review",
              value: draft.ownerRepo,
            },
            {
              label: "Platform review",
              value:
                devIntegrationProfileRequestRoute.platformReviewOwner,
            },
            {
              label: "Security review",
              value:
                draft.securityTriggers.length > 0
                  ? devIntegrationProfileRequestRoute.securityReviewOwner
                  : "Not triggered",
            },
          ]}
          topOffset="compact"
        />
        <TerasList ariaLabel="Profile request final checks">
          {reviewChecks.map((check, index) => (
            <TerasStatusItem
              detail={check.detail}
              index={String(index + 1).padStart(2, "0")}
              key={check.id}
              label={check.label}
              status={check.status}
              tone={check.tone}
            />
          ))}
        </TerasList>
      </TerasPanel>
    );

  return (
    <>
      <TerasWizardModal
        activeStepId={step}
        description="Define a local environment contract for owner review. Submission does not admit or launch the profile."
        footer={
          <TerasWizardFooter
            apply={
              step === "review" && !failedCorrelationId
                ? {
                    dataAction: "submit-profile-request",
                    disabled: !reviewReady || submitting,
                    label: submitting
                      ? "Submitting"
                      : "Submit Profile Request",
                    onClick: () => void submitRequest(),
                  }
                : undefined
            }
            back={{
              emphasis: "secondary",
              label:
                failedCorrelationId || step === "intent"
                  ? "Back to Register"
                  : "Back",
              onClick:
                failedCorrelationId || step === "intent"
                  ? exitRequest
                  : () => {
                      setFailedCorrelationId(null);
                      setStep(step === "review" ? "runtime" : "intent");
                    },
            }}
            next={
              step === "intent"
                ? {
                    disabled: !intentComplete,
                    label: "Next",
                    onClick: () => setStep("runtime"),
                  }
                : step === "runtime"
                  ? {
                      disabled: !runtimeComplete,
                      label: "Review Request",
                      onClick: () => setStep("review"),
                    }
                  : undefined
            }
          />
        }
        kicker="Dev Integration"
        onClose={exitRequest}
        onStepSelect={selectStep}
        statusLabel={
          failedCorrelationId
            ? "Failed"
            : reviewReady && step === "review"
              ? "Ready"
              : dirty
                ? "Draft"
                : "New"
        }
        statusTone={
          failedCorrelationId
            ? "danger"
            : reviewReady && step === "review"
              ? "ok"
              : dirty
                ? "warn"
                : "muted"
        }
        steps={steps}
        subject={{
          detail:
            draft.purpose ||
            "Define identity, runtime, and review boundaries.",
          eyebrow: "Profile Request",
          title: draft.profileId || "New Dev Integration Profile",
        }}
        support={support}
        surfaceId="dev-integration-profile-request"
        title="Dev Integration Profile Request"
      >
        {step === "intent" ? (
          <ProfileRequestIntentStep
            draft={draft}
            existingProfileIds={existingProfileIds}
            onChange={updateDraft}
          />
        ) : step === "runtime" ? (
          <ProfileRequestRuntimeStep
            draft={draft}
            onChange={updateDraft}
            onOpenPersistence={() => setPersistentDialogOpen(true)}
          />
        ) : (
          <ProfileRequestReviewStep draft={draft} />
        )}
      </TerasWizardModal>

      <ProfileRequestPersistenceDialog
        disposableProfileIds={disposableProfileIds}
        draft={draft}
        onChange={setDraft}
        onClose={() => setPersistentDialogOpen(false)}
        open={persistentDialogOpen}
      />
      <TerasDraftCloseGuardDialog
        description="This profile request has unsubmitted local changes."
        kicker="Dev Integration"
        leaveLabel="Discard Draft"
        onKeepEditing={() => setExitGuardOpen(false)}
        onLeave={discardAndExit}
        open={exitGuardOpen}
        title="Discard Profile Request?"
      />
    </>
  );
}
