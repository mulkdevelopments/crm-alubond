import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { EmptyState, ScreenLoader } from "@/components/ScreenLoader";
import { colors } from "@/constants/theme";
import { listUsers, type UserListItem } from "@/lib/api/auth-api";
import { useAuth } from "@/lib/auth/AuthContext";

export default function TeamScreen() {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setUsers(await listUsers(token));
  }, [token]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try { await load(); } finally { setLoading(false); }
    })();
  }, [load]);

  const grouped = users
    .filter((u) => u.role !== "ADMIN")
    .sort((a, b) => a.role.localeCompare(b.role) || a.lastName.localeCompare(b.lastName));

  if (loading) return <ScreenLoader label="Loading team..." />;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      data={grouped}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void (async () => {
          setRefreshing(true);
          try { await load(); } finally { setRefreshing(false); }
        })()} />
      }
      ListEmptyComponent={<EmptyState title="No team members" subtitle="Users in your scope will appear here." />}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
          <Text style={styles.role}>{item.role.replace("_", " ")}</Text>
          <Text style={styles.meta}>{item.email}</Text>
          {(item.operationLocations ?? []).length > 0 ? (
            <Text style={styles.meta}>{item.operationLocations.join(", ")}</Text>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  name: { fontSize: 16, fontWeight: "700", color: colors.text },
  role: { marginTop: 4, fontSize: 12, color: colors.brand, fontWeight: "600" },
  meta: { marginTop: 4, fontSize: 12, color: colors.textMuted },
});
