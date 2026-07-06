import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MessageSquare, Send, Sparkles, X } from "lucide-react-native";

import { ThemeColors, useThemeColors } from "@/constants/theme";
import { askAssistant, type AssistantMessage } from "@/lib/api/ai-api";
import { useAuth } from "@/lib/auth/AuthContext";

const INITIAL_MESSAGE: AssistantMessage = {
  role: "assistant",
  content: "I am your CRM AI assistant. Ask about projects, follow-ups, activities, and performance.",
};

export function AIAssistantFab({ bottom }: { bottom: number }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([INITIAL_MESSAGE]);
  const scrollRef = useRef<ScrollView>(null);

  const historyForApi = useMemo(
    () => messages.filter((msg) => msg.role === "user" || msg.role === "assistant").slice(-12),
    [messages]
  );

  async function onSubmit() {
    const question = input.trim();
    if (!question || !token || loading) return;

    const nextMessages: AssistantMessage[] = [...messages, { role: "user", content: question }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    try {
      const answer = await askAssistant(token, question, historyForApi);
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: error instanceof Error ? error.message : "Failed to get response.",
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  return (
    <>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.panelWrap}
            pointerEvents="box-none"
          >
            <Pressable
              style={[styles.panel, { bottom: bottom + 56 }]}
              onPress={(event) => event.stopPropagation()}
            >
              <View style={styles.panelHeader}>
                <View style={styles.panelTitleRow}>
                  <Sparkles size={16} color={colors.brand} strokeWidth={2.2} />
                  <Text style={styles.panelTitle}>AI Assistant</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close AI assistant"
                  onPress={() => setOpen(false)}
                  style={styles.iconBtn}
                >
                  <X size={16} color={colors.text2} strokeWidth={2.2} />
                </Pressable>
              </View>

              <ScrollView
                ref={scrollRef}
                style={styles.messages}
                contentContainerStyle={styles.messagesContent}
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
              >
                {messages.map((msg, index) => (
                  <View
                    key={`${msg.role}-${index}`}
                    style={msg.role === "user" ? styles.userRow : styles.assistantRow}
                  >
                    <View style={msg.role === "user" ? styles.userBubble : styles.assistantBubble}>
                      <Text style={msg.role === "user" ? styles.userText : styles.assistantText}>
                        {msg.content}
                      </Text>
                    </View>
                  </View>
                ))}
                {loading ? <Text style={styles.thinking}>Thinking...</Text> : null}
              </ScrollView>

              <View style={styles.inputRow}>
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  placeholder="Ask about projects, follow-ups, activities..."
                  placeholderTextColor={colors.text3}
                  style={styles.input}
                  editable={!loading}
                  returnKeyType="send"
                  onSubmitEditing={() => void onSubmit()}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Send message"
                  style={[styles.sendBtn, (!input.trim() || loading || !token) && styles.sendBtnDisabled]}
                  onPress={() => void onSubmit()}
                  disabled={!input.trim() || loading || !token}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Send size={14} color="#fff" strokeWidth={2.2} />
                  )}
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open AI assistant"
        onPress={() => setOpen((prev) => !prev)}
        style={[styles.fab, { bottom }]}
      >
        <MessageSquare size={20} color="#fff" strokeWidth={2.2} />
      </Pressable>
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    fab: {
      position: "absolute",
      right: 16,
      zIndex: 65,
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.brand,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
    },
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.2)",
    },
    panelWrap: {
      flex: 1,
    },
    panel: {
      position: "absolute",
      right: 16,
      left: 16,
      maxHeight: "58%",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    },
    panelHeader: {
      height: 48,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    panelTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    panelTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    iconBtn: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    messages: {
      maxHeight: 320,
      backgroundColor: colors.surface2,
    },
    messagesContent: {
      paddingHorizontal: 12,
      paddingVertical: 12,
      gap: 8,
    },
    userRow: { alignItems: "flex-end" },
    assistantRow: { alignItems: "flex-start" },
    userBubble: {
      maxWidth: "85%",
      borderRadius: 16,
      borderTopRightRadius: 6,
      backgroundColor: colors.brand,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    assistantBubble: {
      maxWidth: "85%",
      borderRadius: 16,
      borderTopLeftRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    userText: { fontSize: 14, color: "#fff" },
    assistantText: { fontSize: 14, color: colors.text },
    thinking: { fontSize: 12, color: colors.text3, paddingHorizontal: 4 },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    input: {
      flex: 1,
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
      paddingHorizontal: 12,
      fontSize: 14,
      color: colors.text,
    },
    sendBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.brand,
      alignItems: "center",
      justifyContent: "center",
    },
    sendBtnDisabled: { opacity: 0.5 },
  });
}
