import assert from "node:assert/strict";
import test from "node:test";

import { consoleOperatorAccountFixture } from "../../src/console-shell/fixtures/console-operator.fixture.ts";
import { prototypeLocalOperatorAttribution } from "../../src/console-integration/operator-attribution.ts";
import {
  normalizeOperatorAccountProfile,
  operatorAccountProfilesMatch,
  validateOperatorAccountProfile,
} from "../../src/console-shell/identity/operator-account-model.ts";
import { projectOperatorIdentity } from "../../src/console-shell/identity/operator-identity-projection.ts";

test("synthetic operator fixture never claims authenticated trust", () => {
  const projection = projectOperatorIdentity(
    consoleOperatorAccountFixture.identity,
  );

  assert.equal(projection.posture, "prototype-local");
  assert.equal(projection.statusLabel, "PROTOTYPE LOCAL");
  assert.equal(projection.authenticationLabel, "Not authenticated");
  assert.equal(projection.sessionAuthenticatedAtLabel, "Not authenticated");
  assert.equal(projection.trusted, false);
  assert.equal(
    consoleOperatorAccountFixture.identity.principal.reference,
    prototypeLocalOperatorAttribution.actorId,
  );
});

test("complete live identity evidence projects a verified session", () => {
  const projection = projectOperatorIdentity({
    ...consoleOperatorAccountFixture.identity,
    session: {
      authenticatedAt: "2026-07-29T02:00:00.000Z",
      authenticationState: "authenticated",
      expiresAt: "2026-07-29T10:00:00.000Z",
      mode: "Federated session",
      reference: "session:verified-01",
    },
    source: {
      authority: "workspace-identity-provider",
      freshness: "current",
      mode: "live",
      observedAt: "2026-07-29T02:01:00.000Z",
      reference: "identity://sessions/verified-01",
    },
  });

  assert.equal(projection.posture, "verified");
  assert.equal(projection.statusLabel, "VERIFIED");
  assert.equal(projection.trusted, true);
});

test("stale, expired, and incomplete identity evidence fail closed", () => {
  const stale = projectOperatorIdentity({
    ...consoleOperatorAccountFixture.identity,
    session: {
      authenticatedAt: "2026-07-29T02:00:00.000Z",
      authenticationState: "authenticated",
      expiresAt: "2026-07-29T10:00:00.000Z",
      mode: "Federated session",
      reference: "session:stale-01",
    },
    source: {
      authority: "workspace-identity-provider",
      freshness: "stale",
      mode: "live",
      observedAt: "2026-07-29T02:01:00.000Z",
      reference: "identity://sessions/stale-01",
    },
  });
  const expired = projectOperatorIdentity({
    ...consoleOperatorAccountFixture.identity,
    session: {
      authenticatedAt: "2026-07-28T02:00:00.000Z",
      authenticationState: "expired",
      expiresAt: "2026-07-28T10:00:00.000Z",
      mode: "Federated session",
      reference: "session:expired-01",
    },
    source: {
      authority: "workspace-identity-provider",
      freshness: "current",
      mode: "live",
      observedAt: "2026-07-29T02:01:00.000Z",
      reference: "identity://sessions/expired-01",
    },
  });
  const incomplete = projectOperatorIdentity({
    ...consoleOperatorAccountFixture.identity,
    principal: {
      ...consoleOperatorAccountFixture.identity.principal,
      reference: "",
    },
  });

  assert.equal(stale.posture, "stale");
  assert.equal(expired.posture, "expired");
  assert.equal(incomplete.posture, "unavailable");
  assert.equal(stale.trusted, false);
  assert.equal(expired.trusted, false);
  assert.equal(incomplete.trusted, false);
});

test("operator profile validation and normalization stay presentation-only", () => {
  const current = consoleOperatorAccountFixture.profile;
  const draft = {
    ...current,
    displayName: "  Console Operator  ",
    timeFormat: "12-hour",
  };
  const validation = validateOperatorAccountProfile(draft);
  const normalized = normalizeOperatorAccountProfile(draft);

  assert.equal(validation.valid, true);
  assert.equal(normalized.displayName, "Console Operator");
  assert.equal(operatorAccountProfilesMatch(current, normalized), false);
  assert.equal(
    consoleOperatorAccountFixture.capabilities.updateProfile.state,
    "prototype-local",
  );
  assert.equal(
    consoleOperatorAccountFixture.capabilities.switchAccount.state,
    "unavailable",
  );
});

test("blank operator display names cannot be saved", () => {
  const validation = validateOperatorAccountProfile({
    ...consoleOperatorAccountFixture.profile,
    displayName: " ",
  });

  assert.equal(validation.valid, false);
  assert.match(validation.displayName, /at least two characters/);
});
