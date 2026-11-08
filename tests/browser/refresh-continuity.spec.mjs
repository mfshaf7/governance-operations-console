import {test, expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {environmentCatalog, ownerProfileProjection} from '../support/environment-operations-ui-fixture.mjs';

const base = process.env.CONSOLE_TEST_BASE_URL ?? 'http://127.0.0.1:4317';
if (new URL(base).port === '3317') throw Error('Use the isolated preview.');
test.use({viewport:{width:1700,height:1000},actionTimeout:15000,navigationTimeout:90000});
test.setTimeout(120000);
const model = JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types','--disable-warning=MODULE_TYPELESS_PACKAGE_JSON','--input-type=module','-e', `
import {modelRuntimePreviewRegistry} from './src/domain-workspaces/model-operations/read-model/fixtures/model-runtime.fixture.ts';
import {projectLiveModelOperationsReadModel} from './src/domain-workspaces/model-operations/live-runtime/model-operations-live-projection.ts';
const digest='sha256:'+'a'.repeat(64);
const readModel=projectLiveModelOperationsReadModel({
  sourceProjection: {
    source: {source_version:'a'.repeat(40)}, digest,
    profiles:[{profile_id:'sample-navigation-v1',lifecycle:'active',purpose:'planning',allowed_callers:['sample/planning'],selected_environments:['dev-integration'],activation:{activation_allowed:true,reason:'Synthetic policy'},security_review_ref:{uri:'review://sample',digest}}]
  }
});
process.stdout.write(JSON.stringify({registry:modelRuntimePreviewRegistry(),readModel}));
`], {encoding:'utf8'}));

async function isolate(page, read = async () => false, preview = false) {
  const writes = [], errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/api/**', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname;
    if (!['GET','HEAD','OPTIONS'].includes(request.method())) {
      writes.push(path); return route.fulfill({status:503,json:{error:'Test commands are blocked'}});
    }
    if (path === '/api/console/capabilities') return route.fulfill({json:{artifactType:'console-runtime-capability-projection',schemaVersion:1,mode:preview?'disconnected-preview':'live',capabilities:[]}});
    if (await read(route, path, url)) return;
    return route.fulfill({status:503,json:{mode:'live',status:'offline',error:'Unrelated test source unavailable'}});
  });
  await page.goto(base, {waitUntil:'domcontentloaded'});
  await page.waitForFunction(() => {
    const button = document.querySelector('button[title="Open PROPOSAL"]');
    return button && Object.keys(button).some(key => key.startsWith('__reactProps$'));
  });
  return {writes,errors};
}

async function open(page, title) {
  for (let i=0; i<3 && await page.getByRole('dialog').count(); i++) {
    await page.getByRole('dialog').last().getByRole('button',{name:/^Close (?:modal|dialog)$/}).first().click();
  }
  await page.locator(`button[title="${title}"]`).click();
  const dialog = page.getByRole('dialog').first();
  await expect(dialog).toBeVisible(); return dialog;
}

test('same-scope automatic profile refresh keeps rows, focus and navigation usable', async ({page}) => {
  await page.clock.install();
  let hold = false, calls = 0, release;
  const gate = new Promise(resolve => { release=resolve; }), pending = [];
  const projection = ownerProfileProjection();
  const h = await isolate(page, async (route,path) => {
    if (path === '/api/environment-operations') {
      await route.fulfill({json:{mode:'live',status:'current',observedAt:new Date().toISOString(),catalog:environmentCatalog(),operations:[]}}); return true;
    }
    if (path === '/api/dev-integration/profiles') {
      calls++;
      if (hold) { const wait=gate.then(()=>undefined); pending.push(wait); await wait; }
      await route.fulfill({json:{mode:'live',projection:{...projection,observed_at:new Date().toISOString()}}}); return true;
    }
    if (path === '/api/dev-integration/requests') {
      await route.fulfill({json:{schema_version:1,requests:[],page:{offset:0,limit:25,total:0,next_offset:null}}}); return true;
    }
    return false;
  });
  try {
    const d = await open(page,'Dev Integration');
    await expect(d.locator('tbody tr')).toHaveCount(projection.profiles.length);
    const before=calls, search=d.getByRole('searchbox').first();
    await search.focus(); hold=true;
    await page.clock.fastForward(31000);
    await expect.poll(()=>calls).toBeGreaterThan(before);
    await expect(d.locator('tbody tr')).toHaveCount(projection.profiles.length);
    await expect(d.getByText('Loading matching profiles…',{exact:true})).toHaveCount(0);
    await expect(search).toBeFocused();
    await expect(d.getByRole('navigation',{name:'Dev Integration profiles pages',exact:true}).getByRole('status')).toContainText('Showing');
    expect(h.errors).toEqual([]); expect(h.writes).toEqual([]);
  } finally {release(); await Promise.allSettled(pending);}
});

test('Model tab return keeps routing rows while revalidating and restores both searches', async ({page}) => {
  await page.clock.install();
  let held=false, reads=0, release;
  const gate=new Promise(resolve=>{release=resolve;}), active=[];
  const h=await isolate(page,async(route,path)=>{
    if(path==='/api/model-operations') {await route.fulfill({json:{mode:'live',status:'current',observedAt:new Date().toISOString(),requests:[],source:{authority:'platform-engineering'},readModel:model.readModel}});return true;}
    if(path==='/api/model-operations/runtime/registry') {
      reads++;
      const job=(async()=>{if(held)await gate;await route.fulfill({json:model.registry});})();active.push(job);await job;return true;
    }
    if(path==='/api/model-operations/runtime/requests') {await route.fulfill({json:{requests:[],next_cursor:null}});return true;}
    return false;
  });
  try {
    const d=await open(page,'Open MODEL');
    const profiles=d.getByRole('searchbox',{name:'Search model profiles'});
    await profiles.fill('sample');
    await d.getByText('Models & routing',{exact:true}).first().click();
    await expect(d.locator('tbody tr')).not.toHaveCount(0);
    await d.getByRole('searchbox',{name:'Search workflows'}).fill('System default');
    await expect(d.locator('tbody tr')).toHaveCount(1);
    await d.getByText('Purpose profiles',{exact:true}).first().click();
    await expect(profiles).toHaveValue('sample');
    const pausedReads=reads;
    await page.clock.fastForward(16000);
    expect(reads).toBe(pausedReads);
    const before=reads;held=true;
    await d.getByText('Models & routing',{exact:true}).first().click();
    await expect.poll(()=>reads).toBeGreaterThan(before);
    await expect(d.getByRole('searchbox',{name:'Search workflows'})).toHaveValue('System default');
    await expect(d.locator('tbody tr')).toHaveCount(1);
    await expect(d.getByText('Loading models and routing…',{exact:true})).toHaveCount(0);
    await expect(d.getByText('Last known settings',{exact:true})).toBeVisible();
    expect(h.errors).toEqual([]);expect(h.writes).toEqual([]);
  } finally {release();await Promise.allSettled(active);}
});

test('returning profile rows stay visible but cannot enable requests before source revalidation', async ({page}) => {
  let held=false,reads=0,release;
  const gate=new Promise(resolve=>{release=resolve;}), active=[];
  const h=await isolate(page,async(route,path)=>{
    if(path==='/api/model-operations') {
      reads++;
      const job=(async()=>{if(held)await gate;await route.fulfill({json:{mode:'live',status:'current',observedAt:new Date().toISOString(),requests:[],source:{authority:'platform-engineering'},readModel:model.readModel}});})();
      active.push(job);await job;return true;
    }
    if(path==='/api/model-operations/runtime/registry'){await route.fulfill({json:model.registry});return true;}
    if(path==='/api/model-operations/runtime/requests'){await route.fulfill({json:{requests:[],next_cursor:null}});return true;}
    return false;
  });
  try {
    const d=await open(page,'Open MODEL');
    await expect(d.locator('tbody tr')).toHaveCount(1);
    await expect(d.getByRole('button',{name:'Request Profile',exact:true})).toBeEnabled();
    await d.getByText('Models & routing',{exact:true}).first().click();
    await expect(d.getByRole('searchbox',{name:'Search workflows'})).toBeVisible();
    const before=reads;held=true;
    await d.getByText('Purpose profiles',{exact:true}).first().click();
    await expect.poll(()=>reads).toBeGreaterThan(before);
    await expect(d.locator('tbody tr')).toHaveCount(1);
    await expect(d.getByRole('heading',{name:'Checking profile source',exact:true})).toBeVisible();
    await expect(d.getByRole('heading',{name:'Request path is unavailable',exact:true})).toHaveCount(0);
    await expect(d.getByRole('button',{name:'Request Profile',exact:true})).toBeDisabled();
    release();await Promise.allSettled(active);
    await expect(d.getByRole('button',{name:'Request Profile',exact:true})).toBeEnabled();
    expect(h.errors).toEqual([]);expect(h.writes).toEqual([]);
  } finally {release();await Promise.allSettled(active);}
});

for (const destination of ['PROPOSAL','REPOSITORY','PROTOTYPE','MODEL','PORTFOLIO']) {
  test(`${destination} retains its search after leaving, without retaining a hidden workspace`, async ({page}) => {
    const h=await isolate(page, undefined, true);
    let d=await open(page,`Open ${destination}`);
    const search=d.getByRole('searchbox').first();
    await expect(search).toBeVisible();await search.fill('navigation-check');
    await open(page,destination==='PROPOSAL'?'Open REPOSITORY':'Open PROPOSAL');
    d=await open(page,`Open ${destination}`);
    await expect(d.getByRole('searchbox').first()).toHaveValue('navigation-check');
    await expect(page.getByRole('dialog')).toHaveCount(1);
    expect(h.errors).toEqual([]);expect(h.writes).toEqual([]);
  });
}

for (const [destination, attribute, section] of [
  ['DELIVERY','data-delivery-workspace-section','work-design'],
  ['ORCHESTRATION','data-orchestration-workspace-section','runs'],
]) {
  test(`${destination} restores its selected workspace page after returning`, async ({page}) => {
    const h=await isolate(page, async(route,path)=>{
      if(path==='/api/orchestration') {
        await route.fulfill({json:{mode:'disconnected-preview',observedAt:new Date().toISOString()}});return true;
      }
      return false;
    }, true);
    let d=await open(page,`Open ${destination}`);
    await d.locator(`[${attribute}="${section}"]`).click();
    await expect(d.locator(`[${attribute}="${section}"]`)).toHaveAttribute('aria-current','page');
    await open(page,'Open PROPOSAL');d=await open(page,`Open ${destination}`);
    await expect(d.locator(`[${attribute}="${section}"]`)).toHaveAttribute('aria-current','page');
    expect(h.errors).toEqual([]);expect(h.writes).toEqual([]);
  });
}
