// Component unit: real owner-progress composition and React rendering; Teras
// layout ports are isolated. This does not claim live workflow or browser proof.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const module = { exports: {} };
const layout = ({ children }) => React.createElement("div", null, children);
const teras = {
  TerasPanel: layout, TerasFieldStack: layout, TerasActionRow: layout,
  TerasActionButton: ({ children, disabled }) => React.createElement("button", { disabled }, children),
  TerasPanelHeader: ({ title, statusLabel, description }) => React.createElement("header", null, title, statusLabel, description),
  TerasMetadataList: ({ items }) => React.createElement("dl", null, items.map(({ label, value }) => React.createElement("div", { key: label }, React.createElement("dt", null, label), React.createElement("dd", null, value)))),
};
const code = ts.transpileModule(readFileSync(new URL("../../src/domain-workspaces/prototype/presentation/workflows/shared/prototype-maturity-owner-progress.tsx", import.meta.url), "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
new Function("require", "module", "exports", code)(name => name === "@/teras" ? teras : name === "@/console-integration/external-route" ? { openExternalConsoleRoute() { throw Error("No provider action in rendering unit"); } } : require(name), module, module.exports);
const { PrototypeMaturityOwnerProgressPanel } = module.exports;
const render = result => renderToStaticMarkup(React.createElement(PrototypeMaturityOwnerProgressPanel, {
  progress: { mode: "live", pending: false, error: null, projection: result ? { result, input: { input: { decision: "promote-candidate" } } } : null },
}));

test("owner readiness rejection displays the exact finding, responsible owner and correction without implying success", () => {
  const html = render({ request_id: "prototype-maturity-request:sample:1", status: "requires-action", next_action: "submit-corrected-request", readiness: { readiness: { findings: [{ code: "maturity-evidence-unresolved", detail: "Committed design file is missing.", owner_ref: "workspace-prototype-studio", required_fix: "Commit and review the missing file." }] } } });
  for (const text of ["requires-action", "maturity-evidence-unresolved", "Committed design file is missing.", "workspace-prototype-studio", "Commit and review the missing file.", "submit-corrected-request"]) assert.ok(html.includes(text));
  assert.ok(!html.includes("Confirm promote-candidate"));
  assert.ok(!html.includes("Continue owner request"));
});

test("empty, malformed and ready owner progress do not invent findings or merge authority", () => {
  assert.ok(render(null).includes("Not submitted"));
  for (const readiness of [null, {}, { readiness: null }, { readiness: { findings: [null, 12, { code: "incomplete" }] } }]) {
    const html = render({ request_id: "prototype-maturity-request:sample:2", status: "review-required", next_action: "review-exact-head", readiness });
    assert.ok(html.includes("review-exact-head"));
    assert.ok(!html.includes("Required fix:"));
    assert.ok(!html.includes("Record Candidate Promotion"));
  }
});
