const { withAppBuildGradle } = require("@expo/config-plugins");

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

/**
 * Injects release signing that reads credentials/keystore.properties
 * so it survives `expo prebuild`.
 */
function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (contents.includes(SIGNING_MARKER)) {
      return config;
    }

    const signingRegex =
      /signingConfigs\s*\{[\s\S]*?buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?signingConfig signingConfigs\.debug/;

    if (!signingRegex.test(contents)) {
      console.warn(
        "[withAndroidReleaseSigning] Could not find default signing block to patch."
      );
      return config;
    }

    contents = contents.replace(signingRegex, RELEASE_SIGNING_BLOCK);
    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withAndroidReleaseSigning;
