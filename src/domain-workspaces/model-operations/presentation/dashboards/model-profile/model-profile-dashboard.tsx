"use client";

import { useMemo, useState } from "react";

import {
  TerasStatusItem,
  TerasList,
  TerasContentFrame,
  TerasMetadataList,
  TerasModalShell,
  TerasPanel,
  TerasPanelHeader,
  TerasPanelStack,
  TerasSelectedPanel,
  TerasZone,
  TerasZoneLayout,
} from "@/teras";

import {
  modelProfileAvailability,
  modelProfileChecks,
} from "../../../read-model/selectors/model-profile-selectors.ts";
import type {
  ModelProfileCheckProjection,
  ModelProfileRecord,
} from "../../../read-model/types/model-operations-types.ts";
import {
  ModelProfileCheckDialog,
  ModelProfileInspectorDialog,
  type ModelProfileInspector,
} from "../../dialogs/profile-inspector/model-profile-inspector-dialog.tsx";
import {
  modelConsumerEligibilityLabel,
  modelConsumerEligibilityTone,
  modelProjectionFreshnessTone,
  modelReadinessLabel,
  modelReadinessTone,
  modelProfileAvailabilityLabel,
  modelProfileAvailabilityTone,
} from "../../shared/model-profile-display-model.ts";
import {
  modelProfileDashboardFacts,
  modelRequiredMoveMetadata,
} from "./model-profile-dashboard-view-model.ts";

export function ModelProfileDashboard({
  onClose,
  profile,
}: {
  onClose: () => void;
  profile: ModelProfileRecord | null;
}) {
  const [activeCheck, setActiveCheck] =
    useState<ModelProfileCheckProjection | null>(null);
  const [activeInspector, setActiveInspector] =
    useState<ModelProfileInspector | null>(null);
  const checks = useMemo(
    () => (profile ? modelProfileChecks(profile) : []),
    [profile],
  );

  if (!profile) {
    return null;
  }

  const availability = modelProfileAvailability(profile);

  function closeDashboard() {
    setActiveCheck(null);
    setActiveInspector(null);
    onClose();
  }

  return (
    <>
      <TerasModalShell
        bodyLayout="fill"
        description="Profile policy, caller eligibility, access readiness, runtime controls, security acceptance, and current evidence."
        kicker="Model Operations"
        onClose={closeDashboard}
        height="fill"
        surfaceId="model-profile-dashboard"
        title="Model Profile Dashboard"
        width="large"
      >
        <TerasContentFrame fill variant="standard">
          <TerasZoneLayout variant="main-support">
            <TerasZone fit="fill">
              <TerasPanelStack fill="last">
                <TerasSelectedPanel
                  description={profile.policy.purpose}
                  facts={modelProfileDashboardFacts(profile)}
                  kicker="Selected Profile"
                  selected
                  status={{
                    label: modelProfileAvailabilityLabel(availability),
                    tone: modelProfileAvailabilityTone(availability),
                  }}
                  title={profile.policy.profileId}
                  tone={modelProfileAvailabilityTone(availability)}
                  variant="rich"
                />

                <TerasPanel
                  frame="padded"
                  treatment="neutral"
                  fit="fill"
                  overflow="hidden"
                >
                  <TerasPanelHeader
                    description="Open a check to inspect its current facts and source authority."
                    kicker="Readiness Checks"
                    statusLabel={`${checks.length} checks`}
                    statusTone="info"
                    title="Profile readiness"
                  />
                  <TerasList fit="fill">
                    {checks.map((check, index) => (
                      <TerasStatusItem
                        ariaLabel={`Inspect ${check.label}`}
                        tone={check.tone}
                        detail={check.detail}
                        index={String(index + 1).padStart(2, "0")}
                        key={check.id}
                        label={check.label}
                        onSelect={() => setActiveCheck(check)}
                        status={modelReadinessLabel(check.state)}
                        treatment="rail"
                      />
                    ))}
                  </TerasList>
                </TerasPanel>
              </TerasPanelStack>
            </TerasZone>

            <TerasZone fit="content">
              <TerasPanel
                frame="padded"
                treatment="rail"
                fit="content"
                tone={profile.requiredMove.tone}
              >
                <TerasPanelHeader
                  description={profile.requiredMove.detail}
                  kicker="Current Required Move"
                  statusLabel={modelReadinessLabel(profile.requiredMove.state)}
                  statusTone={profile.requiredMove.tone}
                  title={profile.requiredMove.label}
                />
                <TerasMetadataList
                  items={modelRequiredMoveMetadata(profile.requiredMove)}
                  shape="line"
                  treatment="chip"
                  wrap
                />
              </TerasPanel>

              <TerasPanel frame="padded" treatment="neutral" fit="content">
                <TerasPanelHeader
                  description="Eligibility is evaluated for each registered caller."
                  kicker="Registered Consumers"
                  statusLabel={`${profile.consumers.length} registered`}
                  statusTone="info"
                  title="Caller eligibility"
                />
                <TerasList>
                  {profile.consumers.map((consumer) => (
                    <TerasStatusItem
                      detail={`${consumer.callerWorkflow} / ${consumer.environments.join(", ")}`}
                      key={consumer.callerId}
                      label={consumer.callerId}
                      status={modelConsumerEligibilityLabel(
                        consumer.eligibility,
                      )}
                      tone={modelConsumerEligibilityTone(consumer.eligibility)}
                    />
                  ))}
                </TerasList>
              </TerasPanel>

              <TerasPanel frame="padded" treatment="neutral" fit="content">
                <TerasPanelHeader
                  description="Open the authoritative projection without mixing policy, runtime, and audit truth."
                  kicker="Inspectors"
                  title="Profile evidence"
                />
                <TerasList>
                  <TerasStatusItem
                    ariaLabel="Inspect policy projection"
                    detail={profile.policy.source.authority}
                    label="Policy"
                    onSelect={() => setActiveInspector("policy")}
                    status={profile.policy.source.freshness}
                    tone={modelProjectionFreshnessTone(
                      profile.policy.source.freshness,
                    )}
                  />
                  <TerasStatusItem
                    ariaLabel="Inspect runtime projection"
                    detail={profile.runtime.contractId}
                    label="Runtime"
                    onSelect={() => setActiveInspector("runtime")}
                    status={modelReadinessLabel(profile.runtime.state)}
                    tone={modelReadinessTone(profile.runtime.state)}
                  />
                  <TerasStatusItem
                    ariaLabel="Inspect latest audit projection"
                    detail={profile.latestAudit.summary}
                    label="Latest Audit"
                    onSelect={() => setActiveInspector("latest-audit")}
                    status={modelReadinessLabel(profile.latestAudit.state)}
                    tone={modelReadinessTone(profile.latestAudit.state)}
                  />
                </TerasList>
              </TerasPanel>
            </TerasZone>
          </TerasZoneLayout>
        </TerasContentFrame>
      </TerasModalShell>

      <ModelProfileCheckDialog
        check={activeCheck}
        onClose={() => setActiveCheck(null)}
      />
      <ModelProfileInspectorDialog
        inspector={activeInspector}
        onClose={() => setActiveInspector(null)}
        profile={profile}
      />
    </>
  );
}
