import * as Location from "expo-location";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ScreenLoader } from "@/components/ScreenLoader";
import { ALL_STAGES, BUSINESS_DIVISIONS } from "@/lib/constants/stages";
import { colors } from "@/constants/theme";
import {
  listMyTeam,
  listRegionalManagers,
  listUsers,
  type ManagerOption,
  type TeamMember,
  type UserListItem,
} from "@/lib/api/auth-api";
import {
  createProject,
  getProject,
  updateProject,
  type ApiProject,
} from "@/lib/api/projects-api";
import { useAuth, canManageProjects, canSetBusinessDivision } from "@/lib/auth/AuthContext";
import { normalizeOptionalId } from "@/lib/utils";
import {
  SPEC_CORE_OPTIONS,
  SPEC_PAINT_TYPE_OPTIONS,
  SPEC_THICKNESS_OPTIONS,
  commercialSpecsComplete,
  formatProjectSpecs,
  requiresCommercialDetails,
} from "@/lib/project-specs";

export default function ProjectFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { token, user } = useAuth();
  const editing = Boolean(id);
  const canManage = canManageProjects(user?.role);
  const canSetDivision = canSetBusinessDivision(user);

  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [managers, setManagers] = useState<UserListItem[]>([]);
  const [regionalManagers, setRegionalManagers] = useState<ManagerOption[]>([]);
  const [salesReps, setSalesReps] = useState<Array<TeamMember | UserListItem>>([]);

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("United Arab Emirates");
  const [developer, setDeveloper] = useState("");
  const [businessDivision, setBusinessDivision] = useState<(typeof BUSINESS_DIVISIONS)[number] | "">("");
  const [savedBusinessDivision, setSavedBusinessDivision] = useState<string | null>(null);
  const [stage, setStage] = useState<string>("Lead Identified");
  const [value, setValue] = useState("");
  const [itemQuantity, setItemQuantity] = useState("");
  const [specThickness, setSpecThickness] = useState("");
  const [specCore, setSpecCore] = useState("");
  const [specPaintType, setSpecPaintType] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [competitor, setCompetitor] = useState("");
  const [regionalManagerId, setRegionalManagerId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [salesRepIds, setSalesRepIds] = useState<string[]>([]);

  const loadPeople = useCallback(async () => {
    if (!token) return;
    const [usersData, regionalData] = await Promise.all([
      listUsers(token),
      listRegionalManagers(token),
    ]);
    setManagers(usersData.filter((entry) => entry.role === "MANAGER"));
    setRegionalManagers(regionalData);
    if (user?.role === "MANAGER") {
      setManagerId(user.id);
      const team = await listMyTeam(token);
      setSalesReps(team.filter((member) => member.role === "SALES_REP"));
    } else {
      setSalesReps(usersData.filter((entry) => entry.role === "SALES_REP"));
    }
  }, [token, user?.role, user?.id]);

  useEffect(() => {
    if (!canManage) {
      router.back();
      return;
    }
    void (async () => {
      try {
        await loadPeople();
        if (id && token) {
          const project = await getProject(token, id);
          fillFromProject(project);
        } else if (user?.role === "MANAGER") {
          setManagerId(user.id);
        }
      } catch {
        setError("Failed to load project.");
      } finally {
        setLoading(false);
      }
    })();
  }, [canManage, id, loadPeople, router, token, user?.id, user?.role]);

  function fillFromProject(project: ApiProject) {
    setName(project.name);
    setCity(project.city);
    setCountry(project.country);
    setDeveloper(project.developer);
    setBusinessDivision(project.businessDivision ?? "");
    setSavedBusinessDivision(project.businessDivision);
    setStage(project.stage);
    setValue(String(project.valueAed));
    setItemQuantity(String(project.itemQuantity));
    setSpecThickness(project.specThickness ?? "");
    setSpecCore(project.specCore ?? "");
    setSpecPaintType(project.specPaintType ?? "");
    setLat(String(project.lat));
    setLng(String(project.lng));
    setCompetitor(project.competitor ?? "");
    setRegionalManagerId(project.regionalManagerId ?? "");
    setManagerId(project.managerId ?? "");
    setSalesRepIds(project.salesRepIds);
  }

  const managersUnderRegional = useMemo(() => {
    if (!regionalManagerId) return managers;
    return managers.filter((manager) => manager.regionalManagerId === regionalManagerId);
  }, [managers, regionalManagerId]);

  const repsUnderManager = useMemo(() => {
    if (!managerId) return salesReps;
    return salesReps.filter((rep) => rep.managerId === managerId);
  }, [managerId, salesReps]);

  async function useCurrentLocation() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Location required", "Enable location to set project coordinates.");
      return;
    }
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setLat(String(position.coords.latitude));
    setLng(String(position.coords.longitude));
  }

  function toggleRep(repId: string) {
    setSalesRepIds((current) =>
      current.includes(repId) ? current.filter((entry) => entry !== repId) : [...current, repId]
    );
  }

  async function onSave() {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const parsedValue = Number(value);
      const parsedQty = Number(itemQuantity);
      const parsedLat = Number(lat);
      const parsedLng = Number(lng);
      if (!name.trim() || !city.trim() || !country.trim()) {
        throw new Error("Name, city, and country are required.");
      }
      if (requiresCommercialDetails(stage)) {
        if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
          throw new Error("Total project value is required for quotation stage and later.");
        }
        if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
          throw new Error("Total project quantity (m²) is required for quotation stage and later.");
        }
        if (!commercialSpecsComplete(specThickness, specCore, specPaintType)) {
          throw new Error("Select thickness, core, and paint type.");
        }
      } else if (!Number.isFinite(parsedValue) || parsedValue < 0) {
        throw new Error("Enter a valid project value.");
      }
      if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
        throw new Error("Set valid coordinates (use current location).");
      }

      const itemName = commercialSpecsComplete(specThickness, specCore, specPaintType)
        ? formatProjectSpecs(specThickness, specCore, specPaintType)
        : "";

      const payload = {
        name: name.trim(),
        city: city.trim(),
        country: country.trim(),
        developer: developer.trim(),
        businessDivision: canSetDivision ? businessDivision || null : savedBusinessDivision,
        stage,
        valueAed: Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0,
        itemName,
        itemQuantity: Number.isFinite(parsedQty) && parsedQty > 0 ? Math.round(parsedQty) : 0,
        specThickness,
        specCore,
        specPaintType,
        lat: parsedLat,
        lng: parsedLng,
        probability: 0,
        daysInStage: 0,
        competitor: competitor.trim() || null,
        regionalManagerId: normalizeOptionalId(regionalManagerId),
        managerId: normalizeOptionalId(managerId),
        salesRepIds,
      };

      const saved = editing && id
        ? await updateProject(token, id, payload)
        : await createProject(token, payload);
      router.replace(`/project/${saved.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save project.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <ScreenLoader label="Loading form..." />;

  return (
    <>
      <Stack.Screen options={{ title: editing ? "Edit project" : "New project" }} />
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Field label="Project name" value={name} onChangeText={setName} />
        <Field label="City" value={city} onChangeText={setCity} />
        <Field label="Country" value={country} onChangeText={setCountry} />
        <Field label="Developer" value={developer} onChangeText={setDeveloper} />
        <Field label="Total project value (AED)" value={value} onChangeText={setValue} keyboardType="numeric" />
        <Field
          label="Total project quantity (m²)"
          value={itemQuantity}
          onChangeText={setItemQuantity}
          keyboardType="numeric"
        />

        {requiresCommercialDetails(stage) ? (
          <>
            <Text style={styles.label}>Thickness</Text>
            <View style={styles.chips}>
              {SPEC_THICKNESS_OPTIONS.map((entry) => (
                <Chip
                  key={entry}
                  label={entry}
                  active={specThickness === entry}
                  onPress={() => setSpecThickness(entry)}
                />
              ))}
            </View>

            <Text style={styles.label}>Core</Text>
            <View style={styles.chips}>
              {SPEC_CORE_OPTIONS.map((entry) => (
                <Chip key={entry} label={entry} active={specCore === entry} onPress={() => setSpecCore(entry)} />
              ))}
            </View>

            <Text style={styles.label}>Paint type</Text>
            <View style={styles.chips}>
              {SPEC_PAINT_TYPE_OPTIONS.map((entry) => (
                <Chip
                  key={entry}
                  label={entry}
                  active={specPaintType === entry}
                  onPress={() => setSpecPaintType(entry)}
                />
              ))}
            </View>
          </>
        ) : null}

        <Field label="Competitor" value={competitor} onChangeText={setCompetitor} />

        <Text style={styles.label}>Stage</Text>
        <View style={styles.chips}>
          {ALL_STAGES.map((entry) => (
            <Chip key={entry} label={entry} active={stage === entry} onPress={() => setStage(entry)} />
          ))}
        </View>

        {canSetDivision ? (
          <>
            <Text style={styles.label}>Business division</Text>
            <View style={styles.chips}>
              <Chip label="None" active={!businessDivision} onPress={() => setBusinessDivision("")} />
              {BUSINESS_DIVISIONS.map((entry) => (
                <Chip
                  key={entry}
                  label={entry}
                  active={businessDivision === entry}
                  onPress={() => setBusinessDivision(entry)}
                />
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.label}>Location</Text>
        <View style={styles.row}>
          <Field label="Lat" value={lat} onChangeText={setLat} keyboardType="numeric" compact />
          <Field label="Lng" value={lng} onChangeText={setLng} keyboardType="numeric" compact />
        </View>
        <Pressable style={styles.secondaryButton} onPress={() => void useCurrentLocation()}>
          <Text style={styles.secondaryButtonText}>Use current location</Text>
        </Pressable>

        {user?.role !== "MANAGER" ? (
          <>
            <Text style={styles.label}>Regional manager</Text>
            <View style={styles.chips}>
              <Chip label="None" active={!regionalManagerId} onPress={() => setRegionalManagerId("")} />
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

        {user?.role !== "MANAGER" ? (
          <>
            <Text style={styles.label}>Manager</Text>
            <View style={styles.chips}>
              <Chip label="None" active={!managerId} onPress={() => setManagerId("")} />
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

        <Text style={styles.label}>Sales reps</Text>
        <View style={styles.chips}>
          {repsUnderManager.map((entry) => (
            <Chip
              key={entry.id}
              label={`${entry.firstName} ${entry.lastName}`}
              active={salesRepIds.includes(entry.id)}
              onPress={() => toggleRep(entry.id)}
            />
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={styles.button} onPress={() => void onSave()} disabled={saving}>
          <Text style={styles.buttonText}>{saving ? "Saving..." : editing ? "Save changes" : "Create project"}</Text>
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
  compact,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "numeric" | "default";
  compact?: boolean;
}) {
  return (
    <View style={compact ? styles.compactField : undefined}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
      />
    </View>
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
  row: { flexDirection: "row", gap: 10 },
  compactField: { flex: 1 },
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
  secondaryButton: {
    marginTop: 8,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  secondaryButtonText: { color: colors.brand, fontWeight: "600" },
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
