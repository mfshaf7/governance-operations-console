"use client";

import {
  TerasStatusItem,
  TerasList,
  TerasDialog,
  TerasMetadataList,
  TerasReadoutField,
} from "@/teras";

import type {
  ModelProfileCheckProjection,
  ModelProfileRecord,
} from "../../../read-model/types/model-operations-types.ts";
import {
  modelReadinessLabel,
  modelReadinessTone,
} from "../../shared/model-profile-display-model.ts";
import {
  modelProfileCheckMetadata,
  modelProfileLatestAuditMetadata,
  modelProfilePolicyMetadata,
  modelProfileRuntimeMetadata,
} from "./model-profile-inspector-view-model.ts";

export type ModelProfileInspector = "latest-audit" | "policy" | "runtime";

export function ModelProfileCheckDialog({
  check,
  onClose,
}: {
  check: ModelProfileCheckProjection | null;
  onClose: () => void;
}) {
  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      description={check?.detail ?? ""}
      kicker="Readiness Evidence"
      onClose={onClose}
      open={Boolean(check)}
      width="standard"
      title="Model Profile Check"
    >
      {check ? (
        <TerasMetadataList items={modelProfileCheckMetadata(check)} />
      ) : null}
    </TerasDialog>
  );
}

export function ModelProfileInspectorDialog({
  inspector,
  onClose,
  profile,
}: {
  inspector: ModelProfileInspector | null;
  onClose: () => void;
  profile: ModelProfileRecord;
}) {
  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      description="Authoritative profile policy, runtime gates, and latest audit evidence remain separate projections."
      kicker="Model Operations"
      onClose={onClose}
      open={Boolean(inspector)}
      width="standard"
      title="Model Profile Inspector"
    >
      {inspector === "policy" ? (
        <>
          <TerasMetadataList items={modelProfilePolicyMetadata(profile)} />
          <TerasReadoutField
            fit="content"
            label="Allowed callers"
            value={profile.policy.allowedCallers.join(" / ")}
          />
          <TerasReadoutField
            fit="content"
            label="Allowed data"
            value={profile.policy.allowedDataScope.join(" / ")}
          />
        </>
      ) : null}

      {inspector === "runtime" ? (
        <>
          <TerasMetadataList items={modelProfileRuntimeMetadata(profile)} />
          <TerasList>
            {profile.runtime.gates.map((gate, index) => (
              <TerasStatusItem
                tone={modelReadinessTone(gate.state)}
                detail={gate.detail}
                index={String(index + 1).padStart(2, "0")}
                key={gate.id}
                label={gate.label}
                status={modelReadinessLabel(gate.state)}
              />
            ))}
          </TerasList>
        </>
      ) : null}

      {inspector === "latest-audit" ? (
        <TerasMetadataList items={modelProfileLatestAuditMetadata(profile)} />
      ) : null}
    </TerasDialog>
  );
}
