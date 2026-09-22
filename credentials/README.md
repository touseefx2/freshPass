# Android Release Builds (Local + Expo)

Guide for developers: how to build a **signed** Android APK/AAB locally, vs building on **Expo EAS cloud**.

---

## Quick comparison

| Command | Where it builds | Signing key |
|---------|-----------------|-------------|
| `npm run android:release:apk` | **Local** (your machine) | This `credentials/` folder |
| `npm run android:release:aab` | **Local** (your machine) | This `credentials/` folder |
| `eas build --platform android --profile preview` | **Expo cloud** | Expo-managed credentials |
| `eas build --platform android --profile production` | **Expo cloud** | Expo-managed credentials |

- Local builds do **not** use Expo Free-plan build quota.
- Cloud builds **do** use Expo quota (and can fail if Android builds are exhausted for the month).

---

## This folder (`credentials/`)

Used **only for local** release builds.

| File | Purpose | Commit to git? |
|------|---------|----------------|
| `upload-keystore.jks` | Android upload keystore (from Expo) | **Never** |
| `keystore.properties` | Passwords + alias for Gradle | **Never** |
| `README.md` (this file) | Developer guide | Yes |

### Expected layout

```
credentials/
  ├── README.md                 ← this guide (safe to commit)
  ├── upload-keystore.jks       ← secret (gitignored)
  └── keystore.properties       ← secret (gitignored)
```

### `keystore.properties` format

```properties
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=YOUR_KEY_ALIAS
storeFile=upload-keystore.jks
```

Ask a team lead for these values, or download them from Expo (see below). **Do not** commit this file or paste passwords into Slack/git.

---

## First-time setup (new developer)

### 1. Get the Android keystore from Expo

```bash
eas credentials -p android
```

Or: [expo.dev](https://expo.dev) → project **FreshPass** → **Credentials** → Android → download keystore + note passwords.

### 2. Place files here

1. Rename the downloaded `.jks` to `upload-keystore.jks` and put it in this folder.
2. Create `keystore.properties` with the passwords/alias from Expo (format above).

### 3. Confirm `app.json` versions

Source of truth is **`app.json`** (not `android/app/build.gradle`):

```json
{
  "expo": {
    "version": "1.0.8",
    "android": {
      "versionCode": 18
    }
  }
}
```

- **`version`** → shown as `versionName` on Android (you update manually when marketing version changes, e.g. `1.0.8` → `1.0.9`).
- **`android.versionCode`** → integer Play Store requires; **auto +1** on every local release APK/AAB build.

After `expo prebuild`, Gradle is regenerated from `app.json`, so the previous `versionCode` is **not lost** as long as it lives in `app.json`.

---

## Local release builds

From the project root:

```bash
# Signed APK (sideload / testing / share)
npm run android:release:apk

# Signed AAB (Google Play upload)
npm run android:release:aab
```

### What the script does automatically

1. Bumps `android.versionCode` by **1** in `app.json`
2. Leaves `expo.version` as you set it (does **not** auto-bump `1.0.8`)
3. Ensures `android/` exists (runs prebuild if needed)
4. Applies release signing from this `credentials/` folder
5. Syncs `version` + `versionCode` into `android/app/build.gradle`
6. Runs Gradle `assembleRelease` (APK) or `bundleRelease` (AAB)

### Output paths

| Type | Path |
|------|------|
| APK | `android/app/build/outputs/apk/release/app-release.apk` |
| AAB | `android/app/build/outputs/bundle/release/app-release.aab` |

### Play Store upload (AAB)

1. Set `"version"` in `app.json` if you want a new marketing version.
2. Run `npm run android:release:aab` (versionCode increments automatically).
3. Upload the `.aab` in Google Play Console.
4. Must be signed with the **same** upload keystore Expo/Play already uses (this folder).

---

## Expo cloud builds (EAS)

```bash
eas build --platform android --profile preview
eas build --platform android --profile production
```

- Build runs on Expo servers.
- Signing uses Expo project credentials (not this folder).
- Local signing plugin is **skipped** when `EAS_BUILD=true`, so cloud builds are not broken by this setup.
- Subject to Expo plan / monthly Android build quota.

Optional local EAS build (still uses machine resources; credentials can come from Expo login):

```bash
eas build --platform android --profile production --local
```

---

## Prebuild notes

- `android/` and `ios/` are gitignored and can be regenerated with `expo prebuild`.
- Release signing for local builds is re-applied by:
  - `scripts/android-release.js` on every local release command, and
  - `plugins/withAndroidReleaseSigning.js` during prebuild (local only; skipped on EAS).
- Always keep **`versionCode` in `app.json`** as the source of truth before deleting `android/`.

---

## Debug vs release (local)

| Build | Command / path | Signing |
|-------|----------------|---------|
| Debug APK | `cd android && ./gradlew assembleDebug` | Debug keystore |
| Release APK/AAB | `npm run android:release:*` | `credentials/upload-keystore.jks` |

Debug APK is fine for testing; it is **not** for Play Store.

---

## Security checklist

- [ ] Never commit `.jks`, `.keystore`, or `keystore.properties`
- [ ] Never share keystore passwords in public channels
- [ ] Keep a secure backup of the upload keystore (losing it blocks Play updates with the same signing key)
- [ ] This `README.md` is safe to commit; secrets are not

---

## Troubleshooting

| Problem | What to check |
|---------|----------------|
| `Missing keystore` | `credentials/upload-keystore.jks` exists |
| `Missing keystore.properties` | File exists with correct keys (see format above) |
| Play rejects signing key | Wrong/old keystore — must match Expo upload key |
| Play rejects versionCode | `versionCode` must be **higher** than last uploaded build — check Play Console and set `app.json` → `android.versionCode` accordingly |
| EAS Android quota error | Use local `npm run android:release:*` or wait for quota reset / upgrade plan |
| After prebuild, unsigned/wrong key | Run release via `npm run android:release:*` (script re-applies signing) |

---

## Related files

- `scripts/android-release.js` — local release script
- `plugins/withAndroidReleaseSigning.js` — prebuild signing injection (skipped on EAS)
- `app.json` — `version` + `android.versionCode`
- `package.json` — `android:release:apk` / `android:release:aab` scripts
