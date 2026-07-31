import {
  assertAppFile,
  assertAppPathAbsent,
  assertDomainOwnershipRoot,
} from "../../guard-lib.mjs";

const root = "src/domain-workspaces/portfolio";

export const guard = {
  id: "portfolio/source-structure",
  run() {
    const failures = [];

    assertDomainOwnershipRoot(failures, "portfolio", {
      allowedLayers: [
        "domain",
        "local-runtime",
        "presentation",
        "read-model",
        "work-model",
      ],
    });

    for (const path of [
      `${root}/domain/product-portfolio-entry-types.ts`,
      `${root}/domain/product-portfolio-vocabulary.ts`,
      `${root}/presentation/workspace/index.ts`,
      `${root}/presentation/workspace/workspace.tsx`,
      `${root}/presentation/workspace/workspace-contract.ts`,
      `${root}/presentation/surfaces/products/products-surface.tsx`,
      `${root}/presentation/surfaces/publication/publication-surface.tsx`,
      `${root}/presentation/surfaces/curation/curation-surface.tsx`,
      `${root}/read-model/product-portfolio-read-model.ts`,
      `${root}/read-model/selectors/product-portfolio-selectors.ts`,
      `${root}/read-model/activity-source.ts`,
      `${root}/read-model/attention-source.ts`,
      `${root}/work-model/publication/product-publication-packet.ts`,
      `${root}/work-model/publication/product-publication-decision-model.ts`,
      `${root}/work-model/publication/product-publication-projection.ts`,
      `${root}/work-model/listing/product-listing-model.ts`,
      `${root}/local-runtime/product-portfolio-runtime.ts`,
      `${root}/local-runtime/product-portfolio-effective-projection.ts`,
    ]) {
      assertAppFile(failures, path);
    }

    for (const obsoletePath of [
      `${root}/presentation/dialogs`,
      `${root}/presentation/surface`,
      `${root}/presentation/surfaces/admission`,
      `${root}/read-model/portfolio-workspace-read-model.ts`,
      `${root}/work-model/admission`,
      `${root}/work-model/linked-work`,
      `${root}/work-model/movement-handoff`,
      `${root}/work-model/posture-edit`,
      `${root}/work-model/registration`,
    ]) {
      assertAppPathAbsent(
        failures,
        obsoletePath,
        "Product Portfolio must not regain the retired arbitrary-work model",
      );
    }

    return failures;
  },
};

export default guard;
