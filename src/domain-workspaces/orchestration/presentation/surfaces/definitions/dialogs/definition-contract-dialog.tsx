"use client";

import { TerasDialog, TerasMetadataList, TerasReadoutField } from "@/teras";

import type {
  OrchestrationAdmissionCheck,
  OrchestrationDefinitionNode,
  OrchestrationDefinitionRecord,
} from "@/domain-workspaces/orchestration/domain/orchestration-definition-types";
import {
  orchestrationAdmissionAreaLabel,
  orchestrationAdmissionStateLabel,
  orchestrationDefinitionNodeTypeLabel,
  type OrchestrationDefinitionInspectorId,
} from "../orchestration-definitions-view-model.ts";

export function DefinitionContractDialog({
  admissionCheck,
  inspector,
  node,
  onClose,
  record,
}: {
  admissionCheck: OrchestrationAdmissionCheck | null;
  inspector: Exclude<
    OrchestrationDefinitionInspectorId,
    "version-history"
  > | null;
  node: OrchestrationDefinitionNode | null;
  onClose: () => void;
  record: OrchestrationDefinitionRecord;
}) {
  const open = Boolean(admissionCheck || inspector || node);

  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      description={contractDialogDescription({
        admissionCheck,
        inspector,
        node,
      })}
      kicker={contractDialogKicker({ admissionCheck, inspector, node })}
      onClose={onClose}
      open={open}
      width="standard"
      title="Definition Contract Detail"
    >
      {node ? <ExecutionNodeDetail node={node} /> : null}
      {admissionCheck ? <AdmissionCheckDetail check={admissionCheck} /> : null}
      {inspector === "trigger-result" ? (
        <TriggerAndResultDetail record={record} />
      ) : null}
      {inspector === "failure-controls" ? (
        <FailureAndControlsDetail record={record} />
      ) : null}
      {inspector === "evidence-security" ? (
        <EvidenceAndSecurityDetail record={record} />
      ) : null}
    </TerasDialog>
  );
}

function ExecutionNodeDetail({ node }: { node: OrchestrationDefinitionNode }) {
  return (
    <>
      <TerasMetadataList
        items={[
          { label: "Node", value: node.label },
          {
            label: "Type",
            value: orchestrationDefinitionNodeTypeLabel(node.type),
          },
          { label: "Owner", value: node.owner },
          { label: "Adapter", value: node.adapter },
          { label: "Timeout", value: node.timeout },
          { label: "Optional", value: node.optional ? "yes" : "no" },
        ]}
      />
      <TerasReadoutField
        fit="content"
        label="Dependencies"
        value={listValue(node.dependencies, "No dependencies")}
      />
      <TerasReadoutField
        fit="content"
        label="Idempotency"
        value={node.idempotency}
      />
      <TerasReadoutField
        fit="content"
        label="Inputs"
        value={listValue(node.inputRefs, "No input references")}
      />
      <TerasReadoutField
        fit="content"
        label="Outputs"
        value={listValue(node.outputRefs, "No output references")}
      />
      <TerasReadoutField
        fit="content"
        label="Evidence references"
        value={listValue(
          [...node.receiptRefs, ...node.artifactRefs, ...node.logRefs],
          "No evidence references",
        )}
      />
    </>
  );
}

function AdmissionCheckDetail({
  check,
}: {
  check: OrchestrationAdmissionCheck;
}) {
  return (
    <>
      <TerasMetadataList
        items={[
          {
            label: "Area",
            value: orchestrationAdmissionAreaLabel(check.area),
          },
          {
            label: "State",
            tone: check.tone,
            value: orchestrationAdmissionStateLabel(check.state),
          },
          { label: "Owner", value: check.owner },
        ]}
      />
      <TerasReadoutField
        fit="content"
        label="Current finding"
        value={check.detail}
      />
      <TerasReadoutField
        fit="content"
        label="Evidence references"
        value={listValue(check.evidenceRefs, "No evidence references")}
      />
    </>
  );
}

