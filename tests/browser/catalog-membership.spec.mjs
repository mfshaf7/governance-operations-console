import {test,expect} from "../support/filled-surface-layout.mjs";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {deliveryReadModel}=require("../../src/domain-workspaces/delivery/read-model/projections/root-projection.ts");
const {membershipPreview}=require("../../src/domain-workspaces/delivery/presentation/surfaces/catalog/membership-preview.ts");
const base=process.env.CONSOLE_TEST_BASE_URL??"http://127.0.0.1:4317";
test.setTimeout(90000);test.use({viewport:{width:1700,height:1050},navigationTimeout:60000});
async function harness(page,{preview=true,read,write}={}) {
 const writes=[],errors=[],sample=membershipPreview();page.on("pageerror",e=>errors.push(String(e)));
 await page.route("**/api/**",async route=>{
  const r=route.request(),path=new URL(r.url()).pathname;
  if(path==="/api/console/capabilities")return route.fulfill({json:{artifactType:"console-runtime-capability-projection",schemaVersion:1,mode:"disconnected-preview",capabilities:[]}});
  if(path==="/api/delivery/workspace")return route.fulfill({json:{mode:"live",projection:structuredClone(deliveryReadModel)}});
  if(path==="/api/delivery/catalog/projection"){
   const c=structuredClone(deliveryReadModel.catalog),projection={schema_version:1,source_revision:"membership-catalog-test",projection_status:"ready",projected_at:new Date().toISOString(),summary:c.summary,groups:c.groups,
    items:c.items.map(({tone,...x})=>x),values:c.values.map(({tone,...x})=>({...x,parent_catalog_item_id:x.parent_catalog_item_id??null,parent_catalog_value_key:x.parent_catalog_value_key??null,repository_binding:null}))};
   return route.fulfill({json:{mode:preview?"disconnected-preview":"live",status:"current",projection:preview?null:projection,error:null,observedAt:new Date().toISOString()}});
  }
  if(path==="/api/delivery/catalog/memberships"){
   if(r.method()==="GET")return read?read(route):route.fulfill({json:sample});
   writes.push(r.postDataJSON());return write?write(route):route.fulfill({status:503,json:{message:"Isolated browser test blocks canonical writes"}});
  }
  if(path.startsWith("/api/saved-work/"))return route.fulfill({json:{mode:"disconnected-preview"}});
  if(!["GET","HEAD","OPTIONS"].includes(r.method()))return route.fulfill({status:503,json:{message:"Isolated browser test blocks canonical writes"}});
  return route.fallback();
 });
 await page.goto(base,{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>{const b=document.querySelector('button[title="Open DELIVERY"]'),k=b&&Object.keys(b).find(k=>k.startsWith("__reactProps$"));return Boolean(k&&b[k].onClick);});
 await page.locator('button[title="Open DELIVERY"]').click();
 const workspace=page.getByRole("dialog",{name:"Delivery Workspace",exact:true});
 await expect(workspace.locator('[data-delivery-home="home"]')).toBeVisible();
 await workspace.locator('[data-delivery-workspace-section="catalog"]').click();
 const catalog=workspace.locator('[data-delivery-catalog]');
 await expect(catalog.getByText(preview?"preview":"live",{exact:true})).toBeVisible();
 await workspace.locator('[data-teras-selector-rail-list]').getByRole("button").nth(6).click();
 await catalog.getByRole("button",{name:"Manage Members",exact:true}).click();
 const manager=page.getByRole("dialog",{name:"Project Members",exact:true});
 return {manager,writes,errors,sample};
}
test("explicit preview can add, change and remove a member without native writes",async({page},info)=>{
 const h=await harness(page);await expect(h.manager.getByRole("table",{name:"Project members"})).toBeVisible();
 const protectedRow=h.manager.getByRole("row").filter({hasText:"Installation operator"});await expect(protectedRow.getByRole("button")).toHaveCount(0);
 await h.manager.getByRole("button",{name:"Add Member",exact:true}).click();
 let form=page.getByRole("dialog",{name:"Add Project Member",exact:true});
 await form.getByRole("button",{name:"User or group",exact:true}).click();await page.getByRole("option",{name:"Casey Taylor",exact:true}).click();
 await form.getByRole("button",{name:"Role: Member",exact:true}).click();
 for(const viewport of [{width:1700,height:1050},{width:1280,height:720}]){await page.setViewportSize(viewport);await page.screenshot({path:info.outputPath(`membership-form-${viewport.width}.png`)});expect(await form.evaluate(e=>e.scrollWidth-e.clientWidth)).toBeLessThanOrEqual(1);}
 await form.getByRole("button",{name:"Add Member",exact:true}).click();await expect(form).toHaveCount(0);
 await expect(h.manager).toContainText("Preview added Casey Taylor");
 let row=h.manager.getByRole("row").filter({hasText:"Casey Taylor"});await row.getByRole("button",{name:"Change Roles",exact:true}).click();
 form=page.getByRole("dialog",{name:"Change Project Roles",exact:true});await form.getByRole("button",{name:"Role: Member",exact:true}).click();await form.getByRole("button",{name:"Role: Reader",exact:true}).click();
 await form.getByRole("button",{name:"Save Roles",exact:true}).click();await expect(h.manager).toContainText("Preview updated Casey Taylor");
 row=h.manager.getByRole("row").filter({hasText:"Casey Taylor"});await expect(row).toContainText("Reader");await row.getByRole("button",{name:"Remove",exact:true}).click();
 form=page.getByRole("dialog",{name:"Remove Project Member",exact:true});await expect(form).toContainText("does not delete the account");await form.getByRole("button",{name:"Remove Member",exact:true}).click();
 await expect(h.manager).toContainText("Preview removed Casey Taylor");await expect(h.manager.getByRole("row").filter({hasText:"Casey Taylor"})).toHaveCount(0);
 await page.screenshot({path:info.outputPath("membership-manager.png")});expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
});
function outcome(command,sample){const before=sample.members.find(m=>m.id===command.principal_id),after={...before,role_ids:command.role_ids,role_names:["Reader"],version:"sha256:"+"c".repeat(64)};
 return {schema_version:1,status:"applied",request_id:command.request_id,caller_id:"governance-operations-console",operator_id:"operator:test",operation:command.operation,project_id:1,project_identifier:"workspace-delivery-art",principal:{id:before.id,name:before.name,kind:before.kind},before,after,
 applied_at:new Date().toISOString(),replayed:true,request_digest:"sha256:"+"d".repeat(64),receipt:{ref:"openproject://delivery-memberships/receipts/"+"e".repeat(64),digest:"sha256:"+"f".repeat(64)}};}
test("uncertain write stays frozen through form close and recovers the identical request",async({page})=>{
 const sample=membershipPreview();let attempts=0;const h=await harness(page,{preview:false,read:r=>r.fulfill({json:sample}),write:r=>++attempts===1?r.abort("failed"):r.fulfill({json:outcome(r.request().postDataJSON(),sample)})});
 await h.manager.getByRole("row").filter({hasText:"Alex Morgan"}).getByRole("button",{name:"Change Roles",exact:true}).click();
 const form=page.getByRole("dialog",{name:"Change Project Roles",exact:true});await form.getByRole("button",{name:"Role: Member",exact:true}).click();await form.getByRole("button",{name:"Role: Reader",exact:true}).click();
 await form.getByRole("button",{name:"Save Roles",exact:true}).click();await expect(form).toContainText("Outcome not confirmed");await expect(form.getByRole("button",{name:"Role: Reader",exact:true})).toBeDisabled();
 await form.getByRole("button",{name:"Cancel",exact:true}).click();await page.getByRole("alertdialog",{name:"Close membership change?",exact:true}).getByRole("button",{name:"Close Form",exact:true}).click();
 await expect(h.manager.getByRole("button",{name:"Add Member",exact:true})).toBeDisabled();await expect(h.manager).toContainText("Membership outcome not confirmed");
 await h.manager.getByRole("button",{name:"Recover pending change",exact:true}).click();await expect(h.manager).toContainText("Membership updated");
 expect(h.writes).toHaveLength(2);expect(h.writes[1]).toEqual(h.writes[0]);expect(h.errors).toEqual([]);
});
test("failed member read shows section retry and cannot display preview accounts",async({page})=>{
 let fail=true;const h=await harness(page,{preview:false,read:r=>fail?r.fulfill({status:403,json:{message:"Project membership management is not enabled for this connection."}}):r.fulfill({json:membershipPreview()})});
 await expect(h.manager.getByRole("button",{name:"Retry loading",exact:true})).toBeVisible();await expect(h.manager).not.toContainText("Alex Morgan");
 await expect(h.manager.getByRole("button",{name:"Add Member",exact:true})).toHaveCount(0);
 fail=false;await h.manager.getByRole("button",{name:"Retry loading",exact:true}).click();await expect(h.manager.getByRole("row").filter({hasText:"Alex Morgan"})).toBeVisible();expect(h.writes).toEqual([]);
});
