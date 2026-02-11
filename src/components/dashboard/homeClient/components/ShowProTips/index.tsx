import React, { useMemo } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import ProTipCard, { ProTipCardItem } from "@/src/components/proTipCard";
import RetryButton from "@/src/components/retryButton";
import { createStyles } from "./styles";

export interface ProTipsData {
  heading: string;
  subheading: string;
  action_label: string;
  benefit_label: string;
  standard_label: string;
  cards: ProTipCardItem[];
}

interface ShowProTipsProps {
  heading: string;
  subheading: string;
  actionLabel: string;
  benefitLabel: string;
  standardLabel: string;
  cards: ProTipCardItem[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

export default function ShowProTips({
  heading,
  subheading,
  actionLabel,
  benefitLabel,
  standardLabel,
  cards,
  loading,
  error,
  onRetry,
}: ShowProTipsProps) {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.heading}>{heading}</Text>
        <Text style={styles.subheading}>{subheading}</Text>
      </View>
      {loading && cards.length <= 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : error && cards.length <= 0 ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Failed to load pro tips. Please try again.
          </Text>
          <RetryButton onPress={onRetry} loading={loading} />
        </View>
      ) : cards.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          decelerationRate={0.8}
          nestedScrollEnabled
        >
          {cards.map((item, index) => (
            <ProTipCard
              key={`${item.title}-${index}`}
              item={item}
              actionLabel={actionLabel}
              benefitLabel={benefitLabel}
              standardLabel={standardLabel}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}
