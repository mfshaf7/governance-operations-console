"use client";

import { Download } from "lucide-react";

import {
  TerasActionButton,
  TerasActivityLogPanel,
  TerasStatusItem,
  TerasList,
  TerasDetailGrid,
  TerasMetadataList,
  TerasModalShell,
  TerasPanel,
  TerasPanelHeader,
  TerasPanelStack,
  TerasTrayStack,
} from "@/teras";
import { downloadConsoleBlob } from "@/console-integration/browser-download";

import type { RepositoryAdmissionReceipt } from "../../../local-runtime/repository-runtime.ts";
import type { RepositoryWorkspaceRecord } from "../../../read-model/repository-workspace-read-model.ts";
import {
  repositoryAdmissionRunEvents,
  repositoryAdmissionLogMetadata,
  repositoryAdmissionLogPanelProjection,
  repositoryAdmissionRunSteps,
  repositoryAdmissionRunPreflightMetadata,
  repositoryAdmissionRunPreflightProjection,
  repositoryAdmissionRunReceiptProjection,
} from "./repository-admission-view-model.ts";

export function RepositoryAdmissionRunDialog({
  onBack,
  onClose,
  onRun,
  receipt,
  repository,
}: {
  onBack: (repository: RepositoryWorkspaceRecord | null) => void;
  onClose: () => void;
  onRun: (repository: RepositoryWorkspaceRecord) => void;
  receipt?: RepositoryAdmissionReceipt;
  repository: RepositoryWorkspaceRecord | null;
}) {
  const canRun = Boolean(
    repository &&
    repository.blockers.length === 0 &&
    repository.admissionState === "ready" &&
    !receipt,
  );
  const runSteps = repositoryAdmissionRunSteps(receipt);

  if (!repository) {
    return null;
  }

  const activeRepository = repository;
  const admissionLogRows = repositoryAdmissionRunEvents(
    activeRepository,
    receipt,
  );
  const receiptProjection = repositoryAdmissionRunReceiptProjection(receipt);
  const preflightProjection =
    repositoryAdmissionRunPreflightProjection(receipt);
  const logProjection = repositoryAdmissionLogPanelProjection(receipt);

  function exportRepositoryAdmissionLog() {
    const recordedAt = receipt?.recordedAt ?? "waiting";
    const fileName = `repository-admission-log-${activeRepository.id}-${recordedAt.replace(
      /[:.\\/\s]/g,
      "-",
    )}.txt`;
    const content = [
      "Repository Admission Run Events",
      `Repository: ${activeRepository.name}`,
      `Record: ${activeRepository.id}`,
      `Owner: ${activeRepository.owner}`,
      `Receipt: ${receipt?.receiptId ?? "Not recorded"}`,
      "",
      ...admissionLogRows.map(
        (line) => `${line.formattedTimestamp} ${line.marker} ${line.detail}`,
      ),
      "",
    ].join("\n");

    downloadConsoleBlob(
      new Blob([content], { type: "text/plain;charset=utf-8" }),
      fileName,
    );
  }

  return (
    <TerasModalShell
      bodyLayout="scroll"
      height="content"
      width="standard"
      description="Execute the prototype-local admission review and inspect the generated evidence receipt."
      footer={
        <>
          <TerasActionButton
            onClick={() => onBack(activeRepository)}
            emphasis="secondary"
          >
            Back
          </TerasActionButton>
          <TerasActionButton
            data-repository-admission-run="true"
            disabled={!canRun}
            onClick={() => {
              onRun(activeRepository);
            }}
          >
            Run Local Admission Review
          </TerasActionButton>
        </>
      }
      kicker="Repository Workflow"
      onClose={onClose}
      surfaceId="repository-admission-run"
      title="Repository Admission Run"
    >
      <TerasDetailGrid
        data-repository-admission-run-modal="true"
        scrollGutter
        variant="balanced"
      >
        <TerasPanel
          data-repository-admission-receipt={receipt ? "true" : undefined}
          frame="padded"
          treatment="rail"
          fit="content"
          tone={receiptProjection.tone}
        >
          <TerasPanelHeader
            actionsLayout="inline"
            description={receiptProjection.description}
            kicker={receiptProjection.kicker}
            statusLabel={receiptProjection.statusLabel}
            statusTone={receiptProjection.statusTone}
            title={receiptProjection.title}
          />
          <TerasTrayStack spacing="loose" topOffset="section">
            <TerasList>
              {runSteps.map((item, index) => (
                <TerasStatusItem
                  tone={item.tone}
                  detail={item.detail}
                  index={String(index + 1).padStart(2, "0")}
                  key={item.label}
                  label={item.label}
                  status={item.status}
                />
              ))}
            </TerasList>
          </TerasTrayStack>
        </TerasPanel>

        <TerasPanelStack fill="last">
          <TerasPanel
            frame="padded"
            treatment="rail"
            tone={preflightProjection.tone}
          >
            <TerasPanelHeader
              actionsLayout="inline"
              description="Selected repository and local run boundary."
              kicker="Run Preflight"
              statusLabel={preflightProjection.statusLabel}
              statusTone={preflightProjection.statusTone}
              title={activeRepository.name}
            />
            <TerasTrayStack spacing="loose" topOffset="section">
              <TerasMetadataList
                items={repositoryAdmissionRunPreflightMetadata(
                  activeRepository,
                )}
              />
            </TerasTrayStack>
          </TerasPanel>

          <TerasActivityLogPanel
            data-repository-admission-run-events="true"
            description={logProjection.description}
            fullLog={{
              actions: (
                <TerasActionButton onClick={exportRepositoryAdmissionLog}>
                  <Download aria-hidden="true" size={14} />
                  Export Log
                </TerasActionButton>
              ),
              closeLabel: "Close repository admission log",
              description:
                "Structured repository admission review events retained by the prototype-local run.",
              facts: repositoryAdmissionLogMetadata(activeRepository, receipt),
              rows: admissionLogRows,
              title: "Repository Admission Run Events",
            }}
            rows={admissionLogRows}
            statusLabel={logProjection.statusLabel}
            statusTone={logProjection.statusTone}
            title="Run Events"
            tone={logProjection.tone}
          />
        </TerasPanelStack>
      </TerasDetailGrid>
    </TerasModalShell>
  );
}
