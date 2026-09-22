import React, { useMemo } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  type StyleProp,
  type TextProps,
  type TextStyle,
} from "react-native";

/**
 * Custom fonts (Forma DJR) don't include emoji glyphs. Real iPhones often fall
 * back to Apple Color Emoji; iOS Simulator frequently does not → "[?]".
 * Split emoji runs and render them with the system font so they always show.
 */

const EMOJI_SPLIT_REGEX =
  /((?:\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:\uFE0F)?(?:\u200D(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:\uFE0F)?)*)/gu;

const EMOJI_TEST_REGEX =
  /^(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:\uFE0F)?(?:\u200D(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:\uFE0F)?)*$/u;

const emojiFontStyle: TextStyle = {
  fontFamily: Platform.select({
    ios: "System",
    android: "sans-serif",
    default: undefined,
  }),
  fontWeight: "400",
};

export function splitTextAndEmoji(text: string): string[] {
  if (!text) return [];
  return text.split(EMOJI_SPLIT_REGEX).filter((part) => part.length > 0);
}

export function isEmojiSegment(part: string): boolean {
  return EMOJI_TEST_REGEX.test(part);
}

type TextWithEmojiProps = Omit<TextProps, "children"> & {
  children: string;
  style?: StyleProp<TextStyle>;
};

export default function TextWithEmoji({
  children,
  style,
  ...rest
}: TextWithEmojiProps) {
  const parts = useMemo(() => splitTextAndEmoji(children), [children]);

  const hasEmoji = useMemo(
    () => parts.some((part) => isEmojiSegment(part)),
    [parts],
  );

  if (!hasEmoji) {
    return (
      <Text style={style} {...rest}>
        {children}
      </Text>
    );
  }

  return (
    <Text style={style} {...rest}>
      {parts.map((part, index) =>
        isEmojiSegment(part) ? (
          <Text key={`e-${index}`} style={emojiFontStyle}>
            {part}
          </Text>
        ) : (
          <Text key={`t-${index}`}>{part}</Text>
        ),
      )}
    </Text>
  );
}

export const emojiSafeFontStyle = StyleSheet.create({
  emoji: emojiFontStyle,
}).emoji;
