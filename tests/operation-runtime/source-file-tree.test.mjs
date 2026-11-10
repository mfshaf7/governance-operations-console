import assert from "node:assert/strict";
import test from "node:test";
import { sourceFileTree, sourceCreationIssue } from "../../src/console-integration/source-authoring/source-file-tree.ts";
import { sourceSaveCommand } from "../../src/console-integration/source-authoring/source-editor-model.ts";

const paths = ["src/app.ts", "README.md", "src/components/Button.tsx", "src/components/Label.tsx", "docs/guide.md"];
test("source explorer preserves all paths, sorts folders first and opens matching ancestors during search", () => {
  const entries = sourceFileTree(paths);
  assert.deepEqual(entries.map(row => row.path), ["docs", "docs/guide.md", "src", "src/components", "src/components/Button.tsx", "src/components/Label.tsx", "src/app.ts", "README.md"]);
  assert.deepEqual(sourceFileTree(paths, "", new Set(["src"])).map(row => row.path), ["docs", "docs/guide.md", "src", "README.md"]);
  assert.deepEqual(sourceFileTree(paths, "button", new Set(["src"])).map(row => row.path), ["src", "src/components", "src/components/Button.tsx"]);
  assert.equal(sourceFileTree(Array.from({ length: 5000 }, (_, i) => `src/file-${i}.ts`)).filter(row => !row.folder).length, 5000);
});
test("source creation rejects ambiguous file/folder collisions and unproven new paths", () => {
  for (const [path, folder] of [["src", false], ["src", true], ["src/app.ts/child", true], ["README.md/child.ts", false], ["src/app.ts", false]]) {
    assert.match(sourceCreationIssue(path, paths, false, null, folder), /exists|already/);
  }
  assert.match(sourceCreationIssue("src/new.ts", paths, true, null), /partial/);
  for (const path of ["../outside", "/absolute", "src/../escape", ".env", "src/.git/hidden"]) assert.ok(sourceCreationIssue(path, paths, false, null, true));
  const scope = { source_root: "prototypes/sample", design_profile: "docs/sample/design-profile.md" };
  assert.equal(sourceCreationIssue("prototypes/sample/components", [], false, scope, true), null);
  assert.ok(sourceCreationIssue("src/components", [], false, scope, true));
});
test("new folder uses a normal reviewable file operation which survives draft save without a directory command", () => {
  assert.equal(sourceCreationIssue("src/widgets", paths, false, null, true), null);
  const command = sourceSaveCommand({ state: "not-started", sessionId: "source:example", revision: "2026-11-09T00:00:00Z", attempt: null }, "Add a reusable widgets folder", "Add widgets folder placeholder", [{ path: "src/widgets/.gitkeep", content: "", expectedDigest: null, baseline: null, changed: true, deleted: false }], "manual", "folder", "2026-11-09T00:00:00Z");
  assert.deepEqual(command.operations, [{ action: "create", path: "src/widgets/.gitkeep", content: "", expected_digest: null }]);
});
