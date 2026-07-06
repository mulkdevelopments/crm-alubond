import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { RotateCcw, Search, ShieldAlert, Trash2, UserPlus, X } from "lucide-react-native";

import { ScreenLoader } from "@/components/ScreenLoader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ThemeColors, useThemeColors } from "@/constants/theme";
import {
  deleteAccessRequest,
  dismissAccessRequest,
  listAccessRequests,
  restoreAccessRequest,
  type AccessRequestFilter,
  type AccessRequestItem,
} from "@/lib/api/access-requests-api";
import { useAuth } from "@/lib/auth/AuthContext";

const FILTERS: Array<{ value: AccessRequestFilter; label: string }> = [
  { value: "PENDING", label: "Pending" },
  { value: "DISMISSED", label: "Dismissed" },
  { value: "ALL", label: "All" },
];

export default function AccessRequestsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { token, user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [filter, setFilter] = useState<AccessRequestFilter>("PENDING");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<AccessRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AccessRequestItem | null>(null);

  const loadData = useCallback(
    async (nextFilter = filter) => {
      if (!token || !isAdmin) return;
      setError(null);
      setItems(await listAccessRequests(token, nextFilter));
    },
    [token, isAdmin, filter],
  );

  useEffect(() => {
    void (async () => {
      if (!isAdmin) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        await loadData(filter);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load access requests");
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdmin, filter, loadData]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => {
      const haystack = `${item.firstName} ${item.lastName} ${item.email} ${item.message}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [items, searchQuery]);

  const pendingCount = useMemo(
    () => items.filter((item) => item.status === "PENDING").length,
    [items],
  );

  async function onRefresh() {
    setRefreshing(true);
    try {
      await loadData(filter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load access requests");
    } finally {
      setRefreshing(false);
    }
  }

  async function onDismiss(requestId: string) {
    if (!token) return;
    setActionId(requestId);
    setError(null);
    try {
      await dismissAccessRequest(token, requestId);
      await loadData(filter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to dismiss request");
    } finally {
      setActionId(null);
    }
  }

  async function onRestore(requestId: string) {
    if (!token) return;
    setActionId(requestId);
    setError(null);
    try {
      await restoreAccessRequest(token, requestId);
      await loadData(filter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore request");
    } finally {
      setActionId(null);
    }
  }

  async function confirmDelete() {
    if (!token || !deleteTarget) return;
    setActionId(deleteTarget.id);
    setError(null);
    try {
      await deleteAccessRequest(token, deleteTarget.id);
      setDeleteTarget(null);
      await loadData(filter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete request");
    } finally {
      setActionId(null);
    }
  }

  function openCreateUser(item: AccessRequestItem) {
    router.push({
      pathname: "/users/form",
      params: {
        firstName: item.firstName,
        lastName: item.lastName,
        email: item.email,
        accessRequestId: item.id,
      },
    });
  }

  if (!isAdmin) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <PageHeader title="Access requests" subtitle="Admin only" />
          <Card style={styles.accessCard}>
            <View style={styles.accessRow}>
              <ShieldAlert size={20} color="#d97706" strokeWidth={2.2} />
              <View style={styles.accessText}>
                <Text style={[styles.accessTitle, { color: colors.text }]}>Admin access required</Text>
                <Text style={[styles.accessBody, { color: colors.text2 }]}>
                  Only admins can review access requests.
                </Text>
              </View>
            </View>
          </Card>
        </ScrollView>
      </View>
    );
  }

  if (loading) return <ScreenLoader label="Loading access requests..." />;

  const subtitle = searchQuery.trim()
    ? `${filteredItems.length} of ${items.length} shown`
    : filter === "PENDING"
      ? `${pendingCount} pending`
      : `${items.length} shown`;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader
          eyebrow="Access Control"
          title="Access requests"
          subtitle="Review sign-up requests submitted from the login page."
        />

        <View style={styles.filtersRow}>
          {FILTERS.map(({ value, label }) => {
            const active = filter === value;
            return (
              <Pressable
                key={value}
                style={[
                  styles.filterPill,
                  {
                    borderColor: active ? colors.brand : colors.border,
                    backgroundColor: active ? "rgba(227, 6, 19, 0.1)" : colors.surface2,
                  },
                ]}
                onPress={() => setFilter(value)}
              >
                <Text style={[styles.filterPillText, { color: active ? colors.brand : colors.text2 }]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.searchWrap, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
          <Search size={16} color={colors.text3} strokeWidth={2.2} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search name, email, or message"
            placeholderTextColor={colors.text3}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>

        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

        <Card>
          <CardHeader title="Incoming requests" subtitle={subtitle} />
          <View style={styles.list}>
            {filteredItems.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.text3 }]}>
                {searchQuery.trim()
                  ? "No access requests match your search."
                  : "No access requests in this view."}
              </Text>
            ) : (
              filteredItems.map((item) => {
                const fullName = `${item.firstName} ${item.lastName}`.trim();
                const busy = actionId === item.id;
                return (
                  <View
                    key={item.id}
                    style={[styles.requestCard, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  >
                    <View style={styles.requestMain}>
                      <View style={styles.requestTop}>
                        <Text style={[styles.requestName, { color: colors.text }]} numberOfLines={1}>
                          {fullName || item.email}
                        </Text>
                        <Badge tone={item.status === "PENDING" ? "warning" : "neutral"}>
                          {item.status === "PENDING" ? "Pending" : "Dismissed"}
                        </Badge>
                      </View>
                      <Text style={[styles.requestEmail, { color: colors.text2 }]}>{item.email}</Text>
                      <Text style={[styles.requestMessage, { color: colors.text3 }]}>
                        {item.message?.trim() ? item.message : "No message provided."}
                      </Text>
                      <Text style={[styles.requestMeta, { color: colors.text3 }]}>
                        Submitted {new Date(item.createdAt).toLocaleString("en-AE")}
                        {item.reviewedAt
                          ? ` · Reviewed ${new Date(item.reviewedAt).toLocaleString("en-AE")}`
                          : ""}
                      </Text>
                    </View>

                    <View style={styles.actions}>
                      {item.status === "PENDING" ? (
                        <>
                          <Pressable
                            style={[styles.primaryAction, { backgroundColor: colors.brand }]}
                            onPress={() => openCreateUser(item)}
                          >
                            <UserPlus size={14} color="#FFFFFF" strokeWidth={2.2} />
                            <Text style={styles.primaryActionText}>Create user</Text>
                          </Pressable>
                          <Pressable
                            style={[styles.secondaryAction, { borderColor: colors.border, backgroundColor: colors.surface2 }]}
                            disabled={busy}
                            onPress={() => void onDismiss(item.id)}
                          >
                            <X size={14} color={colors.text2} strokeWidth={2.2} />
                            <Text style={[styles.secondaryActionText, { color: colors.text2 }]}>
                              {busy ? "Dismissing..." : "Dismiss"}
                            </Text>
                          </Pressable>
                        </>
                      ) : (
                        <Pressable
                          style={[styles.secondaryAction, { borderColor: colors.border, backgroundColor: colors.surface2 }]}
                          disabled={busy}
                          onPress={() => void onRestore(item.id)}
                        >
                          <RotateCcw size={14} color={colors.text} strokeWidth={2.2} />
                          <Text style={[styles.secondaryActionText, { color: colors.text }]}>
                            {busy ? "Restoring..." : "Restore"}
                          </Text>
                        </Pressable>
                      )}
                      <Pressable
                        style={[styles.secondaryAction, { borderColor: colors.border, backgroundColor: colors.surface2 }]}
                        disabled={busy}
                        onPress={() => setDeleteTarget(item)}
                      >
                        <Trash2 size={14} color={colors.danger} strokeWidth={2.2} />
                        <Text style={[styles.secondaryActionText, { color: colors.danger }]}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </Card>
      </ScrollView>

      <Modal
        visible={Boolean(deleteTarget)}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Delete access request</Text>
              <Pressable
                style={[styles.closeButton, { backgroundColor: colors.surface2 }]}
                onPress={() => setDeleteTarget(null)}
              >
                <X size={16} color={colors.text3} strokeWidth={2.2} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <Text style={[styles.modalCopy, { color: colors.text2 }]}>
                Delete this access request permanently?
              </Text>
              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.secondaryAction, { borderColor: colors.border, backgroundColor: colors.surface2 }]}
                  onPress={() => setDeleteTarget(null)}
                  disabled={Boolean(actionId)}
                >
                  <Text style={[styles.secondaryActionText, { color: colors.text }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryAction, { backgroundColor: colors.brand }, Boolean(actionId) && styles.disabled]}
                  onPress={() => void confirmDelete()}
                  disabled={Boolean(actionId)}
                >
                  <Text style={styles.primaryActionText}>{actionId ? "Deleting..." : "Delete"}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(_colors: ThemeColors) {
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
    accessCard: {
      padding: 20,
    },
    accessRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },
    accessText: {
      flex: 1,
      gap: 4,
    },
    accessTitle: {
      fontSize: 18,
      fontWeight: "700",
    },
    accessBody: {
      fontSize: 14,
      lineHeight: 20,
    },
    filtersRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    filterPill: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    filterPillText: {
      fontSize: 13,
      fontWeight: "600",
    },
    searchWrap: {
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
    },
    error: {
      fontSize: 13,
    },
    list: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 12,
    },
    emptyText: {
      fontSize: 14,
      lineHeight: 20,
    },
    requestCard: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      gap: 12,
    },
    requestMain: {
      gap: 6,
    },
    requestTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    requestName: {
      flex: 1,
      fontSize: 15,
      fontWeight: "700",
    },
    requestEmail: {
      fontSize: 13,
    },
    requestMessage: {
      fontSize: 13,
      lineHeight: 18,
    },
    requestMeta: {
      fontSize: 11,
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      justifyContent: "flex-end",
    },
    primaryAction: {
      height: 32,
      borderRadius: 10,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    primaryActionText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "700",
    },
    secondaryAction: {
      height: 32,
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    secondaryActionText: {
      fontSize: 12,
      fontWeight: "600",
    },
    disabled: {
      opacity: 0.6,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "center",
      padding: 16,
    },
    modalCard: {
      borderRadius: 16,
      borderWidth: 1,
      overflow: "hidden",
    },
    modalHeader: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    modalTitle: {
      fontSize: 15,
      fontWeight: "700",
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    modalBody: {
      padding: 16,
      gap: 16,
    },
    modalCopy: {
      fontSize: 14,
      lineHeight: 20,
    },
    modalActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 8,
    },
  });
}
