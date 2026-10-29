export type SavedWorkKind = "work-design" | "refinement" | "orchestration";
export type SavedWorkRecovery = { recovery_id: string; storage_key: string; content_digest: string; preserved_at: string };
type RecordValue = { revision: number; payload_json: string; content_digest: string; acknowledgement_id: string; saved_at: string };
type Snapshot = { kind: SavedWorkKind; subject_id: string; record: RecordValue | null; recoveries: SavedWorkRecovery[]; recovery?: { storage_key: string; raw_value: string } | null };
export type SavedWorkState = { hydrated: boolean; generation: number; status: "loading" | "ready" | "saving" | "saved" | "local" | "error" | "conflict";
  message: string; recoveries: SavedWorkRecovery[] };
type CacheMeta = { operatorId: string; digest: string };

export function savedWorkIdentity(key: string): { kind: SavedWorkKind; subjectId: string } | null {
  const match = /^(delivery-work-design-session|delivery-refinement-session|orchestration-definition-design):(.+):v\d+$/.exec(key);
  if (!match) return null;
  return { kind: match[1] === "delivery-work-design-session" ? "work-design" : match[1] === "delivery-refinement-session" ? "refinement" : "orchestration", subjectId: match[2] };
}
const originalPrefix = "console-saved-work-original:";
const metaPrefix = "console-saved-work-ack:";
async function digest(raw: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return `sha256:${Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("")}`;
}
class SaveFailure extends Error {
  readonly conflict: boolean;
  constructor(message: string, conflict = false) { super(message); this.conflict = conflict; }
}

