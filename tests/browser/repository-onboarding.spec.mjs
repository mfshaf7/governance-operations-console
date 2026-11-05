import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {workspaceRegistryFixture}=require('../../src/workspace-registry/fixtures/workspace-registry.fixture.ts');
const fixture=JSON.parse(execFileSync(process.execPath,['--experimental-strip-types','--disable-warning=MODULE_TYPELESS_PACKAGE_JSON','--input-type=module','-e',"import {repositoryUiFixture} from './tests/support/repository-ui-fixture.mjs';process.stdout.write(JSON.stringify(await repositoryUiFixture({proposalId:null})));"],{encoding:'utf8'}));
const base=process.env.CONSOLE_TEST_BASE_URL??'http://127.0.0.1:4317';
if(new URL(base).port==='3317')throw new Error('Use an isolated preview');
test.setTimeout(120000);test.use({viewport:{width:1700,height:1000},actionTimeout:15000});
async function setup(page,{active=false,registered=false,failSelection=false,inventoryPosture=null}={}){
 const f=structuredClone(fixture),registry=structuredClone(workspaceRegistryFixture),writes=[];
 if(!active&&!inventoryPosture)f.continuity.inventory=[];
 if(inventoryPosture)f.continuity.inventory=f.continuity.inventory.map(row=>({...row,posture:inventoryPosture,lifecycle:inventoryPosture}));
 registry.authority_revision=f.continuity.authority.revision;registry.eligible_promotions=[];
 registry.records=f.continuity.inventory.map(row=>({id:row.record_id,name:row.name,kind:row.kind,version:row.record_version,record_digest:row.record_digest,
  posture:row.posture,maturity:null,owner_refs:[row.name],lineage:row.lineage,last_mutation:{action:row.last_mutation.action,applied_at:row.last_mutation.applied_at,id:row.last_mutation.id,readiness_ref:row.last_mutation.readiness_ref,request_ref:row.last_mutation.request_ref}}));
 await page.route('**/api/**',route=>{const request=route.request(),url=new URL(request.url()),path=url.pathname;
  if(request.method()==='POST'){writes.push(path);return route.abort();}
  if(path==='/api/console/capabilities')return route.fulfill({json:f.capabilities});
  if(path==='/api/workspace-continuity')return route.fulfill({json:f.continuity});
  if(path==='/api/workspace-registry')return route.fulfill({json:registry});
  if(path==='/api/proposals')return route.fulfill({json:{mode:'live',status:'current',error:null,observedAt:new Date().toISOString(),records:[]}});
  if(path==='/api/repositories/custody/requests')return failSelection&&url.searchParams.has('provider_repository_id')?route.fulfill({status:503,json:{error:'Synthetic source unavailable'}}):route.fulfill({json:{schema_version:1,mode:'live',status:'current',error:null,records:[f.result],next_cursor:null}});
  if(path==='/api/workspace-registry/repository-status'){
   if(!registered)return route.fulfill({json:{schema_version:1,mode:'not-configured',projected_at:new Date().toISOString()}});
   const names=url.searchParams.getAll('name');return route.fulfill({json:{schema_version:1,mode:'current',authority:{kind:'internal-instance-record',instance_id:'synthetic'},record_ids:names.map(name=>`repo:${name}`),
    records:[{record_id:'repo:synthetic-source',version:2,record_digest:`sha256:${'b'.repeat(64)}`,phase:'intake',status:'admitted',provider_repository:{provider:'github',provider_repository_id:f.result.provider_readback.repository_identity.provider_repository_id,full_name:'synthetic-workspace/synthetic-source'}}],projected_at:new Date().toISOString(),projection_digest:`sha256:${'c'.repeat(64)}`}});
  }
  if(path==='/api/workspace-intake/requests')return route.fulfill({json:{schema_version:1,workflow_id:'workspace-intake',target:{kind:'repo',name:'synthetic-source',record_id:'repo:synthetic-source'},custody_request_id:f.result.request.request_id,revision:0,pending_request_count:0,updated_at:null,records:[],next_cursor:null}});
  return route.abort();
 });
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{const b=document.querySelector('button[title="Open REPOSITORY"]'),k=b&&Object.keys(b).find(k=>k.startsWith('__reactProps$'));return Boolean(k&&b[k].onClick)},null,{timeout:90000});
 return {writes,f};
}
async function openFromRepository(page){
 await page.locator('button[title="Open REPOSITORY"]').click();
 const repo=page.getByRole('dialog',{name:'Repository Control',exact:true});
 await expect(repo.getByRole('row').filter({hasText:'synthetic-source'})).toBeVisible({timeout:60000});
 await repo.getByRole('button',{name:'Continue onboarding in Registry',exact:true}).click();
 const onboarding=page.getByRole('dialog',{name:'Repository onboarding',exact:true});
 await expect(onboarding).toBeVisible({timeout:30000});return onboarding;
}
test('Repository Control opens Registry onboarding for the exact repository without a Product/Component choice',async({page},info)=>{
 const {writes}=await setup(page);const onboarding=await openFromRepository(page);
 await expect(page.getByRole('dialog',{name:'Workspace Registry',exact:true})).toBeVisible();
 await expect(onboarding.getByText('https://github.com/synthetic-workspace/synthetic-source',{exact:true})).toBeVisible();
 await expect(onboarding.getByRole('button',{name:'Registration type',exact:true})).toHaveCount(0);
 await onboarding.getByRole('button',{name:'Continue onboarding',exact:true}).click();
 const details=page.getByRole('dialog',{name:'Repository onboarding details',exact:true});
 await expect(details.getByText('synthetic-source',{exact:true})).toBeVisible();
 await expect(details.getByRole('textbox',{name:/provider.*id/i})).toHaveCount(0);
 await expect(details.getByRole('button',{name:'Review repository setup',exact:true})).toBeDisabled();
 await details.getByRole('button',{name:'Back to onboarding',exact:true}).click();
 await expect(onboarding.getByText('Not active',{exact:true})).toBeVisible();
 for(const width of [1280,1700]){
  await page.setViewportSize({width,height:1000});
  await onboarding.screenshot({path:info.outputPath(`repository-onboarding-${width}.png`)});
  const bounds=await onboarding.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(width+1);
 }
 expect(writes).toEqual([]);
});
test('Registry offers Repository as the default onboarding type and explains Product/Component separately',async({page})=>{
 const {writes}=await setup(page);
 await page.locator('button[title="Workspace Registry"]').click();
 const registry=page.getByRole('dialog',{name:'Workspace Registry',exact:true});
 await registry.getByRole('button',{name:'Onboard workspace item',exact:true}).click();
 const form=page.getByRole('dialog',{name:'Workspace onboarding',exact:true});
 await expect(form.getByRole('button',{name:'Registration type',exact:true})).toContainText('Repository');
 await expect(form.getByRole('textbox',{name:'Short name',exact:true})).toHaveCount(0);
 await form.getByRole('button',{name:'Continue repository onboarding',exact:true}).click();
 const onboarding=page.getByRole('dialog',{name:'Repository onboarding',exact:true});
 await onboarding.getByRole('button',{name:'Repository to onboard',exact:true}).click();
 await page.getByRole('option',{name:'https://github.com/synthetic-workspace/synthetic-source',exact:true}).click();
 await expect(onboarding.getByRole('button',{name:'Continue onboarding',exact:true})).toBeVisible();expect(writes).toEqual([]);
});
test('a verified creation receipt never becomes onboarding-ready when its current selection cannot be read',async({page})=>{
 const {writes}=await setup(page,{failSelection:true});const onboarding=await openFromRepository(page);
 await expect(onboarding.getByText('Unable to verify repository',{exact:true})).toBeVisible();
 await expect(onboarding.getByRole('button',{name:'Continue onboarding',exact:true})).toHaveCount(0);
 await expect(onboarding.getByText('Onboarding complete',{exact:true})).toHaveCount(0);
 expect(writes).toEqual([]);
});

