#!/usr/bin/env node
/**
 * Sync Android versionName + versionCode from app.json → build.gradle.
 * If android/ does NOT exist, runs `npx expo prebuild --clean --platform android`.
 *
 * Usage:
 *   npm run android:sync
 *   node scripts/android-version.js
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const APP_JSON_PATH = path.join(ROOT, "app.json");
const ANDROID_DIR = path.join(ROOT, "android");
const BUILD_GRADLE_PATH = path.join(ANDROID_DIR, "app", "build.gradle");

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

function syncVersionsToGradle(versionName, versionCode) {
  if (!fs.existsSync(BUILD_GRADLE_PATH)) {
    fail(`build.gradle not found at ${BUILD_GRADLE_PATH}`);
  }

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
  console.log(`✅ build.gradle  versionName → "${versionName}"`);
  console.log(`✅ build.gradle  versionCode → ${versionCode}`);
}

function run(cmd, args) {
  console.log(`\n▶ ${cmd} ${args.join(" ")}\n`);
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    fail(`Command failed: ${cmd} ${args.join(" ")}`);
  }
}

function main() {
  const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, "utf8"));
  const expo = appJson.expo;
  if (!expo) fail("app.json missing expo key");

  const versionName = expo.version;
  const versionCode = expo.android && expo.android.versionCode;

  if (!versionName) fail("app.json missing expo.version");
  if (versionCode == null) fail("app.json missing expo.android.versionCode");

  console.log(
    `📦 app.json  version=${versionName}  versionCode=${versionCode}`
  );

  if (!fs.existsSync(ANDROID_DIR)) {
    console.log(
      "\n📁 android/ not found — running expo prebuild --clean (android)…"
    );
    run("npx", ["expo", "prebuild", "--clean", "--platform", "android"]);
    console.log("\n✅ Done. Native android/ created from app.json.");
    return;
  }

  syncVersionsToGradle(String(versionName), Number(versionCode));
  console.log("\n✅ Done. (android/ already exists — skipped prebuild)");
}

main();
