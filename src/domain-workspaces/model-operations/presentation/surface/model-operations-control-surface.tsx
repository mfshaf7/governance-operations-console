"use client";

import { ScanSearch } from "lucide-react";

import {
  TerasActionButton,
  TerasActionRow,
  TerasEmptyState,
  TerasFilterBar,
  TerasMetadataList,
  TerasPanel,
  TerasPanelHeader,
  TerasPanelStack,
  TerasRecordControlLayout,
  TerasRegisterPanel,
  TerasSelectedPanel,
} from "@/teras";

import { modelProfileAvailability } from "../../read-model/selectors/model-profile-selectors.ts";
import { ModelProfileDashboard } from "../dashboards/model-profile/model-profile-dashboard.tsx";
import { LocalExceptionRuntimeDialog } from "../dialogs/local-runtime/local-exception-runtime-dialog.tsx";
import { ModelProfileRequestSupportDialog } from "../dialogs/request-support/model-profile-request-support-dialog.tsx";
import {
  localExceptionRuntimeSummaryMetadata,
  localExceptionRuntimeTone,
  modelProfileAvailabilityLabel,
  modelProfileAvailabilityTone,
  modelReadinessLabel,
  modelReadinessTone,
} from "../shared/model-profile-display-model.ts";
import { ModelOperationsControlOverviewPanel } from "./model-operations-control-overview-panel.tsx";
import { ModelProfileRegisterTable } from "./model-profile-register-table.tsx";
import {
  modelAccessPlaneMetadata,
  modelProfileSelectedMetadata,
} from "./model-operations-control-view-model.ts";
import { useModelOperationsControlController } from "./use-model-operations-control-controller.ts";

export function ModelOperationsControlSurface() {
  const controller = useModelOperationsControlController();
  const selectedProfile = controller.selectedProfile;

  if (!selectedProfile) {
    return (
      <TerasEmptyState fill>
        No governed model profiles are available in the projection.
      </TerasEmptyState>
    );
  }

  const availability = modelProfileAvailability(selectedProfile);
  const localRuntimeTone = localExceptionRuntimeTone(
    controller.readModel.localExceptionRuntime,
  );

  return (
    <>
      <TerasRecordControlLayout
        composition="compact-control"
        data-model-operations-control-surface="true"
        mode="overview-register-selected"
        overview={
          <ModelOperationsControlOverviewPanel
            onOpenRequestSupport={controller.requestSupport.show}
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
            description="Canonical profile records and caller-specific readiness projections."
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
                selectedProfileId={selectedProfile.policy.profileId}
              />
            ) : (
              <TerasEmptyState fill>
                No profiles match the current search and filters.
              </TerasEmptyState>
            )}
          </TerasRegisterPanel>
        }
        selected={
          <TerasPanelStack fill="last">
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

            <TerasPanel
              frame="padded"
              treatment="rail"
              fit="content"
              tone={modelReadinessTone(selectedProfile.accessPlane.state)}
            >
              <TerasPanelHeader
                description={selectedProfile.accessPlane.reason}
                kicker="Access Plane"
                statusLabel={modelReadinessLabel(
                  selectedProfile.accessPlane.state,
                )}
                statusTone={modelReadinessTone(
                  selectedProfile.accessPlane.state,
                )}
                title={selectedProfile.accessPlane.id}
              />
              <TerasMetadataList
                items={modelAccessPlaneMetadata(selectedProfile.accessPlane)}
                shape="line"
                treatment="chip"
                wrap
              />
            </TerasPanel>

            <TerasPanel frame="padded" treatment="neutral" fit="fill">
              <TerasPanelHeader
                description="Separate local inventory; it does not satisfy governed profile or caller readiness."
                kicker="Local Exception Runtime"
                statusLabel={controller.readModel.localExceptionRuntime.state}
                statusTone={localRuntimeTone}
                title={controller.readModel.localExceptionRuntime.provider}
              />
              <TerasMetadataList
                items={localExceptionRuntimeSummaryMetadata(
                  controller.readModel.localExceptionRuntime,
                )}
              />
              <TerasActionRow spacing="tight">
                <TerasActionButton
                  onClick={controller.localRuntime.show}
                  emphasis="secondary"
                >
                  <ScanSearch aria-hidden="true" size={14} />
                  Inspect Runtime
                </TerasActionButton>
              </TerasActionRow>
            </TerasPanel>
          </TerasPanelStack>
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
      <LocalExceptionRuntimeDialog
        onClose={controller.localRuntime.close}
        open={controller.localRuntime.open}
        runtime={controller.readModel.localExceptionRuntime}
      />
    </>
  );
}
