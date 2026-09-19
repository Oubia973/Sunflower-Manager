# Frontend handoff

Updated: 2026-09-19

## Role

Short checkpoint between ChatGPT web and Codex/local. Keep only current frontend state, open limitations and the next action. Detailed history stays in Git.

## Stable baseline on `main`

- Public React frontend plus Capacitor Android wrapper.
- Local web development runs on port 3000 and proxies the private backend on `127.0.0.1:2003`.
- CI checks dependencies, tracked credentials, lint, tests, web build, Capacitor sync and Android debug build.
- CI PR #3 fixed the runtime dependency-audit flow: non-breaking runtime security fixes refresh the lockfile before `npm ci`, so dev dependencies remain available for lint/tests.
- The lightweight continuity structure from PR #2 is merged: `AGENTS.md`, `PROJECT_CONTEXT.md` and this short handoff.
- Existing code contains historical large/mixed-purpose files; improve structure progressively rather than with a broad cleanup refactor.

## Chatbot UI

PR #1 is merged on `main`.

The chatbot refresh is presentation-focused:

- wider ChatGPT-like conversation layout;
- assistant replies no longer boxed as generic bubbles;
- user messages remain visually distinct;
- centered rounded composer;
- compact auto-growing composer: one line by default, up to three lines while composing;
- improved mobile full-screen layout;
- conversation hook/API behavior intentionally unchanged.

Local pending change: chatbot stream statuses are now condensed into one discreet gray English line before the assistant answer; it shows the current step while active and expands on demand to reveal the full timeline (analysis, farm data, sources, prepared tools/data, response). Friendly details and the active/completed state remain frontend-derived from the existing stream contract; raw statuses are still available under "Technical details". Focused tests, lint and the production build pass; visual desktop/mobile validation remains required.

Local pending change: the chatbot now has a bottom-right resize handle for mouse and touch. Resizing keeps the modal's top-left corner anchored while the right and bottom edges move. A header button toggles full screen and restores the previous size/position on exit. Dimensions remain constrained to the current viewport; no backend/API change is involved. Visual validation on desktop and an actual touch device remains required.

## Daily production preferences

Local pending changes move the existing Daily calculation controls from General into the previously empty Production tab, with grouped labels and inline explanations. A default-on `allowPartialNodePlanting` preference lets users keep proportional partial-node production or require full-node harvests. The backend now exposes planting rounds separately from equivalent harvests so a fractional `1.47` output with a 3-hour grow time reports two rounds and a 6-hour final harvest instead of shortening the second cycle.

Focused frontend tooltip tests, frontend lint, production build, and focused backend SetYield/tooltip regressions pass. Visual validation of the reorganized Preferences modal on desktop and mobile remains required. Backend restart/deployment has not been performed.

The merged branch passed the full GitHub CI chain: runtime audit, tracked-credential check, lint, tests, production web build, Capacitor sync and Android debug APK build.

## Working rules

- Use `AGENTS.md` for local-vs-GitHub boundaries and validation expectations.
- Use `PROJECT_CONTEXT.md` for frontend/backend ownership and runtime paths.
- Keep this handoff short and current; do not duplicate Git history here.
- Do not duplicate the backend's larger AI roadmap/documentation system unless a frontend domain actually needs it.

## Next action

Visually verify the refreshed chatbot in the real local/site environment, then continue frontend work from `main` using the new continuity rules. For future chatbot UI changes, keep presentation separate from `useChatbotConversation.js` unless behavior intentionally changes.