test('an approved repository remains blocked from project use until activation and routes to the existing activation view',async({page})=>{
 await setup(page,{registered:true});const onboarding=await openFromRepository(page);
 await expect(onboarding.getByText('Approved',{exact:true})).toBeVisible();
 await expect(onboarding.getByText('Not active',{exact:true})).toBeVisible();
 await expect(onboarding.getByText('Onboarding complete',{exact:true})).toHaveCount(0);
 await onboarding.getByRole('button',{name:'Review activation',exact:true}).click();
 await expect(onboarding).toHaveCount(0);
 const registry=page.getByRole('dialog',{name:'Workspace Registry',exact:true});
 await expect(registry.getByRole('button',{name:/Eligible/})).toHaveAttribute('aria-current','page');
});

test('current active inventory completes onboarding without presenting another approval or setup action',async({page})=>{
 await setup(page,{active:true});
 await page.locator('button[title="Workspace Registry"]').click();
 await page.getByRole('dialog',{name:'Workspace Registry',exact:true}).getByRole('button',{name:'Onboard workspace item',exact:true}).click();
 await page.getByRole('dialog',{name:'Workspace onboarding',exact:true}).getByRole('button',{name:'Continue repository onboarding',exact:true}).click();
 const onboarding=page.getByRole('dialog',{name:'Repository onboarding',exact:true});
 await onboarding.getByRole('button',{name:'Repository to onboard',exact:true}).click();
 await page.getByRole('option',{name:'https://github.com/synthetic-workspace/synthetic-source',exact:true}).click();
 await expect(onboarding.getByText('Onboarding complete',{exact:true})).toBeVisible();
 await expect(onboarding.getByRole('button',{name:'Continue onboarding',exact:true})).toHaveCount(0);
 await expect(onboarding.getByRole('button',{name:'Review activation',exact:true})).toHaveCount(0);
});

for(const posture of ['suspended','retired'])test(`existing ${posture} Registry record directs lifecycle inspection rather than duplicate onboarding`,async({page})=>{
 await setup(page,{inventoryPosture:posture});
 await page.locator('button[title="Workspace Registry"]').click();
 await page.getByRole('dialog',{name:'Workspace Registry',exact:true}).getByRole('button',{name:'Onboard workspace item',exact:true}).click();
 await page.getByRole('dialog',{name:'Workspace onboarding',exact:true}).getByRole('button',{name:'Continue repository onboarding',exact:true}).click();
 const onboarding=page.getByRole('dialog',{name:'Repository onboarding',exact:true});
 await onboarding.getByRole('button',{name:'Repository to onboard',exact:true}).click();
 await page.getByRole('option',{name:'https://github.com/synthetic-workspace/synthetic-source',exact:true}).click();
 await expect(onboarding.getByText(`Repository ${posture}`,{exact:true})).toBeVisible();
 await expect(onboarding.getByRole('button',{name:'Continue onboarding',exact:true})).toHaveCount(0);
 await expect(onboarding.getByRole('button',{name:'Review activation',exact:true})).toHaveCount(0);
 await onboarding.getByRole('button',{name:'View existing Registry record',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Workspace Registry',exact:true}).getByRole('button',{name:/^01 Registry/})).toHaveAttribute('aria-current','page');
});
