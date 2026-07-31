import {
  TerasActionButton,
  TerasRecordCellText,
  TerasRecordTable,
  type TerasRecordTableColumn,
  TerasStatusPill,
} from "@/teras";

import { modelProfileAvailability } from "../../read-model/selectors/model-profile-selectors.ts";
import type { ModelProfileRecord } from "../../read-model/types/model-operations-types.ts";
import {
  modelProfileAvailabilityLabel,
  modelProfileAvailabilityTone,
  modelProfileLifecycleLabel,
  modelProfileResolutionLabel,
} from "../shared/model-profile-display-model.ts";

export function ModelProfileRegisterTable({
  onInspectProfile,
  onSelectProfile,
  profiles,
  selectedProfileId,
}: {
  onInspectProfile: (profile: ModelProfileRecord) => void;
  onSelectProfile: (profile: ModelProfileRecord) => void;
  profiles: ModelProfileRecord[];
  selectedProfileId: string | null;
}) {
  const columns: Array<TerasRecordTableColumn<ModelProfileRecord>> = [
    {
      header: "Profile",
      intent: "primary",
      key: "profile",
      render: (profile) => (
        <TerasRecordCellText
          description={profile.policy.purpose}
          title={profile.policy.profileId}
        />
      ),
    },
    {
      header: "Lifecycle",
      intent: "status",
      key: "lifecycle",
      render: (profile) => (
        <TerasStatusPill
          tone={modelProfileAvailabilityTone(modelProfileAvailability(profile))}
        >
          {modelProfileLifecycleLabel(profile.policy.lifecycle)}
        </TerasStatusPill>
      ),
    },
    {
      header: "Access Readiness",
      intent: "status",
      key: "access",
      render: (profile) => {
        const availability = modelProfileAvailability(profile);

        return (
          <TerasStatusPill tone={modelProfileAvailabilityTone(availability)}>
            {modelProfileAvailabilityLabel(availability)}
          </TerasStatusPill>
        );
      },
    },
    {
      header: "Resolution",
      intent: "secondary",
      key: "resolution",
      render: (profile) => (
        <TerasRecordCellText
          description={profile.policy.provider}
          title={modelProfileResolutionLabel(profile)}
        />
      ),
    },
    {
      header: "Action",
      intent: "action",
      key: "action",
      render: (profile) => (
        <TerasActionButton
          onClick={(event) => {
            event.stopPropagation();
            onInspectProfile(profile);
          }}
          size="table-compact"
          emphasis="secondary"
        >
          Open Dashboard
        </TerasActionButton>
      ),
    },
  ];

  return (
    <TerasRecordTable
      columns={columns}
      fill
      getRowId={(profile) => profile.policy.profileId}
      onSelect={onSelectProfile}
      rows={profiles}
      selectedRowId={selectedProfileId}
    />
  );
}
