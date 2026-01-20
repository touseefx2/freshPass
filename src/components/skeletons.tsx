import React, { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import SkeletonPlaceholder from "react-native-skeleton-placeholder";
import { useAppSelector, useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";

const createSkeletonStyles = (theme: Theme) =>
  StyleSheet.create({
    titleSkeleton: {
      height: moderateHeightScale(28),
      width: "60%",
      borderRadius: moderateWidthScale(4),
    },
    subtitleSkeleton: {
      height: moderateHeightScale(18),
      width: "90%",
      borderRadius: moderateWidthScale(4),
      marginTop: moderateHeightScale(5),
      marginBottom: moderateHeightScale(20),
    },
    searchSkeleton: {
      height: heightScale(18),
      borderRadius: moderateWidthScale(999),
      width: "100%",
    },
    searchSkeletonS: {
      height: heightScale(46),
      borderRadius: moderateWidthScale(999),
      width: "100%",
    },
    categoryImageSkeleton: {
      width: "100%",
      height: heightScale(90),
      borderRadius: moderateWidthScale(12),
    },
    categoryLabelSkeleton: {
      marginTop: moderateHeightScale(5),
      height: moderateHeightScale(16),
      width: "80%",
      alignSelf: "center",
      borderRadius: moderateWidthScale(4),
    },
    otherCategoriesTitleSkeleton: {
      height: moderateHeightScale(20),
      width: "40%",
      borderRadius: moderateWidthScale(4),
    },
    otherCategoryItem: {
      gap: moderateHeightScale(12),
    },
    otherCategoryLabelSkeleton: {
      height: moderateHeightScale(20),
      width: "70%",
      borderRadius: moderateWidthScale(4),
    },
    otherCategoryIconSkeleton: {
      height: moderateWidthScale(18),
      width: moderateWidthScale(18),
      borderRadius: moderateWidthScale(9),
    },
    emptyStateSkeleton: {
      height: moderateHeightScale(20),
      width: "60%",
      borderRadius: moderateWidthScale(4),
      alignSelf: "center",
    },
    serviceCardSkeleton: {
      height: moderateHeightScale(60),
      borderRadius: moderateWidthScale(8),
      marginBottom: moderateHeightScale(12),
    },
    popularTitleSkeleton: {
      height: moderateHeightScale(20),
      width: "50%",
      borderRadius: moderateWidthScale(4),
      marginBottom: moderateHeightScale(12),
    },
    suggestionItemSkeleton: {
      height: moderateHeightScale(50),
      borderRadius: moderateWidthScale(4),
      marginBottom: moderateHeightScale(8),
    },
    viewMoreButtonSkeleton: {
      height: moderateHeightScale(44),
      borderRadius: moderateWidthScale(12),
      marginTop: moderateHeightScale(12),
    },
    planCardSkeleton: {
      height: moderateHeightScale(200),
      borderRadius: moderateWidthScale(16),
      marginBottom: moderateHeightScale(20),
    },
    planHeaderSkeleton: {
      height: moderateHeightScale(28),
      width: "60%",
      borderRadius: moderateWidthScale(4),
      flex: 1,
    },
    planPriceSkeleton: {
      height: moderateHeightScale(28),
      width: "30%",
      borderRadius: moderateWidthScale(4),
    },
    planDescriptionSkeleton: {
      height: moderateHeightScale(16),
      width: "100%",
      borderRadius: moderateWidthScale(4),
      marginBottom: moderateHeightScale(4),
    },
    planDetailSkeleton: {
      height: moderateHeightScale(16),
      width: "80%",
      borderRadius: moderateWidthScale(4),
      marginBottom: moderateHeightScale(8),
    },
    planButtonSkeleton: {
      height: moderateHeightScale(44),
      borderRadius: moderateWidthScale(12),
      marginTop: moderateHeightScale(8),
    },
    staffCon: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: moderateWidthScale(20),
    },
    staffOnDutyAvatar: {
      width: widthScale(52),
      height: widthScale(52),
      borderRadius: widthScale(52 / 2),
    },
    staffOnDutyName: {
      height: moderateHeightScale(14),
      width: moderateWidthScale(60),
      borderRadius: moderateWidthScale(4),
    },
    appointmentsSectionUpcomingCard: {
      height: moderateHeightScale(42),
      borderRadius: moderateWidthScale(6),
      marginBottom: moderateHeightScale(12),
    },
    appointmentsSectionCard: {
      height: moderateHeightScale(100),
      borderRadius: moderateWidthScale(8),
      marginBottom: moderateHeightScale(12),
    },
    workHistoryItemSkeleton: {
      height: moderateHeightScale(50),
      borderRadius: moderateWidthScale(4),
      marginBottom: moderateHeightScale(12),
    },
    workHistoryServiceSkeleton: {
      height: moderateHeightScale(16),
      width: "70%",
      borderRadius: moderateWidthScale(4),
      marginBottom: moderateHeightScale(4),
    },
    workHistoryDateSkeleton: {
      height: moderateHeightScale(12),
      width: "50%",
      borderRadius: moderateWidthScale(4),
    },
    workHistoryPriceSkeleton: {
      height: moderateHeightScale(18),
      width: moderateWidthScale(60),
      borderRadius: moderateWidthScale(4),
    },
    reviewCardSkeleton: {
      height: moderateHeightScale(150),
      borderRadius: moderateWidthScale(8),
      marginBottom: moderateHeightScale(16),
      marginHorizontal: moderateWidthScale(20),
    },
    reviewHeaderSkeleton: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: moderateHeightScale(12),
    },
    reviewAvatarSkeleton: {
      width: widthScale(42),
      height: widthScale(42),
      borderRadius: moderateWidthScale(4),
      marginRight: moderateWidthScale(12),
    },
    reviewNameSkeleton: {
      height: moderateHeightScale(16),
      width: moderateWidthScale(120),
      borderRadius: moderateWidthScale(4),
      marginBottom: moderateHeightScale(4),
    },
    reviewDateSkeleton: {
      height: moderateHeightScale(12),
      width: moderateWidthScale(100),
      borderRadius: moderateWidthScale(4),
    },
    reviewStarsSkeleton: {
      height: moderateHeightScale(18),
      width: moderateWidthScale(100),
      borderRadius: moderateWidthScale(4),
      marginBottom: moderateHeightScale(12),
    },
    reviewTextSkeleton: {
      height: moderateHeightScale(14),
      width: "100%",
      borderRadius: moderateWidthScale(4),
      marginBottom: moderateHeightScale(4),
    },
    reviewTextSkeletonShort: {
      height: moderateHeightScale(14),
      width: "70%",
      borderRadius: moderateWidthScale(4),
    },
    notificationSectionHeaderSkeleton: {
      height: moderateHeightScale(16),
      width: moderateWidthScale(80),
      borderRadius: moderateWidthScale(4),
      marginBottom: moderateHeightScale(12),
    },
    notificationRowSkeleton: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: moderateHeightScale(14),
      gap: moderateWidthScale(12),
    },
    notificationIconSkeleton: {
      width: moderateWidthScale(40),
      height: moderateWidthScale(40),
      borderRadius: moderateWidthScale(40 / 2),
    },
    notificationTitleSkeleton: {
      height: moderateHeightScale(16),
      width: "60%",
      borderRadius: moderateWidthScale(4),
      marginBottom: moderateHeightScale(4),
    },
    notificationTimeSkeleton: {
      height: moderateHeightScale(12),
      width: moderateWidthScale(60),
      borderRadius: moderateWidthScale(4),
    },
    notificationMessageSkeleton: {
      height: moderateHeightScale(14),
      width: "100%",
      borderRadius: moderateWidthScale(4),
      marginBottom: moderateHeightScale(2),
    },
    notificationMessageSkeletonShort: {
      height: moderateHeightScale(14),
      width: "70%",
      borderRadius: moderateWidthScale(4),
    },
    memberCard2: {
      marginTop: moderateHeightScale(12),
      marginBottom: moderateHeightScale(12),
    },
    memeberDivider: {
      marginVertical: 3,
    },
  });

