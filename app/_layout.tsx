import { ThemedStatusBar } from "@/src/components/themedStatusBar";
import Logger from "@/src/services/logger";
import { setupRTL } from "@/src/constant/functions";
import { initI18n } from "@/src/i18n/index";
import { persistor, store } from "@/src/state/store";
import { Font } from "@/src/theme/fonts";
import { useFonts } from "expo-font";
import { Slot } from "expo-router";
import i18n from "i18next";
import { useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { PortalProvider } from "@gorhom/portal";
import { StripeProvider } from "@stripe/stripe-react-native";
import { NotificationProvider } from "@/src/contexts/NotificationContext";
import SessionExpiredHandler from "@/src/components/SessionExpiredHandler";
import ActionLoader from "@/src/components/actionLoader";
import OnboardingHandler from "@/src/components/OnboardingHandler";
import GuestModeModal from "@/src/components/guestModeModal";
import FullImageModal from "@/src/components/fullImageModal";
import "../global.css";
import * as SystemUI from "expo-system-ui";
import { LogBox } from "react-native";
SystemUI.setBackgroundColorAsync("#FEFAE0");
LogBox.ignoreAllLogs(true);

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [fontsLoaded] = useFonts({
    fontRegular: Font.fontRegular,
    fontMedium: Font.fontMedium,
    fontBold: Font.fontBold,
    fontExtraBold: Font.fontExtraBold,
  });

  useEffect(() => {
    (async () => {
      await initI18n();
      setReady(true);
    })();
  }, []);

  if (!ready || !fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <Provider store={store}>
          <PersistGate
            persistor={persistor}
            loading={null}
            onBeforeLift={async () => {
              // Wait for rehydration to complete from AsyncStorage
              await persistor.flush();

              // Sync i18n with Redux persisted language after rehydration
              if (!i18n || !i18n.isInitialized) {
                return;
              }

              const state = store.getState();

              // Sync language from persisted state
              if (
                state?.general?.language &&
                i18n.language !== state.general.language
              ) {
                try {
                  i18n.changeLanguage(state.general.language);
                  setupRTL(state.general.language);
                } catch (error) {
                  Logger.warn("Error changing language:", error);
                }
              }
            }}
          >
            <StripeProvider
              publishableKey={
                process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
              }
            >
              <PortalProvider>
                <I18nextProvider i18n={i18n}>
                  <NotificationProvider>
                    <ThemedStatusBar />
                    <Slot />
                    <ActionLoader />
                    <GuestModeModal />
                    <FullImageModal />
                    <OnboardingHandler />
                    <SessionExpiredHandler />
                  </NotificationProvider>
                </I18nextProvider>
              </PortalProvider>
            </StripeProvider>
          </PersistGate>
        </Provider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
