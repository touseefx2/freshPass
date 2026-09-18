const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Optional web peer of lottie-react-native — stub so Metro web/SSR
  // doesn't fail on a mobile-first project that never ships web Lottie.
  if (moduleName === "@lottiefiles/dotlottie-react") {
    return {
      type: "sourceFile",
      filePath: path.resolve(__dirname, "src/shims/dotlottie-react.web.tsx"),
    };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
