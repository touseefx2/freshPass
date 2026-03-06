import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Share,
  StatusBar,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { createStyles } from "./styles";
import StackHeader from "@/src/components/StackHeader";
import { ApiService } from "@/src/services/api";
import { memoriesEndpoints, chatEndpoints } from "@/src/services/endpoints";
import { useDownloadMedia } from "@/src/hooks/useDownloadMedia";
import { useNotificationContext } from "@/src/contexts/NotificationContext";
import { openFullImageModal } from "@/src/state/slices/generalSlice";
import MemorySectionModal, {
  type MemoryItem,
  type MemorySection,
} from "@/src/components/MemorySectionModal";
import type { PotentialContact } from "@/src/components/PotentialContactsModal";

/** Get ISO week key (e.g. "2026-W10") for grouping */

export default function AiMemories() {
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  const { showBanner } = useNotificationContext();

  return (
    <View style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.darkGreen}
        translucent
      />
      <StackHeader title={"List"} />
    </View>
  );
}
