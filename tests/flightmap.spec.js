// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const {
    flights, airportInfo, sumN, departures, arrivals, totalDepartures, totalArrivals, commas,
    hourLabel, openStopped, goToHour, contrast
} = require('./helpers');

/** CSS custom property on :root, as apply_theme() set it */
function rootVar(page, name) {
    return page.evaluate(function (n) {
        return getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    }, name);
}

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
        await expect(page.locator('.map-wrap')).toHaveAttribute('aria-busy', 'false');
        await expect(page.locator('.loading')).toBeHidden();
        expect(problems).toEqual([]);
    });

    test('has a favicon and link-preview tags', async function ({ page, request }) {
        await page.goto('./');
        const icon = await page.locator('link[rel="icon"]').getAttribute('href');
        expect((await request.get(icon || '')).ok()).toBe(true);
        await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'When do airports sleep?');
        await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /og-image\.png$/);
        expect((await request.get('og-image.png')).ok()).toBe(true);
    });

    test('airport ellipses use the intended .7 opacity', async function ({ page }) {
        await openStopped(page);
        await goToHour(page, 10);
        const opacity = await page.locator('ellipse.airport').first()
            .evaluate(function (e) { return getComputedStyle(e).opacity; });
        expect(opacity).toBe('0.7');
    });
});

test.describe('playback', function () {
    test('autoplay starts from a drawn 5 AM map, plays to 4 AM with captions, then nudges the hints', async function ({ page }) {
        test.slow();
        await page.goto('./');
        // regression: the map used to stay empty until the first playback tick
        await expect(page.locator('.time-range')).toHaveText('5:00 AM - 6:00 AM');
        await expect(page.locator('rect.origin_bar').first()).toBeAttached({ timeout: 1000 });
        await expect(page.locator('.caption-title')).toHaveText('Zzz Zzz Zzz');
        await expect(page.locator('.caption-title')).toHaveText('Waking up!', { timeout: 5000 });
        await expect(page.locator('.caption-title')).toHaveText('Work all day.', { timeout: 6000 });
        await expect(page.locator('button.play24')).not.toHaveClass(/playing/, { timeout: 40000 });
        await expect(page.locator('.time-range')).toHaveText('4:00 AM - 5:00 AM');
        await expect(page.locator('#description')).toHaveClass(/nudged/);
    });

    test('pause halts playback', async function ({ page }) {
        await openStopped(page);
        const before = await page.locator('.time-range').textContent();
        await page.waitForTimeout(2600); // two playback ticks
        await expect(page.locator('.time-range')).toHaveText(before || '');
        await expect(page.locator('button.play24')).toHaveAttribute('aria-label', 'Play 24 hours');
    });

    test('space plays and pauses; arrow keys step the hour', async function ({ page }) {
        await openStopped(page);
        await goToHour(page, 10);
        await page.locator('h1').click(); // focus off the timeline buttons
        await page.keyboard.press('ArrowRight');
        await expect(page.locator('.time-range')).toHaveText(/^11:00 AM/);
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        await expect(page.locator('.time-range')).toHaveText(/^9:00 AM/);
        await page.keyboard.press(' ');
        await expect(page.locator('button.play24')).toHaveClass(/playing/);
        await page.keyboard.press(' ');
        await expect(page.locator('button.play24')).not.toHaveClass(/playing/);
    });
});

