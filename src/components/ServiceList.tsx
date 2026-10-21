import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";

export interface ServiceListItem {
  id: string;
  name: string;
  hours: number;
  minutes: number;
  price: number | string;
}

interface ServiceListProps {
  services: ServiceListItem[];
  onAdd: () => void;
  onEdit: (serviceId: string) => void;
}

const formatDuration = (hours: number, minutes: number): string => {
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} hr`);
  if (minutes > 0) parts.push(`${minutes} min`);
  return parts.join(" ") || "0 min";
};

const formatPrice = (price: number | string): string => {
  const value = typeof price === "string" ? parseFloat(price || "0") : price;
  return `$${(value || 0).toFixed(2)}`;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: {
      gap: moderateHeightScale(12),
    },
    addButton: {
      minHeight: heightScale(50),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.buttonBack,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      marginBottom: moderateHeightScale(4),
    },
    addButtonText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: heightScale(76),
      paddingVertical: moderateHeightScale(16),
      paddingLeft: moderateWidthScale(18),
      paddingRight: moderateWidthScale(12),
      borderRadius: moderateWidthScale(10),
      borderWidth: 1,
      borderColor: theme.lightGreen015,
      backgroundColor: theme.background,
    },
    info: {
      flex: 1,
      gap: moderateHeightScale(4),
      marginRight: moderateWidthScale(12),
    },
    name: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    duration: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    price: {
      alignSelf: "flex-start",
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    chevron: {
      marginLeft: moderateWidthScale(6),
    },
    empty: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      paddingVertical: moderateHeightScale(16),
    },
  });

export default function ServiceList({
  services,
  onAdd,
  onEdit,
}: ServiceListProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.addButton}
        onPress={onAdd}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        <Feather name="plus" size={moderateWidthScale(20)} color={theme.white} />
        <Text style={styles.addButtonText}>Add Service</Text>
      </TouchableOpacity>

      {services.length === 0 ? (
        <Text style={styles.empty}>You haven't added any service yet</Text>
      ) : (
        services.map((service) => {
          const duration = formatDuration(service.hours, service.minutes);
          const price = formatPrice(service.price);
          return (
            <TouchableOpacity
              key={service.id}
              style={styles.card}
              onPress={() => onEdit(service.id)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${service.name}, ${duration}, ${price}`}
              accessibilityHint="Opens the service editor"
            >
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={2}>
                  {service.name}
                </Text>
                <Text style={styles.duration}>{duration}</Text>
              </View>
              <Text style={styles.price}>{price}</Text>
              <Feather
                name="chevron-right"
                size={moderateWidthScale(20)}
                color={theme.lightGreen}
                style={styles.chevron}
              />
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}
