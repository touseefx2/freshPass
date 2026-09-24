const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * react-native-compressor pulls TAndroidLame which sets allowBackup=true.
 * Our app sets allowBackup=false — without tools:replace, manifest merger fails.
 */
function withAndroidAllowBackupReplace(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (!application) return config;

    application.$ = application.$ || {};
    application.$["android:allowBackup"] = "false";
    application.$["tools:replace"] = mergeToolsReplace(
      application.$["tools:replace"],
      "android:allowBackup",
    );

    return config;
  });
}

function mergeToolsReplace(existing, attr) {
  const parts = String(existing || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!parts.includes(attr)) parts.push(attr);
  return parts.join(",");
}

module.exports = withAndroidAllowBackupReplace;