test.describe('hours', function () {
    test('clicking the timeline jumps to that hour and marks it current', async function ({ page }) {
        await openStopped(page);
        await goToHour(page, 15);
        await expect(page.locator('.hours .hour').nth(15)).toHaveAttribute('aria-current', 'true');
        await expect(page.locator('.hours .hour[aria-current]')).toHaveCount(1);
        await expect(page.locator('.time-main')).toHaveText('3:00');
        await expect(page.locator('.time-ampm')).toHaveText('PM');
    });

    test('stepping wraps around midnight', async function ({ page }) {
        await openStopped(page);
        await goToHour(page, 23);
        await expect(page.locator('.time-range')).toHaveText('11:00 PM - Midnight');
        await page.locator('h1').click();
        await page.keyboard.press('ArrowRight');
        await expect(page.locator('.time-range')).toHaveText('Midnight - 1:00 AM');
        await expect(page.locator('.time-main')).toHaveText('12:00');
        await page.keyboard.press('ArrowLeft');
        await expect(page.locator('.time-range')).toHaveText('11:00 PM - Midnight');
    });

    test('noon is labelled', async function ({ page }) {
        await openStopped(page);
        await goToHour(page, 12);
        await expect(page.locator('.time-range')).toHaveText('12 Noon - 1:00 PM');
    });

    test('timeline bars are sized by each hour\'s total departures', async function ({ page }) {
        await openStopped(page);
        const heights = await page.locator('.hours .hour .hour-bars .d').evaluateAll(function (els) {
            return els.map(function (e) { return e.getBoundingClientRect().height; });
        });
        const totals = Array.from({ length: 24 }, function (_, h) { return totalDepartures(h); });
        const busiest = totals.indexOf(Math.max.apply(null, totals));
        const quietest = totals.indexOf(Math.min.apply(null, totals));
        expect(heights[busiest]).toBe(Math.max.apply(null, heights));
        expect(heights[quietest]).toBe(Math.min.apply(null, heights));
        expect(heights[busiest]).toBeGreaterThan(20);
    });
});

test.describe('day and night', function () {
    test('colors follow the clock: dark at night, light by day, blended at dawn', async function ({ page }) {
        await openStopped(page);
        await goToHour(page, 2);
        const night = await rootVar(page, '--bg');
        await expect(page.locator('html')).toHaveAttribute('data-sky', 'night');
        await goToHour(page, 13);
        const day = await rootVar(page, '--bg');
        await expect(page.locator('html')).toHaveAttribute('data-sky', 'day');
        await goToHour(page, 6);
        const dawn = await rootVar(page, '--bg');
        expect(contrast(night, '#000000')).toBeLessThan(1.3);   // near black
        expect(contrast(day, '#ffffff')).toBeLessThan(1.2);     // near white
        expect(new Set([night, day, dawn]).size).toBe(3);
    });

    test('text stays readable at every hour', async function ({ page }) {
        await openStopped(page);
        await page.locator('h1').click();
        const failures = [];
        for (let h = 0; h < 24; h++) {
            await page.keyboard.press('ArrowRight');
            const v = await page.evaluate(function () {
                const s = getComputedStyle(document.documentElement);
                const get = function (n) { return s.getPropertyValue(n).trim(); };
                return { hour: document.querySelector('.time-range').textContent, bg: get('--bg'), panel: get('--panel'),
                    text: get('--text'), muted: get('--muted'), card: get('--card'), cardText: get('--card-text'), cardMuted: get('--card-muted') };
            });
            for (const [fg, bg, label] of [[v.text, v.bg, 'text'], [v.muted, v.bg, 'muted'], [v.muted, v.panel, 'muted on panel'],
                [v.cardText, v.card, 'card text'], [v.cardMuted, v.card, 'card muted']]) {
                const ratio = contrast(fg, bg);
                if (ratio < 4.5) failures.push(v.hour + ' ' + label + ' ' + ratio.toFixed(2));
            }
        }
        expect(failures).toEqual([]);
    });
});

test.describe('counts and captions', function () {
    test('header counts match the CSV totals for the hour', async function ({ page }) {
        await openStopped(page);
        await goToHour(page, 10);
        await expect(page.locator('.count-dep')).toHaveText(commas(totalDepartures(10)));
        await expect(page.locator('.count-arr')).toHaveText(commas(totalArrivals(10)));
    });

    for (const [hour, title] of [[3, 'Zzz Zzz Zzz'], [7, 'Waking up!'], [12, 'Work all day.'], [23, 'Slowing down...'], [0, 'Slowing down...']]) {
        test(`${hourLabel(hour)} is in the "${title}" chapter`, async function ({ page }) {
            await openStopped(page);
            await goToHour(page, hour);
            await expect(page.locator('.caption-title')).toHaveText(title);
            await expect(page.locator('.caption')).toHaveCSS('opacity', '1');
        });
    }

    test('caption facts come from the data', async function ({ page }) {
        await openStopped(page);
        await goToHour(page, 7);
        await expect(page.locator('.caption-fact')).toHaveText(
            'Departures jump from ' + commas(totalDepartures(5)) + ' at 5 AM to ' + commas(totalDepartures(6)) + ' at 6 AM.');
    });
});

