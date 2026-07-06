import { StyleSheet, Text, View } from "react-native";
import Svg, { G, Path } from "react-native-svg";

import { ThemeColors, useThemeColors } from "@/constants/theme";

const COLORS = ["#E30613", "#F59E0B", "#3B82F6", "#8B5CF6", "#10B981", "#EC4899", "#6E6E76"];

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
) {
  const startOuter = polarToCartesian(cx, cy, outerRadius, startAngle);
  const endOuter = polarToCartesian(cx, cy, outerRadius, endAngle);
  const startInner = polarToCartesian(cx, cy, innerRadius, endAngle);
  const endInner = polarToCartesian(cx, cy, innerRadius, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
    "Z",
  ].join(" ");
}

export function LossDonut({ data }: { data: { reason: string; value: number }[] }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const innerRadius = 55;
  const outerRadius = 80;
  const total = data.reduce((sum, entry) => sum + entry.value, 0) || 1;

  let cursor = 0;
  const slices = data.map((entry, index) => {
    const angle = (entry.value / total) * 360;
    const startAngle = cursor;
    const endAngle = cursor + Math.min(angle, 359.999);
    cursor += angle;
    const path =
      angle >= 359.999
        ? [
            describeArc(cx, cy, innerRadius, outerRadius, 0, 179.999),
            describeArc(cx, cy, innerRadius, outerRadius, 180, 359.999),
          ].join(" ")
        : describeArc(cx, cy, innerRadius, outerRadius, startAngle, endAngle);
    return {
      ...entry,
      color: COLORS[index % COLORS.length],
      path,
    };
  });

  const top = data[0];

  return (
    <View style={styles.wrap}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <G>
            {slices.map((slice, index) => (
              <Path
                key={`${slice.reason}-${index}`}
                d={slice.path}
                fill={slice.color}
                stroke={colors.surface}
                strokeWidth={2}
              />
            ))}
          </G>
        </Svg>
        <View style={styles.centerLabel} pointerEvents="none">
          <Text style={[styles.centerValue, { color: colors.text }]}>
            {top?.value ?? 0}
            <Text style={[styles.centerSuffix, { color: colors.text3 }]}>%</Text>
          </Text>
          <Text style={[styles.centerCaption, { color: colors.text3 }]}>Top reason</Text>
        </View>
      </View>

      <View style={styles.legend}>
        {data.map((entry, index) => (
          <View key={entry.reason} style={styles.legendRow}>
            <View style={styles.legendLeft}>
              <View style={[styles.dot, { backgroundColor: COLORS[index % COLORS.length] }]} />
              <Text style={[styles.reason, { color: colors.text2 }]} numberOfLines={1}>
                {entry.reason}
              </Text>
            </View>
            <Text style={[styles.share, { color: colors.text }]}>{entry.value}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    centerLabel: {
      ...StyleSheet.absoluteFill,
      alignItems: "center",
      justifyContent: "center",
    },
    centerValue: {
      fontSize: 30,
      fontWeight: "800",
      letterSpacing: -0.5,
    },
    centerSuffix: {
      fontSize: 16,
    },
    centerCaption: {
      marginTop: 4,
      fontSize: 10,
      textTransform: "uppercase",
      letterSpacing: 1.2,
    },
    legend: {
      flex: 1,
      gap: 8,
      minWidth: 0,
    },
    legendRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    legendLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      minWidth: 0,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 999,
    },
    reason: {
      flex: 1,
      fontSize: 12,
    },
    share: {
      fontSize: 12,
      fontWeight: "700",
    },
  });
}
