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

// Invite a Pro test links (https://dev.getfreshpass.com/invite/{code}): only
// in builds that talk to the dev API, never in a release on the live API.
const DEV_INVITE_HOST = "dev.getfreshpass.com";
const usesDevApi = (process.env.EXPO_PUBLIC_API_BASE_URL || "").includes(
  `//${DEV_INVITE_HOST}`,
);

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    ios: {
      ...appJson.expo.ios,
      associatedDomains: [
        ...(appJson.expo.ios.associatedDomains || []),
        ...(usesDevApi ? [`applinks:${DEV_INVITE_HOST}`] : []),
      ],
    },
    android: {
      ...appJson.expo.android,
      intentFilters: [
        ...(appJson.expo.android.intentFilters || []),
        ...(usesDevApi
          ? [
              {
                action: "VIEW",
                autoVerify: true,
                data: [
                  {
                    scheme: "https",
                    host: DEV_INVITE_HOST,
                    pathPrefix: "/invite/",
                  },
                ],
                category: ["BROWSABLE", "DEFAULT"],
              },
            ]
          : []),
      ],
    },
    plugins: [
      ...appJson.expo.plugins,
      "./plugins/withIosModularHeaders",
      "./plugins/withAndroidReleaseSigning",
      "./plugins/withAndroidAllowBackupReplace",
      "./plugins/withCrashlyticsNativeSymbols",
      ...(facebookPlugin ? [facebookPlugin] : []),
    ],
  },
};
