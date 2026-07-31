import assert from "node:assert/strict";
import test from "node:test";

import { createElement, Fragment } from "react";

import { terasPanelStackChildren } from "../../src/teras/teras-panel-stack-children.ts";

test("Teras panel stacks count fragment panels as direct layout rows", () => {
  const panels = createElement(
    Fragment,
    null,
    createElement("section", null, "Context"),
    createElement("section", null, "Selected draft"),
    createElement("section", null, "Advisor"),
  );

  const normalized = terasPanelStackChildren(panels);

  assert.equal(normalized.length, 3);
  assert.deepEqual(
    normalized.map((panel) => panel.props.children),
    ["Context", "Selected draft", "Advisor"],
  );
  assert.equal(new Set(normalized.map((panel) => panel.key)).size, 3);
});
