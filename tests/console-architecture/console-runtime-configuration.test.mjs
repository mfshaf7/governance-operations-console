import assert from "node:assert/strict";
import test from "node:test";

import {
  consoleOosModeSelected,
  consolePrototypePreviewModeSelected,
  consoleRuntimeObservationModeSelected,
  consoleWgcfModeSelected,
  ConsoleRuntimeConfigurationError,
  projectConsoleRuntimeCapabilities,
  resolveConsoleArtifactReference,
  resolveConsoleOosConnection,
  resolveConsolePrototypePreviewConfiguration,
  resolveConsoleRuntimeObservationConfiguration,
  resolveConsoleSessionConfiguration,
  resolveConsoleWgcfConnection,
} from "../../src/console-integration/configuration/console-runtime-configuration.ts";

const completeEnv = {
  GOVERNANCE_CONSOLE_OPERATOR_ID: "principal:reviewer-432",
  GOVERNANCE_CONSOLE_SESSION_PROJECTION_PATH:
    "/run/user/1000/platform-engineering/console-session/session.json",
  OOS_BASE_URL: "http://127.0.0.1:8080/",
  OOS_CALLER_ID: "private-caller-987",
  OOS_CALLER_SECRET: "test-secret-never-project",
};

test("runtime configuration normalizes one OOS connection", () => {
  assert.deepEqual(resolveConsoleOosConnection(completeEnv), {
    baseUrl: "http://127.0.0.1:8080",
    callerId: "private-caller-987",
    callerSecret: "test-secret-never-project",
  });
  assert.deepEqual(resolveConsoleSessionConfiguration(completeEnv), {
    operatorId: "principal:reviewer-432",
    projectionPath:
      "/run/user/1000/platform-engineering/console-session/session.json",
  });
});

test("runtime configuration keeps WGCF read authority server-only and distinct", () => {
  const env = {
    WGCF_BASE_URL: "http://127.0.0.1:8090/",
    WGCF_CALLER_ID: "console-history-reader",
    WGCF_CALLER_SECRET: "wgcf-test-secret-never-project",
  };
  assert.equal(consoleWgcfModeSelected(env), true);
  assert.deepEqual(resolveConsoleWgcfConnection(env), {
    baseUrl: "http://127.0.0.1:8090",
    callerId: "console-history-reader",
    callerSecret: "wgcf-test-secret-never-project",
  });
  assert.throws(
    () => resolveConsoleWgcfConnection({ WGCF_BASE_URL: "http://wgcf.test" }),
    (error) =>
      error instanceof ConsoleRuntimeConfigurationError &&
      error.code === "console_wgcf_configuration_incomplete",
  );
});

test("partial or invalid live configuration fails closed", () => {
  assert.equal(consoleOosModeSelected({ OOS_BASE_URL: "http://oos.test" }), true);
  assert.throws(
    () => resolveConsoleOosConnection({ OOS_BASE_URL: "http://oos.test" }),
    (error) =>
      error instanceof ConsoleRuntimeConfigurationError &&
      error.code === "console_oos_configuration_incomplete",
  );
  assert.throws(
    () =>
      resolveConsoleOosConnection({
        OOS_BASE_URL: "file:///tmp/oos.sock",
        OOS_CALLER_SECRET: "secret",
      }),
    (error) =>
      error instanceof ConsoleRuntimeConfigurationError &&
      error.code === "console_oos_url_invalid",
  );
});

test("runtime observation configuration accepts only an absolute private-source path", () => {
  assert.equal(consoleRuntimeObservationModeSelected({}), false);
  assert.equal(
    consoleRuntimeObservationModeSelected({
      GOVERNANCE_CONSOLE_RUNTIME_OBSERVATION_PATH: "/run/user/1000/runtime.json",
    }),
    true,
  );
  assert.deepEqual(
    resolveConsoleRuntimeObservationConfiguration({
      GOVERNANCE_CONSOLE_RUNTIME_OBSERVATION_PATH: "/run/user/1000/runtime.json",
    }),
    { projectionPath: "/run/user/1000/runtime.json" },
  );
  assert.throws(
    () =>
      resolveConsoleRuntimeObservationConfiguration({
        GOVERNANCE_CONSOLE_RUNTIME_OBSERVATION_PATH: "runtime.json",
      }),
    (error) =>
      error instanceof ConsoleRuntimeConfigurationError &&
      error.code === "console_runtime_observation_projection_unavailable",
  );
});

