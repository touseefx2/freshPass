import React, {
  useMemo,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";
import { createStyles } from "./styles";
import StackHeader from "@/src/components/StackHeader";
import Button from "@/src/components/button";
import HowToUseVideoModal from "@/src/components/HowToUseVideoModal";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import {
  GeneratePostIcon,
  GenerateCollageIcon,
  GenerateReelIcon,
  PersonScissorsIcon,
} from "@/assets/icons";
import { ApiService } from "@/src/services/api";
import { userEndpoints } from "@/src/services/endpoints";
import { setUserDetails } from "@/src/state/slices/userSlice";

const TUTORIAL_VIDEO_URI = "https://getfreshpass.com/videos/hair-tryon.MP4";
const SEEK_STEP_SEC = 5;

function formatTime(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface TutorialInlineVideoProps {
  onExpand: () => void;
}

function TutorialInlineVideo({ onExpand }: TutorialInlineVideoProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const hasAutoPlayedRef = useRef(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const player = useVideoPlayer(TUTORIAL_VIDEO_URI, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.5;
  });

  useEffect(() => {
    const statusSub = player.addListener("statusChange", ({ status }) => {
      if (status === "readyToPlay") {
        setIsVideoReady(true);
        setDuration(player.duration);
        if (!hasAutoPlayedRef.current) {
          hasAutoPlayedRef.current = true;
          player.play();
        }
      }
    });
    const playingSub = player.addListener(
      "playingChange",
      ({ isPlaying: playing }) => {
        setIsPlaying(playing);
      },
    );
    const timeSub = player.addListener("timeUpdate", (payload) => {
      setCurrentTime(payload.currentTime);
      if (duration <= 0 && player.duration > 0) setDuration(player.duration);
    });
    const endSub = player.addListener("playToEnd", () => {
      player.pause();
      player.currentTime = 0;
      setIsPlaying(false);
    });
    return () => {
      statusSub.remove();
      playingSub.remove();
      timeSub.remove();
      endSub.remove();
    };
  }, [player]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      player.pause();
    } else {
      if (duration > 0 && currentTime >= duration - 0.1) {
        player.replay();
      }
      player.play();
    }
  }, [isPlaying, player, currentTime, duration]);

  const handleSeek = useCallback(
    (deltaSec: number) => {
      player.seekBy(deltaSec);
    },
    [player],
  );

  const displayDuration = duration > 0 ? duration : player.duration;
  const displayCurrentTime = duration > 0 ? currentTime : player.currentTime;

  return (
    <View style={styles.tutorialVideoRoot}>
      <View style={StyleSheet.absoluteFill}>
        <VideoView
          player={player}
          style={styles.tutorialVideo}
          contentFit="cover"
          nativeControls={false}
          onFirstFrameRender={() => {
            if (!isVideoReady) {
              setIsVideoReady(true);
              setDuration(player.duration);
              if (!hasAutoPlayedRef.current) {
                hasAutoPlayedRef.current = true;
                player.play();
              }
            }
          }}
        />
      </View>

      <TouchableOpacity
        style={styles.tutorialExpandBtn}
        onPress={onExpand}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name="fullscreen"
          size={moderateWidthScale(18)}
          color={theme.white}
        />
      </TouchableOpacity>

      {isVideoReady && (
        <>
          <View style={styles.tutorialControlsRowWrapper}>
            <View style={styles.tutorialControlsRow}>
              <TouchableOpacity
                style={styles.tutorialControlBtn}
                onPress={() => handleSeek(-SEEK_STEP_SEC)}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="replay-10"
                  size={moderateWidthScale(12)}
                  color={theme.white}
                />
                <Text style={styles.tutorialControlBtnText}>5s</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.tutorialControlBtn}
                onPress={handlePlayPause}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={isPlaying ? "pause" : "play-arrow"}
                  size={moderateWidthScale(14)}
                  color={theme.white}
                />
                <Text style={styles.tutorialControlBtnText}>
                  {isPlaying ? t("pause") : t("play")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.tutorialControlBtn}
                onPress={() => handleSeek(SEEK_STEP_SEC)}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="forward-10"
                  size={moderateWidthScale(12)}
                  color={theme.white}
                />
                <Text style={styles.tutorialControlBtnText}>5s</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.tutorialTimeTextAbsolute}>
            {formatTime(displayCurrentTime)} / {formatTime(displayDuration)}
          </Text>
        </>
      )}

      {!isVideoReady && (
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator size="small" color={theme.white} />
          <Text style={styles.tutorialTimeText}>{t("loading")}</Text>
        </View>
      )}
    </View>
  );
}

