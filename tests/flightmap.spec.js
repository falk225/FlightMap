// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { flights, sumN, departures, arrivals, hourLabel, openStopped, goToHour, waitForOverlayLowered } = require('./helpers');

test.describe('page', function () {
    test('loads D3 v7 with no console errors or failed requests', async function ({ page }) {
        const problems = [];
        page.on('console', function (m) { if (m.type() === 'error') problems.push(m.text()); });
        page.on('pageerror', function (e) { problems.push(e.message); });
        page.on('requestfailed', function (r) { problems.push('failed: ' + r.url()); });
        await openStopped(page);
        await expect(page).toHaveTitle('Flight Map from 1987');
        expect(await page.evaluate(function () { return window.d3.version; })).toMatch(/^7\./);
        const states = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'USAStates.geojson'), 'utf8'));
        await expect(page.locator('path.states')).toHaveCount(states.features.length);
        expect(problems).toEqual([]);
    });

    test('airport ellipses use the intended .7 opacity', async function ({ page }) {
        await openStopped(page);
        await goToHour(page, 10); // stopping before the first tick leaves the map empty
        const opacity = await page.locator('ellipse.airport').first()
            .evaluate(function (e) { return getComputedStyle(e).opacity; });
        expect(opacity).toBe('0.7');
    });
});

test.describe('playback', function () {
    test('autoplay runs through 24 hours with captions, then shows instructions', async function ({ page }) {
        test.slow();
        await page.goto('/');
        await expect(page.locator('button.play24')).toHaveText('Stop');
        await expect(page.locator('.msg')).toHaveText('Waking up!', { timeout: 5000 });
        await expect(page.locator('.msg')).toHaveText('Work all day.', { timeout: 6000 });
        await expect(page.locator('button.play24')).toHaveText('Play 24h', { timeout: 40000 });
        await expect(page.locator('.time')).toHaveText('4:00 AM - 5:00 AM');
        await expect(page.locator('#description')).toHaveCSS('font-size', '18px');
    });

    test('Stop halts playback', async function ({ page }) {
        await openStopped(page);
        const before = await page.locator('.time').textContent();
        await page.waitForTimeout(2600); // two playback ticks
        await expect(page.locator('.time')).toHaveText(before || '');
    });
});

test.describe('hour controls', function () {
    test('arrows wrap around midnight', async function ({ page }) {
        await openStopped(page);
        await goToHour(page, 23);
        await expect(page.locator('.time')).toHaveText('11:00 PM - Midnight');
        await page.locator('button.button-up').click();
        await expect(page.locator('.time')).toHaveText('Midnight - 1:00 AM');
        await page.locator('button.button-down').click();
        await expect(page.locator('.time')).toHaveText('11:00 PM - Midnight');
    });

    test('noon is labelled', async function ({ page }) {
        await openStopped(page);
        await goToHour(page, 12);
        await expect(page.locator('.time')).toHaveText('12 Noon - 1:00 PM');
    });
});

test.describe('data', function () {
    test('every hour has departures and arrivals', function () {
        for (let h = 0; h < 24; h++) {
            expect(flights.some(function (d) { return d.DepHour === h; })).toBe(true);
            expect(flights.some(function (d) { return d.ArrHour === h; })).toBe(true);
        }
    });

    for (const [airport, hour] of [['ATL', 10], ['ORD', 17], ['DEN', 8]]) {
        test(`tooltip for ${airport} at ${hourLabel(hour)} matches the CSV`, async function ({ page }) {
            await openStopped(page);
            await goToHour(page, hour);
            await page.locator('ellipse.airport.' + airport).hover({ force: true });
            const tip = page.locator('.tooltip');
            await expect(tip).toHaveCSS('opacity', '0.9');
            await expect(tip.locator('.tooltip-header')).toContainText(airport);
            await expect(tip.locator('.tooltip-left')).toHaveText('Departures: ' + sumN(departures(airport, hour)));
            await expect(tip.locator('.tooltip-right')).toHaveText('Arrivals: ' + sumN(arrivals(airport, hour)));
        });
    }

    test('one departure bar per airport with departures that hour', async function ({ page }) {
        await openStopped(page);
        await goToHour(page, 10);
        const airports = new Set(flights.filter(function (d) { return d.DepHour === 10; }).map(function (d) { return d.Origin; }));
        await expect(page.locator('rect.origin_bar:not(.total)')).toHaveCount(airports.size);
    });
});

