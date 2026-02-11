import { getSessionTypeLabel } from "@/storage/analytics";
import { loadAppState, saveAppState } from "@/storage/app-state";
import { clearSessions, getSessions, type SessionRecord } from "@/storage/sessions";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import {
  Alert,
  Animated,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

export default function History() {
  const [sessionsCount, setSessionsCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [clearing, setClearing] = useState(false);

  const runClearHistory = useCallback(async () => {
    setClearing(true);
    try {
      await clearSessions();
      await saveAppState({ today_sessions: 0, week_sessions: 0 });
      const list = await getSessions();
      const state = await loadAppState();
      setSessions(list);
      setSessionsCount(list.length);
      setCompletedCount(list.filter((s) => s.completed !== false).length);
      setAvgScore(state.focus_score);
    } catch {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert("Could not clear history.");
      } else {
        Alert.alert("Error", "Could not clear history.");
      }
    } finally {
      setClearing(false);
    }
  }, []);

  const handleClearHistory = () => {
    const title = "Clear history?";
    const message =
      "This will remove all sessions from history. Session counts on Home will be reset. This cannot be undone.";
    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm(`${title}\n\n${message}`)) void runClearHistory();
      return;
    }
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          void runClearHistory();
        },
      },
    ]);
  };

  useFocusEffect(
    useCallback(() => {
      loadAppState().then((s) => setAvgScore(s.focus_score));
      getSessions().then((list) => {
        setSessions(list);
        setSessionsCount(list.length);
        setCompletedCount(list.filter((s) => s.completed !== false).length);
      });
    }, [])
  );

  /* ---------------- PULL-UP ANIMATION ---------------- */
  const translateY = useRef(new Animated.Value(30)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 10,
      onPanResponderMove: (_, g) => {
        if (g.dy < 0) {
          translateY.setValue(Math.max(g.dy, -60));
        }
      },
      onPanResponderRelease: () => {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  /* ---------------- THEME ---------------- */
  const colors = {
    bg: "#000",
    card: "#0e0e0e",
    border: "#1f2937",
    text: "#f5f5f5",
    muted: "#8b8b8b",
    accent: "#3b82f6",
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Animated.View
        {...panResponder.panHandlers}
        style={{ flex: 1, transform: [{ translateY }] }}
      >
        {/* ───── Header ───── */}
        <View style={{ paddingTop: 28, paddingBottom: 16 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: 28,
              fontWeight: "700",
              textAlign: "center",
            }}
          >
            History
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
            YOUR FOCUS FOOTPRINT
          </Text>
        </View>

        {/* ───── Stats (synced from storage) ───── */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-around",
            marginBottom: 20,
          }}
        >
          <Stat label="SESSIONS" value={sessionsCount} />
          <Stat label="COMPLETED" value={completedCount} />
          <Stat label="AVG SCORE" value={avgScore} />
        </View>

        {sessions.length > 0 && (
          <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
            <Pressable
              onPress={handleClearHistory}
              disabled={clearing}
              style={({ pressed }) => ({
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 12,
                backgroundColor: "#7f1d1d",
                borderWidth: 1,
                borderColor: "#991b1b",
                opacity: clearing || pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  color: "#fca5a5",
                  fontWeight: "600",
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                {clearing ? "Clearing…" : "Clear history"}
              </Text>
            </Pressable>
          </View>
        )}

        {/* ───── Content ───── */}
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 40,
            flexGrow: 1,
            justifyContent: sessions.length === 0 ? "center" : "flex-start",
          }}
          showsVerticalScrollIndicator={false}
        >
          {sessions.length === 0 ? (
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
                No sessions yet
              </Text>

              <Text
                style={{
                  color: colors.muted,
                  textAlign: "center",
                  lineHeight: 22,
                }}
              >
                Your focus sessions (completed and stopped) will appear here.
                {"\n"}
                Start a session to begin building momentum.
              </Text>
            </View>
          ) : (
            sessions.map((s, i) => (
              <View
                key={`${s.completed_at}-${i}`}
                style={{
                  padding: 16,
                  marginBottom: 12,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 16,
                      fontWeight: "600",
                    }}
                  >
                    {s.duration_minutes} min
                  </Text>
                  <Text
                    style={{
                      color: colors.muted,
                      fontSize: 12,
                    }}
                  >
                    · {getSessionTypeLabel(s)}
                  </Text>
                  {s.completed === false && (
                    <Text
                      style={{
                        color: "#eb3d3d",
                        fontSize: 11,
                        letterSpacing: 1,
                      }}
                    >
                      Stopped
                    </Text>
                  )}
                </View>
                <Text
                  style={{
                    color: colors.muted,
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  {formatSessionDate(s.completed_at)}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

function formatSessionDate(iso: string): string {
  if (!iso || typeof iso !== "string") return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (isToday) {
    return `Today ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }
  return d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ---------------- Small Stat Component ---------------- */
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text
        style={{
          color: "#f5f5f5",
          fontSize: 22,
          fontWeight: "700",
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          color: "#8b8b8b",
          fontSize: 11,
          letterSpacing: 1.5,
          marginTop: 4,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
