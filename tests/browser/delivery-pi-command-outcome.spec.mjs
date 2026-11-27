import { test, expect } from "../support/filled-surface-layout.mjs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { projectCanonicalDeliveryOverview } = require("../../src/domain-workspaces/delivery/live-runtime/delivery-overview-live-projection.ts");
const base = process.env.CONSOLE_TEST_BASE_URL ?? "http://127.0.0.1:3320";
const pi = "PI-2026-04";
const iteration = `${pi} / Iteration 1`;
const recordRef = "openproject://work_packages/1";

test.setTimeout(120000);
test.use({ viewport: { width: 1580, height: 960 }, actionTimeout: 15000 });

test("Apply PI Plan follows the original result across reload", async ({ page }) => {
  const state = { done: false, confirm: false, writes: [], reads: [] };
  const sourceRevision = () => `delivery-package:sha256:${(state.done ? "b" : "a").repeat(64)}`;
  const item = (id, type, subject, extra = {}) => ({
    id, type, subject, status: "new", record_ref: `openproject://work_packages/${id}`,
    owner_repo: "governance-operations-console", target_pi: pi, iteration: null,
    description: "Review the existing planning decision.", children: [],
    architecture_anchor_ref: null, required_upstream_ref: null, ...extra,
  });
  const tree = () => item(1, "Epic", "PI outcome browser check", { children: [
    item(2, "Milestone", "Verify schedule", { iteration: state.done ? iteration : null }),
    item(3, "PI Objective", "Keep a verified plan", { pi_objective_type: "Committed", planned_business_value: 2 }),
  ] });
  const catalog = { projection_status: "fresh", items: [], values: [
    { catalog_item_id: "catalog-target-pi", value_key: pi, label: pi, lifecycle_state: "active" },
    { catalog_item_id: "catalog-pi-planning-date", value_key: "2026-11-23/2026-12-06",
      parent_catalog_value_key: pi, lifecycle_state: "read_only" },
    { catalog_item_id: "catalog-iteration", value_key: iteration, label: "Iteration 1", lifecycle_state: "active",
      parent_catalog_value_key: pi, iteration_window: { sequence: 1, start_date: "2026-11-23", end_date: "2026-12-06" } },
  ] };
  function model() {
    const epic = tree();
    return { ...projectCanonicalDeliveryOverview({
      schema_version: 1, workflow_id: "delivery-console-overview", project: { identifier: "workspace-delivery-art" },
      roots: [epic], deferred_history_refs: [], mutation_authority: "none",
      operational_initiatives: [{ epic, execution_tree: epic, summary: { open_descendant_count: 2 },
        execution_navigation: { authority: "operator-orchestration-service", eligibility: "check-selected-work-item",
          native_status: "new", workflow_phase: "execution", package_posture: "New", closeout_pending: false,
          active_work_item_ids: [], prepared_work_item_ids: [2], blocked_work_item_ids: [], refinement_work_item_ids: [] },
      }],
    }, "pi-outcome-browser-check", new Date().toISOString()), catalog };
  }
  const snapshot = projection => ({ mode: "live", status: "current", error: null, observedAt: new Date().toISOString(), projection });

  // Browser proof controls reply loss and clock timing. Native owner readback
  // is qualified separately against the disposable Dev Integration instance.
  await page.route("**/api/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/console/capabilities") return route.fulfill({ json: {
      artifactType:"console-runtime-capability-projection", schemaVersion:1, mode:"live", capabilities:[],
    } });
    if (path === "/api/delivery/workspace") return route.fulfill({ json: { mode:"live", projection:model() } });
    if (path.endsWith("/change-control")) return route.fulfill({ json:snapshot({
      schema_version:1, delivery_id:"delivery-1", record_ref:recordRef, source_revision:sourceRevision(),
      projection_state:"current", projected_at:new Date().toISOString(), last_event_ref:null,
      package:{ execution_tree:tree(), dependency_relations:[] },
    }) });
    if (path.endsWith("/change-control/commands")) {
      const body = request.postDataJSON();
      expect(body.operation.type).toBe("apply_pi_plan");
      expect(body.operation.payload.assignments.map(entry => entry.work_item_id)).toEqual(["work-item-2"]);
      state.writes.push(body.commandId);
      const before = sourceRevision();
      state.done = true;
      const after = sourceRevision();
      const receipt = { ref:`oos://delivery-change-receipts/${body.commandId}`, digest:`sha256:${"a".repeat(64)}` };
      const next_action = { authority:"operator-orchestration-service", code:"refresh_delivery_package", label:"Review current work" };
      state.result = {
        schema_version:1, command_id:body.commandId, status:"applied", replayed:false,
        before:{ record_ref:recordRef, source_revision:before }, after:{ record_ref:recordRef, source_revision:after },
        receipt, next_action, event:{
          schema_version:1, event_id:`delivery-change-event:${body.commandId}:result`, command_id:body.commandId,
          command_digest:`sha256:${"b".repeat(64)}`, delivery_id:"delivery-1", operator_id:"operator:test",
          operation_type:"apply_pi_plan", status:"applied", occurred_at:new Date().toISOString(),
          source_revision_before:before, source_revision_after:after, receipt, next_action, effect:{},
          rollback:{ mode:"compensating_command_required", reason:"Review a separate operation." },
        },
      };
      return route.fulfill({ status:502, json:{ error:"The original reply was lost." } });
    }
    if (path.includes("/change-control/commands/")) {
      const id = decodeURIComponent(path.split("/").at(-1));
      state.reads.push(id);
      return route.fulfill({ json:state.confirm && id === state.result?.command_id
        ? { state:"completed", result:state.result }
        : { state:"pending" } });
    }
    return route.fulfill({status:503,json:{mode:"live",status:"offline",projection:null,error:"Isolated unavailable owner"}});
  });

  async function openPlanning() {
    await page.goto(base,{waitUntil:"domcontentloaded"});
    await page.waitForFunction(() => {
      const button = document.querySelector('button[title="Open DELIVERY"]');
      return button && Object.keys(button).some(key => key.startsWith("__reactProps$"));
    });
    await page.locator('button[title="Open DELIVERY"]').click();
    const workspace = page.getByRole("dialog",{name:"Delivery Workspace",exact:true});
    await workspace.locator('[data-delivery-workspace-section="pi-planning"]').click();
    return workspace;
  }

  const workspace = await openPlanning();
  await workspace.getByRole("radio",{name:"Work items",exact:true}).click();
  await workspace.getByText("Verify schedule",{exact:true}).click();
  await workspace.getByRole("button",{name:"Move to",exact:true}).click();
  await page.getByRole("option",{name:"Iteration 1",exact:true}).click();
  await workspace.getByRole("button",{name:"Review plan",exact:true}).click();
  const review = page.getByRole("dialog",{name:"Review PI Plan",exact:true});
  await review.getByRole("button",{name:"Apply plan",exact:true}).click();
  await expect(review.getByRole("button",{name:"Checking Result",exact:true})).toBeDisabled();

  const recovered = await openPlanning();
  await expect(recovered.getByText("Checking the original result",{exact:true})).toBeVisible();
  state.confirm = true;
  await expect(recovered).toContainText("Your submitted plan change was recorded.", { timeout:15000 });
  expect(state.writes).toHaveLength(1);
  expect(new Set(state.reads)).toEqual(new Set(state.writes));
});
