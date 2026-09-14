import { createBrowserOperationDraftStore } from "../../operation-runtime/browser-draft-store.ts";

const store = createBrowserOperationDraftStore();

function key(prototypeId: string) {
  return `prototype-closure-request:${prototypeId}`;
}

export function readPrototypeClosureRequestPointer(prototypeId: string) {
  return store.readJson(key(prototypeId), (value) =>
    typeof value === "string" && value.length <= 1024 ? value : null);
}

export function writePrototypeClosureRequestPointer(prototypeId: string, requestId: string) {
  store.writeJson(key(prototypeId), requestId);
}

export function clearPrototypeClosureRequestPointer(prototypeId: string) {
  store.remove(key(prototypeId));
}
