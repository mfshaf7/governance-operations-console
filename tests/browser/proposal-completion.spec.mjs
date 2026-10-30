import { test, expect } from "@playwright/test";
import { proposalCompletionRecord, proposalCompletionRoute } from "../support/proposal-completion-fixture.mjs";

const base = process.env.CONSOLE_TEST_BASE_URL ?? "http://127.0.0.1:4317";
test.use({ viewport: { width: 1700, height: 1000 } });
test.setTimeout(90000);

async function openProposal(page, record, titleOverride) {
  const writes = [];
  await page.route("**/api/**", route => {
    if (["GET", "HEAD", "OPTIONS"].includes(route.request().method())) return route.continue();
    writes.push(route.request().url());
    return route.abort();
  });
  if (record) await page.route("**/api/proposals", route => route.fulfill({json: {
    mode: "live", status: "current", error: null, observedAt: new Date().toISOString(), records: [record],
  }}));
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const n = document.querySelector('button[title="Open PROPOSAL"]');
    const key = n && Object.keys(n).find(key => key.startsWith("__reactProps$"));
    return Boolean(key && n[key].onClick);
  }, null, {timeout: 60000});
  await page.locator('button[title="Open PROPOSAL"]').click();
  const title = titleOverride ?? record?.projection.title ?? "Completed proposal — historical route unavailable";
  const row = page.getByRole("row").filter({hasText: title});
  await expect(row).toBeVisible({timeout:60000});
  await row.click();
  await page.locator('[data-proposal-open-hub-action="true"]').click();
  return writes;
}

test("historical implementation stays Done through Hub, locked Disposition and History", async ({page}) => {
  const writes = await openProposal(page, proposalCompletionRecord());
  await expect(page.getByRole("heading", {name:"Proposal Complete",exact:true})).toBeVisible();
  await expect(page.getByText("Route Needed",{exact:true})).toHaveCount(0);
  await expect(page.locator('[data-proposal-hub-primary-action="true"]')).toHaveText("Open History");
  const hub = page.getByRole("dialog", {name:"Proposal Hub",exact:true});
  await expect(hub.getByRole("button",{name:/Handoff/})).toBeDisabled();
  await hub.getByRole("button",{name:/Disposition.*Archive/}).click();
  await expect(page.getByText("No route details were recorded for this completed proposal. No new route is required.",{exact:true})).toBeVisible();
  await expect(page.getByRole("radiogroup",{name:"Proposal route target",exact:true})).toHaveCount(0);
  await expect(page.locator('[data-proposal-disposition-primary-action="true"]')).toBeDisabled();
  await expect(page.getByRole("textbox",{name:"Decision notes",exact:true})).toHaveAttribute("readonly", "");
  await page.locator('[data-proposal-workflow-action="view-history"]').click();
  await expect(page.getByRole("dialog",{name:"Proposal History",exact:true})).toBeVisible();
  expect(writes).toEqual([]);
});

for (const target of ["delivery", "prototype"]) test(`completed ${target} handoff retains read-only inspection`, async ({page}) => {
  const record = proposalCompletionRecord({status:"accepted",route:proposalCompletionRoute(target),handoff:{state:"applied",packet_ref:"proposal-handoff:example",target_receipt_ref:"receipt:example",target_record_ref:"record:example"}});
  const writes = await openProposal(page, record);
  await expect(page.getByRole("heading",{name:"Proposal Complete",exact:true})).toBeVisible();
  await page.getByRole("dialog",{name:"Proposal Hub",exact:true}).getByRole("button",{name:/Handoff.*Archive/}).click();
  await expect(page.getByRole("dialog",{name:"Proposal Handoff",exact:true})).toBeVisible();
  await expect(page.locator('[data-proposal-workflow-action="view-history"]')).toBeEnabled();
  expect(await page.getByRole("dialog",{name:"Proposal Handoff",exact:true}).locator('textarea:not([readonly]):not([disabled])').count()).toBe(0);
  await page.locator('[data-proposal-workflow-action="view-history"]').click();
  await expect(page.getByRole("dialog",{name:"Proposal History",exact:true})).toBeVisible();
  expect(writes).toEqual([]);
});

test("active acceptance still requests the missing route", async ({page}) => {
  await openProposal(page, proposalCompletionRecord({status:"accepted"}));
  await expect(page.getByRole("heading",{name:"Disposition Needs Route",exact:true}).first()).toBeVisible();
  await expect(page.locator('[data-proposal-hub-primary-action="true"]')).toHaveText("Complete Disposition");
});

test("retained route remains inspectable when historical decision notes are absent", async ({page}) => {
  const writes = await openProposal(page, proposalCompletionRecord({route:proposalCompletionRoute(), decision_notes:null}));
  await page.getByRole("dialog",{name:"Proposal Hub",exact:true}).getByRole("button",{name:/Disposition.*Archive/}).click();
  await expect(page.getByText("No decision notes were recorded for this completed proposal.",{exact:true})).toBeVisible();
  await expect(page.getByText("Historical route",{exact:true})).toHaveCount(0);
  await expect(page.getByRole("radiogroup",{name:"Proposal route target",exact:true})).toBeVisible();
  await expect(page.getByRole("radiogroup",{name:"Proposal route target",exact:true}).getByRole("radio").first()).toBeDisabled();
  await expect(page.locator('[data-proposal-workflow-action="view-history"]')).toBeEnabled();
  expect(writes).toEqual([]);
});

test("ordinary disconnected preview includes a completed historical example", async ({page}) => {
  const writes = await openProposal(page);
  await expect(page.getByRole("heading",{name:"Proposal Complete",exact:true})).toBeVisible();
  await expect(page.locator('[data-proposal-hub-primary-action="true"]')).toHaveText("Open History");
  await page.locator('[data-proposal-hub-primary-action="true"]').click();
  await expect(page.getByRole("dialog",{name:"Proposal History",exact:true})).toBeVisible();
  expect(writes).toEqual([]);
});

for (const status of ["done","retired"]) test(`older accepted Proposal shows linked Delivery ${status} without a new route`,async({page})=>{
  const record={...proposalCompletionRecord({status:"accepted",delivery_ref:"openproject://work_packages/901"}),
    deliveryLink:{recordRef:"openproject://work_packages/901",status,sourceState:"current",observedAt:"2026-06-21T08:00:00Z"}};
  const writes=await openProposal(page,record);
  await expect(page.getByRole("heading",{name:status==="done"?"Delivery Complete":"Delivery Retired",exact:true})).toBeVisible();
  await expect(page.getByText("Route Needed",{exact:true})).toHaveCount(0);
  await expect(page.getByText(status==="done"?"The linked Delivery work is done. The Proposal still says accepted; source closeout is pending. No new route is required.":"This proposal already moved to Delivery. The linked initiative was retired; retirement is not implementation evidence. No new route is required.",{exact:true})).toBeVisible();
  await expect(page.locator('[data-proposal-hub-primary-action="true"]')).toHaveText("Open History");
  expect(writes).toEqual([]);
});

test("retired example is available in the ordinary disconnected preview",async({page})=>{
  await openProposal(page,undefined,"Retired Delivery — no route needed");
  await expect(page.getByRole("heading",{name:"Delivery Retired",exact:true})).toBeVisible();
  await expect(page.getByText("Route Needed",{exact:true})).toHaveCount(0);
});
