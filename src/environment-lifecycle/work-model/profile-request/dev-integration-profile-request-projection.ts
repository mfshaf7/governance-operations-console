import {
  assertDevIntegrationProfile,
  type DevIntegrationProfile,
} from "../../model/dev-integration-profile.ts";
import type {
  DevIntegrationProfileRequest,
} from "../../model/dev-integration-profile-request.ts";

export function projectPrototypeLocalProfileRequest(
  request: DevIntegrationProfileRequest,
): DevIntegrationProfile {
  const requestRef =
    `prototype-local://environment-lifecycle/profile-requests/${request.profileId}`;
  const profile: DevIntegrationProfile = {
    actions: [],
    admissionRefs: [],
    dependencies: request.dependencies,
    expectedWrites: request.expectedWrites,
    laneClass: request.laneClass,
    lifecycle: "proposed",
    nextMove: {
      actionId: "owner-review",
      label: "Review profile request",
      ownerRef: request.ownerRepo,
      reason:
        "The local request is recorded but has not been admitted by the owning authority.",
    },
    ownerRepo: request.ownerRepo,
    participatingRepos: request.participatingRepos,
    persistence: request.persistence,
    profileId: request.profileId,
    purpose: request.purpose,
    requestRecordRef: requestRef,
    runtime: {
      observation: {
        observedAt: null,
        sourceRef: null,
        state: "unavailable",
      },
      platform: request.runtimePlatform,
      stateModel: request.runtimeStateModel,
    },
    securityOwner: "security-architecture",
    securityTriggers: request.securityTriggers,
    source: {
      observedAt: request.requestedAt,
      provenance: "prototype-local",
      ref: requestRef,
      source: "governance-operations-console",
      version: "1",
    },
    stageHandoff: {
      checkResults: [],
      governedSurface: "unavailable",
      ownerRepo: "platform-engineering",
      promotionReportRef: null,
      requiredChecks: [],
      result: "not-run",
      sessionManifestRef: null,
      smokeSummaryRef: null,
    },
  };

  assertDevIntegrationProfile(profile);
  return profile;
}
