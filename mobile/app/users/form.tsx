import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ScreenLoader } from "@/components/ScreenLoader";
import { colors } from "@/constants/theme";
import {
  createUser,
  listCeos,
  listRegionalManagers,
  listUsers,
  updateUser,
  type ManagerOption,
  type Role,
  type UserListItem,
} from "@/lib/api/auth-api";
import { useAuth } from "@/lib/auth/AuthContext";
import { normalizeOptionalId } from "@/lib/utils";

const ROLES: Role[] = ["SALES_REP", "MANAGER", "REGIONAL_MANAGER", "CEO", "ADMIN"];
const DIRECT_REGIONAL = "__direct__";

export default function UserFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { token, user } = useAuth();
  const editing = Boolean(id);
  const isAdmin = user?.role === "ADMIN";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [regionalManagers, setRegionalManagers] = useState<ManagerOption[]>([]);
  const [ceos, setCeos] = useState<ManagerOption[]>([]);

  const [role, setRole] = useState<Role>("SALES_REP");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [operationLocationsInput, setOperationLocationsInput] = useState("");
  const [yearlyTarget, setYearlyTarget] = useState("");
  const [password, setPassword] = useState("");
  const [managerId, setManagerId] = useState("");
  const [regionalManagerId, setRegionalManagerId] = useState("");
  const [reportsToId, setReportsToId] = useState("");
  const [regionsInput, setRegionsInput] = useState("");
  const [canSetBusinessDivision, setCanSetBusinessDivision] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const [usersData, regionalData, ceosData] = await Promise.all([
      listUsers(token),
      listRegionalManagers(token),
      listCeos(token),
    ]);
    setUsers(usersData);
    setRegionalManagers(regionalData);
    setCeos(ceosData);

    if (id) {
      const existing = usersData.find((entry) => entry.id === id);
      if (existing) {
        setRole(existing.role);
        setFirstName(existing.firstName);
        setLastName(existing.lastName);
        setEmail(existing.email);
        setOperationLocationsInput((existing.operationLocations ?? []).join(", "));
        setYearlyTarget(existing.yearlyTarget ? String(existing.yearlyTarget) : "");
        setRegionalManagerId(existing.regionalManagerId ?? "");
        setReportsToId(existing.reportsToId ?? "");
        setRegionsInput(existing.regions.join(", "));
        setCanSetBusinessDivision(existing.role === "REGIONAL_MANAGER" ? existing.canSetBusinessDivision : false);
        if (existing.role === "SALES_REP") {
          setManagerId(existing.managerId ? existing.managerId : DIRECT_REGIONAL);
        }
      }
    }
  }, [id, token]);

  useEffect(() => {
    if (!isAdmin) {
      router.back();
      return;
    }
    void (async () => {
      try {
        await load();
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdmin, load, router]);

  const managers = useMemo(
    () => users.filter((entry) => entry.role === "MANAGER"),
    [users]
  );

  const managersUnderRegional = useMemo(() => {
    if (!regionalManagerId) return managers;
    return managers.filter((manager) => manager.regionalManagerId === regionalManagerId);
  }, [managers, regionalManagerId]);

  async function onSave() {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const parsedYearlyTarget = yearlyTarget.trim() ? Number(yearlyTarget) : null;
      const parsedRegions = regionsInput
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);

      if (role !== "ADMIN" && (!parsedYearlyTarget || parsedYearlyTarget <= 0 || Number.isNaN(parsedYearlyTarget))) {
        throw new Error("Yearly sales target is required for non-admin users.");
      }
      if (role === "MANAGER" && !regionalManagerId) {
        throw new Error("Manager must be assigned under a regional manager.");
      }
      if (role === "SALES_REP" && managerId !== DIRECT_REGIONAL && !managerId && !regionalManagerId) {
        throw new Error("Sales rep must be assigned under a manager or regional manager.");
      }
      if (role === "SALES_REP" && managerId === DIRECT_REGIONAL && !regionalManagerId) {
        throw new Error("Select a regional manager for direct reporting.");
      }
      if (role === "REGIONAL_MANAGER" && parsedRegions.length === 0) {
        throw new Error("Regional manager must have at least one region.");
      }
      if (role === "REGIONAL_MANAGER" && !reportsToId) {
        throw new Error("Regional manager must be assigned under CEO.");
      }
      if (!editing && !password.trim()) {
        throw new Error("Password is required for new users.");
      }

      const parsedOperationLocations = operationLocationsInput
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
      if (parsedOperationLocations.length === 0) {
        throw new Error("At least one operation location is required.");
      }

      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        role,
        managerId:
          role === "SALES_REP"
            ? managerId === DIRECT_REGIONAL
              ? null
              : normalizeOptionalId(managerId)
            : null,
        regionalManagerId:
          role === "MANAGER" || role === "SALES_REP" ? normalizeOptionalId(regionalManagerId) : null,
        reportsToId: role === "REGIONAL_MANAGER" ? normalizeOptionalId(reportsToId) : null,
        regions: role === "REGIONAL_MANAGER" ? parsedRegions : [],
        operationLocations: parsedOperationLocations,
        yearlyTarget: role !== "ADMIN" ? parsedYearlyTarget : null,
        canSetBusinessDivision: role === "REGIONAL_MANAGER" ? canSetBusinessDivision : false,
      };

      if (editing && id) {
        await updateUser(token, id, {
          ...payload,
          password: password.trim() ? password : undefined,
        });
      } else {
        await createUser(token, { ...payload, password });
      }
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save user.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <ScreenLoader label="Loading form..." />;

  return (
    <>
      <Stack.Screen options={{ title: editing ? "Edit user" : "New user" }} />
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={styles.label}>Role</Text>
        <View style={styles.chips}>
          {ROLES.map((entry) => (
            <Chip
              key={entry}
              label={entry.replace("_", " ")}
              active={role === entry}
              onPress={() => {
                setRole(entry);
                if (entry !== "REGIONAL_MANAGER") {
                  setCanSetBusinessDivision(false);
                }
              }}
            />
          ))}
        </View>

        <Field label="First name" value={firstName} onChangeText={setFirstName} />
        <Field label="Last name" value={lastName} onChangeText={setLastName} />
        <Field label="Email" value={email} onChangeText={setEmail} />
        <Field
          label="Operation locations (comma separated)"
          value={operationLocationsInput}
          onChangeText={setOperationLocationsInput}
        />
        {role !== "ADMIN" ? (
          <Field label="Yearly target (AED)" value={yearlyTarget} onChangeText={setYearlyTarget} keyboardType="numeric" />
        ) : null}
        <Field
          label={editing ? "New password (optional)" : "Password"}
          value={password}
          onChangeText={setPassword}
          secure
        />

        {role === "REGIONAL_MANAGER" ? (
          <>
            <Field label="Regions (comma separated)" value={regionsInput} onChangeText={setRegionsInput} />
            <Text style={styles.label}>Reports to CEO</Text>
            <View style={styles.chips}>
              {ceos.map((entry) => (
                <Chip
                  key={entry.id}
                  label={`${entry.firstName} ${entry.lastName}`}
                  active={reportsToId === entry.id}
                  onPress={() => setReportsToId(entry.id)}
                />
              ))}
            </View>
            <Text style={styles.label}>Business division access</Text>
            <View style={styles.chips}>
              <Chip
                label="Disabled"
                active={!canSetBusinessDivision}
                onPress={() => setCanSetBusinessDivision(false)}
              />
              <Chip
                label="Can set on projects"
                active={canSetBusinessDivision}
                onPress={() => setCanSetBusinessDivision(true)}
              />
            </View>
          </>
        ) : null}

        {role === "MANAGER" || role === "SALES_REP" ? (
          <>
            <Text style={styles.label}>Regional manager</Text>
            <View style={styles.chips}>
              {regionalManagers.map((entry) => (
                <Chip
                  key={entry.id}
                  label={`${entry.firstName} ${entry.lastName}`}
                  active={regionalManagerId === entry.id}
                  onPress={() => setRegionalManagerId(entry.id)}
                />
              ))}
            </View>
          </>
        ) : null}

        {role === "SALES_REP" ? (
          <>
            <Text style={styles.label}>Manager</Text>
            <View style={styles.chips}>
              <Chip
                label="Direct regional manager"
                active={managerId === DIRECT_REGIONAL}
                onPress={() => setManagerId(DIRECT_REGIONAL)}
              />
              {managersUnderRegional.map((entry) => (
                <Chip
                  key={entry.id}
                  label={`${entry.firstName} ${entry.lastName}`}
                  active={managerId === entry.id}
                  onPress={() => setManagerId(entry.id)}
                />
              ))}
            </View>
          </>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={styles.button} onPress={() => void onSave()} disabled={saving}>
          <Text style={styles.buttonText}>{saving ? "Saving..." : editing ? "Save changes" : "Create user"}</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  secure,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "numeric" | "default";
  secure?: boolean;
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        secureTextEntry={secure}
        autoCapitalize={secure ? "none" : "sentences"}
      />
    </>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  label: { marginTop: 12, marginBottom: 6, fontSize: 13, fontWeight: "600", color: colors.text },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
  button: {
    marginTop: 20,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  error: { marginTop: 12, color: colors.danger, fontSize: 13 },
});
