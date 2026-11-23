#!/usr/bin/env node
/**
 * Publish an OTA (EAS Update).
 *
 *   npm run update:dev  -- "message"   → dev builds   (channel development, .env.dev)
 *   npm run update:prod -- "message"   → live builds  (channel production,  .env.prod)
 *
 * Env values come from the local file, NOT from EAS environments: the EAS
 * "production" environment holds dev API values. Refuses to publish when the
 * file's API URL doesn't match the target.
 *
 * Only JS/TS changes. Native changes (new package, permissions, app.json
 * native settings, version bump) need a new build.
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");

const TARGETS = {
  dev: {
    channel: "development",
    envFile: ".env.dev",
    api: "https://dev.getfreshpass.com/",
  },
  prod: {
    channel: "production",
    envFile: ".env.prod",
    api: "https://getfreshpass.com/",
  },
};

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

const target = TARGETS[process.argv[2]];
if (!target) fail("Use: node scripts/ota-update.js dev|prod \"message\"");

const envPath = path.join(ROOT, target.envFile);
if (!fs.existsSync(envPath)) fail(`${target.envFile} not found`);

const env = { ...process.env };
for (const raw of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith("#") || !line.includes("=")) continue;
  const i = line.indexOf("=");
  const key = line.slice(0, i).trim();
  let value = line.slice(i + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  // The env file wins over the shell and over .env (Expo never overrides set vars)
  env[key] = value;
}

if (env.EXPO_PUBLIC_API_BASE_URL !== target.api) {
  fail(
    `${target.envFile} API is "${env.EXPO_PUBLIC_API_BASE_URL}", expected "${target.api}". Not publishing.`,
  );
}

const message = process.argv.slice(3).join(" ").trim();
if (!message) fail(`Add a message: npm run update:${process.argv[2]} -- "what changed"`);

const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, "app.json"), "utf8"));
console.log(
  `\n🚀 OTA → ${target.channel} channel | app version ${appJson.expo.version} | API ${env.EXPO_PUBLIC_API_BASE_URL}\n`,
);

const result = spawnSync(
  "eas",
  ["update", "--channel", target.channel, "--message", message],
  { cwd: ROOT, env, stdio: "inherit" },
);
process.exit(result.status ?? 1);