test.describe('flight paths', function () {
    test('clicking a departure bar draws one arc per route; clicking again removes them', async function ({ page }) {
        await openStopped(page);
        await goToHour(page, 10);
        // a real click: fails if anything (like the caption overlay) sits on top of the bar
        await page.locator('rect.origin_bar.ATL').click();
        await expect(page.locator('g.flight_paths.origin.ATL path.origin_path')).toHaveCount(departures('ATL', 10).length);
        await page.locator('rect.origin_bar.ATL').click();
        await expect(page.locator('g.flight_paths')).toHaveCount(0);
    });

    test('clicking an arrival bar draws arrival arcs', async function ({ page }) {
        await openStopped(page);
        await goToHour(page, 18);
        await page.locator('rect.dest_bar.ORD').click();
        await expect(page.locator('g.flight_paths.dest.ORD path.dest_path')).toHaveCount(arrivals('ORD', 18).length);
    });

    test('shown paths follow the hour', async function ({ page }) {
        await openStopped(page);
        await goToHour(page, 10);
        await page.locator('rect.origin_bar.ATL').click();
        await page.mouse.move(0, 0);
        await page.locator('button.button-up').click();
        await expect(page.locator('.time')).toHaveText(/^11:00 AM/);
        await expect(page.locator('g.flight_paths.origin.ATL path.origin_path')).toHaveCount(departures('ATL', 11).length);
    });

    test('arc widths and markers stay within their scale ranges', async function ({ page }) {
        // regression: the scale domain used to come from CSV strings, so busy routes overflowed
        await openStopped(page);
        await goToHour(page, 10);
        await page.locator('rect.origin_bar.ATL').click();
        await page.waitForTimeout(1200);
        const widths = await page.locator('path.origin_path').evaluateAll(function (ps) {
            return ps.map(function (p) { return +p.getAttribute('stroke-width'); });
        });
        const radii = await page.locator('circle.origin_marker').evaluateAll(function (cs) {
            return cs.map(function (c) { return +c.getAttribute('r'); });
        });
        expect(widths.length).toBeGreaterThan(0);
        expect(Math.max.apply(null, widths)).toBeLessThanOrEqual(1);
        expect(Math.min.apply(null, widths)).toBeGreaterThanOrEqual(0.05);
        expect(Math.max.apply(null, radii)).toBeLessThanOrEqual(10);
    });
});

test.describe('layout', function () {
    test('idle caption overlay does not cover the map', async function ({ page }) {
        await openStopped(page);
        await waitForOverlayLowered(page);
        const box = await page.locator('svg.svg-map').boundingBox();
        if (!box) throw new Error('map not rendered');
        for (const fy of [0.3, 0.43, 0.55]) {
            const cls = await page.evaluate(function ([x, y]) {
                const e = document.elementFromPoint(x, y);
                return e ? e.getAttribute('class') : null;
            }, [box.x + box.width / 2, box.y + box.height * fy]);
            expect(cls).not.toBe('msg');
        }
    });

    test('desktop: map renders at its original 1100px size', async function ({ page }) {
        await openStopped(page);
        const box = await page.locator('svg.svg-map').boundingBox();
        expect(box && Math.round(box.width)).toBe(1102); // 1100 + 1px border each side
    });

    for (const width of [375, 768]) {
        test(`${width}px wide: map and legend fit without horizontal scrolling`, async function ({ page }) {
            await page.setViewportSize({ width, height: 800 });
            await openStopped(page);
            const overflow = await page.evaluate(function () {
                return document.documentElement.scrollWidth - document.documentElement.clientWidth;
            });
            expect(overflow).toBeLessThanOrEqual(0);
            const map = await page.locator('svg.svg-map').boundingBox();
            const legend = await page.locator('g.legend rect').boundingBox();
            if (!map || !legend) throw new Error('map or legend not rendered');
            expect(map.x + map.width).toBeLessThanOrEqual(width);
            expect(legend.x + legend.width).toBeLessThanOrEqual(map.x + map.width);
            await expect(page.locator('button.play24')).toBeInViewport();
        });
    }
});
