# Sunflower Manager

[![CI](https://github.com/Oubia973/Sunflower-Manager/actions/workflows/ci.yml/badge.svg)](https://github.com/Oubia973/Sunflower-Manager/actions/workflows/ci.yml)

This repository contains the public React frontend and the Capacitor Android
wrapper for [Sunflower Manager](https://sunflowermanager.xyz).

The Android application displays the hosted web application and provides native
push-notification handling. Its source is published so users can inspect that
behavior and build the application themselves. The private API and server
infrastructure are not part of this repository.

## Requirements

- Node.js 22 or newer
- npm
- Android Studio with a compatible Android SDK and JDK 21

## Web development

For local development, start the private backend on `127.0.0.1:2003`, then run:

```sh
npm ci
npm start
```

The development server runs on port `3000` and proxies API calls to the local
backend. `REACT_APP_API_URL` is used by production builds; copy `.env.example`
to `.env` and set it before running `npm run build`.

## Android development

Synchronize the web application and Capacitor plugins with the Android project:

```sh
npm ci
npm run build
npm run capacitor:sync
```

The Android project can then be opened from Android Studio. A command-line APK
build is also available with `npm run android:apk`.

The checked-in Capacitor configuration loads `https://sunflowermanager.xyz` in
the native WebView. The Android layer provides push notifications and status-bar
integration; it does not contain the private API or server credentials.

Without a local `android/keystore.properties`, the command uses the Android debug
signing configuration. For a release build, copy
`android/keystore.properties.example` to `android/keystore.properties` and use
your own keystore. Keystores and signing passwords are ignored by Git.

## Public Firebase configuration

`android/app/google-services.json` contains Firebase's public Android client
configuration, which is embedded in every compiled APK. It is not a Firebase
Admin credential. Server credentials, private keys, `.env` files, logs, and
signing keystores must never be committed.

## Automated verification

Every push to `main` runs linting, unit tests, a production web build, a runtime
dependency audit, Capacitor synchronization, and an Android debug APK build in
GitHub Actions.

## License

See [LICENSE](LICENSE).
