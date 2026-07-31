import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

import { appPath, relativeAppPath } from "../../guard-lib.mjs";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const refinementFixturePath =
  "src/domain-workspaces/delivery/read-model/fixtures/packages/refinement.fixture.ts";

registerTypeScriptRequireHook();

export const guard = {
  id: "delivery/refinement-fixture-targets",
  run() {
    const failures = [];
    const { deliveryRefinementPackageFixtures } = require(
      appPath(refinementFixturePath),
    );

    for (const deliveryPackage of deliveryRefinementPackageFixtures) {
      const packet = deliveryPackage.refinement_packet;

      if (!packet?.target_tree) {
        continue;
      }

      const nodes = collectTreeNodes(packet.target_tree);
      const nodeIds = new Set(nodes.map((node) => node.id));
      const nodeKinds = new Map(nodes.map((node) => [node.id, node.kind]));

      for (const group of packet.draft_groups ?? []) {
        for (const field of group.fields ?? []) {
          assertTargetNodeIdsExist(failures, {
            deliveryPackage,
            field,
            group,
            nodeIds,
            nodeKinds,
          });
          assertTargetMapKeysExist(failures, {
            deliveryPackage,
            field,
            group,
            mapName: "target_values",
            nodeIds,
          });
          assertTargetMapKeysExist(failures, {
            deliveryPackage,
            field,
            group,
            mapName: "target_statuses",
            nodeIds,
          });
        }
      }
    }

    return failures;
  },
};

export default guard;

function registerTypeScriptRequireHook() {
  if (require.extensions[".ts"]?.__deliveryFixtureGuard) {
    return;
  }

  const originalResolveFilename = Module._resolveFilename;

  Module._resolveFilename = function resolveDeliveryGuardImport(
    request,
    parent,
    isMain,
    options,
  ) {
    try {
      return originalResolveFilename.call(
        this,
        request,
        parent,
        isMain,
        options,
      );
    } catch (error) {
      if (error.code !== "MODULE_NOT_FOUND" || !request.startsWith(".")) {
        throw error;
      }

      const basedir = parent ? dirname(parent.filename) : process.cwd();

      for (const extension of [".ts", ".tsx"]) {
        const candidate = resolve(basedir, `${request}${extension}`);

        try {
          return originalResolveFilename.call(
            this,
            candidate,
            parent,
            isMain,
            options,
          );
        } catch {
          // Keep trying supported TypeScript extensions.
        }
      }

      throw error;
    }
  };

  const compileTypeScript = function compileDeliveryGuardTypeScript(
    module,
    filename,
  ) {
    const source = readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
      fileName: filename,
    }).outputText;

    module._compile(output, filename);
  };

  compileTypeScript.__deliveryFixtureGuard = true;
  require.extensions[".ts"] = compileTypeScript;
  require.extensions[".tsx"] = compileTypeScript;
}

function collectTreeNodes(node, nodes = []) {
  nodes.push(node);

  for (const child of node.children ?? []) {
    collectTreeNodes(child, nodes);
  }

  return nodes;
}

function assertTargetNodeIdsExist(
  failures,
  { deliveryPackage, field, group, nodeIds, nodeKinds },
) {
  for (const targetNodeId of field.target_node_ids ?? []) {
    if (!nodeIds.has(targetNodeId)) {
      failures.push(
        `${relativeAppPath(appPath(refinementFixturePath))}: package ${deliveryPackage.legacy_epic_id} ${group.title} / ${field.label} references missing target_node_id "${targetNodeId}"`,
      );
      continue;
    }

    if (
      field.target_kinds?.length &&
      !field.target_kinds.includes(nodeKinds.get(targetNodeId))
    ) {
      failures.push(
        `${relativeAppPath(appPath(refinementFixturePath))}: package ${deliveryPackage.legacy_epic_id} ${group.title} / ${field.label} target_node_id "${targetNodeId}" has kind "${nodeKinds.get(targetNodeId)}", outside target_kinds ${field.target_kinds.join(", ")}`,
      );
    }
  }
}

function assertTargetMapKeysExist(
  failures,
  { deliveryPackage, field, group, mapName, nodeIds },
) {
  for (const targetNodeId of Object.keys(field[mapName] ?? {})) {
    if (nodeIds.has(targetNodeId)) {
      continue;
    }

    failures.push(
      `${relativeAppPath(appPath(refinementFixturePath))}: package ${deliveryPackage.legacy_epic_id} ${group.title} / ${field.label} ${mapName} references missing node "${targetNodeId}"`,
    );
  }
}
