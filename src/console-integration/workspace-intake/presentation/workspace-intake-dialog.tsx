"use client";

import { useEffect, useMemo, useState } from "react";

import {
  TerasActionButton,
  TerasActionRow,
  TerasChoiceGroup,
  TerasContentTray,
  TerasEmptyState,
  TerasLoadingState,
  TerasDraftCloseGuardDialog,
  TerasList,
  TerasMetadataList,
  TerasModalShell,
  TerasDialog,
  TerasFieldStack,
  TerasTechnicalDetails,
  TerasSignalItem,
  TerasWizardFooter,
  TerasWizardModal,
  TerasWizardPanel,
} from "@/teras";

import { useWorkspaceIntakeLiveRuntime } from "../live-runtime/use-workspace-intake-live-runtime.ts";
import { validationApproachLabel, validationRoleLabel, deliveryTargetLabel } from "../workspace-intake-display-options";
import { workspaceIntakeRecordForDecision } from "../workspace-intake-live-contract.ts";
import type {
  WorkspaceIntakeCandidate,
  WorkspaceIntakeDecision,
  WorkspaceIntakeCustodyPreparation,
  WorkspaceIntakeResult,
} from "../workspace-intake-live-types.ts";

type IntakeStep = "decision" | "review" | "result";
type IntakeDecisionSelection = WorkspaceIntakeDecision | "unselected";

