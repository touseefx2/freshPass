import React, { useMemo } from "react";
import { View, Text, ScrollView } from "react-native";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import ProTipCard, { ProTipCardItem } from "@/src/components/proTipCard";
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
}

export default function ShowProTips({
  heading,
  subheading,
  actionLabel,
  benefitLabel,
  standardLabel,
  cards,
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
    </View>
  );
}