test("Prototype Preview configuration binds exact Studio source and external state", () => {
  const env = {
    GOVERNANCE_CONSOLE_PROTOTYPE_PREVIEW_OWNER_REPO_ROOT:
      "/srv/workspace-prototype-studio",
    GOVERNANCE_CONSOLE_PROTOTYPE_PREVIEW_SOURCE_REVISION: "a".repeat(40),
    GOVERNANCE_CONSOLE_PROTOTYPE_PREVIEW_STATE_ROOT:
      "/run/user/1000/workspace-prototype-studio/preview-runtime",
  };
  assert.equal(consolePrototypePreviewModeSelected(env), true);
  assert.deepEqual(resolveConsolePrototypePreviewConfiguration(env), {
    ownerRepoRoot: env.GOVERNANCE_CONSOLE_PROTOTYPE_PREVIEW_OWNER_REPO_ROOT,
    sourceRevision: env.GOVERNANCE_CONSOLE_PROTOTYPE_PREVIEW_SOURCE_REVISION,
    stateRoot: env.GOVERNANCE_CONSOLE_PROTOTYPE_PREVIEW_STATE_ROOT,
  });
});

test("capability projection distinguishes disconnected, invalid, and live state", () => {
  const disconnected = projectConsoleRuntimeCapabilities({}, new Date(0));
  assert.equal(disconnected.mode, "disconnected-preview");
  assert.ok(
    disconnected.capabilities.every(
      (capability) =>
        capability.source.state === "disconnected" &&
        capability.mutation.state === "disconnected",
    ),
  );

  const invalid = projectConsoleRuntimeCapabilities(
    { OOS_BASE_URL: "http://oos.test" },
    new Date(0),
  );
  assert.equal(invalid.mode, "invalid");
  assert.equal(
    invalid.capabilities.find(({ id }) => id === "proposal")?.source.state,
    "invalid",
  );
  assert.equal(
    invalid.capabilities.find(({ id }) => id === "prototype-preview")?.source.state,
    "disconnected",
  );

  const invalidPreview = projectConsoleRuntimeCapabilities(
    {
      ...completeEnv,
      GOVERNANCE_CONSOLE_PROTOTYPE_PREVIEW_OWNER_REPO_ROOT:
        "/srv/workspace-prototype-studio",
    },
    new Date(0),
  );
  assert.equal(invalidPreview.mode, "invalid");
  assert.equal(
    invalidPreview.capabilities.find(({ id }) => id === "prototype-preview")?.source.state,
    "invalid",
  );

  const live = projectConsoleRuntimeCapabilities(completeEnv, new Date(0));
  assert.equal(live.mode, "live");
  assert.equal(
    live.capabilities.find(({ id }) => id === "proposal")?.mutation.state,
    "available",
  );
  assert.equal(
    live.capabilities.find(({ id }) => id === "repository-custody")?.mutation
      .state,
    "invalid",
  );
  assert.equal(
    live.capabilities.find(({ id }) => id === "prototype-preview")?.owner,
    "workspace-prototype-studio",
  );
});

test("artifact references require an exact digest and absolute URI", () => {
  const names = {
    digestName: "AUTHORITY_DIGEST",
    label: "authority",
    uriName: "AUTHORITY_URI",
  };
  assert.deepEqual(
    resolveConsoleArtifactReference(
      {
        AUTHORITY_DIGEST: `sha256:${"a".repeat(64)}`,
        AUTHORITY_URI: "wgcf://receipts/example.json",
      },
      names,
    ),
    {
      digest: `sha256:${"a".repeat(64)}`,
      uri: "wgcf://receipts/example.json",
    },
  );
  assert.throws(() =>
    resolveConsoleArtifactReference(
      { AUTHORITY_DIGEST: "sha256:nope", AUTHORITY_URI: "relative" },
      names,
    ),
  );
});

test("capability projection never exposes endpoint, path, identity, or secret values", () => {
  const serialized = JSON.stringify(
    projectConsoleRuntimeCapabilities(completeEnv, new Date(0)),
  );
  for (const value of Object.values(completeEnv)) {
    assert.equal(serialized.includes(value), false);
  }
});
