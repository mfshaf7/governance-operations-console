"use client";

import {
  TerasActionButton,
  TerasFieldGrid,
  TerasFieldStack,
  TerasList,
  TerasMetadataList,
  TerasModalShell,
  TerasNoteField,
  TerasPanel,
  TerasPanelHeader,
  TerasProgressStepList,
  TerasSelectField,
  TerasStatusItem,
  TerasTextField,
  TerasTrayStack,
} from "@/teras";

import type {
  ModelProfileRequestDraft,
  ModelProfileRequestProjection,
} from "../../../live-runtime/model-operations-live-types.ts";
import {
  modelProfileIntentComplete,
  modelProfileRequestReceiptItems,
  modelProfileReviewComplete,
  type ModelProfileRequestStep,
} from "../../../work-model/profile-requests/model-profile-request-model.ts";

export function ModelProfileRequestModal({
  draft,
  error,
  onClose,
  onStepChange,
  onSubmit,
  onUpdateDraft,
  open,
  pending,
  result,
  step,
}: {
  draft: ModelProfileRequestDraft;
  error: string | null;
  onClose: () => void;
  onStepChange: (step: ModelProfileRequestStep) => void;
  onSubmit: () => Promise<void>;
  onUpdateDraft: <TKey extends keyof ModelProfileRequestDraft>(
    key: TKey,
    value: ModelProfileRequestDraft[TKey],
  ) => void;
  open: boolean;
  pending: boolean;
  result: ModelProfileRequestProjection | null;
  step: ModelProfileRequestStep;
}) {
  if (!open) return null;
  const intentComplete = modelProfileIntentComplete(draft);
  const reviewComplete = modelProfileReviewComplete(draft);
  const steps = [
    {
      available: !result,
      detail: "Purpose, callers, data, output, and environment",
      id: "intent" as const,
      label: "Profile Intent",
      stateLabel: step === "intent" ? "Current" : "Done",
      tone: intentComplete ? ("ok" as const) : ("warn" as const),
    },
    {
      available: intentComplete && !result,
      detail: "Derived controls and operator justification",
      id: "review" as const,
      label: "Review Request",
      stateLabel: step === "review" ? "Current" : result ? "Done" : "Next",
      tone: reviewComplete ? ("ok" as const) : ("warn" as const),
    },
    {
      available: Boolean(result),
      detail: "OOS request state and immutable receipt",
      id: "receipt" as const,
      label: "Submission Result",
      stateLabel: result ? "Receipt" : "Locked",
      tone: result ? ("ok" as const) : ("muted" as const),
    },
  ];
  return (
    <TerasModalShell
      bodyLayout="scroll"
      description="Submit one governed create request to OOS. Platform selects the provider and model; the Console never writes the profile registry."
      footer={
        <>
          <TerasActionButton onClick={onClose} emphasis="secondary">
            Back To Register
          </TerasActionButton>
          {step === "review" ? (
            <TerasActionButton onClick={() => onStepChange("intent")} emphasis="secondary">
              Back
            </TerasActionButton>
          ) : null}
          {step === "intent" ? (
            <TerasActionButton
              disabled={!intentComplete}
              onClick={() => onStepChange("review")}
            >
              Review Request
            </TerasActionButton>
          ) : step === "review" ? (
            <TerasActionButton
              disabled={!reviewComplete || pending}
              onClick={() => void onSubmit().catch(() => undefined)}
            >
              {pending ? "Submitting Request" : "Submit Request"}
            </TerasActionButton>
          ) : null}
        </>
      }
      height="fill"
      kicker="Model Operations"
      onClose={onClose}
      surfaceId="model-profile-request"
      title="Request Governed Model Profile"
      width="large"
    >
      <TerasTrayStack spacing="loose">
        <TerasProgressStepList
          activeStepId={step}
          ariaLabel="Model profile request progress"
          onSelectStep={onStepChange}
          steps={steps}
        />
        {step === "intent" ? (
          <ProfileIntentStep draft={draft} onUpdateDraft={onUpdateDraft} />
        ) : step === "review" ? (
          <ProfileReviewStep
            draft={draft}
            error={error}
            onUpdateDraft={onUpdateDraft}
          />
        ) : result ? (
          <TerasPanel frame="padded" treatment="rail" tone="ok">
            <TerasPanelHeader
              description="OOS recorded and submitted the request. Approval, Platform fulfillment, Security acceptance, and activation remain separate owner actions."
              kicker="Submission Result"
              statusLabel={result.review_state}
              statusTone="ok"
              title="Request receipt recorded"
            />
            <TerasMetadataList items={modelProfileRequestReceiptItems(result)} />
          </TerasPanel>
        ) : null}
      </TerasTrayStack>
    </TerasModalShell>
  );
}

