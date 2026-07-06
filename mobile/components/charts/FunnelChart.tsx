import { StyleSheet, Text, View } from "react-native";

import { ThemeColors, useThemeColors } from "@/constants/theme";
import { formatAed } from "@/lib/utils";

const BAR_TONES = [
  "#D4D4D8",
  "#BAE6FD",
  "#DDD6FE",
  "#C7D2FE",
  "#FDE68A",
  "#FED7AA",
  "#99F6E4",
  "#FFC5C5",
];

export function FunnelChart({ data }: { data: { stage: string; count: number; value: number }[] }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const max = Math.max(...data.map((entry) => entry.value), 1);

  return (
    <View style={styles.wrap}>
      {data.map((entry, index) => {
        const width = Math.max(8, (entry.value / max) * 100);
        return (
          <View key={entry.stage} style={styles.row}>
            <Text style={[styles.stage, { color: colors.text2 }]} numberOfLines={1}>
              {entry.stage}
            </Text>
            <View style={[styles.track, { backgroundColor: colors.surface2 }]}>
              <View
                style={[
                  styles.fill,
                  { width: `${width}%`, backgroundColor: BAR_TONES[index % BAR_TONES.length] },
                ]}
              />
              <Text style={[styles.count, { color: colors.text }]}>
                {entry.count} {entry.count === 1 ? "project" : "projects"}
              </Text>
            </View>
            <Text style={[styles.value, { color: colors.text }]}>{formatAed(entry.value, true)}</Text>
          </View>
        );
      })}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      gap: 10,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    stage: {
      width: 120,
      fontSize: 12,
    },
    track: {
      flex: 1,
      height: 28,
      borderRadius: 8,
      overflow: "hidden",
      justifyContent: "center",
    },
    fill: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      borderRadius: 8,
    },
    count: {
      marginLeft: 10,
      fontSize: 11,
      fontWeight: "600",
    },
    value: {
      fontSize: 12,
      fontWeight: "600",
      minWidth: 72,
      textAlign: "right",
    },
  });
}
