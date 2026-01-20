import React, { useMemo, useRef, useState, useEffect } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Circle, Marker, Region } from "react-native-maps";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { IMAGES } from "@/src/constant/images";

interface StepFourMapSectionProps {
  mapRegion: Region | null;
  streetAddress: string;
  selectedAddress: string | null;
  area: string;
  zipCode: string;
  selectedLocation: { latitude: number; longitude: number } | null;
  onZoom: (direction: "in" | "out") => void;
  onRegionChangeComplete: (region: Region) => void;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      gap: moderateHeightScale(16),
      // paddingHorizontal: moderateWidthScale(20),
    },
    mapContainer: {
      // borderRadius: moderateWidthScale(16),
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: theme.lightGreen2,
      overflow: "hidden",
      backgroundColor: theme.white,
      position: "relative",
    },
    mapView: {
      width: "100%",
      height: heightScale(300),
    },
    mapControls: {
      position: "absolute",
      right: moderateWidthScale(16),
      bottom: moderateHeightScale(16),
      backgroundColor: theme.white,
      borderRadius: moderateWidthScale(5),
      borderWidth: 1,
      borderColor: theme.darkGreen,
      width: moderateWidthScale(42),
      opacity: 0.8,
    },
    mapControlButton: {
      width: "100%",
      height: moderateWidthScale(40),
      alignItems: "center",
      justifyContent: "center",
    },
    mapControlDivider: {
      width: "100%",
      height: 1,
      backgroundColor: theme.darkGreen,
    },
    summary: {
      // paddingHorizontal: moderateWidthScale(18),
      // paddingVertical: moderateHeightScale(16),
      borderRadius: moderateWidthScale(8),
      flexDirection: "row",
      backgroundColor: theme.white,
      marginHorizontal: moderateWidthScale(20),
      borderWidth: 0.5,
      borderColor: theme.lightGreen2,
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
      elevation: 2,
    },
    summaryIconWrapper: {
      width: "16%",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.cardLocBackground,
      borderTopLeftRadius: moderateWidthScale(8),
      borderBottomLeftRadius: moderateWidthScale(8),
    },
    summaryTextWrapper: {
      flex: 1,
      gap: moderateHeightScale(2),
      paddingHorizontal: moderateWidthScale(10),
      paddingVertical: moderateHeightScale(5),
    },
    summaryTitle: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontBold,
      color: theme.darkGreen,
    },
    summarySubtitle: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.darkGreen,
    },
    fallbackContainer: {
      paddingVertical: moderateHeightScale(12),
      alignItems: "center",
      justifyContent: "center",
    },
    fallbackText: {
      fontSize: fontSize.size12,
      fontFamily: fonts.fontRegular,
      color: theme.lightGreen,
      textAlign: "center",
      paddingHorizontal: moderateWidthScale(16),
    },
    centerPinContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1,
      pointerEvents: "none",
    },
    centerPin: {
      width: moderateWidthScale(22),
      height: moderateHeightScale(32),
    },
  });

export default function StepFourMapSection({
  mapRegion,
  streetAddress,
  selectedAddress,
  area,
  zipCode,
  selectedLocation,
  onZoom,
  onRegionChangeComplete,
}: StepFourMapSectionProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors as Theme), [colors]);
  const mapRef = useRef<MapView>(null);
  const currentRegionRef = useRef<Region | null>(mapRegion);
  const [centerCoordinate, setCenterCoordinate] = useState<{
    latitude: number;
    longitude: number;
  } | null>(
    selectedLocation ||
      (mapRegion
        ? { latitude: mapRegion.latitude, longitude: mapRegion.longitude }
        : null)
  );

  useEffect(() => {
    if (selectedLocation) {
      setCenterCoordinate(selectedLocation);
    }
  }, [selectedLocation]);

  useEffect(() => {
    if (mapRegion) {
      currentRegionRef.current = mapRegion;
    }
  }, [mapRegion]);

  const circleRadius = useMemo(() => {
    if (!currentRegionRef.current) return 250;
    // Calculate radius based on map zoom level (latitudeDelta)
    // Larger delta = more zoomed out = larger circle radius
    const baseRadius = 250;
    const zoomFactor = currentRegionRef.current.latitudeDelta / 0.01;
    return baseRadius * zoomFactor;
  }, [currentRegionRef.current?.latitudeDelta]);

  const handleRegionChangeComplete = (region: Region) => {
    currentRegionRef.current = region;
    setCenterCoordinate({
      latitude: region.latitude,
      longitude: region.longitude,
    });
    onRegionChangeComplete(region);
  };

  const handleZoom = (direction: "in" | "out") => {
    if (!currentRegionRef.current || !mapRef.current) return;

    const factor = direction === "in" ? 0.7 : 1.3;
    const latitudeDelta = Math.max(
      currentRegionRef.current.latitudeDelta * factor,
      0.0005
    );
    const longitudeDelta = Math.max(
      currentRegionRef.current.longitudeDelta * factor,
      0.0005
    );

    const newRegion: Region = {
      ...currentRegionRef.current,
      latitudeDelta,
      longitudeDelta,
    };

    currentRegionRef.current = newRegion;
    // Use animateToRegion if available, otherwise just update region
    if (mapRef.current && "animateToRegion" in mapRef.current) {
      (mapRef.current as any).animateToRegion(newRegion, 300);
    }
    onZoom(direction);
  };

  return (
    <View style={styles.container}>
      {mapRegion ? (
        <>
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.mapView}
              initialRegion={mapRegion}
              onRegionChangeComplete={handleRegionChangeComplete}
            >
              {centerCoordinate && (
                <Circle
                  center={{
                    latitude: centerCoordinate.latitude,
                    longitude: centerCoordinate.longitude,
                  }}
                  radius={circleRadius}
                  fillColor={(colors as Theme).mapCircleFill}
                  strokeColor={(colors as Theme).darkGreen}
                  strokeWidth={1}
                />
              )}
            </MapView>
            {/* Fixed center pin*/}
            <View style={styles.centerPinContainer}>
              <Image
                source={IMAGES.mapPins}
                style={styles.centerPin}
                resizeMode="contain"
              />
            </View>
            <View style={styles.mapControls}>
              <Pressable
                style={styles.mapControlButton}
                onPress={() => handleZoom("in")}
              >
                <FontAwesome
                  name="search-plus"
                  size={moderateWidthScale(16)}
                  color={(colors as Theme).darkGreen}
                />
              </Pressable>
              <View style={styles.mapControlDivider} />
              <Pressable
                style={styles.mapControlButton}
                onPress={() => handleZoom("out")}
              >
                <FontAwesome
                  name="search-minus"
                  size={moderateWidthScale(16)}
                  color={(colors as Theme).darkGreen}
                />
              </Pressable>
            </View>
          </View>
          <View style={styles.summary}>
            <View style={styles.summaryIconWrapper}>
              <Feather
                name="map-pin"
                size={moderateWidthScale(17)}
                color={(colors as Theme).black}
              />
            </View>
            <View style={styles.summaryTextWrapper}>
              <Text numberOfLines={3} style={styles.summaryTitle}>
                {streetAddress || selectedAddress || "Address"}
              </Text>
              {area && <Text style={styles.summarySubtitle}>{area}</Text>}
              {zipCode && <Text style={styles.summarySubtitle}>{zipCode}</Text>}
            </View>
          </View>
        </>
      ) : (
        <View style={styles.fallbackContainer}>
          <Text style={styles.fallbackText}>
            We couldn&apos;t display the map. Adjust your address or try again.
          </Text>
        </View>
      )}
    </View>
  );
}
