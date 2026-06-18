import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { EmptyState, ScreenLoader } from "@/components/ScreenLoader";
import { colors } from "@/constants/theme";
import { listUsers, type UserListItem } from "@/lib/api/auth-api";
import { useAuth } from "@/lib/auth/AuthContext";

export default function UsersScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [query, setQuery] = useState("");
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => `${u.firstName} ${u.lastName} ${u.email} ${u.role}`.toLowerCase().includes(q));
  }, [users, query]);

  if (loading) return <ScreenLoader label="Loading users..." />;

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TextInput
          placeholder="Search users..."
          value={query}
          onChangeText={setQuery}
          style={styles.search}
        />
        <Pressable style={styles.addButton} onPress={() => router.push("/users/form")}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
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
        ListEmptyComponent={<EmptyState title="No users found" />}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push({ pathname: "/users/form", params: { id: item.id } })}>
            <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
            <Text style={styles.role}>{item.role.replace("_", " ")}</Text>
            <Text style={styles.meta}>{item.email}</Text>
            <Text style={styles.meta}>{item.operationLocation || "Location not set"}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  toolbar: { flexDirection: "row", alignItems: "center", gap: 10, padding: 16, paddingBottom: 0 },
  search: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
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
