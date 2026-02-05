import { HapticTab } from "@/components/haptic-tab";
import Navbar from "@/components/ui/navbar";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Image } from "expo-image";
import { Tabs } from "expo-router";
import React from "react";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isTablet = width >= 768;

  const TAB_HEIGHT = isTablet ? 78 : 60;
  const ICON_SIZE = 28;
  const LABEL_SIZE = isTablet ? 14 : 12;

  return (
    <>
      <Navbar />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
          tabBarInactiveTintColor: "#888",
          tabBarStyle: {
            height: 88,
            paddingBottom: insets.bottom,
            paddingTop: 5,
            borderTopWidth: 1,
            backgroundColor: "#030303",
            borderTopColor: "#2a3546",
          },
          tabBarLabelStyle: {
            fontSize: LABEL_SIZE,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: () => (
              <Image
                source={require("../../assets/images/home.png")}
                style={{ width: ICON_SIZE, height: ICON_SIZE }}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="history"
          options={{
            title: "History",
            tabBarIcon: () => (
              <Image
                source={require("../../assets/images/history.png")}
                style={{ width: ICON_SIZE, height: ICON_SIZE }}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="reflect"
          options={{
            title: "Reflect",
            tabBarIcon: () => (
              <Image
                source={require("../../assets/images/reflect.png")}
                style={{ width: ICON_SIZE, height: ICON_SIZE }}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="insights"
          options={{
            title: "Insights",
            tabBarIcon: () => (
              <Image
                source={require("../../assets/images/insights.png")}
                style={{ width: ICON_SIZE, height: ICON_SIZE }}
              />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
