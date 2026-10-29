// Browser regression: safety remains usable while another authenticated operation waits.
async (page) => {
  const nav = page.getByRole('navigation', {name:'Main navigation',exact:true});
  await page.setViewportSize({width:1440,height:900});await nav.getByRole('button',{name:'Settings',exact:true}).click();
  let release; const gate=new Promise(resolve=>release=resolve);
  let handled=false;
  await page.route('**/api/overlay-link',async route=>{
    await gate;
    try { await route.continue(); } catch (_) {}
    handled=true;
  });
  try {
    await page.getByRole('button',{name:'Generate overlay URL',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.obs-setup button').disabled);
    const emergency=page.getByRole('button',{name:'Emergency hide',exact:true}).first();
    if(await emergency.isDisabled()) throw new Error('Emergency is blocked by another operation');
    await emergency.click();
    await page.waitForFunction(()=>fetch('/api/snapshot').then(r=>r.json()).then(s=>s.channels.find(c=>c.id==='rehearsal-a').hidden),null,{polling:200});
  } finally {
    release();
    for (let i=0; i<10 && !handled; i++) await new Promise(r => setTimeout(r, 50));
    try { await page.unroute('**/api/overlay-link'); } catch (_) {}
  }
  await page.getByRole('button',{name:'Restore overlay',exact:true}).waitFor();
  await page.waitForFunction(()=>!document.querySelector('.obs-setup button').disabled);
  await page.getByRole('button',{name:'Restore overlay',exact:true}).click();
  const keyboard=await page.context().newPage();await keyboard.goto('http://localhost:3000');await keyboard.keyboard.press('Tab');
  const skip=await keyboard.evaluate(()=>document.activeElement?.className);
  if(skip!=='skip-link')throw new Error('First keyboard stop is not the skip link');
  await keyboard.keyboard.press('Enter');const main=await keyboard.evaluate(()=>document.activeElement?.id);
  if(main!=='main-content')throw new Error('Skip link did not focus the content');await keyboard.close();
  await nav.getByRole('button',{name:'Home',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  const mobileEmergency=page.getByRole('button',{name:'Emergency hide',exact:true}).last();
  const rect=await mobileEmergency.boundingBox();if(!rect||rect.y<0||rect.y+rect.height>844)throw new Error('Mobile emergency not visible after scroll');
  await page.setViewportSize({width:1920,height:1080});await nav.getByRole('button',{name:'Home',exact:true}).click();
  return {result:'PASS',mode:'SYNTHETIC ONLY',emergencyWhileBusy:'PASS',keyboardSkipAndEnter:'PASS',mobileSafetyAfterScroll:'PASS'};
}
