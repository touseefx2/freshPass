const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Firebase iOS Swift pods require modular headers when using
 * use_frameworks: static (required by @react-native-firebase).
 */
const MODULAR_HEADER_PODS = [
  "GoogleUtilities",
  "RecaptchaInterop",
  "FirebaseCore",
  "FirebaseCoreInternal",
  "FirebaseInstallations",
  "GoogleDataTransport",
  "nanopb",
];

function withIosModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );
      let podfile = fs.readFileSync(podfilePath, "utf8");

      const missingPods = MODULAR_HEADER_PODS.filter(
        (pod) => !podfile.includes(`pod '${pod}', :modular_headers`)
      );

      if (missingPods.length === 0) {
        return config;
      }

      const patch = missingPods
        .map((pod) => `  pod '${pod}', :modular_headers => true`)
        .join("\n");

      if (!podfile.includes("config = use_native_modules!(config_command)")) {
        return config;
      }

      podfile = podfile.replace(
        "config = use_native_modules!(config_command)",
        `config = use_native_modules!(config_command)\n${patch}`
      );
      fs.writeFileSync(podfilePath, podfile);

      return config;
    },
  ]);
}

module.exports = withIosModularHeaders;
