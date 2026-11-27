"use client";

import { useEffect, useRef, useState } from "react";
import {
  TerasActionButton, TerasActionRow, TerasContentTray, TerasFieldGrid, TerasFieldStack,
  TerasLoadingState, TerasModalShell, TerasNoteField, TerasRecordMetaText, TerasSelectField, TerasTextField,
} from "@/teras";
import { assertDeliveryChangeResult } from "../../../live-runtime/delivery-change-live-contract.ts";
import { useDeliveryCommandRecovery } from "../../../live-runtime/delivery-command-outcome.ts";
import { applyPIPlanningEpic, PIPlanningApplyError, piPlanningCommandScope, readPIPlanningEpic } from "../../../live-runtime/pi-planning-change.ts";
import type { DatedPIPlacement, DeliveryChangeOperation, DeliveryChangeProjection } from "../../../live-runtime/delivery-change-live-types.ts";

type Placement = DatedPIPlacement & { label: string; sequence: number };

export function PIPlanningFeatureDialog({ epic, pi, placements, onClose, onSaved }: {
  epic: { id: number; title: string };
  pi: string;
  placements: readonly Placement[];
  onClose: (refresh: boolean) => void;
  onSaved: () => void;
}) {
  const [source, setSource] = useState<DeliveryChangeProjection | null>(null);
  const [readAttempt, setReadAttempt] = useState(0);
  const [readError, setReadError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");
  const [targetReason, setTargetReason] = useState("");
  const [childType, setChildType] = useState<"User story" | "Defect">("User story");
  const [childTitle, setChildTitle] = useState("");
  const [childDescription, setChildDescription] = useState("");
  const [childIteration, setChildIteration] = useState("");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const request = useRef<string | null>(null);
  const submitting = useRef(false);
  const recovery = useDeliveryCommandRecovery(piPlanningCommandScope(pi), saving, value => {
    const result = assertDeliveryChangeResult(value);
    request.current = null;
    if (result.status === "applied") onSaved();
    else setNeedsRefresh(true);
    return result.status === "applied";
  });
  const checkingResult = checking || recovery === "checking";

  useEffect(() => {
    let active = true;
    void readPIPlanningEpic(epic.id).then(result => {
      if (!active) return;
      if (["done", "parked", "retired"].includes(result.package.execution_tree.status.toLowerCase()) ||
          !result.package.execution_tree.children.some(item => item.type === "PI Objective" && item.target_pi === pi &&
            !["done", "parked", "retired"].includes(item.status.toLowerCase()))) {
        setReadError("This Epic needs an open objective in the selected PI before you can add a Feature.");
        return;
      }
      setSource(result);
    }).catch(failure => {
      if (active) setReadError(failure instanceof Error ? failure.message : "The current Epic could not be read.");
    });
    return () => { active = false; };
  }, [epic.id, pi, readAttempt]);

  const targetPlacement = placements.find(item => item.iteration === target);
  const childPlacement = placements.find(item => item.iteration === childIteration);
  const tooLate = Boolean(targetPlacement && childPlacement && childPlacement.sequence > targetPlacement.sequence);
  const needsTargetReason = Boolean(targetPlacement && childPlacement && childPlacement.sequence < targetPlacement.sequence);
  const locked = saving || checkingResult || Boolean(request.current) || needsRefresh;
  const ready = Boolean(source && targetPlacement && childPlacement && !tooLate &&
    title.trim() && childTitle.trim() && description.trim() && childDescription.trim() &&
    (!needsTargetReason || targetReason.trim()));
  const choices = [{ value: "", label: "Choose an iteration" }, ...placements.map(item => ({
    value: item.iteration, label: item.label,
  }))];

  async function save() {
    if (submitting.current || checkingResult || needsRefresh) return;
    if (!request.current) {
      if (!source || !targetPlacement || !childPlacement || !ready) return;
      const dated = ({ iteration, start_date, end_date }: Placement) => ({ iteration, start_date, end_date });
      const operation: DeliveryChangeOperation = {
        type: "apply_pi_plan",
        payload: {
          pi,
          feature_addition: {
            title: title.trim(),
            description: description.trim(),
            delivery_target: dated(targetPlacement),
            ...(needsTargetReason ? { delivery_target_reason: targetReason.trim() } : {}),
            first_work_item: { type: childType, title: childTitle.trim(), description: childDescription.trim(), placement: dated(childPlacement) },
          },
        },
      };
      request.current = JSON.stringify({
        operation,
        expectedSourceRevision: source.source_revision,
        acceptedAt: new Date().toISOString(),
        acceptanceNote: `Reviewed Feature and first work item for ${pi}.`,
        commandId: `delivery-change-command:console-apply_pi_plan-${crypto.randomUUID()}`,
      });
    }
    submitting.current = true;
    setSaving(true);
    setError("");
    try {
      const result = await applyPIPlanningEpic(epic.id, request.current, pi, () => setChecking(true));
      request.current = null;
      if (result.status === "applied") {
        onSaved();
      } else if (result.status === "partial_failure") {
        setNeedsRefresh(true);
        setError("Part of the change may have been saved. Close this form and inspect the Feature and first item before trying again.");
      } else {
        const effectError = result.event.effect.error;
        setError(effectError && typeof effectError === "object" && "message" in effectError && typeof effectError.message === "string"
          ? effectError.message : "The plan did not accept this addition. Review the current Epic and calendar.");
      }
    } catch (failure) {
      if (failure instanceof PIPlanningApplyError && failure.status < 500) {
        request.current = null;
        setNeedsRefresh(true);
      }
      setError(failure instanceof Error ? failure.message : "The result is unavailable. Retry the same request.");
    } finally {
      setChecking(false);
      setSaving(false);
      submitting.current = false;
    }
  }

  return <TerasModalShell surfaceId="delivery-pi-planning-add-feature" kicker="PI Planning" title="Add Feature"
    description={`Epic #${epic.id} · ${epic.title} · ${pi}`} bodyLayout="scroll" height="content" width="medium"
    busy={saving} busyLabel={checkingResult ? "Checking the original result…" : "Saving Feature and first work item…"}
    onClose={() => { if (!saving && !request.current) onClose(needsRefresh); }}
    footer={<TerasActionRow>
      <TerasActionButton emphasis="secondary" onClick={() => onClose(needsRefresh)} disabled={saving || Boolean(request.current)}>
        {needsRefresh ? "Return to plan" : "Cancel"}
      </TerasActionButton>
      {source && !needsRefresh && <TerasActionButton onClick={() => void save()} disabled={(!ready && !request.current) || saving || checkingResult}>
        {checkingResult ? "Checking Result" : "Add Feature and work item"}
      </TerasActionButton>}
    </TerasActionRow>}>
    <TerasFieldStack spacing="normal">
      {!source && (readError ? <TerasContentTray title="Epic unavailable" description={readError}
        actions={<TerasActionButton emphasis="secondary" onClick={() => {
          setReadError("");
          setReadAttempt(previous => previous + 1);
        }}>Check again</TerasActionButton>} /> : <TerasLoadingState inline label="Checking the current Epic…" />)}
      {source && <>
        <TerasContentTray title="Feature">
          <TerasFieldStack spacing="compact">
            <TerasTextField label="Feature title" value={title} disabled={locked} maxLength={255} onValueChange={setTitle} />
            <TerasNoteField minimumHeight="short" label="Feature outcome" value={description} disabled={locked} maxLength={16000} onValueChange={setDescription} />
            <TerasSelectField label="Delivery target" options={choices} value={target} disabled={locked} onValueChange={setTarget} />
          </TerasFieldStack>
        </TerasContentTray>
        <TerasContentTray title="First work item">
          <TerasFieldStack spacing="compact">
            <TerasFieldGrid columns={2}>
              <TerasSelectField label="Work type" options={[
                { value: "User story", label: "User story" }, { value: "Defect", label: "Defect" },
              ]} value={childType} disabled={locked} onValueChange={setChildType} />
              <TerasSelectField label="Work item iteration" options={choices} value={childIteration}
                disabled={locked} onValueChange={setChildIteration} />
            </TerasFieldGrid>
            <TerasTextField label="Work item title" value={childTitle} disabled={locked} maxLength={255} onValueChange={setChildTitle} />
            <TerasNoteField minimumHeight="short" label="What needs to be done?" value={childDescription} disabled={locked} maxLength={16000} onValueChange={setChildDescription} />
            <TerasRecordMetaText>New work still needs the normal readiness checks in Execution.</TerasRecordMetaText>
          </TerasFieldStack>
        </TerasContentTray>
        {needsTargetReason && <TerasContentTray title="Later delivery target">
          <TerasNoteField minimumHeight="short" label="Why is delivery scheduled later?"
            value={targetReason} disabled={locked} maxLength={4000} onValueChange={setTargetReason} />
        </TerasContentTray>}
      </>}
      {(error || tooLate) && <TerasContentTray title="Review this addition">
        <p role="alert">{error || "Set the work item iteration on or before the Feature’s delivery target."}</p>
      </TerasContentTray>}
    </TerasFieldStack>
  </TerasModalShell>;
}
