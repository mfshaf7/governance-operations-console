import { prototypeWorkspaceReadModel } from "./fixtures/prototype-workspace-read-model.fixture.ts";
import type { PrototypeWorkspaceReadModel } from "../domain/prototype-types.ts";

export type * from "../domain/prototype-types.ts";

export { prototypeWorkspaceReadModel };

export function getPrototypeWorkspaceReadModel(): PrototypeWorkspaceReadModel {
  return prototypeWorkspaceReadModel;
}
