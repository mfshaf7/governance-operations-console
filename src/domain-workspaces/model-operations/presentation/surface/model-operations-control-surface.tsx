"use client";

import { useCallback, useState } from "react";

import {
  TerasActionButton,
  TerasActionRow,
  TerasDraftCloseGuardDialog,
  TerasFieldStack,
  TerasEmptyState,
  TerasFilterBar,
  TerasRecordControlLayout,
  TerasRegisterPanel,
  TerasSelectedPanel,
  TerasList,
  TerasStatusItem,
  TerasSegmentedControl,
} from "@/teras";

import { modelProfileAvailability } from "../../read-model/selectors/model-profile-selectors.ts";
import { ModelProfileDashboard } from "../dashboards/model-profile/model-profile-dashboard.tsx";
import { ModelProfileRequestSupportDialog } from "../dialogs/request-support/model-profile-request-support-dialog.tsx";
import { ModelProfileRequestModal } from "../workflows/profile-request/model-profile-request-modal.tsx";
import { ModelProfileRequestHistoryDialog } from "../dialogs/request-history/model-profile-request-history-dialog.tsx";
import {
  modelProfileAvailabilityLabel,
  modelProfileAvailabilityTone,
} from "../shared/model-profile-display-model.ts";
import { ModelOperationsControlOverviewPanel } from "./model-operations-control-overview-panel.tsx";
import { ModelProfileRegisterTable } from "./model-profile-register-table.tsx";
import {
  modelGovernedAccessSummary,
  modelProfileSelectedMetadata,
} from "./model-operations-control-view-model.ts";
import { useModelOperationsControlController } from "./use-model-operations-control-controller.ts";
import { ModelRuntimeControlSurface } from "./model-runtime-control-surface.tsx";

