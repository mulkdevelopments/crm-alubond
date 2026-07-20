import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MapPin, Pencil, Trash2 } from "lucide-react-native";

import { buildConverterOptions } from "@/components/pipeline/WinStagePrompt";
import { LocationPickerMap } from "@/components/map/LocationPickerMap";
import { ProjectCommercialFields } from "@/components/projects/ProjectCommercialFields";
import { ScreenLoader } from "@/components/ScreenLoader";
import { FormSelect } from "@/components/ui/FormSelect";
import { ThemeColors, useThemeColors } from "@/constants/theme";
import {
  BUSINESS_DIVISIONS,
  PIPELINE_VISIBLE_STAGES,
  stageTitle,
} from "@/lib/constants/stages";
import {
  listMyTeam,
  listRegionalManagers,
  listUsers,
  type ManagerOption,
  type TeamMember,
  type UserListItem,
} from "@/lib/api/auth-api";
import { listActiveCurrencies, listActiveRegionDefaults, type ActiveCurrencyItem } from "@/lib/api/master-data-api";
import {
  createProject,
  getProject,
  listProjects,
  updateProject,
  type ApiProject,
  type ProjectUpsertPayload,
} from "@/lib/api/projects-api";
import { createCustomer, listCustomers, renameCustomer, trashCustomer } from "@/lib/api/customers-api";
import { useAuth, canManageProjects, canSetBusinessDivision } from "@/lib/auth/AuthContext";
import { suggestCurrencyCode } from "@/lib/currency-defaults";
import {
  citiesForCountry,
  countryOptions,
  normalizeCountryName,
  projectCitiesForCountry,
} from "@/lib/locations";
import {
  commercialSpecsComplete,
  formatProjectSpecs,
  requiresCommercialDetails,
} from "@/lib/project-specs";
import {
  effectiveValueLocal,
  formatNumberForInput,
  normalizeOptionalId,
  parseFormattedNumber,
  uniqueCustomerNames,
} from "@/lib/utils";

