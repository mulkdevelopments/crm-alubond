import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, Polyline, RadialGradient, Stop } from "react-native-svg";

import { Card } from "@/components/ui/Card";
import { ThemeColors, useThemeColors } from "@/constants/theme";

type KpiAccent = "brand" | "success" | "warning" | "danger";

const accentColors: Record<KpiAccent, string> = {
  brand: "#E30613",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#F43F5E",
};

// Matches web: h-28 w-28 orb offset -top-12 -right-12 with blur-2xl opacity-30
const GLOW_SIZE = 112;
const GLOW_OFFSET = -48;
const GLOW_RADIUS = GLOW_SIZE / 2;

export function KpiCard({
  label,
  value,
  hint,
  icon,
  accent = "brand",
  spark,
  onPress,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  accent?: KpiAccent;
  spark?: number[];
  onPress?: () => void;
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const glowColor = accentColors[accent];
  const gradientId = `kpi-glow-${accent}`;

  const body = (
    <>
      <View style={styles.glowOrb} pointerEvents="none">
        <Svg width={GLOW_SIZE} height={GLOW_SIZE}>
          <Defs>
            <RadialGradient id={gradientId} cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor={glowColor} stopOpacity={0.55} />
              <Stop offset="45%" stopColor={glowColor} stopOpacity={0.22} />
              <Stop offset="100%" stopColor={glowColor} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle
            cx={GLOW_RADIUS}
            cy={GLOW_RADIUS}
            r={GLOW_RADIUS}
            fill={`url(#${gradientId})`}
            opacity={0.3}
          />
        </Svg>
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.copy}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
            {hint ? <Text style={styles.hint}>{hint}</Text> : null}
          </View>
          {icon ? (
            <View style={[styles.iconWrap, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              {icon}
            </View>
          ) : null}
        </View>

        {spark && spark.length > 1 ? (
          <View style={styles.sparkRow}>
            <Sparkline values={spark} />
          </View>
        ) : null}
      </View>
    </>
  );

  return (
    <Card style={styles.card}>
      {onPress ? (
        <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => (pressed ? { opacity: 0.88 } : null)}>
          {body}
        </Pressable>
      ) : (
        body
      )}
    </Card>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const width = 80;
  const height = 28;
  const step = width / (values.length - 1);
  const points = values
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Polyline
        points={points}
        fill="none"
        stroke="#E30613"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      padding: 0,
      overflow: "hidden",
      width: "48%",
      position: "relative",
    },
    glowOrb: {
      position: "absolute",
      top: GLOW_OFFSET,
      right: GLOW_OFFSET,
      width: GLOW_SIZE,
      height: GLOW_SIZE,
      zIndex: 0,
    },
    content: {
      padding: 20,
      position: "relative",
      zIndex: 1,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },
    copy: {
      flex: 1,
      minWidth: 0,
    },
    label: {
      fontSize: 11,
      textTransform: "uppercase",
      letterSpacing: 1.4,
      fontWeight: "600",
      color: colors.text3,
    },
    value: {
      marginTop: 8,
      fontSize: 26,
      fontWeight: "800",
      letterSpacing: -0.6,
      color: colors.text,
    },
    hint: {
      marginTop: 4,
      fontSize: 11,
      color: colors.text3,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2,
    },
    sparkRow: {
      marginTop: 12,
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "flex-start",
    },
  });
}
