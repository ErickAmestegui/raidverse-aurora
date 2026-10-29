// Interactive checkpoint QA against the existing SYNTHETIC workspace.
// Preserves its original artifact ID/seed/history; appends labeled rehearsal events.
// Requires an explicitly entered rehearsal session and NOVA's active artifact.
async (page) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const state = () => page.evaluate(async () => (await fetch('/api/snapshot')).json());
  const navigate = async label => { const mobile = page.viewportSize().width <= 600; await page.getByRole('navigation', { name: mobile ? 'Mobile navigation' : 'Main navigation', exact: true }).getByRole('button', { name: label, exact: true }).click(); };
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.getByRole('button', { name: 'N NOVA DEMO', exact: true }).click();
  await navigate('Home');
  const before = (await state()).artifacts.find(a => a.ownerId === 'rehearsal-b');
  if (!before || before.mode !== 'REHEARSAL') throw new Error('This QA checkpoint requires NOVA’s synthetic artifact; never run against LIVE.');
  await page.getByRole('button', { name: 'Edit artifact name', exact: true }).click();
  await page.getByRole('textbox', { name: 'Edit artifact name', exact: true }).fill('Aether Aurora');
  await page.getByRole('button', { name: 'Save artifact name' }).click();
  await page.getByRole('heading', { name: 'Aether Aurora', exact: true }).waitFor();
  const renamed = (await state()).artifacts.find(a => a.id === before.id);
  if (renamed.seed !== before.seed || renamed.history.length !== before.history.length + 1) throw new Error('Rename lost identity/history');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Copy !forge light', exact: true }).click();
  if (await page.evaluate(() => navigator.clipboard.readText()) !== '!forge light') throw new Error('Command clipboard failed');
  if (!await page.locator('.demo-panel').count()) await page.getByRole('button', { name: 'Try Demo', exact: true }).click();
  if (!['EVOLVING','FORGING'].includes(renamed.phase)) await page.getByRole('button', { name: /Start evolving|Continue evolving/ }).click();
  const expected = { ...renamed.energy };
  for (const [i,element] of ['light','fire','storm','crystal'].entries()) {
    await page.getByRole('combobox', { name: 'Simulated viewer' }).selectOption(String(i+5));
    await page.locator('.demo-panel').getByRole('button', { name: new RegExp(`^${element}$`, 'i') }).click();
    expected[element]++;
    await page.waitForFunction(({id,e,value}) => fetch('/api/snapshot').then(r=>r.json()).then(s=>s.artifacts.find(a=>a.id===id).energy[e]===value), { id:before.id,e:element,value:expected[element] });
  }
  await page.getByRole('button', { name: 'Try Demo', exact: true }).click();
  await page.getByRole('button', { name: 'Finish this round', exact: true }).click();
  await navigate('Transfers');
  await page.getByRole('combobox', { name: 'Receiving community' }).selectOption('rehearsal-a');
  await page.getByRole('button', { name: 'Prepare transfer', exact: true }).click();
  await page.getByText('Prepared · waiting for raid', { exact: true }).waitFor();
  await page.screenshot({ path:'output/playwright/aurora-transfer-prepared.png' });
  await page.getByRole('button', { name: 'Simulate raid', exact: true }).click();
  await page.getByRole('button', { name: 'Accept & open portal', exact: true }).waitFor();
  const pending = (await state()).artifacts.find(a=>a.id===before.id);
  if(pending.ownerId!=='rehearsal-b') throw new Error('Artifact transferred before acceptance');
  await page.screenshot({ path:'output/playwright/aurora-transfer-invitation.png' });
  await page.getByRole('button', { name: 'Accept & open portal', exact: true }).click();
  await navigate('Home');
  await page.getByRole('heading', { name: 'Aether Aurora', exact: true }).waitFor();
  await page.screenshot({ path:'output/playwright/aurora-portal-1080.png' });
  await page.getByRole('button', { name: 'Continue evolving', exact: true }).click();
  // Validate the receiver's evolution in its own new round with a synthetic viewer.
  await page.getByRole('button', { name: 'Try Demo', exact: true }).click();
  await page.getByRole('combobox', { name:'Simulated viewer' }).selectOption('4');
  await page.locator('.demo-panel').getByRole('button', {name:'Crystal',exact:true}).click();
  expected.crystal++;
  await page.waitForFunction(({id,n})=>fetch('/api/snapshot').then(r=>r.json()).then(s=>s.artifacts.find(a=>a.id===id).energy.crystal===n),{id:before.id,n:expected.crystal});
  await page.getByRole('button', { name: 'Try Demo', exact: true }).click();
  const after = (await state()).artifacts.find(a=>a.id===before.id);
  if(after.ownerId!=='rehearsal-a'||after.seed!==before.seed||after.communities.length!==2||JSON.stringify(after.energy)!==JSON.stringify(expected)||after.history.some(h=>h.evidence==='TWITCH')) throw new Error('Rehearsal identity, energy or provenance mismatch');
  if(!before.history.every(h=>after.history.some(n=>n.id===h.id))) throw new Error('Existing history lost');
  const sizes = [{width:1920,height:1080},{width:1440,height:900},{width:1280,height:720},{width:820,height:1180},{width:390,height:844}];
  const layout=[];
  for (const size of sizes) {
    await page.setViewportSize(size); await navigate('Home');
    for (const label of ['Home','My Artifact','Transfers','Memories','Settings']) {
      await navigate(label);
      if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)) throw new Error(`${label} horizontal overflow at ${size.width}`);
    }
    await navigate('Home');
    await page.screenshot({path:`output/playwright/aurora-home-${size.width}.png`,fullPage:size.width===390});
    layout.push({...size,allFiveViews:'PASS'});
  }
  await page.setViewportSize({width:1440,height:900}); await navigate('Settings');
  await page.getByRole('button',{name:'Generate overlay URL',exact:true}).click();
  const url=await page.getByRole('textbox',{name:'Private OBS browser source URL'}).inputValue();
  const overlay=await page.context().newPage(); await overlay.setViewportSize({width:1920,height:1080}); await overlay.goto(url);
  await overlay.getByRole('heading',{name:'Aether Aurora',exact:true}).waitFor();
  const alpha=await overlay.evaluate(async()=>{await new Promise(requestAnimationFrame);const src=document.querySelector('canvas');const c=document.createElement('canvas');c.width=src.width;c.height=src.height;const ctx=c.getContext('2d');ctx.drawImage(src,0,0);const data=ctx.getImageData(0,0,c.width,c.height).data;let zero=0,visible=0;for(let i=3;i<data.length;i+=4){if(data[i]===0)zero++;else visible++;}return{transparentPixels:zero,visiblePixels:visible};});
  if(!alpha.transparentPixels||!alpha.visiblePixels) throw new Error('Overlay alpha or artwork missing');
  await overlay.screenshot({path:'output/playwright/aurora-overlay-1080.png'});
  await page.getByRole('button',{name:'Emergency hide',exact:true}).first().click();
  await overlay.getByRole('heading',{name:'Aether Aurora',exact:true}).waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Restore overlay',exact:true}).click();
  await overlay.getByRole('heading',{name:'Aether Aurora',exact:true}).waitFor();
  await overlay.reload();await overlay.getByRole('heading',{name:'Aether Aurora',exact:true}).waitFor();
  await overlay.setViewportSize({width:1280,height:720});await overlay.screenshot({path:'output/playwright/aurora-overlay-720.png'});
  await overlay.close();
  await navigate('Memories');await page.screenshot({path:'output/playwright/aurora-memories.png'});
  const legacy=await page.context().newPage();await legacy.goto(`http://localhost:3000/legacy/${before.id}`);await legacy.getByRole('heading',{name:'Aether Aurora',exact:true}).waitFor();await legacy.screenshot({path:'output/playwright/aurora-legacy.png'});await legacy.close();
  await page.emulateMedia({reducedMotion:'reduce'});await navigate('Home');await page.screenshot({path:'output/playwright/aurora-reduced-motion.png'});await page.emulateMedia({reducedMotion:'no-preference'});
  // Keyboard skip link and named primary navigation, without relying on colors.
  await page.keyboard.press('Control+Home');await page.keyboard.press('Tab');
  const focused=await page.evaluate(()=>({tag:document.activeElement.tagName,label:document.activeElement.textContent.trim()}));
  await page.reload();await page.getByRole('heading',{name:'Aether Aurora',exact:true}).waitFor();
  if(errors.length)throw new Error(errors.join(';'));
  return {result:'PASS',provenance:'REHEARSAL ONLY — NOT TWITCH OR OBS EVIDENCE',artifactId:before.id,seedPreserved:after.seed===before.seed,priorHistoryPreserved:true,energy:expected,layout,overlayAlpha:alpha,overlayHideRestoreReload:'PASS',clipboard:'PASS',pageErrors:errors,keyboardFocus:focused};
}