export default function ToolList() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const user = useAppSelector((state) => state.user);
  const userRole = user?.userRole;
  const dispatch = useAppDispatch();

  const isGuest = user.isGuest;
  const isCustomer = userRole === "customer";

  const [howToUseModalVisible, setHowToUseModalVisible] = useState(false);
  const [tutorialVideoActive, setTutorialVideoActive] = useState(false);
  const openHowToUseModal = useCallback(
    () => setHowToUseModalVisible(true),
    [],
  );
  const closeHowToUseModal = useCallback(
    () => setHowToUseModalVisible(false),
    [],
  );

  const styles = useMemo(() => createStyles(colors as Theme), [colors]);

  // Business features (paramTitle is passed to tools screen and must match expected values)
  const businessFeatures = [
    {
      id: "generatePost",
      titleKey: "generatePost" as const,
      paramTitle: "Generate Post",
      icon: GeneratePostIcon,
    },
    {
      id: "generateCollage",
      titleKey: "generateCollage" as const,
      paramTitle: "Generate Collage",
      icon: GenerateCollageIcon,
    },
    {
      id: "generateReel",
      titleKey: "generateReel" as const,
      paramTitle: "Generate Reel",
      icon: GenerateReelIcon,
    },
  ];

  // Customer features – Tutorial first, then Hair Tryon
  const customerFeatures = [
    {
      id: "tutorial",
      titleKey: "tutorial" as const,
      paramTitle: "",
      icon: ({
        width,
        height,
        color,
      }: {
        width: number;
        height: number;
        color: string;
      }) => (
        <MaterialIcons name="play-circle-filled" size={width} color={color} />
      ),
      openTutorial: true,
    },
    {
      id: "hairTryon",
      titleKey: "hairTryon" as const,
      paramTitle: "Hair Tryon",
      icon: PersonScissorsIcon,
      openTutorial: false,
    },
  ];

  // Select features based on user role
  // Business users see social media tools, customers/staff/others see Hair Tryon
  const features =
    userRole === "business" ? businessFeatures : customerFeatures;

  // Header title based on role (localized)
  const headerTitle =
    userRole === "business" ? t("socialMediaAiTool") : t("aiTool");

  useEffect(() => {
    fetchQuota();
  }, []);

  const fetchQuota = async () => {
    try {
      const response = await ApiService.get<{
        success: boolean;
        data?: { ai_quota?: number };
      }>(userEndpoints.details);
      if (response?.success && response.data?.ai_quota !== undefined) {
        dispatch(setUserDetails({ ai_quota: response.data.ai_quota }));
      }
    } catch {}
  };

  const handleFeaturePress = (paramTitle: string) => {
    router.push({
      pathname: "/(main)/aiTools/tools",
      params: { toolType: paramTitle },
    });
  };

  return (
    <View style={styles.safeArea}>
      <StackHeader title={t("aiTools")} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!isGuest && (
          <View style={styles.actionButtonsRow}>
            {isCustomer && (
              <View style={styles.actionButtonFlex}>
                <Button
                  containerStyle={styles.actionButton}
                  title={t("myPurchases")}
                  onPress={() => router.push("/aiTransactions")}
                />
              </View>
            )}
            <View style={styles.actionButtonFlex}>
              <Button
                containerStyle={styles.actionButton}
                title={t("aiRequests")}
                onPress={() => router.push("/aiRequests")}
              />
            </View>
          </View>
        )}

        <View style={styles.featuresContainer}>
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            const openTutorial =
              "openTutorial" in feature && feature.openTutorial;
            const isTutorial = feature.id === "tutorial";
            const useLargeBox =
              userRole !== "business" &&
              (feature.id === "tutorial" || feature.id === "hairTryon");
            const boxStyle = useLargeBox
              ? styles.featureBoxLarge
              : styles.featureBox;

            if (isTutorial && tutorialVideoActive) {
              return (
                <View key={feature.id} style={boxStyle}>
                  <TutorialInlineVideo onExpand={openHowToUseModal} />
                </View>
              );
            }

            return (
              <TouchableOpacity
                key={feature.id}
                style={boxStyle}
                onPress={() => {
                  if (openTutorial) {
                    setTutorialVideoActive(true);
                  } else {
                    handleFeaturePress(feature.paramTitle);
                  }
                }}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[
                    (colors as Theme).buttonBack,
                    (colors as Theme).darkGreen,
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientContainer}
                >
                  <View style={styles.iconContainer}>
                    <IconComponent
                      width={moderateWidthScale(32)}
                      height={moderateWidthScale(32)}
                      color={(colors as Theme).white}
                    />
                  </View>
                  <Text style={styles.featureTitle}>{t(feature.titleKey)}</Text>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <HowToUseVideoModal
        visible={howToUseModalVisible}
        onClose={closeHowToUseModal}
      />
    </View>
  );
}
