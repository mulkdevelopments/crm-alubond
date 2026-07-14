import { StyleSheet, Text, View } from "react-native";

import { ThemeColors, useThemeColors } from "@/constants/theme";
import {
  parseAssistantMessage,
  type AssistantBlock,
  type AssistantInline,
} from "@/lib/assistant-message";

function InlineText({
  segments,
  baseStyle,
  boldStyle,
}: {
  segments: AssistantInline[];
  baseStyle: object;
  boldStyle: object;
}) {
  return (
    <Text style={baseStyle}>
      {segments.map((segment, index) =>
        segment.type === "bold" ? (
          <Text key={`${segment.text}-${index}`} style={boldStyle}>
            {segment.text}
          </Text>
        ) : (
          <Text key={`${segment.text}-${index}`}>{segment.text}</Text>
        ),
      )}
    </Text>
  );
}

export function AssistantMessageBody({
  content,
  tone = "assistant",
}: {
  content: string;
  tone?: "assistant" | "user";
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  if (tone === "user") {
    return <Text style={styles.userText}>{content}</Text>;
  }

  const blocks = parseAssistantMessage(content);
  const fields = blocks.filter((block): block is Extract<AssistantBlock, { type: "field" }> => block.type === "field");
  const others = blocks.filter((block) => block.type !== "field");

  return (
    <View style={styles.wrap}>
      {others.map((block, index) => {
        if (block.type === "title") {
          return (
            <InlineText
              key={`title-${index}`}
              segments={block.segments}
              baseStyle={styles.title}
              boldStyle={styles.bold}
            />
          );
        }
        if (block.type === "bullet") {
          return (
            <View key={`bullet-${index}`} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <InlineText
                segments={block.segments}
                baseStyle={styles.body}
                boldStyle={styles.bold}
              />
            </View>
          );
        }
        return (
          <InlineText
            key={`p-${index}`}
            segments={block.segments}
            baseStyle={styles.body}
            boldStyle={styles.bold}
          />
        );
      })}

      {fields.length > 0 ? (
        <View style={styles.fieldCard}>
          {fields.map((block, index) => (
            <View
              key={`field-${block.label}-${index}`}
              style={[styles.fieldRow, index > 0 && styles.fieldRowBorder]}
            >
              <Text style={styles.fieldLabel}>{block.label}</Text>
              <InlineText
                segments={block.segments}
                baseStyle={styles.fieldValue}
                boldStyle={styles.bold}
              />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      gap: 10,
    },
    title: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
      lineHeight: 20,
    },
    body: {
      fontSize: 13,
      color: colors.text,
      lineHeight: 19,
      flexShrink: 1,
    },
    bold: {
      fontWeight: "700",
      color: colors.text,
    },
    bulletRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },
    bulletDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginTop: 7,
      backgroundColor: colors.brand,
      opacity: 0.85,
    },
    fieldCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface2,
      overflow: "hidden",
    },
    fieldRow: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 2,
    },
    fieldRowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    fieldLabel: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.4,
      textTransform: "uppercase",
      color: colors.text3,
    },
    fieldValue: {
      fontSize: 13,
      color: colors.text,
      lineHeight: 18,
    },
    userText: {
      fontSize: 14,
      color: "#fff",
      lineHeight: 20,
    },
  });
}
