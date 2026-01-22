import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  TextInput,
  Pressable,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { CloseIcon } from "@/assets/icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import ImagePickerModal from "@/src/components/imagePickerModal";
import FloatingInput from "@/src/components/floatingInput";
import { useAppSelector, useAppDispatch } from "@/src/hooks/hooks";
import {
  setFullName,
  setProfileImageUri,
  setAboutYourself,
} from "@/src/state/slices/completeProfileSlice";
import { validateName, validateDescription } from "@/src/services/validationService";
import Logger from "@/src/services/logger";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      gap: moderateHeightScale(10),
      paddingHorizontal: moderateWidthScale(20),
    },
    titleSec: {
      marginTop: moderateHeightScale(8),
      gap: moderateHeightScale(5),
    },
    title: {
      fontSize: fontSize.size24,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    subtitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
    },
    profileSection: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: moderateHeightScale(20),
      gap: moderateWidthScale(15),
    },
    profileImageContainer: {
      width: widthScale(90),
      height: widthScale(90),
      borderRadius: moderateWidthScale(12),
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    profileImage: {
      width: "100%",
      height: "100%",
      borderRadius: moderateWidthScale(12),
      overflow: "hidden",
    },
    uploadSection: {
      flex: 1,
      justifyContent: "space-between",
      gap: moderateHeightScale(10),
    },
    uploadText: {
      fontSize: fontSize.size15,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    uploadButton: {
      backgroundColor: theme.orangeBrown,
      borderWidth: 2,
      borderColor: theme.darkGreen,
      borderRadius: 9999,
      paddingVertical: moderateHeightScale(8),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: moderateWidthScale(8),
      width: moderateWidthScale(155),
    },
    uploadButtonText: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.darkGreen,
    },
    googleDriveLink: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.selectCard,
      textDecorationLine: "underline",
      textDecorationColor: theme.selectCard,
    },
    inputContainer: {
      marginTop: moderateHeightScale(20),
    },
    textAreaContainer: {
      marginTop: moderateHeightScale(20),
      position: "relative",
    },
    textAreaLabel: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    textArea: {
      borderRadius: moderateWidthScale(12),
      borderWidth: 1,
      borderColor: theme.lightGreen2,
      backgroundColor: theme.white,
      paddingHorizontal: moderateWidthScale(16),
      paddingVertical: moderateHeightScale(12),
      fontSize: fontSize.size15,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
      minHeight: moderateHeightScale(120),
      textAlignVertical: "top",
      // Extra right padding so text doesn't go under the clear (X) button
      paddingRight: moderateWidthScale(40),
    },
    clearButton: {
      position: "absolute",
      top: moderateHeightScale(12),
      right: moderateWidthScale(12),
      zIndex: 1,
    },
    errorText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.link,
      marginTop: moderateHeightScale(4),
    },
  });

export default function StepOne() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const dispatch = useAppDispatch();
  const { fullName, profileImageUri, aboutYourself } = useAppSelector(
    (state) => state.completeProfile
  );

 

  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [aboutYourselfError, setAboutYourselfError] = useState<string | null>(null);

  const handleAboutYourselfChange = (text: string) => {
    dispatch(setAboutYourself(text));
  };

  const handleClearAboutYourself = useCallback(() => {
    dispatch(setAboutYourself(""));
    setAboutYourselfError(null);
  }, [dispatch]);

  // Validate full name in real-time
  useEffect(() => {
    if (fullName.trim().length > 0) {
      const validation = validateName(fullName.trim(), "Full name");
      setFullNameError(validation.error);
    } else {
      setFullNameError(null);
    }
  }, [fullName]);

  // Validate about yourself in real-time (optional field - only validate if content exists)
  useEffect(() => {
    if (aboutYourself.trim().length > 0) {
      const validation = validateDescription(aboutYourself.trim(), 10, 1000);
      setAboutYourselfError(validation.error);
    } else {
      setAboutYourselfError(null);
    }
  }, [aboutYourself]);

  const handleProfileImageChange = (uri: string | null) => {
    dispatch(setProfileImageUri(uri));
  };


  const handleUploadPhoto = () => {
    setShowImagePickerModal(true);
  };

  const handleImportFromGoogleDrive = () => {
    // TODO: Implement Google Drive import
    Logger.log("Import from Google Drive pressed");
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleSec}>
        <Text style={styles.title}>Create your personal profile</Text>
        <Text style={styles.subtitle}>
          Upload your photo and enter your details to get started with FreshPass.
        </Text>
      </View>

      <View style={styles.profileSection}>
        <View style={styles.profileImageContainer}>
          {profileImageUri ? (
            <Image
              source={{ uri: profileImageUri }}
              style={styles.profileImage}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.profileImage,
                {
                  backgroundColor: theme.emptyProfileImage,
                  alignItems: "center",
                  justifyContent: "flex-end",
                },
              ]}
            >
              <MaterialIcons
                name="person"
                size={moderateWidthScale(100)}
                color={theme.lightGreen2}
              />
            </View>
          )}
        </View>
        <View style={styles.uploadSection}>
          <Text style={styles.uploadText}>Add your image</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleUploadPhoto}
            style={styles.uploadButton}
          >
            <MaterialIcons
              name="arrow-upward"
              size={moderateWidthScale(18)}
              color={theme.darkGreen}
            />
            <Text style={styles.uploadButtonText}>Upload photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled
            activeOpacity={0.7}
            onPress={handleImportFromGoogleDrive}
          >
            {/* <Text style={styles.googleDriveLink}>
              Import from google drive
            </Text> */}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <FloatingInput
          label="Full name"
          value={fullName}
          onChangeText={(text) => dispatch(setFullName(text))}
          placeholder="Full name"
          autoCapitalize="words"
        />
        {fullNameError && (
          <Text style={styles.errorText}>{fullNameError}</Text>
        )}
      </View>

      <View style={styles.textAreaContainer}>
        <TextInput
          style={styles.textArea}
          value={aboutYourself}
          onChangeText={handleAboutYourselfChange}
          placeholder="Write about yourself"
          placeholderTextColor={theme.lightGreen2}
          multiline
          numberOfLines={6}
        />
        {aboutYourself.length > 0 && (
          <Pressable
            onPress={handleClearAboutYourself}
            style={styles.clearButton}
            hitSlop={moderateWidthScale(8)}
          >
            <CloseIcon color={theme.darkGreen} />
          </Pressable>
        )}
        {aboutYourselfError && (
          <Text style={styles.errorText}>{aboutYourselfError}</Text>
        )}
      </View>

      <ImagePickerModal
        visible={showImagePickerModal}
        onClose={() => setShowImagePickerModal(false)}
        onImageSelected={handleProfileImageChange}
      />
    </View>
  );
}

