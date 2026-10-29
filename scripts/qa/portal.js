async (page) => {
  await page.getByRole('button', { name: 'Simulate raid', exact: false }).click();
  await page.getByRole('button', { name: 'Accept & open portal', exact: false }).waitFor();
  await page.getByRole('button', { name: 'Accept & open portal', exact: false }).click();
  await page.getByRole('button', { name: 'Begin evolution round', exact: false }).waitFor();
  await page.evaluate(() => window.scrollTo({ top: 250, behavior: 'instant' }));
  await page.waitForTimeout(1600); // Intentional capture inside the eight-second portal animation.
  await page.screenshot({ path: 'output/playwright/portal-rehearsal-1440.png' });
  await page.getByRole('button', { name: 'Begin evolution round', exact: false }).click();
  await page.getByRole('combobox', { name: 'Synthetic viewer' }).selectOption('5');
  await page.getByRole('button', { name: 'Forge crystal', exact: false }).click();
  await page.getByRole('button', { name: 'End forging round', exact: false }).waitFor();
  const state = await page.evaluate(async () => (await fetch('/api/snapshot')).json());
  const artifact = state.artifacts.find(a => a.name === 'Aether 001' && a.mode === 'REHEARSAL');
  if (artifact.ownerId !== 'rehearsal-b' || artifact.communities.length !== 2 || artifact.energy.crystal !== 2) throw new Error('Evolution or ownership assertion failed');
  if (state.transfers.filter(t => t.artifactId === artifact.id && t.status === 'TRANSFERRED').length !== 1) throw new Error('Transfer must occur exactly once');
  if (artifact.history.some(h => h.evidence === 'TWITCH')) throw new Error('Synthetic test must not claim Twitch evidence');
  console.log('PASS: four elements, raid, receiver approval, same artifact, two communities, receiver evolution. REHEARSAL ONLY.');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: 'output/playwright/forge-evolved-1440.png' });
}
