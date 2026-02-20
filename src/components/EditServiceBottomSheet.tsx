import React, { useMemo, useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AntDesign } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import {
  addService,
  updateService,
} from "@/src/state/slices/completeProfileSlice";
import ModalizeBottomSheet from "@/src/components/modalizeBottomSheet";

interface EditServiceBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  serviceId: string | null;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    scrollContent: {
      gap: moderateHeightScale(16),
    },
    inputLabelTitle: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.lightGreen,
    },
    inputWrapper: {
      borderRadius: moderateWidthScale(8),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      paddingHorizontal: moderateWidthScale(15),
      paddingVertical: moderateHeightScale(12),
      gap: moderateHeightScale(4),
      marginTop: moderateHeightScale(16),
    },
    inputLabel: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    textInput: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      paddingVertical: 0,
      height: heightScale(24),
      flex: 1,
    },
    serviceNameWrapper: {
      gap: moderateHeightScale(2),
      marginTop: moderateHeightScale(16),
      backgroundColor: theme.lightGreen07,
      borderRadius: moderateWidthScale(8),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      paddingHorizontal: moderateWidthScale(15),
      paddingVertical: moderateHeightScale(10),
    },
    serviceNameWrapperEditable: {
      backgroundColor: theme.white,
    },
    descriptionWrapper: {
      gap: moderateHeightScale(2),
      marginTop: 0,
      backgroundColor: theme.lightGreen07,
      borderRadius: moderateWidthScale(8),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      paddingHorizontal: moderateWidthScale(15),
      paddingVertical: moderateHeightScale(10),
    },
    descriptionWrapperEditable: {
      backgroundColor: theme.white,
    },
    serviceNameText: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.lightGreen4,
      flex: 1,
    },
    serviceNameInput: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      paddingVertical: 0,
      height: heightScale(24),
      flex: 1,
    },
    descriptionInput: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      paddingVertical: 0,
      minHeight: heightScale(48),
      flex: 1,
      textAlignVertical: "top",
    },
    profileIcon: {
      width: widthScale(40),
      height: widthScale(40),
      borderRadius: moderateWidthScale(40 / 2),
      backgroundColor: theme.lightGreen2,
      alignItems: "center",
      justifyContent: "center",
    },
    timeRow: {
      flexDirection: "row",
      gap: moderateWidthScale(12),
    },
    timeInputWrapper: {
      flex: 1,
      borderRadius: moderateWidthScale(8),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    mainTimeCon: {
      flex: 1,
      paddingHorizontal: moderateWidthScale(15),
      paddingVertical: moderateHeightScale(10),
      gap: moderateHeightScale(2),
    },
    timeInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
    },
    timeInput: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
      paddingVertical: 0,
      height: heightScale(22),
      flex: 1,
      textAlign: "left",
    },
    minutesSuffix: {
      flex: 0,
      marginLeft: moderateWidthScale(4),
      lineHeight: heightScale(22),
      height: heightScale(22),
      includeFontPadding: false,
    },
    pricePrefix: {
      flex: 0,
      marginRight: 0,
      lineHeight: heightScale(22),
      height: heightScale(22),
      includeFontPadding: false,
    },
    priceInputInner: {
      paddingLeft: 0,
    },
    arrowButtonsContainer: {
      width: "28%",
      backgroundColor: theme.grey30,
      borderLeftWidth: 1,
      borderLeftColor: theme.lightGreen2,
      alignItems: "center",
      justifyContent: "center",
      borderTopRightRadius: moderateWidthScale(8),
      borderBottomRightRadius: moderateWidthScale(8),
    },
    timeButton: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
    },
    arrowButtonSeparator: {
      width: "100%",
      height: 1,
      backgroundColor: theme.lightGreen2,
    },
    priceInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    priceInput: {
      flex: 1,
      fontSize: fontSize.size16,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
      paddingVertical: 0,
      height: heightScale(24),
    },
    errorText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.link,
      marginTop: moderateHeightScale(4),
    },
    timeFieldHint: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      marginTop: moderateHeightScale(4),
    },
  });

