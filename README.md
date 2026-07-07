# FreshPass

FreshPass is a cross-platform mobile app built with **React Native**, **Expo SDK 54**, and **Expo Router**. It supports iOS, Android, and Web.

This guide covers everything needed to set up, configure, and run the project locally.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Environment Variables](#environment-variables)
4. [Running the App](#running-the-app)
5. [Native Builds (iOS / Android)](#native-builds-ios--android)
6. [EAS Cloud Builds](#eas-cloud-builds)
7. [Project Structure](#project-structure)
8. [Troubleshooting](#troubleshooting)
9. [Additional Documentation](#additional-documentation)

---

## Prerequisites

Install the following before you begin:

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | 18.x or 20.x (LTS recommended) | [nodejs.org](https://nodejs.org/) |
| **Yarn** | 1.22+ | Package manager used by this project |
| **Git** | Latest | To clone the repository |
| **Expo CLI** | Bundled via `npx expo` | No global install required |
| **Xcode** | 15+ (macOS only) | Required for iOS simulator / device builds |
| **Android Studio** | Latest | Required for Android emulator / device builds |
| **CocoaPods** | Latest (macOS only) | `sudo gem install cocoapods` |
| **EAS CLI** (optional) | Latest | For cloud builds: `npm install -g eas-cli` |

### Platform-specific setup

**iOS (macOS only)**
- Install Xcode from the Mac App Store
- Open Xcode once and accept the license agreement
- Install Xcode Command Line Tools: `xcode-select --install`

**Android**
- Install [Android Studio](https://developer.android.com/studio)
- In Android Studio → SDK Manager, install:
  - Android SDK Platform 34+
  - Android SDK Build-Tools
  - Android Emulator
- Set `ANDROID_HOME` environment variable (Android Studio usually does this)

**Expo account (optional)**
- Create a free account at [expo.dev](https://expo.dev) if you plan to use EAS builds or Expo Go

---

## Quick Start

### 1. Clone the repository

```bash
git clone <repository-url>
cd freshPass
```

### 2. Install dependencies

```bash
yarn install
```

> `postinstall` automatically runs `patch-package` to apply required dependency patches.

### 3. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in all values. **Ask the FreshPass team for the actual credentials** — the `.env` file is not committed to git for security reasons.

At minimum, these are required for the app to work:

```env
EXPO_PUBLIC_API_BASE_URL=https://your-api-url.com
EXPO_PUBLIC_AUTH_TOKEN=your-guest-auth-token
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
```

See [Environment Variables](#environment-variables) for the full list.

### 4. Generate native project folders

The `android/` and `ios/` folders are **not included in git**. Generate them before running on a simulator or device:

```bash
npx expo prebuild
```

> Run this again after changing native plugins in `app.json` or `app.config.js`.

### 5. Start the development server

```bash
yarn start
```

This opens the Expo Dev Tools in your terminal. From there you can press:
- `i` → open iOS simulator
- `a` → open Android emulator
- `w` → open in web browser

---

## Environment Variables

All environment variables use the `EXPO_PUBLIC_` prefix so Expo can expose them to the app at build time.

Copy `.env.example` to `.env` and configure each variable:

### API & Authentication

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_API_BASE_URL` | ✅ | Backend API base URL (e.g. `https://api.freshpass.com`) |
| `EXPO_PUBLIC_AUTH_TOKEN` | ✅ | Guest/auth token used before user login |

### Stripe Payments

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ | Stripe publishable key (`pk_test_...` or `pk_live_...`) |

### Google Services

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | ✅ | Google Maps API key (maps & location features) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | ✅ | Google OAuth web client ID (social login) |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | ✅ | Google OAuth iOS client ID (social login) |
| `EXPO_PUBLIC_GOOGLE_SEARCH_URL` | Optional | Google Places search API URL |
| `EXPO_PUBLIC_GOOGLE_FETCH_PLACE_URL` | Optional | Google Places details API URL |

### Social Login

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_FACEBOOK_APP_ID` | Optional | Facebook App ID |
| `EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN` | Optional | Facebook client token |
| `EXPO_PUBLIC_APPLE_ANDROID_CLIENT_ID` | Optional | Apple Sign-In client ID (Android) |
| `EXPO_PUBLIC_APPLE_ANDROID_REDIRECT_URI` | Optional | Apple Sign-In redirect URI (Android) |

### Real-time Chat (Laravel Reverb)

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_REVERB_APP_KEY` | ✅ | Reverb app key (same as backend `REVERB_APP_KEY`) |
| `EXPO_PUBLIC_REVERB_WS_HOST` | Optional | WebSocket host (defaults to API hostname) |
| `EXPO_PUBLIC_REVERB_WS_PORT` | Optional | WebSocket port (default: `8080` local, `443` prod) |
| `EXPO_PUBLIC_REVERB_SCHEME` | Optional | `http` or `https` (defaults from API URL) |

### AI Features

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_AITOOL_API_BASE_URL` | Optional | AI tools microservice base URL |
| `EXPO_PUBLIC_AI_API_BEARER_TOKEN` | Optional | Bearer token for AI API |
| `EXPO_PUBLIC_WEBHOOK_URL` | Optional | AI voice agent WebSocket URL |
| `EXPO_PUBLIC_TUTORIAL_VIDEO_TRYON_URI` | Optional | Tutorial video URL for AI try-on feature |

### Apple In-App Purchase (iOS)

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_IAP_BUSINESS_PLAN_STANDARD_PRODUCT_ID` | iOS only | Standard business plan product ID |
| `EXPO_PUBLIC_IAP_BUSINESS_PLAN_FEATURED_PRODUCT_ID` | iOS only | Featured business plan product ID |
| `EXPO_PUBLIC_IAP_BUSINESS_PLAN_PREFIX` | iOS only | Fallback prefix for business plan products |
| `EXPO_PUBLIC_IAP_AI_SERVICE_PREFIX` | iOS only | Fallback prefix for AI service products |

### Default Images & URLs

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_DEFAULT_AVATAR_IMAGE` | Optional | Default user avatar image URL |
| `EXPO_PUBLIC_DEFAULT_BUSINESS_IMAGE` | Optional | Default business cover image URL |
| `EXPO_PUBLIC_DEFAULT_BUSINESS_LOGO` | Optional | Default business logo URL |
| `EXPO_PUBLIC_DEFAULT_CATEGORY_IMAGE` | Optional | Default category image URL |
| `EXPO_PUBLIC_DEFAULT_AI_REQUESTS_IMAGE` | Optional | Default AI requests image URL |
| `EXPO_PUBLIC_TERMS_URL` | Optional | Terms & conditions page URL |
| `EXPO_PUBLIC_PRIVACY_URL` | Optional | Privacy policy page URL |
| `EXPO_PUBLIC_TRAILDAY` | Optional | Free trial days (default: `14`) |

> **Important:** After changing `.env`, restart the Metro bundler (`yarn start`) and rebuild native apps if running on iOS/Android.

---

## Running the App

### Development server

```bash
yarn start
```

### iOS Simulator (macOS only)

```bash
# First time: generate native folder
npx expo prebuild

# Run on iOS simulator
yarn ios
```

### Android Emulator / Device

```bash
# First time: generate native folder
npx expo prebuild

# Run on Android emulator (make sure emulator is running first)
yarn android
```

### Web

```bash
yarn web
```

Opens the app in your browser at `http://localhost:8081`.

### Lint

```bash
yarn lint
```

---

## Native Builds (iOS / Android)

This project uses **Expo Dev Client** (`expo-dev-client`), which means:

- **Expo Go will NOT work** for all features (Stripe, IAP, social login, etc.)
- You must build a **development client** on your machine or via EAS

### Local development build

```bash
# Generate native projects (if not done already)
npx expo prebuild

# iOS
yarn ios

# Android
yarn android
```

### Clean rebuild (if you hit native errors)

```bash
# Remove generated native folders and caches
rm -rf android ios
npx expo prebuild --clean

# iOS: reinstall pods
cd ios && pod install && cd ..

# Run again
yarn ios   # or yarn android
```

### Firebase (Android push notifications)

The file `google-services.json` is included in the repo for Android Firebase setup. No extra steps needed for local Android builds.

---

## EAS Cloud Builds

For distributing builds to testers or submitting to app stores, use [EAS Build](https://docs.expo.dev/build/introduction/).

### Setup

```bash
npm install -g eas-cli
eas login
```

### Build profiles (defined in `eas.json`)

| Profile | Use case |
|---------|----------|
| `development` | Dev client for physical devices (internal distribution) |
| `development-simulator` | Dev client for iOS simulator |
| `preview` | Internal testing build |
| `production` | App Store / Play Store release |

### Commands

```bash
# Development build (device)
eas build --profile development --platform ios
eas build --profile development --platform android

# iOS simulator build
eas build --profile development-simulator --platform ios

# Production build
eas build --profile production --platform all

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

> EAS builds read environment variables from the Expo dashboard or `eas.json` secrets — not from your local `.env` file. Configure them at [expo.dev](https://expo.dev) → Project → Environment Variables.

---

## Project Structure

```
freshPass/
├── app/                    # Expo Router screens (file-based routing)
│   ├── (main)/             # Main app screens
│   └── _layout.tsx         # Root layout (Stripe, Redux, etc.)
├── src/
│   ├── components/         # Reusable UI components
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API, Stripe, IAP, Echo, etc.
│   ├── state/              # Redux store & slices
│   ├── theme/              # Colors, fonts, responsive dimensions
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
├── assets/                 # Images, fonts, animations
├── docs/                   # Additional technical documentation
├── plugins/                # Expo config plugins
├── app.json                # Expo app configuration
├── app.config.js           # Dynamic Expo config (Facebook SDK, etc.)
├── eas.json                # EAS build profiles
├── .env.example            # Environment variable template
└── package.json
```

### Key technologies

- **Expo SDK 54** + **React Native 0.81**
- **Expo Router** — file-based navigation
- **Redux Toolkit** + **redux-persist** — state management
- **NativeWind** — Tailwind CSS for React Native
- **Stripe React Native** — payments (Android / web)
- **Apple IAP** — in-app purchases (iOS)
- **Laravel Echo + Reverb** — real-time chat
- **Google Maps** — location & explore features

---

## Troubleshooting

### `android/` or `ios/` folder missing

```bash
npx expo prebuild
```

### Metro bundler cache issues

```bash
yarn start --clear
# or
npx expo start -c
```

### iOS pod install fails

```bash
cd ios
pod deintegrate
pod install --repo-update
cd ..
```

### Android build fails

- Make sure `ANDROID_HOME` is set
- Open Android Studio → SDK Manager and install missing SDK components
- Try: `cd android && ./gradlew clean && cd ..`

### Environment variables not loading

1. Make sure `.env` exists in the project root
2. All variables must start with `EXPO_PUBLIC_`
3. Restart Metro: `yarn start --clear`
4. For native builds, rebuild: `yarn ios` or `yarn android`

### `patch-package` errors after install

```bash
yarn install
# postinstall runs patch-package automatically
# If a patch fails, check the patches/ folder
```

### Social login not working locally

- Google Sign-In requires correct `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- Facebook login requires `EXPO_PUBLIC_FACEBOOK_APP_ID` in `.env`
- Apple Sign-In only works on real iOS devices or simulator with Apple ID configured

### Real-time chat not connecting

- Verify `EXPO_PUBLIC_REVERB_APP_KEY` matches the backend
- For local backend, set `EXPO_PUBLIC_REVERB_WS_HOST=127.0.0.1` and `EXPO_PUBLIC_REVERB_WS_PORT=8080`
- For physical device testing with local backend, use your machine's LAN IP instead of `127.0.0.1`

### Stripe payments not working

- Use test keys (`pk_test_...`) for development
- Stripe requires a physical device or simulator with a development build (not Expo Go)

---

## Additional Documentation

| Document | Description |
|----------|-------------|
| [docs/IAP_IMPLEMENTATION_GUIDE.md](./docs/IAP_IMPLEMENTATION_GUIDE.md) | iOS In-App Purchase setup |
| [docs/IAP_BACKEND_API_SPEC.md](./docs/IAP_BACKEND_API_SPEC.md) | IAP backend API contract |
| [docs/IAP_BACKEND_IMPLEMENTATION_GUIDE.md](./docs/IAP_BACKEND_IMPLEMENTATION_GUIDE.md) | Backend IAP implementation |
| [docs/APP_STORE_RESUBMISSION.md](./docs/APP_STORE_RESUBMISSION.md) | App Store resubmission notes |

---

## Getting Help

If you run into issues not covered here:

1. Check the [Expo documentation](https://docs.expo.dev/)
2. Contact the FreshPass development team for `.env` credentials and backend access
3. Share the full error log from Metro terminal or Xcode/Android Studio

---

## License

Private — All rights reserved.
