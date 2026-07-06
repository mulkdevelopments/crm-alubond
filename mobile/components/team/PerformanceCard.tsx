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
  hideTeamPerformance = false,
  onPress,
  onPipelinePress,
  onVisitsPress,
}: {
  name: string;
  location: string;
  metrics: NodeMetrics;
  topPerformer: boolean;
  isYou?: boolean;
  online?: boolean;
  hideTeamPerformance?: boolean;
  onPress?: () => void;
  onPipelinePress?: () => void;
  onVisitsPress?: () => void;
}) {
  const assignedAccent = progressAccent(metrics.assignedAttainmentPct, "assigned");
  const teamAccent = progressAccent(metrics.attainmentPct, "team");

  const content = (
    <>
      <View style={styles.header}>
        <View style={styles.headerMain}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{nameInitials(name)}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            <View style={styles.locationRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: online === false ? "rgba(255,255,255,0.3)" : "#34d399" },
                ]}
              />
              <Text style={styles.location} numberOfLines={1}>
                {location || "Not set"}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.badges}>
          {isYou ? <Text style={styles.youBadge}>You</Text> : null}
          {topPerformer ? <Text style={styles.topBadge}>Top performer</Text> : null}
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Yearly target progress</Text>
          <Text style={styles.progressValue}>{formatAed(metrics.achievedAed, true)}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: assignedAccent,
                width: `${Math.min(100, Math.max(2, metrics.assignedAttainmentPct))}%`,
              },
            ]}
          />
        </View>
        <View style={styles.progressMeta}>
          <Text style={styles.progressMetaText}>{metrics.assignedAttainmentPct}%</Text>
          <Text style={styles.progressMetaText}>
            {formatAed(metrics.assignedTargetAed ?? metrics.targetAed, true)}
          </Text>
        </View>
      </View>

      {!hideTeamPerformance ? (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Team performance</Text>
            <Text style={styles.progressValue}>{formatAed(metrics.achievedAed, true)}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: teamAccent,
                  width: `${Math.min(100, Math.max(2, metrics.attainmentPct))}%`,
                },
              ]}
            />
          </View>
          <View style={styles.progressMeta}>
            <Text style={styles.progressMetaText}>{metrics.attainmentPct}%</Text>
            <Text style={styles.progressMetaText}>{formatAed(metrics.targetAed, true)}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.statsRow}>
        <Stat label="Pipeline" value={formatAed(metrics.pipelineAed, true)} onPress={onPipelinePress} />
        <Stat label="Visits/wk" value={String(metrics.visitsWeek)} onPress={onVisitsPress} />
        <Stat label="Convert" value={`${metrics.conversionPct}%`} />
      </View>
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
  avatarText: {
    color: "#8FB5FF",
    fontSize: 11,
    fontWeight: "700",
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  locationRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  location: {
    flex: 1,
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
  },
  badges: {
    alignItems: "flex-end",
    gap: 4,
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
  statsRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
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
