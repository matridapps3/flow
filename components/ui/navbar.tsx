import React from "react";
import { Image, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Navbar = () => {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: Math.max(24, insets.top + 12),
        paddingLeft: 38,
        paddingRight: 38,
        backgroundColor: "black",
        justifyContent: "space-between",
        alignItems: "flex-end",
        paddingBottom: 12,
        minHeight: 70,
        flexDirection: "row",
      }}
    >
      <Text style={{ color: "white", fontSize: 25, fontWeight: "bold" }}>
        Flow
      </Text>

      <Image
        source={require("../../assets/images/navbarIcon.png")}
        style={{ width: 35, height: 35}}
      />
    </View>
  );
};

export default Navbar;
