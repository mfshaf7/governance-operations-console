import { readFileSync } from "node:fs";
import { extname } from "node:path";
import ts from "typescript";

import {
  relativeAppPath,
  walkFiles,
} from "../guard-lib.mjs";

const presentationRoot = "src/domain-workspaces";
const integrationMutationName =
  /^(acknowledge|record|reconcile|sync).*(Packet|Projection)/;

function operationIntegrationMutations(sourceFile) {
  const mutations = new Map();

  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !statement.moduleSpecifier.text.includes("operation-integrations/") ||
      !statement.importClause?.namedBindings ||
      !ts.isNamedImports(statement.importClause.namedBindings)
    ) {
      continue;
    }

    for (const element of statement.importClause.namedBindings.elements) {
      const importedName = element.propertyName?.text ?? element.name.text;

      if (integrationMutationName.test(importedName)) {
        mutations.set(element.name.text, importedName);
      }
    }
  }

  return mutations;
}

function effectIntegrationMutations(sourceFile, mutations) {
  const usedMutations = new Set();

  function collectMutationCalls(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      mutations.has(node.expression.text)
    ) {
      usedMutations.add(mutations.get(node.expression.text));
    }

    ts.forEachChild(node, collectMutationCalls);
  }

  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "useEffect" &&
      node.arguments[0]
    ) {
      collectMutationCalls(node.arguments[0]);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return usedMutations;
}

export const guard = {
  id: "shared/presentation-integration-effect-boundary",
  run() {
    const failures = [];

    for (const file of walkFiles(presentationRoot, [".ts", ".tsx"])) {
      const path = relativeAppPath(file);

      if (!path.includes("/presentation/")) {
        continue;
      }

      const source = readFileSync(file, "utf8");
      const sourceFile = ts.createSourceFile(
        path,
        source,
        ts.ScriptTarget.Latest,
        true,
        extname(file) === ".tsx" ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
      const mutations = operationIntegrationMutations(sourceFile);

      for (const mutation of effectIntegrationMutations(
        sourceFile,
        mutations,
      )) {
        failures.push(
          `${path}: React effects must not synchronize cross-domain state through ${mutation}; invoke an explicit integration command from the operator action`,
        );
      }
    }

    return failures;
  },
};

export default guard;
