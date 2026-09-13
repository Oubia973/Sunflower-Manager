# Project Context - Sunflower Manager Frontend

## Role

This repository contains the public React frontend for Sunflower Manager and the Capacitor Android wrapper. The private Node/Express API lives in the separate `Oubia973/Sunflower-Manager-Server` repository.

## Runtime map

| Area | Path / endpoint | Notes |
|---|---|---|
| React source | `src/` | Main web application |
| Chatbot UI | `src/chatbot.jsx`, `src/components/chatbot/` | UI, rendering and conversation client logic |
| Shared styles | `src/styles/` | Historical global styles; prefer scoped styles for new domain work |
| Android wrapper | `android/` | Capacitor Android project |
| Local frontend | `http://localhost:3000` | `npm start` |
| Local backend | `http://127.0.0.1:2003` | Development proxy target |
| Production site | `https://sunflowermanager.xyz` | Hosted web application |

## Architecture notes

- React 18 application with MUI and Chart.js.
- Capacitor provides the Android wrapper, push notifications and native integration.
- The frontend should display and compose server-provided farm/game data rather than reimplement backend business calculations when an authoritative server value already exists.
- Some historical frontend files are large and mixed-purpose. Do not reorganize them wholesale just for cleanliness; extract progressively when a feature is actively modified.
- New feature-specific UI should prefer scoped components and styles, as done under `src/components/chatbot/`.

## Configuration boundaries

- Development uses the package proxy to `127.0.0.1:2003`.
- Production builds may use `REACT_APP_API_URL` from local `.env`.
- `.env`, Android keystores and signing credentials are local/private and must remain outside Git.
- `android/app/google-services.json` is Firebase public Android client configuration embedded in the shipped application.

## Main validation commands

```sh
npm ci
npm run lint
npm test -- --watchAll=false
npm run build
npx cap sync android
```

Android debug validation additionally requires JDK/Android tooling and can be run through the Gradle wrapper in `android/`.

## Related repository

Backend/API: `Oubia973/Sunflower-Manager-Server`.

When a frontend task depends on farm calculations, chatbot grounding, marketplace data or API contracts, verify which side owns the logic before duplicating it here.
