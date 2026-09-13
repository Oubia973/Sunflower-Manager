# Frontend handoff

Updated: 2026-09-13

## Role

Short checkpoint between ChatGPT web and Codex/local. Keep only current frontend state, open limitations and the next action. Detailed history stays in Git.

## Stable baseline on `main`

- Public React frontend plus Capacitor Android wrapper.
- Local web development runs on port 3000 and proxies the private backend on `127.0.0.1:2003`.
- CI checks dependencies, tracked credentials, lint, tests, web build, Capacitor sync and Android debug build.
- Existing code contains historical large/mixed-purpose files; improve structure progressively rather than with a broad cleanup refactor.

## Current frontend work

Active UI PR: `chatbot-ui-refresh` / PR #1.

The chatbot refresh is presentation-focused:

- wider ChatGPT-like conversation layout;
- assistant replies no longer boxed as generic bubbles;
- user messages remain visually distinct;
- centered rounded composer;
- improved mobile full-screen layout;
- conversation hook/API behavior intentionally unchanged.

A CI failure on that PR came from the runtime dependency audit (`fast-uri` 3.1.5 vulnerability), before lint/tests/build ran. A temporary CI-side `npm audit fix --omit=dev` step was added on that branch. The durable dependency fix should ultimately be recorded in `package-lock.json`, rather than relying on CI mutation.

## Organization work

Branch `frontend-project-organization` adds the lightweight shared structure:

- `AGENTS.md`: local vs GitHub rules, change boundaries and validation expectations;
- `PROJECT_CONTEXT.md`: frontend/backend ownership, runtime map and key paths;
- `documents/HANDOFF.md`: this short checkpoint.

Do not duplicate the backend's large AI roadmap/documentation system here unless a frontend domain actually needs it.

## Next action

Finish and merge the lightweight organization branch independently. Then return to PR #1, apply the durable dependency-lock fix, verify lint/tests/build/Android CI, and review the chatbot UI visually before merge.