export default function ProjectFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { token, user } = useAuth();
  const editing = Boolean(id);
  const canManage = canManageProjects(user?.role);
  const canSetDivision = canSetBusinessDivision(user);
  const isManager = user?.role === "MANAGER";
  const isRegionalManager = user?.role === "REGIONAL_MANAGER";
  const isSalesRep = user?.role === "SALES_REP";

  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationSearchLoading, setLocationSearchLoading] = useState(false);
  const [locationSearchError, setLocationSearchError] = useState<string | null>(null);
  const [managers, setManagers] = useState<UserListItem[]>([]);
  const [regionalManagers, setRegionalManagers] = useState<ManagerOption[]>([]);
  const [salesReps, setSalesReps] = useState<Array<TeamMember | UserListItem>>([]);
  const [knownProjects, setKnownProjects] = useState<ApiProject[]>([]);
  const [catalogCustomers, setCatalogCustomers] = useState<string[]>([]);
  const [extraCustomers, setExtraCustomers] = useState<string[]>([]);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [newCustomerDraft, setNewCustomerDraft] = useState("");
  const [editingCustomer, setEditingCustomer] = useState<string | null>(null);
  const [editCustomerDraft, setEditCustomerDraft] = useState("");
  const [currencies, setCurrencies] = useState<ActiveCurrencyItem[]>([]);
  const [regionDefaults, setRegionDefaults] = useState<Record<string, string>>({});

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("United Arab Emirates");
  const [developer, setDeveloper] = useState("");
  const [businessDivision, setBusinessDivision] = useState<(typeof BUSINESS_DIVISIONS)[number] | "">("");
  const [savedBusinessDivision, setSavedBusinessDivision] = useState<string | null>(null);
  const [stage, setStage] = useState("Lead Identified");
  const [value, setValue] = useState("");
  const [currencyCode, setCurrencyCode] = useState("AED");
  const [itemQuantity, setItemQuantity] = useState("");
  const [specThickness, setSpecThickness] = useState("");
  const [specCore, setSpecCore] = useState("");
  const [specPaintType, setSpecPaintType] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [probability, setProbability] = useState("");
  const [competitor, setCompetitor] = useState("");
  const [daysInStage, setDaysInStage] = useState(1);
  const [locationQuery, setLocationQuery] = useState("");
  const [regionalManagerId, setRegionalManagerId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [salesRepIds, setSalesRepIds] = useState<string[]>([]);
  const [convertedById, setConvertedById] = useState("");

  const loadPeople = useCallback(async () => {
    if (!token) return;
    const [usersData, regionalData] = await Promise.all([listUsers(token), listRegionalManagers(token)]);
    setManagers(usersData.filter((entry) => entry.role === "MANAGER"));
    setRegionalManagers(regionalData);
    if (isManager && user?.id) {
      setManagerId(user.id);
      const team = await listMyTeam(token);
      setSalesReps(team.filter((member) => member.role === "SALES_REP"));
    } else if (isSalesRep && user) {
      const userData = await listUsers(token);
      setManagers(userData.filter((entry) => entry.role === "MANAGER"));
      setRegionalManagers(userData.filter((entry) => entry.role === "REGIONAL_MANAGER"));
      setSalesReps(userData.filter((entry) => entry.role === "SALES_REP"));
      setManagerId(user.managerId ?? "");
      setSalesRepIds([user.id]);
    } else if (isRegionalManager && user?.id) {
      setRegionalManagerId(user.id);
      setSalesReps(usersData.filter((entry) => entry.role === "SALES_REP"));
    } else {
      setSalesReps(usersData.filter((entry) => entry.role === "SALES_REP"));
    }
  }, [token, isManager, isSalesRep, isRegionalManager, user]);

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
            const [currencyRows, regionRows, projects, customers] = await Promise.all([
              listActiveCurrencies(token),
              listActiveRegionDefaults(token),
              listProjects(token),
              listCustomers(token),
            ]);
            setCurrencies(currencyRows);
            setRegionDefaults(Object.fromEntries(regionRows.map((row) => [row.name, row.defaultCurrencyCode])));
            setKnownProjects(projects);
            setCatalogCustomers(customers.map((row) => row.name));
          } catch {
            setCurrencies([{ code: "AED", name: "UAE Dirham", rateToAed: 1 }]);
          }
        }
        if (id && token) {
          fillFromProject(await getProject(token, id));
        } else if (isManager && user?.id) {
          setManagerId(user.id);
        } else if (isSalesRep && user?.id) {
          setManagerId(user.managerId ?? "");
          setSalesRepIds([user.id]);
        } else if (isRegionalManager && user?.id) {
          setRegionalManagerId(user.id);
        }
      } catch {
        setError("Failed to load project.");
      } finally {
        setLoading(false);
      }
    })();
  }, [canManage, id, isManager, isRegionalManager, isSalesRep, loadPeople, router, token, user?.id, user?.managerId]);

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
    setStage(project.stage === "Approved" ? "PO Expected" : project.stage);
    setValue(formatNumberForInput(effectiveValueLocal(project)));
    setCurrencyCode(project.currencyCode || "AED");
    setItemQuantity(formatNumberForInput(project.itemQuantity));
    setSpecThickness(project.specThickness ?? "");
    setSpecCore(project.specCore ?? "");
    setSpecPaintType(project.specPaintType ?? "");
    setLat(String(project.lat));
    setLng(String(project.lng));
    setProbability(String(project.probability ?? 0));
    setCompetitor(project.competitor ?? "");
    setDaysInStage(project.daysInStage ?? 1);
    setLocationQuery(project.city);
    setRegionalManagerId(project.regionalManagerId ?? (isRegionalManager && user?.id ? user.id : ""));
    setManagerId(project.managerId ?? (isManager && user?.id ? user.id : ""));
    setSalesRepIds(project.salesRepIds);
    setConvertedById(project.convertedById ?? "");
  }

  const countryOptionList = useMemo(() => countryOptions(country), [country]);
  const cityOptionList = useMemo(
    () =>
      citiesForCountry(country, {
        existingCity: city,
        projectCities: projectCitiesForCountry(knownProjects, country),
      }),
    [country, city, knownProjects],
  );

  const filteredCountrySuggestions = useMemo(() => {
    const query = country.trim().toLowerCase();
    const matches = query
      ? countryOptionList.filter((entry) => entry.toLowerCase().includes(query))
      : countryOptionList;
    return matches.slice(0, 8);
  }, [country, countryOptionList]);

  const filteredCitySuggestions = useMemo(() => {
    if (!country.trim()) return [];
    const query = city.trim().toLowerCase();
    const matches = query
      ? cityOptionList.filter((entry) => entry.toLowerCase().includes(query))
      : cityOptionList;
    return matches.slice(0, 8);
  }, [country, city, cityOptionList]);

  const customerOptions = useMemo(
    () =>
      uniqueCustomerNames([
        ...catalogCustomers.map((entry) => ({ developer: entry })),
        ...extraCustomers.map((entry) => ({ developer: entry })),
        ...(developer.trim() ? [{ developer }] : []),
      ]),
    [catalogCustomers, extraCustomers, developer],
  );

  const [customerQuery, setCustomerQuery] = useState("");
  const filteredCustomerSuggestions = useMemo(() => {
    const query = customerQuery.trim().toLowerCase();
    const matches = query
      ? customerOptions.filter((entry) => entry.toLowerCase().includes(query))
      : customerOptions;
    return matches.slice(0, 12);
  }, [customerOptions, customerQuery]);

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

  const regionalManagerForForm =
    isRegionalManager && user?.id ? user.id : regionalManagerId;
  const managerForForm = isManager && user?.id ? user.id : managerId;

  const converterOptions = useMemo(() => {
    const selectedManager = managers.find((entry) => entry.id === managerForForm);
    const selectedRegional = regionalManagers.find((entry) => entry.id === regionalManagerForForm);
    return buildConverterOptions({
      salesRepIds,
      salesRepNames: salesRepIds.map((id) => {
        const rep = salesReps.find((entry) => entry.id === id);
        return rep ? `${rep.firstName} ${rep.lastName}`.trim() : "Sales rep";
      }),
      managerId: managerForForm || null,
      managerName: selectedManager
        ? `${selectedManager.firstName} ${selectedManager.lastName}`.trim()
        : "",
      regionalManagerId: regionalManagerForForm || null,
      regionalManagerName: selectedRegional
        ? `${selectedRegional.firstName} ${selectedRegional.lastName}`.trim()
        : "",
    });
  }, [
    salesRepIds,
    salesReps,
    managers,
    regionalManagers,
    managerForForm,
    regionalManagerForForm,
  ]);

  function handleCountryChange(nextCountry: string) {
    const countryChanged = normalizeCountryName(country) !== normalizeCountryName(nextCountry);
    setCountry(nextCountry);
    if (countryChanged) setCity("");
    if (!editing) {
      setCurrencyCode(defaultCurrencyForCountry(normalizeCountryName(nextCountry) || nextCountry));
    }
  }

  function handleCityChange(nextCity: string) {
    setCity(nextCity);
    setLocationQuery(nextCity);
  }

  function pickLocationFromMap(nextLat: number, nextLng: number) {
    setLocationSearchError(null);
    setLat(nextLat.toFixed(5));
    setLng(nextLng.toFixed(5));
  }

  async function searchLocation() {
    const query = locationQuery.trim();
    if (!query) {
      setLocationSearchError("Enter a place to search.");
      return;
    }
    setLocationSearchLoading(true);
    setLocationSearchError(null);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&accept-language=en&q=${encodeURIComponent(query)}`,
        { headers: { Accept: "application/json" } },
      );
      if (!response.ok) throw new Error("Location lookup failed");
      const results = (await response.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
      const first = results[0];
      if (!first) {
        setLocationSearchError("No location found. Try city, address, or country name.");
        return;
      }
      const parsedLat = Number(first.lat);
      const parsedLng = Number(first.lon);
      if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
        setLocationSearchError("Location result is invalid.");
        return;
      }
      pickLocationFromMap(parsedLat, parsedLng);
      if (first.display_name) {
        setLocationQuery(first.display_name.split(",")[0] ?? first.display_name);
      }
    } catch {
      setLocationSearchError("Unable to search location right now.");
    } finally {
      setLocationSearchLoading(false);
    }
  }

  function toggleRep(repId: string) {
    setSalesRepIds((current) =>
      current.includes(repId) ? current.filter((entry) => entry !== repId) : [...current, repId],
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
      const parsedProbability = Math.max(0, Math.min(100, Number(probability)));

      if (!name.trim() || !city.trim() || !country.trim()) {
        throw new Error("Fill project name, country, and city.");
      }
      const customerName = developer.trim();
      if (
        !customerName ||
        !customerOptions.some((entry) => entry.toLowerCase() === customerName.toLowerCase())
      ) {
        throw new Error("Select a customer from the list, or add a new one.");
      }
      if (requiresCommercialDetails(stage)) {
        if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
          throw new Error("Total project value must be greater than 0.");
        }
        if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
          throw new Error("Total project quantity must be greater than 0.");
        }
        if (!commercialSpecsComplete(specThickness, specCore, specPaintType)) {
          throw new Error("Select thickness, core, and paint type.");
        }
      }
      if (stage === "Won" && !convertedById) {
        throw new Error("Select who converted this project.");
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
        lat: Number.isFinite(parsedLat) ? parsedLat : 0,
        lng: Number.isFinite(parsedLng) ? parsedLng : 0,
        probability: Number.isFinite(parsedProbability) ? parsedProbability : 0,
        daysInStage,
        competitor: competitor.trim() || null,
        regionalManagerId:
          isRegionalManager && user?.id
            ? user.id
            : normalizeOptionalId(regionalManagerForForm),
        managerId:
          isManager && user?.id
            ? user.id
            : isSalesRep
              ? normalizeOptionalId(user?.managerId ?? managerForForm)
              : normalizeOptionalId(managerForForm),
        salesRepIds:
          isSalesRep && user?.id
            ? salesRepIds.length > 0
              ? salesRepIds
              : [user.id]
            : salesRepIds,
        convertedById: stage === "Won" ? convertedById || null : null,
      };

      const saved =
        editing && id ? await updateProject(token, id, payload) : await createProject(token, payload);
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
      <Stack.Screen options={{ title: editing ? "Edit project" : "Add project" }} />
      <KeyboardAvoidingView
        style={[styles.screen, { backgroundColor: colors.bg }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <FormInput
            value={name}
            onChangeText={setName}
            placeholder="Project name"
            colors={colors}
          />

          <SuggestionField
            value={country}
            onChangeText={handleCountryChange}
            placeholder="Select country"
            suggestions={filteredCountrySuggestions}
            onSelectSuggestion={handleCountryChange}
            colors={colors}
          />

          <SuggestionField
            value={city}
            onChangeText={handleCityChange}
            placeholder={country.trim() ? "Select or search city" : "Select country first"}
            suggestions={filteredCitySuggestions}
            onSelectSuggestion={setCity}
            editable={Boolean(country.trim())}
            colors={colors}
          />

          <View>
            <View style={styles.customerRow}>
              <View style={styles.half}>
                <FormInput
                  value={customerQuery}
                  onChangeText={setCustomerQuery}
                  placeholder={developer.trim() ? `Selected: ${developer}` : "Search customer"}
                  colors={colors}
                />
              </View>
              <Pressable
                onPress={() => {
                  setAddingCustomer((prev) => !prev);
                  setNewCustomerDraft("");
                }}
                style={[
                  styles.addCustomerBtn,
                  {
                    backgroundColor: addingCustomer ? colors.brand : colors.surface2,
                    borderColor: addingCustomer ? colors.brand : colors.border,
                  },
                ]}
                accessibilityLabel={addingCustomer ? "Cancel add customer" : "Add customer"}
              >
                <Text style={{ color: addingCustomer ? "#fff" : colors.text, fontWeight: "700", fontSize: 18 }}>
                  {addingCustomer ? "×" : "+"}
                </Text>
              </Pressable>
            </View>
            {developer.trim() ? (
              <Text style={[styles.hint, { color: colors.text3, marginTop: 4 }]}>
                Customer: {developer}
              </Text>
            ) : null}
            {filteredCustomerSuggestions.length > 0 ? (
              <View style={[stylesStatic.suggestions, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                {filteredCustomerSuggestions.map((entry) => (
                  <View
                    key={entry}
                    style={[stylesStatic.suggestionItem, { borderBottomColor: colors.border, flexDirection: "row", alignItems: "center" }]}
                  >
                    <Pressable
                      onPress={() => {
                        setDeveloper(entry);
                        setCustomerQuery("");
                      }}
                      style={{ flex: 1, paddingVertical: 2 }}
                    >
                      <Text style={{ color: colors.text, fontSize: 14 }}>{entry}</Text>
                    </Pressable>
                    {canManage ? (
                      <View style={{ flexDirection: "row", gap: 4 }}>
                        <Pressable
                          onPress={() => {
                            setAddingCustomer(false);
                            setEditingCustomer(entry);
                            setEditCustomerDraft(entry);
                          }}
                          hitSlop={8}
                        >
                          <Pencil size={14} color={colors.text3} strokeWidth={2.2} />
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            const persisted = catalogCustomers.some(
                              (name) => name.trim().toLowerCase() === entry.toLowerCase(),
                            );
                            Alert.alert(
                              "Move to trash",
                              persisted
                                ? `Move “${entry}” to trash? Projects keep this name; restore from Trash. Permanent delete is admin-only.`
                                : `Remove “${entry}” from the list?`,
                              [
                                { text: "Cancel", style: "cancel" },
                                {
                                  text: "Move to trash",
                                  style: "destructive",
                                  onPress: () =>
                                    void (async () => {
                                      if (!token) return;
                                      try {
                                        if (persisted) {
                                          await trashCustomer(token, entry);
                                          const [projects, customers] = await Promise.all([
                                            listProjects(token),
                                            listCustomers(token),
                                          ]);
                                          setKnownProjects(projects);
                                          setCatalogCustomers(customers.map((row) => row.name));
                                        } else {
                                          setExtraCustomers((prev) =>
                                            prev.filter((item) => item.toLowerCase() !== entry.toLowerCase()),
                                          );
                                        }
                                        if (developer.toLowerCase() === entry.toLowerCase()) {
                                          setDeveloper("");
                                        }
                                      } catch (err) {
                                        setError(err instanceof Error ? err.message : "Failed to move customer to trash.");
                                      }
                                    })(),
                                },
                              ],
                            );
                          }}
                          hitSlop={8}
                        >
                          <Trash2 size={14} color={colors.danger} strokeWidth={2.2} />
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.hint, { color: colors.text3, marginTop: 6 }]}>
                {customerOptions.length === 0
                  ? "No customers yet — tap + to add one."
                  : "No matches. Tap + to add a new customer."}
              </Text>
            )}
            {addingCustomer ? (
              <View style={[styles.addCustomerPanel, { borderColor: colors.border, backgroundColor: colors.surface2 }]}>
                <FormInput
                  value={newCustomerDraft}
                  onChangeText={setNewCustomerDraft}
                  placeholder="New customer name"
                  colors={colors}
                />
                <Pressable
                  onPress={() =>
                    void (async () => {
                      const name = newCustomerDraft.trim();
                      if (!name) {
                        setError("Enter a customer name.");
                        return;
                      }
                      const existing = customerOptions.find(
                        (entry) => entry.toLowerCase() === name.toLowerCase(),
                      );
                      if (existing) {
                        setError(`“${existing}” already exists.`);
                        return;
                      }
                      if (!token) return;
                      try {
                        const created = await createCustomer(token, name);
                        const customers = await listCustomers(token);
                        setCatalogCustomers(customers.map((row) => row.name));
                        setExtraCustomers((prev) =>
                          prev.some((entry) => entry.toLowerCase() === created.name.toLowerCase())
                            ? prev
                            : [...prev, created.name],
                        );
                        setDeveloper(created.name);
                        setCustomerQuery("");
                        setAddingCustomer(false);
                        setNewCustomerDraft("");
                        setError(null);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Failed to add customer.");
                      }
                    })()
                  }
                  style={[styles.addCustomerSave, { backgroundColor: colors.brand }]}
                >
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Add customer</Text>
                </Pressable>
              </View>
            ) : null}
            {editingCustomer ? (
              <View style={[styles.addCustomerPanel, { borderColor: colors.border, backgroundColor: colors.surface2 }]}>
                <Text style={[styles.hint, { color: colors.text3 }]}>
                  Rename “{editingCustomer}” on all projects
                </Text>
                <FormInput
                  value={editCustomerDraft}
                  onChangeText={setEditCustomerDraft}
                  placeholder="Customer name"
                  colors={colors}
                />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable
                    onPress={() => {
                      setEditingCustomer(null);
                      setEditCustomerDraft("");
                    }}
                    style={[styles.addCustomerSave, { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
                  >
                    <Text style={{ color: colors.text, fontWeight: "700", fontSize: 13 }}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      void (async () => {
                        const name = editCustomerDraft.trim();
                        if (!name || !token || !editingCustomer) return;
                        if (name.toLowerCase() === editingCustomer.toLowerCase()) {
                          setError("New name must be different.");
                          return;
                        }
                        const conflict = customerOptions.find(
                          (entry) =>
                            entry.toLowerCase() === name.toLowerCase() &&
                            entry.toLowerCase() !== editingCustomer.toLowerCase(),
                        );
                        if (conflict) {
                          setError(`“${conflict}” already exists.`);
                          return;
                        }
                        const persisted = catalogCustomers.some(
                          (entry) => entry.trim().toLowerCase() === editingCustomer.toLowerCase(),
                        );
                        try {
                          if (persisted) {
                            await renameCustomer(token, editingCustomer, name);
                            const [projects, customers] = await Promise.all([
                              listProjects(token),
                              listCustomers(token),
                            ]);
                            setKnownProjects(projects);
                            setCatalogCustomers(customers.map((row) => row.name));
                          } else {
                            setExtraCustomers((prev) =>
                              prev.map((item) =>
                                item.toLowerCase() === editingCustomer.toLowerCase() ? name : item,
                              ),
                            );
                          }
                          if (developer.toLowerCase() === editingCustomer.toLowerCase()) {
                            setDeveloper(name);
                          }
                          setEditingCustomer(null);
                          setEditCustomerDraft("");
                          setError(null);
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Failed to rename customer.");
                        }
                      })()
                    }
                    style={[styles.addCustomerSave, { flex: 1, backgroundColor: colors.brand }]}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Save</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>

          {canSetDivision ? (
            <FormSelect
              value={businessDivision}
              placeholder="Business division (optional)"
              options={BUSINESS_DIVISIONS.map((entry) => ({ value: entry, label: entry }))}
              onChange={(next) => setBusinessDivision(next as (typeof BUSINESS_DIVISIONS)[number] | "")}
              allowEmpty
            />
          ) : null}

          <FormSelect
            value={stage}
            placeholder="Stage"
            options={PIPELINE_VISIBLE_STAGES.map((entry) => ({
              value: entry,
              label: stageTitle(entry),
            }))}
            onChange={setStage}
          />

          {stage === "Won" ? (
            <View style={[styles.converterBox, { borderColor: "rgba(16,185,129,0.35)", backgroundColor: "rgba(16,185,129,0.08)" }]}>
              <Text style={[styles.converterTitle, { color: colors.text1 }]}>Who converted this project? *</Text>
              <Text style={{ color: colors.text3, fontSize: 12, marginBottom: 8 }}>
                This person gets the win credit on Field Team.
              </Text>
              {converterOptions.length === 0 ? (
                <Text style={{ color: colors.danger, fontSize: 12 }}>
                  Assign a sales rep, manager, or regional manager first.
                </Text>
              ) : (
                converterOptions.map((option) => {
                  const selected = convertedById === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => setConvertedById(option.id)}
                      style={[
                        styles.converterOption,
                        {
                          borderColor: selected ? colors.brand : colors.border,
                          backgroundColor: selected ? "rgba(227,6,19,0.08)" : colors.surface,
                        },
                      ]}
                    >
                      <Text style={{ color: colors.text1, fontWeight: "700", fontSize: 14 }}>{option.name}</Text>
                      <Text style={{ color: colors.text3, fontSize: 11, marginTop: 2 }}>{option.roleLabel}</Text>
                    </Pressable>
                  );
                })
              )}
            </View>
          ) : null}

          <ProjectCommercialFields
            value={value}
            currencyCode={currencyCode}
            currencies={currencies}
            itemQuantity={itemQuantity}
            specThickness={specThickness}
            specCore={specCore}
            specPaintType={specPaintType}
            onValueChange={setValue}
            onCurrencyCodeChange={setCurrencyCode}
            onItemQuantityChange={setItemQuantity}
            onSpecThicknessChange={setSpecThickness}
            onSpecCoreChange={setSpecCore}
            onSpecPaintTypeChange={setSpecPaintType}
            showSpecifications={requiresCommercialDetails(stage)}
          />

          {requiresCommercialDetails(stage) ? (
            <Text style={[styles.hint, { color: "#d97706" }]}>
              Quotation stage and later require total value, quantity (m²), and specifications.
            </Text>
          ) : null}

          <View style={styles.row}>
            <FormInput
              value={lat}
              onChangeText={setLat}
              placeholder="Latitude"
              keyboardType="decimal-pad"
              colors={colors}
              style={styles.half}
            />
            <FormInput
              value={lng}
              onChangeText={setLng}
              placeholder="Longitude"
              keyboardType="decimal-pad"
              colors={colors}
              style={styles.half}
            />
          </View>

          <FormInput
            value={probability}
            onChangeText={setProbability}
            placeholder="Probability (%)"
            keyboardType="number-pad"
            colors={colors}
          />

          <FormInput
            value={competitor}
            onChangeText={setCompetitor}
            placeholder="Competitor (optional)"
            colors={colors}
          />

          <FormSelect
            value={regionalManagerForForm}
            placeholder={isRegionalManager ? "Your regional profile" : "Assign regional manager (optional)"}
            options={regionalManagers.map((entry) => ({
              value: entry.id,
              label: `${entry.firstName} ${entry.lastName}`,
            }))}
            onChange={(next) => {
              setRegionalManagerId(next);
              if (!isManager) setManagerId("");
              setSalesRepIds([]);
            }}
            disabled={isRegionalManager}
            allowEmpty
          />

          <FormSelect
            value={managerForForm}
            placeholder={isManager ? "Your manager profile" : "Assign manager (optional)"}
            options={managersUnderRegional.map((entry) => ({
              value: entry.id,
              label: `${entry.firstName} ${entry.lastName}`,
            }))}
            onChange={(next) => {
              setManagerId(next);
              setSalesRepIds([]);
            }}
            disabled={isManager}
            allowEmpty
          />

          <View style={[styles.repPanel, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
            <Text style={[styles.repTitle, { color: colors.text }]}>Assign sales reps (optional)</Text>
            {repsUnderManager.length === 0 ? (
              <Text style={[styles.repEmpty, { color: colors.text3 }]}>
                No sales reps match the selected regional manager or manager.
              </Text>
            ) : (
              repsUnderManager.map((entry) => {
                const checked = salesRepIds.includes(entry.id);
                return (
                  <Pressable
                    key={entry.id}
                    style={[
                      styles.repRow,
                      {
                        borderColor: checked ? colors.brand : colors.border,
                        backgroundColor: checked ? "rgba(227, 6, 19, 0.08)" : colors.surface,
                      },
                    ]}
                    onPress={() => toggleRep(entry.id)}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: checked ? colors.brand : colors.border,
                          backgroundColor: checked ? colors.brand : "transparent",
                        },
                      ]}
                    />
                    <Text style={[styles.repName, { color: colors.text }]}>
                      {entry.firstName} {entry.lastName}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </View>

          <View style={styles.mapSection}>
            <View style={styles.row}>
              <FormInput
                value={locationQuery}
                onChangeText={setLocationQuery}
                placeholder="Search place or address"
                colors={colors}
                style={styles.mapSearch}
              />
              <Pressable
                style={[styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => void searchLocation()}
                disabled={locationSearchLoading}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                  {locationSearchLoading ? "Searching..." : "Go"}
                </Text>
              </Pressable>
            </View>
            <View style={styles.mapHint}>
              <MapPin size={14} color={colors.text2} strokeWidth={2.2} />
              <Text style={[styles.mapHintText, { color: colors.text2 }]}>
                Tap map or drag marker to set location
              </Text>
            </View>
            <View style={[styles.mapWrap, { borderColor: colors.border }]}>
              <LocationPickerMap
                lat={lat.trim() === "" ? null : Number(lat)}
                lng={lng.trim() === "" ? null : Number(lng)}
                onPick={pickLocationFromMap}
                height={240}
              />
            </View>
            {locationSearchError ? (
              <Text style={[styles.error, { color: colors.danger }]}>{locationSearchError}</Text>
            ) : null}
          </View>

          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <Pressable
            style={[styles.footerSecondary, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.back()}
            disabled={saving}
          >
            <Text style={[styles.footerSecondaryText, { color: colors.text }]}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.footerPrimary, { backgroundColor: colors.brand, opacity: saving ? 0.7 : 1 }]}
            onPress={() => void onSave()}
            disabled={saving}
          >
            <Text style={styles.footerPrimaryText}>
              {saving ? "Saving..." : editing ? "Save changes" : "Create project"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

function FormInput({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  editable = true,
  colors,
  style,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "decimal-pad" | "number-pad";
  editable?: boolean;
  colors: ThemeColors;
  style?: object;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.text3}
      keyboardType={keyboardType}
      editable={editable}
      style={[
        {
          height: 40,
          borderRadius: 12,
          paddingHorizontal: 12,
          fontSize: 14,
          backgroundColor: colors.surface2,
          color: colors.text,
          opacity: editable ? 1 : 0.5,
        },
        style,
      ]}
    />
  );
}

function SuggestionField({
  value,
  onChangeText,
  placeholder,
  suggestions,
  onSelectSuggestion,
  editable = true,
  colors,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  suggestions: string[];
  onSelectSuggestion: (value: string) => void;
  editable?: boolean;
  colors: ThemeColors;
}) {
  return (
    <View>
      <FormInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        editable={editable}
        colors={colors}
      />
      {suggestions.length > 0 ? (
        <View style={[stylesStatic.suggestions, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          {suggestions.map((entry) => (
            <Pressable
              key={entry}
              onPress={() => onSelectSuggestion(entry)}
              style={[stylesStatic.suggestionItem, { borderBottomColor: colors.border }]}
            >
              <Text style={{ color: colors.text, fontSize: 14 }}>{entry}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const stylesStatic = StyleSheet.create({
  suggestions: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
});

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    content: {
      padding: 16,
      paddingBottom: 24,
      gap: 12,
    },
    row: {
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
    },
    half: {
      flex: 1,
    },
    customerRow: {
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
    },
    addCustomerBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    converterBox: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      gap: 8,
    },
    converterTitle: {
      fontSize: 13,
      fontWeight: "700",
    },
    converterOption: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    addCustomerPanel: {
      marginTop: 8,
      borderWidth: 1,
      borderRadius: 12,
      padding: 10,
      gap: 8,
    },
    addCustomerSave: {
      height: 40,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    hint: {
      fontSize: 11,
      lineHeight: 16,
    },
    repPanel: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      gap: 8,
    },
    repTitle: {
      fontSize: 12,
      fontWeight: "700",
    },
    repEmpty: {
      fontSize: 12,
    },
    repRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
    checkbox: {
      width: 16,
      height: 16,
      borderRadius: 4,
      borderWidth: 1,
    },
    repName: {
      fontSize: 12,
      fontWeight: "500",
    },
    mapSection: {
      gap: 8,
    },
    mapSearch: {
      flex: 1,
    },
    secondaryButton: {
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryButtonText: {
      fontSize: 12,
      fontWeight: "600",
    },
    mapHint: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    mapHintText: {
      fontSize: 12,
    },
    mapWrap: {
      borderWidth: 1,
      borderRadius: 16,
      overflow: "hidden",
    },
    error: {
      fontSize: 12,
    },
    footer: {
      borderTopWidth: 1,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 24,
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 8,
    },
    footerSecondary: {
      flex: 1,
      height: 36,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    footerSecondaryText: {
      fontSize: 12,
      fontWeight: "600",
    },
    footerPrimary: {
      flex: 1,
      height: 36,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    footerPrimaryText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "700",
    },
  });
}
