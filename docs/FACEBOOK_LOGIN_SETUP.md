# Facebook Login Setup (iOS + Android)

Yeh guide **Facebook Developer Console** me app banane, **Android / iOS** add karne, aur **keys nikal kar project me lagane** ka step-by-step batati hai.  
Prebuild use ho raha hai, isliye keys **app.json me direct nahi** — **`.env`** me daalte hain; **`app.config.js`** unhe read karke native config (prebuild ke dauran) inject karta hai.

---

## 1. Package (already installed)

- **Package:** `react-native-fbsdk-next`
- **Config:** `app.config.js` me plugin add hai; keys **`.env`** se aati hain.

---

## 2. Facebook Developer Console – App banana

### 2.1 Developer account / login

1. Browser me jao: **https://developers.facebook.com**
2. Facebook se **login** karo.
3. Agar pehli bar ho to **Register as developer** complete karo (agree to terms, etc.).

### 2.2 Naya app create karna

1. **https://developers.facebook.com/apps/creation/** open karo.
2. **App type:**
   - **“Consumer”** (ya jo option “Facebook Login” / “Authenticate users” wala ho) select karo.
   - Ya **“Other”** select karke baad me **Facebook Login** product add kar sakte ho.
3. **Use case select karo:**
   - **“Authenticate and request data from users with Facebook Login”** (ya “Facebook Login”) select karo.
   - Next.
4. **App name:** e.g. `Fresh Pass`
5. **Contact email:** apna email
6. **Business (optional):** “I don’t want to connect a business portfolio yet” choose kar sakte ho.
7. **Create app** / **Go to dashboard** pe click karo.

Ab app dashboard open hoga. Yahan se **App ID** aur **Client Token** nikalo (Step 4), aur **iOS / Android** add karo (Step 3).

---

## 3. iOS platform add karna

1. Left sidebar me **“Use cases”** / **“Products”** me **“Facebook Login”** pe jao (agar already add nahi hai to **“Add product”** se **Facebook Login** add karo).
2. **Facebook Login** > **Settings** (ya **“Facebook Login”** ke andar **Settings**).
3. **“Settings”** / **“Basic”** me **“Add Platform”** ya **“iOS”** dhundho.
4. **iOS** select karo.
5. Ye values daalo:
   - **Bundle ID:** `com.freshpass` (tumhare `app.json` me jo `ios.bundleIdentifier` hai wahi).
   - **Single Sign On:** On rehne do (recommended).
6. Save karo.

**Note:** App ID aur Client Token **Settings > Basic** se milenge (Step 4).

---

## 4. Android platform add karna

1. Same **Facebook Login** > **Settings** (ya **Products** > **Facebook Login**).
2. **“Add Platform”** > **Android**.
3. Ye values daalo:
   - **Package Name:** `com.freshpass` (tumhare `app.json` me `android.package` jaisa).
   - **Default Activity Class Name:** (optional) empty chhod sakte ho; Expo/React Native ise handle karta hai.
4. **Key Hashes** zaroor add karo (bin iske Android login fail ho sakta hai):

   **Debug key hash (development):**

   ```bash
   keytool -exportcert -alias androiddebugkey -keystore ~/.android/debug.keystore -storepass android -keypass android | openssl sha1 -binary | openssl base64
   ```

   **Release key hash (production / EAS):**  
   EAS build ke liye jo keystore use hota hai us se hash banao, ya EAS dashboard se “App credentials” me SHA-1 dekh kar Facebook docs ke hisaab se key hash bana sakte ho.  
   Example (apna keystore path / alias daal kar):

   ```bash
   keytool -exportcert -alias YOUR_KEY_ALIAS -keystore path/to/your/upload-keystore.keystore | openssl sha1 -binary | openssl base64
   ```

   In dono hashes ko Facebook me **Key Hashes** field me add karo (ek line me ek hash).

5. Save karo.

---

## 5. Keys nikalna (App ID + Client Token)

1. Left sidebar me **“Settings”** > **“Basic”** pe jao.
2. Yahan dikhenge:
   - **App ID** (number, e.g. `1234567890123456`)
   - **App Secret** (backend ke liye; client app me **mat** daalna)
3. **Client Token:**
   - Neeche scroll karo, **“Client token”** field milega.
   - Agar nahi dikhe to **“Show”** / **“Generate”** se generate karke copy karo.
   - Yeh token **native SDK** (react-native-fbsdk-next) ke liye chahiye.

In dono ko apne **project me `.env` me lagana hai** (next step).

---

## 6. Project me keys lagana (.env – prebuild ke liye)

Kyunki **android / ios** folders prebuild se delete ho kar dubara bante hain, isliye keys **app.json me hardcode nahi** karte.  
Keys **`.env`** me rehti hain; **`app.config.js`** unhe padhta hai aur **prebuild** ke time native config (iOS Info.plist, Android manifest/strings) me daal deta hai.

### 6.1 `.env` me variables add karo

Project root ki **`.env`** file me ye lines add karo (values Facebook **Settings > Basic** se):

```env
# Facebook Login (react-native-fbsdk-next)
EXPO_PUBLIC_FACEBOOK_APP_ID=your_facebook_app_id_number
EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN=your_facebook_client_token
```

Example (fake values):

```env
EXPO_PUBLIC_FACEBOOK_APP_ID=1234567890123456
EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN=abc123def456...
```

- **EXPO_PUBLIC_FACEBOOK_APP_ID** = App ID (sirf number, no quotes).
- **EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN** = Client token (Settings > Basic se).

### 6.2 Kahan lagate hain (summary)

| Cheez              | Kahan lagani hai                                          |
| ------------------ | --------------------------------------------------------- |
| App ID             | `.env` → `EXPO_PUBLIC_FACEBOOK_APP_ID`                    |
| Client Token       | `.env` → `EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN`              |
| iOS Bundle ID      | Facebook Console → iOS platform → `com.freshpass`         |
| Android Package    | Facebook Console → Android platform → `com.freshpass`     |
| Android Key Hashes | Facebook Console → Android → Key Hashes (debug + release) |

**app.json / app.config.js:**

- **app.json** me Facebook keys **mat** daalo.
- **app.config.js** already **`process.env.EXPO_PUBLIC_FACEBOOK_APP_ID`** aur **`EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN`** use karta hai; bas **`.env`** me values set karo.

---

## 7. Prebuild / build

1. **`.env`** save karo (App ID + Client Token ke sath).
2. Native folders regenerate karo:
   ```bash
   npx expo prebuild --clean
   ```
3. Development run:
   - Android: `npx expo run:android`
   - iOS: `npx expo run:ios`
4. EAS build (production):
   - EAS ke environment me bhi **EXPO_PUBLIC_FACEBOOK_APP_ID** aur **EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN** set karo (EAS dashboard → Project → Environment variables), taake cloud build me ye values inject hon.

---

## 8. Checklist

- [ ] Facebook Developer Console me app bana li (Facebook Login use case).
- [ ] **iOS** platform add ki, Bundle ID = `com.freshpass`.
- [ ] **Android** platform add ki, Package name = `com.freshpass`, **Key Hashes** (debug + release) add kiye.
- [ ] **Settings > Basic** se **App ID** aur **Client Token** copy kiye.
- [ ] **`.env`** me `EXPO_PUBLIC_FACEBOOK_APP_ID` aur `EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN` set kiye.
- [ ] `npx expo prebuild --clean` chala kar app test ki (Facebook login button se).

Iske baad Facebook login flow (e.g. `handleFacebookLogin` / `LoginManager` + `AccessToken`) same code se kaam karega; token backend ko bhej kar social login complete karo.
