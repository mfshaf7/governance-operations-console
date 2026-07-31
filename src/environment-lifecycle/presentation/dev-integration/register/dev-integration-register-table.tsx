import {
  TerasActionButton,
  TerasRecordCellText,
  TerasRecordStatusStack,
  TerasRecordTable,
  TerasStatusPill,
  type TerasRecordTableColumn,
} from "@/teras";

import type { DevIntegrationProfile } from "../../../model/dev-integration-profile";
import {
  devIntegrationLaneLabels,
  devIntegrationLifecycleLabels,
  devIntegrationLifecycleTones,
  devIntegrationRuntimeLabels,
  devIntegrationRuntimeTones,
} from "../dev-integration-labels";

type DevIntegrationRegisterRow = DevIntegrationProfile &
  Readonly<{ onInspect: () => void }>;

const columns: Array<TerasRecordTableColumn<DevIntegrationRegisterRow>> = [
  {
    header: "Profile",
    intent: "primary",
    key: "profile",
    render: (profile) => (
      <TerasRecordCellText
        description={profile.purpose}
        title={profile.profileId}
      />
    ),
  },
  {
    header: "Owner",
    intent: "secondary",
    key: "owner",
    render: (profile) => (
      <TerasRecordCellText
        meta={`${profile.participatingRepos.length} participating repos`}
        title={profile.ownerRepo}
      />
    ),
  },
  {
    header: "Lane",
    intent: "technical",
    key: "lane",
    render: (profile) => (
      <TerasRecordCellText
        meta={profile.runtime.platform}
        title={devIntegrationLaneLabels[profile.laneClass]}
      />
    ),
  },
  {
    header: "Lifecycle",
    intent: "status",
    key: "lifecycle",
    render: (profile) => (
      <TerasRecordStatusStack
        status={
          <TerasStatusPill
            size="compact"
            tone={devIntegrationLifecycleTones[profile.lifecycle]}
          >
            {devIntegrationLifecycleLabels[profile.lifecycle]}
          </TerasStatusPill>
        }
      />
    ),
  },
  {
    header: "Runtime",
    intent: "status",
    key: "runtime",
    render: (profile) => (
      <TerasRecordStatusStack
        status={
          <TerasStatusPill
            size="compact"
            tone={devIntegrationRuntimeTones[profile.runtime.observation.state]}
          >
            {devIntegrationRuntimeLabels[profile.runtime.observation.state]}
          </TerasStatusPill>
        }
      />
    ),
  },
  {
    align: "end",
    header: "Action",
    intent: "action",
    key: "action",
    render: (profile) => (
      <TerasActionButton
        aria-label={`Inspect ${profile.profileId}`}
        emphasis="secondary"
        onClick={(event) => {
          event.stopPropagation();
          profile.onInspect();
        }}
        size="table-compact"
      >
        Inspect
      </TerasActionButton>
    ),
  },
];

export function DevIntegrationRegisterTable({
  onInspect,
  onSelect,
  profiles,
  selectedProfileId,
}: {
  onInspect: (profile: DevIntegrationProfile) => void;
  onSelect: (profile: DevIntegrationProfile) => void;
  profiles: DevIntegrationProfile[];
  selectedProfileId: string | null;
}) {
  const rows: DevIntegrationRegisterRow[] = profiles.map((profile) => ({
    ...profile,
    onInspect: () => onInspect(profile),
  }));

  return (
    <TerasRecordTable
      columns={columns}
      fill
      getRowId={(profile) => profile.profileId}
      onSelect={onSelect}
      rows={rows}
      selectedRowId={selectedProfileId}
    />
  );
}
