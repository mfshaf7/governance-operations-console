const sha = "a".repeat(40);
export const bodies = {
 repositories: { mode: "live", status: "current", records: [] },
 continuity: { artifact_type: "workspace-continuity-projection", projection_state: "current", authority: { revision: sha }, inventory: [{ posture: "active" }], intake: [], products: [{ name: "Example", posture: "active" }] },
 registry: { workflow_id: "workspace-inventory-registry", authority_revision: sha, records: [{ posture: "active" }] },
 proposals: { mode: "live", records: [{ projection: { status: "captured", projection_state: "current", body: "PRIVATE BODY MUST NOT ENTER MODEL" } }] },
 prototypes: { mode: "live", projection: { sourceRevision: "sha256:" + "b".repeat(64), readModel: { records: [{ name: "Example prototype", lifecycle: "exploring", sourcePath: "PRIVATE SOURCE PATH" }] } } },
 delivery: { mode: "live", projection: { projection_state: { status: "fresh", source_revision: "sha256:" + "b".repeat(64) }, packages: [{ backend_status: "in-progress" }] } },
 orchestration: { mode: "live", definitions: [{}], runs: [] },
 lifecycle: { mode: "live", transitions: [], truncated: false },
 platform: { mode: "live", catalog: { freshness: "current", source_version: sha, subjects: [{}] }, operations: [{ state: "succeeded" }] },
 models: { backends: [{}, {}], tasks: ["assistant_response"], configuration: { current_revision: 13, digest: "sha256:" + "c".repeat(64), configuration: { default: { primary: { model_id: "example", effort: "high" } }, models: { example: { backend_id: "example-backend", model: "example-model" } } } } },
};
