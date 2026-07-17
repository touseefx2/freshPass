import { useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/src/state/store";
import {
  clearFirebaseUser,
  initFirebaseMonitoring,
  setFirebaseUser,
} from "@/src/services/firebaseMonitoring";

/**
 * Boots Crashlytics/Analytics once, then keeps user id + role in sync with Redux.
 */
export default function FirebaseMonitoringHandler() {
  const userId = useSelector((state: RootState) => state.user.id);
  const userRole = useSelector((state: RootState) => state.user.userRole);
  const isGuest = useSelector((state: RootState) => state.user.isGuest);

  useEffect(() => {
    void initFirebaseMonitoring();
  }, []);

  useEffect(() => {
    if (!userId || isGuest) {
      void clearFirebaseUser();
      return;
    }

    void setFirebaseUser({
      userId,
      role: userRole,
    });
  }, [userId, userRole, isGuest]);

  return null;
}
