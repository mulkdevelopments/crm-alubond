import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { EmptyState, ScreenLoader } from "@/components/ScreenLoader";
import { colors } from "@/constants/theme";
import { listFollowUps, updateFollowUp, type ApiFollowUp } from "@/lib/api/followups-api";
import { useAuth } from "@/lib/auth/AuthContext";

const FILTERS = ["All", "Overdue", "Due today", "Upcoming", "Done"] as const;

export default function FollowUpsScreen() {
  const { token } = useAuth();
  const [items, setItems] = useState<ApiFollowUp[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setItems(await listFollowUps(token));
  }, [token]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try { await load(); } finally { setLoading(false); }
    })();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === "All") return items;
    return items.filter((item) => item.status === filter);
  }, [items, filter]);

  async function markDone(item: ApiFollowUp) {
    if (!token) return;
    await updateFollowUp(token, item.id, { status: "Done" });
    await load();
  }

  if (loading) return <ScreenLoader label="Loading follow-ups..." />;

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        {FILTERS.map((entry) => (
          <Pressable
            key={entry}
            onPress={() => setFilter(entry)}
            style={[styles.chip, filter === entry && styles.chipActive]}
          >
            <Text style={[styles.chipText, filter === entry && styles.chipTextActive]}>{entry}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void (async () => {
            setRefreshing(true);
            try { await load(); } finally { setRefreshing(false); }
          })()} />
        }
        ListEmptyComponent={<EmptyState title="No follow-ups" subtitle="Tasks linked to your projects appear here." />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.project}>{item.projectName}</Text>
            <Text style={styles.contact}>{item.contact} · {item.channel}</Text>
            <Text style={styles.note}>{item.note}</Text>
            <View style={styles.row}>
              <Text style={[styles.status, statusColor(item.status)]}>{item.status}</Text>
              {item.status !== "Done" ? (
                <Pressable onPress={() => void markDone(item)}>
                  <Text style={styles.done}>Mark done</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        )}
      />
    </View>
  );
}

function statusColor(status: ApiFollowUp["status"]) {
  switch (status) {
    case "Overdue":
      return { color: colors.danger };
    case "Due today":
      return { color: colors.warning };
    case "Done":
      return { color: colors.success };
    default:
      return { color: colors.brand };
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 16, paddingBottom: 0 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontSize: 12, color: colors.textMuted },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  project: { fontSize: 15, fontWeight: "700", color: colors.text },
  contact: { marginTop: 4, fontSize: 12, color: colors.textMuted },
  note: { marginTop: 8, fontSize: 13, color: colors.text },
  row: { marginTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  status: { fontSize: 12, fontWeight: "700" },
  done: { color: colors.brand, fontWeight: "600", fontSize: 13 },
});
