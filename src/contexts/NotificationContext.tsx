import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import NotificationBanner from "@/src/components/notificationBanner";

interface NotificationContextType {
  showBanner: (
    title: string,
    message: string,
    type: "success" | "error" | "warning" | "info",
    duration?: number,
  ) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotificationContext must be used within a NotificationProvider",
    );
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerTitle, setBannerTitle] = useState("");
  const [bannerMessage, setBannerMessage] = useState("");
  const [bannerType, setBannerType] = useState<
    "success" | "error" | "warning" | "info"
  >("info");
  const [bannerDuration, setBannerDuration] = useState(4000);

  // Stable identity (state setters never change), so consumers and effects
  // that list showBanner in their deps don't re-run on every banner.
  const showBanner = useCallback(
    (
      title: string,
      message: string,
      type: "success" | "error" | "warning" | "info",
      duration: number = 4000,
    ) => {
      setBannerTitle(title);
      setBannerMessage(message);
      setBannerType(type);
      setBannerDuration(duration);
      setBannerVisible(true);
    },
    [],
  );

  const contextValue: NotificationContextType = useMemo(
    () => ({
      showBanner,
    }),
    [showBanner],
  );

  const handleBannerDismiss = useCallback(() => setBannerVisible(false), []);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <NotificationBanner
        visible={bannerVisible}
        title={bannerTitle}
        message={bannerMessage}
        type={bannerType}
        duration={bannerDuration}
        onDismiss={handleBannerDismiss}
      />
    </NotificationContext.Provider>
  );
};
