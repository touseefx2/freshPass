import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import Animated, { ReduceMotion, SlideInDown } from "react-native-reanimated";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import Button from "@/src/components/button";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { GeneratedSubscriptionPlanNormalized } from "@/src/services/aiToolsService";

const formatMonthlyPrice = (price: number, currency: string): string => {
  const code = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return `${code} ${price}`;
  }
};

interface GeneratedSubscriptionPlansModalProps {
  visible: boolean;
  onClose: () => void;
  plans: GeneratedSubscriptionPlanNormalized[];
  onSelectedPlans?: (plans: GeneratedSubscriptionPlanNormalized[]) => void;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: theme.background,
      borderTopLeftRadius: moderateWidthScale(24),
      borderTopRightRadius: moderateWidthScale(24),
      paddingTop: moderateHeightScale(8),
    },
    handle: {
      alignSelf: "center",
      width: moderateWidthScale(40),
      height: moderateHeightScale(4),
      borderRadius: moderateHeightScale(2),
      backgroundColor: theme.darkGreen15,
      marginBottom: moderateHeightScale(12),
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
      paddingHorizontal: moderateWidthScale(20),
      paddingBottom: moderateHeightScale(14),
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    headerIcon: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.tilePeach,
      borderWidth: 1,
      borderColor: theme.orangeBrown30,
      alignItems: "center",
      justifyContent: "center",
    },
    headerText: {
      flex: 1,
      gap: moderateHeightScale(2),
    },
    headerTitle: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    headerSubtitle: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: moderateHeightScale(18),
    },
    closeButton: {
      width: moderateWidthScale(36),
      height: moderateWidthScale(36),
      borderRadius: moderateWidthScale(18),
      backgroundColor: theme.darkGreen15,
      alignItems: "center",
      justifyContent: "center",
    },
    scroll: {
      flexGrow: 0,
      flexShrink: 1,
    },
    plansContainer: {
      gap: moderateHeightScale(14),
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(16),
    },
    planCard: {
      borderRadius: moderateWidthScale(14),
      backgroundColor: theme.surfaceRaised,
      borderWidth: 1.5,
      borderColor: theme.borderLight,
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(16),
      paddingHorizontal: moderateWidthScale(18),
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.12,
      shadowRadius: 3,
      elevation: 2,
    },
    planCardSelected: {
      borderColor: theme.darkGreen,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: moderateWidthScale(12),
    },
    planName: {
      flex: 1,
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    selectCircle: {
      width: moderateWidthScale(26),
      height: moderateWidthScale(26),
      borderRadius: moderateWidthScale(13),
      borderWidth: 1.5,
      borderColor: theme.lightGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    selectCircleOn: {
      backgroundColor: theme.darkGreen,
      borderColor: theme.darkGreen,
    },
    recommendedText: {
      marginTop: moderateHeightScale(4),
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: moderateHeightScale(18),
    },
    priceRow: {
      flexDirection: "row",
      alignItems: "baseline",
      marginTop: moderateHeightScale(10),
      gap: moderateWidthScale(4),
    },
    priceText: {
      fontSize: fontSize.size24 * 1.25,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    perMonthText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    accentBar: {
      width: moderateWidthScale(44),
      height: moderateHeightScale(3),
      borderRadius: moderateHeightScale(2),
      backgroundColor: theme.orangeBrown,
      marginTop: moderateHeightScale(8),
      marginBottom: moderateHeightScale(14),
    },
    includedLabel: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginBottom: moderateHeightScale(8),
    },
    includedList: {
      gap: moderateHeightScale(8),
    },
    includedItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(10),
    },
    checkCircle: {
      width: moderateWidthScale(22),
      height: moderateWidthScale(22),
      borderRadius: moderateWidthScale(11),
      backgroundColor: theme.darkGreen,
      alignItems: "center",
      justifyContent: "center",
    },
    includedText: {
      flex: 1,
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      textTransform: "capitalize",
    },
    includedCount: {
      fontFamily: fonts.fontBold,
      fontVariant: ["tabular-nums"],
    },
    visitsPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      marginTop: moderateHeightScale(14),
      borderRadius: moderateWidthScale(10),
      backgroundColor: theme.tilePeach,
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(10),
    },
    visitsText: {
      flex: 1,
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    footer: {
      paddingTop: moderateHeightScale(12),
      paddingHorizontal: moderateWidthScale(20),
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      backgroundColor: theme.background,
    },
  });

