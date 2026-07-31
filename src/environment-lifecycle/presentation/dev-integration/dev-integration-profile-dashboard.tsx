"use client";

import { History } from "lucide-react";
import { useState } from "react";

import {
  TerasActionButton,
  TerasActionRow,
  TerasMetadataList,
  TerasModalShell,
  TerasPanel,
  TerasPanelHeader,
  TerasPrimarySideLayout,
  TerasSegmentedControl,
  TerasSummaryCard,
  TerasSummaryCardGrid,
  TerasZone,
} from "@/teras";

import type {
  DevIntegrationProfile,
  DevIntegrationProfileAction,
} from "../../model/dev-integration-profile";
import type {
  EnvironmentLifecycleOperation,
  EnvironmentLifecycleOperationReceipt,
} from "../../model/environment-lifecycle-command";
import {
  ProfileOverviewDock,
  ProfileOverviewStage,
} from "./dashboard/profile-overview-tab";
import {
  ProfileRuntimeDock,
  ProfileRuntimeStage,
} from "./dashboard/profile-runtime-tab";
import {
  ProfileStageHandoffDock,
  ProfileStageHandoffStage,
} from "./dashboard/profile-stage-handoff-tab";
import { ProfileSupportDetailsDialog } from "./dashboard/profile-support-details-dialog";
import {
  devIntegrationLaneLabels,
  devIntegrationLifecycleLabels,
  devIntegrationLifecycleTones,
  devIntegrationPromoteCheckLabels,
  devIntegrationPromoteCheckTones,
  devIntegrationRuntimeLabels,
  devIntegrationRuntimeTones,
  devIntegrationStateModelLabels,
} from "./dev-integration-labels";

type ProfileDashboardTab = "overview" | "runtime" | "stage-handoff";

const dashboardTabs = [
  { label: "Overview", value: "overview" },
  { label: "Runtime", value: "runtime" },
  { label: "Stage Handoff", value: "stage-handoff" },
] as const;

export function DevIntegrationProfileDashboard({
  onBack,
  onOpenHistory,
  onRetryOperation,
  onSubmitProfileAction,
  operations,
  profile,
  receipts,
}: {
  onBack: () => void;
  onOpenHistory: () => void;
  onRetryOperation: (
    operationId: string,
  ) => Promise<EnvironmentLifecycleOperation>;
  onSubmitProfileAction: (
    profileId: string,
    action: DevIntegrationProfileAction,
  ) => Promise<unknown>;
  operations: readonly EnvironmentLifecycleOperation[];
  profile: DevIntegrationProfile;
  receipts: readonly EnvironmentLifecycleOperationReceipt[];
}) {
  const [activeTab, setActiveTab] =
    useState<ProfileDashboardTab>("overview");
  const [supportDetailsOpen, setSupportDetailsOpen] = useState(false);
  const activeStage =
    activeTab === "overview" ? (
      <ProfileOverviewStage
        onOpenSupportDetails={() => setSupportDetailsOpen(true)}
        profile={profile}
      />
    ) : activeTab === "runtime" ? (
      <ProfileRuntimeStage profile={profile} />
    ) : (
      <ProfileStageHandoffStage profile={profile} />
    );
  const activeDock =
    activeTab === "overview" ? (
      <ProfileOverviewDock
        onOpenRuntime={() => setActiveTab("runtime")}
        onOpenStageHandoff={() => setActiveTab("stage-handoff")}
        profile={profile}
      />
    ) : activeTab === "runtime" ? (
      <ProfileRuntimeDock
        onRetryOperation={onRetryOperation}
        onSubmitProfileAction={onSubmitProfileAction}
        operations={operations}
        profile={profile}
        receipts={receipts}
      />
    ) : (
      <ProfileStageHandoffDock
        onRetryOperation={onRetryOperation}
        onSubmitProfileAction={onSubmitProfileAction}
        operations={operations}
        profile={profile}
        receipts={receipts}
      />
    );

  return (
    <>
      <TerasModalShell
        bodyLayout="fill"
        description="Stable profile truth, runtime controls, and governed stage handoff evidence."
        footer={
          <TerasActionButton emphasis="secondary" onClick={onBack}>
            Back to Register
          </TerasActionButton>
        }
        height="fill"
        kicker="Dev Integration Dashboard"
        onClose={onBack}
        surfaceId="dev-integration-profile-dashboard"
        title="Profile Dashboard"
        width="large"
      >
        <TerasPrimarySideLayout
          primaryTop={
            <TerasZone fit="content">
              <TerasPanel
                fit="content"
                frame="padded"
                treatment="rail"
                tone={devIntegrationLifecycleTones[profile.lifecycle]}
              >
                <TerasPanelHeader
                  actions={
                    <TerasActionRow>
                      <TerasActionButton
                        emphasis="secondary"
                        onClick={onOpenHistory}
                      >
                        <History aria-hidden="true" size={15} />
                        History
                      </TerasActionButton>
                    </TerasActionRow>
                  }
                  actionsLayout="inline"
                  description={profile.purpose}
                  kicker="Selected Profile"
                  title={profile.profileId}
                />
                <TerasMetadataList
                  items={[
                    {
                      label: "Owner",
                      value: profile.ownerRepo,
                    },
                    {
                      label: "Platform",
                      value: profile.runtime.platform,
                    },
                    {
                      label: "State model",
                      value:
                        devIntegrationStateModelLabels[
                          profile.runtime.stateModel
                        ],
                    },
                  ]}
                  shape="line"
                  topOffset="compact"
                  treatment="chip"
                  wrap
                />
              </TerasPanel>
              <TerasSummaryCardGrid columns={5}>
                <TerasSummaryCard
                  label="Lifecycle"
                  tone={devIntegrationLifecycleTones[profile.lifecycle]}
                  value={devIntegrationLifecycleLabels[profile.lifecycle]}
                  variant="dense"
                />
                <TerasSummaryCard
                  label="Lane"
                  tone="info"
                  value={devIntegrationLaneLabels[profile.laneClass]}
                  variant="dense"
                />
                <TerasSummaryCard
                  label="Runtime"
                  tone={
                    devIntegrationRuntimeTones[
                      profile.runtime.observation.state
                    ]
                  }
                  value={
                    devIntegrationRuntimeLabels[
                      profile.runtime.observation.state
                    ]
                  }
                  variant="dense"
                />
                <TerasSummaryCard
                  label="Handoff"
                  tone={
                    devIntegrationPromoteCheckTones[
                      profile.stageHandoff.result
                    ]
                  }
                  value={
                    devIntegrationPromoteCheckLabels[
                      profile.stageHandoff.result
                    ]
                  }
                  variant="dense"
                />
                <TerasSummaryCard
                  label="Repositories"
                  tone="info"
                  value={String(profile.participatingRepos.length)}
                  variant="dense"
                />
              </TerasSummaryCardGrid>
            </TerasZone>
          }
          primaryMain={
            <TerasZone fit="fill" spacing="compact">
              <TerasSegmentedControl
                ariaLabel="Select Dev Integration profile view"
                layout="fill"
                onValueChange={setActiveTab}
                options={dashboardTabs}
                size="large"
                value={activeTab}
              />
              {activeStage}
            </TerasZone>
          }
          sideFill={activeDock}
        />
      </TerasModalShell>

      <ProfileSupportDetailsDialog
        onClose={() => setSupportDetailsOpen(false)}
        open={supportDetailsOpen}
        profile={profile}
      />
    </>
  );
}
