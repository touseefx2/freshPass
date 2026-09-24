#!/usr/bin/env node
/**
 * Local Android release build (APK or AAB).
 *
 * - Reads expo.version + android.versionCode from app.json (no auto-bump)
 * - Syncs versionName / versionCode into build.gradle
 * - If android/ missing → expo prebuild --clean --platform android
 * - Re-applies release signing from credentials/
 * - Runs assembleRelease or bundleRelease
 *
 * Usage:
 *   node scripts/android-release.js apk
 *   node scripts/android-release.js aab
 *   npm run android:release:apk
 *   npm run android:release:aab
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const APP_JSON_PATH = path.join(ROOT, "app.json");
const BUILD_GRADLE_PATH = path.join(ROOT, "android", "app", "build.gradle");
const CREDENTIALS_DIR = path.join(ROOT, "credentials");
const KEYSTORE_PROPS = path.join(CREDENTIALS_DIR, "keystore.properties");
const KEYSTORE_JKS = path.join(CREDENTIALS_DIR, "upload-keystore.jks");

const SIGNING_MARKER = "// FreshPass: release signing from credentials/";

const RELEASE_SIGNING_BLOCK = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            ${SIGNING_MARKER}
            def keystorePropertiesFile = rootProject.file("../credentials/keystore.properties")
            def keystoreProperties = new Properties()
            if (keystorePropertiesFile.exists()) {
                keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
                storeFile rootProject.file("../credentials/\${keystoreProperties['storeFile']}")
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Uses Expo upload keystore from credentials/ (gitignored). Falls back to debug if missing.
            if (signingConfigs.release.storeFile != null) {
                signingConfig signingConfigs.release
            } else {
                signingConfig signingConfigs.debug
            }`;

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

function readVersionsFromAppJson() {
  const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, "utf8"));
  const expo = appJson.expo;
  if (!expo) fail("app.json missing expo key");

  const versionName = expo.version;
  const versionCode = expo.android && expo.android.versionCode;

  if (!versionName) fail("app.json missing expo.version");
  if (versionCode == null) fail("app.json missing expo.android.versionCode");

  console.log(`📦 app.json  version=${versionName}  versionCode=${versionCode}`);

  return { versionName: String(versionName), versionCode: Number(versionCode) };
}

function ensureCredentials() {
  if (!fs.existsSync(KEYSTORE_JKS)) {
    fail(`Missing keystore: ${KEYSTORE_JKS}`);
  }
  if (!fs.existsSync(KEYSTORE_PROPS)) {
    fail(`Missing keystore.properties: ${KEYSTORE_PROPS}`);
  }
}

function ensureAndroidProject() {
  if (fs.existsSync(BUILD_GRADLE_PATH)) return;

  console.log(
    "📁 android/ not found — running expo prebuild --clean (android)…"
  );
  const result = spawnSync(
    "npx",
    ["expo", "prebuild", "--clean", "--platform", "android"],
    { cwd: ROOT, stdio: "inherit", shell: true }
  );
  if (result.status !== 0) fail("expo prebuild failed");
  if (!fs.existsSync(BUILD_GRADLE_PATH)) {
    fail("android/app/build.gradle still missing after prebuild");
  }
}

function applyReleaseSigning() {
  let contents = fs.readFileSync(BUILD_GRADLE_PATH, "utf8");

  if (contents.includes(SIGNING_MARKER)) {
    console.log("🔐 Release signing already applied");
    return;
  }

  const signingRegex =
    /signingConfigs\s*\{[\s\S]*?buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?signingConfig signingConfigs\.debug/;

  if (!signingRegex.test(contents)) {
    // Already has a custom release block without our marker — try replacing release signingConfig only
    if (
      contents.includes("signingConfigs.release") ||
      contents.includes('rootProject.file("../credentials/')
    ) {
      console.log("🔐 Custom release signing detected — skipping patch");
      return;
    }
    fail(
      "Could not patch build.gradle signing. Open android/app/build.gradle and check signingConfigs."
    );
  }

  contents = contents.replace(signingRegex, RELEASE_SIGNING_BLOCK);
  fs.writeFileSync(BUILD_GRADLE_PATH, contents);
  console.log("🔐 Release signing applied to build.gradle");
}

function syncVersionsToGradle(versionName, versionCode) {
  let contents = fs.readFileSync(BUILD_GRADLE_PATH, "utf8");

  if (!/versionCode\s+\d+/.test(contents)) {
    fail("versionCode not found in build.gradle");
  }
  if (!/versionName\s+"[^"]*"/.test(contents)) {
    fail("versionName not found in build.gradle");
  }

  contents = contents.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
  contents = contents.replace(
    /versionName\s+"[^"]*"/,
    `versionName "${versionName}"`
  );

  fs.writeFileSync(BUILD_GRADLE_PATH, contents);
  console.log(
    `📝 build.gradle synced → versionName "${versionName}", versionCode ${versionCode}`
  );
}

function runGradle(target) {
  const task = target === "aab" ? "bundleRelease" : "assembleRelease";
  const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";

  console.log(`\n🏗️  Running ${task}...\n`);
  const result = spawnSync(gradlew, [task, "--no-daemon"], {
    cwd: path.join(ROOT, "android"),
    stdio: "inherit",
    shell: true,
  });

  if (result.status !== 0) fail(`${task} failed`);

  const output =
    target === "aab"
      ? path.join(
          ROOT,
          "android/app/build/outputs/bundle/release/app-release.aab"
        )
      : path.join(
          ROOT,
          "android/app/build/outputs/apk/release/app-release.apk"
        );

  if (fs.existsSync(output)) {
    const sizeMb = (fs.statSync(output).size / (1024 * 1024)).toFixed(1);
    console.log(`\n✅ Release ${target.toUpperCase()} ready (${sizeMb} MB)`);
    console.log(`   ${output}\n`);
  } else {
    console.log(`\n✅ Build finished, but output not found at:\n   ${output}\n`);
  }
}

function main() {
  const target = (process.argv[2] || "apk").toLowerCase();
  if (target !== "apk" && target !== "aab") {
    fail('Usage: node scripts/android-release.js [apk|aab]');
  }

  console.log(`\n🚀 Android release (${target.toUpperCase()})\n`);

  ensureCredentials();
  const { versionName, versionCode } = readVersionsFromAppJson();
  ensureAndroidProject();
  syncVersionsToGradle(versionName, versionCode);
  applyReleaseSigning();
  runGradle(target);
}

main();
