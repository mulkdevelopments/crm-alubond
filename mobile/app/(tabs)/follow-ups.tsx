import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { AlertOctagon, Calendar, Clock } from "lucide-react-native";

import { FollowUpBucket } from "@/components/followups/FollowUpBucket";
import { FollowUpListCard } from "@/components/followups/FollowUpListCard";
import { ScreenLoader } from "@/components/ScreenLoader";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ThemeColors, useThemeColors } from "@/constants/theme";
import { listFollowUps, updateFollowUp, type ApiFollowUp } from "@/lib/api/followups-api";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  buildFollowUpInsights,
  computeStatusFromDueDate,
  groupFollowUps,
  relativeDueTime,
} from "@/lib/followups";

export default function FollowUpsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { token } = useAuth();

  const [items, setItems] = useState<ApiFollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!token) {
      setItems([]);
      return;
    }
    setError(null);
    setItems(await listFollowUps(token));
  }, [token]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        await loadData();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load follow-ups");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadData]);

  const grouped = useMemo(() => groupFollowUps(items), [items]);
  const insights = useMemo(() => buildFollowUpInsights(items), [items]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load follow-ups");
    } finally {
      setRefreshing(false);
    }
  }

  async function markDone(followUpId: string) {
    if (!token) return;
    try {
      await updateFollowUp(token, followUpId, { status: "Done" });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update follow-up");
    }
  }

  async function recoverFollowUp(followUpId: string, dueAt: string) {
    if (!token) return;
    try {
      await updateFollowUp(token, followUpId, { status: computeStatusFromDueDate(dueAt) });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to recover follow-up");
    }
  }

  if (loading) return <ScreenLoader label="Loading follow-ups..." />;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader
          eyebrow="Follow-up Engine"
          title="Stay relentless."
          subtitle={`You have ${grouped.overdue.length} overdue, ${grouped.today.length} due today, ${grouped.upcoming.length} upcoming and ${grouped.done.length} done.`}
        />

        <View style={styles.buckets}>
          <FollowUpBucket
            count={grouped.overdue.length}
            title="Overdue"
            subtitle="Action immediately"
            tone="danger"
            icon={<AlertOctagon size={18} color="#BE123C" strokeWidth={2.2} />}
          />
          <FollowUpBucket
            count={grouped.today.length}
            title="Due today"
            subtitle="Before end of day"
            tone="warning"
            icon={<Clock size={18} color="#B45309" strokeWidth={2.2} />}
          />
          <FollowUpBucket
            count={grouped.upcoming.length}
            title="Upcoming"
            subtitle="Next 7 days"
            tone="success"
            icon={<Calendar size={18} color="#047857" strokeWidth={2.2} />}
          />
        </View>

        <FollowUpListCard title="Overdue" items={grouped.overdue} tone="danger" onDone={markDone} />
        <FollowUpListCard title="Due today" items={grouped.today} tone="warning" onDone={markDone} />
        <FollowUpListCard title="Upcoming" items={grouped.upcoming} tone="success" onDone={markDone} />
        <FollowUpListCard
          title="Done"
          items={grouped.done}
          tone="success"
          doneMode
          onRecover={recoverFollowUp}
        />

        {grouped.overdue.length === 0 &&
        grouped.today.length === 0 &&
        grouped.upcoming.length === 0 &&
        grouped.done.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={[styles.emptyText, { color: colors.text3 }]}>
              No follow-ups yet. Tasks linked to your projects appear here.
            </Text>
          </Card>
        ) : null}

        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

        <Card>
          <CardHeader title="Live summary" subtitle="Real-time follow-up workload" />
          <View style={styles.summaryGrid}>
            <InsightTile label="Total" value={String(insights.total)} colors={colors} />
            <InsightTile label="Active" value={String(insights.activeCount)} colors={colors} />
            <InsightTile label="Done" value={String(insights.doneCount)} colors={colors} />
          </View>
          <View style={styles.completionWrap}>
            <View style={styles.completionRow}>
              <Text style={[styles.completionLabel, { color: colors.text3 }]}>Completion</Text>
              <Text style={[styles.completionValue, { color: colors.text }]}>
                {insights.completionRate}%
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.surface2 }]}>
              <View
                style={[styles.progressFill, { width: `${insights.completionRate}%`, backgroundColor: colors.success }]}
              />
            </View>
          </View>
        </Card>

        <Card>
          <CardHeader title="Channel split" subtitle="Open follow-ups by channel" />
          <View style={styles.splitList}>
            {insights.channels.map((entry) => (
              <View
                key={entry.channel}
                style={[styles.splitRow, { borderColor: colors.border, backgroundColor: colors.surface2 }]}
              >
                <Text style={[styles.splitLabel, { color: colors.text2 }]}>{entry.channel}</Text>
                <Text style={[styles.splitValue, { color: colors.text }]}>{entry.count}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card>
          <CardHeader title="Ownership" subtitle="Active follow-up distribution" />
          <View style={styles.ownerSection}>
            {insights.owners.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.text3 }]}>
                No active follow-ups assigned yet.
              </Text>
            ) : (
              insights.owners.map((entry) => (
                <View
                  key={entry.owner}
                  style={[styles.splitRow, { borderColor: colors.border, backgroundColor: colors.surface2 }]}
                >
                  <Text style={[styles.splitLabel, { color: colors.text2 }]} numberOfLines={1}>
                    {entry.owner}
                  </Text>
                  <Text style={[styles.splitValue, { color: colors.text }]}>{entry.count}</Text>
                </View>
              ))
            )}
            {insights.nextDue ? (
              <View style={[styles.nextDueBox, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                <Text style={[styles.nextDueLabel, { color: colors.text3 }]}>NEXT DUE</Text>
                <Text style={[styles.nextDueContact, { color: colors.text }]} numberOfLines={1}>
                  {insights.nextDue.contact}
                </Text>
                <Text style={[styles.nextDueMeta, { color: colors.text3 }]} numberOfLines={2}>
                  {relativeDueTime(insights.nextDue.dueAt)} · {insights.nextDue.projectName}
                </Text>
              </View>
            ) : null}
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

function InsightTile({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ThemeColors;
}) {
  return (
    <View style={[stylesStatic.insightTile, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[stylesStatic.insightLabel, { color: colors.text3 }]}>{label}</Text>
      <Text style={[stylesStatic.insightValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const stylesStatic = StyleSheet.create({
  insightTile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  insightLabel: {
    fontSize: 10,
  },
  insightValue: {
    marginTop: 2,
    fontSize: 18,
    fontWeight: "700",
  },
});

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 120,
      gap: 16,
    },
    buckets: {
      gap: 12,
    },
    emptyCard: {
      padding: 20,
    },
    emptyText: {
      fontSize: 14,
      lineHeight: 20,
    },
    error: {
      fontSize: 13,
      paddingHorizontal: 4,
    },
    summaryGrid: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      flexDirection: "row",
      gap: 8,
    },
    completionWrap: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    completionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    completionLabel: {
      fontSize: 12,
    },
    completionValue: {
      fontSize: 12,
      fontWeight: "700",
    },
    progressTrack: {
      marginTop: 6,
      height: 8,
      borderRadius: 999,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 999,
    },
    splitList: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 8,
    },
    splitRow: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    splitLabel: {
      flex: 1,
      fontSize: 12,
    },
    splitValue: {
      fontSize: 14,
      fontWeight: "700",
    },
    ownerSection: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 8,
    },
    nextDueBox: {
      marginTop: 4,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    nextDueLabel: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1,
    },
    nextDueContact: {
      marginTop: 4,
      fontSize: 14,
      fontWeight: "600",
    },
    nextDueMeta: {
      marginTop: 2,
      fontSize: 12,
      lineHeight: 16,
    },
  });
}
