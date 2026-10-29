import { activeSavedWorkSession } from "../../console-integration/saved-work/browser-session.ts";

export type OperationDraftNormalizer<TDraft> = (
  value: unknown,
) => TDraft | null;

export type OperationBrowserDraftStore = {
  readJson<TDraft>(
    key: string,
    normalize: OperationDraftNormalizer<TDraft>,
  ): TDraft | null;
  remove(key: string): void;
  writeJson<TDraft>(key: string, draft: TDraft): void;
};

export function createBrowserOperationDraftStore(): OperationBrowserDraftStore {
  return {
    readJson(key, normalize) {
      const saved = activeSavedWorkSession(key);
      if (saved?.getSnapshot().hydrated) {
        try { const raw = saved.read(); return raw ? normalize(JSON.parse(raw)) : null; } catch { return null; }
      }
      const storage = browserLocalStorage();
      if (!storage) {
        return null;
      }

      try {
        const rawValue = storage.getItem(key);
        return rawValue ? normalize(JSON.parse(rawValue)) : null;
      } catch {
        return null;
      }
    },
    remove(key) {
      const storage = browserLocalStorage();
      if (!storage) {
        return;
      }

      storage.removeItem(key);
    },
    writeJson(key, draft) {
      const saved = activeSavedWorkSession(key);
      if (saved?.getSnapshot().hydrated) { saved.write(draft); return; }
      const storage = browserLocalStorage();
      if (!storage) {
        return;
      }

      storage.setItem(key, JSON.stringify(draft));
    },
  };
}

function browserLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
