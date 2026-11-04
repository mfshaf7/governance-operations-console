import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {providerLookupFor} from '../support/repository-history-fixture.mjs';
const fixtures=JSON.parse(execFileSync(process.execPath,['--experimental-strip-types','--disable-warning=MODULE_TYPELESS_PACKAGE_JSON','--input-type=module','-e',
  "import {repositoryUiFixture} from './tests/support/repository-ui-fixture.mjs';process.stdout.write(JSON.stringify({public:await repositoryUiFixture({proposalId:null,visibility:'public'}),private:await repositoryUiFixture({proposalId:null})}));"],{encoding:'utf8'}));
const base=process.env.CONSOLE_TEST_BASE_URL??'http://127.0.0.1:4317';
test.use({viewport:{width:1700,height:1000}});test.setTimeout(90000);
const profile={schema_version:1,profile_id:'synthetic-source-controls',owner_repo:'synthetic-source',commands:[],application_verification:{mode:'unconfigured',manual_checks:[]}};
const pendingRequest={operation:'bootstrap',requestId:'bootstrap-request:retained-synthetic',ownerRepo:'synthetic-source',state:'existing-controls-inspected',revision:'2026-10-19T01:01:00.000Z',sourceRevision:null,
  sourceStartDigest:'sha256:'+'1'.repeat(64),sessionId:null,sourceIntentRef:null,nextAction:'owner-bootstrap-existing-checkout-recovery-required',draft:null,sourceDelivery:{},
  existingCheckout:{state:'applying',command:{command_id:'original-command'}},cancellation:null};

async function open(page,{visibility='public',eligibility='ready',pending=false}={}) {
  const f=structuredClone(fixtures[visibility]),calls=[],effects=[];
  let release;const gate=eligibility==='delayed'?new Promise(resolve=>{release=resolve;}):Promise.resolve();
  let failed=eligibility==='transient';
  await page.route('**/api/**',async route=>{
    const q=route.request(),path=new URL(q.url()).pathname;
    if(path==='/api/console/capabilities')return route.fulfill({json:f.capabilities});
    if(path==='/api/workspace-continuity')return route.fulfill({json:f.continuity});
    if(path==='/api/proposals')return route.fulfill({json:{mode:'live',status:'current',records:[],error:null,observedAt:new Date().toISOString()}});
    if(path==='/api/repositories/custody/requests')return route.fulfill({json:{schema_version:1,mode:'live',status:'current',error:null,records:[f.result],next_cursor:null}});
    if(path==='/api/repositories/custody/provider-repository')return route.fulfill({json:providerLookupFor(f.result)});
    if(path==='/api/repository-owner-bootstrap/requests'&&q.method()==='GET')return route.fulfill({json:{mode:'live',error:null,projection:{records:[],pendingRequest:pending?pendingRequest:null}}});
    if(path.endsWith('/bootstrap-request%3Aretained-synthetic')&&q.method()==='GET')return route.fulfill({json:{mode:'live',error:null,projection:pendingRequest}});
    if(path==='/api/repository-owner-bootstrap/preparations') {
      calls.push(q.postDataJSON());await gate;
      if(eligibility==='denied')return route.fulfill({status:409,json:{mode:'live',projection:null,error:'Synthetic owner scope not eligible.'}});
      if(failed){failed=false;return route.fulfill({status:503,json:{mode:'live',projection:null,error:'Synthetic temporary owner failure.'}});}
      return route.fulfill({json:{mode:'live',error:null,projection:{existing_owner_controls:{evidence_profile:profile}}}});
    }
    if(!['GET','HEAD','OPTIONS'].includes(q.method()))effects.push({path,body:q.postDataJSON()});
    return route.abort();
  });
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>{const b=document.querySelector('button[title="Open REPOSITORY"]'),k=b&&Object.keys(b).find(k=>k.startsWith('__reactProps$'));return Boolean(k&&b[k].onClick);});
  await page.locator('button[title="Open REPOSITORY"]').click();
  const control=page.getByRole('dialog',{name:'Repository Control',exact:true});
  await expect(control.getByRole('row').filter({hasText:'synthetic-source'})).toBeVisible();
  return {control,calls,effects,release};
}

