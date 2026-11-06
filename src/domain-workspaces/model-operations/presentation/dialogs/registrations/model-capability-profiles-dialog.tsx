"use client";

import { useEffect, useState } from "react";
import {
  TerasActionButton, TerasContentTray, TerasDialog, TerasDraftCloseGuardDialog,
  TerasFieldStack, TerasMetadataList, TerasSelectField,
} from "@/teras";
import type { ModelRegistry } from "../../../work-model/model-runtime-contract.ts";
import { workflowTaskLabel } from "../../../work-model/model-runtime-routing.ts";
import { capabilityProfileMetadata } from "../../shared/model-profile-lifecycle-view-model.ts";

export function ModelCapabilityProfilesDialog({ registry, preview, blocked, pending, onClose, onSubmit }: {
  registry: ModelRegistry;
  preview: boolean;
  blocked: boolean;
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: { capability_id: string; profile_id: string }, revision: number) => Promise<unknown>;
}) {
  const [capabilityId, setCapabilityId] = useState(registry.capabilities?.[0]?.capability_id ?? "");
  const capability = registry.capabilities?.find(row => row.capability_id === capabilityId);
  const [profileId, setProfileId] = useState(capability?.selected_profile_id ?? "");
  const [revision, setRevision] = useState(registry.configuration.revision);
  const [leave, setLeave] = useState(false), [nextCapability, setNextCapability] = useState<string | null>(null);
  const dirty = Boolean(capability && profileId !== capability.selected_profile_id);
  const moved = revision !== registry.configuration.revision;
  const selected = capability?.profiles.find(row => row.profile_id === profileId);
  useEffect(() => {
    if (!dirty) { setProfileId(capability?.selected_profile_id ?? ""); setRevision(registry.configuration.revision); }
  }, [capability, registry.configuration.revision, dirty]);
  function choose(id: string) {
    setCapabilityId(id);
    setProfileId(registry.capabilities?.find(row => row.capability_id === id)?.selected_profile_id ?? "");
    setRevision(registry.configuration.revision);
  }
  const close = () => dirty ? setLeave(true) : onClose();
  return <>
    <TerasDialog open title="Permission profile selection" kicker="Models & routing"
      description="Choose the permission profile an existing Console AI Capability uses. This does not change its instructions or implement new behavior."
      width="standard" height="content" contentOverflow="auto" closeDisabled={pending} onClose={close}
      actions={<><TerasActionButton emphasis="secondary" disabled={pending} onClick={close}>Cancel</TerasActionButton>
        <TerasActionButton disabled={preview || blocked || pending || !dirty || moved || !selected?.selectable}
          onClick={() => { if (capability && selected?.selectable) void onSubmit({ capability_id: capability.capability_id, profile_id: selected.profile_id }, revision); }}>Save profile selection</TerasActionButton></>}>
      <TerasFieldStack spacing="normal">
        {preview ? <TerasContentTray kicker="Design preview" description="Sample choices only. Saving is disabled." /> : blocked ? <TerasContentTray kicker="Read-only selection" description="The source must be current and earlier operations resolved before saving. The last confirmed selection remains visible." /> : null}
        <TerasSelectField label="Console AI Capability" helper="Choose the AI function this permission profile applies to." value={capabilityId} disabled={pending}
          options={(registry.capabilities ?? []).map(row => ({ value: row.capability_id, label: workflowTaskLabel(row.capability_id) }))}
          onValueChange={id => dirty ? setNextCapability(id) : choose(id)} />
        {capability ? <>
          <TerasMetadataList items={capabilityProfileMetadata(capability)} />
          <TerasSelectField label="Permission profile" value={profileId} disabled={pending}
            options={capability.profiles.filter(row => row.selectable || row.profile_id === capability.selected_profile_id || row.profile_id === profileId).map(row => ({ value: row.profile_id,
              label: (row.profile_id === capability.capability_id ? "Standard profile" : row.name) + (!row.selectable ? " · " + row.state : "") }))}
            onValueChange={setProfileId} />
          <TerasContentTray kicker="How it is used" description="Both the capability's base permissions and the selected profile must allow each request. Create or change profiles in Purpose profiles; activation and selection are separate actions." />
        </> : <TerasContentTray kicker="Capability choices unavailable" description="The model service has not supplied a current capability catalog." />}
        {moved ? <TerasContentTray kicker="Settings changed" description="Close and reopen this form to review the current selection before saving." /> : null}
      </TerasFieldStack>
    </TerasDialog>
    <TerasDraftCloseGuardDialog open={leave || nextCapability !== null} kicker="Permission profile draft"
      title="Discard this unsaved profile selection?" description="The saved selection remains unchanged."
      leaveLabel="Discard draft" onKeepEditing={() => { setLeave(false); setNextCapability(null); }}
      onLeave={() => { setLeave(false); if (nextCapability) { choose(nextCapability); setNextCapability(null); } else onClose(); }} />
  </>;
}
