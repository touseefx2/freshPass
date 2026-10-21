import React, { useMemo, useState, useEffect } from "react";
import {
  BackHandler,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Portal } from "@gorhom/portal";
import Animated, { ReduceMotion, SlideInDown } from "react-native-reanimated";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  iconScale,
} from "@/src/theme/dimensions";
import {
  updateSubscription,
  addSubscription,
} from "@/src/state/slices/completeProfileSlice";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import ServicePickerBottomSheet from "@/src/components/ServicePickerBottomSheet";

interface EditSubscriptionBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  subscriptionId: string | null;
  onAddCustomSuggestion?: (subscription: {
    id: string;
    packageName: string;
    description?: string;
    price: number;
    currency: string;
    serviceIds: string[];
    serviceCounts?: Record<string, number>;
    servicesPerMonth?: number;
  }) => void;
  /** Shown as "Delete Membership" when editing. */
  onDelete?: (subscriptionId: string) => void;
}

const buildDefaultServiceCounts = (
  serviceIds: string[],
  existingCounts?: Record<string, number>,
) => {
  return serviceIds.reduce<Record<string, number>>((acc, serviceId) => {
    const existingValue = existingCounts?.[serviceId];
    acc[serviceId] =
      typeof existingValue === "number" && existingValue >= 1
        ? existingValue
        : 1;
    return acc;
  }, {});
};

const sumServiceQuantities = (counts: Record<string, number>): number =>
  Object.values(counts).reduce((sum, qty) => sum + (qty || 0), 0);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.background,
    },
    flex: { flex: 1 },
    content: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(16),
      gap: moderateHeightScale(20),
    },
    field: {
      gap: moderateHeightScale(8),
    },
    label: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
    },
    sectionTitle: {
      fontSize: fontSize.size20,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    input: {
      minHeight: heightScale(50),
      borderRadius: moderateWidthScale(10),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.surfaceRaised,
      paddingHorizontal: moderateWidthScale(14),
      paddingVertical: moderateHeightScale(12),
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    inputError: {
      borderColor: theme.link,
    },
    affixRow: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: heightScale(50),
      borderRadius: moderateWidthScale(10),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.surfaceRaised,
      paddingHorizontal: moderateWidthScale(14),
    },
    affixInput: {
      flex: 1,
      paddingVertical: moderateHeightScale(12),
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    affixText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    prefixText: {
      color: theme.darkGreen,
      marginRight: moderateWidthScale(2),
    },
    serviceList: {
      gap: moderateHeightScale(10),
    },
    serviceCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(12),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.orangeBrown30,
      backgroundColor: theme.tilePeach,
      paddingVertical: moderateHeightScale(12),
      paddingLeft: moderateWidthScale(16),
      paddingRight: moderateWidthScale(12),
    },
    serviceInfo: {
      flex: 1,
      gap: moderateHeightScale(6),
    },
    serviceName: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      textTransform: "capitalize",
    },
    removeLink: {
      alignSelf: "flex-start",
      paddingVertical: moderateHeightScale(2),
    },
    removeText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen,
      textDecorationLine: "underline",
    },
    stepperWrap: {
      alignItems: "center",
      gap: moderateHeightScale(6),
    },
    perMonth: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    stepper: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(4),
    },
    stepButton: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(8),
      alignItems: "center",
      justifyContent: "center",
    },
    stepMinus: {
      backgroundColor: theme.lightGreen07,
    },
    stepPlus: {
      backgroundColor: theme.orangeBrown,
    },
    stepDisabled: {
      opacity: 0.4,
    },
    stepValue: {
      minWidth: moderateWidthScale(28),
      textAlign: "center",
      fontSize: fontSize.size17,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      fontVariant: ["tabular-nums"],
    },
    addServiceButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      minHeight: heightScale(50),
      borderRadius: moderateWidthScale(12),
      borderWidth: 1.5,
      borderColor: theme.orangeBrown,
      backgroundColor: theme.tilePeach,
    },
    addServiceText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    howCard: {
      borderRadius: moderateWidthScale(12),
      backgroundColor: theme.orangeBrown30,
      paddingVertical: moderateHeightScale(14),
      paddingHorizontal: moderateWidthScale(16),
      gap: moderateHeightScale(6),
    },
    howTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    howText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      lineHeight: fontSize.size14 * 1.45,
    },
    errorText: {
      fontSize: fontSize.size13,
      fontFamily: fonts.fontRegular,
      color: theme.link,
    },
    actions: {
      marginTop: moderateHeightScale(4),
      gap: moderateHeightScale(8),
    },
    deleteButton: {
      minHeight: heightScale(48),
      alignItems: "center",
      justifyContent: "center",
    },
    deleteText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.red,
    },
  });