test('Creation discloses the private setup limit before submission and never changes visibility automatically',async({page},info)=>{
  const h=await open(page);
  await h.control.getByRole('button',{name:'Create repository',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Create a repository',exact:true});
  await expect(dialog.getByRole('button',{name:'Repository visibility',exact:true})).toContainText('Private');
  await expect(dialog.getByRole('heading',{name:'Private-source setup is not available yet',exact:true})).toBeVisible();
  await expect(dialog).toContainText('Creation and linking preserve the chosen visibility.');
  await dialog.screenshot({path:info.outputPath('private-creation.png')});
  await dialog.getByRole('button',{name:'Repository visibility',exact:true}).click();
  await page.getByRole('option',{name:'Public',exact:true}).click();
  await expect(dialog.getByRole('heading',{name:'Current repository setup scope',exact:true})).toBeVisible();
  await expect(dialog.getByRole('heading',{name:'Private-source setup is not available yet',exact:true})).toHaveCount(0);
  expect(h.effects).toEqual([]);expect(h.calls).toEqual([]);
});

test('Linking a private repository shows its setup scope after lookup without changing its visibility',async({page})=>{
  const h=await open(page,{visibility:'private'});
  await h.control.getByRole('button',{name:'Link existing repository',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Link existing repository',exact:true});
  await dialog.getByRole('textbox',{name:'GitHub repository URL',exact:true}).fill(fixtures.private.result.provider_readback.canonical_url);
  await dialog.getByRole('button',{name:'Check repository',exact:true}).click();
  await expect(dialog.getByRole('heading',{name:'Private-source setup is not available yet',exact:true})).toBeVisible();
  await expect(dialog.getByText('private',{exact:true})).toBeVisible();
  expect(h.effects).toEqual([]);
});

for(const eligibility of ['ready','denied','transient','delayed'])test(`Application verification checks owner eligibility before editing (${eligibility})`,async({page},info)=>{
  const h=await open(page,{eligibility});
  await h.control.getByRole('button',{name:'Application verification',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Application verification',exact:true});
  if(eligibility==='delayed') {
    await expect(dialog.getByText('Checking verification eligibility…',{exact:true})).toBeVisible();
    await expect(dialog.getByRole('textbox',{name:'Check 1: action',exact:true})).toHaveCount(0);h.release();
  }
  if(eligibility==='denied'||eligibility==='transient') {
    await expect(dialog.getByText('Application verification unavailable',{exact:true})).toBeVisible();
    await expect(dialog.getByRole('textbox',{name:'Check 1: action',exact:true})).toHaveCount(0);
    await expect(dialog.getByRole('button',{name:'Review verification change',exact:true})).toHaveCount(0);
    if(eligibility==='denied')await expect(dialog.getByRole('button',{name:'Retry eligibility check',exact:true})).toHaveCount(0);
    else await dialog.getByRole('button',{name:'Retry eligibility check',exact:true}).click();
  }
  if(eligibility!=='denied') {
    await expect(dialog.getByRole('textbox',{name:'Check 1: action',exact:true})).toBeVisible();
    await expect(dialog.getByRole('button',{name:'Review verification change',exact:true})).toBeDisabled();
    await dialog.getByRole('textbox',{name:'Check 1: action',exact:true}).fill('Open the page and add an item.');
    await dialog.getByRole('textbox',{name:'Expected result',exact:true}).fill('The item appears in the list.');
    await expect(dialog.getByRole('button',{name:'Review verification change',exact:true})).toBeEnabled();
    await dialog.screenshot({path:info.outputPath('verification-eligible.png')});
  }
  expect(h.calls).toHaveLength(eligibility==='transient'?2:1);
  expect(h.calls[0]).toMatchObject({operation:'configure-verification',evidenceProfile:null,withCi:false,applicationMarkers:[]});
  expect(h.effects).toEqual([]);
});

test('An original pending setup resumes without creating a verification preparation or replacement request',async({page})=>{
  const h=await open(page,{pending:true});
  await h.control.getByRole('button',{name:'Application verification',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Application verification',exact:true});
  await expect(dialog.getByText('Selected request',{exact:true})).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Recover original owner checkout',exact:true})).toBeVisible();
  await expect(dialog.getByRole('textbox',{name:'Check 1: action',exact:true})).toHaveCount(0);
  expect(h.calls).toEqual([]);expect(h.effects).toEqual([]);
});
