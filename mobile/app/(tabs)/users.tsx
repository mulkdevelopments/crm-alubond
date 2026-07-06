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
import { CalendarDays, Pencil, Search, ShieldAlert, Trash2, UserPlus, X } from "lucide-react-native";

import { ScreenLoader } from "@/components/ScreenLoader";
import { UserAttendanceModal } from "@/components/users/UserAttendanceModal";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { FormSelect } from "@/components/ui/FormSelect";
import { PageHeader } from "@/components/ui/PageHeader";
import { ThemeColors, useThemeColors } from "@/constants/theme";
import {
  deleteUser,
  listRegionalManagers,
  listUsers,
  type ManagerOption,
  type Role,
  type UserListItem,
} from "@/lib/api/auth-api";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  filterUsers,
  formatLastSeen,
  formatOperationLocations,
  getReportsToLabel,
  isUserLive,
  roleBadgeTone,
  USER_ROLES,
  USERS_PAGE_SIZE,
  type UserStatusFilter,
} from "@/lib/users";
import { formatAed } from "@/lib/utils";

export default function UsersScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { token, user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [items, setItems] = useState<UserListItem[]>([]);
  const [managers, setManagers] = useState<UserListItem[]>([]);
  const [regionalManagers, setRegionalManagers] = useState<ManagerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | Role>("ALL");
  const [regionalManagerFilter, setRegionalManagerFilter] = useState("ALL");
  const [managerFilter, setManagerFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<UserListItem | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [attendanceUser, setAttendanceUser] = useState<UserListItem | null>(null);

  const loadData = useCallback(async () => {
    if (!token || !isAdmin) return;
    const [usersData, regionalManagersData] = await Promise.all([
      listUsers(token),
      listRegionalManagers(token),
    ]);
    setItems(usersData);
    setManagers(usersData.filter((entry) => entry.role === "MANAGER"));
    setRegionalManagers(regionalManagersData);
  }, [token, isAdmin]);

  useEffect(() => {
    void (async () => {
      if (!isAdmin) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        await loadData();
      } catch {
        setMessage("Failed to load users.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdmin, loadData]);

  const stats = useMemo(
    () => ({
      total: items.length,
      admins: items.filter((entry) => entry.role === "ADMIN").length,
      regionalManagers: items.filter((entry) => entry.role === "REGIONAL_MANAGER").length,
      managers: items.filter((entry) => entry.role === "MANAGER").length,
      reps: items.filter((entry) => entry.role === "SALES_REP").length,
    }),
    [items],
  );

  const filteredUsers = useMemo(
    () =>
      filterUsers(items, {
        searchQuery,
        roleFilter,
        regionalManagerFilter,
        managerFilter,
        statusFilter,
      }),
    [items, searchQuery, roleFilter, regionalManagerFilter, managerFilter, statusFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PAGE_SIZE));
  const paginatedUsers = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * USERS_PAGE_SIZE;
    return filteredUsers.slice(start, start + USERS_PAGE_SIZE);
  }, [filteredUsers, page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, roleFilter, regionalManagerFilter, managerFilter, statusFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await loadData();
    } catch {
      setMessage("Failed to load users.");
    } finally {
      setRefreshing(false);
    }
  }

  async function confirmDeleteUser() {
    if (!token || !deleteTarget) return;
    setDeletingUser(true);
    setMessage(null);
    try {
      await deleteUser(token, deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
      setMessage(`${deleteTarget.firstName} ${deleteTarget.lastName} deleted.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to delete user.");
    } finally {
      setDeletingUser(false);
    }
  }

  if (!isAdmin) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <PageHeader title="User management" subtitle="Admin only" />
          <Card style={styles.accessCard}>
            <View style={styles.accessRow}>
              <ShieldAlert size={20} color="#d97706" strokeWidth={2.2} />
              <View style={styles.accessText}>
                <Text style={[styles.accessTitle, { color: colors.text }]}>Admin access required</Text>
                <Text style={[styles.accessBody, { color: colors.text2 }]}>
                  Only admins can create and manage users.
                </Text>
              </View>
            </View>
          </Card>
        </ScrollView>
      </View>
    );
  }

  if (loading) return <ScreenLoader label="Loading users..." />;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader
          eyebrow="Access Control"
          title="User management"
          subtitle="Create regional managers, managers, sales reps, CEO users and additional admins."
        />

        <Card>
          <CardHeader title="Team directory" subtitle={`${stats.total} total users`} />
          <View style={styles.cardBody}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgeRow}>
              <Badge tone="brand">Admins {stats.admins}</Badge>
              <Badge tone="success">Regional Managers {stats.regionalManagers}</Badge>
              <Badge tone="warning">Managers {stats.managers}</Badge>
              <Badge tone="info">Sales reps {stats.reps}</Badge>
            </ScrollView>

            <Pressable
              style={[styles.createButton, { backgroundColor: colors.brand }]}
              onPress={() => router.push("/users/form")}
            >
              <UserPlus size={16} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.createButtonText}>Create user</Text>
            </Pressable>

            <View style={[styles.searchWrap, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <Search size={16} color={colors.text3} strokeWidth={2.2} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search name or email"
                placeholderTextColor={colors.text3}
                style={[styles.searchInput, { color: colors.text }]}
              />
            </View>

            <View style={styles.filterGrid}>
              <View style={styles.filterRow}>
                <FormSelect
                  style={styles.filterSelect}
                  placeholder="All roles"
                  value={roleFilter}
                  options={[
                    { value: "ALL", label: "All roles" },
                    ...USER_ROLES.map((entry) => ({ value: entry, label: entry.replace("_", " ") })),
                  ]}
                  onChange={(value) => setRoleFilter(value as "ALL" | Role)}
                />
                <FormSelect
                  style={styles.filterSelect}
                  placeholder="All regional managers"
                  value={regionalManagerFilter}
                  options={[
                    { value: "ALL", label: "All regional managers" },
                    ...regionalManagers.map((entry) => ({
                      value: entry.id,
                      label: `${entry.firstName} ${entry.lastName}`,
                    })),
                  ]}
                  onChange={setRegionalManagerFilter}
                />
              </View>
              <View style={styles.filterRow}>
                <FormSelect
                  style={styles.filterSelect}
                  placeholder="All managers"
                  value={managerFilter}
                  options={[
                    { value: "ALL", label: "All managers" },
                    ...managers.map((entry) => ({
                      value: entry.id,
                      label: `${entry.firstName} ${entry.lastName}`,
                    })),
                  ]}
                  onChange={setManagerFilter}
                />
                <FormSelect
                  style={styles.filterSelect}
                  placeholder="All statuses"
                  value={statusFilter}
                  options={[
                    { value: "ALL", label: "All statuses" },
                    { value: "live", label: "Live" },
                    { value: "offline", label: "Offline" },
                  ]}
                  onChange={(value) => setStatusFilter(value as UserStatusFilter)}
                />
              </View>
            </View>

            <Text style={[styles.resultMeta, { color: colors.text3 }]}>
              Showing {paginatedUsers.length} of {filteredUsers.length} users
              {filteredUsers.length !== items.length ? ` (filtered from ${items.length})` : ""}
            </Text>

            {filteredUsers.length === 0 ? (
              <View style={[styles.emptyBox, { borderColor: colors.border, backgroundColor: colors.surface2 }]}>
                <Text style={[styles.emptyText, { color: colors.text2 }]}>No users match your filters.</Text>
              </View>
            ) : (
              <>
                {paginatedUsers.map((entry) => {
                  const live = isUserLive(entry.lastLocationPingAt, entry.isActive);
                  return (
                    <View
                      key={entry.id}
                      style={[styles.userCard, { borderColor: colors.border, backgroundColor: colors.surface }]}
                    >
                      <View style={styles.userCardTop}>
                        <View style={styles.userCardMain}>
                          <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                            {entry.firstName} {entry.lastName}
                          </Text>
                          <Text style={[styles.userEmail, { color: colors.text3 }]} numberOfLines={1}>
                            {entry.email}
                          </Text>
                        </View>
                        <Badge tone={roleBadgeTone(entry.role)}>{entry.role.replace("_", " ")}</Badge>
                      </View>

                      <View style={styles.userMetaGrid}>
                        <View style={styles.userMetaCell}>
                          <Text style={[styles.userMetaLabel, { color: colors.text3 }]}>Reports to</Text>
                          <Text style={[styles.userMetaValue, { color: colors.text2 }]} numberOfLines={2}>
                            {getReportsToLabel(entry)}
                          </Text>
                        </View>
                        <View style={styles.userMetaCell}>
                          <Text style={[styles.userMetaLabel, { color: colors.text3 }]}>Target</Text>
                          <Text style={[styles.userMetaValue, { color: colors.text2 }]}>
                            {entry.yearlyTarget != null ? `AED ${formatAed(entry.yearlyTarget)}` : "—"}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.userOps, { color: colors.text3 }]} numberOfLines={2}>
                        {formatOperationLocations(entry.operationLocations ?? [])}
                      </Text>

                      <View style={styles.userCardFooter}>
                        <Text style={[styles.userStatus, { color: live ? colors.success : colors.danger }]}>
                          {live
                            ? "Live"
                            : entry.lastLocationPingAt
                              ? formatLastSeen(entry.lastLocationPingAt)
                              : "No location"}
                        </Text>
                        <View style={styles.userActions}>
                          <Pressable
                            style={[styles.actionButton, { backgroundColor: colors.surface2, borderColor: colors.border }]}
                            onPress={() => setAttendanceUser(entry)}
                          >
                            <CalendarDays size={14} color={colors.text} strokeWidth={2.2} />
                            <Text style={[styles.actionButtonText, { color: colors.text }]}>
                              {live ? "Live" : "History"}
                            </Text>
                          </Pressable>
                          <Pressable
                            style={[styles.actionButton, { backgroundColor: colors.surface2, borderColor: colors.border }]}
                            onPress={() => router.push({ pathname: "/users/form", params: { id: entry.id } })}
                          >
                            <Pencil size={14} color={colors.text} strokeWidth={2.2} />
                            <Text style={[styles.actionButtonText, { color: colors.text }]}>Edit</Text>
                          </Pressable>
                          <Pressable
                            style={[
                              styles.actionButton,
                              { backgroundColor: colors.surface2, borderColor: colors.border },
                              entry.id === user?.id && styles.actionButtonDisabled,
                            ]}
                            disabled={entry.id === user?.id}
                            onPress={() => setDeleteTarget(entry)}
                          >
                            <Trash2 size={14} color={entry.id === user?.id ? colors.text3 : colors.danger} strokeWidth={2.2} />
                            <Text
                              style={[
                                styles.actionButtonText,
                                { color: entry.id === user?.id ? colors.text3 : colors.text },
                              ]}
                            >
                              Delete
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  );
                })}

                {totalPages > 1 ? (
                  <View style={styles.pagination}>
                    <Text style={[styles.paginationMeta, { color: colors.text3 }]}>
                      Page {page} of {totalPages}
                    </Text>
                    <View style={styles.paginationButtons}>
                      <Pressable
                        style={[
                          styles.pageButton,
                          { borderColor: colors.border, backgroundColor: colors.surface2 },
                          page <= 1 && styles.actionButtonDisabled,
                        ]}
                        disabled={page <= 1}
                        onPress={() => setPage((current) => Math.max(1, current - 1))}
                      >
                        <Text style={[styles.pageButtonText, { color: colors.text }]}>Previous</Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.pageButton,
                          { borderColor: colors.border, backgroundColor: colors.surface2 },
                          page >= totalPages && styles.actionButtonDisabled,
                        ]}
                        disabled={page >= totalPages}
                        onPress={() => setPage((current) => Math.min(totalPages, current + 1))}
                      >
                        <Text style={[styles.pageButtonText, { color: colors.text }]}>Next</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </>
            )}
          </View>
        </Card>

        {message ? <Text style={[styles.message, { color: colors.text2 }]}>{message}</Text> : null}
      </ScrollView>

      <UserAttendanceModal
        user={attendanceUser}
        visible={Boolean(attendanceUser)}
        onClose={() => setAttendanceUser(null)}
      />

      <Modal visible={Boolean(deleteTarget)} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Delete user</Text>
              <Pressable
                style={[styles.closeButton, { backgroundColor: colors.surface2 }]}
                onPress={() => setDeleteTarget(null)}
              >
                <X size={16} color={colors.text3} strokeWidth={2.2} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <Text style={[styles.modalCopy, { color: colors.text2 }]}>
                Delete{" "}
                <Text style={{ color: colors.text, fontWeight: "700" }}>
                  {deleteTarget?.firstName} {deleteTarget?.lastName}
                </Text>{" "}
                ({deleteTarget?.email})? This permanently removes their account and location history.
              </Text>
              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.pageButton, { borderColor: colors.border, backgroundColor: colors.surface2 }]}
                  onPress={() => setDeleteTarget(null)}
                  disabled={deletingUser}
                >
                  <Text style={[styles.pageButtonText, { color: colors.text }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.deleteConfirmButton, { backgroundColor: colors.brand }, deletingUser && styles.actionButtonDisabled]}
                  onPress={() => void confirmDeleteUser()}
                  disabled={deletingUser}
                >
                  <Text style={styles.deleteConfirmText}>{deletingUser ? "Deleting..." : "Delete user"}</Text>
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
    cardBody: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 12,
    },
    badgeRow: {
      gap: 8,
      paddingBottom: 4,
    },
    createButton: {
      height: 36,
      borderRadius: 12,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      alignSelf: "flex-start",
    },
    createButtonText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "700",
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
    filterGrid: {
      gap: 8,
    },
    filterRow: {
      flexDirection: "row",
      gap: 8,
    },
    filterSelect: {
      flex: 1,
      minWidth: 0,
    },
    resultMeta: {
      fontSize: 12,
    },
    emptyBox: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 28,
      alignItems: "center",
    },
    emptyText: {
      fontSize: 14,
    },
    userCard: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      gap: 10,
    },
    userCardTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 8,
    },
    userCardMain: {
      flex: 1,
      minWidth: 0,
    },
    userName: {
      fontSize: 15,
      fontWeight: "700",
    },
    userEmail: {
      marginTop: 2,
      fontSize: 12,
    },
    userMetaGrid: {
      flexDirection: "row",
      gap: 8,
    },
    userMetaCell: {
      flex: 1,
      minWidth: 0,
    },
    userMetaLabel: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },
    userMetaValue: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 16,
    },
    userOps: {
      fontSize: 11,
      lineHeight: 15,
    },
    userCardFooter: {
      gap: 10,
    },
    userStatus: {
      fontSize: 12,
      fontWeight: "600",
    },
    userActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      justifyContent: "flex-end",
    },
    actionButton: {
      height: 32,
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    actionButtonDisabled: {
      opacity: 0.5,
    },
    actionButtonText: {
      fontSize: 11,
      fontWeight: "600",
    },
    pagination: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      paddingTop: 4,
    },
    paginationMeta: {
      fontSize: 12,
    },
    paginationButtons: {
      flexDirection: "row",
      gap: 8,
    },
    pageButton: {
      height: 32,
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    pageButtonText: {
      fontSize: 12,
      fontWeight: "600",
    },
    message: {
      fontSize: 12,
      paddingHorizontal: 4,
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
    deleteConfirmButton: {
      height: 32,
      borderRadius: 10,
      paddingHorizontal: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    deleteConfirmText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "700",
    },
  });
}
