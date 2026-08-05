# Sunflower Manager

This repository contains the public React frontend and the Capacitor Android
wrapper for [Sunflower Manager](https://sunflowermanager.xyz).

The Android application displays the hosted web application and provides native
push-notification handling. Its source is published so users can inspect that
behavior and build the application themselves. The private API and server
infrastructure are not part of this repository.

## Requirements

- Node.js 20 or newer
- npm
- Android Studio with a compatible Android SDK and JDK

## Web development

Copy `.env.example` to `.env`, adjust the public API settings, then run:

```sh
npm ci
npm start
```

Create a production web build with `npm run build`.

## Android development

Synchronize the web application and Capacitor plugins with the Android project:

```sh
npm ci
npm run build
npm run capacitor:sync
```

The Android project can then be opened from Android Studio. A command-line APK
build is also available with `npm run android:apk`.

Without a local `android/keystore.properties`, the command uses the Android debug
signing configuration. For a release build, copy
`android/keystore.properties.example` to `android/keystore.properties` and use
your own keystore. Keystores and signing passwords are ignored by Git.

## Public Firebase configuration

`android/app/google-services.json` contains Firebase's public Android client
configuration, which is embedded in every compiled APK. It is not a Firebase
Admin credential. Server credentials, private keys, `.env` files, logs, and
signing keystores must never be committed.

## License

See [LICENSE](LICENSE).