test.describe('data', function () {
    test('every hour has departures and arrivals', function () {
        for (let h = 0; h < 24; h++) {
            expect(flights.some(function (d) { return d.DepHour === h; })).toBe(true);
            expect(flights.some(function (d) { return d.ArrHour === h; })).toBe(true);
        }
    });

    test('every airport in the flight data has a name', function () {
        const codes = new Set(flights.flatMap(function (d) { return [d.Origin, d.Dest]; }));
        const missing = [...codes].filter(function (c) { return !airportInfo[c] || !airportInfo[c].city; });
        expect(missing).toEqual([]);
    });

    for (const [airport, hour] of [['ATL', 10], ['ORD', 17], ['DEN', 8]]) {
        test(`card for ${airport} at ${hourLabel(hour)} matches the CSV`, async function ({ page }) {
            await openStopped(page);
            await goToHour(page, hour);
            await page.locator('ellipse.airport.' + airport).hover({ force: true });
            const card = page.locator('.card');
            await expect(card).toHaveClass(/visible/);
            await expect(card.locator('.card-code')).toHaveText(airport);
            await expect(card.locator('.card-city')).toHaveText(airportInfo[airport].city + ', ' + airportInfo[airport].state);
            await expect(card.locator('.card-dep')).toHaveText(commas(sumN(departures(airport, hour))));
            await expect(card.locator('.card-arr')).toHaveText(commas(sumN(arrivals(airport, hour))));
            await expect(card.locator('.card-chart div')).toHaveCount(24);
            await expect(card.locator('.card-chart div.now')).toHaveCount(1);
        });
    }

    test('one departure bar per airport with departures that hour', async function ({ page }) {
        await openStopped(page);
        await goToHour(page, 10);
        const airports = new Set(flights.filter(function (d) { return d.DepHour === 10; }).map(function (d) { return d.Origin; }));
        await expect(page.locator('rect.origin_bar')).toHaveCount(airports.size);
    });
});

