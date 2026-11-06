import {test,expect} from '../support/filled-surface-layout.mjs';
const base=process.env.CONSOLE_TEST_BASE_URL??'http://127.0.0.1:4317';
if(new URL(base).port==='3317')throw Error('Use isolated preview only.');
test.setTimeout(90000);test.use({actionTimeout:15000});
for(const width of [1280,1700])test(`repository onboarding sample uses the existing form and review without onboarding owner calls at ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:width===1280?800:1000});
 const writes=[],ownerCalls=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',route=>{const req=route.request(),path=new URL(req.url()).pathname;
  if(!['GET','HEAD','OPTIONS'].includes(req.method())){writes.push(path);return route.abort();}
  if(path.startsWith('/api/workspace-intake')||path.startsWith('/api/repositories/custody')||path.startsWith('/api/workspace-registry/lifecycle'))ownerCalls.push(path);
  return route.continue();
 });
 await page.goto(base+'/?dev=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{const n=document.querySelector('button[title="Workspace Registry"]');return n&&Object.keys(n).some(k=>k.startsWith('__reactProps$'));},undefined,{timeout:60000});
 await page.locator('button[title="Workspace Registry"]').click();
 await page.getByRole('dialog',{name:'Workspace Registry',exact:true}).getByRole('button',{name:'Onboard workspace item',exact:true}).click();
 // The main shell independently reads repository metadata for workspace context.
 // Opening and exercising the sample must add no onboarding/custody owner reads.
 const readsBeforeExample=ownerCalls.length;
 await page.getByRole('dialog',{name:'Workspace onboarding',exact:true}).getByRole('button',{name:'Continue repository onboarding',exact:true}).click();
 const form=page.getByRole('dialog',{name:'Repository onboarding details',exact:true});
 await expect(form).toContainText('Design preview');await expect(form).toContainText('sample-notes-app');
 const purpose=form.getByRole('textbox',{name:'What does this repository own?',exact:true});
 await expect(purpose).toHaveValue(/small notes application/);await purpose.fill('Sample notes application source and documentation; hosting is managed separately.');
 await form.screenshot({path:info.outputPath('sample-onboarding-form.png')});
 await form.getByRole('button',{name:'Preview onboarding review',exact:true}).click();
 const review=page.getByRole('dialog',{name:'Review repository onboarding',exact:true});
 await expect(review).toContainText('No canonical checks have run');
 await review.getByRole('radio',{name:'Record for setup and review',exact:true}).click();
 await review.getByRole('button',{name:'Confirm onboarding review',exact:true}).click();
 await expect(review.getByRole('button',{name:'Submit onboarding decision',exact:true})).toBeDisabled();
 await expect(review).toContainText('Sample notes application source and documentation; hosting is managed separately.');
 await review.screenshot({path:info.outputPath('sample-onboarding-review.png')});
 await review.getByRole('button',{name:'Back to onboarding details',exact:true}).click();
 await page.getByRole('alertdialog',{name:'Discard Classification Draft?',exact:true}).getByRole('button',{name:'Discard Draft',exact:true}).click();
 await expect(purpose).toHaveValue('Sample notes application source and documentation; hosting is managed separately.');
 expect(writes).toEqual([]);expect(ownerCalls.slice(readsBeforeExample)).toEqual([]);expect(errors).toEqual([]);
});
