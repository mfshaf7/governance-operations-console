import {test,expect} from '../support/filled-surface-layout.mjs';
import {environmentCatalog,environmentOperation} from '../support/environment-operations-ui-fixture.mjs';
import {governedProductsProjection} from '../support/governed-products-ui-fixture.mjs';
const base=process.env.CONSOLE_TEST_BASE_URL??'http://127.0.0.1:4317';if(new URL(base).port==='3317')throw Error('Use the isolated preview.');
test.setTimeout(90000);test.use({actionTimeout:10000,navigationTimeout:60000});
async function setup(page,{preview=false,older=false}={}){
 const writes=[],errors=[],queries=[];let offline=false;page.on('pageerror',e=>errors.push(String(e)));
 await page.addInitScript(()=>{window.__opened=[];window.open=url=>{window.__opened.push(url);return null;};});
 await page.route('**/api/**',route=>{const req=route.request(),url=new URL(req.url()),path=url.pathname;
 if(!['GET','HEAD','OPTIONS'].includes(req.method())){writes.push(path);return route.fulfill({status:503,json:{error:'Read-only inspection; command blocked'}});}
 if(path==='/api/console/capabilities')return route.fulfill({json:{artifactType:'console-runtime-capability-projection',schemaVersion:1,mode:preview?'disconnected-preview':'live',capabilities:[]}});
 if(path==='/api/environment-operations'){
  const count=older?url.searchParams.has('cursor')?1:10:0;
  const operations=Array.from({length:count},(_,i)=>environmentOperation('release-'+(url.searchParams.has('cursor')?10:i),{kind:'product-release',ref:'product:openclaw',action:'governed-release.execute-step'}));
  if(url.searchParams.has('cursor'))queries.push(url.searchParams.get('cursor'));
  return route.fulfill({json:preview?{mode:'disconnected-preview',status:'current',observedAt:new Date().toISOString()}:{mode:'live',status:'current',observedAt:new Date().toISOString(),catalog:environmentCatalog(),operations,historyPage:{workspace:'governed-releases',limit:10,total:older?11:0,snapshot:'sha256:'+'d'.repeat(64),next_cursor:older&&!url.searchParams.has('cursor')?'synthetic-next-page':null}}});
 }
 if(path==='/api/governed-products'){
  if(offline)return route.fulfill({status:503,json:{error:'Synthetic owner connection unavailable'}});
  const projection=governedProductsProjection(),m=url.searchParams.get('maturity');if(m&&m!=='all')projection.products=projection.products.filter(p=>p.maturity===m);projection.page.total=projection.products.length;
  return route.fulfill({json:{mode:'live',projection}});
 }
 return route.fulfill({status:503,json:{error:'Unrelated owner excluded'}});
 });
 await page.goto(base+'/?dev=1',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>{const e=document.querySelector('button[title="Governed Releases"]');return e&&Object.keys(e).some(k=>k.startsWith('__reactProps$'));},undefined,{timeout:60000});await page.locator('button[title="Governed Releases"]').click();const w=page.getByRole('dialog',{name:'Governed Releases',exact:true});await expect(w.getByRole('heading',{name:'Product Release Register',exact:true})).toBeVisible({timeout:30000});return {w,writes,errors,queries,setOffline:value=>offline=value};
}
for(const width of [1280,1700]){
 test(`Preview register and exact reviewed values stay readable at ${width}`,async({page})=>{
  await page.setViewportSize({width,height:width===1280?800:1000});const h=await setup(page,{preview:true});
  const header=h.w.getByRole('columnheader',{name:'Highest endpoint',exact:true});expect(await header.evaluate(e=>e.getBoundingClientRect().width)).toBeGreaterThan(100);
  await h.w.getByRole('button',{name:'Inspect openclaw',exact:true}).click();const d=page.getByRole('dialog',{name:'Product Dashboard',exact:true});await expect(d).toContainText('Design preview');
  for(const name of ['Overview','Release Path','Operations'])await d.getByRole('radio',{name,exact:true}).click();
  await d.getByRole('button',{name:'Open Workflow',exact:true}).click();const f=page.getByRole('dialog',{name:'Product Release Action',exact:true});await expect(f).toContainText('Design preview');await f.getByRole('textbox',{name:'Evidence reference',exact:true}).fill('inspection://visible-reviewed-value');await f.getByRole('button',{name:'Review Request',exact:true}).last().click();
  const value=f.getByText('inspection://visible-reviewed-value',{exact:true});await value.scrollIntoViewIfNeeded();const visibleHeight=await value.evaluate(el=>{let r=el.getBoundingClientRect(),top=r.top,bottom=r.bottom;for(let p=el.parentElement;p;p=p.parentElement){if(['auto','hidden','scroll','clip'].includes(getComputedStyle(p).overflowY)){const b=p.getBoundingClientRect();top=Math.max(top,b.top);bottom=Math.min(bottom,b.bottom);}}return bottom-top;});expect(visibleHeight).toBeGreaterThan(8);await expect(f.getByRole('button',{name:'Simulate Action',exact:true})).toBeVisible();await expect(f).toContainText('Not provided');await page.screenshot({path:test.info().outputPath('review-values-'+width+'.png')});expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
 });
 test(`Owner product register and protected routes preserve actual capability at ${width}`,async({page})=>{
  await page.setViewportSize({width,height:width===1280?800:1000});const h=await setup(page);await expect(h.w).toContainText('4 of 4 loaded');await expect(h.w.getByRole('button',{name:'Inspect console-todo-1275',exact:true})).toHaveCount(1);
  await h.w.getByRole('button',{name:'Inspect openclaw',exact:true}).click();const d=page.getByRole('dialog',{name:'Product Dashboard',exact:true});await expect(d).not.toContainText('Design preview');await expect(d).toContainText('Recorded production state');const ownerPanel=d.getByRole('heading',{name:'Protected workflows',exact:true}).locator('xpath=ancestor::section[1]');expect(await ownerPanel.evaluate(panel=>panel.getBoundingClientRect().top-panel.previousElementSibling.getBoundingClientRect().bottom)).toBeGreaterThanOrEqual(0);
  await d.getByRole('button',{name:'Promote approved candidate',exact:true}).click();expect(await page.evaluate(()=>window.__opened)).toEqual(['https://github.com/mfshaf7/platform-engineering/actions/workflows/promote-environment.yaml']);await expect(d.getByRole('button',{name:'Open Workflow',exact:true})).toHaveCount(0);
  for(const name of ['Overview','Release Path','Operations'])await d.getByRole('radio',{name,exact:true}).click();await page.screenshot({path:test.info().outputPath('owner-dashboard-'+width+'.png')});await d.getByRole('button',{name:'Back to Register',exact:true}).click();await h.w.getByRole('button',{name:'Inspect console-todo-1275',exact:true}).click();await expect(d).toContainText('no governed stage-to-production release path');await expect(d.getByRole('button',{name:'Promote approved candidate',exact:true})).toHaveCount(0);expect(h.writes).toEqual([]);expect(h.errors).toEqual([]);
 });
}
test('History loads older owner pages without unrelated global traffic hiding them',async({page})=>{
 const h=await setup(page,{older:true});await expect(h.w.getByRole('button',{name:/^Inspect operation /})).toHaveCount(10);await h.w.getByRole('button',{name:'Load older operations',exact:true}).click();await expect(h.w.getByRole('button',{name:/^Inspect operation /})).toHaveCount(11);expect(h.queries).toEqual(['synthetic-next-page']);expect(h.writes).toEqual([]);
});
test('Owner outage retains product facts and read-only protected-workflow navigation',async({page})=>{
 const h=await setup(page);h.setOffline(true);await h.w.getByRole('button',{name:'Refresh products',exact:true}).click();await expect(h.w).toContainText('Synthetic owner connection unavailable');await h.w.getByRole('button',{name:'Inspect openclaw',exact:true}).click();const d=page.getByRole('dialog',{name:'Product Dashboard',exact:true});await expect(d.getByRole('button',{name:'Promote approved candidate',exact:true})).toBeEnabled();await d.getByRole('button',{name:'Promote approved candidate',exact:true}).click();expect(await page.evaluate(()=>window.__opened)).toEqual(['https://github.com/mfshaf7/platform-engineering/actions/workflows/promote-environment.yaml']);await expect(d).toContainText('Retained Console source');expect(h.writes).toEqual([]);
});
