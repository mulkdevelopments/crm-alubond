import { StyleSheet, Text, View } from "react-native";

import { useThemeColors } from "@/constants/theme";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const colors = useThemeColors();
  const px = size === "sm" ? 32 : 40;

  return (
    <View
      style={[
        styles.avatar,
        {
          width: px,
          height: px,
          borderRadius: px / 2,
          backgroundColor: colors.surface2,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.text, { color: colors.text2, fontSize: size === "sm" ? 11 : 13 }]}>
        {initials(name || "?")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  text: {
    fontWeight: "700",
  },
});