export function WorkspaceIntakeDialog({
  candidate,
  repositoryCustody,
  returnLabel = "Back to Delivery",
  initialRequestId,
  hasLocalDraft = false,
  singleReview = false,
  onEditCandidate,
  onNewCandidate,
  onRequestRecorded,
  onClose,
}: {
  candidate: WorkspaceIntakeCandidate;
  repositoryCustody?: WorkspaceIntakeCustodyPreparation;
  returnLabel?: string;
  initialRequestId?: string;
  hasLocalDraft?: boolean;
  singleReview?: boolean;
  onEditCandidate?: () => void;
  onNewCandidate?: () => void;
  onRequestRecorded?: (result: WorkspaceIntakeResult) => void;
  onClose: () => void;
}) {
  const runtime = useWorkspaceIntakeLiveRuntime();
  const [activeStep, setActiveStep] = useState<IntakeStep>(initialRequestId ? "result" : "decision");
  const [decision, setDecision] =
    useState<IntakeDecisionSelection>("unselected");
  const [confirmed, setConfirmed] = useState(false);
  const [requestId, setRequestId] = useState(() => initialRequestId ?? createRequestId());

  const selectedCustody = useMemo(() => {
    if (!repositoryCustody) return undefined;
    const requested = workspaceIntakeRecordForDecision(repositoryCustody.requested_record,
      decision === "unselected" ? "proposed" : decision);
    if (requested.kind !== "repo") return undefined;
    return { request_id: repositoryCustody.request_id, requested_record: requested };
  }, [repositoryCustody, decision]);
  const sourceCandidate = runtime.preparation?.source_candidate;
  const reviewedCandidate: WorkspaceIntakeCandidate = sourceCandidate ? {
    label: candidate.label, target: { kind: sourceCandidate.target.kind, name: sourceCandidate.target.name },
    source: sourceCandidate.source, requested_record: sourceCandidate.requested_record,
    evidence_refs: sourceCandidate.evidence_refs,
  } : candidate;

  useEffect(() => {
    if (initialRequestId) {
      void runtime.read(initialRequestId).catch(() => undefined);
      return;
    }
    setConfirmed(false);
    void runtime.prepare(candidate, selectedCustody).catch(() => undefined);
  }, [candidate, selectedCustody, initialRequestId, runtime.read, runtime.prepare]);

  const decisionRecord = workspaceIntakeRecordForDecision(reviewedCandidate.requested_record,
    decision === "unselected" ? "proposed" : decision);
  const decisionComplete = decision !== "unselected";
  const reviewComplete = decisionComplete && confirmed && !runtime.pending && Boolean(runtime.preparation) &&
    (!repositoryCustody || Boolean(sourceCandidate));
  const result = runtime.result;
  const [closeGuardOpen, setCloseGuardOpen] = useState(false);
  function requestClose() {
    if (runtime.pending) return;
    if (!result && (hasLocalDraft || decision !== "unselected" || confirmed)) setCloseGuardOpen(true);
    else onClose();
  }
  const steps = useMemo(
    () => [
      {
        id: "decision",
        label: "Decision",
        stateLabel: decisionComplete ? "Ready" : "Current",
        tone: decisionComplete ? ("ok" as const) : ("warn" as const),
      },
      {
        available: decisionComplete,
        id: "review",
        label: "Review",
        stateLabel: reviewComplete ? "Ready" : "Pending",
        tone: reviewComplete ? ("ok" as const) : ("muted" as const),
      },
      {
        available: Boolean(result),
        connectsToNext: false,
        id: "result",
        label: "Result",
        stateLabel: result?.status ?? "Pending",
        tone: resultTone(result),
      },
    ],
    [decisionComplete, result, reviewComplete],
  );

  async function submit() {
    if (!reviewComplete || runtime.pending) return;
    await runtime
      .submit({ candidate: reviewedCandidate, decision, requestId })
      .then(result => { onRequestRecorded?.(result); setActiveStep("result"); })
      .catch(() => undefined);
  }

  function startCorrection() {
    if (initialRequestId) { onNewCandidate?.(); return; }
    runtime.reset();
    setRequestId(createRequestId());
    setConfirmed(false);
    setActiveStep("decision");
    void runtime.prepare(candidate, selectedCustody).catch(() => undefined);
  }

  const decisionControls = <>
<TerasChoiceGroup<IntakeDecisionSelection>
            ariaLabel="Workspace classification"
            disabled={runtime.pending}
            frame="tray"
            label="Classification"
            onSelect={(value) => {
              if (runtime.pending) return;
              setDecision(value);
              setConfirmed(false);
            }}
            options={[
              {
                disabled: true,
                id: "unselected",
                label: "Select classification",
                tone: "muted",
              },
              { id: "admitted", label: "Admitted", tone: "ok" },
              { id: "proposed", label: "Proposed", tone: "warn" },
              { id: "out-of-scope", label: "Out of scope", tone: "muted" },
            ]}
            selectedId={decision}
          />
          <TerasContentTray kicker="Decision guidance" description={decision === "admitted" ? "Admitted requests entry into the governed workspace after the required owner checks and review. It does not activate a runtime." : decision === "proposed" ? "Proposed records the item for planning and review before admission." : decision === "out-of-scope" ? "Out of scope records that this item will not enter the governed workspace; ownership and validation metadata are excluded." : "Choose Proposed to record a plan, Admitted to request governed workspace entry, or Out of scope to record an exclusion."} />
  </>;


  const reviewContents = <>          <TerasMetadataList
            items={[
              { label: "Decision", value: decision === "unselected" ? "Choose a classification" : decision },
              { label: "Target", value: `${candidate.target.kind}:${candidate.target.name}` },
              { label: "Source", value: reviewedCandidate.source.class },
              ...(reviewedCandidate.requested_record.kind === "repo" ? [
                { label: "Repository class", value: reviewedCandidate.requested_record.repo_class ?? "Not in scope" },
                { label: "Security bindings", value: reviewedCandidate.requested_record.requires_security_bindings === null ? "Not in scope" : String(reviewedCandidate.requested_record.requires_security_bindings) },
                { label: "Security owner", value: reviewedCandidate.requested_record.security_owner ?? "None" },
                { label: "Provider identity", value: reviewedCandidate.requested_record.provider_repository ? `${reviewedCandidate.requested_record.provider_repository.full_name} / ${reviewedCandidate.requested_record.provider_repository.provider_repository_id}` : "Legacy source" },
                { label: "Validation posture", value: reviewedCandidate.requested_record.validation_behavior?.posture ?? "Not in scope" },
              ] : []),
              {
                label: "Current Record",
                value: runtime.preparation?.expected_state.record_version
                  ? `Version ${runtime.preparation.expected_state.record_version}`
                  : "New record",
              },
            ]}
          />
          {decisionRecord.kind !== "repo" ? <TerasContentTray kicker="Entrant metadata"
            description={decision === "out-of-scope" ? "Ownership and validation metadata is excluded from an out-of-scope classification." : "Review the exact owner and validation metadata for this classification. Return to item details to correct it."}>
            <TerasMetadataList columns={2} items={[
              ...(decisionRecord.kind === "product" ? [
                { label: "Platform owner", value: decisionRecord.platform_owner ?? "Not in scope" },
                { label: "Runtime owner", value: decisionRecord.runtime_owner ?? "Not in scope" },
                { label: "Security owner", value: decisionRecord.security_owner ?? "Not in scope" },
                { label: "Source owners", value: decisionRecord.source_owners.join(", ") || "Not in scope" },
                { label: "Delivery target", value: deliveryTargetLabel(decisionRecord.intended_endpoint) },
              ] : [
                { label: "Owner repository", value: decisionRecord.owner_repo ?? "Not in scope" },
                { label: "Security owner", value: decisionRecord.security_owner ?? "Not in scope" },
                { label: "Component class", value: decisionRecord.component_class ?? "Not in scope" },
                { label: "Associated product", value: decisionRecord.product ?? "None" },
              ]),
              { label: "Validation approach", value: validationApproachLabel(decisionRecord.validation_behavior?.posture) },
              { label: "Item role", value: validationRoleLabel(decisionRecord.validation_behavior?.wgcf_graph_role) },
              { label: "Direct governance checks", value: decisionRecord.validation_behavior ? decisionRecord.validation_behavior.catalog_refs.length ? `${decisionRecord.validation_behavior.catalog_refs.length} recorded checks` : "No direct checks" : "Not in scope" },
            ]} />
            <TerasTechnicalDetails summary="Purpose, validation and evidence" items={[
              { label: "Purpose and boundary", value: decisionRecord.notes },
              { label: "Owner validation evidence", value: decisionRecord.validation_behavior?.notes ?? "Not in scope" },
              { label: "Source reference", value: reviewedCandidate.source.ref },
              { label: "Source digest", value: reviewedCandidate.source.digest },
              { label: "Validation posture code", value: decisionRecord.validation_behavior?.posture ?? "Not in scope" },
              { label: "Validation role code", value: decisionRecord.validation_behavior?.wgcf_graph_role ?? "Not in scope" },
              { label: "Catalog bindings", value: decisionRecord.validation_behavior?.catalog_refs.join(", ") || "None" },
              ...(decisionRecord.kind === "product" ? [{ label: "Delivery target code", value: decisionRecord.intended_endpoint ?? "Not in scope" }] : []),
              ...reviewedCandidate.evidence_refs.map((value, index) => ({ label: `Evidence ${index + 1}`, value })),
            ]} />
          </TerasContentTray> : null}
          <TerasList frame="contained">
            {!singleReview ? <TerasSignalItem
              label="Review Check"
              statusLabel={runtime.preparation ? "Current" : "Unavailable"}
              title="Canonical authority binding"
              tone={runtime.preparation ? "ok" : "warn"}
            /> : null}
            <TerasSignalItem
              actionLabel={confirmed ? "Confirmed" : "Confirm exact review"}
              ariaLabel="Confirm the Workspace Intake review"
              label="Operator Acceptance"
              onSelect={() => { if (!runtime.pending && decisionComplete) setConfirmed((current) => !current); }}
              title={confirmed ? "Exact candidate confirmed" : "Confirmation required"}
              tone={confirmed ? "ok" : "warn"}
            />
          </TerasList></>;
  if (singleReview) {
    const showingResult = activeStep === "result";
    const resultTitle = result ? ({ accepted: "Registration submitted", succeeded: "Registration completed", rejected: "Registration not accepted", "requires-action": "Registration needs attention", cancelled: "Registration cancelled", cancelling: "Cancelling registration", evaluating: "Checking registration", preparing: "Preparing registration", "review-required": "Registration awaiting review" } satisfies Record<WorkspaceIntakeResult["status"], string>)[result.status] : "Registration request";
    const plainActions = <>
      <TerasActionButton emphasis="secondary" disabled={runtime.pending} onClick={!showingResult && onEditCandidate ? onEditCandidate : requestClose}>{!showingResult && onEditCandidate ? "Back to Entrant Details" : returnLabel}</TerasActionButton>
      {!showingResult ? <TerasActionButton busy={runtime.pending} disabled={!reviewComplete || runtime.pending} onClick={() => void submit()}>{runtime.pending ? "Submitting…" : "Submit Classification"}</TerasActionButton> : null}
    </>;
    const closeGuard = <TerasDraftCloseGuardDialog open={closeGuardOpen} kicker="Unsaved classification" title="Discard Classification Draft?" description="Your candidate and classification choices have not been submitted." leaveLabel="Discard Draft" onKeepEditing={() => setCloseGuardOpen(false)} onLeave={onClose}/>;
    if (showingResult) return <>
      <TerasDialog busy={runtime.pending} busyLabel="Reading original registration…" open width="standard" height="content" contentOverflow="auto" closeLabel="Close modal" closeDisabled={runtime.pending} onClose={requestClose} kicker={candidate.label} title={resultTitle} actions={plainActions}>
        <TerasFieldStack spacing="normal">
          {runtime.error ? <TerasContentTray kicker="Needs attention" description={runtime.error.message}/> : null}
          {result ? <>
            <TerasContentTray description={result.status === "succeeded" ? "The registration is recorded. Active inventory promotion remains a separate action." : "Your request is recorded. Follow its next action; submission is not completion."}/>
            <TerasMetadataList items={[{label:"Status",value:result.status.replaceAll("-"," ")},{label:"Next action",value:result.next_action.replaceAll("-"," ")}]}/>
            {result.readiness_findings?.length ? <TerasList frame="contained">{result.readiness_findings.map((finding,index)=><TerasSignalItem key={index} label="Readiness finding" title={finding.message} detail={finding.next_action.replaceAll("-"," ")} tone="danger"/>)}</TerasList> : null}
            <TerasTechnicalDetails summary="Request and receipt details" items={[{label:"Request",value:result.request_id},{label:"Revision",value:String(result.revision)},{label:"Receipt",value:result.receipt?.receipt_id ?? "Not issued"},{label:"Request history",value:JSON.stringify(result.history,null,2)}]}/>
            <TerasActionRow>
              <TerasActionButton emphasis="secondary" disabled={runtime.pending} onClick={()=>void runtime.read(requestId).catch(()=>undefined)}>Refresh Original Request</TerasActionButton>
              {result.review ? <TerasActionButton emphasis="secondary" onClick={()=>window.open(result.review?.url,"_blank","noopener,noreferrer")}>Open Review</TerasActionButton> : null}
              {["continue","restore-dependency-and-retry","review-and-merge"].includes(result.next_action) || result.status === "review-required" ? <TerasActionButton disabled={runtime.pending} onClick={()=>void runtime.continueRequest(requestId).catch(()=>undefined)}>{result.status === "review-required" ? "Check Review" : "Continue"}</TerasActionButton> : null}
              {result.status === "review-required" ? <TerasActionButton emphasis="secondary" disabled={runtime.pending} onClick={()=>void runtime.cancel(requestId).catch(()=>undefined)}>Cancel Request</TerasActionButton> : null}
              {result.next_action === "submit-corrected-request" ? <TerasActionButton disabled={runtime.pending} onClick={startCorrection}>Correct Request</TerasActionButton> : null}
            </TerasActionRow>
          </> : runtime.pending ? <TerasLoadingState label="Reading original request…" skeleton="details" /> : <TerasEmptyState>No request outcome is available.</TerasEmptyState>}
        </TerasFieldStack>
      </TerasDialog>{closeGuard}
    </>;
    return <>
      <TerasModalShell busy={runtime.pending} busyLabel="Reading classification details…" bodyLayout="scroll" height="content" width="standard" title="Workspace Intake Classification" kicker={candidate.label} surfaceId="workspace-intake-classification" description="Choose the classification and confirm this registration." onClose={requestClose} footer={plainActions}>
        <TerasFieldStack spacing="loose">
          {runtime.error ? <TerasContentTray kicker="Source unavailable" description={runtime.error.message}/> : null}
          {decisionControls}
          {reviewContents}
          <TerasTechnicalDetails summary="Source details" items={[{label:"Source reference",value:reviewedCandidate.source.ref},{label:"Source digest",value:reviewedCandidate.source.digest},{label:"Authority revision",value:runtime.preparation?.authority_revision ?? "Not read"},...reviewedCandidate.evidence_refs.map((value,index)=>({label:`Evidence ${index+1}`,value}))]}/>
        </TerasFieldStack>
      </TerasModalShell>{closeGuard}
    </>;
  }

  return (
    <>
    <TerasWizardModal
      busy={runtime.pending}
      busyLabel="Reading or submitting registration…"
      activeStepId={activeStep}
      description={singleReview ? "Review this registration and choose how it should enter the workspace." : "Classify the candidate against current Workspace Governance authority and follow the resulting review."}
      footer={
        <TerasWizardFooter
          apply={
            (activeStep === "review" || (singleReview && activeStep === "decision"))
              ? {
                  disabled: !reviewComplete || runtime.pending,
                  label: runtime.pending ? "Submitting..." : "Submit Classification",
                  onClick: () => void submit(),
                }
              : undefined
          }
          back={
            activeStep === "review"
              ? { disabled: runtime.pending, label: "Back", onClick: () => setActiveStep("decision") }
              : activeStep === "decision"
                ? { disabled: runtime.pending, label: onEditCandidate && !initialRequestId ? "Back to Entrant Details" : returnLabel,
                    onClick: onEditCandidate && !initialRequestId ? onEditCandidate : requestClose }
                : undefined
          }
          finish={
            activeStep === "result"
              ? { disabled: runtime.pending, label: returnLabel, onClick: requestClose }
              : undefined
          }
          next={
            activeStep === "decision" && !singleReview
              ? {
                  disabled: !decisionComplete || !runtime.preparation || runtime.pending || Boolean(repositoryCustody && !sourceCandidate),
                  label: "Review Classification",
                  onClick: () => setActiveStep("review"),
                }
              : undefined
          }
        />
      }
      kicker="Workspace Intake"
      onClose={requestClose}
      onStepSelect={(stepId) => {
        if (initialRequestId || runtime.pending) return;
        if (
          stepId === "decision" ||
          (stepId === "review" && decisionComplete) ||
          (stepId === "result" && result)
        ) {
          setActiveStep(stepId as IntakeStep);
        }
      }}
      statusLabel={result?.status ?? (runtime.preparation ? "Prepared" : "Unavailable")}
      statusTone={result ? resultTone(result) : runtime.preparation ? "info" : "warn"}
      steps={initialRequestId ? [{ id: "result", label: "Retained Request", stateLabel: result?.status ?? "Reading", tone: resultTone(result) }] : steps}
      subject={{
        detail: `${candidate.target.kind} / ${candidate.target.name}`,
        eyebrow: "Workspace Candidate",
        title: candidate.label,
      }}
      support={
        <WorkspaceIntakeSupport
          candidate={reviewedCandidate}
          error={runtime.error?.message}
          onCancel={() => void runtime.cancel(requestId).catch(() => undefined)}
          onContinue={() => void runtime.continueRequest(requestId).catch(() => undefined)}
          onStartCorrection={startCorrection}
          pending={runtime.pending}
          preparation={runtime.preparation}
          retained={Boolean(initialRequestId)}
          result={result}
        />
      }
      surfaceId="workspace-intake-classification"
      title="Workspace Intake Classification"
    >
      {activeStep === "decision" && !singleReview ? (
        <TerasWizardPanel
          description="Choose the workspace classification for this exact source candidate."
          kicker="Classification"
          title={singleReview ? "Registration review" : "Intake Decision"}
        >
          {decisionControls}
          {!singleReview ? <TerasContentTray description={candidate.requested_record.notes} kicker="Source Context" /> : null}
        </TerasWizardPanel>
      ) : null}
      {activeStep === "review" || (singleReview && activeStep === "decision") ? (
        <TerasWizardPanel
          description={singleReview ? "Check the item details, choose its classification and confirm to submit." : "Confirm the reviewed candidate and exact canonical state before OOS accepts the command."}
          kicker="Authority Review"
          title={singleReview ? "Registration review" : "Review Classification"}
        >
          {singleReview ? decisionControls : null}
          {reviewContents}

        </TerasWizardPanel>
      ) : null}
      {activeStep === "result" ? (
        <WorkspaceIntakeResultPanel result={result} error={runtime.error?.message} />
      ) : null}
    </TerasWizardModal>
    <TerasDraftCloseGuardDialog open={closeGuardOpen} kicker="Unsaved classification"
      title="Discard Classification Draft?" description="Your candidate and classification choices have not been submitted."
      leaveLabel="Discard Draft" onKeepEditing={() => setCloseGuardOpen(false)} onLeave={onClose} />
    </>
  );
}

