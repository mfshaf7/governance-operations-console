"use client";

import { useEffect, useState } from "react";

import {
  TerasChoiceGroup,
  TerasDraftCloseGuardDialog,
  TerasEmptyState,
  TerasFieldGrid,
  TerasFieldStack,
  TerasList,
  TerasNoteField,
  TerasPanel,
  TerasPanelHeader,
  TerasReadoutField,
  TerasStatusItem,
  TerasStatusPill,
  TerasTextField,
  TerasWizardFooter,
  TerasWizardModal,
  TerasWizardPanel,
} from "@/teras";

import type { PrototypeRecord } from "../../../read-model/prototype-workspace-read-model.ts";
import type {
  PrototypeClosureViewActions,
  PrototypeClosureViewState,
} from "../../shared/prototype-closure-presentation-model.ts";
import { prototypeClosureAuthorityFact } from "../../shared/prototype-closure-presentation-model.ts";
import type {
  PrototypeClosureAction,
  PrototypeClosureRequestFields,
  PrototypeClosureResult,
} from "../../../live-runtime/prototype-closure-live-types.ts";
import {
  closureActionLabels,
  closureActionsForLifecycle,
  closureFieldsComplete,
  closureFieldsForAction,
  initialClosureFields,
} from "../../../work-model/workflows/closeout-retirement/prototype-closure-work-model.ts";

type ClosureState = PrototypeClosureViewState;
type ClosureActions = PrototypeClosureViewActions;
type Step = "prepare" | "review" | "result";

