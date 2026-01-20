import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  TextInput,
  Animated,
  Pressable,
} from "react-native";
import { useTheme, useAppSelector, useAppDispatch } from "@/src/hooks/hooks";
import { setSearchText, clearSearchText } from "@/src/state/slices/generalSlice";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateWidthScale,
  moderateHeightScale,
  widthScale,
  heightScale,
} from "@/src/theme/dimensions";
import { SearchIcon, FilterIcon, CloseIcon } from "@/assets/icons";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {},
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(999),
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(12),
      gap: moderateWidthScale(12),
      marginHorizontal: moderateWidthScale(20),
    },
    shadow: {
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,

      elevation: 1,
    },
    searchIconContainer: {
      justifyContent: "center",
      alignItems: "center",
    },
    textContainer: {
      flex: 1,
      justifyContent: "center",
      position: "relative",
      minHeight: heightScale(32),
    },
    label: {
      position: "absolute",
      left: 0,
      color: theme.lightGreen,
      fontFamily: fonts.fontRegular,
    },
    inputWrapper: {
      flex: 1,
      justifyContent: "center",
    },
    input: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      padding: 0,
      margin: 0,
      textAlignVertical: "center",
      includeFontPadding: false,
      height: heightScale(20),
    },
    inputWithValue: {
      fontFamily: fonts.fontMedium,
    },
    rightButtonsContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: moderateWidthScale(8),
    },
    clearButton: {},
    filterButton: {
      width: widthScale(30),
      height: heightScale(30),
      borderRadius: widthScale(9999),
      borderWidth: 0.8,
      borderColor: theme.lightGreen22,
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
    },
    separator: {
      height: 0.6,
      backgroundColor: theme.lightGreen22,
      marginVertical: moderateHeightScale(12),
    },
  });

interface SearchBarProps {
  onSearchPress?: () => void;
  onFilterPress?: () => void;
  location?: string;
  onLocationChange?: (location: string) => void;
}

export default function SearchBar({
  onSearchPress,
  onFilterPress,
  location: initialLocation = "",
  onLocationChange,
}: SearchBarProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const dispatch = useAppDispatch();
  const searchText = useAppSelector((state: any) => state.general.searchText);
  const location = initialLocation || searchText;
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const hasValue = Boolean(location && location.length > 0);
  const labelAnimation = useRef(new Animated.Value(hasValue ? 1 : 0)).current;

  const shouldShowLabel = hasValue || isFocused;

  useEffect(() => {
    const newHasValue = Boolean(location && location.length > 0);
    Animated.timing(labelAnimation, {
      toValue: (newHasValue || isFocused) ? 1 : 0,
      duration: 140,
      useNativeDriver: false,
    }).start();
  }, [location, isFocused, labelAnimation]);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleChangeText = (text: string) => {
    dispatch(setSearchText(text));
    onLocationChange?.(text);
  };

  const handleClear = () => {
    dispatch(clearSearchText());
    onLocationChange?.("");
    setIsFocused(false);
    inputRef.current?.blur();
  };

  const labelAnimatedStyle = {
    top: labelAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [moderateHeightScale(0), moderateHeightScale(-2)],
    }),
    fontSize: labelAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [fontSize.size13, fontSize.size11],
    }),
    opacity: labelAnimation,
  };

  const inputWrapperAnimatedStyle = {
    paddingTop: labelAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, moderateHeightScale(12)],
    }),
    paddingBottom: labelAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, moderateHeightScale(4)],
    }),
  };

  return (
    <View style={styles.container}>
      <View style={[styles.searchBar, styles.shadow]}>
        <View style={styles.searchIconContainer}>
          <SearchIcon
            width={widthScale(20)}
            height={heightScale(20)}
            color={theme.darkGreen}
          />
        </View>
        <View style={styles.textContainer}>
          {shouldShowLabel && (
            <Animated.Text style={[styles.label, labelAnimatedStyle]}>
              Find services to book in
            </Animated.Text>
          )}
          <Animated.View
            style={[styles.inputWrapper, inputWrapperAnimatedStyle]}
          >
            <TextInput
              ref={inputRef}
              style={[styles.input, hasValue && styles.inputWithValue]}
              value={location}
              onChangeText={handleChangeText}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={!shouldShowLabel ? "Find services to book in" : ""}
              placeholderTextColor={theme.lightGreen2}
            />
          </Animated.View>
        </View>
        <View style={styles.rightButtonsContainer}>
          {hasValue && (
            <Pressable
              style={styles.clearButton}
              onPress={handleClear}
              hitSlop={moderateWidthScale(8)}
            >
              <CloseIcon color={theme.darkGreen} />
            </Pressable>
          )}
          <TouchableOpacity
            style={styles.filterButton}
            onPress={onFilterPress}
            activeOpacity={0.7}
          >
            <FilterIcon
              width={widthScale(17)}
              height={heightScale(17)}
              color={theme.darkGreen}
            />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.separator} />
    </View>
  );
}
