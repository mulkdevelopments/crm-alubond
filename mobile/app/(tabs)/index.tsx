import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { EmptyState, ScreenLoader } from "@/components/ScreenLoader";
import { colors } from "@/constants/theme";
import { listProjects, type ApiProject } from "@/lib/api/projects-api";
import { useAuth } from "@/lib/auth/AuthContext";
import { formatAed } from "@/lib/utils";

export default function HomeScreen() {
  const { token, user } = useAuth();
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const data = await listProjects(token);
    setProjects(data);
  }, [token]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        await load();
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const stats = useMemo(() => {
    const open = projects.filter((p) => p.stage !== "Won" && p.stage !== "Lost");
    const pipelineValue = open.reduce((sum, p) => sum + p.valueAed, 0);
    const won = projects.filter((p) => p.stage === "Won").length;
    return { total: projects.length, open: open.length, pipelineValue, won };
  }, [projects]);

  if (loading) return <ScreenLoader label="Loading dashboard..." />;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void (async () => {
          setRefreshing(true);
          try { await load(); } finally { setRefreshing(false); }
        })()} />
      }
    >
      <Text style={styles.greeting}>
        Hello {user?.firstName ?? user?.email?.split("@")[0] ?? "there"}
      </Text>
      <Text style={styles.role}>{user?.role?.replace("_", " ")}</Text>

      <View style={styles.grid}>
        <StatCard label="Projects" value={String(stats.total)} />
        <StatCard label="Open deals" value={String(stats.open)} />
        <StatCard label="Pipeline" value={formatAed(stats.pipelineValue, true)} />
        <StatCard label="Won" value={String(stats.won)} />
      </View>

      <Text style={styles.section}>Recent projects</Text>
      {projects.slice(0, 5).map((project) => (
        <View key={project.id} style={styles.row}>
          <Text style={styles.rowTitle}>{project.name}</Text>
          <Text style={styles.rowMeta}>{project.stage} · {formatAed(project.valueAed, true)}</Text>
        </View>
      ))}
      {projects.length === 0 ? <EmptyState title="No projects yet" subtitle="Assigned projects will appear here." /> : null}
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  greeting: { fontSize: 24, fontWeight: "800", color: colors.text },
  role: { marginTop: 4, color: colors.textMuted, fontSize: 13, textTransform: "capitalize" },
  grid: { marginTop: 20, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    width: "48%",
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  cardLabel: { fontSize: 12, color: colors.textMuted },
  cardValue: { marginTop: 6, fontSize: 18, fontWeight: "700", color: colors.text },
  section: { marginTop: 24, marginBottom: 10, fontSize: 16, fontWeight: "700", color: colors.text },
  row: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  rowTitle: { fontSize: 14, fontWeight: "600", color: colors.text },
  rowMeta: { marginTop: 4, fontSize: 12, color: colors.textMuted },
});
