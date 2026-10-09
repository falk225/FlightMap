# Progress — FlightMap

## Status at a Glance

**Last updated:** 2026-10-09 (session 1, checkpoint)

**Phase:** Revived. The 2016 school project ("When do Airports Sleep?") runs
again, live at https://falk225.github.io/FlightMap/, on D3 v7 with a
responsive layout and a test suite. Goal for now: keep the original feel.

**Branching:** `main-only`, on `master` (repo is on GitHub, not the NAS).

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

**Forthcoming**

- Nothing committed to yet — see Backlog

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
- [ ] Tooltip is placed at `pageX + 40`, so near the right edge on narrow
      screens it can run off-screen
- [ ] Touch: hover (tooltip, bar growth) is mouse-oriented; tap behaviour on
      phones not designed or tested
- [ ] Readme could note that the 1987 data in the ASA Data Expo set covers
      only October–December
- [ ] Original quirk, kept for parity: pressing Stop before the first playback
      tick (~1.25 s) leaves the map empty until an hour is chosen
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

- `flight_map.js` — all visualization logic (D3 v7)
- `index.html`, `flight_map.css` — page shell and styles
- `flight_data.csv` — 19,686 route-hour rows (~1.31M flights), 238 airports
- `USAStates.geojson` — state shapes (51 features)
- `tests/` — Playwright specs; `helpers.js` recomputes expected values from the
  CSV independently of the app
- `playwright.config.js` — local server on 8123, or `BASE_URL` for live (D004)

---

## Session Log (newest first)

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
