const appJson = require("./app.json");

// Facebook SDK plugin - keys from .env (EXPO_PUBLIC_FACEBOOK_APP_ID, EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN)
const facebookAppId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || "";
const facebookClientToken = process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN || "";

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    plugins: [
      ...appJson.expo.plugins,
      [
        "react-native-fbsdk-next",
        {
          appID: facebookAppId,
          clientToken: facebookClientToken,
          displayName: "Login with Facebook",
          scheme: facebookAppId ? `fb${facebookAppId}` : "fb0",
          advertiserIDCollectionEnabled: false,
          autoLogAppEventsEnabled: false,
          isAutoInitEnabled: true,
        },
      ],
    ],
  },
};
