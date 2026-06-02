# App Store Resubmission Guide (Fresh Pass 1.0.1)

Use this when submitting a new build after the privacy / AI rejections.

## What changed in the app (build 1.0.1)

### Guideline 4.5.4 – Push notifications (previous rejection)
- Login, signup, and social login **no longer require** notification permission.
- Push token is sent only when the user has already granted notifications (optional).

### Guideline 5.1.1(ii) – Location purpose string
- Added `expo-location` plugin and `NSLocationWhenInUseUsageDescription` with a specific explanation and example (nearby salons in Explore / bookings).
- **Verify on device:** Settings → Fresh Pass → Location shows the new text (requires a new native build).

### Guidelines 5.1.1(i) & 5.1.2(i) – Third-party AI consent
- **AI Hair Try-On:** consent modal before first use (Replicate) – unchanged, already present.
- **AI Chat:** new consent modal before the first message is sent to the AI service.
- **AI Voice Receptionist:** new consent modal before opening voice mode / before the mic streams audio.

### Guideline 2.1 – Face data
- In-app consent and privacy policy Section 1.4 already describe face/image use.
- Reply to App Review with the answers below (do not rely on the binary alone).

---

## Before you upload

1. **Increment iOS build number** in App Store Connect (or `eas.json` / `app.json` `ios.buildNumber`).
2. Create a **new production build** (EAS or Xcode) so Info.plist includes the new location string.
3. Confirm **App Privacy** labels in App Store Connect match reality (Location, User Content, Identifiers, etc.).
4. Privacy Policy URL: https://getfreshpass.com/privacy-policy

---

## App Review Information (paste into App Store Connect)

### Notes for reviewer

```
Demo account: [YOUR_DEMO_EMAIL]
Password: [YOUR_DEMO_PASSWORD]

Push notifications are optional. Users can log in and use the app without enabling notifications.

Location: Used only to show nearby businesses in Explore and when setting a booking area. Users can deny location and continue using the app.

AI Hair Try-On (optional): User must tap "Agree & Continue" on a consent screen before any photo is sent to Replicate, Inc. User can tap "Not Now" and skip.

AI Chat (optional): User must agree on a consent screen before any chat text is sent to our AI service.

AI Voice Receptionist (optional): User must agree before voice audio is sent. User can decline and use the rest of the app.

Face data: Collected only when the user voluntarily uploads a photo for AI Hair Try-On. See Privacy Policy Section 1.4.
```

### Reply for Guideline 2.1 (Face data) – copy into Resolution Center

**What face data does the app collect?**  
Only a user-uploaded photograph for the optional AI Hair Try-On feature, which may include the user’s face.

**Planned uses:**  
Generate hairstyle preview images; analyze face shape, skin tone, and approximate age solely to recommend hairstyles. Not used for biometric identification or face recognition.

**Shared with third parties? Where stored?**  
Images and optional text prompts are sent via HTTPS to Replicate, Inc. (United States) for processing. Original uploads are not stored long-term on FreshPass servers; processing copies are deleted from Replicate within 24 hours per our policy.

**Retention:**  
Replicate: within 24 hours after job completion. FreshPass: job metadata and result URLs up to 30 days (see Privacy Policy Section 4).

**Privacy policy sections:**  
Section 1.4 (Face & Image Data), Section 3 (sharing table – Replicate), Section 4 (retention), Section 6 (rights / withdraw consent).

**Quote from policy (Section 1.4):**  
"Our AI Hair Try-On feature allows you to upload a photo to receive personalised hairstyle previews... your uploaded image and any text prompt you provide are transmitted securely (via HTTPS) to our AI processing partner, Replicate, Inc.... Uploaded images are held temporarily on the AI processing servers... and are automatically deleted within 24 hours of job completion."

---

## Tester checklist (you should verify)

- [ ] Login works with notifications **denied**
- [ ] Location dialog shows **new** purpose text (not only "Allow FreshPass to access your location")
- [ ] AI Hair Try-On shows consent → Agree → works; Not Now → no upload
- [ ] AI Chat: first message shows consent → Agree → reply; Not Now → no API call
- [ ] AI Voice: Talk with Freshy shows consent → Agree → call works; Not Now → no stream

---

## If rejected again

- Check reviewer screenshots against the build version (1.0.1+).
- Ensure the submitted build was built **after** these commits (clean prebuild for iOS).
- Update privacy policy if your actual AI vendor differs from Replicate / FreshPass backend.
