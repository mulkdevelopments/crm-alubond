import { useMemo } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ThemeColors, useThemeColors } from "@/constants/theme";

export type LossPromptState = {
  reason: string;
  winner: string;
  error: string | null;
  saving: boolean;
};

export function createLossPromptState(seed?: { lossReason?: string | null; competitor?: string | null }): LossPromptState {
  return {
    reason: seed?.lossReason?.trim() ?? "",
    winner: seed?.competitor?.trim() ?? "",
    error: null,
    saving: false,
  };
}

export function LossStagePrompt({
  visible,
  prompt,
  onChange,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  prompt: LossPromptState | null;
  onChange: (next: LossPromptState) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!prompt) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Mark project as lost</Text>
          <Text style={[styles.subtitle, { color: colors.text2 }]}>
            Tell us why this project was lost and who won, if known.
          </Text>

          <View style={styles.form}>
            <Text style={[styles.label, { color: colors.text2 }]}>Loss reason *</Text>
            <TextInput
              value={prompt.reason}
              onChangeText={(reason) => onChange({ ...prompt, reason, error: null })}
              placeholder="What caused us to lose this project?"
              placeholderTextColor={colors.text3}
              multiline
              style={[styles.textArea, { backgroundColor: colors.surface2, borderColor: colors.border, color: colors.text }]}
            />

            <Text style={[styles.label, { color: colors.text2 }]}>Who won the project (optional)</Text>
            <TextInput
              value={prompt.winner}
              onChangeText={(winner) => onChange({ ...prompt, winner, error: null })}
              placeholder="e.g. Reynobond, Alucobond"
              placeholderTextColor={colors.text3}
              style={[styles.input, { backgroundColor: colors.surface2, borderColor: colors.border, color: colors.text }]}
            />

            {prompt.error ? <Text style={[styles.error, { color: colors.danger }]}>{prompt.error}</Text> : null}
          </View>

          <View style={styles.actions}>
            <Pressable
              style={[styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={onClose}
              disabled={prompt.saving}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryButton, { backgroundColor: colors.brand, opacity: prompt.saving ? 0.7 : 1 }]}
              onPress={onSubmit}
              disabled={prompt.saving}
            >
              <Text style={styles.primaryButtonText}>{prompt.saving ? "Saving..." : "Save and move to Lost"}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "center",
      padding: 16,
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    card: {
      width: "100%",
      maxWidth: 512,
      alignSelf: "center",
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
    },
    title: {
      fontSize: 16,
      fontWeight: "700",
    },
    subtitle: {
      marginTop: 4,
      fontSize: 14,
      lineHeight: 20,
    },
    form: {
      marginTop: 16,
      gap: 10,
    },
    label: {
      fontSize: 12,
      fontWeight: "600",
    },
    input: {
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 12,
      fontSize: 14,
    },
    textArea: {
      minHeight: 88,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      textAlignVertical: "top",
    },
    error: {
      fontSize: 12,
    },
    actions: {
      marginTop: 16,
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 8,
    },
    secondaryButton: {
      height: 32,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryButtonText: {
      fontSize: 12,
      fontWeight: "600",
    },
    primaryButton: {
      height: 32,
      borderRadius: 12,
      paddingHorizontal: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryButtonText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "700",
    },
  });
}
