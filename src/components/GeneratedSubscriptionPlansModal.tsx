import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
  heightScale,
} from "@/src/theme/dimensions";
import Button from "@/src/components/button";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

interface Service {
  id: number;
  name: string;
  description: string;
}

interface GeneratedPlan {
  tier: string;
  name: string;
  monthly_price: number;
  currency: string;
  visits_included: number;
  services_included: Service[];
  recommended_for: string;
}

interface GeneratedSubscriptionPlansModalProps {
  visible: boolean;
  onClose: () => void;
  plans: GeneratedPlan[];
  onSelectedPlans?: (plans: GeneratedPlan[]) => void;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      alignItems: "center",
      justifyContent: "center",
    },
    container: {
      backgroundColor: theme.background,
      borderRadius: moderateWidthScale(16),
      height: "95%",
      padding: moderateWidthScale(20),
      width: "95%",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    headerTitle: {
      fontSize: fontSize.size18,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      flex: 1,
    },
    closeButton: {
      width: widthScale(32),
      height: widthScale(32),
      borderRadius: widthScale(16),
      backgroundColor: theme.darkGreen15,
      alignItems: "center",
      justifyContent: "center",
    },
    successBanner: {
      backgroundColor: theme.lightGreen015,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(20),
      paddingVertical: moderateHeightScale(16),
      marginHorizontal: moderateWidthScale(20),
      marginBottom: moderateHeightScale(20),
      borderRadius: moderateWidthScale(12),
      gap: moderateWidthScale(12),
    },
    successIcon: {
      width: moderateWidthScale(24),
      height: moderateWidthScale(24),
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    successTextContainer: {
      flex: 1,
    },
    successTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
    },
    successSubtitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    plansContainer: { 
      gap: moderateHeightScale(20),
      paddingVertical:moderateHeightScale(25),
      paddingHorizontal:moderateWidthScale(2)
    },
    planCard: {
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(16),
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.borderLight,
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    planHeader: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(20),
      paddingBottom: moderateHeightScale(16),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    classicHeader: {
      backgroundColor: "#E3F2FD",
    },
    goldHeader: {
      backgroundColor: "#FFF9C4",
    },
    vipHeader: {
      backgroundColor: "#FFE082",
    },
    planName: {
      fontSize: fontSize.size22,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(4),
      flex: 1,
    },
    headerCheckbox: {
      width: moderateWidthScale(24),
      height: moderateWidthScale(24),
      borderRadius: moderateWidthScale(6),
      borderWidth: 2,
      borderColor: theme.borderLight,
      alignItems: "center",
      justifyContent: "center",
    },
    headerCheckboxSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    planTier: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    planContent: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      paddingBottom: moderateHeightScale(20),
    },
    priceContainer: {
      marginBottom: moderateHeightScale(16),
    },
    price: {
      fontSize: fontSize.size28,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    priceUnit: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    visitsContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
      marginBottom: moderateHeightScale(16),
    },
    visitsIcon: {
      width: moderateWidthScale(20),
      height: moderateWidthScale(20),
    },
    visitsText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    servicesSection: {
      marginBottom: moderateHeightScale(16),
    },
    servicesHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(6),
      marginBottom: moderateHeightScale(8),
    },
    servicesTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    servicesList: {
      gap: moderateHeightScale(6),
    },
    serviceItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    checkIcon: {
      width: moderateWidthScale(16),
      height: moderateWidthScale(16),
    },
    serviceName: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      flex: 1,
      textTransform:"capitalize"
    },
    recommendedSection: {
      marginBottom: moderateHeightScale(16),
    },
    recommendedTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      marginBottom: moderateHeightScale(6),
    },
    recommendedText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      lineHeight: moderateHeightScale(18),
    },
    planCardSelected: {
      borderColor: theme.primary,
      borderWidth: 2,
    },
    fixedButtonContainer: {
      paddingTop: moderateHeightScale(16),
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
  const insets = useSafeAreaInsets();
  const [selectedPlanIndices, setSelectedPlanIndices] = useState<number[]>([]);

  // Reset selection when modal closes
  React.useEffect(() => {
    if (!visible) {
      setSelectedPlanIndices([]);
    }
  }, [visible]);

  const getHeaderStyle = (tier: string) => {
    switch (tier.toLowerCase()) {
      case "classic":
        return styles.classicHeader;
      case "gold":
        return styles.goldHeader;
      case "vip":
        return styles.vipHeader;
      default:
        return styles.classicHeader;
    }
  };

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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Ai Generated Plans</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Feather
                name="x"
                size={moderateWidthScale(16)}
                color={theme.darkGreen}
              />
            </TouchableOpacity>
          </View>

          {plans.length > 0 && (
            <>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.plansContainer}
                style={{ flex: 1 }}
              >
                {plans.map((plan, index) => {
                  const isSelected = selectedPlanIndices.includes(index);
                  return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.planCard,
                      isSelected && styles.planCardSelected,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => togglePlanSelection(index)}
                  >
                    <View style={[styles.planHeader, getHeaderStyle(plan.tier)]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.planName}>{plan.name}</Text>
                        <Text style={styles.planTier}>{plan.tier} Tier</Text>
                      </View>
                      <View
                        style={[
                          styles.headerCheckbox,
                          isSelected && styles.headerCheckboxSelected,
                        ]}
                      >
                        {isSelected && (
                          <Feather
                            name="check"
                            size={moderateWidthScale(16)}
                            color={theme.white}
                          />
                        )}
                      </View>
                    </View>

                    <View style={styles.planContent}>
                      <View style={styles.priceContainer}>
                        <Text style={styles.price}>
                          ${plan.monthly_price}
                          <Text style={styles.priceUnit}>/month</Text>
                        </Text>
                      </View>

                      <View style={styles.visitsContainer}>
                        <Feather
                          name="users"
                          size={moderateWidthScale(20)}
                          color={theme.darkGreen}
                        />
                        <Text style={styles.visitsText}>
                          {plan.visits_included} visit
                          {plan.visits_included !== 1 ? "s" : ""}/month
                        </Text>
                      </View>

                      <View style={styles.servicesSection}>
                        <View style={styles.servicesHeader}>
                          <Feather
                            name="award"
                            size={moderateWidthScale(14)}
                            color={theme.darkGreen}
                          />
                          <Text style={styles.servicesTitle}>
                            Services Included
                          </Text>
                        </View>
                        <View style={styles.servicesList}>
                          {plan.services_included.map((service) => (
                            <View key={service.id} style={styles.serviceItem}>
                              <Feather
                                name="check"
                                size={moderateWidthScale(16)}
                                color={theme.primary}
                              />
                              <Text style={styles.serviceName}>
                                {service.name}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>

                      <View style={styles.recommendedSection}>
                        <Text style={styles.recommendedTitle}>
                          Recommended For
                        </Text>
                        <Text style={styles.recommendedText}>
                          {plan.recommended_for}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
                })}
              </ScrollView>

              <View style={styles.fixedButtonContainer}>
                <Button
                  title="Continue"
                  onPress={handleContinue}
                  disabled={selectedPlanIndices.length === 0}
                />
              </View>
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
