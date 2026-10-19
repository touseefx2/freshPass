const { withAppBuildGradle } = require("@expo/config-plugins");

const MARKER = "// FreshPass: Crashlytics native symbols";

const BLOCK = `
${MARKER}
// Lets the uploadCrashlyticsSymbolFileRelease task (run by EAS, see eas.json)
// send NDK symbols so native crashes (SIGABRT etc.) show real frames.
plugins.withId("com.google.firebase.crashlytics") {
    android.buildTypes.release {
        firebaseCrashlytics {
            nativeSymbolUploadEnabled true
        }
    }
}
`;

/**
 * Turns on Crashlytics NDK symbol upload for release builds. Appended at the
 * end (not inside buildTypes.release) because withAndroidReleaseSigning
 * rewrites that block for local builds.
 */
function withCrashlyticsNativeSymbols(config) {
  return withAppBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes(MARKER)) {
      config.modResults.contents += BLOCK;
    }
    return config;
  });
}

module.exports = withCrashlyticsNativeSymbols;