function TriggerAndResultDetail({
  record,
}: {
  record: OrchestrationDefinitionRecord;
}) {
  return (
    <>
      <TerasMetadataList
        items={[
          { label: "Definition", value: record.definitionId },
          { label: "Expected Receipt", value: record.expectedReceipt },
          { label: "Return Projection", value: record.returnProjection },
        ]}
      />
      <TerasReadoutField fit="content" label="Trigger" value={record.trigger} />
      <TerasReadoutField
        fit="content"
        label="Completion condition"
        value={record.completionCondition}
      />
    </>
  );
}

function FailureAndControlsDetail({
  record,
}: {
  record: OrchestrationDefinitionRecord;
}) {
  return (
    <>
      <TerasReadoutField
        fit="content"
        label="Failure strategy"
        value={record.failureStrategy}
      />
      <TerasReadoutField
        fit="content"
        label="Cancellation boundary"
        value={record.cancellationBoundary}
      />
      <TerasReadoutField
        fit="content"
        label="Approval requirements"
        value={listValue(
          record.approvalRequirements,
          "No additional approval requirements",
        )}
      />
      <TerasReadoutField
        fit="content"
        label="Re-evaluation condition"
        value={
          record.qualification.reevaluationCondition ??
          "No re-evaluation condition"
        }
      />
    </>
  );
}

function EvidenceAndSecurityDetail({
  record,
}: {
  record: OrchestrationDefinitionRecord;
}) {
  return (
    <>
      <TerasMetadataList
        items={[
          {
            label: "Security Classification",
            value: record.securityClassification,
          },
          { label: "Source Authority", value: record.source.authority },
          { label: "Source Freshness", value: record.source.freshness },
          { label: "Schema", value: record.source.schemaVersion },
          { label: "Source Version", value: record.source.sourceVersion },
        ]}
      />
      <TerasReadoutField
        fit="content"
        label="Evidence requirements"
        value={listValue(
          record.evidenceRequirements,
          "No durable evidence requirements",
        )}
      />
      <TerasReadoutField
        fit="content"
        label="Source reference"
        value={record.source.ref}
      />
    </>
  );
}

function contractDialogDescription({
  admissionCheck,
  inspector,
  node,
}: {
  admissionCheck: OrchestrationAdmissionCheck | null;
  inspector: Exclude<
    OrchestrationDefinitionInspectorId,
    "version-history"
  > | null;
  node: OrchestrationDefinitionNode | null;
}) {
  if (node) {
    return "Execution ownership, inputs, outputs, controls, and evidence references for the selected node.";
  }

  if (admissionCheck) {
    return "The current admission finding, owner, and available evidence references.";
  }

  switch (inspector) {
    case "trigger-result":
      return "The accepted trigger, completion condition, receipt, and returned projection.";
    case "failure-controls":
      return "Failure handling, cancellation, approval, and re-evaluation boundaries.";
    case "evidence-security":
      return "Evidence requirements, security classification, and source authority.";
    default:
      return "";
  }
}

function contractDialogKicker({
  admissionCheck,
  inspector,
  node,
}: {
  admissionCheck: OrchestrationAdmissionCheck | null;
  inspector: Exclude<
    OrchestrationDefinitionInspectorId,
    "version-history"
  > | null;
  node: OrchestrationDefinitionNode | null;
}) {
  if (node) {
    return "Execution Plan";
  }

  if (admissionCheck) {
    return "Admission Posture";
  }

  switch (inspector) {
    case "trigger-result":
      return "Trigger And Result";
    case "failure-controls":
      return "Failure And Controls";
    case "evidence-security":
      return "Evidence And Security";
    default:
      return "Definition Contract";
  }
}

function listValue(values: string[], emptyLabel: string) {
  return values.length > 0 ? values.join(" / ") : emptyLabel;
}
