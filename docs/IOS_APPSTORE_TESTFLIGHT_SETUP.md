# iOS – Apple Account, Expo, Push Notifications & TestFlight

Ye guide Fresh-Pass app ko Apple account se link karke, Expo push notifications set karke, aur TestFlight pe deploy karne ke liye hai.

---

## 1. Bundle ID match karo

App Store Connect mein jo app banaya hai (Fresh-Pass), us app ka **Bundle ID** exactly ye hona chahiye:

- **`com.freshpass`**

Ye same hai jo `app.json` mein hai. Agar App Store Connect mein alag bundle ID hai to app ko wahi bundle ID se create karo ya existing app ka bundle ID change karo (agar possible ho).

---

## 2. Apple account ko Expo (EAS) se link karna

Expo EAS build iOS ke liye **Apple Developer account** use karta hai. Login / link karne ka sabse aasan tareeka: **pehla iOS build** run karna.

### Option A: Pehli iOS build (recommended)

Terminal mein project folder mein:

```bash
npx eas-cli login
```

Phir iOS production build chalao:

```bash
npx eas build --platform ios --profile production
```

- Build start hote hi EAS tumse **Apple ID** (Apple Developer wala email) aur **password** maangega.
- Sign in karo — EAS automatically:
  - Distribution certificate
  - Provisioning profiles (App Store)
  - **Push notification key (APNs)**  
    bana kar apne paas store kar lega. Baad ki builds ke liye dubara login ki zaroorat nahi (jab tak credentials revoke na hon).

### Option B: Pehle se credentials set karna

Agar sirf credentials set karna ho (bina build ke):

```bash
npx eas credentials --platform ios
```

Yahan bhi Apple ID se sign in karke EAS sab credentials (push key included) manage kar sakta hai.

---

## 3. Expo Push Notifications (certificate / key)

- iOS push ke liye **APNs key** chahiye. EAS ise **automatically** bana sakta hai jab tum **Option A** ya **Option B** mein Apple ID se login karte ho.
- Certificate alag se upload karne ki zaroorat nahi — EAS push key ko credentials ke sath store karta hai aur Expo Push Service isi use karega.

**Check karne ke liye:**  
[Expo Dashboard](https://expo.dev) → Account **Fresh Pass Org** → Project **Fresh Pass** → **Credentials** → **iOS** → push key yahan dikhna chahiye (build/credentials run ke baad).

---

## 4. iOS build + TestFlight pe bhejna

### Step 1: iOS build

```bash
npx eas build --platform ios --profile production
```

- Build complete hone tak wait karo (Expo dashboard pe status dekho).

### Step 2: TestFlight pe submit

Build success hone ke baad:

```bash
npx eas submit --platform ios --latest
```

- EAS tumse **Apple ID** aur **App-specific password** (agar pehle set nahi kiya) maang sakta hai.
- **App-specific password:**  
  [appleid.apple.com](https://appleid.apple.com) → Sign-In and Security → App-Specific Passwords → generate karo, aur woh password EAS ko do.

Submit ke baad build App Store Connect → TestFlight section mein aa jana chahiye. Wahan se testers ko invite kar sakte ho.

---

## 5. Cheat sheet – commands

| Kaam              | Command                                             |
| ----------------- | --------------------------------------------------- |
| Expo login        | `npx eas-cli login`                                 |
| iOS build         | `npx eas build --platform ios --profile production` |
| TestFlight submit | `npx eas submit --platform ios --latest`            |
| iOS credentials   | `npx eas credentials --platform ios`                |

---

## 6. App Store Connect status

Jab tak app **“Prepare for Submission”** pe hai (jaise screenshot mein), tab tak:

1. EAS se **production build** banao.
2. **`eas submit --platform ios --latest`** se build upload karo.
3. App Store Connect → TestFlight pe build aane ke baad testers add karo.
4. App Store pe release ke liye App Store Connect mein version, screenshots, description waghera bhar kar submit karo.

Agar koi step fail ho (e.g. bundle ID mismatch, certificate error), error message batao to us hisaab se exact fix likh sakte hain.
