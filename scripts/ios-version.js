#!/usr/bin/env node
/**
 * Sync iOS metadata from app.json → Info.plist + Xcode project:
 *   version, buildNumber, display name, app category
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
const PBXPROJ_PATH = path.join(
  IOS_DIR,
  "FreshPass.xcodeproj",
  "project.pbxproj"
);

/** Xcode App Category "Business" */
const APP_CATEGORY = "public.app-category.business";

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

/** Set or insert a <key>…</key><string>…</string> pair in Info.plist. */
function setPlistString(plist, key, value) {
  const re = new RegExp(
    `(<key>${key}<\\/key>\\s*<string>)[^<]*(<\\/string>)`
  );
  if (re.test(plist)) {
    return plist.replace(re, `$1${value}$2`);
  }
  // Insert before root closing </dict></plist>
  const insert = `    <key>${key}</key>\n    <string>${value}</string>\n  `;
  if (!/<\/dict>\s*<\/plist>\s*$/.test(plist)) {
    fail(`Could not insert ${key} — malformed Info.plist`);
  }
  return plist.replace(
    /\n  <\/dict>\s*<\/plist>\s*$/,
    `\n${insert}</dict>\n</plist>\n`
  );
}

function updateInfoPlist({ version, buildNumber, displayName }) {
  if (!fs.existsSync(INFO_PLIST_PATH)) {
    fail(`Info.plist not found at ${INFO_PLIST_PATH}`);
  }

  let plist = fs.readFileSync(INFO_PLIST_PATH, "utf8");

  const shortRe =
    /(<key>CFBundleShortVersionString<\/key>\s*<string>)[^<]*(<\/string>)/;
  if (!shortRe.test(plist)) {
    fail("Could not find CFBundleShortVersionString in Info.plist");
  }
  plist = plist.replace(shortRe, `$1${version}$2`);

  const buildRe = /(<key>CFBundleVersion<\/key>\s*<string>)[^<]*(<\/string>)/;
  if (!buildRe.test(plist)) {
    fail("Could not find CFBundleVersion in Info.plist");
  }
  plist = plist.replace(buildRe, `$1${buildNumber}$2`);

  plist = setPlistString(plist, "CFBundleDisplayName", displayName);
  plist = setPlistString(plist, "LSApplicationCategoryType", APP_CATEGORY);

  fs.writeFileSync(INFO_PLIST_PATH, plist);
  console.log(`✅ Info.plist  CFBundleShortVersionString → ${version}`);
  console.log(`✅ Info.plist  CFBundleVersion → ${buildNumber}`);
  console.log(`✅ Info.plist  CFBundleDisplayName → ${displayName}`);
  console.log(`✅ Info.plist  LSApplicationCategoryType → ${APP_CATEGORY}`);
}

/**
 * Xcode General tab Version/Build come from MARKETING_VERSION / CURRENT_PROJECT_VERSION.
 * Display Name / App Category also surface via INFOPLIST_KEY_* build settings.
 */
function updatePbxproj({ version, buildNumber, displayName }) {
  if (!fs.existsSync(PBXPROJ_PATH)) {
    fail(`project.pbxproj not found at ${PBXPROJ_PATH}`);
  }

  let pbx = fs.readFileSync(PBXPROJ_PATH, "utf8");

  if (!/MARKETING_VERSION\s*=/.test(pbx)) {
    fail("Could not find MARKETING_VERSION in project.pbxproj");
  }
  if (!/CURRENT_PROJECT_VERSION\s*=/.test(pbx)) {
    fail("Could not find CURRENT_PROJECT_VERSION in project.pbxproj");
  }

  pbx = pbx.replace(
    /MARKETING_VERSION = [^;]+;/g,
    `MARKETING_VERSION = ${version};`
  );
  pbx = pbx.replace(
    /CURRENT_PROJECT_VERSION = [^;]+;/g,
    `CURRENT_PROJECT_VERSION = ${buildNumber};`
  );

  pbx = setOrInsertBuildSetting(
    pbx,
    "INFOPLIST_KEY_CFBundleDisplayName",
    displayName
  );
  pbx = setOrInsertBuildSetting(
    pbx,
    "INFOPLIST_KEY_LSApplicationCategoryType",
    APP_CATEGORY
  );

  fs.writeFileSync(PBXPROJ_PATH, pbx);
  console.log(`✅ project.pbxproj  MARKETING_VERSION → ${version}`);
  console.log(`✅ project.pbxproj  CURRENT_PROJECT_VERSION → ${buildNumber}`);
  console.log(
    `✅ project.pbxproj  INFOPLIST_KEY_CFBundleDisplayName → ${displayName}`
  );
  console.log(
    `✅ project.pbxproj  INFOPLIST_KEY_LSApplicationCategoryType → ${APP_CATEGORY}`
  );
}

/** Replace existing build setting, or insert into each target buildSettings block that has MARKETING_VERSION. */
function setOrInsertBuildSetting(pbx, key, value) {
  const assign = `${key} = ${value};`;
  const existing = new RegExp(`${key}\\s*=\\s*[^;]+;`, "g");
  if (pbx.match(existing)) {
    return pbx.replace(existing, assign);
  }

  // Insert after MARKETING_VERSION lines (Debug + Release app target configs)
  return pbx.replace(
    /(MARKETING_VERSION = [^;]+;)/g,
    `$1\n\t\t\t\t${assign}`
  );
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
  const displayName = expo.name;

  if (!version) fail("app.json missing expo.version");
  if (!buildNumber) fail("app.json missing expo.ios.buildNumber");
  if (!displayName) fail("app.json missing expo.name");

  console.log(
    `📦 app.json  name=${displayName}  version=${version}  buildNumber=${buildNumber}`
  );
  console.log(`📦 app category → Business (${APP_CATEGORY})`);

  if (!fs.existsSync(IOS_DIR)) {
    console.log("\n📁 ios/ not found — running expo prebuild --clean (ios)…");
    run("npx", ["expo", "prebuild", "--clean", "--platform", "ios"]);
    console.log("\n✅ Done. Native ios/ created from app.json.");
    return;
  }

  const meta = {
    version: String(version),
    buildNumber: String(buildNumber),
    displayName: String(displayName),
  };
  updateInfoPlist(meta);
  updatePbxproj(meta);
  console.log("\n✅ Done. (ios/ already exists — skipped prebuild)");
}

main();
