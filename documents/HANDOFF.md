# Frontend handoff

Updated: 2026-09-13

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
- improved mobile full-screen layout;
- conversation hook/API behavior intentionally unchanged.

The merged branch passed the full GitHub CI chain: runtime audit, tracked-credential check, lint, tests, production web build, Capacitor sync and Android debug APK build.

## Working rules

- Use `AGENTS.md` for local-vs-GitHub boundaries and validation expectations.
- Use `PROJECT_CONTEXT.md` for frontend/backend ownership and runtime paths.
- Keep this handoff short and current; do not duplicate Git history here.
- Do not duplicate the backend's larger AI roadmap/documentation system unless a frontend domain actually needs it.

## Next action

Visually verify the refreshed chatbot in the real local/site environment, then continue frontend work from `main` using the new continuity rules. For future chatbot UI changes, keep presentation separate from `useChatbotConversation.js` unless behavior intentionally changes.