export function PrototypeClosureModal({
  actions,
  closure,
  onBackToDashboard,
  onClose,
  onOpenHistory,
  ownerEvidence,
  record,
}: {
  actions: ClosureActions;
  closure: ClosureState | null;
  onBackToDashboard: () => void;
  onClose: () => void;
  onOpenHistory: (record: PrototypeRecord) => void;
  ownerEvidence: PrototypeClosureRequestFields;
  record: PrototypeRecord | null;
}) {
  const [step, setStep] = useState<Step>("prepare");
  const [action, setAction] = useState<PrototypeClosureAction>("retire-incubation");
  const [fields, setFields] = useState<PrototypeClosureRequestFields>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [guard, setGuard] = useState<"close" | "back" | null>(null);
  const [dirty, setDirty] = useState(false);

  const preparation = closure?.preparation ?? null;
  const result = closure?.result ?? null;
  const available = preparation ? closureActionsForLifecycle(preparation.expected_state.lifecycle) : [];
  const selectedAction = available.includes(action) ? action : available[0] ?? action;
  const selectedFields = selectedAction === action
    ? fields
    : initialClosureFields(selectedAction, ownerEvidence);
  const complete = available.length > 0 && closureFieldsComplete(selectedAction, selectedFields);

  useEffect(() => {
    if (!record) return;
    setStep(result && !["succeeded", "denied", "failed"].includes(result.status) ? "result" : "prepare");
    setMessage(null);
    setDirty(false);
    setAction("retire-incubation");
    setFields({});
  }, [record?.id]);

  useEffect(() => {
    if (result && !["succeeded", "denied", "failed"].includes(result.status)) setStep("result");
  }, [result?.request_id]);

  if (!record) return null;

  function chooseAction(next: PrototypeClosureAction) {
    setAction(next);
    setFields(initialClosureFields(next, ownerEvidence));
    setDirty(true);
    setMessage(null);
  }

  function updateField(key: keyof PrototypeClosureRequestFields, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  async function submit() {
    if (!preparation || !complete || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await actions.submit(record!, selectedAction, selectedFields, preparation);
      setStep("result");
      setDirty(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Closure request was not accepted.");
    } finally {
      setBusy(false);
    }
  }

  async function runCommand(command: "continue" | "cancel" | "approve" | "deny") {
    if (!result || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await actions.command(record!, result.request_id, command);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Closure could not advance.");
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    if (!result || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await actions.read(record!, result.request_id);
      await actions.load(record!);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Closure state could not be refreshed.");
    } finally {
      setBusy(false);
    }
  }

  function leave(destination: "close" | "back") {
    if (step !== "result" && dirty) {
      setGuard(destination);
      return;
    }
    if (destination === "back") onBackToDashboard();
    else onClose();
  }

  const terminal = result && ["succeeded", "denied", "failed"].includes(result.status);
  const visibleResult = step === "result" || !terminal ? result : null;
  const statusTone = result?.status === "succeeded" ? "ok" :
    result?.status === "failed" || result?.status === "denied" ? "danger" : "info";
  const primaryCommand = result?.status === "decision-required" ? "approve" :
    terminal ? null : "continue";
  const primaryLabel = result?.status === "decision-required" ? "Approve" :
    result?.status === "review-required" ? "Check Review" : "Continue";

  return (
    <>
      <TerasWizardModal
        activeStepId={step}
        description="Review Studio source and evidence before requesting a governed lifecycle change."
        footer={<TerasWizardFooter
          back={{ label: step === "review" ? "Back" : "Back to Dashboard",
            onClick: step === "review" ? () => setStep("prepare") : () => leave("back") }}
          next={step === "prepare" ? { label: "Review", disabled: !complete || busy,
            onClick: () => setStep("review") } : undefined}
          apply={step === "review" ? { label: "Submit Closure", disabled: !complete || busy,
            onClick: () => void submit(), tone: selectedAction === "retire-incubation" ? "danger" : "accent" } :
            step === "result" && result && primaryCommand ? { label: primaryLabel, disabled: busy,
              onClick: () => void runCommand(primaryCommand) } :
            step === "result" && result ? { label: "Refresh", disabled: busy,
              onClick: () => void refresh() } : undefined}
          finish={step === "result" && result?.status === "succeeded" ? {
            label: "Open History", onClick: () => onOpenHistory(record!), emphasis: "secondary" } :
            step === "result" && result?.status === "decision-required" ? {
              label: "Deny", onClick: () => void runCommand("deny"),
              disabled: busy, tone: "danger", emphasis: "secondary" } :
            step === "result" && result && !terminal ? {
              label: "Cancel request", onClick: () => void runCommand("cancel"),
              disabled: busy, tone: "danger", emphasis: "secondary" } : undefined}
        />}
        kicker="Prototype Workflow"
        onClose={() => leave("close")}
        onStepSelect={(id) => {
          if (id === "prepare" || (id === "review" && complete) || (id === "result" && result)) {
            setStep(id as Step);
          }
        }}
        statusLabel={visibleResult?.status ?? preparation?.expected_state.lifecycle ?? "Source pending"}
        statusTone={statusTone}
        steps={[
          { id: "prepare", label: "Prepare", tone: preparation ? "ok" : "muted" },
          { id: "review", label: "Review", tone: complete ? "info" : "muted", available: complete },
          { id: "result", label: "Result", tone: result ? statusTone : "muted", available: Boolean(result) },
        ]}
        subject={{ eyebrow: "Selected Prototype", title: record.name,
          detail: preparation ? `Studio source: ${preparation.prototype_id}` : "Studio source not yet verified" }}
        support={<TerasFieldStack spacing="normal">
          <TerasPanel frame="padded" treatment="neutral" fit="content" spacing="normal">
            <TerasPanelHeader kicker="Source Check" title="Studio authority"
              description="The current source revision and lifecycle determine which actions can be submitted." />
            {preparation ? <TerasList frame="contained">
              <TerasStatusItem label="Lifecycle" detail={preparation.expected_state.lifecycle}
                status="verified" tone="ok" />
              <TerasStatusItem label="Source revision" detail={preparation.authority_revision.slice(0, 12)}
                status="current" tone="info" />
              <TerasStatusItem label="Custody" detail={preparation.expected_state.source_custody ?? "none"}
                status="source" tone="info" />
            </TerasList> : <TerasEmptyState>{closure?.pending ? "Reading Studio source..." :
              closure?.error?.message ?? "No authoritative Closure source is available."}</TerasEmptyState>}
          </TerasPanel>
          {visibleResult ? <TerasPanel frame="padded" treatment="state" tone={statusTone}
            fit="content" spacing="normal">
            <TerasPanelHeader kicker="Closure Progress" title="Current request"
              actions={<TerasStatusPill tone={statusTone}>{visibleResult.status}</TerasStatusPill>}
              actionsLayout="inline"
              description="A request is not complete until OOS reports a merged source readback and terminal receipt." />
            <TerasList frame="contained">
              <TerasStatusItem label="Next action" detail={visibleResult.next_action} status="OOS" tone="info" />
              <TerasStatusItem label={prototypeClosureAuthorityFact(visibleResult).label}
                detail={prototypeClosureAuthorityFact(visibleResult).value}
                status={visibleResult.resolved_authority ? "verified" : "pending"}
                tone={visibleResult.resolved_authority ? "ok" : "muted"} />
              <TerasStatusItem label="Studio review" detail={visibleResult.review ?
                `Review #${visibleResult.review.number}` : "Not opened"}
                status={visibleResult.review?.merged ? "merged" : "pending"}
                tone={visibleResult.review?.merged ? "ok" : "muted"} />
              <TerasStatusItem label="Receipt" detail={visibleResult.receipt?.receipt_id ?? "Not issued"}
                status={visibleResult.receipt ? visibleResult.receipt.outcome : "pending"}
                tone={visibleResult.receipt?.outcome === "completed" ? "ok" : "muted"} />
            </TerasList>
          </TerasPanel> : null}
        </TerasFieldStack>}
        surfaceId="prototype-closure"
        title="Prototype Closure"
      >
        {step === "prepare" ? <TerasWizardPanel kicker="Closure Work" title="Choose the change"
          description="Only actions admitted by the current Studio lifecycle are available.">
          {available.length ? <TerasFieldStack spacing="normal">
            <TerasChoiceGroup ariaLabel="Closure action" frame="tray" label="Action"
              options={available.map((id) => ({ id, label: closureActionLabels[id],
                tone: id === "retire-incubation" ? "danger" as const : "info" as const }))}
              selectedId={selectedAction} onSelect={chooseAction} />
            {selectedAction === "graduate-source" ? <TerasChoiceGroup
              ariaLabel="Source transfer strategy" frame="tray" label="Source transfer"
              options={[{ id: "transfer", label: "Transfer source", tone: "info" },
                { id: "already-owned", label: "Already owned", tone: "info" }]}
              selectedId={selectedFields.transfer_strategy ?? "transfer"}
              onSelect={(transfer_strategy) => {
                setFields(({ already_owned_source_proof_ref: _old, ...current }) => ({ ...current, transfer_strategy }));
                setDirty(true);
              }} /> : null}
            <TerasFieldGrid columns={2} spacing="normal">
              {closureFieldsForAction(selectedAction, selectedFields).map((spec) =>
                selectedAction === "apply-delivery" ? <TerasReadoutField
                  key={spec.key} label={spec.label} fit="content"
                  value={selectedFields[spec.key] ?? "Complete Delivery ingress first"} /> :
                spec.key === "retirement_reason" ? <TerasNoteField key={spec.key}
                  label={spec.label} value={selectedFields[spec.key] ?? ""}
                  onValueChange={(value) => updateField(spec.key, value)}
                  placeholder={spec.placeholder} minimumHeight="short" /> :
                  <TerasTextField key={spec.key} label={spec.label}
                    value={selectedFields[spec.key] ?? ""}
                    onValueChange={(value) => updateField(spec.key, value)}
                    placeholder={spec.placeholder} />)}
            </TerasFieldGrid>
            {message ? <TerasEmptyState>{message}</TerasEmptyState> : null}
          </TerasFieldStack> : <TerasEmptyState>
            {preparation?.expected_state.lifecycle === "graduated"
              ? "Source has already graduated. Its Closure history remains available."
              : closure?.error?.message ?? "Studio source must be verified before Closure can proceed."}
          </TerasEmptyState>}
        </TerasWizardPanel> : null}
        {step === "review" ? <TerasWizardPanel kicker="Closure Review" title="Confirm the request"
          description="Submission records a request. Approval, source merge, readback, and receipt remain separate steps.">
          <TerasList frame="contained">
            <TerasStatusItem label="Action" detail={closureActionLabels[selectedAction]}
              status="selected" tone="info" />
            {closureFieldsForAction(selectedAction, selectedFields).map((spec) =>
              <TerasStatusItem key={spec.key} label={spec.label}
                detail={selectedFields[spec.key] ?? "Missing"}
                status={selectedFields[spec.key] ? "provided" : "needed"}
                tone={selectedFields[spec.key] ? "ok" : "warn"} />)}
            <TerasStatusItem label="Studio revision" detail={preparation?.authority_revision ?? "Not verified"}
              status={preparation ? "bound" : "needed"} tone={preparation ? "ok" : "warn"} />
          </TerasList>
        </TerasWizardPanel> : null}
        {step === "result" ? <TerasWizardPanel kicker="Closure Result" title="Request progress"
          description="Refresh after external review or use the next OOS action shown here.">
          {result ? <TerasList frame="contained">
            <TerasStatusItem label="Request" detail={result.request_id} status={result.status} tone={statusTone} />
            <TerasStatusItem label="Source change" detail={result.canonical_mutation ?
              "Merged and read back" : "No canonical mutation confirmed"}
              status={result.canonical_mutation ? "complete" : "pending"}
              tone={result.canonical_mutation ? "ok" : "warn"} />
            <TerasStatusItem label="Receipt" detail={result.receipt?.receipt_id ?? "Not issued"}
              status={result.receipt?.outcome ?? "pending"}
              tone={result.receipt?.outcome === "completed" ? "ok" : "muted"} />
            {result.failure ? <TerasStatusItem label="Failure" detail={result.failure.message}
              status={result.failure.code} tone="danger" /> : null}
          </TerasList> : <TerasEmptyState>No Closure request has been submitted.</TerasEmptyState>}
          {message ? <TerasEmptyState>{message}</TerasEmptyState> : null}
        </TerasWizardPanel> : null}
      </TerasWizardModal>
      <TerasDraftCloseGuardDialog
        description="Unsubmitted Closure fields will be discarded."
        kicker="Prototype Closure" title="Leave Closure?" open={guard !== null}
        leaveLabel="Discard Draft" onKeepEditing={() => setGuard(null)}
        onLeave={() => { const destination = guard; setGuard(null);
          if (destination === "back") onBackToDashboard(); else onClose(); }} />
    </>
  );
}
