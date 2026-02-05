import { loadAppState } from "@/storage/app-state";
import { getSessions } from "@/storage/sessions";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";

/**
 * INSIGHTS SCREEN
 * Synced with storage. Empty when no sessions; minimal summary when data exists.
 */
export default function Insights() {
  const colors = {
    bg: "#000",
    card: "#0e0e0e",
    border: "#1f2937",
    text: "#f5f5f5",
    muted: "#8b8b8b",
    accent: "#3b82f6",
  };

  const [sessionsCount, setSessionsCount] = useState(0);
  const [weekSessions, setWeekSessions] = useState(0);

  useFocusEffect(
    useCallback(() => {
      getSessions().then((sessions) => setSessionsCount(sessions.length));
      loadAppState().then((s) => setWeekSessions(s.week_sessions));
    }, [])
  );

  const hasData = sessionsCount > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: 28, paddingBottom: 20 }}>
        <Text
          style={{
            color: colors.text,
            fontSize: 28,
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          Insights
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
          HOW YOU FOCUS
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 40,
          flexGrow: 1,
          justifyContent: hasData ? "flex-start" : "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        {!hasData ? (
          <View
            style={{
              alignItems: "center",
              padding: 24,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 18,
                fontWeight: "600",
                marginBottom: 10,
              }}
            >
              No insights yet
            </Text>
            <Text
              style={{
                color: colors.muted,
                textAlign: "center",
                lineHeight: 20,
              }}
            >
              Complete focus sessions to see insights here.
              {"\n"}
              Everything stays on your device.
            </Text>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 18,
            }}
          >
            <Text
              style={{
                color: colors.muted,
                fontSize: 11,
                letterSpacing: 1.4,
                marginBottom: 6,
              }}
            >
              SESSIONS
            </Text>
            <Text
              style={{
                color: colors.accent,
                fontSize: 22,
                fontWeight: "700",
                marginBottom: 6,
              }}
            >
              {sessionsCount} total · {weekSessions} this week
            </Text>
            <Text
              style={{
                color: colors.text,
                fontSize: 14,
                lineHeight: 20,
              }}
            >
              Insights will grow as you complete more sessions.
            </Text>
          </View>
        )}

        <View style={{ marginTop: 24, alignItems: "center" }}>
          <Text
            style={{
              color: colors.muted,
              fontSize: 11,
              letterSpacing: 1.2,
              textAlign: "center",
              lineHeight: 16,
            }}
          >
            No tracking. Everything stays on your device.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
