import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { TextInput, TouchableWithoutFeedback, View } from "react-native";
import { FlowTextField } from "@/src/components/reelFlow/detailsFields";

type Props = React.ComponentProps<typeof FlowTextField>;

/**
 * FlowTextField where a tap anywhere on the field (label, "$" prefix,
 * padding) focuses the input — the client's "one soft tap" rule.
 */
const TapField = forwardRef<TextInput, Props>(function TapField(
  { containerStyle, editable, ...props },
  ref,
) {
  const inputRef = useRef<TextInput>(null);
  useImperativeHandle(ref, () => inputRef.current as TextInput);
  return (
    <TouchableWithoutFeedback
      accessible={false}
      focusable={false}
      disabled={editable === false}
      onPress={() => inputRef.current?.focus()}
    >
      <View style={containerStyle}>
        <FlowTextField ref={inputRef} editable={editable} {...props} />
      </View>
    </TouchableWithoutFeedback>
  );
});

export default TapField;
