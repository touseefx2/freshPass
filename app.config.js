const appJson = require("./app.json");

// Facebook SDK plugin - keys from .env (EXPO_PUBLIC_FACEBOOK_APP_ID, EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN)
// Only include the plugin when appID is set to avoid "missing appID in the plugin properties" during EAS build
const facebookAppId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || "";
const facebookClientToken = process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN || "";

const facebookPlugin = facebookAppId
  ? [
      "react-native-fbsdk-next",
      {
        appID: facebookAppId,
        clientToken: facebookClientToken,
        displayName: "Login with Facebook",
        scheme: `fb${facebookAppId}`,
        advertiserIDCollectionEnabled: false,
        autoLogAppEventsEnabled: false,
        isAutoInitEnabled: true,
      },
    ]
  : null;

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    plugins: [
      ...appJson.expo.plugins,
      ...(facebookPlugin ? [facebookPlugin] : []),
    ],
  },
};
