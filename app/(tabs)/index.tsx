import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import WelcomeScreen from "../../components/welcome-screen";
import {
  fadeInAmbient,
  fadeOutAmbient,
  initAmbientSound,
  playAmbientTracks,
  releaseAmbientSound,
  stopAmbientTracks,
} from "../../storage/ambient-sound";
import {
  getRecoveryRecommendation,
  getSessionTypeLabel,
  getWorkloadWarning,
} from "../../storage/analytics";
import { loadAppState, saveAppState } from "../../storage/app-state";
import { DURATIONS } from "../../storage/constants";
import { getSessions, saveSession, type SessionRecord } from "../../storage/sessions";

const HISTORY_PANEL_HEIGHT = 280;
const HISTORY_HANDLE_HEIGHT = 44;

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();

  /* ---------------- STATE ---------------- */
  const [currentIndex, setCurrentIndex] = useState(1);
  const [duration, setDuration] = useState<number>(DURATIONS[1]);
  const [remaining, setRemaining] = useState(DURATIONS[1] * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [todaySessions, setTodaySessions] = useState(0);
  const [weekSessions, setWeekSessions] = useState(0);
  const [focusScore, setFocusScore] = useState(0);
  const [showReflection, setShowReflection] = useState(false);
  const [streak, setStreak] = useState(0);
  const [todayCompletedCount, setTodayCompletedCount] = useState(0);
  const [recentSessions, setRecentSessions] = useState<SessionRecord[]>([]);
  const [recoveryRecommendation, setRecoveryRecommendation] = useState<string | null>(null);
  const [workloadWarning, setWorkloadWarning] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState<boolean | null>(null);
  const [ambientTracks, setAmbientTracks] = useState<[boolean, boolean, boolean]>([false, false, false]);

  /* ---------------- LOAD / SAVE ---------------- */
  useEffect(() => {
    let mounted = true;
    loadAppState().then((s) => {
      if (!mounted) return;
      const durationIndex = DURATIONS.indexOf(s.duration as (typeof DURATIONS)[number]);
      if (durationIndex >= 0) {
        const dur = s.duration;
        const maxRem = dur * 60;
        const clamped = Math.min(maxRem, Math.max(0, Number.isFinite(s.remaining) ? s.remaining : maxRem));
        setCurrentIndex(durationIndex);
        setDuration(dur);
        setRemaining(clamped);
      } else {
        const fallback = DURATIONS[1];
        setCurrentIndex(1);
        setDuration(fallback);
        setRemaining(fallback * 60);
        void saveAppState({ duration: fallback, current_index: 1, remaining: fallback * 60 });
      }
      setIsRunning(s.is_running);
      setIsPaused(s.is_paused);
      setTodaySessions(s.today_sessions);
      setWeekSessions(s.week_sessions);
      setFocusScore(s.focus_score);
      setShowReflection(s.show_reflection);
      setStreak(s.streak);
      setShowWelcome(!s.has_seen_onboarding);
      if (Array.isArray(s.ambient_tracks) && s.ambient_tracks.length === 3) {
        setAmbientTracks([s.ambient_tracks[0], s.ambient_tracks[1], s.ambient_tracks[2]]);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    saveAppState({
      current_index: currentIndex,
      duration,
      remaining,
      is_running: isRunning,
      is_paused: isPaused,
      today_sessions: todaySessions,
      week_sessions: weekSessions,
      focus_score: focusScore,
      show_reflection: showReflection,
      streak,
      ambient_tracks: ambientTracks,
    });
  }, [
    currentIndex,
    duration,
    remaining,
    isRunning,
    isPaused,
    todaySessions,
    weekSessions,
    focusScore,
    showReflection,
    streak,
    ambientTracks,
  ]);

  /* ---------------- RESPONSIVE CONSTANTS: ring capped so controls + duration + ambient stay on screen ---------------- */
  const MIN_RING = 140;
  const MAX_RING = 300;
  const RING_HORIZONTAL_PADDING = Math.max(16, Math.min(32, width * 0.08));
  const availableHeight = height - (HISTORY_HANDLE_HEIGHT + 24 + 60);
  const spaceForContentBelow = 340;
  const ringMaxByHeight = availableHeight - spaceForContentBelow;
  const ringByWidth = Math.min(MAX_RING, width - RING_HORIZONTAL_PADDING * 2, Math.max(MIN_RING, width * 0.65));
  const RING_SIZE = Math.min(ringByWidth, Math.max(MIN_RING, ringMaxByHeight));

  const RING_BORDER = RING_SIZE - 28;

  const TIMER_FONT = Math.min(64, Math.max(32, Math.round(RING_SIZE * 0.22)));

  const VERTICAL_PADDING = Math.max(12, Math.min(24, height * 0.025));

  /* ---------------- COLORS ---------------- */
  const colors = {
    primary: "#3b82f6",
    accent: "#60a5fa",
    success: "#4ade80",
    warning: "#fbbf24",
  };

  /* ---------------- HISTORY PULL-UP + STREAKS (from device storage) ---------------- */
  const refreshSessionsAndStreaks = useCallback(() => {
    getSessions().then((list) => {
      const sessions = Array.isArray(list) ? list : [];
      setRecentSessions(sessions.slice(0, 10));
      setWorkloadWarning(getWorkloadWarning(sessions));
      const today = new Date().toDateString();
      const todayCompleted = sessions.filter(
        (s) => {
          if (s.completed === false || !s.completed_at) return false;
          const t = new Date(s.completed_at).getTime();
          return Number.isFinite(t) && new Date(s.completed_at).toDateString() === today;
        }
      ).length;
      setTodayCompletedCount(todayCompleted);
      setRecoveryRecommendation(getRecoveryRecommendation(todayCompleted));
    });
  }, []);

  const refreshSessionsRef = useRef(refreshSessionsAndStreaks);
  refreshSessionsRef.current = refreshSessionsAndStreaks;

  useFocusEffect(
    useCallback(() => {
      loadAppState().then((s) => {
        const durationIndex = DURATIONS.indexOf(s.duration as (typeof DURATIONS)[number]);
        if (durationIndex >= 0) {
          setCurrentIndex(durationIndex);
          setDuration(s.duration);
          const dur = s.duration;
          const maxRem = dur * 60;
          const clamped = Math.min(maxRem, Math.max(0, Number.isFinite(s.remaining) ? s.remaining : maxRem));
          setRemaining(clamped);
        } else {
          setCurrentIndex(1);
          setDuration(DURATIONS[1]);
          setRemaining(DURATIONS[1] * 60);
        }
        setIsRunning(s.is_running);
        setIsPaused(s.is_paused);
        setTodaySessions(s.today_sessions);
        setWeekSessions(s.week_sessions);
        setFocusScore(s.focus_score);
        setShowReflection(s.show_reflection);
        setStreak(s.streak);
        setShowWelcome(!s.has_seen_onboarding);
        if (Array.isArray(s.ambient_tracks) && s.ambient_tracks.length === 3) {
          setAmbientTracks([s.ambient_tracks[0], s.ambient_tracks[1], s.ambient_tracks[2]]);
        }
        setTimeout(() => refreshSessionsRef.current(), 0);
      });
    }, [])
  );

  const ambientTracksRef = useRef(ambientTracks);
  ambientTracksRef.current = ambientTracks;
  const isRunningRef = useRef(isRunning);
  const isPausedRef = useRef(isPaused);
  isRunningRef.current = isRunning;
  isPausedRef.current = isPaused;

  useEffect(() => {
    initAmbientSound();
    return () => {
      fadeOutAmbient().then(() => stopAmbientTracks()).then(() => releaseAmbientSound());
    };
  }, []);

  useEffect(() => {
    refreshSessionsAndStreaks();
  }, [refreshSessionsAndStreaks]);
  const pullUpTranslate = useRef(new Animated.Value(HISTORY_PANEL_HEIGHT)).current;
  const [pullUpOpen, setPullUpOpen] = useState(false);
  const togglePullUp = () => {
    const toOpen = !pullUpOpen;
    setPullUpOpen(toOpen);
    Animated.timing(pullUpTranslate, {
      toValue: toOpen ? 0 : HISTORY_PANEL_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const startNextSession = () => {
    setShowReflection(false);
    setRemaining(duration * 60);
    setIsRunning(false);
    setIsPaused(false);
  };

  /* ---------------- ANIMATION ---------------- */
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  /* ---------------- TIMER ---------------- */
  const completedThisRunRef = useRef(false);
  const completeSessionRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (isRunning && remaining > 0) {
      completedThisRunRef.current = false;
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            if (!completedThisRunRef.current) {
              completedThisRunRef.current = true;
              completeSessionRef.current();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, remaining]);

  const formatTime = (sec: number) =>
    `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, "0")}`;

  const animateScale = (to: number, back: number) => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: to,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: back,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const startTimer = () => {
    completedThisRunRef.current = false;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRunning(true);
    setIsPaused(false);
    animateScale(1.05, 1);
    const active = ambientTracksRef.current;
    if (active.some(Boolean)) {
      initAmbientSound().then(() => {
        playAmbientTracks(active).then(() => fadeInAmbient(active));
      });
    }
  };

  const pauseTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRunning(false);
    setIsPaused(true);
    fadeOutAmbient().then(() => stopAmbientTracks());
  };

  const resumeTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRunning(true);
    setIsPaused(false);
    const active = ambientTracksRef.current;
    if (active.some(Boolean)) {
      initAmbientSound().then(() => {
        playAmbientTracks(active).then(() => fadeInAmbient(active));
      });
    }
  };

  const resetTimer = () => {
    if (isRunning || isPaused) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setTodaySessions((p) => p + 1);
      setWeekSessions((p) => p + 1);
      saveSession({
        duration_minutes: duration,
        completed_at: new Date().toISOString(),
        completed: false,
      }).then(refreshSessionsAndStreaks);
      fadeOutAmbient().then(() => stopAmbientTracks());
    }
    setIsRunning(false);
    setIsPaused(false);
    setRemaining(duration * 60);
    setShowReflection(false);
  };

  const completeSession = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsRunning(false);
    fadeOutAmbient().then(() => stopAmbientTracks());
    setTodaySessions((p) => p + 1);
    setWeekSessions((p) => p + 1);
    setFocusScore((p) => Math.min(100, p + 1));
    setStreak((p) => p + 1);
    setShowReflection(true);

    saveSession({
      duration_minutes: duration,
      completed_at: new Date().toISOString(),
      completed: true,
    }).then(refreshSessionsAndStreaks);

    animateScale(1.1, 1);
  };

  completeSessionRef.current = completeSession;

  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  /* ---------------- SWIPE ---------------- */
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 20 && !isRunningRef.current && !isPausedRef.current,
      onPanResponderRelease: (_, g) => {
        const idx = currentIndexRef.current;
        if (g.dx < -50 && idx < DURATIONS.length - 1) {
          selectDuration(idx + 1);
        }
        if (g.dx > 50 && idx > 0) {
          selectDuration(idx - 1);
        }
      },
    }),
  ).current;

  const selectDuration = (index: number) => {
    if (isRunning || isPaused) return;
    if (index < 0 || index >= DURATIONS.length) return;
    const d = DURATIONS[index];
    if (d == null || typeof d !== "number") return;
    completedThisRunRef.current = false;
    setCurrentIndex(index);
    setDuration(d);
    setRemaining(d * 60);
  };

  /* ---------------- RING CALC ---------------- */
  const totalSeconds = Math.max(1, duration * 60);
  const remainingFraction = Math.min(1, Math.max(0, remaining / totalSeconds));

  const STROKE = 6;
  const RADIUS = (RING_BORDER - STROKE) / 2;
  const SVG_SIZE = RADIUS * 2 + STROKE;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const progress = remainingFraction * CIRCUMFERENCE;

  const ringColor = showReflection
    ? colors.success
    : isPaused
      ? colors.warning
      : colors.primary;

  const formatSessionDate = (iso: string) => {
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
  };

  /* ---------------- UI ---------------- */
  const bg = "#0a0a0a";
  const cardBg = "#111";
  const border = "#26262a";
  const inactiveButtonBg = "#1a1a1e";

  const dismissWelcome = async () => {
    await saveAppState({ has_seen_onboarding: true });
    setShowWelcome(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {showWelcome === true && <WelcomeScreen onDismiss={dismissWelcome} />}
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
        
          backgroundColor: 'black',
          paddingVertical: VERTICAL_PADDING,
          paddingHorizontal: RING_HORIZONTAL_PADDING,
          paddingBottom: HISTORY_HANDLE_HEIGHT + 24,
        }}
        style={{ overflow: "visible" }}
      >
        <Animated.View style={{ opacity: fadeAnim, alignItems: "center", overflow: "visible" }}>
        {/* TIMER */}
        <Animated.View
          style={{ transform: [{ scale: scaleAnim }], marginBottom: 28, marginTop: -30, overflow: "visible" }}
        >
          <View
            {...panResponder.panHandlers}
            style={{
              width: RING_SIZE,
              height: RING_SIZE,
              alignItems: "center",
              justifyContent: "center",
              overflow: "visible",
            }}
          >
            <Svg
              width={SVG_SIZE}
              height={SVG_SIZE}
              style={{ position: "absolute" }}
            >
              <Circle
                stroke="#1a1a1a"
                fill="none"
                cx={SVG_SIZE / 2}
                cy={SVG_SIZE / 2}
                r={RADIUS}
                strokeWidth={STROKE}
              />
              <Circle
                stroke={ringColor}
                fill="none"
                cx={SVG_SIZE / 2}
                cy={SVG_SIZE / 2}
                r={RADIUS}
                strokeWidth={STROKE}
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={CIRCUMFERENCE - progress}
                strokeLinecap="round"
                rotation="-90"
                origin={`${SVG_SIZE / 2}, ${SVG_SIZE / 2}`}
              />
            </Svg>

            <Text
              style={{
                color: "#fff",
                fontSize: TIMER_FONT,
                fontWeight: "700",
                letterSpacing: 1,
              }}
            >
              {formatTime(remaining)}
            </Text>
            <Text
              style={{
                color: "#9ca3af",
                fontSize: 12,
                letterSpacing: 2,
                marginTop: 4,
              }}
            >
              {isRunning
                ? "FOCUSING"
                : isPaused
                  ? "PAUSED"
                  : showReflection
                    ? "COMPLETE"
                    : "READY"}
            </Text>
          </View>
        </Animated.View>

        {/* Recovery nudge: after 3+ completed today */}
        {!showReflection && todayCompletedCount >= 3 && (
          <View style={{ marginBottom: 12, alignItems: "center" }}>
            <Text
              style={{
                color: "#94a3b8",
                fontSize: 12,
                fontStyle: "italic",
              }}
            >
              {"You've"} done {todayCompletedCount} sessions. Consider a longer break.
              {recoveryRecommendation && (
                <Text style={{ fontWeight: "600" }}> Recommended break: {recoveryRecommendation}.</Text>
              )}
            </Text>
          </View>
        )}

        {/* Workload warning */}
        {!showReflection && workloadWarning && (
          <View style={{ marginBottom: 12, alignItems: "center" }}>
            <Text style={{ color: "#f87171", fontSize: 12, fontStyle: "italic" }}>
              {workloadWarning}
            </Text>
          </View>
        )}

        {/* CONTROLS */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 32 }}>
          {!isRunning && !isPaused && (
            <Pressable
              onPress={startTimer}
              style={({ pressed }) => ({
                padding: 16,
                borderRadius: 14,
                marginTop: -10,
                width: 95,
                alignItems: "center",
                backgroundColor: colors.primary,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ fontWeight: "700", fontSize: 22, color: "#fff" }}>Flow</Text>
            </Pressable>
          )}
          {isRunning && (
            <Pressable
              onPress={pauseTimer}
              style={({ pressed }) => ({
                padding: 16,
                borderRadius: 14,
                width: 90,
                alignItems: "center",
                backgroundColor: colors.warning,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ fontWeight: "600", fontSize: 19, color: "#000" }}>Pause</Text>
            </Pressable>
          )}
          {isPaused && (
            <Pressable
              onPress={resumeTimer}
              style={({ pressed }) => ({
                padding: 16,
                borderRadius: 14,
                alignItems: "center",
                backgroundColor: colors.accent,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ fontWeight: "600", fontSize: 20, color: "#fff" }}>Resume</Text>
            </Pressable>
          )}
          {(isRunning || isPaused) && (
            <Pressable
              onPress={resetTimer}
              style={({ pressed }) => ({
                padding: 16,
                borderRadius: 14,
                width: 90,
                alignItems: "center",
                backgroundColor: "#ee4646",
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ fontWeight: "600", fontSize: 19, color: "#fff" }}>Stop</Text>
            </Pressable>
          )}
        </View>

        {/* DURATION BUTTONS */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          {DURATIONS.map((d, index) => {
            const active = index === currentIndex;
            return (
              <Pressable
                key={d}
                onPress={() => selectDuration(index)}
                style={({ pressed }) => ({
                  paddingVertical: 16,
                  display:"flex",
                  justifyContent:"center",
                  alignItems:"center",
                  paddingHorizontal: 14,
                  width:70,
                  borderRadius: 12,
                  backgroundColor: active ? colors.primary : inactiveButtonBg,
                  borderWidth: active ? 0 : 1,
                  borderColor: active ? "transparent" : border,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text
                  style={{
                    color: active ? "#fff" : "#b5b1b1",
                    fontWeight: "600",
                    fontSize: 17,
                  }}
                >
                  {d}m
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Ambient sounds: 3 tracks, mix on, fade at session boundaries — uses space of former streak card */}
        <View
          style={{
            marginTop: 40,
            alignSelf: "stretch",
            marginHorizontal: 40,
            paddingVertical: 16,
            paddingHorizontal: 20,
            borderRadius: 14,
            backgroundColor: inactiveButtonBg,
            borderWidth: 1,
            borderColor: border,
          }}
        >
          <Text
            style={{
              color: "#9ca3af",
              fontSize: 12,
              fontWeight: "600",
              letterSpacing: 1,
              marginBottom: 14,
              textAlign: "center",
            }}
          >
            AMBIENT SOUNDS
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ color: "#94a3b8", fontSize: 12, marginRight: 6 }}>{i + 1}</Text>
                <Switch
                  value={ambientTracks[i]}
                  onValueChange={(v) => {
                    const next: [boolean, boolean, boolean] = [
                      ambientTracks[0],
                      ambientTracks[1],
                      ambientTracks[2],
                    ];
                    next[i] = v;
                    setAmbientTracks(next);
                    void saveAppState({ ambient_tracks: next });
                  }}
                  trackColor={{ false: "#374151", true: colors.primary }}
                  thumbColor="#e5e7eb"
                />
              </View>
            ))}
          </View>
        </View>
      </Animated.View>
    </ScrollView>

      {/* Take a break — overlay mini modal (when session completes) */}
      {showReflection && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 24,
            zIndex: 500,
          }}
        >
          <View
            style={{
              backgroundColor: "#0f172a",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#1e293b",
              paddingVertical: 20,
              paddingHorizontal: 24,
              alignItems: "center",
              minWidth: 260,
              maxWidth: 320,
            }}
          >
            <Text
              style={{
                color: "#94a3b8",
                fontSize: 14,
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              Take a {recoveryRecommendation ?? "5 min"} break?
            </Text>
            <Pressable
              onPress={startNextSession}
              style={({ pressed }) => ({
                paddingVertical: 10,
                paddingHorizontal: 20,
                borderRadius: 12,
                backgroundColor: colors.primary,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ color: "#000", fontWeight: "600", fontSize: 14 }}>
                Start next session
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* History pull-up: swipe up to view past sessions — fully opaque, no transparency or gaps */}
      <Animated.View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: HISTORY_PANEL_HEIGHT + HISTORY_HANDLE_HEIGHT,
          transform: [{ translateY: pullUpTranslate }],
          backgroundColor: inactiveButtonBg,
          overflow: "hidden",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
      >
        <Pressable
          onPress={togglePullUp}
          style={({ pressed }) => ({
            height: HISTORY_HANDLE_HEIGHT,
            backgroundColor: inactiveButtonBg,
            borderTopLeftRadius: 34,
            borderTopRightRadius: 34,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <View
            style={{
              position: "absolute",
              top: 6,
              width: 32,
              height: 3,
              borderRadius: 2,
              backgroundColor: "#374151",
            }}
          />
          <Text style={{ color: "#a6a6a6", fontSize: 12, letterSpacing: 1.2 }}>
            {pullUpOpen ? "↓ Close" : "↑ Recent sessions"}
          </Text>
        </Pressable>
        <ScrollView
          style={{
            flex: 1,
            backgroundColor: inactiveButtonBg,
          }}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {recentSessions.length === 0 ? (
            <Text style={{ color: "#6b7280", fontSize: 14, textAlign: "center" }}>
              No sessions yet
            </Text>
          ) : (
            recentSessions.map((s, i) => (
              <View
                key={`${s.completed_at}-${i}`}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  marginBottom: 8,
                  borderRadius: 12,
                  backgroundColor: cardBg,
                  borderWidth: 1,
                  borderColor: border,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ color: "#f5f5f5", fontSize: 15, fontWeight: "600" }}>
                    {s.duration_minutes} min
                  </Text>
                  <Text style={{ color: "#888", fontSize: 11 }}>
                    · {getSessionTypeLabel(s)}
                  </Text>
                  {s.completed === false && (
                    <Text style={{ color: "#666", fontSize: 10, letterSpacing: 0.8 }}>
                      Stopped
                    </Text>
                  )}
                </View>
                <Text style={{ color: "#888", fontSize: 11, marginTop: 4 }}>
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
