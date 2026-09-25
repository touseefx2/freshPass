import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AppImage from "@/src/components/AppImage";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  iconScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import ModalizeBottomSheet from "@/src/components/modalizeBottomSheet";

export interface OverlapAppointmentItem {
  id: string;
  title: string;
  clientName: string;
  avatarUrl: string;
  timeLabel: string;
  duration: string;
  statusLabel: string;
  accent: string;
  background: string;
}

interface OverlappingAppointmentsSheetProps {
  visible: boolean;
  onClose: () => void;
  slotLabel: string;
  appointments: OverlapAppointmentItem[];
  onSelect: (id: string) => void;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    subtitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(14),
    },
    list: {
      gap: moderateHeightScale(10),
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      borderRadius: moderateWidthScale(14),
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderLeftWidth: moderateWidthScale(4),
      paddingHorizontal: moderateWidthScale(12),
      paddingVertical: moderateHeightScale(12),
    },
    avatar: {
      width: widthScale(42),
      height: widthScale(42),
      borderRadius: widthScale(21),
      backgroundColor: theme.emptyProfileImage,
    },
    info: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    clientName: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "capitalize",
    },
    serviceTitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreenLight,
      textTransform: "capitalize",
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: moderateWidthScale(6),
      marginTop: moderateHeightScale(2),
    },
    metaText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    statusBadge: {
      backgroundColor: theme.appointmentStatus,
      paddingHorizontal: moderateWidthScale(6),
      paddingVertical: moderateHeightScale(2),
      borderRadius: moderateWidthScale(4),
    },
    statusBadgeText: {
      fontSize: fontSize.size10,
      fontFamily: fonts.fontMedium,
      color: theme.appointmentStatusText,
    },
    chevronWrap: {
      paddingLeft: moderateWidthScale(4),
    },
  });

export default function OverlappingAppointmentsSheet({
  visible,
  onClose,
  slotLabel,
  appointments,
  onSelect,
}: OverlappingAppointmentsSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  const sheetHeightPercent = appointments.length > 2 ? 0.55 : undefined;

  return (
    <ModalizeBottomSheet
      visible={visible}
      onClose={onClose}
      title={t("slotAppointmentsTitle")}
      modalHeightPercent={sheetHeightPercent}
      showsVerticalScrollIndicator={appointments.length > 2}
    >
      <Text style={styles.subtitle}>
        {t("slotAppointmentsSubtitle", {
          count: appointments.length,
          time: slotLabel,
        })}
      </Text>
      <View style={styles.list}>
        {appointments.map((appointment) => (
          <TouchableOpacity
            key={appointment.id}
            style={[
              styles.card,
              {
                borderLeftColor: appointment.accent,
                backgroundColor: appointment.background,
              },
            ]}
            activeOpacity={0.75}
            onPress={() => onSelect(appointment.id)}
          >
            <AppImage
              uri={appointment.avatarUrl}
              style={styles.avatar}
              resizeMode="cover"
            />
            <View style={styles.info}>
              <Text numberOfLines={1} style={styles.clientName}>
                {appointment.clientName}
              </Text>
              <Text numberOfLines={1} style={styles.serviceTitle}>
                {appointment.title}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                  {appointment.timeLabel} • {appointment.duration}
                </Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>
                    {appointment.statusLabel}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.chevronWrap}>
              <Feather
                name="chevron-right"
                size={iconScale(18)}
                color={theme.lightGreen}
              />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ModalizeBottomSheet>
  );
}
