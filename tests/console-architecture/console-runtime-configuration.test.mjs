import assert from "node:assert/strict";
import test from "node:test";

import {
  consoleOosModeSelected,
  ConsoleRuntimeConfigurationError,
  projectConsoleRuntimeCapabilities,
  resolveConsoleArtifactReference,
  resolveConsoleOosConnection,
  resolveConsoleSessionConfiguration,
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
  assert.ok(
    invalid.capabilities.every(
      (capability) => capability.source.state === "invalid",
    ),
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
