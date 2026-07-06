import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ThemeColors, useThemeColors } from "@/constants/theme";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.wrap}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      {typeof title === "string" ? (
        <Text style={styles.title}>{title}</Text>
      ) : (
        title
      )}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      paddingBottom: 8,
    },
    eyebrow: {
      fontSize: 11,
      textTransform: "uppercase",
      letterSpacing: 1.2,
      fontWeight: "600",
      color: colors.text3,
      marginBottom: 6,
    },
    title: {
      fontSize: 28,
      fontWeight: "800",
      letterSpacing: -0.5,
      color: colors.text,
    },
    subtitle: {
      marginTop: 6,
      fontSize: 14,
      color: colors.text2,
    },
  });
}
