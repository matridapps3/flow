import {
  getAttentionSpanTrend,
  getBestDayOfWeek,
  getBestPeakWindow,
  getBestPracticeSentence,
  getBurnoutRisk,
  getCompositeFocusScore,
  getCompletionStats,
  getDaysActiveThisWeek,
  getMilestoneMessage,
  getMomentum,
  getPersonalBaselineCopy,
  getReflectionThemes,
  getRegressionMessage,
  getSuccessPatternSentence,
  getThisWeekVsAverage,
  getWeeklyCompletionCounts,
  type CompletionStats,
  type MomentumKind,
  type ThisWeekVsAverage,
} from "@/storage/analytics";
import { DURATIONS } from "@/storage/constants";
import { loadAppState, resetAppState, saveAppState } from "@/storage/app-state";
import { buildExportCSV, buildExportJSON } from "@/storage/export-data";
import { clearSessions, getSessions } from "@/storage/sessions";
import { getDailyStreak, getWeeklyStreak } from "@/storage/streaks";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Switch,
  Text,
  View,
} from "react-native";
import { syncDailyReminder } from "@/storage/notifications";

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
  const [dailyStreak, setDailyStreak] = useState(0);
  const [weeklyStreak, setWeeklyStreak] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [completionStats, setCompletionStats] = useState<CompletionStats | null>(null);
  const [bestPractice, setBestPractice] = useState<string | null>(null);
  const [momentum, setMomentum] = useState<MomentumKind | null>(null);
  const [milestoneMessage, setMilestoneMessage] = useState<string | null>(null);
  const [thisWeekVsAvg, setThisWeekVsAvg] = useState<ThisWeekVsAverage | null>(null);
  const [bestDay, setBestDay] = useState<string | null>(null);
  const [regressionMessage, setRegressionMessage] = useState<string | null>(null);
  const [peakWindow, setPeakWindow] = useState<{ label: string; hours: string } | null>(null);
  const [reflectionThemes, setReflectionThemes] = useState<string[]>([]);
  const [daysActiveThisWeek, setDaysActiveThisWeek] = useState<{ active: number; total: number } | null>(null);
  const [attentionSpanTrend, setAttentionSpanTrend] = useState<"up" | "down" | "stable" | null>(null);
  const [burnoutRisk, setBurnoutRisk] = useState<string | null>(null);
  const [weeklyTrendCounts, setWeeklyTrendCounts] = useState<number[]>([]);
  const [successPatternSentence, setSuccessPatternSentence] = useState<string | null>(null);
  const [personalBaselineCopy, setPersonalBaselineCopy] = useState<string | null>(null);
  const [compositeFocusScore, setCompositeFocusScore] = useState<number | null>(null);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderHour, setReminderHour] = useState(18);

  const runDeleteData = useCallback(async () => {
    setDeleting(true);
    try {
      await clearSessions();
      await resetAppState();
      const sessions = await getSessions();
      const state = await loadAppState();
      setSessionsCount(sessions.length);
      setWeekSessions(state.week_sessions);
      setReminderEnabled(state.reminder_enabled);
      setReminderHour(state.reminder_hour);
      setDailyStreak(getDailyStreak(sessions));
      setWeeklyStreak(getWeeklyStreak(sessions));
      setCompletionStats(getCompletionStats(sessions));
      setBestPractice(getBestPracticeSentence(sessions));
      setMomentum(getMomentum(sessions));
      setMilestoneMessage(getMilestoneMessage(sessions));
      setThisWeekVsAvg(getThisWeekVsAverage(sessions));
      setBestDay(getBestDayOfWeek(sessions));
      setRegressionMessage(getRegressionMessage(sessions));
      setPeakWindow(getBestPeakWindow(sessions));
      setReflectionThemes(getReflectionThemes(sessions));
      setDaysActiveThisWeek(getDaysActiveThisWeek(sessions));
      setAttentionSpanTrend(getAttentionSpanTrend(sessions));
      setBurnoutRisk(getBurnoutRisk(sessions));
      setWeeklyTrendCounts(getWeeklyCompletionCounts(sessions, 8));
      setSuccessPatternSentence(
        getSuccessPatternSentence(sessions, getBestDayOfWeek(sessions), getBestPeakWindow(sessions))
      );
      const twa = getThisWeekVsAverage(sessions);
      setPersonalBaselineCopy(getPersonalBaselineCopy(twa));
      setCompositeFocusScore(
        getCompositeFocusScore(sessions, getDailyStreak(sessions), getWeeklyStreak(sessions))
      );
    } catch {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert("Could not delete data.");
      } else {
        Alert.alert("Error", "Could not delete data.");
      }
    } finally {
      setDeleting(false);
    }
  }, []);

  const handleDeleteData = () => {
    const title = "Delete all data?";
    const message =
      "This will remove all sessions and reset the app to a fresh state. This cannot be undone.";
    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm(`${title}\n\n${message}`)) void runDeleteData();
      return;
    }
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void runDeleteData();
        },
      },
    ]);
  };

  const shareExport = async (content: string, format: "JSON" | "CSV") => {
    if (Platform.OS === "web" || !Share.share) {
      Alert.alert("Export", "Export is available in the mobile app.");
      return;
    }
    try {
      await Share.share({
        message: content,
        title: `Flow focus data (${format})`,
      });
    } catch (e) {
      Alert.alert("Export", "Could not share export.");
    } finally {
      setExporting(false);
    }
  };

  const handleExportJSON = async () => {
    setExporting(true);
    try {
      const json = await buildExportJSON();
      await shareExport(json, "JSON");
    } catch {
      Alert.alert("Export", "Could not build export.");
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const csv = await buildExportCSV();
      await shareExport(csv, "CSV");
    } catch {
      Alert.alert("Export", "Could not build export.");
      setExporting(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      getSessions().then((sessions) => {
        setSessionsCount(sessions.length);
        setDailyStreak(getDailyStreak(sessions));
        setWeeklyStreak(getWeeklyStreak(sessions));
        setCompletionStats(getCompletionStats(sessions));
        setBestPractice(getBestPracticeSentence(sessions));
        setMomentum(getMomentum(sessions));
        setMilestoneMessage(getMilestoneMessage(sessions));
        setThisWeekVsAvg(getThisWeekVsAverage(sessions));
        setBestDay(getBestDayOfWeek(sessions));
        setRegressionMessage(getRegressionMessage(sessions));
        setPeakWindow(getBestPeakWindow(sessions));
        setReflectionThemes(getReflectionThemes(sessions));
        setDaysActiveThisWeek(getDaysActiveThisWeek(sessions));
        setAttentionSpanTrend(getAttentionSpanTrend(sessions));
        setBurnoutRisk(getBurnoutRisk(sessions));
        setWeeklyTrendCounts(getWeeklyCompletionCounts(sessions, 8));
        setSuccessPatternSentence(
          getSuccessPatternSentence(sessions, getBestDayOfWeek(sessions), getBestPeakWindow(sessions))
        );
        const twa = getThisWeekVsAverage(sessions);
        setPersonalBaselineCopy(getPersonalBaselineCopy(twa));
        setCompositeFocusScore(
          getCompositeFocusScore(sessions, getDailyStreak(sessions), getWeeklyStreak(sessions))
        );
      });
      loadAppState().then((s) => {
        setWeekSessions(s.week_sessions);
        setReminderEnabled(s.reminder_enabled);
        setReminderHour(s.reminder_hour);
      });
    }, [])
  );

  const setReminder = useCallback(
    async (enabled: boolean, hour: number) => {
      setReminderEnabled(enabled);
      setReminderHour(hour);
      await saveAppState({ reminder_enabled: enabled, reminder_hour: hour });
      await syncDailyReminder();
    },
    []
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
                lineHeight: 22,
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
            <Text
              style={{
                color: colors.muted,
                fontSize: 12,
                marginTop: 12,
              }}
            >
              Daily streak: {dailyStreak} · Weekly streak: {weeklyStreak}
            </Text>
            {momentum && (
              <Text
                style={{
                  color: momentum === "up" ? "#4ade80" : momentum === "down" ? "#f87171" : colors.muted,
                  fontSize: 12,
                  marginTop: 6,
                  fontWeight: "600",
                }}
              >
                {momentum === "up"
                  ? "↑ Trending up"
                  : momentum === "down"
                    ? "↓ Trending down"
                    : "→ Sustaining"}
              </Text>
            )}
            {milestoneMessage && (
              <Text
                style={{
                  color: colors.accent,
                  fontSize: 12,
                  marginTop: 6,
                }}
              >
                {milestoneMessage}
              </Text>
            )}
          </View>
        )}

        {/* This week vs 4-week average */}
        {hasData && thisWeekVsAvg && (
          <View
            style={{
              marginTop: 20,
              padding: 18,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
            }}
          >
            <Text
              style={{
                color: colors.muted,
                fontSize: 11,
                letterSpacing: 1.4,
                marginBottom: 8,
              }}
            >
              THIS WEEK VS AVERAGE
            </Text>
            <Text
              style={{
                color: colors.text,
                fontSize: 15,
                lineHeight: 22,
              }}
            >
              This week: {thisWeekVsAvg.thisWeek} sessions · 4-week average:{" "}
              {thisWeekVsAvg.fourWeekAvg}
              {thisWeekVsAvg.trend !== "same" && (
                <Text
                  style={{
                    color: thisWeekVsAvg.trend === "up" ? "#4ade80" : "#f87171",
                    fontWeight: "600",
                  }}
                >
                  {" "}
                  ({thisWeekVsAvg.trend === "up" ? "↑ above" : "↓ below"} last week)
                </Text>
              )}
            </Text>
            {personalBaselineCopy && (
              <Text style={{ color: colors.muted, fontSize: 13, marginTop: 8 }}>
                {personalBaselineCopy}
              </Text>
            )}
          </View>
        )}

        {/* Peak focus window */}
        {hasData && peakWindow && (
          <View
            style={{
              marginTop: 20,
              padding: 18,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
            }}
          >
            <Text
              style={{
                color: colors.muted,
                fontSize: 11,
                letterSpacing: 1.4,
                marginBottom: 8,
              }}
            >
              PEAK FOCUS WINDOW
            </Text>
            <Text
              style={{
                color: colors.text,
                fontSize: 15,
                lineHeight: 22,
              }}
            >
              {peakWindow.label} ({peakWindow.hours})
            </Text>
          </View>
        )}

        {/* Composite focus score */}
        {hasData && compositeFocusScore !== null && (
          <View
            style={{
              marginTop: 20,
              padding: 18,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
            }}
          >
            <Text
              style={{
                color: colors.muted,
                fontSize: 11,
                letterSpacing: 1.4,
                marginBottom: 8,
              }}
            >
              FOCUS SCORE
            </Text>
            <Text
              style={{
                color: colors.accent,
                fontSize: 22,
                fontWeight: "700",
              }}
            >
              {compositeFocusScore}/100
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
              Based on completion rate, streaks, and recent trend.
            </Text>
          </View>
        )}

        {/* Reflection themes (distraction / themes) */}
        {hasData && reflectionThemes.length > 0 && (
          <View
            style={{
              marginTop: 20,
              padding: 18,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
            }}
          >
            <Text
              style={{
                color: colors.muted,
                fontSize: 11,
                letterSpacing: 1.4,
                marginBottom: 8,
              }}
            >
              YOU OFTEN MENTION
            </Text>
            <Text
              style={{
                color: colors.text,
                fontSize: 15,
                lineHeight: 22,
              }}
            >
              {reflectionThemes.join(", ")}
            </Text>
          </View>
        )}

        {/* Habit formation: days active this week */}
        {hasData && daysActiveThisWeek && (
          <View
            style={{
              marginTop: 20,
              padding: 18,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
            }}
          >
            <Text
              style={{
                color: colors.muted,
                fontSize: 11,
                letterSpacing: 1.4,
                marginBottom: 8,
              }}
            >
              DAYS ACTIVE THIS WEEK
            </Text>
            <Text
              style={{
                color: colors.text,
                fontSize: 15,
                lineHeight: 22,
              }}
            >
              {daysActiveThisWeek.active}/{daysActiveThisWeek.total} days with at least one session
            </Text>
          </View>
        )}

        {/* Weekly trend (last 8 weeks) */}
        {hasData && weeklyTrendCounts.length > 0 && (
          <View
            style={{
              marginTop: 20,
              padding: 18,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
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
              WEEKLY TREND (LAST 8 WEEKS)
            </Text>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
              {weeklyTrendCounts.map((count, i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    backgroundColor: colors.accent,
                    height: Math.max(12, count * 8),
                    borderRadius: 4,
                    minWidth: 12,
                  }}
                />
              ))}
            </View>
            <Text style={{ color: colors.muted, fontSize: 11, marginTop: 8 }}>
              Newest ← → Oldest
            </Text>
          </View>
        )}

        {/* Attention span trend */}
        {hasData && attentionSpanTrend && (
          <View
            style={{
              marginTop: 20,
              padding: 18,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
            }}
          >
            <Text
              style={{
                color: colors.muted,
                fontSize: 11,
                letterSpacing: 1.4,
                marginBottom: 8,
              }}
            >
              SESSION LENGTH TREND
            </Text>
            <Text
              style={{
                color: colors.text,
                fontSize: 15,
                lineHeight: 22,
              }}
            >
              {attentionSpanTrend === "up"
                ? "Your average session length is trending up."
                : attentionSpanTrend === "down"
                  ? "Your average session length is trending down."
                  : "Your average session length is stable."}
            </Text>
          </View>
        )}

        {/* Completion rate (by duration) */}
        {hasData && completionStats && completionStats.total > 0 && (
          <View
            style={{
              marginTop: 20,
              padding: 18,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
            }}
          >
            <Text
              style={{
                color: colors.muted,
                fontSize: 11,
                letterSpacing: 1.4,
                marginBottom: 8,
              }}
            >
              COMPLETION RATE
            </Text>
            <Text
              style={{
                color: colors.accent,
                fontSize: 20,
                fontWeight: "700",
                marginBottom: 10,
              }}
            >
              {completionStats.overallRate}% overall ({completionStats.completed}/{completionStats.total})
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {DURATIONS.map((d) => {
                const by = completionStats.byDuration[d];
                if (!by || by.total === 0) return null;
                return (
                  <Text
                    key={d}
                    style={{ color: colors.text, fontSize: 13 }}
                  >
                    {d}m: {by.rate}%
                  </Text>
                );
              })}
            </View>
          </View>
        )}

        {/* Best practice discovery */}
        {hasData && bestPractice && (
          <View
            style={{
              marginTop: 20,
              padding: 18,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
            }}
          >
            <Text
              style={{
                color: colors.muted,
                fontSize: 11,
                letterSpacing: 1.4,
                marginBottom: 8,
              }}
            >
              BEST PRACTICE
            </Text>
            <Text
              style={{
                color: colors.text,
                fontSize: 15,
                lineHeight: 22,
              }}
            >
              {bestPractice}
            </Text>
          </View>
        )}

        {/* Best day of week */}
        {hasData && bestDay && (
          <View
            style={{
              marginTop: 20,
              padding: 18,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
            }}
          >
            <Text
              style={{
                color: colors.muted,
                fontSize: 11,
                letterSpacing: 1.4,
                marginBottom: 8,
              }}
            >
              PEAK DAY
            </Text>
            <Text
              style={{
                color: colors.text,
                fontSize: 15,
                lineHeight: 22,
              }}
            >
              You focus best on {bestDay}s.
            </Text>
          </View>
        )}

        {/* Success pattern replication */}
        {hasData && successPatternSentence && (
          <View
            style={{
              marginTop: 20,
              padding: 18,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
            }}
          >
            <Text
              style={{
                color: colors.muted,
                fontSize: 11,
                letterSpacing: 1.4,
                marginBottom: 8,
              }}
            >
              SUCCESS PATTERN
            </Text>
            <Text
              style={{
                color: colors.text,
                fontSize: 15,
                lineHeight: 22,
              }}
            >
              {successPatternSentence}
            </Text>
          </View>
        )}

        {/* Burnout risk */}
        {hasData && burnoutRisk && (
          <View
            style={{
              marginTop: 20,
              padding: 18,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: "#7f1d1d",
              backgroundColor: "rgba(127, 29, 29, 0.2)",
            }}
          >
            <Text
              style={{
                color: colors.muted,
                fontSize: 11,
                letterSpacing: 1.4,
                marginBottom: 8,
              }}
            >
              REST REMINDER
            </Text>
            <Text
              style={{
                color: "#fca5a5",
                fontSize: 14,
                lineHeight: 20,
              }}
            >
              {burnoutRisk}
            </Text>
          </View>
        )}

        {/* Regression alert */}
        {hasData && regressionMessage && (
          <View
            style={{
              marginTop: 20,
              padding: 18,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: "#7f1d1d",
              backgroundColor: "rgba(127, 29, 29, 0.2)",
            }}
          >
            <Text
              style={{
                color: colors.muted,
                fontSize: 11,
                letterSpacing: 1.4,
                marginBottom: 8,
              }}
            >
              PATTERN ALERT
            </Text>
            <Text
              style={{
                color: "#fca5a5",
                fontSize: 14,
                lineHeight: 20,
              }}
            >
              {regressionMessage}
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

        {/* Daily reminder (local notification, native only) */}
        <View
          style={{
            marginTop: 28,
            padding: 18,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
          }}
        >
          <Text
            style={{
              color: colors.muted,
              fontSize: 11,
              letterSpacing: 1.4,
              marginBottom: 12,
            }}
          >
            DAILY REMINDER
          </Text>
          <Text
            style={{
              color: colors.text,
              fontSize: 13,
              lineHeight: 18,
              marginBottom: 12,
            }}
          >
            {Platform.OS === "web"
              ? "Daily reminder is available in the mobile app."
              : "Get a gentle nudge to focus at the same time each day."}
          </Text>
          {Platform.OS !== "web" && (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <Text style={{ color: colors.text, fontSize: 14 }}>Remind me daily</Text>
              <Switch
                value={reminderEnabled}
                onValueChange={(v) => setReminder(v, reminderHour)}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor="#fff"
              />
            </View>
          )}
          {Platform.OS !== "web" && reminderEnabled && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Text style={{ color: colors.muted, fontSize: 13 }}>At:</Text>
              {[8, 12, 18, 20].map((h) => (
                <Pressable
                  key={h}
                  onPress={() => setReminder(true, h)}
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    backgroundColor: reminderHour === h ? colors.accent : colors.border,
                  }}
                >
                  <Text
                    style={{
                      color: reminderHour === h ? "#000" : colors.text,
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    {h}:00
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Export (from device storage) */}
        <View
          style={{
            marginTop: 28,
            padding: 18,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
          }}
        >
          <Text
            style={{
              color: colors.muted,
              fontSize: 11,
              letterSpacing: 1.4,
              marginBottom: 12,
            }}
          >
            EXPORT DATA
          </Text>
          <Text
            style={{
              color: colors.text,
              fontSize: 13,
              lineHeight: 18,
              marginBottom: 14,
            }}
          >
            Export sessions and app state as JSON or CSV. Use Save to Files or share to another app.
          </Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              onPress={handleExportJSON}
              disabled={exporting}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 12,
                backgroundColor: colors.accent,
                opacity: exporting || pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  color: "#000",
                  fontWeight: "600",
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                {exporting ? "…" : "Export JSON"}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleExportCSV}
              disabled={exporting}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 12,
                backgroundColor: "#1f2937",
                borderWidth: 1,
                borderColor: colors.border,
                opacity: exporting || pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  color: colors.text,
                  fontWeight: "600",
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                {exporting ? "…" : "Export CSV"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Delete all data */}
        <View
          style={{
            marginTop: 28,
            padding: 18,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
          }}
        >
          <Text
            style={{
              color: colors.muted,
              fontSize: 11,
              letterSpacing: 1.4,
              marginBottom: 12,
            }}
          >
            DELETE ALL DATA
          </Text>
          <Text
            style={{
              color: colors.text,
              fontSize: 13,
              lineHeight: 18,
              marginBottom: 14,
            }}
          >
            Remove all sessions and reset app state. You will be asked to confirm. This cannot be undone.
          </Text>
          <Pressable
            onPress={handleDeleteData}
            disabled={deleting}
            style={({ pressed }) => ({
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 12,
              backgroundColor: "#7f1d1d",
              borderWidth: 1,
              borderColor: "#991b1b",
              opacity: deleting || pressed ? 0.7 : 1,
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
              {deleting ? "Deleting…" : "Delete all data"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
