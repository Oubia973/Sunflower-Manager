# Frontend handoff

Updated: 2026-09-13

## Role

Short checkpoint between ChatGPT web and Codex/local. Keep only current frontend state, open limitations and the next action. Detailed history stays in Git.

## Stable baseline on `main`

- Public React frontend plus Capacitor Android wrapper.
- Local web development runs on port 3000 and proxies the private backend on `127.0.0.1:2003`.
- CI checks dependencies, tracked credentials, lint, tests, web build, Capacitor sync and Android debug build.
- CI PR #3 fixed the runtime dependency-audit flow: non-breaking runtime security fixes refresh the lockfile before `npm ci`, so dev dependencies remain available for lint/tests.
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

The earlier `fast-uri` CI blocker is now fixed on `main`. PR #1 still contains its temporary audit workaround and must be realigned with the shared CI before merge.

## Organization work

Branch `frontend-project-organization` adds the lightweight shared structure:

- `AGENTS.md`: local vs GitHub rules, change boundaries and validation expectations;
- `PROJECT_CONTEXT.md`: frontend/backend ownership, runtime map and key paths;
- `documents/HANDOFF.md`: this short checkpoint.

Do not duplicate the backend's large AI roadmap/documentation system here unless a frontend domain actually needs it.

## Next action

Validate and merge this organization PR against the corrected shared CI. Then realign PR #1 with `main`, remove its temporary CI workaround, run the full CI and visually review the chatbot UI before merge.
