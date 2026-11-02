import React, { useCallback, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import Sortable, { type SortableGridRenderItem } from "react-native-sortables";
import type { AnimatedRef } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
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

interface ServiceListProps<S extends ServiceListItem> {
  services: S[];
  onAdd: () => void;
  onEdit: (serviceId: string) => void;
  /** When set, cards can be rearranged by press + hold + drag */
  onReorder?: (services: S[]) => void;
  /** Parent Animated.ScrollView, enables auto-scroll while dragging */
  scrollableRef?: AnimatedRef<any>;
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
    hintRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
    },
    hintText: {
      flex: 1,
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    empty: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      paddingVertical: moderateHeightScale(16),
    },
  });

export default function ServiceList<S extends ServiceListItem>({
  services,
  onAdd,
  onEdit,
  onReorder,
  scrollableRef,
}: ServiceListProps<S>) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  const renderCardContent = (service: S) => {
    const duration = formatDuration(service.hours, service.minutes);
    const price = formatPrice(service.price);
    return (
      <>
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
      </>
    );
  };

  const renderSortableItem = useCallback<SortableGridRenderItem<S>>(
    ({ item }) => (
      <Sortable.Touchable style={styles.card} onTap={() => onEdit(item.id)}>
        {renderCardContent(item)}
      </Sortable.Touchable>
    ),
    // renderCardContent only reads styles/theme
    [styles, theme, onEdit],
  );

  const handleDragEnd = useCallback(
    ({ data }: { data: S[] }) => {
      if (data.some((service, index) => service.id !== services[index]?.id)) {
        onReorder?.(data);
      }
    },
    [services, onReorder],
  );

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
      ) : onReorder ? (
        <>
          {services.length > 1 && (
            <View style={styles.hintRow}>
              <MaterialIcons
                name="drag-indicator"
                size={moderateWidthScale(16)}
                color={theme.lightGreen}
              />
              <Text style={styles.hintText}>{t("servicesReorderHint")}</Text>
            </View>
          )}
          <Sortable.Grid
            data={services}
            renderItem={renderSortableItem}
            keyExtractor={(service) => service.id}
            columns={1}
            rowGap={moderateHeightScale(12)}
            hapticsEnabled
            dragActivationDelay={250}
            activeItemScale={1.03}
            inactiveItemOpacity={1}
            onDragEnd={handleDragEnd}
            scrollableRef={scrollableRef}
          />
        </>
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
              {renderCardContent(service)}
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}
