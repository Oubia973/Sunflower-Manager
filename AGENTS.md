# Frontend continuity rules

## Local vs remote context

Before changing the project, identify the environment actually available.

### Codex / VS Code local

- The local working copy is the runtime reference when behavior depends on ignored files or local services.
- Local files such as `.env`, Android signing files, generated build output, caches and machine-specific settings may affect behavior even when they are not present on GitHub.
- Use the local backend on `127.0.0.1:2003` when validating web behavior that depends on API responses.
- Do not overwrite or regenerate local `.env`, keystores or machine configuration unless explicitly requested.
- Prefer targeted local validation before triggering long CI cycles when the change is small and the relevant path can be checked locally.

### Remote assistant / GitHub work

- Only tracked files, GitHub metadata, CI results and explicitly provided resources are available.
- Do not assume access to the real `.env`, backend localhost, signing material, local caches or generated Android artifacts.
- `.env.example` documents expected configuration; it is not a substitute for the user's real local configuration.
- If a validation requires the local backend, Android Studio, a device/emulator or signing material, state that limitation in `documents/HANDOFF.md` instead of guessing.

## Change boundaries

- Keep presentation-only work separate from business logic whenever possible.
- Do not change API request/response contracts from the frontend unless the backend change is explicit and coordinated.
- Reuse existing frontend data and state before duplicating calculations already owned by the backend.
- For chatbot UI work, keep conversation logic in `src/components/chatbot/useChatbotConversation.js` and presentation in chatbot components/styles unless a behavior change is intentionally required.
- Avoid large file moves or broad refactors solely for cosmetic organization. Improve structure progressively when touching an area for real product work.
- New domain-specific code should prefer a dedicated folder under `src/components/` or another clearly scoped module instead of adding more unrelated files directly under `src/`.

## Validation

Use validation proportional to the risk.

- UI/style-only change: lint + focused manual rendering check; build when practical.
- React behavior change: lint + relevant tests + production build.
- Dependency/configuration change: `npm ci`, audit, lint, tests and build.
- Capacitor/Android change: web validation plus `npx cap sync android` and Android debug build when the environment supports it.

When CI is red, inspect the failing step and logs first. Do not change product code from the red status alone.

## Security and generated files

- Never commit `.env`, private keys, Android keystores, signing passwords, server credentials, logs or runtime dumps.
- `android/app/google-services.json` is public client configuration already intended to be shipped in the APK; do not treat it as a server secret.
- Prefer fixing vulnerable dependencies in `package.json` / `package-lock.json`. Do not weaken audit thresholds merely to make CI green.
- Do not commit generated `build/`, Gradle caches, local IDE state or other ignored artifacts.

## Handoff discipline

`documents/HANDOFF.md` is the short shared checkpoint between ChatGPT web and Codex/local.

After a meaningful frontend batch, update it only when the current state, an open limitation, active branch/PR, validation status or next action changed. Keep it short; Git history remains the detailed history.

Before resuming a frontend task after an interruption, read:

1. `documents/HANDOFF.md`
2. `PROJECT_CONTEXT.md`
3. this `AGENTS.md` only when additional working rules are needed.

Never claim a change is merged, deployed, tested locally or active in production unless that state was actually verified.
