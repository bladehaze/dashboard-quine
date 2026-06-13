import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Quine Rehydration and Export Mechanisms', () => {
  test('App loads empty state correctly', async ({ page }) => {
    // Navigate to the built app
    const indexPath = path.resolve(__dirname, '../dist/index.html');
    await page.goto(`file://${indexPath}`);

    // Verify header exists
    await expect(page.locator('text=SQLite Dashboard Builder')).toBeVisible();
    
    // Verify empty state message
    await expect(page.locator('text=No widgets yet')).toBeVisible();
  });

  test('Quine rehydration works on boot', async ({ page }) => {
    const indexPath = path.resolve(__dirname, '../dist/index.html');
    let html = fs.readFileSync(indexPath, 'utf-8');
    
    // Inject mock state into the HTML
    const mockState = [
      {
        id: 'test_widget_99',
        type: 'chart',
        layout: { i: 'test_widget_99', x: 0, y: 0, w: 6, h: 8 },
        query: 'SELECT * FROM test',
        config: { chartType: 'bar', xAxis: 'x', yAxis: 'y' }
      }
    ];
    
    html = html.replace(
      '<script id="dashboard-state" type="application/json">[]</script>',
      `<script id="dashboard-state" type="application/json">${JSON.stringify(mockState)}</script>`
    );
    
    const tempPath = path.resolve(__dirname, '../dist/test_quine.html');
    fs.writeFileSync(tempPath, html);
    
    await page.goto(`file://${tempPath}`);
    
    // Check if the CHART is rendered (it is capitalized in the UI as 'CHART')
    await expect(page.locator('text=CHART')).toBeVisible({ timeout: 5000 });
    
    // Cleanup
    fs.unlinkSync(tempPath);
  });
});
