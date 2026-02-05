import React from "react";
import { Image, Text, View } from "react-native";

const Navbar = () => {
  return (
    <View
      style={{
        paddingTop: 24,
        paddingLeft: 38,
        paddingRight: 38,
        backgroundColor: "black",
        justifyContent: "space-between",
        alignItems: "flex-end",
        paddingBottom: 12,
        height: 110,
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
