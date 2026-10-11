// @ts-check
const fs = require('fs');
const path = require('path');
const { expect } = require('@playwright/test');

// Same parsing and map-bounds filter as flight_map.js, done independently in Node
function loadFlights() {
    const lines = fs.readFileSync(path.join(__dirname, '..', 'flight_data.csv'), 'utf8').trim().split(/\r?\n/);
    const cols = lines[0].split(',');
    return lines.slice(1).map(function (line) {
        const cells = line.split(',');
        const row = {};
        cols.forEach(function (c, i) {
            row[c] = (c === 'Origin' || c === 'Dest') ? cells[i] : +cells[i];
        });
        return row;
    }).filter(function (d) {
        return d.OrigLong > -172 && d.OrigLong < -63 && d.OrigLat > 19 && d.OrigLat < 72 &&
            d.DestLong > -172 && d.DestLong < -63 && d.DestLat > 19 && d.DestLat < 72;
    });
}

const flights = loadFlights();

function sumN(rows) {
    return rows.reduce(function (s, d) { return s + d.n; }, 0);
}

function departures(airport, hour) {
    return flights.filter(function (d) { return d.Origin === airport && d.DepHour === hour; });
}

function arrivals(airport, hour) {
    return flights.filter(function (d) { return d.Dest === airport && d.ArrHour === hour; });
}

// "10:00 AM - 11:00 AM" / "12 Noon - 1:00 PM" / "Midnight - 1:00 AM" -> 10 / 12 / 0
function startHour(label) {
    const first = label.split(' - ')[0];
    if (first === 'Midnight') return 0;
    if (first === '12 Noon') return 12;
    const h = parseInt(first, 10);
    return first.endsWith('PM') ? h + 12 : h;
}

/** Load the page and stop the 24h autoplay so tests control the hour. */
async function openStopped(page) {
    await page.goto('original/');
    const play = page.locator('button.play24');
    await expect(play).toHaveText('Stop');
    await play.click();
    await expect(play).toHaveText('Play 24h');
}

/** Wait until the caption overlay is behind the map, as it is when idle. */
async function waitForOverlayLowered(page) {
    await expect.poll(function () {
        return page.evaluate(function () {
            const first = document.querySelector('.map-wrap').firstElementChild;
            return first.classList.contains('msg');
        });
    }).toBe(true);
}

/** Step the hour arrows until the given hour is showing, then let transitions settle. */
async function goToHour(page, hour) {
    const current = startHour(await page.locator('.time').textContent());
    const steps = (hour - current + 24) % 24;
    for (let i = 0; i < steps; i++) {
        await page.locator('button.button-up').click();
    }
    await expect(page.locator('.time')).toHaveText(new RegExp('^' + hourLabel(hour)));
    await waitForOverlayLowered(page);
    await page.waitForTimeout(700); // bar transitions are 500ms
}

function hourLabel(hour) {
    if (hour === 12) return '12 Noon';
    if (hour === 0 || hour === 24) return 'Midnight';
    return hour > 12 ? (hour - 12) + ':00 PM' : hour + ':00 AM';
}

module.exports = { flights, sumN, departures, arrivals, startHour, hourLabel, openStopped, goToHour, waitForOverlayLowered };
