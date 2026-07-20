import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Building2, FolderKanban, RotateCcw, Trash2 } from "lucide-react-native";

import { EmptyState, ScreenLoader } from "@/components/ScreenLoader";
import { ThemeColors, useThemeColors } from "@/constants/theme";
import {
  listTrashedCustomers,
  permanentlyDeleteCustomer,
  restoreCustomer,
  type CustomerListItem,
} from "@/lib/api/customers-api";
import {
  listTrashedProjects,
  permanentlyDeleteProject,
  restoreProject,
  type ApiProject,
} from "@/lib/api/projects-api";
import { useAuth } from "@/lib/auth/AuthContext";
import { formatProjectValue } from "@/lib/utils";

type TrashTab = "projects" | "customers";

export default function TrashScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, token } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [tab, setTab] = useState<TrashTab>("projects");
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    const [projectRows, customerRows] = await Promise.all([
      listTrashedProjects(token),
      listTrashedCustomers(token),
    ]);
    setProjects(projectRows);
    setCustomers(customerRows);
  }, [token]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load trash.");
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh trash.");
    } finally {
      setRefreshing(false);
    }
  }

  async function onRestoreProject(project: ApiProject) {
    if (!token) return;
    setBusyId(project.id);
    try {
      await restoreProject(token, project.id);
      setProjects((prev) => prev.filter((item) => item.id !== project.id));
    } catch (err) {
      Alert.alert("Restore failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function onRestoreCustomer(customer: CustomerListItem) {
    if (!token) return;
    setBusyId(customer.id);
    try {
      await restoreCustomer(token, customer.id);
      setCustomers((prev) => prev.filter((item) => item.id !== customer.id));
    } catch (err) {
      Alert.alert("Restore failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  function onHardDeleteProject(project: ApiProject) {
    if (!token || !isAdmin) return;
    Alert.alert(
      "Delete forever",
      `Permanently delete "${project.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete forever",
          style: "destructive",
          onPress: () =>
            void (async () => {
              setBusyId(project.id);
              try {
                await permanentlyDeleteProject(token, project.id);
                setProjects((prev) => prev.filter((item) => item.id !== project.id));
              } catch (err) {
                Alert.alert("Delete failed", err instanceof Error ? err.message : "Please try again.");
              } finally {
                setBusyId(null);
              }
            })(),
        },
      ],
    );
  }

  function onHardDeleteCustomer(customer: CustomerListItem) {
    if (!token || !isAdmin) return;
    Alert.alert(
      "Delete forever",
      `Permanently delete customer "${customer.name}"? This clears the customer field on matching projects and cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete forever",
          style: "destructive",
          onPress: () =>
            void (async () => {
              setBusyId(customer.id);
              try {
                await permanentlyDeleteCustomer(token, customer.id);
                setCustomers((prev) => prev.filter((item) => item.id !== customer.id));
              } catch (err) {
                Alert.alert("Delete failed", err instanceof Error ? err.message : "Please try again.");
              } finally {
                setBusyId(null);
              }
            })(),
        },
      ],
    );
  }

  if (loading) return <ScreenLoader label="Loading trash..." />;

  const empty = tab === "projects" ? projects.length === 0 : customers.length === 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
    >
      <Text style={styles.title}>Trash</Text>
      <Text style={styles.subtitle}>
        Soft-deleted projects and customers. Restore anytime
        {isAdmin ? " — permanent delete is admin-only." : "."}
      </Text>

      <View style={styles.tabs}>
        <Pressable
          style={[
            styles.tab,
            { borderColor: colors.border, backgroundColor: tab === "projects" ? colors.brand : colors.surface2 },
          ]}
          onPress={() => setTab("projects")}
        >
          <FolderKanban size={14} color={tab === "projects" ? "#fff" : colors.text2} strokeWidth={2.2} />
          <Text style={{ color: tab === "projects" ? "#fff" : colors.text2, fontSize: 12, fontWeight: "700" }}>
            Projects ({projects.length})
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.tab,
            { borderColor: colors.border, backgroundColor: tab === "customers" ? colors.brand : colors.surface2 },
          ]}
          onPress={() => setTab("customers")}
        >
          <Building2 size={14} color={tab === "customers" ? "#fff" : colors.text2} strokeWidth={2.2} />
          <Text style={{ color: tab === "customers" ? "#fff" : colors.text2, fontSize: 12, fontWeight: "700" }}>
            Customers ({customers.length})
          </Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {empty ? (
        <EmptyState title={tab === "projects" ? "No trashed projects" : "No trashed customers"} />
      ) : tab === "projects" ? (
        <View style={styles.list}>
          {projects.map((project) => (
            <View key={project.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
                {project.name}
              </Text>
              <Text style={[styles.meta, { color: colors.text3 }]}>
                {[project.city, project.country].filter(Boolean).join(", ")}
                {project.developer ? ` · ${project.developer}` : ""}
              </Text>
              <Text style={[styles.meta, { color: colors.text3 }]}>
                {project.stage} · {formatProjectValue(project, user?.role, true)}
              </Text>
              <Text style={[styles.meta, { color: colors.text3 }]}>
                Trashed{" "}
                {project.deletedAt ? new Date(project.deletedAt).toLocaleString() : "—"}
                {project.deletedByName ? ` by ${project.deletedByName}` : ""}
              </Text>
              <View style={styles.actions}>
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: colors.surface2 }]}
                  disabled={busyId === project.id}
                  onPress={() => void onRestoreProject(project)}
                >
                  <RotateCcw size={14} color={colors.brand} strokeWidth={2.2} />
                  <Text style={[styles.actionText, { color: colors.brand }]}>Restore</Text>
                </Pressable>
                {isAdmin ? (
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: "rgba(244, 63, 94, 0.08)" }]}
                    disabled={busyId === project.id}
                    onPress={() => onHardDeleteProject(project)}
                  >
                    <Trash2 size={14} color={colors.danger} strokeWidth={2.2} />
                    <Text style={[styles.actionText, { color: colors.danger }]}>Delete forever</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.list}>
          {customers.map((customer) => (
            <View key={customer.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
                {customer.name}
              </Text>
              <Text style={[styles.meta, { color: colors.text3 }]}>
                {customer.projectCount} active project{customer.projectCount === 1 ? "" : "s"} still reference this name
              </Text>
              <Text style={[styles.meta, { color: colors.text3 }]}>
                Trashed{" "}
                {customer.deletedAt ? new Date(customer.deletedAt).toLocaleString() : "—"}
                {customer.deletedByName ? ` by ${customer.deletedByName}` : ""}
              </Text>
              <View style={styles.actions}>
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: colors.surface2 }]}
                  disabled={busyId === customer.id}
                  onPress={() => void onRestoreCustomer(customer)}
                >
                  <RotateCcw size={14} color={colors.brand} strokeWidth={2.2} />
                  <Text style={[styles.actionText, { color: colors.brand }]}>Restore</Text>
                </Pressable>
                {isAdmin ? (
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: "rgba(244, 63, 94, 0.08)" }]}
                    disabled={busyId === customer.id}
                    onPress={() => onHardDeleteCustomer(customer)}
                  >
                    <Trash2 size={14} color={colors.danger} strokeWidth={2.2} />
                    <Text style={[styles.actionText, { color: colors.danger }]}>Delete forever</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, paddingBottom: 120, gap: 12 },
    title: { fontSize: 22, fontWeight: "700", color: colors.text },
    subtitle: { fontSize: 13, color: colors.text3, marginTop: -4 },
    tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    tab: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    error: { color: colors.danger, fontSize: 13 },
    list: { gap: 10 },
    card: {
      borderWidth: 1,
      borderRadius: 16,
      padding: 14,
      gap: 4,
    },
    name: { fontSize: 15, fontWeight: "700" },
    meta: { fontSize: 12 },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
    actionBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    actionText: { fontSize: 12, fontWeight: "600" },
  });
}