// One active subject per browser tab; payloads are never loaded by a global
// register/history scan. The server acknowledgement, not local setItem, means saved.
export function createSavedWorkBrowserSession(key: string, options: { storage: Storage | null; fetchImpl?: typeof fetch; delayMs?: number }) {
  const identity = savedWorkIdentity(key);
  if (!identity) throw new Error("Unsupported saved-work key.");
  const { storage } = options; const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = `/api/saved-work/${identity.kind}/${encodeURIComponent(identity.subjectId)}`;
  const listeners = new Set<() => void>();
  let state: SavedWorkState = { hydrated: false, generation: 0, status: "loading", message: "Reading saved work…", recoveries: [] };
  let raw: string | null = null; let confirmed: string | null = null; let revision = 0; let operatorId = "";
  let mode: "live" | "local" | null = null; let readOnly = false; let inFlight = false; let initializing: Promise<void> | null = null;
  let normalize: ((value: unknown) => unknown | null) | undefined;
  let pending: { command_id: string; expected_revision: number; payload_json: string; origin: "operator-edit" | "browser-import" } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const readLocal = (name: string) => { try { return storage?.getItem(name) ?? null; } catch { return null; } };
  function writeLocal(name: string, value: string) { try { storage?.setItem(name, value); return true; } catch { return false; } }
  function update(next: Partial<SavedWorkState>) { state = { ...state, ...next }; for (const listener of listeners) listener(); }
  function originals() {
    const values = new Map<string, string>();
    if (!storage) return values;
    const prefix = key.replace(/:v\d+$/, ":v");
    try {
      for (let index = 0; index < storage.length; index++) {
        const name = storage.key(index); if (!name) continue;
        const source = name.startsWith(originalPrefix) ? name.slice(originalPrefix.length) : name;
        if (source.startsWith(prefix) && /^\d+$/.test(source.slice(prefix.length))) {
          const value = readLocal(originalPrefix + source) ?? readLocal(source);
          if (value !== null) values.set(source, value);
        }
      }
    } catch { /* Server preservation still uses the captured current record. */ }
    const current = readLocal(key); if (current !== null && !values.has(key)) values.set(key, current);
    // Never replace an original, including malformed/obsolete schema bytes.
    for (const [name, value] of values) if (readLocal(originalPrefix + name) === null) writeLocal(originalPrefix + name, value);
    return values;
  }
  async function request(suffix = "", body?: unknown): Promise<{ mode: string; operatorId: string; snapshot: Snapshot }> {
    const response = await fetchImpl(endpoint + suffix, { method: body === undefined ? "GET" : "POST", cache: "no-store",
      signal: AbortSignal.timeout(20_000), headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const value = await response.json();
    if (!response.ok) throw new SaveFailure(typeof value.error === "string" ? value.error : "Server save is unavailable.", response.status === 409);
    if (value.mode === "disconnected-preview") return value;
    const snapshot = value.snapshot as Snapshot;
    if (value.mode !== "live" || typeof value.operatorId !== "string" || snapshot?.kind !== identity!.kind || snapshot.subject_id !== identity!.subjectId || !Array.isArray(snapshot.recoveries) ||
        (snapshot.record && (!Number.isSafeInteger(snapshot.record.revision) || snapshot.record.revision < 1 || typeof snapshot.record.payload_json !== "string" ||
          await digest(snapshot.record.payload_json) !== snapshot.record.content_digest)))
      throw new SaveFailure("The saved-work acknowledgement could not be verified.");
    return value;
  }
  function acknowledge(record: RecordValue | null) {
    revision = record?.revision ?? 0; confirmed = record?.payload_json ?? null;
    if (record) writeLocal(metaPrefix + key, JSON.stringify({ operatorId, digest: record.content_digest }));
  }
  async function flush() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (mode !== "live" || !state.hydrated || readOnly || inFlight || state.status === "conflict" || raw === null || raw === confirmed) return;
    if (!pending) pending = { command_id: crypto.randomUUID(), expected_revision: revision, payload_json: raw,
      origin: revision === 0 ? "browser-import" : "operator-edit" };
    const command = pending; inFlight = true; update({ status: "saving", message: "Saving to server…" });
    try {
      const result = await request("", command); const saved = result.snapshot.record;
      if (!saved || saved.payload_json !== command.payload_json) throw new SaveFailure("The server did not acknowledge the exact saved content.");
      acknowledge(saved); pending = null;
      update({ status: raw === confirmed ? "saved" : "ready", message: raw === confirmed ? "Saved to server" : "Edits waiting to save", recoveries: result.snapshot.recoveries });
    } catch (error) {
      update({ status: error instanceof SaveFailure && error.conflict ? "conflict" : "error", message: error instanceof Error ? error.message : "Save failed; browser copy retained." });
    } finally {
      inFlight = false;
      if (state.status === "ready" && raw !== confirmed) schedule();
    }
  }
  function schedule() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; void flush(); }, options.delayMs ?? 800);
  }
  async function initialize(locked = false, normalizeValue?: (value: unknown) => unknown | null) {
    if (initializing) return initializing;
    readOnly = locked;
    if (normalizeValue) normalize = normalizeValue;
    initializing = (async () => {
      const previousRaw = raw; const local = state.hydrated ? previousRaw : readLocal(key);
      const preserved = originals(); update({ status: "loading", message: "Reading saved work…" });
      try {
        const result = await request();
        if (result.mode === "disconnected-preview") { mode = "local"; raw = local; update({ hydrated: true, status: "local", message: "Browser only · disconnected preview" }); return; }
        mode = "live"; operatorId = result.operatorId;
        let snapshot = result.snapshot;
        let meta: CacheMeta | null = null; try { meta = JSON.parse(readLocal(metaPrefix + key) ?? "null"); } catch { /* Legacy cache has no acknowledgement. */ }
        if (local !== null && meta?.operatorId && meta.operatorId !== operatorId)
          throw new SaveFailure("This browser copy belongs to a different operator. It was preserved locally and has not been imported.");
        if (!readOnly) for (const [storageKey, rawValue] of preserved) {
          const saved = await request("?action=preserve", { storage_key: storageKey, raw_value: rawValue }); snapshot = saved.snapshot;
        }
        const localAcknowledged = local !== null && meta?.operatorId === operatorId && meta.digest === await digest(local);
        acknowledge(snapshot.record);
        if (confirmed !== null && normalize && normalize(JSON.parse(confirmed)) === null)
          throw new SaveFailure("The saved draft cannot be read by this version. Its original content is retained; no empty draft was substituted.");
        if (!readOnly && local !== null && confirmed !== null && local !== confirmed && !localAcknowledged) {
          raw = local; update({ hydrated: true, status: "conflict", message: "Browser edits differ from the server copy. Choose which copy to continue with.", recoveries: snapshot.recoveries }); return;
        }
        raw = confirmed ?? local;
        if (confirmed === null && normalize) {
          raw = null;
          for (const candidate of [local, ...preserved.values()].filter((value): value is string => value !== null)) {
            try { const normalized = normalize(JSON.parse(candidate)); if (normalized !== null) { raw = JSON.stringify(normalized); break; } } catch { /* Preserved originals remain available for manual recovery. */ }
          }
        }
        if (raw !== null) writeLocal(key, raw);
        update({ hydrated: true, status: snapshot.record ? "saved" : "ready", message: snapshot.record ? "Saved to server" : local !== null ? "Browser copy preserved · preparing server save" : "No saved draft yet", recoveries: snapshot.recoveries });
      } catch (error) {
        // Do not mount autosaving controllers before originals and owner read
        // are safe. Retry remains explicit; no false disconnected-mode fallback.
        update({ status: "error", message: error instanceof Error ? error.message : "Saved work is unavailable." });
      }
    })().finally(() => { initializing = null; });
    return initializing;
  }
  return {
    getSnapshot: () => state,
    isReadOnly: () => readOnly,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    read: () => raw,
    initialize,
    write(value: unknown) {
      if (readOnly) return;
      const next = JSON.stringify(value); originals(); raw = next; writeLocal(key, next);
      if (mode === "local") return;
      if (raw === confirmed) return;
      if (!["conflict", "error"].includes(state.status)) update({ status: inFlight ? "saving" : "ready", message: "Edits waiting to save" });
      schedule();
    },
    async retry() { if (!state.hydrated || mode === null) await initialize(readOnly, normalize); else await flush(); },
    async useServerCopy() {
      const result = await request();
      if (!readOnly && raw !== null && raw !== result.snapshot.record?.payload_json)
        await request("?action=preserve", { storage_key: key, raw_value: raw });
      acknowledge(result.snapshot.record); pending = null; raw = confirmed;
      if (raw !== null) writeLocal(key, raw);
      update({ generation: state.generation + 1, status: raw !== null ? "saved" : "ready", message: raw !== null ? "Saved to server" : "No saved draft yet" });
    },
    async keepBrowserEdits() {
      if (readOnly) return;
      const result = await request(); acknowledge(result.snapshot.record); pending = null;
      update({ status: "ready", message: "Saving the selected browser edits…" }); await flush();
    },
    async recovery(id: string) { return (await request(`?recovery_id=${encodeURIComponent(id)}`)).snapshot.recovery; },
    async restoreRecovery(id: string) {
      if (readOnly) throw new SaveFailure("Open active drafting to restore an original; historical content stays read-only.");
      const result = await request(`?recovery_id=${encodeURIComponent(id)}`); const original = result.snapshot.recovery;
      if (!original) throw new SaveFailure("The original browser record is unavailable.");
      let candidate: unknown; try { candidate = JSON.parse(original.raw_value); } catch { throw new SaveFailure("This original is malformed JSON. Download the preserved bytes for repair."); }
      const restored = normalize ? normalize(candidate) : candidate;
      if (!restored || typeof restored !== "object") throw new SaveFailure("This original uses an unsupported format. Download it for recovery; it has not been removed.");
      if (identity!.kind === "work-design" && result.snapshot.record) {
        const prior = JSON.parse(result.snapshot.record.payload_json) as { briefVersions: Array<{ briefVersionId: string }> };
        const target = restored as { briefVersions: Array<{ briefVersionId: string }> };
        // A recovery changes the editable draft, never removes newer finalized history.
        const present = new Set(target.briefVersions.map(version => version.briefVersionId));
        target.briefVersions.push(...prior.briefVersions.filter(version => !present.has(version.briefVersionId)));
      }
      acknowledge(result.snapshot.record); pending = null; raw = JSON.stringify(restored); writeLocal(key, raw);
      update({ status: "ready", message: "Saving recovered draft…" }); await flush();
      if (state.status !== "saved") throw new SaveFailure(state.message);
      update({ generation: state.generation + 1 });
    },
  };
}
export type SavedWorkBrowserSession = ReturnType<typeof createSavedWorkBrowserSession>;
const sessions = new Map<string, SavedWorkBrowserSession>();
export function savedWorkBrowserSession(key: string) {
  let session = sessions.get(key);
  if (!session) {
    let storage: Storage | null = null; try { storage = typeof window !== "undefined" ? window.localStorage : null; } catch { /* The backend can still save. */ }
    session = createSavedWorkBrowserSession(key, { storage }); sessions.set(key, session);
  }
  return session;
}
export function activeSavedWorkSession(key: string) { return sessions.get(key); }
