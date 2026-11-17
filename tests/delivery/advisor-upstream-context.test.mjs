import assert from "node:assert/strict";
import test from "node:test";
import { executionAdvisorUpstreamContext } from "../../src/domain-workspaces/delivery/presentation/surfaces/execution-board/execution-advisor-context.ts";

test("execution knowledge includes original ancestor scope without confusing local drafts or unrelated branches", () => {
  const node = (id, children = []) => ({ id, kind: "Feature", title: `Outcome ${id}`, description: `Original scope ${id}`, draftBody: "Unaccepted local change", children });
  const root = node("epic", [node("feature", [node("story")]), node("unrelated")]);
  const original = structuredClone(root);
  const context = executionAdvisorUpstreamContext(root, "story");
  assert.deepEqual(context.map(item => item.id), ["epic", "feature", "story"]);
  assert.equal(context[0].description, "Original scope epic");
  assert.doesNotMatch(JSON.stringify(context), /Unaccepted local change|unrelated/);
  assert.deepEqual(executionAdvisorUpstreamContext(root, "new-local-node"), []);
  assert.deepEqual(executionAdvisorUpstreamContext(null, "story"), []);
  assert.deepEqual(root, original);
});
