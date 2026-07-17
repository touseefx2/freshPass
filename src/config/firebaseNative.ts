import { Platform } from "react-native";
import googleServicesAndroid from "@/google-services.json";
import googleServicesIos from "@/GoogleService-Info.json";

/**
 * Client Firebase config from native Firebase files:
 * - Android → google-services.json
 * - iOS → GoogleService-Info.json (mirrors GoogleService-Info.plist;
 *   RN/Metro cannot import .plist directly; keep both at project root
 *   so expo prebuild can copy the plist into ios/)
 */
export function getFirebaseProjectConfig() {
  if (Platform.OS === "ios") {
    return {
      projectId: googleServicesIos.PROJECT_ID,
      apiKey: googleServicesIos.API_KEY,
      appId: googleServicesIos.GOOGLE_APP_ID,
    };
  }

  const client = googleServicesAndroid.client[0];

  return {
    projectId: googleServicesAndroid.project_info.project_id,
    apiKey: client.api_key[0].current_key,
    appId: client.client_info.mobilesdk_app_id,
  };
}
