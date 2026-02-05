import { loadAppState, saveAppState } from "@/storage/app-state";
import { saveSession } from "@/storage/sessions";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";

const DURATIONS = [15, 25, 45, 60];

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();

  /* ---------------- STATE ---------------- */
  const [currentIndex, setCurrentIndex] = useState(1);
  const [duration, setDuration] = useState(DURATIONS[1]);
  const [remaining, setRemaining] = useState(DURATIONS[1] * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [todaySessions, setTodaySessions] = useState(0);
  const [weekSessions, setWeekSessions] = useState(0);
  const [focusScore, setFocusScore] = useState(0);
  const [showReflection, setShowReflection] = useState(false);
  const [streak, setStreak] = useState(0);

  /* ---------------- LOAD / SAVE ---------------- */
  useEffect(() => {
    let mounted = true;
    loadAppState().then((s) => {
      if (!mounted) return;
      setCurrentIndex(s.current_index);
      setDuration(s.duration);
      setRemaining(s.remaining);
      setIsRunning(s.is_running);
      setIsPaused(s.is_paused);
      setTodaySessions(s.today_sessions);
      setWeekSessions(s.week_sessions);
      setFocusScore(s.focus_score);
      setShowReflection(s.show_reflection);
      setStreak(s.streak);
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
  ]);

  /* ---------------- RESPONSIVE CONSTANTS ---------------- */
  const MIN_RING = 240;
  const MAX_RING = 340;

  const RING_SIZE = Math.min(MAX_RING, Math.max(MIN_RING, width * 0.78));

  const RING_BORDER = RING_SIZE - 28;

  const TIMER_FONT = Math.min(76, Math.max(44, width * 0.17));

  const VERTICAL_PADDING = Math.max(24, height * 0.04);

  /* ---------------- COLORS ---------------- */
  const colors = {
    primary: "#3b82f6",
    accent: "#60a5fa",
    success: "#4ade80",
    warning: "#fbbf24",
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
  useEffect(() => {
    if (isRunning && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            completeSession();
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
    setIsRunning(true);
    setIsPaused(false);
    animateScale(1.05, 1);
  };

  const pauseTimer = () => {
    setIsRunning(false);
    setIsPaused(true);
  };

  const resumeTimer = () => {
    setIsRunning(true);
    setIsPaused(false);
  };

  const resetTimer = () => {
    if (isRunning || isPaused) {
      setTodaySessions((p) => p + 1);
      setWeekSessions((p) => p + 1);
      saveSession({
        duration_minutes: duration,
        completed_at: new Date().toISOString(),
        completed: false,
      });
    }
    setIsRunning(false);
    setIsPaused(false);
    setRemaining(duration * 60);
    setShowReflection(false);
  };

  const completeSession = () => {
    setIsRunning(false);
    setTodaySessions((p) => p + 1);
    setWeekSessions((p) => p + 1);
    setFocusScore((p) => Math.min(100, p + 1));
    setStreak((p) => p + 1);
    setShowReflection(true);

    saveSession({
      duration_minutes: duration,
      completed_at: new Date().toISOString(),
      completed: true,
    });

    animateScale(1.1, 1);
  };

  /* ---------------- SWIPE ---------------- */
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 20 && !isRunning && !isPaused,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50 && currentIndex < DURATIONS.length - 1) {
          selectDuration(currentIndex + 1);
        }
        if (g.dx > 50 && currentIndex > 0) {
          selectDuration(currentIndex - 1);
        }
      },
    }),
  ).current;

  const selectDuration = (index: number) => {
    if (isRunning || isPaused) return;
    const d = DURATIONS[index];
    setCurrentIndex(index);
    setDuration(d);
    setRemaining(d * 60);
  };

  /* ---------------- RING CALC ---------------- */
  const totalSeconds = duration * 60;
  const remainingFraction = remaining / totalSeconds;

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

  /* ---------------- UI ---------------- */
  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        backgroundColor: "black",
        paddingVertical: VERTICAL_PADDING,
      }}
    >
      <Animated.View style={{ opacity: fadeAnim, alignItems: "center" }}>
        {/* TIMER */}
        <Animated.View
          style={{ transform: [{ scale: scaleAnim }], marginBottom: 28 }}
        >
          <View
            style={{
              width: RING_SIZE,
              height: RING_SIZE,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Svg
              width={SVG_SIZE}
              height={SVG_SIZE}
              style={{ position: "absolute" }}
            >
              <Circle
                stroke="#222"
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
              style={{ color: "#fff", fontSize: TIMER_FONT, fontWeight: "700" }}
            >
              {formatTime(remaining)}
            </Text>
            <Text style={{ color: "#888", fontSize: 11, letterSpacing: 2 }}>
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

        {/* DURATION BUTTONS */}
        <View
          {...panResponder.panHandlers}
          style={{ flexDirection: "row", gap: 12, marginBottom: 28 }}
        >
          {DURATIONS.map((d, index) => {
            const active = index === currentIndex;
            return (
              <Pressable
                key={d}
                onPress={() => selectDuration(index)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  backgroundColor: active ? colors.primary : "#1f1f1f",
                }}
              >
                <Text
                  style={{
                    color: active ? "#fff" : "#aaa",
                    fontWeight: "600",
                    fontSize: 19,
                  }}
                >
                  {d}m
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* CONTROLS */}
        <View style={{ flexDirection: "row", gap: 14 }}>
          {!isRunning && !isPaused && (
            <Pressable
              onPress={startTimer}
              style={{
                padding: 16,
                borderRadius: 14,
                width: 90,
                alignItems: "center",
                backgroundColor: colors.primary,
              }}
            >
              <Text style={{ fontWeight: "600", fontSize: 20 }}>Start</Text>
            </Pressable>
          )}
          {isRunning && (
            <Pressable
              onPress={pauseTimer}
              style={{
                padding: 16,
                borderRadius: 14,
                width: 90,
                alignItems: "center",
                backgroundColor: colors.warning,
              }}
            >
              <Text style={{ fontWeight: "600", fontSize: 19 }}>Pause</Text>
            </Pressable>
          )}
          {isPaused && (
            <Pressable
              onPress={resumeTimer}
              style={{
                padding: 16,
                borderRadius: 14,
                alignItems: "center",
                backgroundColor: colors.accent,
              }}
            >
              <Text style={{ fontWeight: "600", fontSize: 20 }}>Resume</Text>
            </Pressable>
          )}
          {(isRunning || isPaused) && (
            <Pressable
              onPress={resetTimer}
              style={{
                padding: 16,
                borderRadius: 14,
                width: 90,
                alignItems: "center",
                backgroundColor: "#ee4646",
              }}
            >
              <Text style={{ fontWeight: "600", fontSize: 19 }}>Stop</Text>
            </Pressable>
          )}
        </View>

        {/* STREAK */}
        <Text
          style={{
            marginTop: 46,
            color: "#888",
            fontWeight: "700",
            fontSize: 20,
            letterSpacing: 1,
          }}
        >
          STREAK: <Text style={{ color: colors.primary }}>{streak}</Text>
        </Text>
      </Animated.View>
    </ScrollView>
  );
}
