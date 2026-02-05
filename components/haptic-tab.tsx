import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";

export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      onPress={(event) => {
        // ✅ Native-feeling haptic for tab press
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // REQUIRED: keep tab navigation working
        props.onPress?.(event);
      }}
    />
  );
}
