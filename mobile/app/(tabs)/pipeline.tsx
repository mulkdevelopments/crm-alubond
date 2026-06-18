import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ProjectCard } from "@/components/ProjectCard";
import { EmptyState, ScreenLoader } from "@/components/ScreenLoader";
import { colors } from "@/constants/theme";
import { deleteProject, listProjects, type ApiProject } from "@/lib/api/projects-api";
import { useAuth, canManageProjects } from "@/lib/auth/AuthContext";

export default function PipelineScreen() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const canManage = canManageProjects(user?.role);
  const isAdmin = user?.role === "ADMIN";

  const load = useCallback(async () => {
    if (!token) return;
    setProjects(await listProjects(token));
  }, [token]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try { await load(); } finally { setLoading(false); }
    })();
  }, [load]);

  async function onDelete(project: ApiProject) {
    if (!token || !isAdmin) return;
    Alert.alert(
      "Delete project",
      `Delete "${project.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void (async () => {
            await deleteProject(token, project.id);
            await load();
          })(),
        },
      ]
    );
  }

  if (loading) return <ScreenLoader label="Loading pipeline..." />;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      data={projects}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void (async () => {
          setRefreshing(true);
          try { await load(); } finally { setRefreshing(false); }
        })()} />
      }
      ListEmptyComponent={<EmptyState title="No projects" subtitle="Your assigned projects will show here." />}
      renderItem={({ item }) => (
        <ProjectCard
          project={item}
          onPress={() => router.push(`/project/${item.id}`)}
          trailing={
            <View style={styles.actions}>
              <Pressable onPress={() => router.push(`/project/${item.id}`)} style={styles.iconBtn}>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
              {isAdmin ? (
                <Pressable onPress={() => void onDelete(item)} style={styles.iconBtn}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              ) : null}
            </View>
          }
        />
      )}
      ListHeaderComponent={
        <View style={styles.header}>
          {canManage ? (
            <>
              <Text style={styles.hint}>Tap a project to view details and log field activity.</Text>
              <Pressable style={styles.createButton} onPress={() => router.push("/project/form")}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.createButtonText}>New project</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { marginBottom: 12 },
  hint: { marginBottom: 12, color: colors.textMuted, fontSize: 13 },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.brand,
  },
  createButtonText: { color: "#fff", fontWeight: "700" },
  actions: { flexDirection: "row", gap: 4 },
  iconBtn: { padding: 6 },
});