export default function GeneratedSubscriptionPlansModal({
  visible,
  onClose,
  plans,
  onSelectedPlans,
}: GeneratedSubscriptionPlansModalProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  // SafeAreaView inside a Modal reports 0 insets on first open; use the app's measured insets instead
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [selectedPlanIndices, setSelectedPlanIndices] = useState<number[]>([]);

  // Reset selection when modal closes
  React.useEffect(() => {
    if (!visible) {
      setSelectedPlanIndices([]);
    }
  }, [visible]);

  const togglePlanSelection = (index: number) => {
    setSelectedPlanIndices((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  const handleContinue = () => {
    if (selectedPlanIndices.length > 0 && onSelectedPlans) {
      const selectedPlans = selectedPlanIndices.map((index) => plans[index]);
      onSelectedPlans(selectedPlans);
      onClose();
    }
  };

  const selectedCount = selectedPlanIndices.length;
  const continueTitle =
    selectedCount === 0
      ? "Select a plan to add"
      : `Add ${selectedCount} plan${selectedCount === 1 ? "" : "s"}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close AI suggested plans"
        />
        <Animated.View
          entering={SlideInDown.duration(260).reduceMotion(ReduceMotion.System)}
          style={[
            styles.sheet,
            {
              maxHeight: windowHeight - insets.top - moderateHeightScale(16),
              paddingBottom: insets.bottom + moderateHeightScale(12),
            },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <MaterialIcons
                name="auto-awesome"
                size={moderateWidthScale(20)}
                color={theme.orangeBrown}
              />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>AI suggested plans</Text>
              <Text style={styles.headerSubtitle}>
                Pick the plans you want to add. You can edit them anytime.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Feather
                name="x"
                size={moderateWidthScale(18)}
                color={theme.darkGreen}
              />
            </TouchableOpacity>
          </View>

          {plans.length > 0 && (
            <>
              <ScrollView
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.plansContainer}
              >
                {plans.map((plan, index) => {
                  const isSelected = selectedPlanIndices.includes(index);
                  const price = formatMonthlyPrice(
                    plan.monthly_price,
                    plan.currency,
                  );
                  const totalUses = plan.services_included.reduce(
                    (sum, service) => sum + (service.count || 0),
                    0,
                  );
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.planCard,
                        isSelected && styles.planCardSelected,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => togglePlanSelection(index)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}
                      accessibilityLabel={`${plan.name}, ${price} per month`}
                    >
                      <View style={styles.cardHeader}>
                        <Text style={styles.planName}>{plan.name}</Text>
                        <View
                          style={[
                            styles.selectCircle,
                            isSelected && styles.selectCircleOn,
                          ]}
                        >
                          {isSelected && (
                            <Feather
                              name="check"
                              size={moderateWidthScale(15)}
                              color={theme.white}
                            />
                          )}
                        </View>
                      </View>

                      {plan.recommended_for ? (
                        <Text style={styles.recommendedText}>
                          {plan.recommended_for}
                        </Text>
                      ) : null}

                      <View style={styles.priceRow}>
                        <Text style={styles.priceText}>{price}</Text>
                        <Text style={styles.perMonthText}>/month</Text>
                      </View>
                      <View style={styles.accentBar} />

                      {plan.services_included.length > 0 ? (
                        <>
                          <Text style={styles.includedLabel}>
                            Included each month
                          </Text>
                          <View style={styles.includedList}>
                            {plan.services_included.map((service, sIdx) => (
                              <View
                                key={
                                  service.id > 0
                                    ? `${service.id}-${sIdx}`
                                    : `svc-${sIdx}`
                                }
                                style={styles.includedItem}
                              >
                                <View style={styles.checkCircle}>
                                  <Feather
                                    name="check"
                                    size={moderateWidthScale(13)}
                                    color={theme.white}
                                  />
                                </View>
                                <Text style={styles.includedText}>
                                  <Text style={styles.includedCount}>
                                    {service.count}
                                  </Text>
                                  {"  "}
                                  {service.name}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </>
                      ) : null}

                      {totalUses > 0 ? (
                        <View style={styles.visitsPill}>
                          <Feather
                            name="calendar"
                            size={moderateWidthScale(18)}
                            color={theme.orangeBrownText}
                          />
                          <Text style={styles.visitsText}>
                            {totalUses} service{totalUses === 1 ? "" : "s"} to
                            use anytime this month
                          </Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.footer}>
                <Button
                  title={continueTitle}
                  onPress={handleContinue}
                  disabled={selectedCount === 0}
                />
              </View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
