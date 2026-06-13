const { chromium } = require('playwright');
const path = require('path');
const { exec } = require('child_process');

(async () => {
  // Start a local server to serve the dist folder
  const server = exec('npx serve dist -p 4173');
  
  // Give the server a moment to start
  await new Promise(r => setTimeout(r, 2000));

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  
  console.log('Navigating to local app...');
  await page.goto('http://localhost:4173');
  
  // Wait for the React components (ECharts and React-Grid-Layout) to render
  console.log('Waiting for components to render...');
  await page.waitForTimeout(3000); 
  
  console.log('Taking screenshot...');
  await page.screenshot({ path: 'mockup-screenshot.png', fullPage: true });
  
  await browser.close();
  server.kill();
  console.log('Screenshot saved to mockup-screenshot.png');
})();