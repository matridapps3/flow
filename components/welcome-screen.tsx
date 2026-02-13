import * as Haptics from "expo-haptics";
import { Pressable, Text, View } from "react-native";

const FEATURES = [
  "Pick a duration (15–60 min) and tap Flow to focus",
  "Build daily & weekly streaks; pause or stop anytime",
  "Reflect in one line after a session",
  "Insights & History: stats, export, reminders",
];

interface WelcomeScreenProps {
  onDismiss: () => void;
}

export default function WelcomeScreen({ onDismiss }: WelcomeScreenProps) {
  const handleGetStarted = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // no-op on web or when haptics unavailable
    }
    onDismiss();
  };

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
        zIndex: 1000,
      }}
    >
      <View
        style={{
          alignItems: "center",
          maxWidth: 320,
          width: "100%",
          backgroundColor: "#0e0e0e",
          borderRadius: 20,
          borderWidth: 1,
          borderColor: "#1f2937",
          paddingVertical: 28,
          paddingHorizontal: 24,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 28,
            fontWeight: "700",
            letterSpacing: 0.5,
            marginBottom: 8,
          }}
        >
          Flow
        </Text>
        <Text
          style={{
            color: "#94a3b8",
            fontSize: 14,
            marginBottom: 32,
            textAlign: "center",
          }}
        >
          Focus timer · streaks · reflect
        </Text>

        <View style={{ alignSelf: "stretch", marginBottom: 36 }}>
          {FEATURES.map((line, i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: "#3b82f6",
                  marginRight: 12,
                }}
              />
              <Text
                style={{
                  color: "#e2e8f0",
                  fontSize: 14,
                  lineHeight: 20,
                  flex: 1,
                }}
              >
                {line}
              </Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={handleGetStarted}
          style={({ pressed }) => ({
            paddingVertical: 14,
            paddingHorizontal: 32,
            borderRadius: 14,
            backgroundColor: "#3b82f6",
            opacity: pressed ? 0.88 : 1,
          })}
        >
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
            Get started
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
