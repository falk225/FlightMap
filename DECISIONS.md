# Decisions

Permanent rationale for FlightMap. The 2016 design rationale (projection, bars,
colors, arcs, annotations) lives in `readme.md` under **Design**; this file
covers decisions made since.

Entries are numbered sequentially and **never deleted or renumbered**, even when
later reversed — a reversal is a new entry that references the one it reverses.

---

## D001 — Type-check the JavaScript with `checkJs`, don't convert to TypeScript

**Date:** 2026-10-09

**Context:** While porting to D3 v7 the question came up whether switching to
TypeScript would make troubleshooting faster. The site is static files served
as-is by GitHub Pages, with no build step.

**Options considered:**
- Convert `flight_map.js` to TypeScript, compile to JS before publishing
- Keep `.js` and let `tsc` type-check it (`checkJs`, `noEmit`) with `@types/d3`
- No type checking

**Decision:** Keep `flight_map.js`; `tsconfig.json` sets `checkJs` + `noEmit`,
and `npm test` runs `tsc` before the browser tests.

**Why:** It gets most of the benefit with no build step and no change to what
Pages serves. It found 5 real issues on its first run (string/number `==`
comparisons relying on coercion, a variable reused as object and number, an
untyped DOM node), and it would have caught the original 2016 bug, where the
flight-path scale domain was computed from CSV strings. It would **not** have
caught the overlay bug found during the port, which was CSS stacking; only the
browser tests catch that class of problem, so types and browser tests are a
pair, not alternatives.

**Consequences:** Type annotations, where needed, are JSDoc comments
(`/** @type {Element[]} */ (...)`). Converting to full TypeScript later is
straightforward if a build step becomes acceptable.

---

## D002 — Port to D3 v7 preserving v3 data shapes and easing exactly

**Date:** 2026-10-09

**Context:** D3 v3 was loaded from `http://d3js.org`, which browsers block as
mixed content on an HTTPS page, so the site could not run on Pages. The goal
was to modernize while keeping the original look and feel.

**Options considered:**
- Pin D3 v3 from an HTTPS CDN (smallest change)
- Port to D3 v7 and restructure the data handling around `d3.group`/`Map`s
- Port to D3 v7 but keep the `d3.nest` `{key, values}` entry shape

**Decision:** D3 7.9.0 pinned from jsDelivr with an SRI hash. `d3.nest` is
replaced by a small `nest_entries()` helper built on `d3.rollups` that returns
the same `{key, values}` shape with string keys, so the rest of the code is
unchanged. v3's `'elastic'` easing is reproduced with
`d3.easeElasticOut.period(0.45)`.

**Why:** Keeping the data shape confined the port to API renames instead of a
rewrite of every lookup. The easing matters for feel: v3 `'elastic'` is
elastic-out with period 0.45 (v3 applies `-in` as identity for this curve),
while v7's default period is 0.3 — a visibly snappier bounce. With amplitude 1
the two formulas are algebraically identical at period 0.45. `sin-in`/`sin-out`
map exactly to `easeSinIn`/`easeSinOut`.

**Consequences:** The v3 page and the port were compared screenshot by
screenshot and with the same scripted interactions (autoplay, hover, click,
hour change) before switching.

---

## D003 — Commit with the GitHub no-reply address in this repo

**Date:** 2026-10-09

**Context:** The first push of the port was rejected (GH007): the account's
email-privacy setting blocks command-line pushes whose commits carry the
private address. The 2016 commits predate the setting.

**Options considered:**
- Turn off "Block command line pushes that expose my email" (account-wide)
- Set this repo's `user.email` to the GitHub no-reply address and amend the
  unpushed commit

**Decision:** Repo-local `user.email` is the `…+falk225@users.noreply.github.com`
address; the unpushed commit was amended (content unchanged) and pushed as a
normal fast-forward.

**Why:** Keeps the account-wide privacy protection on. The change is local to
this repo, so other repos are unaffected.

**Consequences:** Any other GitHub-hosted repo pushed from the same machine
will hit the same rejection until it gets the same repo-local setting.

---

## D004 — Hide the display from Chromium in the Playwright config

**Date:** 2026-10-09

**Context:** On the dev box (WSL2 + WSLg), headless Chromium intermittently
stalled 20–54 s at startup, logging `xcb_connect() failed` and
`eglInitialize SwANGLE failed` after the stall. The WSLg X socket was recreated
mid-run, so the GPU-init probe appears to wait on a restarting display server.
Symptom: `browserContext.newPage` timeouts and one-minute-per-test runs that
passed minutes later.

**Options considered:**
- Raise timeouts
- Tell users to unset `DISPLAY` before running tests
- Strip `DISPLAY` / `WAYLAND_DISPLAY` from the browser's environment in config

**Decision:** `playwright.config.js` passes the browser a copy of the
environment without `DISPLAY` and `WAYLAND_DISPLAY`.

**Why:** Headless Chromium never needs a display, so removing it costs nothing
anywhere and removes the probe. Raising timeouts would hide the stall rather
than avoid it, and an instruction to unset variables would be forgotten.

**Consequences:** Evidence so far is several clean full runs after the change,
against several stalled ones before it; the mechanism is inferred from the
logs, not proven. If stalls recur, re-check with `DEBUG=pw:browser`.

Related: never wrap `npx playwright test` in `timeout` — killing it orphans the
`webServer` and leaves port 8123 bound. Use `--global-timeout`.
