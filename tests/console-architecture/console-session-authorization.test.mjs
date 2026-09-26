import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  authorizeConsoleMutation,
  consoleMutationAttributionHeaders,
  readVerifiedConsoleSession,
} from "../../src/console-integration/identity/server/console-session-authorization.ts";

const now = new Date();

function projection(overrides = {}) {
  const authenticatedAt = new Date(now.getTime() - 60_000).toISOString();
  const expiresAt = new Date(now.getTime() + 60 * 60_000).toISOString();
  return {
    access: {
      authorities: ["Workspace owner"],
      environment: "Dev integration",
      roles: ["Operator"],
      ...overrides.access,
    },
    principal: {
      displayName: "mfshaf7",
      kind: "human",
      reference: "operator:workspace-owner",
      ...overrides.principal,
    },
    schemaVersion: "console-operator-identity/v1",
    session: {
      authenticatedAt,
      authenticationState: "authenticated",
      expiresAt,
      mode: "Platform dev-integration",
      reference: "platform-session://session-binding",
      ...overrides.session,
    },
    source: {
      authority: "platform-engineering",
      freshness: "current",
      mode: "live",
      observedAt: authenticatedAt,
      reference: "platform-session-source://session-binding",
      ...overrides.source,
    },
  };
}

async function withProjection(value, operation, mode = 0o600) {
  const directory = await mkdtemp(join(tmpdir(), "console-session-"));
  const path = join(directory, "operator-identity.json");
  try {
    await writeFile(path, `${JSON.stringify(value)}\n`, { mode: 0o600 });
    await chmod(path, mode);
    return await operation(path);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}

test("reads the exact private Platform session projection", async () => {
  await withProjection(projection(), async (path) => {
    const result = await readVerifiedConsoleSession(
      { GOVERNANCE_CONSOLE_SESSION_PROJECTION_PATH: path },
      now,
    );
    assert.equal(result.principal.reference, "operator:workspace-owner");
    assert.equal(result.source.authority, "platform-engineering");
  });
});

test("rejects stale, conflicting, malformed, and non-private projections", async () => {
  const cases = [
    projection({
      session: { expiresAt: new Date(now.getTime() - 1_000).toISOString() },
    }),
    projection({ source: { authority: "browser-fixture" } }),
    { ...projection(), extra: true },
  ];
  for (const value of cases) {
    await withProjection(value, async (path) => {
      await assert.rejects(
        readVerifiedConsoleSession(
          { GOVERNANCE_CONSOLE_SESSION_PROJECTION_PATH: path },
          now,
        ),
      );
    });
  }
  await withProjection(
    projection(),
    async (path) => {
      await assert.rejects(
        readVerifiedConsoleSession(
          { GOVERNANCE_CONSOLE_SESSION_PROJECTION_PATH: path },
          now,
        ),
      );
    },
    0o644,
  );
});

test("authorizes a matching operator and binds non-secret OOS attribution", async () => {
  await withProjection(projection(), async (path) => {
    const previousPath = process.env.GOVERNANCE_CONSOLE_SESSION_PROJECTION_PATH;
    const previousOperator = process.env.GOVERNANCE_CONSOLE_OPERATOR_ID;
    process.env.GOVERNANCE_CONSOLE_SESSION_PROJECTION_PATH = path;
    process.env.GOVERNANCE_CONSOLE_OPERATOR_ID = "operator:workspace-owner";
    try {
      const response = await authorizeConsoleMutation(
        new Request("http://localhost/api/proposals", { method: "POST" }),
        async () => {
          const headers = consoleMutationAttributionHeaders();
          assert.equal(
            headers["x-console-principal-ref"],
            "operator:workspace-owner",
          );
          assert.equal(
            headers["x-console-canonical-owner"],
            "operator-orchestration-service",
          );
          assert.match(headers["x-console-correlation-id"], /^[0-9a-f-]{36}$/);
          return new Response(null, { status: 204 });
        },
      );
      assert.equal(response.status, 204);
    } finally {
      restoreEnv("GOVERNANCE_CONSOLE_SESSION_PROJECTION_PATH", previousPath);
      restoreEnv("GOVERNANCE_CONSOLE_OPERATOR_ID", previousOperator);
    }
  });
});

test("preserves downstream operation failures after authorization", async () => {
  await withProjection(projection(), async (path) => {
    const previousPath = process.env.GOVERNANCE_CONSOLE_SESSION_PROJECTION_PATH;
    const previousOperator = process.env.GOVERNANCE_CONSOLE_OPERATOR_ID;
    process.env.GOVERNANCE_CONSOLE_SESSION_PROJECTION_PATH = path;
    process.env.GOVERNANCE_CONSOLE_OPERATOR_ID = "operator:workspace-owner";
    const operationFailure = new Error("owner adapter unavailable");
    try {
      await assert.rejects(
        authorizeConsoleMutation(
          new Request("http://localhost/api/proposals", { method: "POST" }),
          async () => {
            throw operationFailure;
          },
        ),
        (error) => error === operationFailure,
      );
    } finally {
      restoreEnv("GOVERNANCE_CONSOLE_SESSION_PROJECTION_PATH", previousPath);
      restoreEnv("GOVERNANCE_CONSOLE_OPERATOR_ID", previousOperator);
    }
  });
});

test("fails closed before mutation on operator and authority mismatch", async () => {
  for (const [value, operator, expectedCode] of [
    [projection(), "operator:somebody-else", "console_operator_binding_conflict"],
    [projection({ access: { authorities: ["Reader"] } }), "operator:workspace-owner", "console_session_authority_required"],
  ]) {
    await withProjection(value, async (path) => {
      const previousPath = process.env.GOVERNANCE_CONSOLE_SESSION_PROJECTION_PATH;
      const previousOperator = process.env.GOVERNANCE_CONSOLE_OPERATOR_ID;
      process.env.GOVERNANCE_CONSOLE_SESSION_PROJECTION_PATH = path;
      process.env.GOVERNANCE_CONSOLE_OPERATOR_ID = operator;
      let called = false;
      try {
        const response = await authorizeConsoleMutation(
          new Request("http://localhost/api/proposals", { method: "POST" }),
          async () => {
            called = true;
            return new Response(null, { status: 204 });
          },
        );
        assert.equal(called, false);
        assert.equal(response.status, 403);
        assert.equal((await response.json()).code, expectedCode);
      } finally {
        restoreEnv("GOVERNANCE_CONSOLE_SESSION_PROJECTION_PATH", previousPath);
        restoreEnv("GOVERNANCE_CONSOLE_OPERATOR_ID", previousOperator);
      }
    });
  }
});

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
