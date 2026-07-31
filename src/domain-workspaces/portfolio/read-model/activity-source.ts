import {
  getProductPortfolioRuntimeProjectionSnapshot,
  subscribeProductPortfolioRuntimeProjection,
} from "../local-runtime/product-portfolio-runtime.ts";

export const portfolioActivitySource = {
  getRuntimeSnapshot: getProductPortfolioRuntimeProjectionSnapshot,
  subscribeRuntime: subscribeProductPortfolioRuntimeProjection,
} as const;
