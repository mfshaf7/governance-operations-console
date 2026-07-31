"use client";

import { useEffect, useState } from "react";

import {
  TerasActionButton,
  TerasMetadataList,
  TerasModalShell,
  TerasPanel,
  TerasPanelHeader,
  TerasSegmentedControl,
  TerasStatusPill,
  TerasZone,
  TerasZoneLayout,
} from "@/teras";

import { getPrototypeCommandView } from "../../../work-model/commands/prototype-command-model.ts";
import type {
  PrototypeProjectedReceipt,
  PrototypeRecord,
} from "../../../read-model/prototype-workspace-read-model.ts";
import {
  prototypePreviewStatus,
  prototypeSelectedPanelMeta,
  prototypeSelectedPanelStatus,
} from "../../shared/prototype-record-display-model.ts";
import type {
  PrototypePreviewRuntimeActionId,
  PrototypePreviewRuntimeTab,
  PrototypePreviewProfileDraft,
  PrototypePreviewProfileMutationActionId,
  PrototypePreviewRuntimeMutationActionId,
} from "./prototype-preview-runtime-model.ts";
import {
  prototypePreviewCommandTone,
  prototypePreviewDefaultControlTab,
  prototypePreviewProfileDraftComplete,
  prototypePreviewProfileDraftFromRecord,
  prototypePreviewProofResult,
  prototypePreviewRuntimeTabOptions,
} from "./prototype-preview-runtime-model.ts";
import {
  PrototypePreviewEvidenceMode,
  PrototypePreviewEvidenceModeDock,
} from "./prototype-preview-evidence-mode.tsx";
import {
  PrototypePreviewProfileEditDialog,
  PrototypePreviewProfileMode,
  PrototypePreviewProfileModeDock,
} from "./prototype-preview-profile-mode.tsx";
import {
  PrototypePreviewRuntimeMode,
  PrototypePreviewRuntimeModeDock,
} from "./prototype-preview-runtime-mode.tsx";
import { PrototypePreviewRuntimeActionDialog } from "./prototype-preview-runtime-action-dialog.tsx";
import { PrototypePreviewStopGuardDialog } from "./prototype-preview-stop-guard-dialog.tsx";

