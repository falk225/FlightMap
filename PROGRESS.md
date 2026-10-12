# Progress — FlightMap

## Status at a Glance

**Last updated:** 2026-10-12 (session 2, wrap)

**Phase:** Redesign live at https://falk225.github.io/FlightMap/, with the 2016 design at
/original/ and a switch between them for portfolio demos. Same story and interactions,
new presentation: direction "A — Glow", chosen from three mockups. 62/62 tests pass
against the live site (`fdfdb7b`).

**Branching:** `dev-promote` since 2026-10-10 (D005, and declared in `CLAUDE.md`): Pages
deploys from `master`, so work goes on `dev` and `master` only fast-forwards. Repo is on
GitHub, not the NAS.

**Recently shipped**

- Session 2 redesign, live:
  - Colors follow the clock: night → dawn → day → dusk (D006)
  - 24-hour timeline with clickable hours and a sparkline; Space / arrow keys
  - Chapter captions with facts computed from the data; animated hour counts
  - Airport card (city, 24-hour chart) on the page theme (D010), pinned on click with
    route buttons; a bottom sheet on phones; names from OurAirports (D008)
  - Denver's departures and arrivals drawn at load; flying dots on routes, glow at
    night, hub labels, hover focus, subtler bounce (D007)
  - Loading state, reduced-motion support, favicon, link-preview image
  - The 2016 design at `/original/` with a 2016 / 2026 switch on both pages (D009)
- Session 1: D3 v3 → 7.9.0 port (D002), responsive layout, Python 3.12 launcher,
  checkJs type checking (D001), Pages re-enabled
- Tests: 62 (40 redesign + 19 original + toggle + 2 added on 2026-10-12), all green
  locally and live

**Forthcoming**

- Nothing committed to yet — see Backlog

---

## Open Work

### Backlog

- [ ] Run `StartHTTPServerHERE.bat` on Windows — untested (written on Linux;
      needs Python 3.12 installed for `py -3.12`)
- [ ] Optional: full TypeScript conversion if a build step becomes acceptable
      (D001)

---

## Reference

### Commands

    py -3.12 -m http.server 8000                         serve locally (Windows)
    python3.12 -m http.server 8000                       serve locally (Linux/macOS)
    npm install && npx playwright install chromium       one-time test setup
    npm test                                             type check + browser tests
    BASE_URL=https://falk225.github.io/FlightMap/ npm run test:e2e   test live site

    git switch master && git merge --ff-only dev && git push && git switch dev
                                                         publish (deploys Pages)

### Key files

- `flight_map.js` — all visualization logic (D3 v7)
- `index.html`, `flight_map.css` — page shell and styles
- `airports.json` — code → city/state/name for the card (D008)
- `original/` — the 2016 design, for comparison (D009); shares the root data files
- `version-toggle.css` — the 2016 / 2026 switch, used by both pages
- `flight_data.csv` — 19,686 route-hour rows (~1.31M flights), 238 airports
- `USAStates.geojson` — state shapes (51 features)
- `tests/` — Playwright specs; `helpers.js` recomputes expected values from the
  CSV independently of the app; `original.spec.js` covers `/original/`
- `playwright.config.js` — local server on 8123, or `BASE_URL` for live (D004)

---

## Session Log (newest first)

### 2026-10-10 → 10-12 — session 2: GitHub email, mockups, redesign, go-live

**Done**

- Global git config now uses the GitHub no-reply email for any repo with a github.com
  remote (`includeIf hasconfig:remote.*.url`); tested against SSH, HTTPS, NAS and
  remote-less repos.
- Brainstormed a refresh; user approved all of it except gradient arcs. Built three
  mockup directions with real map data on a claude.ai design canvas, then added a
  time-of-day slider to each after the user pointed out the day/night idea had been
  lost. User picked "A — Glow".
- Switched to `dev-promote` (D005), built the redesign on `dev`, kept the 2016 design at
  `/original/` with a switch (D009), and went live (`bad5b06`).
- Follow-ups, live as `fdfdb7b`: card on the page theme (D010); Denver's routes drawn at
  load; focused bars raised so a grown bar can be clicked again.

**Verified, not assumed**

- 62/62 tests pass locally and against the live site after each go-live, with the served
  files checked first (not a cached old version).
- New tests proven able to fail: the contrast test failed the first color curve at four
  hours (fixed, D006); removing the card's edge-flip, the bar `raise()`, or the
  reduced-motion check each made its test fail.
- Overshoot numbers in D007 computed from d3-ease's formula, not estimated.

**Problems hit**

- The reduced-motion test had never run with reduced motion on: Playwright 1.48 silently
  ignores `test.use({ reducedMotion })`; it passed only because it checked before dots
  appeared. Now uses `contextOptions` and asserts the media query matches first.
- At 7 PM a neighbor's bar sat on top of ORD's grown bar and took the second click; found
  by the review-screenshot script, not by the tests.
- Timeline bars rendered with zero width (flex children of a flex `<span>` in a
  `<button>`); fixed with `width: 100%`.
- A stray `http.server` from a data-extraction script held port 8124; a later server
  failed to bind silently and the old one served the same directory. Killed it.
- The user rejected a command that bundled an `rm` into a long script; deletions now run
  as their own command.

### 2026-10-09 — session 1: revive, port to D3 v7, tests, Pages

**Done**

- Reviewed the 2016 repo (20 commits, Dec 1–22 2016). Found the scale-domain
  string bug, the `http://` D3 load blocked on HTTPS, Python 2-only launcher,
  invalid CSS, quoted title.
- Ported to D3 v7 (D002), made the layout responsive, applied the small fixes,
  switched the launcher to Python 3.12.
- Added type checking (D001) and a 19-test Playwright suite.
- Pushed (`c0e1a65`, then `de7a529`), enabled Pages, and ran the suite against
  the live site.

**Verified, not assumed**

- Port compared against the original v3 page by screenshots and identical
  scripted interactions: same playback, captions, tooltip, path counts
  (e.g. ATL 11 AM departures: 50 paths in both).
- Tests proven able to fail: re-introducing the overlay bug failed 3 tests;
  re-introducing the string-domain bug failed the arc-width test (stroke
  2.48 vs max 1).

**Problems hit**

- My responsive layout let the empty caption overlay paint over the map and
  swallow clicks (an unpositioned SVG stacks below an absolute sibling
  regardless of DOM order). Fixed by keeping the SVG `position: relative`; tested.
- Headless Chromium startup stalls under WSLg (D004).
- First push rejected for exposing a private email (D003).