test.describe('flight paths', function () {
    test('clicking a departure bar draws one arc per route; clicking again removes them', async function ({ page }) {
        await openStopped(page);
        await goToHour(page, 10);
        // a real click: fails if anything (like the caption) sits on top of the bar
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
        await page.locator('h1').click();
        await page.keyboard.press('ArrowRight');
        await expect(page.locator('.time-range')).toHaveText(/^11:00 AM/);
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

    test('a dot keeps flying each drawn route', async function ({ page }) {
        await openStopped(page);
        await goToHour(page, 10);
        await page.locator('rect.origin_bar.ATL').click();
        const n = departures('ATL', 10).length;
        await expect(page.locator('circle.flight_dot')).toHaveCount(n, { timeout: 3000 });
        await expect(page.locator('circle.flight_dot animateMotion')).toHaveCount(n);
    });
});

test.describe('airport card', function () {
    test('stays inside the map next to the right edge', async function ({ page }) {
        await openStopped(page);
        await goToHour(page, 10);
        await page.locator('ellipse.airport.BOS').hover({ force: true });
        await expect(page.locator('.card')).toHaveClass(/visible/);
        const card = await page.locator('.card').boundingBox();
        const map = await page.locator('.map-wrap').boundingBox();
        if (!card || !map) throw new Error('not rendered');
        expect(card.x).toBeGreaterThanOrEqual(map.x);
        expect(card.x + card.width).toBeLessThanOrEqual(map.x + map.width);
        expect(card.y + card.height).toBeLessThanOrEqual(map.y + map.height);
    });

    test('a click pins the card with route buttons; Escape closes it', async function ({ page }) {
        await openStopped(page);
        await goToHour(page, 10);
        await page.locator('rect.origin_bar.ATL').click();
        const card = page.locator('.card');
        await expect(card).toHaveClass(/pinned/);
        await expect(card.locator('.route-btn.origin')).toHaveAttribute('aria-pressed', 'true');
        await card.locator('.route-btn.dest').click();
        await expect(page.locator('g.flight_paths.dest.ATL path.dest_path')).toHaveCount(arrivals('ATL', 10).length);
        await expect(card.locator('.route-btn.dest')).toHaveAttribute('aria-pressed', 'true');
        await page.mouse.move(5, 5);
        await page.keyboard.press('Escape');
        await expect(card).not.toHaveClass(/visible/);
    });

    test('hovering fades the other airports back', async function ({ page }) {
        await openStopped(page);
        await goToHour(page, 10);
        await page.locator('ellipse.airport.DEN').hover({ force: true });
        await expect(page.locator('g.bars')).toHaveClass(/has-focus/);
        await expect(page.locator('rect.focus')).toHaveCount(2);
        await page.mouse.move(5, 5);
        await expect(page.locator('g.bars')).not.toHaveClass(/has-focus/);
    });
});

test.describe('touch', function () {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

    test('tapping an airport opens a bottom sheet that can show its routes', async function ({ page }) {
        await openStopped(page);
        await goToHour(page, 13);
        const atl = await page.locator('ellipse.airport.ATL').boundingBox();
        if (!atl) throw new Error('ATL not rendered');
        await page.touchscreen.tap(atl.x + atl.width / 2, atl.y + atl.height / 2 + 2);
        const card = page.locator('.card');
        await expect(card).toHaveClass(/pinned/);
        await expect(card).toHaveCSS('position', 'fixed');
        const box = await card.boundingBox();
        if (!box) throw new Error('card not rendered');
        expect(Math.round(box.y + box.height)).toBe(844);
        await expect(page.locator('.hints [data-hint="hover"] .for-touch')).toBeVisible();
        await card.locator('.route-btn.origin').tap();
        await expect(page.locator('g.flight_paths.origin.ATL path.origin_path')).toHaveCount(departures('ATL', 13).length);
        await card.locator('.card-close').tap();
        await expect(card).not.toHaveClass(/visible/);
    });
});

test.describe('reduced motion', function () {
    test.use({ reducedMotion: 'reduce' });

    test('skips the flying dots and still works', async function ({ page }) {
        await openStopped(page);
        await goToHour(page, 10);
        await page.locator('rect.origin_bar.ATL').click();
        await expect(page.locator('g.flight_paths.origin.ATL path.origin_path')).toHaveCount(departures('ATL', 10).length);
        await page.waitForTimeout(300);
        await expect(page.locator('circle.flight_dot')).toHaveCount(0);
        await expect(page.locator('.count-dep')).toHaveText(commas(totalDepartures(10)));
    });
});

test.describe('layout', function () {
    test('caption and overlays do not block the map', async function ({ page }) {
        await openStopped(page);
        const box = await page.locator('svg.svg-map').boundingBox();
        if (!box) throw new Error('map not rendered');
        for (const [fx, fy] of [[0.5, 0.3], [0.5, 0.55], [0.9, 0.9]]) {
            const inSvg = await page.evaluate(function ([x, y]) {
                const e = document.elementFromPoint(x, y);
                return !!(e && e.closest('svg'));
            }, [box.x + box.width * fx, box.y + box.height * fy]);
            expect(inSvg).toBe(true);
        }
    });

    test('desktop: map fills the page width', async function ({ page }) {
        await openStopped(page);
        const box = await page.locator('svg.svg-map').boundingBox();
        expect(box && Math.round(box.width)).toBe(1184); // 1280 page - 2 x 48px padding
    });

    for (const width of [375, 768]) {
        test(`${width}px wide: no horizontal scrolling and the controls fit`, async function ({ page }) {
            await page.setViewportSize({ width, height: 800 });
            await openStopped(page);
            const overflow = await page.evaluate(function () {
                return document.documentElement.scrollWidth - document.documentElement.clientWidth;
            });
            expect(overflow).toBeLessThanOrEqual(0);
            const map = await page.locator('svg.svg-map').boundingBox();
            const hours = await page.locator('.hours').boundingBox();
            if (!map || !hours) throw new Error('not rendered');
            expect(map.x + map.width).toBeLessThanOrEqual(width);
            expect(hours.x + hours.width).toBeLessThanOrEqual(width);
            await page.locator('button.play24').scrollIntoViewIfNeeded();
            await expect(page.locator('button.play24')).toBeInViewport();
        });
    }
});
