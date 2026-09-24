#!/usr/bin/env node
/**
 * Sync iOS version + buildNumber from app.json → Info.plist.
 * If ios/ does NOT exist, runs `npx expo prebuild --clean --platform ios`.
 *
 * Usage:
 *   npm run ios:sync
 *   node scripts/ios-version.js
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const APP_JSON_PATH = path.join(ROOT, "app.json");
const IOS_DIR = path.join(ROOT, "ios");
const INFO_PLIST_PATH = path.join(IOS_DIR, "FreshPass", "Info.plist");

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

function updateInfoPlist(version, buildNumber) {
  if (!fs.existsSync(INFO_PLIST_PATH)) {
    fail(`Info.plist not found at ${INFO_PLIST_PATH}`);
  }

  let plist = fs.readFileSync(INFO_PLIST_PATH, "utf8");

  const nextShort = plist.replace(
    /(<key>CFBundleShortVersionString<\/key>\s*<string>)[^<]*(<\/string>)/,
    `$1${version}$2`
  );
  if (nextShort === plist) {
    fail("Could not find CFBundleShortVersionString in Info.plist");
  }
  plist = nextShort;

  const nextBuild = plist.replace(
    /(<key>CFBundleVersion<\/key>\s*<string>)[^<]*(<\/string>)/,
    `$1${buildNumber}$2`
  );
  if (nextBuild === plist) {
    fail("Could not find CFBundleVersion in Info.plist");
  }
  plist = nextBuild;

  fs.writeFileSync(INFO_PLIST_PATH, plist);
  console.log(`✅ Info.plist  CFBundleShortVersionString → ${version}`);
  console.log(`✅ Info.plist  CFBundleVersion → ${buildNumber}`);
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

  const version = expo.version;
  const buildNumber = expo.ios && expo.ios.buildNumber;

  if (!version) fail("app.json missing expo.version");
  if (!buildNumber) fail("app.json missing expo.ios.buildNumber");

  console.log(`📦 app.json  version=${version}  buildNumber=${buildNumber}`);

  if (!fs.existsSync(IOS_DIR)) {
    console.log("\n📁 ios/ not found — running expo prebuild --clean (ios)…");
    run("npx", ["expo", "prebuild", "--clean", "--platform", "ios"]);
    console.log("\n✅ Done. Native ios/ created from app.json.");
    return;
  }

  updateInfoPlist(String(version), String(buildNumber));
  console.log("\n✅ Done. (ios/ already exists — skipped prebuild)");
}

main();
