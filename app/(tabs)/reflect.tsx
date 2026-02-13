import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { saveAppState } from "../../storage/app-state";
import {
  getSessions,
  updateLatestCompletedSessionReflection,
} from "../../storage/sessions";

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
  const [pastNotes, setPastNotes] = useState<{ completed_at: string; reflection: string }[]>([]);

  const loadSessions = useCallback(() => {
    getSessions().then((sessions) => {
      const list = Array.isArray(sessions) ? sessions : [];
      const completed = list.filter((s) => s.completed !== false);
      const latest = completed[0];
      if (latest?.reflection) {
        setReflection(latest.reflection);
        setSaved(true);
      } else {
        setReflection("");
        setSaved(false);
      }
      const withReflection = list.filter(
        (s) => s.reflection && typeof s.reflection === "string" && s.reflection.trim() !== ""
      );
      setPastNotes(
        withReflection.map((s) => ({
          completed_at: s.completed_at,
          reflection: (s.reflection ?? "").trim(),
        }))
      );
    });
  }, []);

  useFocusEffect(useCallback(() => loadSessions(), [loadSessions]));

  const saveReflection = async () => {
    if (!reflection.trim()) return;
    await updateLatestCompletedSessionReflection(reflection);
    await saveAppState({ show_reflection: false });
    setSaved(true);
    loadSessions();
  };

  const skipReflection = async () => {
    await saveAppState({ show_reflection: false });
  };

  const formatNoteDate = (iso: string) => {
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
          paddingHorizontal: 20,
          paddingBottom: 40,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ───── What stood out (top) ───── */}
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
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Pressable
                  onPress={skipReflection}
                  style={({ pressed }) => ({
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 12,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ color: colors.muted, fontSize: 13 }}>Skip</Text>
                </Pressable>
                <Pressable
                  onPress={saveReflection}
                  style={({ pressed }) => ({
                    paddingVertical: 10,
                    paddingHorizontal: 18,
                    borderRadius: 12,
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
              </View>
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

        {/* ───── Added notes (saved reflections, below) ───── */}
        <View style={{ marginTop: 28 }}>
          <Text
            style={{
              color: colors.muted,
              fontSize: 11,
              letterSpacing: 1.4,
              marginBottom: 12,
            }}
          >
            PAST REFLECTIONS
          </Text>
          {pastNotes.length === 0 ? (
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              No saved notes yet. Save a reflection above to see it here.
            </Text>
          ) : (
            pastNotes.map((note, i) => (
              <View
                key={`${note.completed_at}-${i}`}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{
                    color: colors.muted,
                    fontSize: 11,
                    marginBottom: 6,
                  }}
                >
                  {formatNoteDate(note.completed_at)}
                </Text>
                <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>
                  {note.reflection}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* ───── Gentle Guidance ───── */}
        <View style={{ marginTop: 24, alignItems: "center" }}>
          <Text
            style={{
              color: colors.muted,
              fontSize: 12,
              textAlign: "center",
              lineHeight: 20,
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
