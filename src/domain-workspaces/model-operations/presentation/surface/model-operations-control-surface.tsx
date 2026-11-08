"use client";
import { useWorkspaceViewState } from "../../../../console-integration/registers/workspace-view-state.ts";

import { useCallback, useState } from "react";

import {
  TerasActionButton,
  TerasActionRow,
  TerasDraftCloseGuardDialog,
  TerasContentFrame,
  TerasFieldStack,
  TerasEmptyState,
  TerasContentTray,
  TerasLoadingState,
  TerasFilterBar,
  TerasRecordControlLayout,
  TerasRegisterPanel,
  TerasRegisterPagination,
  useRegisterPage,
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
  modelProfileTitle, modelProfilePurpose,
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
import { useModelRuntime } from "../../live-runtime/use-model-runtime.ts";

export function ModelOperationsControlSurface({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) {
  const [view, setView] = useWorkspaceViewState<"runtime" | "profiles">('model:view', "profiles");
  const runtime = useModelRuntime(view === "runtime");
  const profiles = useModelOperationsControlController(view === "profiles");
  const [dirty, setDirty] = useState(false), [nextView, setNextView] = useState<"runtime" | "profiles" | null>(null);
  const reportDirty = useCallback((value: boolean) => { setDirty(value); onDirtyChange?.(value); }, [onDirtyChange]);
  const select = (value: "runtime" | "profiles") => { if (value === view) return; if (dirty) setNextView(value); else setView(value); };
  return <>
    <TerasContentFrame fill variant="single-region">
    <TerasFieldStack fill="last">
      <TerasActionRow>
        <TerasSegmentedControl ariaLabel="Model Operations pages" value={view} onValueChange={select}
          options={[{ value: "profiles", label: "Purpose profiles" }, { value: "runtime", label: "Models & routing" }]} />
      </TerasActionRow>
      {view === "runtime" ? <ModelRuntimeControlSurface runtime={runtime} onDirtyChange={reportDirty} /> : <ModelProfileControlSurface controller={profiles} onOpenRouting={() => select("runtime")} />}
    </TerasFieldStack>
    </TerasContentFrame>
    <TerasDraftCloseGuardDialog kicker="Routing draft" title="Discard unsaved routing changes?" description="Saved routing remains with the model service."
      open={nextView !== null} keepEditingLabel="Keep editing" leaveLabel="Discard draft" onKeepEditing={() => setNextView(null)}
      onLeave={() => { reportDirty(false); if (nextView) setView(nextView); setNextView(null); }} />
  </>;
}

function ModelProfileControlSurface({controller,onOpenRouting}:{controller:ReturnType<typeof useModelOperationsControlController>;onOpenRouting:()=>void}) {
  const page = useRegisterPage(controller.profiles.filtered, JSON.stringify([controller.filters.search.trim().toLowerCase(), controller.filters.lifecycle, controller.filters.access, controller.filters.provider]), 'Purpose profiles');
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
            loading={controller.source.loading}
            sourceRevalidating={controller.source.revalidating}
            latestRequest={controller.request.latest}
            onOpenHistory={() => openHistory()}
            historyAvailable={controller.request.historyAvailable}
            onOpenRequest={controller.request.recoveryId ? ()=>openHistory(controller.request.recoveryId) : controller.request.show}
            recoveryPending={Boolean(controller.request.recoveryId)}
            preview={controller.request.preview}
            sourceUnavailable={controller.source.loading || controller.source.unavailable}
            onOpenRequestSupport={controller.requestSupport.show}
            requestAvailable={controller.request.recoveryId ? controller.request.historyAvailable : controller.request.available}
            summary={controller.readModel.summary}
            workspaceStatus={controller.readModel.workspaceStatus}
          />
        }
        register={
          <TerasRegisterPanel
            bodyProps={{
              "data-model-profile-register": "standard",
            }}
            footer={<TerasRegisterPagination label="Purpose profiles" offset={page.offset} count={page.rows.length} total={controller.profiles.filtered.length} page={page.page} pending={controller.source.loading} unavailable={controller.source.unavailable} hasPrevious={page.hasPrevious} hasNext={page.hasNext} onPrevious={page.previous} onNext={page.next} />}
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
            statusLabel={`${controller.profiles.filtered.length}/${controller.profiles.all.length} matched`}
            statusTone="info"
            title="Governed profile register"
          >
            {controller.profiles.filtered.length > 0 ? (
              <ModelProfileRegisterTable
                onInspectProfile={controller.dashboard.open}
                onSelectProfile={controller.selectProfile}
                profiles={page.rows}
                selectedProfileId={selectedProfile?.policy.profileId ?? null}
              />
            ) : controller.source.loading ? <TerasLoadingState fill label="Loading purpose profiles…" /> : (
              <TerasEmptyState fill>
                {controller.source.unavailable ? <TerasContentTray kicker="Profiles unavailable" description={controller.source.description} actions={<TerasActionButton emphasis="secondary" onClick={()=>void controller.source.refresh()}>Retry</TerasActionButton>} /> : "No profiles match the current search and filters."}
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
              description={modelProfilePurpose(selectedProfile)}
              kicker="Selected Profile"
              meta={modelProfileSelectedMetadata(selectedProfile)}
              selected
              status={{
                label: modelProfileAvailabilityLabel(availability),
                tone: modelProfileAvailabilityTone(availability),
              }}
              title={modelProfileTitle(selectedProfile)}
              tone={modelProfileAvailabilityTone(availability)}
              variant="compact"
            />

            <TerasList ariaLabel="Governed access summary" frame="contained">
              <TerasStatusItem {...modelGovernedAccessSummary(selectedProfile.accessPlane)} />
            </TerasList>
          </TerasFieldStack> : controller.source.loading ? <TerasLoadingState fill label="Preparing profile details…" skeleton="details" /> : (
            <TerasEmptyState fill>
              No purpose profile is available to select.
            </TerasEmptyState>
          )
        }
        selectedProps={{
          "data-model-operations-selected-profile": "true",
        }}
      />
      <ModelProfileDashboard
        preview={controller.request.preview}
        onOpenRouting={onOpenRouting}
        onClose={controller.dashboard.close}
        profile={controller.dashboard.profile}
      />
      <ModelProfileRequestSupportDialog
        onClose={controller.requestSupport.close}
        open={controller.requestSupport.open}
      />
      <ModelProfileRequestModal
        preview={controller.request.preview}
        onInspectSampleResult={controller.request.inspectSampleResult}
        draft={controller.request.draft}
        error={controller.request.error}
        onClose={controller.request.close}
        workflowOptions={controller.request.options}
        submissionAllowed={controller.request.submitAvailable}
        onSubmit={controller.request.submit}
        onRecover={() => { controller.request.close(); openHistory(controller.request.result?.request_id ?? controller.request.draft.requestId); }}
        onUpdateDraft={controller.request.updateDraft}
        open={controller.request.open}
        pending={controller.request.pending}
        outcomeUnknown={Boolean(controller.request.error && controller.request.recoveryId)}
        referenceRequests={controller.request.references}
        result={controller.request.result}
      />
      <ModelProfileRequestHistoryDialog preview={controller.request.preview} open={historyOpen} initialRequestId={historyTarget} requests={controller.request.all} onClose={() => setHistoryOpen(false)} onChanged={controller.request.refresh} onOriginalRead={controller.request.onRecovered} />
    </>
  );
}
