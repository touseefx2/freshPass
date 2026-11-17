const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Stripe's CardFormView requires a MaterialComponents theme on Android.
 * The default AppCompat theme causes an InflateException crash.
 */
function withAndroidMaterialTheme(config) {
  return withDangerousMod(config, [
    "android",
    (config) => {
      const stylesPath = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
        "values",
        "styles.xml",
      );
      if (fs.existsSync(stylesPath)) {
        let content = fs.readFileSync(stylesPath, "utf-8");
        content = content.replace(
          "Theme.AppCompat.DayNight.NoActionBar",
          "Theme.MaterialComponents.DayNight.NoActionBar",
        );
        fs.writeFileSync(stylesPath, content, "utf-8");
      }
      return config;
    },
  ]);
}

module.exports = withAndroidMaterialTheme;
