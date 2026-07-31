import {
  readAppFile,
  relativeAppPath,
  walkFiles,
} from "../../guard-lib.mjs";

const deliveryRoot = "src/domain-workspaces/delivery";

const forbiddenBackendRoutePatterns = [
  {
    label: "POST /v1/delivery-work-items/{work_item_id}/start",
    pattern: /POST \/v1\/delivery-work-items\/\{work_item_id\}\/start/,
  },
  {
    label: "POST /v1/delivery-initiatives/{delivery_id}/parking",
    pattern: /POST \/v1\/delivery-initiatives\/\{delivery_id\}\/parking/,
  },
  {
    label: "POST /v1/delivery-initiatives/{delivery_id}/parking/resume",
    pattern:
      /POST \/v1\/delivery-initiatives\/\{delivery_id\}\/parking\/resume/,
  },
  {
    label: "GET /v1/delivery-initiatives/{delivery_id}/closeout",
    pattern:
      /GET \/v1\/delivery-initiatives\/\{delivery_id\}\/closeout(?!-readiness)/,
  },
  {
    label: "POST /v1/delivery-initiatives/{delivery_id}/closeout/continue",
    pattern:
      /POST \/v1\/delivery-initiatives\/\{delivery_id\}\/closeout\/continue/,
  },
  {
    label: "Future backend capability:",
    pattern: /Future backend capability:/,
  },
];

const forbiddenUnsupportedBlockerTokens = [
  "projection-drift-signal",
  "Receipt Projection Repair",
  "receipt projection source drift",
  "receipt projection no longer matches",
  "Repair receipt projection source drift",
  "Replay receipt projection",
];

export const guard = {
  id: "delivery/backend-route-contract",
  run() {
    const failures = [];

    for (const absoluteFilePath of walkFiles(deliveryRoot, [".ts", ".tsx"])) {
      const filePath = relativeAppPath(absoluteFilePath);
      const source = readAppFile(filePath);

      for (const { label, pattern } of forbiddenBackendRoutePatterns) {
        if (pattern.test(source)) {
          failures.push(
            `${filePath}: unsupported backend route token "${label}" must not be used in Delivery action fixtures or presentation`,
          );
        }
      }

      for (const token of forbiddenUnsupportedBlockerTokens) {
        if (source.includes(token)) {
          failures.push(
            `${filePath}: unsupported mock blocker cause "${token}" must not be used as Delivery backend truth`,
          );
        }
      }
    }

    return failures;
  },
};

export default guard;
