import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';

// Synthetic UI conformance only: no GitHub operation or live acceptance.
const fixture=JSON.parse(execFileSync(process.execPath,['--experimental-strip-types','--disable-warning=MODULE_TYPELESS_PACKAGE_JSON','--input-type=module','-e',
 "import {repositoryUiFixture} from './tests/support/repository-ui-fixture.mjs';process.stdout.write(JSON.stringify(await repositoryUiFixture({proposalId:null})));"],{encoding:'utf8'}));
const base=process.env.CONSOLE_TEST_BASE_URL??'http://127.0.0.1:4317';
test.use({viewport:{width:1700,height:1000}});test.setTimeout(180000);
const ref={uri:'https://binding.test/account',digest:`sha256:${'a'.repeat(64)}`};
const account=(name,type,id)=>({id:`github:${name}`,account:name,account_id:id,account_type:type,
 capabilities:{metadata:true,provisioning:true,lifecycle:false},credential_bindings:{metadata:ref,provisioning:ref}});
const accounts=()=>({schema_version:1,default_connection_id:'github:example-company',connections:[account('example-personal','personal','11'),account('example-company','organization','22')]});

async function open(page,{connections=accounts(),failOnce=false,delay=null,registerResponder,waitForRecord=true}={}){
 const effects=[];let reads=0;
 await page.route('**/api/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname;
  if(!['GET','HEAD','OPTIONS'].includes(request.method())){effects.push(path);return route.abort();}
  if(path==='/api/console/capabilities')return route.fulfill({json:fixture.capabilities});
  if(path==='/api/workspace-continuity')return route.fulfill({json:fixture.continuity});
  if(path==='/api/proposals')return route.fulfill({json:{mode:'live',status:'current',error:null,observedAt:new Date().toISOString(),records:[]}});
  if(path==='/api/repositories/custody/connections'){
   reads++;if(delay)await delay;
   return failOnce&&reads===1?route.fulfill({status:503,json:{error:'Synthetic connection unavailable'}}):route.fulfill({json:connections});
  }
  if(path==='/api/repositories/custody/requests')return registerResponder ? registerResponder(route) : route.fulfill({json:{schema_version:1,mode:'live',status:'current',error:null,records:[fixture.result],next_cursor:null}});
  if(path==='/api/workspace-registry/repository-status')return route.fulfill({json:{schema_version:1,mode:'not-configured'}});
  return route.abort();
 });
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{const b=document.querySelector('button[title="Open REPOSITORY"]'),key=b&&Object.keys(b).find(k=>k.startsWith('__reactProps$'));return Boolean(key&&b[key].onClick);},null,{timeout:90000});
 await page.locator('button[title="Open REPOSITORY"]').click();
 const control=page.getByRole('dialog',{name:'Repository Control',exact:true});
 if(waitForRecord)await expect(control.getByRole('row').filter({hasText:'synthetic-source'})).toBeVisible({timeout:60000});
 return {control,effects,reads:()=>reads};
}

