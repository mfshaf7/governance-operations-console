import type { OperationRuntimeSource } from "./operation-runtime-types.ts";

export type LocalOperationProjectionStore<TState, TSnapshot> = {
  getRuntimeSource(): OperationRuntimeSource & { mode: "local" };
  getSnapshot(): TSnapshot;
  getState(): TState;
  setState(nextState: TState): TSnapshot;
  subscribe(listener: () => void): () => void;
  updateState(updater: (currentState: TState) => TState): TSnapshot;
};

export function createLocalOperationProjectionStore<TState, TSnapshot>({
  initialState,
  projectSnapshot,
  runtimeSource,
}: {
  initialState: TState;
  projectSnapshot: (state: TState) => TSnapshot;
  runtimeSource: OperationRuntimeSource & { mode: "local" };
}): LocalOperationProjectionStore<TState, TSnapshot> {
  let state = initialState;
  let snapshot = projectSnapshot(initialState);
  const listeners = new Set<() => void>();

  function publish(nextState: TState) {
    if (Object.is(nextState, state)) {
      return snapshot;
    }

    state = nextState;
    snapshot = projectSnapshot(state);

    for (const listener of listeners) {
      listener();
    }

    return snapshot;
  }

  return {
    getRuntimeSource() {
      return runtimeSource;
    },
    getSnapshot() {
      return snapshot;
    },
    getState() {
      return state;
    },
    setState(nextState) {
      return publish(nextState);
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    updateState(updater) {
      return publish(updater(state));
    },
  };
}