export default function EditServiceBottomSheet({
  visible,
  onClose,
  serviceId,
}: EditServiceBottomSheetProps) {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;
  const { services } = useAppSelector((state) => state.completeProfile);

  const service = serviceId ? services.find((s) => s.id === serviceId) : null;

  const [serviceName, setServiceName] = useState(service?.name || "");
  const [serviceDescription, setServiceDescription] = useState(
    service?.description ?? service?.name ?? "",
  );
  const [hoursStr, setHoursStr] = useState("");
  const [minutesStr, setMinutesStr] = useState("");
  const [price, setPrice] = useState("");
  const [currency] = useState(service?.currency || "USD");
  const [errors, setErrors] = useState<{
    name?: string;
    price?: string;
  }>({});

  const isNameEditable = !serviceId || (service?.id?.startsWith?.("custom-") ?? false);

  useEffect(() => {
    if (!visible) return;
    if (serviceId === null) {
      setServiceName("");
      setServiceDescription("");
      setHoursStr("0");
      setMinutesStr("0");
      setPrice("");
      setErrors({});
    } else if (service) {
      setServiceName(service.name);
      setServiceDescription(service.description ?? service.name);
      const serviceHours = Math.min(Math.max(service.hours, 0), 12);
      setHoursStr(serviceHours.toString());
      const serviceMinutes = Math.min(Math.max(service.minutes, 0), 59);
      setMinutesStr(serviceMinutes.toString());
      setPrice(service.price.toString());
      setErrors({});
    }
  }, [visible, serviceId, service]);

  const handleHoursChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 2);
    setHoursStr(cleaned);
  };

  const handleIncrementHours = () => {
    const current = parseInt(hoursStr, 10) || 0;
    if (current < 12) {
      setHoursStr((current + 1).toString());
    } else {
      setHoursStr("0");
    }
  };

  const handleDecrementHours = () => {
    const current = parseInt(hoursStr, 10) || 0;
    if (current > 0) {
      setHoursStr((current - 1).toString());
    } else {
      setHoursStr("12");
    }
  };

  const handleMinutesChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 2);
    const num = parseInt(cleaned, 10);
    if (cleaned !== "" && !isNaN(num) && num > 59) {
      setMinutesStr("0");
    } else {
      setMinutesStr(cleaned);
    }
  };

  const handleIncrementMinutes = () => {
    const current = parseInt(minutesStr, 10) || 0;
    if (current < 59) {
      setMinutesStr((current + 1).toString());
    } else {
      setMinutesStr("0");
    }
  };

  const handleDecrementMinutes = () => {
    const current = parseInt(minutesStr, 10) || 0;
    if (current > 0) {
      setMinutesStr((current - 1).toString());
    } else {
      setMinutesStr("59");
    }
  };

  const handleIncrementPrice = () => {
    const currentPrice = parseFloat(price) || 0;
    setPrice((currentPrice + 0.01).toFixed(2));
  };

  const handleDecrementPrice = () => {
    const currentPrice = parseFloat(price) || 0;
    if (currentPrice > 0) {
      setPrice(Math.max(0, currentPrice - 0.01).toFixed(2));
    }
  };

  const handleSave = () => {
    const newErrors: typeof errors = {};

    if (isNameEditable) {
      const trimmedName = serviceName.trim();
      if (!trimmedName) {
        newErrors.name = "Service name is required";
      }
    }

    const hours = Math.min(Math.max(parseInt(hoursStr, 10) || 0, 0), 12);
    const minutes = Math.min(Math.max(parseInt(minutesStr, 10) || 0, 0), 59);
    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0) {
      newErrors.price = "Price must be greater than 0";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const descriptionValue =
      serviceDescription.trim() || serviceName.trim();

    if (serviceId === null) {
      dispatch(
        addService({
          id: `custom-${Date.now()}`,
          name: serviceName.trim(),
          description: descriptionValue,
          hours,
          minutes,
          price: priceValue,
          currency,
        }),
      );
    } else if (serviceId && service) {
      dispatch(
        updateService({
          id: serviceId,
          name: isNameEditable ? serviceName.trim() : service.name,
          description: descriptionValue,
          hours,
          minutes,
          price: priceValue,
          currency,
        }),
      );
    }

    onClose();
  };

  return (
    <ModalizeBottomSheet
      visible={visible}
      onClose={onClose}
      title={serviceId ? t("editService") : "Add service"}
      footerButtonTitle="Save"
      onFooterButtonPress={handleSave}
      contentStyle={styles.scrollContent}
    >
      <View
        style={[
          styles.serviceNameWrapper,
          isNameEditable && styles.serviceNameWrapperEditable,
        ]}
      >
        <Text style={styles.inputLabel}>Service name</Text>
        {isNameEditable ? (
          <>
            <TextInput
              style={styles.serviceNameInput}
              value={serviceName}
              onChangeText={setServiceName}
              placeholder="Enter service name"
              placeholderTextColor={theme.lightGreen2}
            />
            {errors.name ? (
              <Text style={styles.errorText}>{errors.name}</Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.serviceNameText}>{serviceName}</Text>
        )}
      </View>

      <View
        style={[
          styles.descriptionWrapper,
          styles.descriptionWrapperEditable,
        ]}
      >
        <Text style={styles.inputLabel}>Description</Text>
        <TextInput
          style={styles.descriptionInput}
          value={serviceDescription}
          onChangeText={setServiceDescription}
          placeholder="Enter description"
          placeholderTextColor={theme.lightGreen2}
          multiline
        />
      </View>

      <View style={{ gap: 15 }}>
        <Text style={styles.inputLabelTitle}>Service time</Text>
        <View style={styles.timeRow}>
          <View style={styles.timeInputWrapper}>
            <View style={styles.mainTimeCon}>
              <Text style={styles.inputLabel}>Hour</Text>
              <View style={styles.timeInputContainer}>
                <TextInput
                  style={styles.timeInput}
                  value={hoursStr}
                  onChangeText={handleHoursChange}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={theme.lightGreen2}
                />
              </View>
            </View>
            <View style={styles.arrowButtonsContainer}>
              <TouchableOpacity
                onPress={handleIncrementHours}
                style={styles.timeButton}
              >
                <AntDesign
                  name="caret-up"
                  size={moderateWidthScale(15)}
                  color={theme.darkGreen}
                />
              </TouchableOpacity>
              <View style={styles.arrowButtonSeparator} />
              <TouchableOpacity
                onPress={handleDecrementHours}
                style={styles.timeButton}
              >
                <AntDesign
                  name="caret-down"
                  size={moderateWidthScale(15)}
                  color={theme.darkGreen}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.timeInputWrapper}>
            <View style={styles.mainTimeCon}>
              <Text style={styles.inputLabel}>Time</Text>
              <View style={styles.timeInputContainer}>
                <TextInput
                  style={styles.timeInput}
                  value={minutesStr}
                  onChangeText={handleMinutesChange}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={theme.lightGreen2}
                />
                {minutesStr ? (
                  <Text style={[styles.timeInput, styles.minutesSuffix]}>
                    {minutesStr === "1" ? " min" : " mins"}
                  </Text>
                ) : null}
              </View>
            </View>
            <View style={styles.arrowButtonsContainer}>
              <TouchableOpacity
                onPress={handleIncrementMinutes}
                style={styles.timeButton}
              >
                <AntDesign
                  name="caret-up"
                  size={moderateWidthScale(15)}
                  color={theme.darkGreen}
                />
              </TouchableOpacity>
              <View style={styles.arrowButtonSeparator} />
              <TouchableOpacity
                onPress={handleDecrementMinutes}
                style={styles.timeButton}
              >
                <AntDesign
                  name="caret-down"
                  size={moderateWidthScale(15)}
                  color={theme.darkGreen}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <Text style={styles.timeFieldHint}>
          After 59, value resets to 0 (60 mins = 1 hour, then it restarts).
        </Text>

        <View style={styles.timeInputWrapper}>
          <View style={styles.mainTimeCon}>
            <Text style={styles.inputLabel}>Price</Text>
            <View style={styles.timeInputContainer}>
              <Text style={[styles.timeInput, styles.pricePrefix]}>
                {currency} $
              </Text>
              <TextInput
                style={[styles.timeInput, styles.priceInputInner]}
                value={price}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9.]/g, "");
                  const oneDot =
                    cleaned.indexOf(".") >= 0
                      ? cleaned.slice(0, cleaned.indexOf(".") + 1) +
                        cleaned.slice(cleaned.indexOf(".") + 1).replace(/\./g, "")
                      : cleaned;
                  setPrice(oneDot);
                }}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={theme.lightGreen2}
              />
            </View>
          </View>
          <View style={[styles.arrowButtonsContainer, { width: "14%" }]}>
            <TouchableOpacity
              onPress={handleIncrementPrice}
              style={styles.timeButton}
            >
              <AntDesign
                name="caret-up"
                size={moderateWidthScale(15)}
                color={theme.darkGreen}
              />
            </TouchableOpacity>
            <View style={styles.arrowButtonSeparator} />
            <TouchableOpacity
              onPress={handleDecrementPrice}
              style={styles.timeButton}
            >
              <AntDesign
                name="caret-down"
                size={moderateWidthScale(15)}
                color={theme.darkGreen}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ModalizeBottomSheet>
  );
}