export function ModelOperationsControlSurface({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) {
  const [view, setView] = useState<"runtime" | "profiles">("profiles");
  const [dirty, setDirty] = useState(false), [nextView, setNextView] = useState<"runtime" | "profiles" | null>(null);
  const reportDirty = useCallback((value: boolean) => { setDirty(value); onDirtyChange?.(value); }, [onDirtyChange]);
  const select = (value: "runtime" | "profiles") => { if (value === view) return; if (dirty) setNextView(value); else setView(value); };
  return <>
    <TerasFieldStack fill="last">
      <TerasActionRow>
        <TerasSegmentedControl ariaLabel="Model Operations pages" value={view} onValueChange={select}
          options={[{ value: "profiles", label: "Purpose profiles" }, { value: "runtime", label: "Models & routing" }]} />
      </TerasActionRow>
      {view === "runtime" ? <ModelRuntimeControlSurface onDirtyChange={reportDirty} /> : <ModelProfileControlSurface />}
    </TerasFieldStack>
    <TerasDraftCloseGuardDialog kicker="Routing draft" title="Discard unsaved routing changes?" description="Saved routing remains with the model owner."
      open={nextView !== null} keepEditingLabel="Keep editing" leaveLabel="Discard draft" onKeepEditing={() => setNextView(null)}
      onLeave={() => { reportDirty(false); if (nextView) setView(nextView); setNextView(null); }} />
  </>;
}

function ModelProfileControlSurface() {
  const controller = useModelOperationsControlController();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<string | null>(null);
  const openHistory = (requestId: string | null = controller.request.latest?.request_id ?? null) => { setHistoryTarget(requestId); setHistoryOpen(true); };
  const selectedProfile = controller.selectedProfile;

  const availability = selectedProfile
    ? modelProfileAvailability(selectedProfile)
    : null;


  return (
    <>
      <TerasRecordControlLayout
        composition="compact-control"
        data-model-operations-control-surface="true"
        mode="overview-register-selected"
        overview={
          <ModelOperationsControlOverviewPanel
            latestRequest={controller.request.latest}
            onOpenHistory={() => openHistory()}
            historyAvailable={controller.request.historyAvailable}
            onOpenRequest={controller.request.show}
            onOpenRequestSupport={controller.requestSupport.show}
            requestAvailable={controller.request.available}
            summary={controller.readModel.summary}
            workspaceStatus={controller.readModel.workspaceStatus}
          />
        }
        register={
          <TerasRegisterPanel
            bodyProps={{
              "data-model-profile-register": "standard",
            }}
            density="compact-control"
            description={controller.source.description}
            filterBar={
              <TerasFilterBar
                filters={[
                  {
                    label: "Filter profile lifecycle",
                    onValueChange: controller.filters.onLifecycleChange,
                    options: controller.filters.lifecycleOptions,
                    value: controller.filters.lifecycle,
                  },
                  {
                    label: "Filter access readiness",
                    onValueChange: controller.filters.onAccessChange,
                    options: controller.filters.accessOptions,
                    value: controller.filters.access,
                  },
                  {
                    label: "Filter profile provider",
                    onValueChange: controller.filters.onProviderChange,
                    options: controller.filters.providerOptions,
                    value: controller.filters.provider,
                  },
                ]}
                search={{
                  ariaLabel: "Search model profiles",
                  onValueChange: controller.filters.onSearchChange,
                  placeholder: "Search profile, purpose, caller, provider...",
                  value: controller.filters.search,
                }}
              />
            }
            kicker="Profile Register"
            statusLabel={`${controller.profiles.filtered.length}/${controller.profiles.all.length} shown`}
            statusTone="info"
            title="Governed profile register"
          >
            {controller.profiles.filtered.length > 0 ? (
              <ModelProfileRegisterTable
                onInspectProfile={controller.dashboard.open}
                onSelectProfile={controller.selectProfile}
                profiles={controller.profiles.filtered}
                selectedProfileId={selectedProfile?.policy.profileId ?? null}
              />
            ) : (
              <TerasEmptyState fill>
                {controller.source.unavailable ? controller.source.description : "No profiles match the current search and filters."}
              </TerasEmptyState>
            )}
          </TerasRegisterPanel>
        }
        selected={
          selectedProfile && availability ? <TerasFieldStack overflow="auto" data-model-profile-sidebar="true">
            <TerasSelectedPanel
              action={{
                description: selectedProfile.requiredMove.detail,
                kicker: "Required Action",
                node: (
                  <TerasActionButton
                    onClick={() => controller.dashboard.open(selectedProfile)}
                  >
                    Open Profile Dashboard
                  </TerasActionButton>
                ),
                title: selectedProfile.requiredMove.label,
              }}
              description={selectedProfile.policy.purpose}
              kicker="Selected Profile"
              meta={modelProfileSelectedMetadata(selectedProfile)}
              selected
              status={{
                label: modelProfileAvailabilityLabel(availability),
                tone: modelProfileAvailabilityTone(availability),
              }}
              title={selectedProfile.policy.profileId}
              tone={modelProfileAvailabilityTone(availability)}
              variant="compact"
            />

            <TerasList ariaLabel="Governed access summary" frame="contained">
              <TerasStatusItem {...modelGovernedAccessSummary(selectedProfile.accessPlane)} />
            </TerasList>
          </TerasFieldStack> : (
            <TerasEmptyState fill>
              No governed model profiles are available from the current authority projection.
            </TerasEmptyState>
          )
        }
        selectedProps={{
          "data-model-operations-selected-profile": "true",
        }}
      />
      <ModelProfileDashboard
        onClose={controller.dashboard.close}
        profile={controller.dashboard.profile}
      />
      <ModelProfileRequestSupportDialog
        onClose={controller.requestSupport.close}
        open={controller.requestSupport.open}
      />
      <ModelProfileRequestModal
        draft={controller.request.draft}
        error={controller.request.error}
        onClose={controller.request.close}
        onStepChange={controller.request.onStepChange}
        onSubmit={controller.request.submit}
        onRecover={() => { controller.request.close(); openHistory(controller.request.draft.requestId); }}
        onUpdateDraft={controller.request.updateDraft}
        open={controller.request.open}
        pending={controller.request.pending}
        result={controller.request.result}
        step={controller.request.step}
      />
      <ModelProfileRequestHistoryDialog open={historyOpen} initialRequestId={historyTarget} requests={controller.request.all} onClose={() => setHistoryOpen(false)} onChanged={controller.request.refresh} />
    </>
  );
}
