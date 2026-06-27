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
  listProjects,
  updateProject,
  type ApiProject,
  type ProjectUpsertPayload,
} from "@/lib/api/projects-api";
import { listActiveCurrencies, listActiveRegionDefaults, type ActiveCurrencyItem } from "@/lib/api/master-data-api";
import { useAuth, canManageProjects, canSetBusinessDivision } from "@/lib/auth/AuthContext";
import { suggestCurrencyCode } from "@/lib/currency-defaults";
import {
  citiesForCountry,
  countryOptions,
  normalizeCountryName,
  projectCitiesForCountry,
} from "@/lib/locations";
import {
  effectiveValueLocal,
  formatNumberForInput,
  normalizeOptionalId,
  parseFormattedNumber,
  sanitizeFormattedNumberInput,
  uniqueCustomerNames,
} from "@/lib/utils";
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
  const [currencyCode, setCurrencyCode] = useState("AED");
  const [currencies, setCurrencies] = useState<ActiveCurrencyItem[]>([]);
  const [regionDefaults, setRegionDefaults] = useState<Record<string, string>>({});
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
  const [customerSuggestions, setCustomerSuggestions] = useState<string[]>([]);
  const [knownProjects, setKnownProjects] = useState<ApiProject[]>([]);

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
    } else if (user?.role === "SALES_REP") {
      const userData = await listUsers(token);
      setManagers(userData.filter((entry) => entry.role === "MANAGER"));
      setRegionalManagers(userData.filter((entry) => entry.role === "REGIONAL_MANAGER"));
      setSalesReps(userData.filter((entry) => entry.role === "SALES_REP"));
      setManagerId(user.managerId ?? "");
      setSalesRepIds([user.id]);
    } else {
      setSalesReps(usersData.filter((entry) => entry.role === "SALES_REP"));
    }
  }, [token, user?.role, user?.id, user?.managerId]);

  useEffect(() => {
    if (!canManage) {
      router.back();
      return;
    }
    void (async () => {
      try {
        await loadPeople();
        if (token) {
          try {
            const [currencyRows, regionRows, projects] = await Promise.all([
              listActiveCurrencies(token),
              listActiveRegionDefaults(token),
              listProjects(token),
            ]);
            setCurrencies(currencyRows);
            setRegionDefaults(Object.fromEntries(regionRows.map((row) => [row.name, row.defaultCurrencyCode])));
            setCustomerSuggestions(uniqueCustomerNames(projects));
            setKnownProjects(projects);
          } catch {
            setCurrencies([{ code: "AED", name: "UAE Dirham", rateToAed: 1 }]);
          }
        }
        if (id && token) {
          const project = await getProject(token, id);
          fillFromProject(project);
        } else if (user?.role === "MANAGER") {
          setManagerId(user.id);
        } else if (user?.role === "SALES_REP" && user.id) {
          setManagerId(user.managerId ?? "");
          setSalesRepIds([user.id]);
        }
      } catch {
        setError("Failed to load project.");
      } finally {
        setLoading(false);
      }
    })();
  }, [canManage, id, loadPeople, router, token, user?.id, user?.managerId, user?.role]);

  function defaultCurrencyForCountry(nextCountry: string) {
    return suggestCurrencyCode({
      country: nextCountry,
      operationLocations: user?.regions,
      regionDefaults,
    });
  }

  function fillFromProject(project: ApiProject) {
    setName(project.name);
    setCity(project.city);
    setCountry(normalizeCountryName(project.country));
    setDeveloper(project.developer);
    setBusinessDivision(project.businessDivision ?? "");
    setSavedBusinessDivision(project.businessDivision);
    setStage(project.stage);
    setValue(formatNumberForInput(effectiveValueLocal(project)));
    setCurrencyCode(project.currencyCode || "AED");
    setItemQuantity(formatNumberForInput(project.itemQuantity));
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

  const filteredCustomerSuggestions = useMemo(() => {
    const query = developer.trim().toLowerCase();
    if (!query) return [];
    return customerSuggestions.filter((name) => name.toLowerCase().includes(query)).slice(0, 8);
  }, [customerSuggestions, developer]);

  const countryOptionList = useMemo(() => countryOptions(country), [country]);
  const filteredCountrySuggestions = useMemo(() => {
    const query = country.trim().toLowerCase();
    const matches = query
      ? countryOptionList.filter((name) => name.toLowerCase().includes(query))
      : countryOptionList;
    return matches.slice(0, 8);
  }, [country, countryOptionList]);

  const cityOptionList = useMemo(
    () =>
      citiesForCountry(country, {
        existingCity: city,
        projectCities: projectCitiesForCountry(knownProjects, country),
      }),
    [country, city, knownProjects],
  );
  const filteredCitySuggestions = useMemo(() => {
    if (!country.trim()) return [];
    const query = city.trim().toLowerCase();
    const matches = query
      ? cityOptionList.filter((name) => name.toLowerCase().includes(query))
      : cityOptionList;
    return matches.slice(0, 8);
  }, [country, city, cityOptionList]);

  function handleCountryChange(nextCountry: string) {
    const countryChanged = normalizeCountryName(country) !== normalizeCountryName(nextCountry);
    setCountry(nextCountry);
    if (countryChanged) setCity("");
    if (!editing) {
      setCurrencyCode(defaultCurrencyForCountry(normalizeCountryName(nextCountry) || nextCountry));
    }
  }

  const managersUnderRegional = useMemo(() => {
    if (!regionalManagerId) return managers;
    return managers.filter((manager) => manager.regionalManagerId === regionalManagerId);
  }, [managers, regionalManagerId]);

  const repsUnderManager = useMemo(() => {
    if (managerId) {
      return salesReps.filter((rep) => rep.managerId === managerId);
    }
    if (regionalManagerId) {
      return salesReps.filter((rep) => {
        if (rep.managerId !== null) return false;
        return "regionalManagerId" in rep && rep.regionalManagerId === regionalManagerId;
      });
    }
    return salesReps;
  }, [managerId, regionalManagerId, salesReps]);

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
      const parsedValue = parseFormattedNumber(value);
      const parsedQty = parseFormattedNumber(itemQuantity);
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

      const payload: ProjectUpsertPayload = {
        name: name.trim(),
        city: city.trim(),
        country: normalizeCountryName(country.trim()),
        developer: developer.trim(),
        businessDivision: (canSetDivision ? businessDivision || null : savedBusinessDivision) as ProjectUpsertPayload["businessDivision"],
        stage,
        valueLocal: Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0,
        currencyCode,
        itemName,
        itemQuantity: Number.isFinite(parsedQty) && parsedQty > 0 ? parsedQty : 0,
        specThickness,
        specCore,
        specPaintType,
        lat: parsedLat,
        lng: parsedLng,
        probability: 0,
        daysInStage: 0,
        competitor: competitor.trim() || null,
        regionalManagerId: normalizeOptionalId(regionalManagerId),
        managerId:
          user?.role === "SALES_REP"
            ? normalizeOptionalId(user.managerId ?? managerId)
            : normalizeOptionalId(managerId),
        salesRepIds:
          user?.role === "SALES_REP" && user.id
            ? salesRepIds.length > 0
              ? salesRepIds
              : [user.id]
            : salesRepIds,
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
        <Field label="Country" value={country} onChangeText={handleCountryChange} />
        {filteredCountrySuggestions.length > 0 ? (
          <View style={styles.suggestions}>
            {filteredCountrySuggestions.map((entry) => (
              <Pressable
                key={entry}
                onPress={() => handleCountryChange(entry)}
                style={styles.suggestionItem}
              >
                <Text style={styles.suggestionText}>{entry}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <Field
          label="City"
          value={city}
          onChangeText={setCity}
          editable={Boolean(country.trim())}
          placeholder={country.trim() ? "Select or search city" : "Select country first"}
        />
        {filteredCitySuggestions.length > 0 ? (
          <View style={styles.suggestions}>
            {filteredCitySuggestions.map((entry) => (
              <Pressable key={entry} onPress={() => setCity(entry)} style={styles.suggestionItem}>
                <Text style={styles.suggestionText}>{entry}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <Field label="Customer" value={developer} onChangeText={setDeveloper} />
        {filteredCustomerSuggestions.length > 0 ? (
          <View style={styles.suggestions}>
            {filteredCustomerSuggestions.map((customer) => (
              <Pressable
                key={customer}
                onPress={() => setDeveloper(customer)}
                style={styles.suggestionItem}
              >
                <Text style={styles.suggestionText}>{customer}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <Field
          label="Total project value"
          value={value}
          onChangeText={(next) => setValue(sanitizeFormattedNumberInput(next))}
          onBlur={() => {
            const parsed = parseFormattedNumber(value);
            if (Number.isFinite(parsed) && parsed > 0) setValue(formatNumberForInput(parsed));
          }}
          keyboardType="decimal-pad"
        />
        <Text style={styles.label}>Currency</Text>
        <View style={styles.chips}>
          {(currencies.length > 0 ? currencies : [{ code: "AED", name: "UAE Dirham", rateToAed: 1 }]).map((entry) => (
            <Chip
              key={entry.code}
              label={entry.code}
              active={currencyCode === entry.code}
              onPress={() => setCurrencyCode(entry.code)}
            />
          ))}
        </View>
        <Field
          label="Total project quantity (m²)"
          value={itemQuantity}
          onChangeText={(next) => setItemQuantity(sanitizeFormattedNumberInput(next))}
          onBlur={() => {
            const parsed = parseFormattedNumber(itemQuantity);
            if (Number.isFinite(parsed) && parsed > 0) setItemQuantity(formatNumberForInput(parsed));
          }}
          keyboardType="decimal-pad"
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
  onBlur,
  keyboardType,
  compact,
  editable = true,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  keyboardType?: "numeric" | "decimal-pad" | "default";
  compact?: boolean;
  editable?: boolean;
  placeholder?: string;
}) {
  return (
    <View style={compact ? styles.compactField : undefined}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, !editable && styles.inputDisabled]}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        keyboardType={keyboardType}
        editable={editable}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
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
  inputDisabled: {
    opacity: 0.5,
  },
  suggestions: {
    marginTop: -4,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  suggestionItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: { fontSize: 14, color: colors.text },
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
