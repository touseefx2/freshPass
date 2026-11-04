import React from "react";
import { View } from "react-native";
import SkeletonPlaceholder from "react-native-skeleton-placeholder";
import {
  moderateHeightScale,
  moderateWidthScale,
  widthScale,
} from "@/src/theme/dimensions";

type Props = {
  cardWidth: number;
  gap: number;
  rows?: number;
};

/** First-load placeholder in the shape of the two-column product grid. */
export default function CatalogSkeletonGrid({
  cardWidth,
  gap,
  rows = 3,
}: Props) {
  const imageHeight = Math.round(cardWidth * 0.82);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <SkeletonPlaceholder backgroundColor="#E8DFB8" highlightColor="#DCCF9E">
        <View style={{ gap }}>
          {Array.from({ length: rows }).map((_, row) => (
            <View key={row} style={{ flexDirection: "row", gap }}>
              {[0, 1].map((col) => (
                <View key={col} style={{ width: cardWidth }}>
                  <View
                    style={{
                      width: cardWidth,
                      height: imageHeight,
                      borderRadius: moderateWidthScale(18),
                    }}
                  />
                  <View
                    style={{
                      marginTop: moderateHeightScale(10),
                      width: cardWidth * 0.75,
                      height: moderateHeightScale(14),
                      borderRadius: 4,
                    }}
                  />
                  <View
                    style={{
                      marginTop: moderateHeightScale(8),
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        width: cardWidth * 0.4,
                        height: moderateHeightScale(14),
                        borderRadius: 4,
                      }}
                    />
                    <View
                      style={{
                        width: widthScale(36),
                        height: widthScale(36),
                        borderRadius: widthScale(18),
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>
      </SkeletonPlaceholder>
    </View>
  );
}
