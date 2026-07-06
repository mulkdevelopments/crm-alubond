import { Pressable, StyleSheet, Text, View } from "react-native";
import { Hand } from "lucide-react-native";

import { ThemeColors, useThemeColors } from "@/constants/theme";

export function MapInteractionOverlay({
  active,
  onActivate,
  onDeactivate,
  bottomOffset = 0,
}: {
  active: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  bottomOffset?: number;
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  if (!active) {
    return (
      <>
        <View style={[styles.blockerTint, { backgroundColor: colors.surface, opacity: 0.35 }]} />
        <Pressable
          style={styles.blocker}
          onPress={onActivate}
          accessibilityLabel="Enable map interaction"
        >
          <View style={[styles.prompt, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Hand size={16} color={colors.text2} strokeWidth={2.2} />
            <Text style={[styles.promptText, { color: colors.text }]}>Tap to use map</Text>
          </View>
        </Pressable>
      </>
    );
  }

  return (
    <Pressable
      style={[styles.lockBtn, { bottom: 12 + bottomOffset, backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onDeactivate}
    >
      <Text style={[styles.lockText, { color: colors.text }]}>Lock map</Text>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    blockerTint: {
      ...StyleSheet.absoluteFill,
      zIndex: 9,
    },
    blocker: {
      ...StyleSheet.absoluteFill,
      zIndex: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    prompt: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 10,
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    promptText: {
      fontSize: 14,
      fontWeight: "600",
    },
    lockBtn: {
      position: "absolute",
      left: 12,
      zIndex: 30,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    lockText: {
      fontSize: 12,
      fontWeight: "600",
    },
  });
}
