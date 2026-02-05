import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

export default function Reflect() {
  const colors = {
    bg: "#000",
    card: "#0e0e0e",
    border: "#1f2937",
    text: "#f5f5f5",
    muted: "#8b8b8b",
    accent: "#3b82f6",
    success: "#4ade80",
  };

  const [reflection, setReflection] = useState("");
  const [saved, setSaved] = useState(false);

  const saveReflection = () => {
    if (!reflection.trim()) return;
    // later: persist locally + feed analytics engine
    setSaved(true);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* ───── Header ───── */}
      <View style={{ paddingTop: 28, paddingBottom: 20 }}>
        <Text
          style={{
            color: colors.text,
            fontSize: 28,
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          Reflect
        </Text>

        <Text
          style={{
            color: colors.muted,
            fontSize: 12,
            textAlign: "center",
            marginTop: 6,
            letterSpacing: 1.5,
          }}
        >
          ONE LINE IS ENOUGH
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: 20,
          paddingBottom: 40,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ───── Reflection Card ───── */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 20,
          }}
        >
          <Text
            style={{
              color: colors.muted,
              fontSize: 11,
              letterSpacing: 1.4,
              marginBottom: 10,
            }}
          >
            WHAT STOOD OUT?
          </Text>

          <TextInput
            value={reflection}
            onChangeText={setReflection}
            placeholder="e.g. Deep focus, distracted by notifications…"
            placeholderTextColor="#555"
            multiline
            maxLength={160}
            style={{
              color: colors.text,
              fontSize: 16,
              padding: 8,
              lineHeight: 22,
              minHeight: 90,
              textAlignVertical: "top",
            }}
          />

          {/* Character hint */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.muted, fontSize: 11 }}>
              {reflection.length}/160
            </Text>

            {!saved ? (
              <Pressable
                onPress={saveReflection}
                style={({ pressed }) => ({
                  paddingVertical: 10,
                  paddingHorizontal: 18,
                  borderRadius: 14,
                  backgroundColor: colors.accent,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    color: "#000",
                    fontWeight: "600",
                    fontSize: 14,
                  }}
                >
                  Save
                </Text>
              </Pressable>
            ) : (
              <Text
                style={{
                  color: colors.success,
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                Saved ✓
              </Text>
            )}
          </View>
        </View>

        {/* ───── Gentle Guidance ───── */}
        <View style={{ marginTop: 24, alignItems: "center" }}>
          <Text
            style={{
              color: colors.muted,
              fontSize: 12,
              textAlign: "center",
              lineHeight: 18,
            }}
          >
            Reflections improve future insights.
            {"\n"}
            No tags. No ratings. Just patterns.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
