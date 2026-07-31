import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import ts from "typescript";

import {
  appRoot,
  relativeAppPath,
  walkFiles,
} from "../guard-lib.mjs";

const operationRoot = "src/domain-workspaces";
const operationDomains = new Set([
  "delivery",
  "model-operations",
  "orchestration",
  "portfolio",
  "proposal",
  "prototype",
  "repository",
]);
const sourceExtensions = [".ts", ".tsx"];

function moduleSpecifiers(path) {
  const source = readFileSync(path, "utf8");
  const sourceFile = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    extname(path) === ".tsx" ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const specifiers = [];

  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    }

    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specifiers;
}

function resolveSourceImport(importer, specifier) {
  let candidateRoot;

  if (specifier.startsWith("@/")) {
    candidateRoot = join(appRoot, "src", specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    candidateRoot = resolve(dirname(importer), specifier);
  } else {
    return null;
  }

  const candidates = extname(candidateRoot)
    ? [candidateRoot]
    : [
        candidateRoot,
        `${candidateRoot}.ts`,
        `${candidateRoot}.tsx`,
        join(candidateRoot, "index.ts"),
        join(candidateRoot, "index.tsx"),
      ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function domainLayer(path) {
  const relativePath = relativeAppPath(path);
  const parts = relativePath.split("/");

  if (
    parts[0] !== "src" ||
    parts[1] !== "domain-workspaces" ||
    !operationDomains.has(parts[2])
  ) {
    return null;
  }

  return {
    domain: parts[2],
    layer: parts[3] ?? "public",
    path: relativePath,
  };
}

function dependencyCycles(graph) {
  const cycles = [];
  const visited = new Set();
  const active = new Set();
  const stack = [];
  const recorded = new Set();

  function visit(node) {
    if (active.has(node)) {
      const cycleStart = stack.indexOf(node);
      const cycle = [...stack.slice(cycleStart), node];
      const key = [...new Set(cycle.slice(0, -1))].sort().join("|");
      if (!recorded.has(key)) {
        recorded.add(key);
        cycles.push(cycle);
      }
      return;
    }

    if (visited.has(node)) {
      return;
    }

    visited.add(node);
    active.add(node);
    stack.push(node);

    for (const dependency of graph.get(node) ?? []) {
      visit(dependency);
    }

    stack.pop();
    active.delete(node);
  }

  for (const node of graph.keys()) {
    visit(node);
  }

  return cycles;
}

function forbiddenLayerDependency(source, target) {
  if (!source || !target || source.domain !== target.domain) {
    return null;
  }

  const forbiddenByLayer = {
    domain: new Set([
      "local-runtime",
      "presentation",
      "product-adapters",
      "read-model",
      "work-model",
    ]),
    "local-runtime": new Set(["presentation"]),
    "product-adapters": new Set(["local-runtime", "presentation"]),
    "read-model": new Set(["presentation"]),
    "work-model": new Set(["local-runtime", "presentation"]),
  };

  if (forbiddenByLayer[source.layer]?.has(target.layer)) {
    return `${source.layer} must not depend on ${target.layer}`;
  }

  return null;
}

export const guard = {
  id: "shared/operation-dependency-direction",
  run() {
    const failures = [];
    const files = walkFiles("src", sourceExtensions);
    const graph = new Map();

    for (const file of files) {
      const sourcePath = relativeAppPath(file);
      const dependencies = new Set();

      for (const specifier of moduleSpecifiers(file)) {
        const sourceLayer = domainLayer(file);

        if (
          sourceLayer?.layer === "domain" &&
          (specifier === "react" || specifier.startsWith("react/"))
        ) {
          failures.push(
            `${sourcePath}: domain model must remain independent of React`,
          );
        }

        const dependency = resolveSourceImport(file, specifier);
        if (!dependency || !sourceExtensions.includes(extname(dependency))) {
          continue;
        }

        const dependencyPath = relativeAppPath(dependency);
        dependencies.add(dependencyPath);

        const targetLayer = domainLayer(dependency);
        if (
          sourceLayer &&
          targetLayer &&
          sourceLayer.domain !== targetLayer.domain
        ) {
          failures.push(
            `${sourcePath}: operation domains must communicate through neutral contracts and integrations, not private ${targetLayer.domain} source "${specifier}"`,
          );
        }

        const violation = forbiddenLayerDependency(sourceLayer, targetLayer);
        if (violation) {
          failures.push(
            `${sourcePath}: ${violation} through "${specifier}"`,
          );
        }

        if (
          sourceLayer?.layer === "domain" &&
          dependencyPath.startsWith("src/teras/")
        ) {
          failures.push(
            `${sourcePath}: domain model must remain independent of Teras`,
          );
        }
      }

      graph.set(sourcePath, dependencies);
    }

    for (const cycle of dependencyCycles(graph)) {
      failures.push(`dependency cycle: ${cycle.join(" -> ")}`);
    }

    for (const file of walkFiles(operationRoot, sourceExtensions)) {
      const path = relativeAppPath(file);
      const source = readFileSync(file, "utf8");

      if (
        source.includes("window.open(") &&
        path !== "src/console-integration/external-route.ts"
      ) {
        failures.push(
          `${path}: external navigation must use the neutral console route helper`,
        );
      }
    }

    return failures;
  },
};

export default guard;
