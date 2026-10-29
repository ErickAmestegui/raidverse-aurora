async (page) => {
  await page.getByRole('combobox', { name: 'Synthetic viewer' }).selectOption('3');
  await page.getByRole('button', { name: 'Forge fire', exact: false }).click();
  await page.getByRole('combobox', { name: 'Synthetic viewer' }).selectOption('4');
  await page.getByRole('button', { name: 'Forge light', exact: false }).click();
  await page.getByRole('button', { name: 'End forging round', exact: false }).click();
  await page.getByRole('combobox', { name: 'Receiving channel' }).selectOption('rehearsal-b');
  await page.getByRole('button', { name: 'Prepare transfer', exact: false }).click();
  await page.getByRole('button', { name: 'Simulate raid', exact: false }).waitFor();
  await page.screenshot({ path: 'output/playwright/forge-prepared-1440.png', fullPage: true });
}