export const Skeleton = ({
  screenType,
  styles,
}: {
  screenType:
    | ""
    | "StepOne"
    | "StepEight"
    | "BusinessPlans"
    | "SummaryStats"
    | "StaffOnDuty"
    | "AppointmentsSection"
    | "WorkHistory"
    | "WorkHistoryList"
    | "Reviews"
    | "Notifications"
    | "Team"
    | "Availability"
    | "CategorySelect"
    | "VerificationModal";
  styles?: Record<string, any>;
}) => {
  const { colors } = useTheme();
  const skeletonStyles = useMemo(
    () => createSkeletonStyles(colors as Theme),
    [colors]
  );
  const userRole = useAppSelector((state) => state.user.userRole);
  const isStaff = userRole === "staff";
  const isBusiness = userRole === "business";
  const isClient = userRole === "customer";

  const stepOneSkeleton = styles ? (
    <>
      <View style={styles.titleSec}>
        <View style={skeletonStyles.titleSkeleton} />
        <View style={skeletonStyles.subtitleSkeleton} />
      </View>

      <View style={styles.searchContainer}>
        <View style={skeletonStyles.searchSkeleton} />
      </View>

      <View style={styles.categoriesContainer}>
        <View style={[styles.lineSeparator, { top: 0 }]} />
        <View style={styles.categoriesGrid}>
          {[...Array(6)].map((_, index) => (
            <View key={index} style={styles.categoryCard}>
              <View style={skeletonStyles.categoryImageSkeleton} />
              <View style={skeletonStyles.categoryLabelSkeleton} />
            </View>
          ))}
        </View>
        <View style={[styles.lineSeparator, { bottom: 0 }]} />
      </View>

      <View style={styles.otherCategoriesContainer}>
        <View style={skeletonStyles.otherCategoriesTitleSkeleton} />
        {[...Array(8)].map((_, index) => (
          <View key={index} style={skeletonStyles.otherCategoryItem}>
            <View style={styles.otherCategoryRow}>
              <View style={skeletonStyles.otherCategoryLabelSkeleton} />
              <View style={skeletonStyles.otherCategoryIconSkeleton} />
            </View>
            {index < 7 && <View style={styles.catSeparator} />}
          </View>
        ))}
      </View>
    </>
  ) : null;

  const stepEightSkeleton = styles ? (
    <>
      <View style={styles.titleSec}>
        <View style={skeletonStyles.titleSkeleton} />
        <View style={skeletonStyles.subtitleSkeleton} />
      </View>

      {/* <View style={styles.emptyState}>
        <View style={skeletonStyles.emptyStateSkeleton} />
      </View> */}

      <View style={styles.popularSection}>
        {/* <View style={skeletonStyles.popularTitleSkeleton} /> */}
        {[...Array(3)].map((_, index) => (
          <View key={index} style={skeletonStyles.suggestionItemSkeleton} />
        ))}
      </View>

      <View style={skeletonStyles.viewMoreButtonSkeleton} />
    </>
  ) : null;

  const businessPlansSkeleton = styles ? (
    <ScrollView
      style={styles.content}
      contentContainerStyle={[
        styles.plansContainer,
        { paddingBottom: moderateHeightScale(30) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <SkeletonPlaceholder backgroundColor="#E8DFB8" highlightColor="#DCCF9E">
        <View style={{ gap: moderateHeightScale(20) }}>
          {[...Array(3)].map((_, index) => (
            <View key={index} style={styles.planCard}>
              <View style={styles.planHeader}>
                <View style={skeletonStyles.planHeaderSkeleton} />
                <View style={skeletonStyles.planPriceSkeleton} />
              </View>
              <View style={skeletonStyles.planDescriptionSkeleton} />
              <View style={skeletonStyles.planDescriptionSkeleton} />
              <View style={styles.planDetails}>
                <View style={skeletonStyles.planDetailSkeleton} />
                <View style={skeletonStyles.planDetailSkeleton} />
                <View style={skeletonStyles.planDetailSkeleton} />
              </View>
              <View style={skeletonStyles.planButtonSkeleton} />
            </View>
          ))}
        </View>
      </SkeletonPlaceholder>
    </ScrollView>
  ) : null;

  const summaryStatsSkeleton = styles ? (
    <>
      <View style={isStaff ? styles.statsRowStaff : styles.statsRow}>
        <View style={styles.revenueCard} />
        <View style={styles.revenueCard} />
      </View>

      {isBusiness && (
        <View style={styles.appointmentStatsRow}>
          {[...Array(3)].map((_, index) => (
            <View key={index} style={styles.appointmentStatCard} />
          ))}
        </View>
      )}
    </>
  ) : null;

  const staffOnDutySkeleton = styles ? (
    <View style={skeletonStyles.staffCon}>
      {[...Array(5)].map((_, index) => (
        <View
          key={index}
          style={[styles.staffItem, index === 0 && styles.staffItemFirst]}
        >
          <View style={skeletonStyles.staffOnDutyAvatar} />
          <View style={skeletonStyles.staffOnDutyName} />
        </View>
      ))}
    </View>
  ) : null;

  const appointmentsSectionSkeleton = styles ? (
    <>
      <View style={skeletonStyles.appointmentsSectionUpcomingCard} />
      <View style={skeletonStyles.appointmentsSectionCard} />
    </>
  ) : null;

  const workHistorySkeleton = styles ? (
    <>
      {[...Array(3)].map((_, index) => (
        <View key={index}>
          <View style={styles.workHistoryItem}>
            <View style={{ flex: 1 }}>
              <View style={skeletonStyles.workHistoryServiceSkeleton} />
              <View style={skeletonStyles.workHistoryDateSkeleton} />
            </View>
            <View style={skeletonStyles.workHistoryPriceSkeleton} />
          </View>
          {index < 2 && <View style={styles.line} />}
        </View>
      ))}
    </>
  ) : null;

  const workHistoryListSkeleton = styles ? (
    <>
      {[...Array(10)].map((_, index) => (
        <View key={index}>
          <View style={styles.workHistoryItem}>
            <View style={{ flex: 1 }}>
              <View style={skeletonStyles.workHistoryServiceSkeleton} />
              <View style={skeletonStyles.workHistoryDateSkeleton} />
            </View>
            <View style={skeletonStyles.workHistoryPriceSkeleton} />
          </View>
          {index < 9 && <View style={styles.line} />}
        </View>
      ))}
    </>
  ) : null;

  const reviewsSkeleton = styles ? (
    <>
      <View style={styles.headerSection}>
        <View style={skeletonStyles.titleSkeleton} />
        <View style={skeletonStyles.subtitleSkeleton} />
      </View>
      {[...Array(3)].map((_, index) => (
        <View key={index} style={styles.card}>
          <View style={skeletonStyles.reviewHeaderSkeleton}>
            <View style={skeletonStyles.reviewAvatarSkeleton} />
            <View style={{ flex: 1 }}>
              <View style={skeletonStyles.reviewNameSkeleton} />
              <View style={skeletonStyles.reviewDateSkeleton} />
            </View>
          </View>
          <View style={skeletonStyles.reviewStarsSkeleton} />
          <View style={skeletonStyles.reviewTextSkeleton} />
          <View style={skeletonStyles.reviewTextSkeleton} />
          <View style={skeletonStyles.reviewTextSkeletonShort} />
        </View>
      ))}
    </>
  ) : null;

  const notificationsSkeleton = styles ? (
    <>
      {[...Array(2)].map((_, sectionIndex) => (
        <View key={sectionIndex} style={styles.sectionContainer}>
          <View style={skeletonStyles.notificationSectionHeaderSkeleton} />
          {[...Array(3)].map((_, index) => (
            <View key={index} style={skeletonStyles.notificationRowSkeleton}>
              <View style={skeletonStyles.notificationIconSkeleton} />
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: moderateHeightScale(4),
                  }}
                >
                  <View style={skeletonStyles.notificationTitleSkeleton} />
                  <View style={skeletonStyles.notificationTimeSkeleton} />
                </View>
                <View style={skeletonStyles.notificationMessageSkeleton} />
                <View style={skeletonStyles.notificationMessageSkeletonShort} />
              </View>
            </View>
          ))}
        </View>
      ))}
    </>
  ) : null;

  const teamSkeleton = styles ? (
    <>
      <View style={styles.titleSec}>
        <View style={skeletonStyles.titleSkeleton} />
        <View style={skeletonStyles.subtitleSkeleton} />
      </View>

      {[...Array(5)].map((_, index) => (
        <React.Fragment key={index}>
          <View style={[styles.memberCard, skeletonStyles.memberCard2]}>
            <View style={skeletonStyles.staffOnDutyAvatar} />
            <View
              style={{
                flex: 1,
                marginLeft: moderateWidthScale(12),
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{
                  flex: 1,
                  marginRight: moderateWidthScale(12),
                }}
              >
                <View style={skeletonStyles.workHistoryServiceSkeleton} />
                <View
                  style={[
                    skeletonStyles.workHistoryDateSkeleton,
                    { marginTop: moderateHeightScale(4) },
                  ]}
                />
              </View>
              <View
                style={[
                  skeletonStyles.workHistoryDateSkeleton,
                  { width: moderateWidthScale(80) },
                ]}
              />
            </View>
          </View>
          {index <= 5 && <View style={styles.divider} />}
        </React.Fragment>
      ))}
    </>
  ) : null;

  const availabilitySkeleton = styles ? (
    <>
      <View style={styles.titleSec}>
        <View style={skeletonStyles.titleSkeleton} />
        <View style={skeletonStyles.subtitleSkeleton} />
      </View>
      {[...Array(7)].map((_, index) => (
        <View key={index}>
          <View style={styles.skeletonDayRow} />
          {index < 6 && <View style={{ height: moderateHeightScale(2) }} />}
        </View>
      ))}
    </>
  ) : null;

  const categorySelectSkeleton = styles ? (
    <>
      <View style={{ flex: 1, gap: moderateHeightScale(60) }}>
        <View style={styles.searchContainer}>
          <View style={skeletonStyles.searchSkeletonS} />
        </View>

        <View style={styles.categoriesContainer}>
          <View style={[styles.lineSeparator, { top: 0 }]} />
          <View style={styles.categoriesGridSkeleton}>
            {[...Array(9)].map((_, index) => (
              <View key={index} style={styles.categoryCard}>
                <View style={skeletonStyles.categoryImageSkeleton} />
                <View style={skeletonStyles.categoryLabelSkeleton} />
              </View>
            ))}
          </View>
        </View>
      </View>
    </>
  ) : null;

  const verificationModalSkeleton = styles ? (
    <>
      <View style={styles.skeletonContainer}>
        <View style={skeletonStyles.titleSkeleton} />
        <View style={styles.instructionContainer}>
          <View style={skeletonStyles.subtitleSkeleton} />
          <View style={skeletonStyles.subtitleSkeleton} />
        </View>
        <View style={styles.skeletonCodeContainer}>
          {[...Array(5)].map((_, index) => (
            <View key={index} style={styles.skeletonCodeInput} />
          ))}
        </View>
        <View style={skeletonStyles.subtitleSkeleton} />
      </View>
    </>
  ) : null;

  return (
    <>
      {screenType === "StepOne" && (
        <SkeletonPlaceholder backgroundColor="#E8DFB8" highlightColor="#DCCF9E">
          {stepOneSkeleton}
        </SkeletonPlaceholder>
      )}
      {screenType === "StepEight" && (
        <SkeletonPlaceholder backgroundColor="#E8DFB8" highlightColor="#DCCF9E">
          {stepEightSkeleton}
        </SkeletonPlaceholder>
      )}
      {screenType === "BusinessPlans" && businessPlansSkeleton}
      {screenType === "SummaryStats" && (
        <SkeletonPlaceholder backgroundColor="#E8DFB8" highlightColor="#DCCF9E">
          {summaryStatsSkeleton}
        </SkeletonPlaceholder>
      )}
      {screenType === "StaffOnDuty" && (
        <SkeletonPlaceholder backgroundColor="#E8DFB8" highlightColor="#DCCF9E">
          {staffOnDutySkeleton}
        </SkeletonPlaceholder>
      )}
      {screenType === "AppointmentsSection" && (
        <SkeletonPlaceholder backgroundColor="#E8DFB8" highlightColor="#DCCF9E">
          {appointmentsSectionSkeleton}
        </SkeletonPlaceholder>
      )}
      {screenType === "WorkHistory" && (
        <SkeletonPlaceholder backgroundColor="#E8DFB8" highlightColor="#DCCF9E">
          {workHistorySkeleton}
        </SkeletonPlaceholder>
      )}
      {screenType === "WorkHistoryList" && (
        <SkeletonPlaceholder backgroundColor="#E8DFB8" highlightColor="#DCCF9E">
          {workHistoryListSkeleton}
        </SkeletonPlaceholder>
      )}
      {screenType === "Reviews" && (
        <SkeletonPlaceholder backgroundColor="#E8DFB8" highlightColor="#DCCF9E">
          {reviewsSkeleton}
        </SkeletonPlaceholder>
      )}
      {screenType === "Notifications" && (
        <SkeletonPlaceholder backgroundColor="#E8DFB8" highlightColor="#DCCF9E">
          {notificationsSkeleton}
        </SkeletonPlaceholder>
      )}
      {screenType === "Team" && (
        <SkeletonPlaceholder backgroundColor="#E8DFB8" highlightColor="#DCCF9E">
          {teamSkeleton}
        </SkeletonPlaceholder>
      )}
      {screenType === "Availability" && (
        <SkeletonPlaceholder backgroundColor="#E8DFB8" highlightColor="#DCCF9E">
          {availabilitySkeleton}
        </SkeletonPlaceholder>
      )}
      {screenType === "CategorySelect" && (
        <SkeletonPlaceholder backgroundColor="#E8DFB8" highlightColor="#DCCF9E">
          {categorySelectSkeleton}
        </SkeletonPlaceholder>
      )}
      {screenType === "VerificationModal" && (
        <SkeletonPlaceholder backgroundColor="#E8DFB8" highlightColor="#DCCF9E">
          {verificationModalSkeleton}
        </SkeletonPlaceholder>
      )}
    </>
  );
};
