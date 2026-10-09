// @ts-check
const { defineConfig, devices } = require('@playwright/test');

function withoutDisplay(env) {
    const copy = { ...env };
    delete copy.DISPLAY;
    delete copy.WAYLAND_DISPLAY;
    return copy;
}

// BASE_URL=https://falk225.github.io/FlightMap/ npm run test:e2e  tests the live site
const liveUrl = process.env.BASE_URL;

module.exports = defineConfig({
    testDir: 'tests',
    timeout: 60000,
    use: {
        baseURL: liveUrl || 'http://localhost:8123',
    },
    // the site is static files, served the same way you would run it locally
    webServer: liveUrl ? undefined : {
        command: 'python3.12 -m http.server 8123',
        url: 'http://localhost:8123',
        reuseExistingServer: !process.env.CI,
        stderr: 'ignore', // http.server's per-request access log
    },
    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1280, height: 900 },
                // headless Chromium probes $DISPLAY for GPU init; under WSLg that
                // probe stalled for 20-50s, so hide the display from the browser
                launchOptions: { env: withoutDisplay(process.env) },
            },
        },
    ],
});
