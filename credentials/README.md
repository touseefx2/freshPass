# FreshPass Release Builds (Local + Expo)

Guide for developers: **Android** APK/AAB locally, **iOS** via Xcode (manual), vs **Expo EAS cloud**.

---

## Quick comparison

### Android

| Command | Where it builds | Signing key |
|---------|-----------------|-------------|
| `npm run android:release:apk` | **Local** (your machine) | This `credentials/` folder |
| `npm run android:release:aab` | **Local** (your machine) | This `credentials/` folder |
| `eas build --platform android --profile preview` | **Expo cloud** | Expo-managed credentials |
| `eas build --platform android --profile production` | **Expo cloud** | Expo-managed credentials |

### iOS

| Command / flow | Where it builds | Signing |
|----------------|-----------------|---------|
| Xcode → **Product → Archive** | **Local** (Mac + Xcode) | Same Apple team as Expo (see below) |
| `eas build -p ios --profile production --auto-submit` | **Expo cloud** | Expo-managed Apple credentials |

- Local builds do **not** use Expo Free-plan build quota.
- Cloud builds **do** use Expo quota (and can fail if builds are exhausted for the month).

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

---

## iOS — Expo cloud vs manual Xcode (important)

Expo cloud ek command se sab manage karti hai:

```bash
eas build -p ios --profile production --auto-submit
```

Agar Expo iOS quota khatam ho / local banana ho, **Xcode se manually** Archive + TestFlight/App Store submit kar sakte ho. Android jaisa `credentials/` folder iOS ke liye **zaroori nahi** — Apple team + Xcode signing kaafi hai.

### Same Apple team as Expo (must)

1. Check Expo: [expo.dev](https://expo.dev) → FreshPass → **Credentials** → **iOS** → App Store  
2. Note the **Team** name (for FreshPass this is **`dany daniel (Individual)`**, Team ID `SQ9F854P84`)  
3. In Xcode → **Signing & Capabilities** → Team = **exactly that same team**

Galat / dusri team (e.g. personal other accounts, company teams jo Expo pe nahi) select mat karo — signing / Push / submit mismatch ho sakta hai.

| | Expo EAS | Xcode local |
|--|----------|-------------|
| Certs kahan | Expo credentials (cloud) | Mac Keychain + selected Apple Team |
| Kaun manage | Expo | Xcode Automatic signing |
| Team | Jo Expo pe linked hai | **Wahi same team** |

Expo cloud ke certificates Xcode mein auto-attach nahi hote. Local pe **same Apple Developer team** select karke Xcode khud certs/profiles banati / use karti hai (`Automatically manage signing` ON).

### Push notifications

Push alag se Expo se `.p12` download karke Xcode mein paste karne wali cheez nahi (normal flow).

Zaruri:

1. Apple Developer → App ID `com.freshpass` pe **Push Notifications** enabled  
2. Jo provisioning profile use ho rahi hai usme Push capability ho  
3. App entitlements mein `aps-environment` ho (`ios/FreshPass/FreshPass.entitlements`)  
4. Server-side APNs / FCM key (`.p8` etc.) — ye build signing se **alag** hai  

Expo cloud pe Expo ensure karti hai ke profile Push ke sath bane. Xcode Automatic + **sahi team** pe bhi Push chal sakti hai agar App ID + entitlements theek hon. Archive se pehle Capabilities mein Push verify kar lo.

### Version / build number (`app.json`)

Source of truth:

```json
{
  "expo": {
    "version": "1.0.8",
    "ios": {
      "buildNumber": "54"
    }
  }
}
```

| `app.json` | Xcode / Info.plist |
|------------|-------------------|
| `"version"` | Marketing Version |
| `"ios.buildNumber"` | Build (`CFBundleVersion`) |

- Har TestFlight / App Store upload pe **build number badhao** (55, 56, …).  
- Marketing `version` tab badhao jab app store version change karni ho.  
- Xcode mein Archive se pehle dono values `app.json` se match karke manually set/verify karo (local pe Expo `autoIncrement` nahi chalega).

### Xcode Archive steps (manual release)

1. `ios/` maujood ho (warna `npx expo prebuild --platform ios` + `cd ios && pod install`)  
2. Open **`ios/FreshPass.xcworkspace`** (`.xcodeproj` nahi)  
3. Scheme: **FreshPass** (alag “Release” scheme banane ki zaroorat nahi)  
4. Destination: **Any iOS Device (arm64)** — simulator pe Archive / TestFlight nahi  
5. Signing: **Automatically manage signing** ON + Team = Expo wala same team  
6. Version + Build number check (`app.json` se)  
7. **Product → Archive**  
8. Organizer → Distribute App → App Store Connect / TestFlight  

**Release configuration:** Archive action by default **Release** use karti hai. Confirm: Scheme → **Edit Scheme…** → **Archive** → Build Configuration = `Release`. Simulator pe Run = Debug / Development cert; Archive = Release / Distribution.

### Prebuild (iOS)

- `expo prebuild` `ios/` regenerate kar sakta hai → Xcode signing dubara verify karo (Team select).  
- Android wala `withAndroidReleaseSigning` plugin **iOS ko touch nahi karta**.  
- `buildNumber` / `version` hamesha `app.json` mein rakho taake prebuild ke baad bhi pata rahe.

### Optional: EAS local iOS (no cloud quota)

```bash
eas build -p ios --profile production --local
eas submit --platform ios --path <path-to-ipa>
```

Mac pe build hoti hai; Apple credentials Expo login / local setup se aa sakti hain.

### iOS quick checklist

- [ ] Expo Credentials → iOS pe jo Team hai, Xcode mein **wahi** selected hai  
- [ ] Bundle ID = `com.freshpass`  
- [ ] Automatically manage signing ON  
- [ ] Destination = Any iOS Device (not simulator) before Archive  
- [ ] `version` + `ios.buildNumber` updated / higher than last TestFlight upload  
- [ ] Push / Associated Domains / Sign in with Apple capabilities OK  
- [ ] Archive → Distribute → App Store Connect  

---

## Related files

- `scripts/android-release.js` — local Android release script  
- `plugins/withAndroidReleaseSigning.js` — Android prebuild signing (skipped on EAS)  
- `app.json` — `version`, `android.versionCode`, `ios.buildNumber`  
- `package.json` — `android:release:apk` / `android:release:aab` scripts  
- `ios/FreshPass.xcworkspace` — open this in Xcode for manual iOS Archive  
