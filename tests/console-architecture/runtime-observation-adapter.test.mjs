import assert from "node:assert/strict";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  readRuntimeComponentProjection,
  RuntimeObservationError,
} from "../../src/runtime-readiness/server/platform-runtime-observation-adapter.ts";

const now = new Date("2026-09-27T04:00:00.000Z");

function projection(overrides = {}) {
  return {
    components: [
      {
        capabilities: [{ id: "workflow-read", posture: "runtime-ready" }],
        category: "workflow-authority",
        freshness: "current",
        id: "oos-api",
        label: "Operator Orchestration Service",
        observedAt: "2026-09-27T03:59:30.000Z",
        recovery: {
          owner: "platform-engineering",
          runbookRef: "docs/components/operator-orchestration-service/operations.md",
        },
        runtime: {
          desiredReplicas: 1,
          readyReplicas: 1,
          reasonCode: null,
          state: "available",
        },
        sourceRef: "kubernetes://namespace/deployment/oos-api",
      },
    ],
    environment: {
      lane: "dev-integration",
      profile: "accepted-idea-delivery",
    },
    schemaVersion: "console-runtime-observations/v1",
    source: {
      authority: "platform-engineering",
      mode: "live",
      observedAt: "2026-09-27T03:59:30.000Z",
      reference: `platform-runtime-observation://${"a".repeat(64)}`,
      validUntil: "2026-09-27T04:01:30.000Z",
    },
    ...overrides,
  };
}

async function withProjection(value, operation, mode = 0o600) {
  const directory = await mkdtemp(join(tmpdir(), "console-runtime-observation-"));
  const path = join(directory, "runtime-observations.json");
  try {
    await writeFile(path, `${JSON.stringify(value)}\n`, { mode: 0o600 });
    await chmod(path, mode);
    return await operation(path);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}

test("reads a current private Platform projection into browser-safe component posture", async () => {
  await withProjection(projection(), async (path) => {
    const result = await readRuntimeComponentProjection(
      { GOVERNANCE_CONSOLE_RUNTIME_OBSERVATION_PATH: path },
      now,
    );
    assert.equal(result.mode, "live");
    assert.deepEqual(result.components[0], {
      alertEligible: true,
      environment: "dev-integration",
      freshness: "current",
      href: null,
      id: "oos-api",
      label: "Operator Orchestration Service",
      observedAt: "2026-09-27T03:59:30.000Z",
      sourceAuthority: "platform-engineering",
      sourceMode: "source-projected",
      sourceRef: `platform-runtime-observation://${"a".repeat(64)}`,
      status: "available",
      surface: "workflow-authority",
      tone: "ok",
    });
    const serialized = JSON.stringify(result);
    assert.equal(serialized.includes("kubernetes://"), false);
    assert.equal(serialized.includes("runbookRef"), false);
    assert.equal(serialized.includes(path), false);
  });
});

test("maps current degraded and unavailable workload observations without inventing success", async () => {
  for (const [state, readyReplicas, expectedTone] of [
    ["degraded", 1, "warn"],
    ["unavailable", 0, "danger"],
  ]) {
    const value = projection();
    value.components[0].runtime = {
      desiredReplicas: 2,
      readyReplicas,
      reasonCode: `${state}_for_test`,
      state,
    };
    value.components[0].capabilities[0].posture =
      state === "degraded" ? "degraded" : "unavailable";
    await withProjection(value, async (path) => {
      const result = await readRuntimeComponentProjection(
        { GOVERNANCE_CONSOLE_RUNTIME_OBSERVATION_PATH: path },
        now,
      );
      assert.equal(result.components[0].status, state);
      assert.equal(result.components[0].tone, expectedTone);
    });
  }
});

test("fails closed on stale, malformed, contradictory, and non-private projections", async () => {
  const stale = projection({
    source: {
      ...projection().source,
      validUntil: "2026-09-27T03:59:59.000Z",
    },
  });
  const malformed = { ...projection(), unexpected: true };
  const contradictory = projection();
  contradictory.components[0].runtime.readyReplicas = 0;

  for (const [value, code] of [
    [stale, "console_runtime_observation_stale"],
    [malformed, "console_runtime_observation_projection_invalid"],
    [contradictory, "console_runtime_observation_projection_invalid"],
  ]) {
    await withProjection(value, async (path) => {
      await assert.rejects(
        readRuntimeComponentProjection(
          { GOVERNANCE_CONSOLE_RUNTIME_OBSERVATION_PATH: path },
          now,
        ),
        (error) => error instanceof RuntimeObservationError && error.code === code,
      );
    });
  }

  await withProjection(
    projection(),
    async (path) => {
      await assert.rejects(
        readRuntimeComponentProjection(
          { GOVERNANCE_CONSOLE_RUNTIME_OBSERVATION_PATH: path },
          now,
        ),
        (error) =>
          error instanceof RuntimeObservationError &&
          error.code === "console_runtime_observation_projection_invalid",
      );
    },
    0o644,
  );
});

test("rejects replayed and conflicting observations within one server process", async () => {
  await withProjection(projection(), async (path) => {
    const env = { GOVERNANCE_CONSOLE_RUNTIME_OBSERVATION_PATH: path };
    await readRuntimeComponentProjection(env, now);

    const replayed = projection({
      components: [
        {
          ...projection().components[0],
          observedAt: "2026-09-27T03:59:00.000Z",
        },
      ],
      source: {
        ...projection().source,
        observedAt: "2026-09-27T03:59:00.000Z",
      },
    });
    await writeFile(path, `${JSON.stringify(replayed)}\n`, { mode: 0o600 });
    await assert.rejects(
      readRuntimeComponentProjection(env, now),
      (error) =>
        error instanceof RuntimeObservationError &&
        error.code === "console_runtime_observation_replayed",
    );

    const conflicting = projection({
      source: {
        ...projection().source,
        reference: `platform-runtime-observation://${"b".repeat(64)}`,
      },
    });
    await writeFile(path, `${JSON.stringify(conflicting)}\n`, { mode: 0o600 });
    await assert.rejects(
      readRuntimeComponentProjection(env, now),
      (error) =>
        error instanceof RuntimeObservationError &&
        error.code === "console_runtime_observation_conflict",
    );
  });
});