export default function EditSubscriptionBottomSheet({
  visible,
  onClose,
  subscriptionId,
  onAddCustomSuggestion,
  onDelete,
}: EditSubscriptionBottomSheetProps) {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const insets = useSafeAreaInsets();
  const { subscriptions, businessServices } = useAppSelector(
    (state) => state.completeProfile,
  );

  // Convert business services to service format
  // Use id (business service id) for API calls
  const services = useMemo(() => {
    return businessServices.map((service) => ({
      id: service.id.toString(),
      name: service.name,
      hours: service.duration_hours,
      minutes: service.duration_minutes,
      price: parseFloat(service.price),
      currency: "USD",
    }));
  }, [businessServices]);

  const subscription = subscriptionId
    ? subscriptions.find((s) => s.id === subscriptionId)
    : null;

  const [packageName, setPackageName] = useState(
    subscription?.packageName || "",
  );
  const [description, setDescription] = useState(
    subscription?.description ?? "",
  );
  const [price, setPrice] = useState("");
  const [currency] = useState(subscription?.currency || "USD");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
    subscription?.serviceIds || [],
  );
  const [selectedServiceCounts, setSelectedServiceCounts] = useState<
    Record<string, number>
  >(
    buildDefaultServiceCounts(
      subscription?.serviceIds || [],
      subscription?.serviceCounts,
    ),
  );
  const [servicePickerVisible, setServicePickerVisible] = useState(false);
  const [errors, setErrors] = useState<{
    packageName?: string;
    price?: string;
    services?: string;
  }>({});

  const serviceQtySum = useMemo(
    () => sumServiceQuantities(selectedServiceCounts),
    [selectedServiceCounts],
  );

  useEffect(() => {
    if (visible) {
      if (subscription) {
        setPackageName(subscription.packageName);
        setDescription(subscription.description ?? "");
        setPrice(subscription.price.toFixed(2));
        setSelectedServiceIds(subscription.serviceIds);
        const counts = buildDefaultServiceCounts(
          subscription.serviceIds,
          subscription.serviceCounts,
        );
        setSelectedServiceCounts(counts);
      } else {
        setPackageName("");
        setDescription("");
        setPrice("");
        setSelectedServiceIds([]);
        setSelectedServiceCounts({});
      }
      setErrors({});
    }
  }, [visible, subscription, services]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const handleSelectServices = (serviceIds: string[]) => {
    setSelectedServiceIds(serviceIds);
    setSelectedServiceCounts((prev) => {
      const nextCounts: Record<string, number> = {};
      serviceIds.forEach((serviceId) => {
        const prevCount = prev[serviceId];
        nextCounts[serviceId] = typeof prevCount === "number" ? prevCount : 1;
      });
      return nextCounts;
    });
    if (serviceIds.length > 0) {
      setErrors((prev) => ({ ...prev, services: undefined }));
    }
  };

  const handleRemoveService = (serviceId: string) => {
    const nextIds = selectedServiceIds.filter((id) => id !== serviceId);
    setSelectedServiceIds(nextIds);
    setSelectedServiceCounts((prev) => {
      const nextCounts = { ...prev };
      delete nextCounts[serviceId];
      return nextCounts;
    });
    if (nextIds.length > 0) {
      setErrors((prev) => ({ ...prev, services: undefined }));
    }
  };

  const handleIncrementServiceCount = (serviceId: string) => {
    setSelectedServiceCounts((prev) => ({
      ...prev,
      [serviceId]: (prev[serviceId] ?? 1) + 1,
    }));
  };

  const handleDecrementServiceCount = (serviceId: string) => {
    setSelectedServiceCounts((prev) => {
      const currentCount = prev[serviceId] ?? 1;
      return {
        ...prev,
        [serviceId]: Math.max(1, currentCount - 1),
      };
    });
  };

  const handleSave = () => {
    const newErrors: typeof errors = {};

    if (!packageName.trim()) {
      newErrors.packageName = "Membership name is required";
    } else {
      // Check if package name already exists (excluding current subscription if editing)
      const existingSubscription = subscriptions.find(
        (sub) =>
          sub.packageName.toLowerCase().trim() ===
            packageName.toLowerCase().trim() && sub.id !== subscriptionId,
      );
      if (existingSubscription) {
        newErrors.packageName = "A membership with this name already exists";
      }
    }

    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0) {
      newErrors.price = "Price must be greater than 0";
    }

    if (selectedServiceIds.length === 0) {
      newErrors.services = "Add at least one service";
    }

    // Customers use the service counts in any mix of visits, so the plan's
    // visit total is always the sum of the counts.
    const visitsValue = serviceQtySum;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const descriptionValue = description.trim() || packageName.trim();

    if (subscriptionId && subscription) {
      dispatch(
        updateSubscription({
          id: subscriptionId,
          packageName: packageName.trim(),
          description: descriptionValue,
          servicesPerMonth: visitsValue,
          price: priceValue,
          currency,
          serviceIds: selectedServiceIds,
          serviceCounts: selectedServiceCounts,
        }),
      );
    } else {
      const newId = `subscription-${Date.now()}`;
      const newSubscription = {
        id: newId,
        packageName: packageName.trim(),
        description: descriptionValue,
        servicesPerMonth: visitsValue,
        price: priceValue,
        currency,
        serviceIds: selectedServiceIds,
        serviceCounts: selectedServiceCounts,
      };

      if (onAddCustomSuggestion) {
        onAddCustomSuggestion(newSubscription);
      } else {
        dispatch(addSubscription(newSubscription));
      }
    }

    onClose();
  };


  const selectedServices = selectedServiceIds
    .map((id) => services.find((s) => s.id === id))
    .filter((s): s is (typeof services)[number] => Boolean(s));

  const howItWorks = useMemo(() => {
    if (selectedServices.length === 0) return null;
    const included = selectedServices
      .map((s) => `${selectedServiceCounts[s.id] ?? 1} ${s.name.toLowerCase()}`)
      .join(" + ");
    return [
      `Every month they get ${included} (${serviceQtySum} in total).`,
      "They can use them all in one visit, or come in on different days.",
      "Each time they use one, it comes off their count. Counts reset when they pay for the next month.",
    ];
  }, [selectedServices, selectedServiceCounts, serviceQtySum]);

  const handlePriceChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, "");
    const dot = cleaned.indexOf(".");
    setPrice(
      dot >= 0
        ? cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "")
        : cleaned,
    );
    if (errors.price) setErrors((prev) => ({ ...prev, price: undefined }));
  };

  if (!visible) return null;

  return (
    <Portal>
      <Animated.View
        style={styles.overlay}
        entering={SlideInDown.duration(260).reduceMotion(ReduceMotion.System)}
      >
        <StatusBar barStyle="light-content" />
        <StackHeader
          title={subscriptionId ? "Edit Membership" : "Add Membership"}
          onBack={onClose}
        />

        <KeyboardAwareScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: moderateHeightScale(28) + insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          bottomOffset={moderateHeightScale(32)}
        >
          <View style={styles.field}>
            <Text style={styles.label}>Membership name</Text>
            <TextInput
              style={[styles.input, errors.packageName && styles.inputError]}
              value={packageName}
              onChangeText={(text) => {
                setPackageName(text);
                if (errors.packageName) {
                  setErrors((prev) => ({ ...prev, packageName: undefined }));
                }
              }}
              placeholder="e.g. Basic Plan"
              placeholderTextColor={theme.lightGreen4}
              accessibilityLabel="Membership name"
            />
            {errors.packageName ? (
              <Text style={styles.errorText}>{errors.packageName}</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Monthly price</Text>
            <View style={[styles.affixRow, errors.price && styles.inputError]}>
              <Text style={[styles.affixText, styles.prefixText]}>$</Text>
              <TextInput
                style={styles.affixInput}
                value={price}
                onChangeText={handlePriceChange}
                onBlur={() => {
                  const v = parseFloat(price);
                  if (!isNaN(v)) setPrice(v.toFixed(2));
                }}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={theme.lightGreen4}
                accessibilityLabel="Monthly price"
              />
              <Text style={styles.affixText}>/ month</Text>
            </View>
            {errors.price ? (
              <Text style={styles.errorText}>{errors.price}</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.sectionTitle}>Included services</Text>
            <View style={styles.serviceList}>
              {selectedServices.map((service) => {
                const count = selectedServiceCounts[service.id] ?? 1;
                return (
                  <View key={service.id} style={styles.serviceCard}>
                    <View style={styles.serviceInfo}>
                      <Text style={styles.serviceName} numberOfLines={2}>
                        {service.name}
                      </Text>
                      <TouchableOpacity
                        style={styles.removeLink}
                        onPress={() => handleRemoveService(service.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${service.name}`}
                      >
                        <Text style={styles.removeText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.stepperWrap}>
                      <Text style={styles.perMonth}>Uses per month</Text>
                      <View style={styles.stepper}>
                        <TouchableOpacity
                          style={[
                            styles.stepButton,
                            styles.stepMinus,
                            count <= 1 && styles.stepDisabled,
                          ]}
                          onPress={() =>
                            handleDecrementServiceCount(service.id)
                          }
                          disabled={count <= 1}
                          accessibilityRole="button"
                          accessibilityLabel={`Fewer ${service.name}`}
                        >
                          <Feather
                            name="minus"
                            size={iconScale(18)}
                            color={theme.darkGreen}
                          />
                        </TouchableOpacity>
                        <Text style={styles.stepValue}>{count}</Text>
                        <TouchableOpacity
                          style={[styles.stepButton, styles.stepPlus]}
                          onPress={() =>
                            handleIncrementServiceCount(service.id)
                          }
                          accessibilityRole="button"
                          accessibilityLabel={`More ${service.name}`}
                        >
                          <Feather
                            name="plus"
                            size={iconScale(18)}
                            color={theme.darkGreen}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}

              <TouchableOpacity
                style={styles.addServiceButton}
                onPress={() => setServicePickerVisible(true)}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <Feather
                  name="plus"
                  size={iconScale(20)}
                  color={theme.darkGreen}
                />
                <Text style={styles.addServiceText}>Add Service</Text>
              </TouchableOpacity>
            </View>
            {errors.services ? (
              <Text style={styles.errorText}>{errors.services}</Text>
            ) : null}
          </View>

          {howItWorks ? (
            <View style={styles.howCard}>
              <Text style={styles.howTitle}>How customers use this</Text>
              {howItWorks.map((line) => (
                <Text key={line} style={styles.howText}>
                  {line}
                </Text>
              ))}
            </View>
          ) : null}

          <View style={styles.actions}>
            <Button
              title={subscriptionId ? "Save Membership" : "Add Membership"}
              onPress={handleSave}
              backgroundColor={theme.darkGreen}
            />
            {subscriptionId && onDelete ? (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => onDelete(subscriptionId)}
                accessibilityRole="button"
              >
                <Text style={styles.deleteText}>Delete Membership</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </KeyboardAwareScrollView>

        <ServicePickerBottomSheet
          visible={servicePickerVisible}
          onClose={() => setServicePickerVisible(false)}
          selectedServiceIds={selectedServiceIds}
          onSelectServices={handleSelectServices}
        />
      </Animated.View>
    </Portal>
  );
}
