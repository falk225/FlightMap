# CLAUDE.md — FlightMap

**Branching: `dev-promote`** (DECISIONS.md D005). GitHub Pages deploys the live site from
`master`, so never commit to `master` directly: work on `dev`, then publish with
`git merge --ff-only dev` on `master` and push. Confirm with the user before publishing.

- Commits need the GitHub no-reply email (D003); the global `includeIf` rule supplies it.
- `npm test` must pass before publishing; after publishing, rerun against the live site
  with `BASE_URL=https://falk225.github.io/FlightMap/ npm run test:e2e`.
- `original/` is the 2016 design kept for comparison (D009): change it only to keep it
  running, never to improve it.
