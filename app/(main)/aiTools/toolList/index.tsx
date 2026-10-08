import React, { useMemo, useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import Animated, { FadeInDown, ReduceMotion } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppDispatch, useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { moderateWidthScale } from "@/src/theme/dimensions";
import { createStyles } from "./styles";
import StackHeader from "@/src/components/StackHeader";
import MediaLibraryMyReelsTab from "@/src/components/mediaLibraryMyReelsTab";
import { canManageReels } from "@/src/utils/reelUploadGate";
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
import {
  getTutorialVideoTryonUri,
} from "@/src/services/remoteConfigService";


type ToolIcon = React.ComponentType<{
  width: number;
  height: number;
  color: string;
}>;

type LibraryLink = {
  key: string;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  title: string;
  desc: string;
  onPress: () => void;
  /** Row that opens content below it (tutorial video). */
  expanded?: boolean;
};

function TutorialInlineVideo() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const [isVideoReady, setIsVideoReady] = useState(false);

  const player = useVideoPlayer(getTutorialVideoTryonUri(), (p) => {
    p.loop = false;
  });

  return (
    <View style={styles.tutorialVideoRoot}>
      <View style={StyleSheet.absoluteFill}>
        <VideoView
          player={player}
          style={styles.tutorialVideo}
          contentFit="cover"
          nativeControls={true}
          onFirstFrameRender={async () => {
            if (!isVideoReady) {
              await player.play();
              setTimeout(() => {
                setIsVideoReady(true);
              }, 200);
            }
          }}
        />
      </View>

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
  const aiQuota = user?.ai_quota;
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{
    mode?: string;
    tab?: string;
    highlightReelId?: string;
  }>();

  const isCustomer = userRole === "customer";
  const isBusiness = userRole === "business";
  const isStaff = userRole === "staff";
  // Owner and staff both manage the business's reels (staff within their monthly number)
  const canManageBusinessReels = canManageReels(userRole);
  const showAiTools =
    !canManageBusinessReels || params.mode === "aiTools" || isCustomer;

  const [tutorialVideoActive, setTutorialVideoActive] = useState(false);

  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const theme = colors as Theme;

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

  // "Create AI reel" → template gallery on the Video tab
  const openTemplateGallery = () => {
    router.push({
      pathname: "/(main)/templateGallery",
      params: { kind: "video" },
    } as any);
  };

  const openTool = (paramTitle: string) => {
    router.push({
      pathname: "/(main)/aiTools/tools",
      params: { toolType: paramTitle },
    });
  };

  const brandGradient = [theme.darkGreen, theme.buttonBack] as const;

  // ── Hero: what this hub is for, per role ───────────────────────────
  // Anyone who isn't business / staff gets the customer tools (as before)
  const heroCopy = isStaff
    ? { title: t("aiToolsHeroTitleStaff"), sub: t("aiToolsHeroSubStaff") }
    : isBusiness
      ? { title: t("aiToolsHeroTitleBusiness"), sub: t("aiToolsHeroSubBusiness") }
      : { title: t("aiToolsHeroTitleCustomer"), sub: t("aiToolsHeroSubCustomer") };

  const renderHero = () => (
    <LinearGradient
      colors={brandGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View style={styles.heroGlow} pointerEvents="none" />
      <View style={styles.heroGlowSmall} pointerEvents="none" />
      <View style={styles.eyebrow}>
        <MaterialIcons
          name="auto-awesome"
          size={moderateWidthScale(13)}
          color={theme.white}
        />
        <Text style={styles.eyebrowText}>{t("aiStudio")}</Text>
      </View>
      <Text style={styles.heroTitle} accessibilityRole="header">
        {heroCopy.title}
      </Text>
      <Text style={styles.heroSubtitle}>{heroCopy.sub}</Text>
      {/* Try-on credits are a customer thing */}
      {isCustomer && aiQuota != null ? (
        <View style={styles.creditChip}>
          <MaterialIcons
            name="bolt"
            size={moderateWidthScale(15)}
            color={theme.selectCard}
          />
          <Text style={styles.creditChipText}>
            {t("aiCreditsLeft", { count: aiQuota })}
          </Text>
        </View>
      ) : null}
    </LinearGradient>
  );

  // ── Featured tool: the one main thing to do here ───────────────────
  const renderFeatured = ({
    icon: Icon,
    title,
    desc,
    cta,
    onPress,
    expanded,
  }: {
    icon: ToolIcon;
    title: string;
    desc: string;
    cta: string;
    onPress: () => void;
    /** Set for a card that opens options below it (Generate Reel). */
    expanded?: boolean;
  }) => {
    const toggles = expanded !== undefined;
    return (
      <View style={styles.featuredShadow}>
        <TouchableOpacity
          style={styles.featuredCard}
          onPress={onPress}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel={title}
          accessibilityHint={desc}
          accessibilityState={toggles ? { expanded } : undefined}
        >
          <View style={styles.featuredTop}>
            <LinearGradient
              colors={brandGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.featuredIcon}
            >
              <Icon
                width={moderateWidthScale(26)}
                height={moderateWidthScale(26)}
                color={theme.white}
              />
            </LinearGradient>
            <View style={styles.featuredTextCol}>
              <Text style={styles.featuredTitle}>{title}</Text>
              <Text style={styles.featuredDesc}>{desc}</Text>
            </View>
          </View>
          <View style={[styles.featuredCta, expanded && styles.featuredCtaOpen]}>
            <Text style={styles.featuredCtaText}>{cta}</Text>
            <MaterialIcons
              name={
                toggles ? (expanded ? "expand-less" : "expand-more") : "arrow-forward"
              }
              size={moderateWidthScale(18)}
              color={theme.buttonText}
            />
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderToolCard = ({
    icon: Icon,
    title,
    desc,
    onPress,
  }: {
    icon: ToolIcon;
    title: string;
    desc: string;
    onPress: () => void;
  }) => (
    <View style={styles.toolShadow} key={title}>
      <TouchableOpacity
        style={styles.toolCard}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={desc}
      >
        <View style={styles.toolCardTop}>
          <View style={styles.toolIcon}>
            <Icon
              width={moderateWidthScale(22)}
              height={moderateWidthScale(22)}
              color={theme.darkGreen}
            />
          </View>
          <View style={styles.toolArrow}>
            <MaterialIcons
              name="arrow-outward"
              size={moderateWidthScale(14)}
              color={theme.darkGreen}
            />
          </View>
        </View>
        <Text style={styles.toolTitle}>{title}</Text>
        <Text style={styles.toolDesc}>{desc}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderListCard = (links: LibraryLink[]) => (
    <View style={styles.listShadow}>
      <View style={styles.listCard}>
        {links.map((link, i) => (
          <TouchableOpacity
            key={link.key}
            style={[styles.listRow, i > 0 && styles.listRowDivider]}
            onPress={link.onPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={link.title}
            accessibilityHint={link.desc}
            accessibilityState={
              link.expanded !== undefined ? { expanded: link.expanded } : undefined
            }
          >
            <View style={styles.listIcon}>
              <MaterialIcons
                name={link.icon}
                size={moderateWidthScale(20)}
                color={theme.darkGreen}
              />
            </View>
            <View style={styles.listTextCol}>
              <Text style={styles.listTitle}>{link.title}</Text>
              <Text style={styles.listDesc} numberOfLines={1}>
                {link.desc}
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={moderateWidthScale(22)}
              color={theme.lightGreen5}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Monthly reel limit is checked on the reel screens behind the gallery
  const reelFeatured = () =>
    renderFeatured({
      icon: GenerateReelIcon,
      title: t("generateReel"),
      desc: t("generateReelDesc"),
      cta: t("generateReelCta"),
      onPress: openTemplateGallery,
    });

  const libraryLinks: LibraryLink[] = [
    ...(isCustomer
      ? [
          {
            key: "purchases",
            icon: "shopping-bag" as const,
            title: t("myPurchases"),
            desc: t("myPurchasesDesc"),
            onPress: () => router.push("/aiTransactions"),
          },
        ]
      : []),
    {
      key: "requests",
      icon: "list-alt",
      title: t("aiRequests"),
      desc: isStaff ? t("aiRequestsDescStaff") : t("aiRequestsDesc"),
      onPress: () =>
        isStaff
          ? router.push({
              pathname: "/(main)/aiRequests",
              params: { tab: "reels" },
            } as any)
          : router.push("/aiRequests"),
    },
    ...(isStaff
      ? []
      : [
          {
            key: "memories",
            icon: "psychology" as const,
            title: t("memories"),
            desc: t("memoriesDesc"),
            onPress: () => router.push("/aiMemories"),
          },
        ]),
  ];

  const renderCreate = () => {
    if (isStaff) return reelFeatured();
    if (!isBusiness) {
      return (
        <>
          {renderFeatured({
            icon: PersonScissorsIcon,
            title: t("hairTryon"),
            desc: t("hairTryonDesc"),
            cta: t("hairTryonCta"),
            onPress: () => openTool("Hair Tryon"),
          })}
          <View style={styles.stackGap} />
          {renderListCard([
            {
              key: "tutorial",
              icon: tutorialVideoActive ? "expand-less" : "play-circle-outline",
              title: t("tutorialRowTitle"),
              desc: t("tutorialRowDesc"),
              onPress: () => setTutorialVideoActive((on) => !on),
              expanded: tutorialVideoActive,
            },
          ])}
          {tutorialVideoActive ? (
            <Animated.View
              style={styles.tutorialPanel}
              entering={FadeInDown.duration(220).reduceMotion(ReduceMotion.System)}
            >
              <TutorialInlineVideo />
            </Animated.View>
          ) : null}
        </>
      );
    }
    return (
      <>
        {reelFeatured()}
        <View style={styles.toolGrid}>
          {renderToolCard({
            icon: GeneratePostIcon,
            title: t("generatePost"),
            desc: t("generatePostDesc"),
            onPress: () => openTool("Generate Post"),
          })}
          {renderToolCard({
            icon: GenerateCollageIcon,
            title: t("generateCollage"),
            desc: t("generateCollageDesc"),
            onPress: () => openTool("Generate Collage"),
          })}
        </View>
      </>
    );
  };

  const headerTitle = showAiTools ? t("aiTools") : t("mediaLibrary");

  return (
    <View style={styles.safeArea}>
      <StackHeader title={headerTitle} />

      {canManageBusinessReels && !showAiTools ? (
        <MediaLibraryMyReelsTab highlightReelId={params.highlightReelId} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderHero()}

          <Text style={styles.sectionLabel} accessibilityRole="header">
            {t("aiToolsCreateSection")}
          </Text>
          {renderCreate()}

          <Text style={styles.sectionLabel} accessibilityRole="header">
            {t("aiToolsLibrarySection")}
          </Text>
          {renderListCard(libraryLinks)}
        </ScrollView>
      )}
    </View>
  );
}