function ProfileIntentStep({
  draft,
  onUpdateDraft,
}: {
  draft: ModelProfileRequestDraft;
  onUpdateDraft: <TKey extends keyof ModelProfileRequestDraft>(
    key: TKey,
    value: ModelProfileRequestDraft[TKey],
  ) => void;
}) {
  return (
    <TerasPanel frame="padded" treatment="state" tone="warn">
      <TerasPanelHeader
        description="Describe the caller contract and intended use. Provider credentials, routes, and model selection are deliberately absent."
        kicker="Step 1"
        title="Profile Intent"
      />
      <TerasFieldStack spacing="loose">
        <TerasFieldGrid spacing="loose">
          <TerasTextField label="Display name" value={draft.displayName} onValueChange={(value) => onUpdateDraft("displayName", value)} />
          <TerasTextField label="Requesting owner repo" value={draft.ownerRepo} onValueChange={(value) => onUpdateDraft("ownerRepo", value)} />
        </TerasFieldGrid>
        <TerasNoteField label="Intended purpose" value={draft.purpose} onValueChange={(value) => onUpdateDraft("purpose", value)} />
        <TerasTextField label="Registered callers" placeholder="caller-id=owner-repo, another-caller=owner-repo" value={draft.registeredCallers} onValueChange={(value) => onUpdateDraft("registeredCallers", value)} />
        <TerasFieldGrid spacing="loose">
          <TerasSelectField
            label="Environment"
            value={draft.environment}
            onValueChange={(value) => onUpdateDraft("environment", value as ModelProfileRequestDraft["environment"])}
            options={[
              { label: "Dev integration", value: "dev-integration" },
              { label: "Stage", value: "stage" },
              { label: "Production", value: "prod" },
            ]}
          />
          <TerasSelectField
            label="Input data classification"
            value={draft.dataClassification}
            onValueChange={(value) => onUpdateDraft("dataClassification", value as ModelProfileRequestDraft["dataClassification"])}
            options={[
              { label: "Public", value: "public" },
              { label: "Internal", value: "internal" },
              { label: "Confidential", value: "confidential" },
              { label: "Restricted", value: "restricted" },
            ]}
          />
        </TerasFieldGrid>
        <TerasFieldGrid spacing="loose">
          <TerasTextField label="Admitted context URI" value={draft.admittedContextUri} onValueChange={(value) => onUpdateDraft("admittedContextUri", value)} />
          <TerasTextField label="Admitted context digest" placeholder="sha256:..." value={draft.admittedContextDigest} onValueChange={(value) => onUpdateDraft("admittedContextDigest", value)} />
        </TerasFieldGrid>
        <TerasFieldGrid spacing="loose">
          <TerasTextField label="Output schema repo" value={draft.outputSchemaRepo} onValueChange={(value) => onUpdateDraft("outputSchemaRepo", value)} />
          <TerasTextField label="Output schema path" value={draft.outputSchemaPath} onValueChange={(value) => onUpdateDraft("outputSchemaPath", value)} />
          <TerasTextField label="Output schema version" value={draft.outputSchemaVersion} onValueChange={(value) => onUpdateDraft("outputSchemaVersion", value)} />
        </TerasFieldGrid>
        <TerasNoteField label="Operational expectations" placeholder="One expectation per line" value={draft.operationalExpectations} onValueChange={(value) => onUpdateDraft("operationalExpectations", value)} />
      </TerasFieldStack>
    </TerasPanel>
  );
}

function ProfileReviewStep({
  draft,
  error,
  onUpdateDraft,
}: {
  draft: ModelProfileRequestDraft;
  error: string | null;
  onUpdateDraft: <TKey extends keyof ModelProfileRequestDraft>(
    key: TKey,
    value: ModelProfileRequestDraft[TKey],
  ) => void;
}) {
  const checks = [
    ["Gateway", "Required", "OOS routes fulfillment to Platform; the Console never selects a provider route."],
    ["Identity", "Required", "Every registered caller remains bound to its owner and governed profile."],
    ["Audit", "Required", "OOS and Platform receipts must reconcile before completion."],
    ["Security", "Required", "Security acceptance remains mandatory before activation."],
  ] as const;
  return (
    <TerasPanel frame="padded" treatment="rail" tone={error ? "danger" : "warn"}>
      <TerasPanelHeader
        description={error ?? "Review the derived control obligations and record why this exact request should enter governed review."}
        kicker="Step 2"
        statusLabel={error ? "Submission failed" : "Review required"}
        statusTone={error ? "danger" : "warn"}
        title="Review Request"
      />
      <TerasList>
        {checks.map(([label, status, detail], index) => (
          <TerasStatusItem
            detail={detail}
            index={String(index + 1).padStart(2, "0")}
            key={label}
            label={label}
            status={status}
            tone="warn"
          />
        ))}
      </TerasList>
      <TerasNoteField
        label="Operator justification"
        placeholder="Explain why this governed profile is needed and why its caller and data boundary are appropriate."
        value={draft.justification}
        onValueChange={(value) => onUpdateDraft("justification", value)}
      />
    </TerasPanel>
  );
}
