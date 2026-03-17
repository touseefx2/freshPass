import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  View,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useDispatch } from "react-redux";
import { WebView } from "react-native-webview";
import { useTheme } from "@/src/hooks/hooks";
import { Theme } from "@/src/theme/colors";
import { fontSize, fonts } from "@/src/theme/fonts";
import {
  heightScale,
  moderateHeightScale,
  moderateWidthScale,
} from "@/src/theme/dimensions";
import { openFullImageModal } from "@/src/state/slices/generalSlice";
import StackHeader from "@/src/components/StackHeader";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      paddingBottom: moderateHeightScale(40),
    },
    imageContainer: {
      width: "100%",
      height: heightScale(220),
      backgroundColor: theme.emptyProfileImage,
    },
    image: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    content: {
      paddingHorizontal: moderateWidthScale(20),
      paddingTop: moderateHeightScale(20),
    },
    section: {
      marginBottom: moderateHeightScale(20),
    },
    label: {
      fontSize: fontSize.size14,
      fontFamily: fonts.fontMedium,
      color: theme.text,
      marginBottom: moderateHeightScale(6),
    },
    value: {
      fontSize: fontSize.size16,
      fontFamily: fonts.fontRegular,
      color: theme.text,
      lineHeight: fontSize.size16 * 1.4,
    },
    htmlContainer: {
      marginTop: moderateHeightScale(4),
    },
    webView: {
      width: "100%",
      backgroundColor: theme.background,
    },
  });

export default function TipDetail() {
  const { colors } = useTheme();
  const theme = colors as Theme;
  const styles = useMemo(() => createStyles(theme), [colors]);
  const dispatch = useDispatch();
  const [htmlHeight, setHtmlHeight] = useState<number>(0);
  const params = useLocalSearchParams<{
    title?: string;
    image?: string;
    action?: string;
    content?: string;
    benefit?: string;
    standard?: string;
  }>();

  const title = params.title ?? "Pro Tip";
  const image = params.image ?? "";
  const action = params.action ?? "";
  const content = params.content ?? "";
  const benefit = params.benefit ?? "";
  const standard = params.standard ?? "";

  const html = useMemo(() => {
    if (!content) return "";
    return `<!doctype html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        html, body { padding: 0; margin: 0; background: ${theme.background}; color: ${theme.text}; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.5; }
        img { max-width: 100%; height: auto; display: block; }
        p { margin: 0 0 12px 0; }
        h1, h2, h3, h4, h5, h6 { margin: 0 0 12px 0; }
        a { color: ${theme.primary}; }
      </style>
    </head>
    <body>
      ${content}
      <script>
        (function () {
          function postHeight() {
            var height = Math.max(
              document.body.scrollHeight,
              document.documentElement.scrollHeight
            );
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(String(height));
          }
          window.addEventListener('load', postHeight);
          setTimeout(postHeight, 50);
          setTimeout(postHeight, 250);
          setTimeout(postHeight, 500);
        })();
      </script>
    </body>
  </html>`;
  }, [content, theme.background, theme.primary, theme.text]);

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <StackHeader title={title} showLine={false} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {image && (
          <TouchableOpacity
            style={styles.imageContainer}
            onPress={() => dispatch(openFullImageModal({ images: [image] }))}
            activeOpacity={0.95}
          >
            <Image source={{ uri: image }} style={styles.image} />
          </TouchableOpacity>
        )}
        <View style={styles.content}>
          {action ? (
            <View style={styles.section}>
              <Text style={styles.label}>Action</Text>
              <Text style={styles.value}>{action}</Text>
            </View>
          ) : null}
          {benefit ? (
            <View style={styles.section}>
              <Text style={styles.label}>Benefit</Text>
              <Text style={styles.value}>{benefit}</Text>
            </View>
          ) : null}
          {standard ? (
            <View style={styles.section}>
              <Text style={styles.label}>Standard</Text>
              <Text style={styles.value}>{standard}</Text>
            </View>
          ) : null}

          {html ? (
            <View style={styles.htmlContainer}>
              <WebView
                originWhitelist={["*"]}
                source={{ html }}
                style={[styles.webView, { height: htmlHeight || 1 }]}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                onMessage={(e) => {
                  const next = Number(e.nativeEvent.data);
                  if (Number.isFinite(next) && next > 0) setHtmlHeight(next);
                }}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
