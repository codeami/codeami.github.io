const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests',
  // One baseline set, made on Linux (the CI image); `npm test` runs that same image through Docker.
  snapshotPathTemplate: 'tests/__screenshots__/{arg}-{projectName}{ext}',
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  retries: 0,
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.001, animations: 'disabled' } },
  use: { baseURL: 'http://127.0.0.1:4173', reducedMotion: 'reduce' },
  projects: [
    { name: 'mobile-390', use: { viewport: { width: 390, height: 844 } } },
    { name: 'desktop-1280', use: { viewport: { width: 1280, height: 800 } } },
  ],
  webServer: { command: 'node tests/server.mjs', url: 'http://127.0.0.1:4173/', reuseExistingServer: !process.env.CI },
});
