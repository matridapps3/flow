import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import "react-native-reanimated";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "light" ? DarkTheme : DefaultTheme}>
      <StatusBar style="light" />

      {/* 🔮 GLOBAL GLASS BACKDROP */}
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <BlurView
          intensity={20}
          tint="dark"
          style={{ flex: 1 }}
        >
          <Slot />
        </BlurView>
      </View>
    </ThemeProvider>
  );
}
