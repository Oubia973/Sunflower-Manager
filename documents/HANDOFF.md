# Frontend handoff

Updated: 2026-09-24

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

Local pending change: item markers now keep the backend-supplied canonical name visible if their image fails to load. The frontend does not need an item table for these markers. Focused renderer tests, lint and build pass; browser and Android visual checks remain open. The matching backend change supplies root-relative image paths. Its structured model stream is now opt-in only because real answers became too short; the previous text stream was restored by restarting only the worker at 21:34 on 23 September. The localized-name dictionary conversion was removed because it cannot reliably identify arbitrary translated names.
Follow-up: Markdown now treats a complete `[[item:...|/icon/..._name.png]]` marker as one token before parsing underscores as emphasis. This fixes raw icon paths showing in assistant answers. Focused renderer test covers bold and plain markers with underscored image filenames; local browser check remains open.

Local pending change: completed assistant answers now offer a discreet thumbs-down icon labeled "Bad answer" beside "Answer steps". The sibling backend issues a response ID and records one question/answer pair per ID in rotating `log/ai/bad/bad.jsonl`. Frontend lint/build and backend syntax checks pass; end-to-end local browser/API validation and runtime activation remain outstanding. Reports are retained for 24 hours in server memory, so an old open conversation cannot submit after a backend restart.

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

## Lists active-farm search

Local pending change: Lists now switches between classic Top 100 lists and an active-farm SQLite search. Everyone sees the new mode; non subscribers see the subscription requirement. Subscriber search offers up to five items, `ALL`/`ANY`, minimum quantities and cursor pagination. The sibling backend route is limited to PC Dev loopback with an exact local flag and a current subscription check; production farm-control authentication is still required before public activation. The user restarted the Dev backend. Browser checks on localhost passed with a subscriber (1,897 catalog items, 50 results and next page from the 2026-09-23 snapshot) and a non subscriber (subscription notice). The Dev page calls the local backend directly for this feature; other frontend API settings are unchanged. Backend fixture tests, frontend focused tests, lint and build pass.
The Lists switch now sits beside the page-selector DList in the header; the page-selector options are unchanged. Active-farm search uses the site's brown/gold styling, a name search, lazy category filters from the existing Lists catalog, and a short expandable list of SQLite-backed items. Selected items show individual minimum quantities. The full SQLite catalog remains searchable even when an item is absent from the classic Lists catalog. Browser checks passed on desktop and a narrow mobile viewport: a subscriber loaded 1,897 items, selected an item, retrieved 50 results, and filtered the Fish category to 58 snapshot items. A non subscriber sees the subscription notice. The sibling backend route remains PC Dev loopback only with an exact local flag and backend subscription check; production farm-control authentication is still required before public activation. No deploy or commit.
The header displays the exact farm count in the snapshot, and search results display their exact match count plus the visible row range. Result pagination keeps cursors for previous pages. The sibling backend reader supplies these counts and caches the current query's match count. The user restarted the Dev backend. Browser validation passed on the real 2026-09-23 snapshot: 82,833 farms, 52,982 Carrot matches, page ranges 1–50 and 51–100, then a return to 1–50. Backend fixture tests, frontend navigation test, lint and build pass.
Farm Holdings catalog and search requests now send the displayed farm username as a log label. The backend formats one `[FARMHOLD]` console line per response with username:farm ID, route, JSON response size in Ko, client IP and error status when relevant. The username is display-only and does not change authorization. The user restarted the Dev backend; real browser catalog/search requests both returned 200 (83,991 and 4,140 response bytes). The logger formatter was checked locally, but the VS Code debug console itself could not be read from this environment. Focused backend/frontend tests, syntax checks, lint and build pass.
The Choose items panel can now be collapsed and reopened. Its closed header shows the selected count and item names; search controls and results remain usable. Browser validation passed with Carrot selected and the panel closed, showing 52,982 matching farms. Frontend focused tests, lint and build pass.
Local category correction: the classic `/getcatalogcategory` Mongo response omits Salt Dino Egg and Otter Pebble from Bounty although the Dev SQLite snapshot and local `DB/itemsCatalog.json` contain them. The Dev catalog reader now adds local category labels to SQLite items; the active-farm picker uses those labels together with classic category results. After the user restarted the Dev backend, its catalog HTTP response included Salt Dino Egg in Bounty with 8,607 holders (27 Bounty items). Browser validation passed in Lists → Active farms → Bounty on the 2026-09-23 snapshot (82,833 farms). Frontend/backend focused tests, lint and build pass; no commit or deploy.
The Active farms results table now has a bounded vertical scroll area with sticky column headers and a synchronized horizontal control fixed at the bottom of the viewport while the table is visible. At a 230 px browser width, five item columns remain accessible without page overflow; browser checks confirmed header position and horizontal keyboard scrolling. Focused frontend tests, lint and build pass. No backend change, commit or deploy.
Follow-up local changes removed the viewport-fixed horizontal control, kept native scrolling inside the table, and sized columns by content to prevent overlapping text. The result headers now request full-result sorting by farm ID, name, or a selected item quantity, with a sort-specific pagination cursor in the sibling backend. These latest changes have not had browser or runtime validation.
The result navigation now displays `Page X/X`. A save-icon DList beside Search farms offers CSV Excel, CSV standard, and TSV for all matching farms in the active sort order. The sibling backend uses a separate read-only child process to stream the complete export. Frontend lint/build, backend syntax checks, and diff checks pass; browser and production-scale export checks remain open. No runtime activation, commit, or deploy was performed for this batch.
Export follow-up: a real Dev browser click stayed busy because the child kept its IPC channel open after writing the file. The SQL export also made excessive random reads for the shown Wardrobe/Rug/Basic Land filter. The child now disconnects after completion, `ALL` queries anchor on the least common eligible item, and `ANY` queries aggregate matching item streams without extra holdings lookups. The UI shows preparation time and received KB. A direct export through the child on the real snapshot completed with 191 data rows and 4,961 bytes in about 26 seconds; a separate `ANY` TSV export produced 191 data rows in about 27 seconds. Frontend lint/build and backend syntax checks pass. The backend running under VS Code still needs restarting before a browser retry.
The export now has a 1,000 matching-farm cap. Search responses include the limit, the frontend disables the save control above it with a refinement message, and the backend independently returns `EXPORT_LIMIT_EXCEEDED` for oversized requests. Results are never silently truncated. This cap has not been activated in the VS Code backend yet.

Production report after deployment: the initial Active farms catalog returned HTTP 504 and the page stayed on Loading. The sibling backend now replies `INDEX_PREPARING` after 15 seconds while its reader continues validating the SQLite bundle, and the frontend retries the catalog automatically. A ten-minute reader watchdog remains. Targeted frontend lint, backend syntax and diff checks pass; this fix has not been deployed or checked on PC Web.

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
