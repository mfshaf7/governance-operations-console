import {
  assertAppFile,
  assertAppPathAbsent,
  assertIncludes,
  assertOmits,
  lineCount,
} from "../guard-lib.mjs";

const appRoute = "src/app/api/agent-interaction/route.ts";
const publicBoundary = "src/agent-console/index.ts";
const dock = "src/agent-console/presentation/model-interaction-dock.tsx";
const controller = "src/agent-console/state/use-agent-console-controller.ts";
const sessionProvider = "src/agent-console/state/agent-console-session-provider.tsx";
const providerModel = "src/agent-console/model/agent-provider-status.ts";
const contextPolicy = "src/agent-console/model/agent-context-policy.ts";
const inputPolicy = "src/agent-console/model/agent-input-policy.ts";
const providerStatusHook = "src/agent-console/state/use-agent-provider-status.ts";
const policy = "src/agent-console/server/agent-request-policy.ts";
const adapter = "src/agent-console/server/ollama-adapter.ts";
const route = "src/agent-console/server/agent-interaction-route.ts";
const responseStream = "src/agent-console/server/agent-response-stream.ts";

export const guard = {
  id: "shared/agent-console-boundary",
  run() {
    const failures = [];

    for (const path of [
      appRoute,
      publicBoundary,
      "src/agent-console/model/agent-console-session.ts",
      contextPolicy,
      inputPolicy,
      providerModel,
      "src/agent-console/model/agent-runtime-presence.ts",
      sessionProvider,
      "src/agent-console/state/agent-runtime-presence-provider.tsx",
      providerStatusHook,
      controller,
      "src/agent-console/presentation/agent-robot-icon.tsx",
      "src/agent-console/presentation/agent-runtime-presence-dialog.tsx",
      "src/agent-console/presentation/agent-runtime-status-dialog.tsx",
      dock,
      policy,
      adapter,
      responseStream,
      route,
    ]) {
      assertAppFile(failures, path);
    }

    assertAppPathAbsent(
      failures,
      "src/agent-console/agent-console.tsx",
      "agent presentation must remain inside its ownership folder",
    );
    assertAppPathAbsent(failures, "src/agent-console/agent-runtime-readiness-panel.tsx");
    assertAppPathAbsent(
      failures,
      "src/agent-console/presentation/agent-runtime-readiness-panel.tsx",
      "the fixed runtime roster replaces the duplicate main-grid readiness panel",
    );
    assertAppPathAbsent(failures, "src/agent-console/agent-runtime-status-dialog.tsx");
    assertAppPathAbsent(
      failures,
      "src/agent-console/model/agent-console-model.ts",
      "provider status and session state must retain separate models",
    );
    assertAppPathAbsent(
      failures,
      "src/console-shell/operator-context.tsx",
      "context candidates must remain pure data without browser event bridges",
    );
    assertAppPathAbsent(
      failures,
      "src/console-shell/use-console-operator-context.ts",
      "the shell must resolve active context directly",
    );

    assertIncludes(failures, appRoute, [
      'export { GET, POST } from "../../../agent-console/server/agent-interaction-route"',
    ]);
    if (lineCount(appRoute) > 5) {
      failures.push(`${appRoute}: app route must remain a thin mount`);
    }

    assertIncludes(failures, dock, [
      "useAgentConsoleController",
      "agentTranscript.map",
      "handleAgentCancel",
      "Cancel agent request",
      "placement",
      'title = "Agent Console"',
      "aria-label={title}",
    ]);
    assertOmits(failures, dock, [
      "useState",
      "useEffect",
      "useAgentRuntimePresenceRegistration",
      'fetch("/api/agent-interaction"',
      "admitOperatorContext",
    ]);
    assertIncludes(failures, controller, [
      "useAgentConsoleSession",
      "useEffect",
      "useState",
      "runAgentCommand",
      'fetch("/api/agent-interaction"',
      "evaluateAgentContextPolicy",
      "inspectAgentInput",
      "contextDecisionHeaderMismatch",
      "createAgentInvocation",
      "settleAgentInvocation",
      "isAgentRequestAbortReason",
      "beginAgentRequest",
      "finishAgentRequest",
      "cancelAgentRequest",
      "agentConsoleExpanded",
      "setAgentConsoleExpanded",
    ]);
    assertOmits(failures, controller, [
      "className=",
      "const [modelDockExpanded",
      "NextResponse",
      "readFileSync",
      "setAgentBusy",
      "admitOperatorContext",
      "CGG mock",
      "mock-cgg",
      "agentConsoleExpandedPlacement",
      "setAgentConsoleExpandedPlacement",
      "dockHiddenBySharedExpansion",
    ]);
    assertIncludes(failures, sessionProvider, [
      "AgentConsoleSessionProvider",
      "useAgentRuntimePresenceRegistration",
      "initialContextMode",
      "runtimeIdentity",
      "...runtimeIdentity",
      "deriveAgentRuntimeActivityState",
      "deriveAgentProviderReadinessState",
      "activeAgentRequestRef",
      "agentRequestTimeoutMs",
      "createAgentRequestAbortReason",
      "agentConsoleExpanded",
      "setAgentConsoleExpanded",
    ]);
    assertOmits(failures, sessionProvider, [
      "setAgentBusy",
      "agentConsoleExpandedPlacement",
      "setAgentConsoleExpandedPlacement",
      'runtimeId: "console-ai.local-assistant"',
      'displayName: "Console Local Assistant"',
    ]);
    assertIncludes(failures, providerModel, [
      "deriveAgentProviderReadinessState",
      "retainStaleAgentProviderObservation",
      "isAgentProviderStatus",
      'freshness: "live" | "stale"',
      "observedAt: string | null",
    ]);
    assertIncludes(failures, providerStatusHook, [
      "AbortController",
      "window.setTimeout",
      "retainStaleAgentProviderObservation",
      "isAgentProviderStatus",
    ]);
    assertOmits(failures, providerStatusHook, [
      "window.setInterval",
      "models:",
    ]);

    assertIncludes(failures, contextPolicy, [
      "evaluateAgentContextPolicy",
      "resolveAgentContextRequest",
      'agentContextPolicyProfile = "prototype-synthetic-only/v1"',
      '"focused-synthetic-attached"',
      '"cgg-required"',
      "projectAgentContextCandidate",
    ]);
    assertIncludes(failures, inputPolicy, [
      "inspectAgentInput",
      "hasSecretLikeMaterial",
      "maxOperatorPromptChars",
    ]);
    assertIncludes(failures, policy, [
      "validateAgentRequest",
      "parseAgentContextRequest",
      "parseAgentContextCandidate",
      "resolveAgentContextRequest",
      "normalizeHistory",
    ]);
    assertOmits(failures, policy, [
      "NextResponse",
      "readFileSync",
      "/api/chat",
      "mock-cgg",
      "CGG mock",
      "OperatorContextPacket",
      "contextAttached?:",
    ]);
    assertIncludes(failures, adapter, [
      "resolveOllama",
      "fetchOllamaChatStream",
      "AbortSignal.any",
      "/api/chat",
    ]);
    assertOmits(failures, adapter, [
      "NextResponse",
      "normalizeContextRequest",
      "OperatorContextPacket",
      "summarizeModels",
      "/api/show",
    ]);
    assertIncludes(failures, route, [
      "validateAgentRequest",
      "resolveOllama",
      "fetchOllamaChatStream",
      "agentProviderSafetyMode",
      "createAgentResponseStream",
      "resolveOllama(request.signal)",
      "request.signal",
      'freshness: "live"',
      "X-Agent-Context-Decision",
      "X-Agent-Context-Policy",
      "X-Agent-Context-Candidate",
      "X-Agent-Context-Budget",
      "NextResponse",
    ]);
    assertOmits(failures, route, [
      "readFileSync",
      "hasSecretLikeMaterial",
      "candidateBaseUrls",
      "summarizeModels",
      "models,",
      "new ReadableStream",
      "TextDecoder",
    ]);
    assertIncludes(failures, responseStream, [
      "createAgentResponseStream",
      "async cancel",
      "ended before its completion event",
      "reader.cancel",
      "reader.releaseLock",
      "TextDecoder",
    ]);
    assertOmits(failures, responseStream, [
      "NextResponse",
      "validateAgentRequest",
      "/api/chat",
    ]);

    assertIncludes(failures, publicBoundary, [
      'from "./presentation/model-interaction-dock"',
      'from "./state/agent-console-session-provider"',
      'from "./state/agent-runtime-presence-provider"',
      'from "./state/use-agent-provider-status"',
      "settleAgentInvocation",
      "createAgentRequestAbortReason",
      "evaluateAgentContextPolicy",
      "inspectAgentInput",
      "agentConsoleBoundary",
    ]);

    return failures;
  },
};

export default guard;