test('two destinations use the configured default and personal selection keeps visibility and alias understandable',async({page},info)=>{
 const h=await open(page);
 await expect(h.control.getByRole('row').filter({hasText:'synthetic-source'})).toContainText('Private');
 await h.control.getByRole('button',{name:'Create repository',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Create a repository',exact:true});
 await expect(dialog.getByRole('button',{name:'Create under',exact:true})).toContainText('example-company');
 await dialog.getByRole('button',{name:'Create under',exact:true}).click();
 await page.getByRole('option',{name:'example-personal · Personal',exact:true}).click();
 await dialog.getByRole('textbox',{name:'Repository name',exact:true}).fill('todo');
 await dialog.getByText('Workspace technical details',{exact:true}).click();
 await expect(dialog.getByRole('textbox',{name:'Workspace repository',exact:true})).toHaveValue('repo:example-personal--todo');
 await dialog.getByRole('button',{name:'Repository visibility',exact:true}).click();
 await expect(page.getByRole('option',{name:'Internal',exact:true})).toHaveCount(0);
 await page.getByRole('option',{name:'Private',exact:true}).click();
 await expect(dialog.getByRole('button',{name:'Create repository',exact:true})).toBeDisabled();
 await dialog.screenshot({path:info.outputPath('personal-account-form.png')});
 expect(h.effects).toEqual([]);
});

test('a single eligible account is automatic, with no redundant destination selector',async({page},info)=>{
 const connections=accounts();connections.connections.shift();
 const h=await open(page,{connections});
 await h.control.getByRole('button',{name:'Create repository',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Create a repository',exact:true});
 await expect(dialog.getByRole('textbox',{name:'Create under',exact:true})).toHaveValue('example-company · Organization');
 await expect(dialog.getByRole('textbox',{name:'Create under',exact:true})).toHaveAttribute('readonly','');
 await expect(dialog.getByRole('button',{name:'Create under',exact:true})).toHaveCount(0);
 await dialog.getByRole('textbox',{name:'Repository name',exact:true}).fill('todo');
 await dialog.getByText('Workspace technical details',{exact:true}).click();
 await expect(dialog.getByRole('textbox',{name:'Workspace repository',exact:true})).toHaveValue('repo:example-company--todo');
 await dialog.screenshot({path:info.outputPath('single-account-form.png')});
 expect(h.effects).toEqual([]);
});

test('unavailable connections show a local retry and never enable creation',async({page})=>{
 const h=await open(page,{failOnce:true});
 await h.control.getByRole('button',{name:'Create repository',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Create a repository',exact:true});
 await expect(dialog.getByRole('button',{name:'Retry connection',exact:true})).toBeVisible();
 await expect(dialog.getByRole('button',{name:'Create repository',exact:true})).toBeDisabled();
 await dialog.getByRole('button',{name:'Retry connection',exact:true}).click();
 await expect(dialog.getByRole('button',{name:'Create under',exact:true})).toContainText('example-company');
 await expect(dialog.getByRole('button',{name:'Retry connection',exact:true})).toHaveCount(0);
 expect(h.effects).toEqual([]);
});

test('the actual disconnected preview opens an editable sample form without enabling provider submission',async({page},info)=>{
 const effects=[];
 await page.route('**/api/**',route=>{
  const request=route.request();
  if(!['GET','HEAD','OPTIONS'].includes(request.method())){effects.push(request.url());return route.abort();}
  return route.continue();
 });
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{const b=document.querySelector('button[title="Open REPOSITORY"]'),key=b&&Object.keys(b).find(k=>k.startsWith('__reactProps$'));return Boolean(key&&b[key].onClick);},null,{timeout:90000});
 await page.locator('button[title="Open REPOSITORY"]').click();
 const control=page.getByRole('dialog',{name:'Repository Control',exact:true});
 await expect(control.getByRole('button',{name:'Create repository',exact:true})).toBeEnabled({timeout:30000});
 await control.getByRole('button',{name:'Create repository',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Create a repository',exact:true});
 await expect(dialog.getByText('These are sample GitHub accounts. You can edit this form; repository creation is disabled.',{exact:true})).toBeVisible();
 await expect(dialog.getByRole('button',{name:'Create under',exact:true})).toContainText('example-company');
 await dialog.getByRole('button',{name:'Create under',exact:true}).click();
 await page.getByRole('option',{name:'example-personal · Personal',exact:true}).click();
 await dialog.getByRole('textbox',{name:'Repository name',exact:true}).fill('todo');
 await dialog.getByRole('textbox',{name:'Repository purpose',exact:true}).fill('Review the personal account form.');
 await expect(dialog.getByRole('textbox',{name:'Workspace repository',exact:true})).toBeHidden();
 await expect(dialog.getByText('For one app, tool or documentation project with its own repository. Choose this for a typical new project.',{exact:true})).toBeVisible();
 await dialog.getByRole('button',{name:'Repository use',exact:true}).click();
 await expect(page.getByRole('option')).toHaveCount(2);
 await expect(page.getByRole('option',{name:'Externally maintained',exact:true})).toHaveCount(0);
 await page.getByRole('option',{name:'Shared — several projects',exact:true}).click();
 await expect(dialog.getByText(/For several projects or components maintained together in one repository/)).toBeVisible();
 await dialog.getByText('Workspace technical details',{exact:true}).click();
 await expect(dialog.getByRole('textbox',{name:'Workspace repository',exact:true})).toHaveValue('repo:example-personal--todo');
 await dialog.getByRole('button',{name:'Repository visibility',exact:true}).click();
 await expect(page.getByRole('option',{name:'Internal',exact:true})).toHaveCount(0);
 await page.getByRole('option',{name:'Private',exact:true}).click();
 await dialog.getByLabel('Confirm provider baseline review',{exact:true}).click();
 await dialog.getByRole('textbox',{name:'Provisioning approval note',exact:true}).fill('Review this sample without a provider operation.');
 await expect(dialog.getByRole('button',{name:'Create repository',exact:true})).toBeDisabled();
 await dialog.screenshot({path:info.outputPath('disconnected-editable-form.png')});
 expect(effects).toEqual([]);
});

const secondFixture=JSON.parse(execFileSync(process.execPath,['--experimental-strip-types','--disable-warning=MODULE_TYPELESS_PACKAGE_JSON','--input-type=module','-e',
 "import {repositoryUiFixture} from './tests/support/repository-ui-fixture.mjs';process.stdout.write(JSON.stringify(await repositoryUiFixture({proposalId:null,repositoryName:'older-source',providerRepositoryId:'777',workspaceName:'original-older-alias'})));"],{encoding:'utf8'}));
const ownerPage=(records,next_cursor=null)=>({schema_version:1,mode:'live',status:'current',error:null,records,next_cursor});

test('a failed register read is an error with retry, and the same page can recover',async({page})=>{
 let failed=true;
 const h=await open(page,{waitForRecord:false,registerResponder:route=>failed
  ?route.fulfill({status:503,json:{code:'repository_custody_oos_unavailable',retryable:true}})
  :route.fulfill({json:ownerPage([fixture.result])})});
 await expect(h.control.getByText('Repositories could not be loaded',{exact:true})).toBeVisible();
 await expect(h.control.getByText(/No repository records are available/)).toHaveCount(0);
 await expect(h.control.getByRole('button',{name:'Retry loading repositories',exact:true})).toBeVisible();
 failed=false;await h.control.getByRole('button',{name:'Retry loading repositories',exact:true}).click();
 await expect(h.control.getByRole('row').filter({hasText:'synthetic-source'})).toBeVisible();
 expect(h.effects).toEqual([]);
});

test('register pages load on demand, retain rows after a failed continuation, and expose further repositories',async({page},info)=>{
 const cursor='c'.repeat(64);let failContinuation=false;
 const h=await open(page,{registerResponder:route=>{
  const query=new URL(route.request().url()).searchParams;
  if(query.has('cursor'))return failContinuation?route.fulfill({status:503,json:{retryable:true}}):route.fulfill({json:ownerPage([secondFixture.result])});
  return route.fulfill({json:ownerPage([fixture.result],cursor)});
 }});
 failContinuation=true;
 await expect(h.control.getByText(/1 repositories loaded/)).toBeVisible();
 await h.control.getByRole('button',{name:'Load more repositories',exact:true}).click();
 await expect(h.control.getByRole('button',{name:'Retry loading repositories',exact:true})).toBeVisible();
 await expect(h.control.getByRole('row').filter({hasText:'synthetic-source'})).toBeVisible();
 failContinuation=false;await h.control.getByRole('button',{name:'Retry loading repositories',exact:true}).click();
 await expect(h.control.getByRole('row').filter({hasText:'older-source'})).toBeVisible();
 await expect(h.control.getByRole('button',{name:'Load more repositories',exact:true})).toHaveCount(0);
 await h.control.screenshot({path:info.outputPath('paged-register-recovered.png')});
 expect(h.effects).toEqual([]);
});

test('linking checks older repository custody independently of the visible page and preserves its alias',async({page})=>{
 const h=await open(page,{registerResponder:route=>{
  const query=new URL(route.request().url()).searchParams;
  return route.fulfill({json:ownerPage(query.get('provider_repository_id')==='777'?[secondFixture.result]:[fixture.result])});
 }});
 await page.route('**/api/repositories/custody/provider-repository?*',route=>route.fulfill({json:{schema_version:1,provider:'github',provider_host:'github.com',provider_repository_id:'777',owner:'synthetic-workspace',name:'older-source',canonical_url:'https://github.com/synthetic-workspace/older-source',visibility:'private',provider_lifecycle_state:'active',observed_at:new Date().toISOString()}}));
 await h.control.getByRole('button',{name:'Link existing repository',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Link existing repository',exact:true});
 await dialog.getByRole('textbox',{name:'GitHub repository URL',exact:true}).fill('https://github.com/synthetic-workspace/older-source');
 await dialog.getByRole('button',{name:'Check repository',exact:true}).click();
 await expect(dialog.getByText('Already in Repository Control',{exact:true})).toBeVisible();
 await expect(dialog.getByRole('button',{name:'Open repository',exact:true})).toBeVisible();
 await expect(dialog.getByRole('button',{name:'Verify and link repository',exact:true})).toHaveCount(0);
 expect(h.effects).toEqual([]);
});

test('linking new source explains its use and checks a custom identifier while keeping the ordinary form automatic',async({page},info)=>{
 const h=await open(page,{registerResponder:route=>{
  const query=new URL(route.request().url()).searchParams;
  return route.fulfill({json:ownerPage(query.has('provider_repository_id')?[]:[fixture.result])});
 }});
 await page.route('**/api/repositories/custody/provider-repository?*',route=>route.fulfill({json:{schema_version:1,provider:'github',provider_host:'github.com',provider_repository_id:'888',owner:'synthetic-workspace',name:'new-source',canonical_url:'https://github.com/synthetic-workspace/new-source',visibility:'private',provider_lifecycle_state:'active',observed_at:new Date().toISOString()}}));
 await h.control.getByRole('button',{name:'Link existing repository',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Link existing repository',exact:true});
 await dialog.getByRole('textbox',{name:'GitHub repository URL',exact:true}).fill('https://github.com/synthetic-workspace/new-source');
 await dialog.getByRole('button',{name:'Check repository',exact:true}).click();
 await dialog.getByRole('button',{name:'Repository use',exact:true}).click();
 await expect(page.getByRole('option')).toHaveCount(2);
 await expect(page.getByRole('option',{name:'Studio-owned source',exact:true})).toHaveCount(0);
 await expect(page.getByRole('option',{name:'Externally maintained',exact:true})).toHaveCount(0);
 await page.getByRole('option',{name:'Shared — several projects',exact:true}).click();
 await expect(dialog.getByRole('textbox',{name:'Workspace repository',exact:true})).toBeHidden();
 await dialog.getByRole('textbox',{name:'Link approval',exact:true}).fill('Link this exact repository for the workspace.');
 await expect(dialog.getByRole('button',{name:'Verify and link repository',exact:true})).toBeEnabled();
 await dialog.getByText('Workspace technical details',{exact:true}).click();
 const identifier=dialog.getByRole('textbox',{name:'Workspace repository',exact:true});
 await expect(identifier).toHaveValue('repo:synthetic-workspace--new-source');
 await identifier.fill('invalid');
 await expect(identifier).toHaveAttribute('aria-invalid','true');
 await expect(dialog.getByRole('button',{name:'Verify and link repository',exact:true})).toBeDisabled();
 await identifier.fill('repo:my-alias');
 await expect(dialog.getByRole('button',{name:'Verify and link repository',exact:true})).toBeEnabled();
 await dialog.screenshot({path:info.outputPath('link-guidance.png')});
 expect(h.effects).toEqual([]);
});

test('the disconnected link preview uses labeled sample source and cannot check GitHub or submit',async({page},info)=>{
 const effects=[],lookups=[];
 await page.route('**/api/**',route=>{
  const request=route.request();
  if(!['GET','HEAD','OPTIONS'].includes(request.method())){effects.push(request.url());return route.abort();}
  if(new URL(request.url()).pathname==='/api/repositories/custody/provider-repository')lookups.push(request.url());
  return route.continue();
 });
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{const b=document.querySelector('button[title="Open REPOSITORY"]'),key=b&&Object.keys(b).find(k=>k.startsWith('__reactProps$'));return Boolean(key&&b[key].onClick);},null,{timeout:90000});
 await page.locator('button[title="Open REPOSITORY"]').click();
 await page.getByRole('dialog',{name:'Repository Control',exact:true}).getByRole('button',{name:'Link existing repository',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Link existing repository',exact:true});
 await expect(dialog.getByText('This is a sample repository. You can review the form; GitHub lookup and linking are disabled.',{exact:true})).toBeVisible();
 await expect(dialog.getByRole('textbox',{name:'GitHub repository URL',exact:true})).toHaveAttribute('readonly','');
 await expect(dialog.getByRole('button',{name:'Check repository',exact:true})).toBeDisabled();
 await dialog.getByRole('button',{name:'Repository use',exact:true}).click();
 await expect(page.getByRole('option')).toHaveCount(2);
 await expect(page.getByRole('option',{name:'Studio-owned source',exact:true})).toHaveCount(0);
 await expect(page.getByRole('option',{name:'Externally maintained',exact:true})).toHaveCount(0);
 await dialog.screenshot({path:info.outputPath('link-repository-use-options.png')});
 await page.getByRole('option',{name:'Shared — several projects',exact:true}).click();
 await expect(dialog.getByText(/For several projects or components maintained together/)).toBeVisible();
 await dialog.getByRole('textbox',{name:'Link approval',exact:true}).fill('Review the sample link form without any provider access.');
 await expect(dialog.getByRole('button',{name:'Verify and link repository',exact:true})).toBeDisabled();
 await dialog.screenshot({path:info.outputPath('disconnected-link-form.png')});
 expect(effects).toEqual([]);expect(lookups).toEqual([]);
});