export function PrototypePreviewRuntimeModal({
  onBackToDashboard,
  onClose,
  onPreviewCheck,
  onPreviewProfileAction,
  onPreviewRuntimeAction,
  receipts,
  record,
}: {
  receipts: PrototypeProjectedReceipt[];
  onBackToDashboard: () => void;
  onClose: () => void;
  onPreviewCheck: (record: PrototypeRecord) => void;
  onPreviewProfileAction: (
    record: PrototypeRecord,
    draft: PrototypePreviewProfileDraft,
    actionId: PrototypePreviewProfileMutationActionId,
  ) => void;
  onPreviewRuntimeAction: (
    record: PrototypeRecord,
    actionId: PrototypePreviewRuntimeMutationActionId,
  ) => void;
  record: PrototypeRecord | null;
}) {
  const [activeTab, setActiveTab] =
    useState<PrototypePreviewRuntimeTab>("runtime");
  const [activeActionId, setActiveActionId] =
    useState<PrototypePreviewRuntimeActionId | null>(null);
  const [profileDraft, setProfileDraft] =
    useState<PrototypePreviewProfileDraft | null>(null);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [stopGuardOpen, setStopGuardOpen] = useState(false);

  useEffect(() => {
    if (record) {
      setActiveTab(prototypePreviewDefaultControlTab(record));
      setActiveActionId(null);
      setProfileDraft(prototypePreviewProfileDraftFromRecord(record));
      setProfileEditorOpen(false);
      setStopGuardOpen(false);
    }
  }, [record?.id]);

  if (!record) {
    return null;
  }

  const selectedRecord = record;
  const command = getPrototypeCommandView(
    selectedRecord,
    "refresh-preview-proof",
  );
  const proofResult = prototypePreviewProofResult(selectedRecord);
  const previewStatus = prototypePreviewStatus(selectedRecord);
  const selectedStatus = prototypeSelectedPanelStatus(selectedRecord);
  const activeProfileDraft =
    profileDraft ?? prototypePreviewProfileDraftFromRecord(selectedRecord);
  const profileDraftComplete =
    prototypePreviewProfileDraftComplete(activeProfileDraft);
  function updateProfileDraft<Field extends keyof PrototypePreviewProfileDraft>(
    field: Field,
    value: PrototypePreviewProfileDraft[Field],
  ) {
    setProfileDraft((current) => ({
      ...(current ?? prototypePreviewProfileDraftFromRecord(selectedRecord)),
      [field]: value,
    }));
  }
  const modeStage =
    activeTab === "runtime" ? (
      <PrototypePreviewRuntimeMode
        proofResult={proofResult}
        record={selectedRecord}
      />
    ) : activeTab === "profile" ? (
      <PrototypePreviewProfileMode
        previewTone={previewStatus.tone}
        record={selectedRecord}
      />
    ) : (
      <PrototypePreviewEvidenceMode
        proofResult={proofResult}
        record={selectedRecord}
      />
    );
  const modeDock =
    activeTab === "runtime" ? (
      <PrototypePreviewRuntimeModeDock
        onActionSelect={setActiveActionId}
        onRuntimeAction={(actionId) =>
          onPreviewRuntimeAction(selectedRecord, actionId)
        }
        onStopRequest={() => setStopGuardOpen(true)}
        receipts={receipts}
        record={selectedRecord}
      />
    ) : activeTab === "profile" ? (
      <PrototypePreviewProfileModeDock
        onEditProfile={() => setProfileEditorOpen(true)}
        previewTone={previewStatus.tone}
        record={selectedRecord}
      />
    ) : (
      <PrototypePreviewEvidenceModeDock
        commandDisabled={Boolean(command.disabledReason)}
        commandLabel={command.label}
        commandTone={prototypePreviewCommandTone(command)}
        onActionSelect={setActiveActionId}
        onRecordReceipt={() => onPreviewCheck(selectedRecord)}
        proofResult={proofResult}
        record={selectedRecord}
      />
    );

  return (
    <>
      <TerasModalShell
        height="fill"
        description="Preview runtime, profile, and local proof control for the selected prototype."
        footer={
          <TerasActionButton
            onClick={onBackToDashboard}

            emphasis="secondary"
          >
            Back to Dashboard
          </TerasActionButton>
        }
        kicker="Prototype Preview Runtime"
        bodyLayout="fill"
        onClose={onClose}
        surfaceId="prototype-preview-runtime"
        title="Preview Runtime"
        width="large"
      >
        <TerasZoneLayout
          data-prototype-preview-runtime="true"
          variant="main-aside"
        >
          <TerasZone fit="fill" spacing="compact">
            <TerasPanel
              density="comfortable"
              frame="padded"
              treatment="rail"
              tone={selectedStatus.tone}
            >
              <TerasPanelHeader
                actions={
                  <TerasStatusPill tone={selectedStatus.tone}>
                    {selectedStatus.label}
                  </TerasStatusPill>
                }
                actionsLayout="inline"
                description={selectedRecord.summary}
                kicker="Selected Prototype"
                title={selectedRecord.name}
              />
              <TerasMetadataList
                items={prototypeSelectedPanelMeta(selectedRecord)}
                shape="line"
                topOffset="compact"
                treatment="chip"
                wrap
              />
            </TerasPanel>

            <TerasSegmentedControl
              ariaLabel="Preview runtime mode"
              layout="fill"
              onValueChange={(value) =>
                setActiveTab(value as PrototypePreviewRuntimeTab)
              }
              options={prototypePreviewRuntimeTabOptions}
              size="large"
              value={activeTab}
            />

            {modeStage}
          </TerasZone>

          <TerasZone fit="fill">{modeDock}</TerasZone>
        </TerasZoneLayout>
      </TerasModalShell>

      <PrototypePreviewRuntimeActionDialog
        actionId={activeActionId}
        onClose={() => setActiveActionId(null)}
        onPreviewCheck={onPreviewCheck}
        onPreviewRuntimeAction={onPreviewRuntimeAction}
        record={selectedRecord}
      />

      <PrototypePreviewProfileEditDialog
        draft={activeProfileDraft}
        draftComplete={profileDraftComplete}
        onClose={() => {
          setProfileDraft(
            prototypePreviewProfileDraftFromRecord(selectedRecord),
          );
          setProfileEditorOpen(false);
        }}
        onConfirmProfile={() => {
          onPreviewProfileAction(
            selectedRecord,
            activeProfileDraft,
            "confirm-preview-profile",
          );
          setProfileEditorOpen(false);
          setActiveTab("runtime");
        }}
        onDraftChange={updateProfileDraft}
        onSaveProfile={() => {
          onPreviewProfileAction(
            selectedRecord,
            activeProfileDraft,
            "save-preview-profile",
          );
          setProfileEditorOpen(false);
        }}
        open={profileEditorOpen}
        previewTone={previewStatus.tone}
        record={selectedRecord}
      />

      <PrototypePreviewStopGuardDialog
        onClose={() => setStopGuardOpen(false)}
        onStopPreview={(activeRecord) =>
          onPreviewRuntimeAction(activeRecord, "stop-preview")
        }
        open={stopGuardOpen}
        record={selectedRecord}
      />
    </>
  );
}
