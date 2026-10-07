import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";

type IconName = keyof typeof MaterialIcons.glyphMap;

export type TemplateOption = {
  id: number;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  icon?: IconName;
};

type Props = {
  options: TemplateOption[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  placeholder: string;
  disabled?: boolean;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    shell: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(20),
      borderWidth: 1.5,
      borderColor: theme.borderNormal,
      overflow: "hidden",
    },
    shellOpen: {
      borderColor: theme.buttonBack,
    },
    head: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      minHeight: heightScale(66),
      paddingHorizontal: moderateWidthScale(16),
    },
    headIcon: {
      width: widthScale(44),
      height: widthScale(44),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    headImage: { width: "100%", height: "100%" },
    headText: { flex: 1, minWidth: 0 },
    value: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    placeholder: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.borderNormal,
    },
    state: {
      alignItems: "center",
      gap: moderateHeightScale(8),
      paddingVertical: moderateHeightScale(20),
      paddingHorizontal: moderateWidthScale(16),
    },
    stateText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
    },
    retry: {
      marginTop: moderateHeightScale(4),
      minHeight: heightScale(44),
      paddingHorizontal: moderateWidthScale(22),
      borderRadius: heightScale(22),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    retryText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.white,
    },
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      minHeight: heightScale(76),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(10),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.borderLight,
    },
    optionActive: {
      backgroundColor: theme.lightGreen07,
    },
    thumb: {
      width: widthScale(56),
      height: widthScale(56),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.lightGreen07,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    thumbImage: { width: "100%", height: "100%" },
    optionText: { flex: 1, minWidth: 0 },
    optionName: {
      fontSize: fontSize.size17,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    optionDesc: {
      marginTop: moderateHeightScale(2),
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: fontSize.size19,
    },
    check: {
      width: widthScale(28),
      height: widthScale(28),
      borderRadius: widthScale(14),
      backgroundColor: theme.buttonBack,
      alignItems: "center",
      justifyContent: "center",
    },
  });

/**
 * Template picker shown as a dropdown (closed row → list). Opens on its own
 * while nothing is picked so the first tap already chooses a template.
 */
export default function TemplateDropdown({
  options,
  selectedId,
  onSelect,
  loading,
  error,
  onRetry,
  placeholder,
  disabled = false,
}: Props) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [open, setOpen] = useState(selectedId == null);
  // Open again if the selection is cleared (e.g. template turned off by admin);
  // close when one gets picked for the user (only one template available).
  const hadSelection = useRef(selectedId != null);
  useEffect(() => {
    if (selectedId == null && hadSelection.current) setOpen(true);
    if (selectedId != null && !hadSelection.current) setOpen(false);
    hadSelection.current = selectedId != null;
  }, [selectedId]);

  const selected = options.find((o) => o.id === selectedId) ?? null;

  const renderThumb = (option: TemplateOption, style: object, imageStyle: object) => (
    <View style={style}>
      {option.imageUrl ? (
        <Image
          source={{ uri: option.imageUrl }}
          style={imageStyle}
          contentFit="cover"
          transition={120}
        />
      ) : (
        <MaterialIcons
          name={option.icon ?? "movie-filter"}
          size={moderateWidthScale(24)}
          color={theme.buttonBack}
        />
      )}
    </View>
  );

  return (
    <View style={[styles.shell, open && styles.shellOpen]}>
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.head}
        onPress={() => setOpen((v) => !v)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={selected ? selected.name : placeholder}
        accessibilityHint={t("templateDropdownHint")}
        accessibilityState={{ expanded: open, disabled }}
      >
        {selected ? (
          renderThumb(selected, styles.headIcon, styles.headImage)
        ) : (
          <View style={styles.headIcon}>
            <MaterialIcons
              name="dashboard-customize"
              size={moderateWidthScale(22)}
              color={theme.buttonBack}
            />
          </View>
        )}
        <View style={styles.headText}>
          <Text
            style={selected ? styles.value : styles.placeholder}
            numberOfLines={1}
          >
            {selected?.name ?? placeholder}
          </Text>
        </View>
        <MaterialIcons
          name={open ? "expand-less" : "expand-more"}
          size={moderateWidthScale(30)}
          color={theme.darkGreen}
        />
      </TouchableOpacity>

      {open ? (
        <>
          <View style={styles.divider} />
          {loading ? (
            <View style={styles.state}>
              <ActivityIndicator color={theme.buttonBack} />
              <Text style={styles.stateText}>{t("loadingTemplates")}</Text>
            </View>
          ) : error ? (
            <View style={styles.state} accessibilityRole="alert">
              <MaterialIcons
                name="error-outline"
                size={moderateWidthScale(28)}
                color={theme.red}
              />
              <Text style={styles.stateText}>{error}</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.retry}
                onPress={onRetry}
                accessibilityRole="button"
              >
                <Text style={styles.retryText}>{t("retry")}</Text>
              </TouchableOpacity>
            </View>
          ) : options.length === 0 ? (
            <View style={styles.state}>
              <Text style={[styles.stateText, styles.optionName]}>
                {t("noTemplatesYet")}
              </Text>
              <Text style={styles.stateText}>{t("noTemplatesSubtitle")}</Text>
            </View>
          ) : (
            options.map((option) => {
              const active = option.id === selectedId;
              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  key={option.id}
                  onPress={() => {
                    onSelect(option.id);
                    setOpen(false);
                  }}
                  disabled={disabled}
                  style={[
                    styles.option,
                    active && styles.optionActive,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={option.name}
                  accessibilityHint={option.description ?? undefined}
                  accessibilityState={{ selected: active }}
                >
                  {renderThumb(option, styles.thumb, styles.thumbImage)}
                  <View style={styles.optionText}>
                    <Text style={styles.optionName} numberOfLines={1}>
                      {option.name}
                    </Text>
                    {option.description ? (
                      <Text style={styles.optionDesc} numberOfLines={2}>
                        {option.description}
                      </Text>
                    ) : null}
                  </View>
                  {active ? (
                    <View style={styles.check}>
                      <MaterialIcons
                        name="check"
                        size={moderateWidthScale(18)}
                        color={theme.white}
                      />
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })
          )}
        </>
      ) : null}
    </View>
  );
}
