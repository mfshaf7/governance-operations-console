import { assertIncludes } from "../guard-lib.mjs";

export const guard = {
  id: "shared/console-operation-observability",
  run() {
    const failures = [];

    assertIncludes(failures, "src/middleware.ts", [
      'matcher: "/api/:path*"',
      "createConsoleCorrelationId",
      "consoleCorrelationHeader",
    ]);
    assertIncludes(
      failures,
      "src/console-integration/observability/console-operation-correlation.ts",
      [
        '"x-console-correlation-id"',
        "bindConsoleCorrelation",
        "consoleCorrelationIdForRequest",
        "consoleOperationFailureResponse",
      ],
    );
    assertIncludes(
      failures,
      "src/console-integration/identity/server/console-session-authorization.ts",
      [
        "consoleCorrelationIdForRequest",
        "bindConsoleCorrelation",
        '"console_owner_operation_failed"',
      ],
    );

    return failures;
  },
};

export default guard;
