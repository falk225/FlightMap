# Progress — FlightMap

## Status at a Glance

**Last updated:** 2026-10-10 (session 2, redesign on `dev`)

**Phase:** Redesign built and green on `dev`, not yet live. The live site
(https://falk225.github.io/FlightMap/) is still the session 1 port. Same story and
interactions, new presentation: direction "A — Glow", chosen from three mockups.

**Branching:** `dev-promote` since 2026-10-10 (D005): Pages deploys from `master`, so
work goes on `dev` and `master` only fast-forwards. Repo is on GitHub, not the NAS.

**Recently shipped**

- Ported D3 v3 → D3 7.9.0 (jsDelivr, SRI-pinned), preserving v3 data shapes
  and easing (D002)
- Fixed 2016 bug: flight-path width/marker scale domain came from CSV strings,
  so busy routes (n > 99) overflowed the scale max
- Layout flows and scales with the window (viewBox; legend moved into the SVG)
- Fixed invalid `opacity.7` CSS and the quoted `<title>`
- Launcher uses Python 3.12 (`py -3.12 -m http.server 8000`)
- `npm test`: `tsc` checkJs type check (D001) + 19 Playwright browser tests,
  all green locally and against the live site
- GitHub Pages re-enabled from `master` root, HTTPS enforced

**On `dev`, waiting for review → promote to `master`**

- Colors follow the clock: night → dawn → day → dusk (D006)
- 24-hour timeline with clickable hours and a sparkline; Space / arrow keys
- Chapter captions with facts computed from the data; animated hour counts
- Airport card (city, day chart), pinned on click with route buttons; bottom sheet
  on phones; airport names from OurAirports (D008)
- Flying dots on routes, glow at night, hub labels, hover focus, subtler bounce (D007)
- Loading state, reduced-motion support, favicon, link-preview image
- 40 tests (was 19), including contrast at every hour, touch and reduced motion
- The 2016 design kept at `/original/` with a 2016 / 2026 switch on both pages (D009);
  its 19 session 1 tests still run against it (60 tests total)

**Forthcoming**

- User review of the redesign, then `git merge --ff-only dev` on `master` and push

---

## Open Work

### Current

- [x] Port to D3 v7 with the same look and feel
- [x] Responsive layout
- [x] Python 3.12 launcher
- [x] Test suite (type check + browser tests), verified to catch real bugs
- [x] Pages live and tested

### Backlog

- [ ] Run `StartHTTPServerHERE.bat` on Windows — untested (written on Linux;
      needs Python 3.12 installed for `py -3.12`)
- [x] Tooltip ran off-screen near the right edge (card now flips and is clamped;
      tested)
- [x] Touch: tap opens the card as a bottom sheet (tested)
- [x] Note that the data covers only October–December (page eyebrow and footer)
- [x] Stopping before the first playback tick left the map empty (5 AM is now
      drawn at load; tested)
- [ ] The mockup canvas (claude.ai artifact) used 8 AM data only; the real page is
      the reference now
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

### Key files

- `airports.json` — code → city/state/name for the card (D008)
- `original/` — the 2016 design, for comparison (D009); shares the root data files
- `version-toggle.css` — the 2016 / 2026 switch, used by both pages

- `flight_map.js` — all visualization logic (D3 v7)
- `index.html`, `flight_map.css` — page shell and styles
- `flight_data.csv` — 19,686 route-hour rows (~1.31M flights), 238 airports
- `USAStates.geojson` — state shapes (51 features)
- `tests/` — Playwright specs; `helpers.js` recomputes expected values from the
  CSV independently of the app
- `playwright.config.js` — local server on 8123, or `BASE_URL` for live (D004)

---

## Session Log (newest first)

### 2026-10-10 — session 2: GitHub email, mockups, redesign

**Done**

- Global git config now uses the GitHub no-reply email for any repo with a github.com
  remote (`includeIf hasconfig:remote.*.url`); tested against SSH, HTTPS, NAS and
  remote-less repos.
- Brainstormed a refresh; user approved all of it except gradient arcs. Built three
  mockup directions with real map data on a claude.ai design canvas, then added a
  time-of-day slider to each after the user pointed out the day/night idea had been
  lost. User picked "A — Glow".
- Switched to `dev-promote` (D005) and built the redesign on `dev`.

**Verified, not assumed**

- `npm test`: tsc clean, 39/39 Playwright tests pass.
- New tests proven able to fail: the contrast test failed the first color curve at
  four hours (fixed, D006); removing the card's edge-flip made the card test fail
  (card ran 146 px past the map).
- Overshoot numbers in D007 computed from d3-ease's formula, not estimated.

**Problems hit**

- Timeline sparkline bars rendered with zero width (flex children of a flex `<span>`
  inside a `<button>`); fixed with an explicit `width: 100%`, now covered by the
  sparkline test.
- Hidden hints still reserved their space, leaving a gap under the title on phones;
  hints are now always visible and nudge when playback ends.
- A stray `http.server` from the data-extraction script was still bound to 8124; a
  later server failed to bind silently and the old one served the pages. Same
  directory, so results were valid; killed it.

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
- Live site: served HTML confirmed as the new version (D3 7.9.0, fixed title),
  CSV served at full size (839,499 bytes), then 19/19 passed against it.

**Problems hit**

- My responsive layout let the empty caption overlay paint over the map and
  swallow clicks (an unpositioned SVG stacks below an absolute sibling
  regardless of DOM order). Looked identical in screenshots; only a real click
  revealed it. Fixed by keeping the SVG `position: relative`; now tested.
- Headless Chromium startup stalls under WSLg (D004).
- First push rejected for exposing a private email (D003).
- Two of my first tests were wrong, not the app: hardcoded 52 states (file has
  51), and measured ellipses before the first playback tick had drawn any.
