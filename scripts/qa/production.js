async (page) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.getByRole('button', { name: 'NOVA', exact: false }).click();
  await page.getByRole('link', { name: 'Open public legacy', exact: false }).waitFor();
  await page.getByRole('button', { name: 'Stream setup', exact: false }).click();
  await page.getByRole('button', { name: 'Generate overlay URL' }).click();
  const link = await page.getByRole('textbox', { name: 'Private OBS browser source URL' }).inputValue();
  const overlay = await page.context().newPage();
  await overlay.goto(link);
  await overlay.getByRole('heading', { name: 'Aether 001' }).waitFor();
  const alpha = await overlay.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    const source = document.querySelector('canvas');
    const canvas = document.createElement('canvas'); canvas.width = source.width; canvas.height = source.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(source, 0, 0); const bytes = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let zero = 0, visible = 0; for (let i = 3; i < bytes.length; i += 4) { if (bytes[i] === 0) zero++; else visible++; }
    return { transparentPixels: zero, nontransparentPixels: visible, percentTransparent: 100 * zero / (zero + visible) };
  });
  if (alpha.transparentPixels === 0 || alpha.nontransparentPixels === 0) throw new Error('Canvas must contain both transparent pixels and rendered content');
  await page.getByRole('button', { name: 'The forge', exact: false }).click();
  await page.getByRole('button', { name: 'Emergency clear', exact: false }).click();
  await overlay.getByRole('heading', { name: 'Aether 001' }).waitFor({ state: 'hidden', timeout: 5000 });
  await page.getByRole('button', { name: 'Restore', exact: true }).click();
  await overlay.getByRole('heading', { name: 'Aether 001' }).waitFor();
  await overlay.close();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('navigation', { name: 'Workspace navigation' }).waitFor();
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) throw new Error('Mobile horizontal overflow');
  await page.screenshot({ path: 'output/playwright/production-mobile.png' });
  await page.getByRole('button', { name: 'Legacy archive', exact: true }).click();
  await page.getByRole('heading', { name: 'The legacy archive.' }).waitFor();
  await page.getByRole('button', { name: 'The forge', exact: true }).click();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.screenshot({ path: 'output/playwright/production-dashboard-1080.png' });
  const result = await page.evaluate(async () => (await fetch('/api/snapshot')).json());
  const a = result.artifacts.find(a => a.name === 'Aether 001');
  if (a.ownerId !== 'rehearsal-b' || a.energy.crystal !== 2 || a.communities.length !== 2) throw new Error('Persistent data mismatch after production restart');
  const response = await page.request.get('http://localhost:3000/');
  if (!response.headers()['content-security-policy']) throw new Error('Production CSP missing');
  if (errors.length) throw new Error(errors.join('; '));
  return { production: 'PASS', canvasAlpha: alpha, pageErrors: errors.length, persistedArtifact: a.id, csp: 'present', mode: 'REHEARSAL ONLY' };
}
