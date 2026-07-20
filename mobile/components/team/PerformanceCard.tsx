import { Pressable, StyleSheet, Text, View } from "react-native";

import { nameInitials, progressAccent, type NodeMetrics } from "@/lib/team-performance";
import { formatAed } from "@/lib/utils";

export function PerformanceCard({
  name,
  location,
  metrics,
  topPerformer,
  isYou = false,
  online,
  presenceLabel,
  role,
  note,
  breakdown,
  hideTeamPerformance = false,
  onPress,
  onWonPress,
  onPipelinePress,
  onVisitsPress,
}: {
  name: string;
  location: string;
  metrics: NodeMetrics;
  topPerformer: boolean;
  isYou?: boolean;
  online?: boolean;
  presenceLabel?: string;
  role?: string;
  note?: string;
  breakdown?: { fromPeople: number; self: number };
  /** @deprecated dual bars removed; kept for call-site compatibility */
  hideTeamPerformance?: boolean;
  onPress?: () => void;
  onWonPress?: () => void;
  onPipelinePress?: () => void;
  onVisitsPress?: () => void;
}) {
  void hideTeamPerformance;
  const target = metrics.assignedTargetAed ?? metrics.targetAed;
  const pct =
    metrics.assignedTargetAed != null ? metrics.assignedAttainmentPct : metrics.attainmentPct;
  const accent = progressAccent(pct);

  const content = (
    <>
      <View style={styles.header}>
        <View style={styles.headerMain}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{nameInitials(name)}</Text>
            </View>
            {online !== undefined ? (
              <View
                style={[
                  styles.avatarDot,
                  { backgroundColor: online ? "#34d399" : "rgba(255,255,255,0.3)" },
                ]}
              />
            ) : null}
          </View>
          <View style={styles.headerText}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {name}
              </Text>
              {role ? <Text style={styles.roleBadge}>{role}</Text> : null}
              {isYou ? <Text style={styles.youBadge}>You</Text> : null}
            </View>
            {presenceLabel ? (
              <Text style={[styles.presence, { color: online ? "#6ee7b7" : "rgba(255,255,255,0.55)" }]} numberOfLines={1}>
                {presenceLabel}
              </Text>
            ) : null}
            <Text style={styles.location} numberOfLines={1}>
              {location || "Not set"}
            </Text>
          </View>
        </View>
        {topPerformer ? <Text style={styles.topBadge}>Top</Text> : null}
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Won</Text>
          {onWonPress ? (
            <Pressable onPress={onWonPress} hitSlop={8}>
              <Text style={[styles.progressValue, styles.linkValue]}>{formatAed(metrics.achievedAed, true)}</Text>
            </Pressable>
          ) : (
            <Text style={styles.progressValue}>{formatAed(metrics.achievedAed, true)}</Text>
          )}
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: accent,
                width: `${Math.min(100, Math.max(2, pct))}%`,
              },
            ]}
          />
        </View>
        <View style={styles.progressMeta}>
          <Text style={styles.progressMetaText}>{pct}% of yearly target</Text>
          <Text style={styles.progressMetaText}>{formatAed(target, true)}</Text>
        </View>
      </View>

      {breakdown ? (
        <View style={styles.breakdownRow}>
          <View style={styles.breakdownCell}>
            <Text style={styles.breakdownLabel}>Self</Text>
            <Text style={styles.breakdownValue}>{formatAed(breakdown.self, true)}</Text>
          </View>
          <View style={styles.breakdownCell}>
            <Text style={styles.breakdownLabel}>From people</Text>
            <Text style={styles.breakdownValue}>{formatAed(breakdown.fromPeople, true)}</Text>
          </View>
        </View>
      ) : null}

      {note ? <Text style={styles.note}>{note}</Text> : null}

      <View style={styles.statsRow}>
        <Stat label="Pipeline" value={formatAed(metrics.pipelineAed, true)} onPress={onPipelinePress} />
        <Stat label="Visits/wk" value={String(metrics.visitsWeek)} onPress={onVisitsPress} />
        <Stat label="Convert" value={`${metrics.conversionPct}%`} />
      </View>

      {onPress ? (
        <Text style={styles.openHint}>Open team →</Text>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable style={styles.card} onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return <View style={styles.card}>{content}</View>;
}

function Stat({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <Pressable style={styles.statButton} onPress={onPress}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#0C1017",
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  headerMain: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  avatarWrap: {
    width: 36,
    height: 36,
    position: "relative",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: "#121A26",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarDot: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 10,
    height: 10,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#0C1017",
  },
  avatarText: {
    color: "#8FB5FF",
    fontSize: 11,
    fontWeight: "700",
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  name: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    maxWidth: "70%",
  },
  roleBadge: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: "hidden",
  },
  presence: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
  },
  location: {
    marginTop: 2,
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
  },
  youBadge: {
    color: "#fdba74",
    fontSize: 10,
    borderWidth: 1,
    borderColor: "rgba(249,115,22,0.4)",
    backgroundColor: "rgba(249,115,22,0.1)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: "hidden",
  },
  topBadge: {
    color: "#6ee7b7",
    fontSize: 10,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.4)",
    backgroundColor: "rgba(16,185,129,0.1)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: "hidden",
  },
  progressSection: {
    marginTop: 12,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  progressLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  progressValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  linkValue: {
    textDecorationLine: "underline",
  },
  progressTrack: {
    marginTop: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  progressMeta: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressMetaText: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 10,
  },
  breakdownRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
  },
  breakdownCell: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  breakdownWarn: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
  },
  breakdownLabel: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
  },
  breakdownWarnText: {
    color: "#fde68a",
  },
  breakdownValue: {
    marginTop: 2,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  note: {
    marginTop: 8,
    color: "#fde68a",
    fontSize: 11,
  },
  statsRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
  },
  openHint: {
    marginTop: 12,
    textAlign: "right",
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontWeight: "600",
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statButton: {
    flex: 1,
    alignItems: "center",
    borderRadius: 8,
    paddingVertical: 6,
  },
  statLabel: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  statValue: {
    marginTop: 4,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
