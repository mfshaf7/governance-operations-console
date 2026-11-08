"use client";

import { useEffect, useState } from "react";

import {
  TerasDraftCloseGuardDialog,
  TerasActionButton,
  TerasDialog,
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
import type { DevIntegrationRequestOptions } from "../../model/dev-integration-request-options.ts";
import type { ProfileRequestRecord } from "../../live-runtime/dev-integration-profile-contract.ts";

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
    <TerasPanel spacing="normal"
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
  options,
  live,
  existingProfiles,
  onBack,
  onCompleted,
  onDirtyChange,
  onRetryOperation,
  onSubmitted,
  operations,
  receipts,
}: {
  options: DevIntegrationRequestOptions;
  live?: { current: boolean; sourceVersion: string;
    submit: (request: DevIntegrationProfileRequestRecord, reviewedSourceVersion: string) => Promise<ProfileRequestRecord>;
    pendingId: () => string | null; read: (id: string) => Promise<ProfileRequestRecord> };
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
  const [draft, setDraft] = useState(() => {
    const initial = createDevIntegrationProfileRequestDraft();
    if (!live) return initial;
    return {...initial,
      laneClass: options.laneClasses.some(option => option.value === initial.laneClass) ? initial.laneClass : options.laneClasses[0]?.value ?? initial.laneClass,
      runtimePlatform: options.runtimePlatforms.includes(initial.runtimePlatform) ? initial.runtimePlatform : options.runtimePlatforms[0] ?? initial.runtimePlatform,
      runtimeStateModel: options.runtimeStateModels.some(option => option.value === initial.runtimeStateModel) ? initial.runtimeStateModel : options.runtimeStateModels[0]?.value ?? initial.runtimeStateModel};
  });
  const [liveOutcome, setLiveOutcome] = useState<ProfileRequestRecord | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [reviewedSource, setReviewedSource] = useState<string | null>(null);
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
  const validationErrors = [...validateDevIntegrationProfileRequestDraft(
    draft,
    validationContext,
  )];
  if (live && (!options.ownerRepos.includes(draft.ownerRepo) || draft.participatingRepos.some(repo => !options.participatingRepos.includes(repo)) ||
    !options.laneClasses.some(option => option.value === draft.laneClass) || !options.runtimePlatforms.includes(draft.runtimePlatform) ||
    !options.runtimeStateModels.some(option => option.value === draft.runtimeStateModel)))
    validationErrors.push("Review the current implementation repository and runtime choices before submitting.");
  const reviewChecks = [
    profileRequestCheckItem(
      "intent-complete",
      "Profile intent",
      "Identity, responsibility, and participation are complete.",
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
      live ? "Submission records a durable request in Dev Integration. Admission and runtime launch remain separate." : "Submission creates proposed local truth only.",
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
  function closeLiveOutcome() {
    if (submitting) return;
    if (liveOutcome?.state === "recorded") {
      setDraft(createDevIntegrationProfileRequestDraft()); onDirtyChange(false); onBack();
    }
    setLiveOutcome(null); setLiveError(null);
  }

  function exitRequest() {
    if (submitting) return;
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
    if (stepId === "review") setReviewedSource(live?.sourceVersion ?? null);
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
    setLiveError(null);
    try {
      if (live) {
        if (!live.current || reviewedSource !== live.sourceVersion) throw new Error("Profile source changed. Review the current request again before submission.");
        setLiveOutcome(await live.submit(request, reviewedSource));
        return;
      }
      const operation = await onSubmitted(request);
      if (operation.state !== "succeeded") {
        setFailedCorrelationId(operation.correlationId);
        return;
      }

      setDraft(createDevIntegrationProfileRequestDraft());
      onDirtyChange(false);
      onCompleted(request.profileId);
    } catch (error) {
      setLiveError(error instanceof Error ? error.message : "The request outcome is unconfirmed; inspect its original identity before trying another.");
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
      <TerasPanel spacing="normal"
        fit="fill"
        frame="padded"
        tone={reviewReady ? "ok" : "warn"}
        treatment="rail"
      >
        <TerasPanelHeader
          description={
            reviewReady
              ? live ? liveError ?? (reviewedSource !== live.sourceVersion || !live.current ? "Source changed or is unavailable. Review current source before submitting." : "The request will be recorded in Dev Integration for review by the responsible team; it will not admit or launch a profile.") : "The request can be recorded as prototype-local proposed truth."
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
              detail: live ? "OOS-owned profile request" : devIntegrationProfileRequestRoute.destinationRef,
              label: "Destination",
              value: live ? "Dev Integration" : devIntegrationProfileRequestRoute.destinationLabel,
            },
            {
              label: "Implementation review",
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
          topOffset="none"
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
      <TerasWizardModal busy={submitting} busyLabel="Submitting profile request…"
        activeStepId={step}
        description="Define a local environment contract for implementation review. Submission does not admit or launch the profile."
        footer={
          <TerasWizardFooter
            apply={
              step === "review" && !failedCorrelationId
                ? {
                    dataAction: "submit-profile-request",
                    disabled: !reviewReady || submitting || Boolean(live && (!live.current || reviewedSource !== live.sourceVersion)),
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
                      onClick: () => { setReviewedSource(live?.sourceVersion ?? null); setStep("review"); },
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
            options={options}
            draft={draft}
            existingProfileIds={existingProfileIds}
            onChange={updateDraft}
          />
        ) : step === "runtime" ? (
          <ProfileRequestRuntimeStep
            options={options}
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
      <TerasDialog open={Boolean(live && (liveOutcome || liveError))} onClose={closeLiveOutcome} closeDisabled={submitting}
        title={liveOutcome?.state === "recorded" ? "Profile request recorded" : "Profile request needs attention"}
        kicker="Request outcome" width="standard" height="content" contentOverflow="auto"
        description={liveOutcome?.next_action.reason ?? liveError ?? ""}
        actions={<><TerasActionButton emphasis="secondary" disabled={submitting} onClick={closeLiveOutcome}>Done</TerasActionButton>
          {(liveOutcome?.request_id || live?.pendingId()) ? <TerasActionButton disabled={submitting} onClick={async () => {
            const id = liveOutcome?.request_id ?? live?.pendingId(); if (!id || !live) return;
            setSubmitting(true);try {setLiveOutcome(await live.read(id));setLiveError(null);} catch(error) {setLiveError(error instanceof Error ? error.message : "Original request unavailable.");} finally {setSubmitting(false);}
          }}>Read original request</TerasActionButton> : null}</>}>
        <TerasMetadataList items={[{label:"Request",value:liveOutcome?.request_id ?? live?.pendingId() ?? "Not submitted"},
          {label:"Recording receipt",value:liveOutcome?.receipt.digest ?? "Not confirmed"},{label:"State",value:liveOutcome?.state === "recorded" ? "Request recorded" : "Unconfirmed"},
          {label:"Readback",value:liveOutcome?.readback ?? "Unavailable"},...(liveError ? [{label:"Read error",value:liveError}] : [])]}/>
      </TerasDialog>
    </>
  );
}