function WorkspaceIntakeSupport({
  candidate,
  error,
  onCancel,
  onContinue,
  onStartCorrection,
  pending,
  preparation,
  result,
  retained = false,
}: {
  candidate: WorkspaceIntakeCandidate;
  error?: string;
  onCancel: () => void;
  onContinue: () => void;
  onStartCorrection: () => void;
  pending: boolean;
  preparation: ReturnType<typeof useWorkspaceIntakeLiveRuntime>["preparation"];
  result: WorkspaceIntakeResult | null;
  retained?: boolean;
}) {
  return (
    <>
      <TerasWizardPanel
        description="Source evidence and current canonical binding used for this classification."
        fit="content"
        kicker="Candidate Evidence"
        title={retained ? "Original request source" : preparation ? "Source prepared" : "Source unavailable"}
        tone={retained || preparation ? "info" : "warn"}
        treatment="rail"
      >
        <TerasMetadataList columns={1} items={[
          { label: "Source", value: candidate.source.class === "direct" ? "Operator registration" : candidate.source.class === "delivery" ? "Delivery closeout" : candidate.source.class === "prototype" ? "Prototype handoff" : "Repository custody" },
          { label: "Attached references", value: String(candidate.evidence_refs.length) },
          { label: "Owner authority", value: preparation ? "Current source checked" : retained ? "Recorded original request" : "Not yet read" },
        ]} />
        <TerasTechnicalDetails summary="Source details" items={[
          { label: "Source reference", value: candidate.source.ref },
          { label: "Source digest", value: candidate.source.digest },
          ...(preparation?.source_candidate ? [{ label: "Candidate digest", value: preparation.source_candidate.candidate_digest }] : []),
          { label: "Authority revision", value: preparation?.authority_revision ?? "Not read" },
          ...candidate.evidence_refs.map((value, index) => ({ label: `Evidence ${index + 1}`, value })),
        ]} />
      </TerasWizardPanel>
      {result ? (
        <>
        {result.readiness_findings?.length ? <TerasWizardPanel fit="content" kicker="Owner readiness findings"
          title="Classification requires correction" description="Owner findings for this exact request. Follow the recorded next action before preparing another decision."
          tone="danger" treatment="rail">
          <TerasList frame="contained">
            {result.readiness_findings.map((finding, index) => <TerasSignalItem key={`${finding.code}:${index}`}
              label={finding.code} title={finding.message} detail={finding.next_action.replaceAll("-", " ")} tone="danger" />)}
          </TerasList>
        </TerasWizardPanel> : null}
        <TerasWizardPanel
          actions={
            result.next_action === "continue" ||
            result.next_action === "restore-dependency-and-retry"
              ? (
                  <TerasActionButton disabled={pending} onClick={onContinue}>
                    Continue
                  </TerasActionButton>
                )
              : result.next_action === "review-and-merge" && result.review ? (
                  <TerasActionButton
                    onClick={() => window.open(result.review?.url, "_blank", "noopener,noreferrer")}
                  >
                    Open Review
                  </TerasActionButton>
                ) : result.next_action === "submit-corrected-request" ? (
                  <TerasActionButton onClick={onStartCorrection}>
                    {retained ? "Prepare a reviewed correction" : "Correct Request"}
                  </TerasActionButton>
                ) : undefined
          }
          description="OOS owns durable progress. Canonical mutation is true only after reviewed merge and readback."
          fit="content"
          kicker="Current Move"
          title={result.next_action.replaceAll("-", " ")}
          tone={resultTone(result)}
          treatment="rail"
        >
          {result.status === "review-required" ? (
            <TerasContentTray
              actions={
                <TerasActionRow spacing="tight">
                  <TerasActionButton disabled={pending} onClick={onContinue}>
                    Check Review
                  </TerasActionButton>
                  <TerasActionButton emphasis="secondary" disabled={pending} onClick={onCancel}>
                    Cancel Request
                  </TerasActionButton>
                </TerasActionRow>
              }
              description="Merge remains a human provider action. Cancel only the unmerged request."
              kicker="Review Boundary"
            />
          ) : null}
        </TerasWizardPanel>
        </>
      ) : null}
      {error ? (
        <TerasWizardPanel
          description="The current request state is preserved for inspection or retry."
          fit="content"
          kicker="Workflow Stopped"
          title="Workspace Intake Unavailable"
          tone="danger"
          treatment="rail"
        >
          <TerasEmptyState>{error}</TerasEmptyState>
        </TerasWizardPanel>
      ) : null}
    </>
  );
}

