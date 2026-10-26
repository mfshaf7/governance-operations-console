import { readVerifiedConsoleSession } from "./console-session-authorization.ts";
import { consoleOosModeSelected, consoleSessionModeSelected, resolveConsoleOperatorBinding } from "../../configuration/console-runtime-configuration.ts";
import { unavailableOperatorIdentity } from "../../../console-shell/identity/operator-account-snapshot.ts";

export async function readConsoleOperatorIdentity(env: NodeJS.ProcessEnv = process.env, now = new Date()) {
  if (!consoleOosModeSelected(env) && !consoleSessionModeSelected(env)) {
    return { mode: "disconnected-preview" as const, identity: null };
  }
  try {
    const identity = await readVerifiedConsoleSession(env, now);
    if (identity.principal.reference !== resolveConsoleOperatorBinding(env)) throw new Error("Operator conflict");
    return { mode: "live" as const, identity };
  } catch {
    // Fail closed without returning private paths, configuration or diagnostics.
    return { mode: "live" as const, identity: unavailableOperatorIdentity };
  }
}
