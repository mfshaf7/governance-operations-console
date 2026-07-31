import assert from "node:assert/strict";
import test from "node:test";

import { createLocalOperationProjectionStore } from "../../src/domain-workspaces/operation-runtime/local-operation-projection-store.ts";

test("local projection stores do not publish unchanged state", () => {
  const initialState = { count: 0 };
  const store = createLocalOperationProjectionStore({
    initialState,
    projectSnapshot: (state) => state,
    runtimeSource: {
      authority: "prototype-local",
      mode: "local",
      sourceOwner: "projection-store-test",
    },
  });
  let emissions = 0;
  const unsubscribe = store.subscribe(() => {
    emissions += 1;
  });

  const before = store.getSnapshot();
  const after = store.updateState((currentState) => currentState);

  unsubscribe();
  assert.equal(after, before);
  assert.equal(emissions, 0);
});