function WorkspaceIntakeResultPanel({
  error,
  result,
}: {
  error?: string;
  result: WorkspaceIntakeResult | null;
}) {
  return (
    <TerasWizardPanel
      description="Inspect durable progress, review evidence, and the canonical completion receipt when available."
      kicker="Workflow Result"
      title={
        result?.status === "succeeded"
          ? "Classification Complete"
          : result
            ? "Workflow Progress"
            : "Result Unavailable"
      }
    >
      {result ? (
        <>
          <TerasMetadataList
            items={[
              { label: "Status", value: result.status },
              { label: "Request", value: result.request_id },
              { label: "Revision", value: String(result.revision) },
              { label: "Canonical Mutation", value: result.canonical_mutation ? "Proven" : "Not claimed" },
              { label: "Receipt", value: result.receipt?.receipt_id ?? "Pending" },
            ]}
          />
          <TerasList frame="contained" scrollHeight="short">
            {result.history.map((event) => (
              <TerasSignalItem
                detail={event.at}
                key={event.sequence}
                label={`Event ${event.sequence}`}
                title={event.status.replaceAll("-", " ")}
                tone={event.status === "succeeded" ? "ok" : "info"}
              />
            ))}
          </TerasList>
        </>
      ) : (
        <TerasEmptyState>{error ?? "No Workspace Intake result is available."}</TerasEmptyState>
      )}
    </TerasWizardPanel>
  );
}

function createRequestId() {
  return `workspace-intake-request:console-${crypto.randomUUID()}`;
}

function resultTone(result: WorkspaceIntakeResult | null) {
  if (!result) return "muted" as const;
  if (result.status === "succeeded") return "ok" as const;
  if (result.status === "rejected") return "danger" as const;
  if (result.status === "requires-action") return "warn" as const;
  return "info" as const;
}
