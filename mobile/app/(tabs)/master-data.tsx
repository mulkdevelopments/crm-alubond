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
import { Pencil, Plus, ShieldAlert, X } from "lucide-react-native";

import { MasterDataTable } from "@/components/master-data/MasterDataTable";
import { ScreenLoader } from "@/components/ScreenLoader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { FormSelect } from "@/components/ui/FormSelect";
import { PageHeader } from "@/components/ui/PageHeader";
import { ThemeColors, useThemeColors } from "@/constants/theme";
import {
  createMasterCurrency,
  createMasterRegion,
  listMasterCurrencies,
  listMasterRegions,
  updateMasterCurrency,
  updateMasterRegion,
  type MasterCurrencyItem,
  type MasterRegionItem,
} from "@/lib/api/master-data-api";
import { useAuth } from "@/lib/auth/AuthContext";

function MasterInput({
  value,
  onChangeText,
  colors,
  styles,
  style,
  ...props
}: {
  value: string;
  onChangeText: (value: string) => void;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  placeholder?: string;
  keyboardType?: "default" | "numeric";
  autoCapitalize?: "none" | "characters";
  maxLength?: number;
  style?: object;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholderTextColor={colors.text3}
      style={[
        styles.input,
        { backgroundColor: colors.surface2, borderColor: colors.border, color: colors.text },
        style,
      ]}
      {...props}
    />
  );
}

export default function MasterDataScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { token, user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [regions, setRegions] = useState<MasterRegionItem[]>([]);
  const [currencies, setCurrencies] = useState<MasterCurrencyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [newRegionName, setNewRegionName] = useState("");
  const [newRegionCurrency, setNewRegionCurrency] = useState("AED");
  const [newCurrencyCode, setNewCurrencyCode] = useState("");
  const [newCurrencyName, setNewCurrencyName] = useState("");
  const [newCurrencyRate, setNewCurrencyRate] = useState("");

  const [editingRegion, setEditingRegion] = useState<MasterRegionItem | null>(null);
  const [editRegionName, setEditRegionName] = useState("");
  const [editRegionCurrency, setEditRegionCurrency] = useState("AED");

  const [editingCurrency, setEditingCurrency] = useState<MasterCurrencyItem | null>(null);
  const [editCurrencyName, setEditCurrencyName] = useState("");
  const [editCurrencyRate, setEditCurrencyRate] = useState("");

  const activeRegions = useMemo(() => regions.filter((entry) => entry.isActive), [regions]);
  const activeCurrencies = useMemo(() => currencies.filter((entry) => entry.isActive), [currencies]);
  const currencyOptions = useMemo(
    () => (activeCurrencies.length > 0 ? activeCurrencies : currencies),
    [activeCurrencies, currencies],
  );

  const loadData = useCallback(async () => {
    if (!token || !isAdmin) return;
    const [regionRows, currencyRows] = await Promise.all([
      listMasterRegions(token),
      listMasterCurrencies(token),
    ]);
    setRegions(regionRows);
    setCurrencies(currencyRows);
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
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to load master data.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdmin, loadData]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load master data.");
    } finally {
      setRefreshing(false);
    }
  }

  async function onCreateCurrency() {
    if (!token || !newCurrencyCode.trim() || !newCurrencyName.trim()) return;
    const rate = Number(newCurrencyRate);
    if (!Number.isFinite(rate) || rate <= 0) {
      setMessage("FX rate must be a positive number (local units per 1 AED).");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await createMasterCurrency(token, {
        code: newCurrencyCode.trim().toUpperCase(),
        name: newCurrencyName.trim(),
        rateToAed: rate,
      });
      setNewCurrencyCode("");
      setNewCurrencyName("");
      setNewCurrencyRate("");
      await loadData();
      setMessage("Currency added.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to add currency.");
    } finally {
      setSaving(false);
    }
  }

  async function onCreateRegion() {
    if (!token || !newRegionName.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      await createMasterRegion(token, {
        name: newRegionName.trim(),
        defaultCurrencyCode: newRegionCurrency,
      });
      setNewRegionName("");
      setNewRegionCurrency("AED");
      await loadData();
      setMessage("Region added.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to add region.");
    } finally {
      setSaving(false);
    }
  }

  async function onSaveRegionEdit() {
    if (!token || !editingRegion || !editRegionName.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateMasterRegion(token, editingRegion.id, {
        name: editRegionName.trim(),
        defaultCurrencyCode: editRegionCurrency,
      });
      setEditingRegion(null);
      await loadData();
      setMessage("Region updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update region.");
    } finally {
      setSaving(false);
    }
  }

  async function onSaveCurrencyEdit() {
    if (!token || !editingCurrency || !editCurrencyName.trim()) return;
    const rate = Number(editCurrencyRate);
    if (!Number.isFinite(rate) || rate <= 0) {
      setMessage("FX rate must be a positive number (local units per 1 AED).");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await updateMasterCurrency(token, editingCurrency.id, {
        name: editCurrencyName.trim(),
        rateToAed: rate,
      });
      setEditingCurrency(null);
      await loadData();
      setMessage("Currency updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update currency.");
    } finally {
      setSaving(false);
    }
  }

  async function onToggleRegionActive(region: MasterRegionItem) {
    if (!token) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateMasterRegion(token, region.id, { isActive: !region.isActive });
      await loadData();
      setMessage(region.isActive ? "Region deactivated." : "Region activated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update region status.");
    } finally {
      setSaving(false);
    }
  }

  async function onToggleCurrencyActive(currency: MasterCurrencyItem) {
    if (!token) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateMasterCurrency(token, currency.id, { isActive: !currency.isActive });
      await loadData();
      setMessage(currency.isActive ? "Currency deactivated." : "Currency activated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update currency status.");
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <PageHeader title="Master Data" subtitle="Admin only" />
          <Card style={styles.accessCard}>
            <View style={styles.accessRow}>
              <ShieldAlert size={20} color="#d97706" strokeWidth={2.2} />
              <Text style={[styles.accessBody, { color: colors.text2 }]}>
                You need admin access to manage master data.
              </Text>
            </View>
          </Card>
        </ScrollView>
      </View>
    );
  }

  if (loading) return <ScreenLoader label="Loading master data..." />;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader
          title="Master Data"
          subtitle="Operating regions, default currencies, and FX rates used across projects."
        />

        <Card>
          <CardHeader
            title="Currencies & FX rates"
            subtitle={`${activeCurrencies.length} active ${activeCurrencies.length === 1 ? "currency" : "currencies"}. Rates are local units per 1 AED; locked when a project is saved.`}
          />
          <View style={styles.cardBody}>
            <View style={styles.formGrid}>
              <View style={styles.formRow}>
                <MasterInput
                  value={newCurrencyCode}
                  onChangeText={(value) => setNewCurrencyCode(value.toUpperCase())}
                  placeholder="Code (e.g. SAR)"
                  autoCapitalize="characters"
                  maxLength={3}
                  colors={colors}
                  styles={styles}
                  style={styles.formHalf}
                />
                <MasterInput
                  value={newCurrencyName}
                  onChangeText={setNewCurrencyName}
                  placeholder="Currency name"
                  colors={colors}
                  styles={styles}
                  style={styles.formHalf}
                />
              </View>
              <View style={styles.formRow}>
                <MasterInput
                  value={newCurrencyRate}
                  onChangeText={setNewCurrencyRate}
                  placeholder="Rate to AED (e.g. 1.02)"
                  keyboardType="numeric"
                  colors={colors}
                  styles={styles}
                  style={styles.formHalf}
                />
                <Pressable
                  style={[
                    styles.primaryButton,
                    styles.formHalf,
                    { backgroundColor: colors.brand },
                    saving && styles.buttonDisabled,
                  ]}
                  onPress={() => void onCreateCurrency()}
                  disabled={saving}
                >
                  <Plus size={16} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.primaryButtonText}>Add currency</Text>
                </Pressable>
              </View>
            </View>

            {currencies.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.text3 }]}>
                No currencies yet. Add your first currency above.
              </Text>
            ) : (
              <MasterDataTable
                colors={colors}
                data={currencies}
                keyExtractor={(item) => item.id}
                columns={[
                  {
                    key: "code",
                    label: "Code",
                    flex: 0.8,
                    minWidth: 72,
                    render: (currency) => (
                      <Text style={[styles.cellStrong, { color: colors.text }]}>{currency.code}</Text>
                    ),
                  },
                  {
                    key: "name",
                    label: "Name",
                    flex: 1.4,
                    minWidth: 120,
                    render: (currency) => (
                      <Text style={[styles.cellText, { color: colors.text }]}>{currency.name}</Text>
                    ),
                  },
                  {
                    key: "rate",
                    label: "Rate to AED",
                    flex: 1,
                    minWidth: 96,
                    render: (currency) => (
                      <Text style={[styles.cellText, { color: colors.text }]}>
                        {currency.rateToAed.toLocaleString("en", { maximumFractionDigits: 6 })}
                      </Text>
                    ),
                  },
                  {
                    key: "status",
                    label: "Status",
                    flex: 0.9,
                    minWidth: 88,
                    render: (currency) => (
                      <Badge tone={currency.isActive ? "success" : "neutral"}>
                        {currency.isActive ? "Active" : "Inactive"}
                      </Badge>
                    ),
                  },
                  {
                    key: "actions",
                    label: "Actions",
                    flex: 1.6,
                    minWidth: 220,
                    align: "right",
                    render: (currency) => (
                      <View style={styles.tableActions}>
                        <Pressable
                          style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
                          onPress={() => {
                            setEditingCurrency(currency);
                            setEditCurrencyName(currency.name);
                            setEditCurrencyRate(String(currency.rateToAed));
                          }}
                        >
                          <Pencil size={14} color={colors.text} strokeWidth={2.2} />
                          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Edit rate</Text>
                        </Pressable>
                        <Pressable
                          style={[
                            styles.secondaryButton,
                            { borderColor: colors.border, backgroundColor: colors.surface },
                            (saving || currency.code === "AED") && styles.buttonDisabled,
                          ]}
                          disabled={saving || currency.code === "AED"}
                          onPress={() => void onToggleCurrencyActive(currency)}
                        >
                          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                            {currency.isActive ? "Deactivate" : "Activate"}
                          </Text>
                        </Pressable>
                      </View>
                    ),
                  },
                ]}
              />
            )}
          </View>
        </Card>

        <Card>
          <CardHeader
            title="Operating regions"
            subtitle={`${activeRegions.length} active ${activeRegions.length === 1 ? "region" : "regions"} available in user forms.`}
          />
          <View style={styles.cardBody}>
            <View style={styles.regionFormRow}>
              <MasterInput
                value={newRegionName}
                onChangeText={setNewRegionName}
                placeholder="New region name"
                colors={colors}
                styles={styles}
                style={styles.regionNameInput}
              />
              <FormSelect
                value={newRegionCurrency}
                options={currencyOptions.map((currency) => ({
                  value: currency.code,
                  label: currency.code,
                }))}
                onChange={setNewRegionCurrency}
                style={styles.regionCurrencySelect}
              />
              <Pressable
                style={[styles.primaryButton, { backgroundColor: colors.brand }, saving && styles.buttonDisabled]}
                onPress={() => void onCreateRegion()}
                disabled={saving}
              >
                <Plus size={16} color="#FFFFFF" strokeWidth={2.2} />
                <Text style={styles.primaryButtonText}>Add region</Text>
              </Pressable>
            </View>

            {regions.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.text3 }]}>
                No regions yet. Add your first operating region above.
              </Text>
            ) : (
              <MasterDataTable
                colors={colors}
                data={regions}
                keyExtractor={(item) => item.id}
                columns={[
                  {
                    key: "region",
                    label: "Region",
                    flex: 1.5,
                    minWidth: 140,
                    render: (region) => (
                      <Text style={[styles.cellStrong, { color: colors.text }]}>{region.name}</Text>
                    ),
                  },
                  {
                    key: "currency",
                    label: "Default currency",
                    flex: 1,
                    minWidth: 120,
                    render: (region) => (
                      <Text style={[styles.cellText, { color: colors.text }]}>
                        {region.defaultCurrencyCode}
                      </Text>
                    ),
                  },
                  {
                    key: "status",
                    label: "Status",
                    flex: 0.9,
                    minWidth: 88,
                    render: (region) => (
                      <Badge tone={region.isActive ? "success" : "neutral"}>
                        {region.isActive ? "Active" : "Inactive"}
                      </Badge>
                    ),
                  },
                  {
                    key: "actions",
                    label: "Actions",
                    flex: 1.4,
                    minWidth: 190,
                    align: "right",
                    render: (region) => (
                      <View style={styles.tableActions}>
                        <Pressable
                          style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
                          onPress={() => {
                            setEditingRegion(region);
                            setEditRegionName(region.name);
                            setEditRegionCurrency(region.defaultCurrencyCode);
                          }}
                        >
                          <Pencil size={14} color={colors.text} strokeWidth={2.2} />
                          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Edit</Text>
                        </Pressable>
                        <Pressable
                          style={[
                            styles.secondaryButton,
                            { borderColor: colors.border, backgroundColor: colors.surface },
                            saving && styles.buttonDisabled,
                          ]}
                          disabled={saving}
                          onPress={() => void onToggleRegionActive(region)}
                        >
                          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                            {region.isActive ? "Deactivate" : "Activate"}
                          </Text>
                        </Pressable>
                      </View>
                    ),
                  },
                ]}
              />
            )}

            <Text style={[styles.footnote, { color: colors.text3 }]}>
              User forms on the{" "}
              <Text style={[styles.footnoteLink, { color: colors.brand }]} onPress={() => router.push("/(tabs)/users")}>
                Users
              </Text>{" "}
              page pull location and regional manager assignments from this list. Project forms default currency from
              the region/country mapping.
            </Text>
          </View>
        </Card>

        {message ? <Text style={[styles.message, { color: colors.text2 }]}>{message}</Text> : null}
      </ScrollView>

      <Modal visible={Boolean(editingRegion)} transparent animationType="fade" onRequestClose={() => setEditingRegion(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit region</Text>
              <Pressable style={[styles.closeButton, { backgroundColor: colors.surface2 }]} onPress={() => setEditingRegion(null)}>
                <X size={16} color={colors.text3} strokeWidth={2.2} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <MasterInput value={editRegionName} onChangeText={setEditRegionName} colors={colors} styles={styles} />
              <FormSelect
                value={editRegionCurrency}
                options={currencyOptions.map((currency) => ({
                  value: currency.code,
                  label: `${currency.code} · ${currency.name}`,
                }))}
                onChange={setEditRegionCurrency}
              />
              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.surface2 }]}
                  onPress={() => setEditingRegion(null)}
                >
                  <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryButton, { backgroundColor: colors.brand }, saving && styles.buttonDisabled]}
                  onPress={() => void onSaveRegionEdit()}
                  disabled={saving}
                >
                  <Text style={styles.primaryButtonText}>{saving ? "Saving..." : "Save"}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(editingCurrency)}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingCurrency(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Edit {editingCurrency?.code} FX rate
              </Text>
              <Pressable style={[styles.closeButton, { backgroundColor: colors.surface2 }]} onPress={() => setEditingCurrency(null)}>
                <X size={16} color={colors.text3} strokeWidth={2.2} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <MasterInput
                value={editCurrencyName}
                onChangeText={setEditCurrencyName}
                placeholder="Currency name"
                colors={colors}
                styles={styles}
              />
              <MasterInput
                value={editCurrencyRate}
                onChangeText={setEditCurrencyRate}
                placeholder="Rate to AED"
                keyboardType="numeric"
                colors={colors}
                styles={styles}
              />
              <Text style={[styles.footnote, { color: colors.text3 }]}>
                Existing projects keep their locked rate. New saves and edits use the current rate.
              </Text>
              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.surface2 }]}
                  onPress={() => setEditingCurrency(null)}
                >
                  <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryButton, { backgroundColor: colors.brand }, saving && styles.buttonDisabled]}
                  onPress={() => void onSaveCurrencyEdit()}
                  disabled={saving}
                >
                  <Text style={styles.primaryButtonText}>{saving ? "Saving..." : "Save"}</Text>
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
    accessBody: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
    },
    cardBody: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 16,
    },
    formGrid: {
      gap: 8,
    },
    formRow: {
      flexDirection: "row",
      gap: 8,
    },
    formHalf: {
      flex: 1,
      minWidth: 0,
    },
    regionFormRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      alignItems: "center",
    },
    regionNameInput: {
      flex: 1,
      minWidth: 160,
    },
    regionCurrencySelect: {
      width: 112,
    },
    input: {
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 12,
      fontSize: 14,
    },
    primaryButton: {
      height: 40,
      borderRadius: 12,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    primaryButtonText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "700",
    },
    secondaryButton: {
      height: 32,
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    secondaryButtonText: {
      fontSize: 11,
      fontWeight: "600",
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    emptyText: {
      fontSize: 13,
      lineHeight: 18,
    },
    cellStrong: {
      fontSize: 14,
      fontWeight: "700",
    },
    cellText: {
      fontSize: 14,
    },
    tableActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      justifyContent: "flex-end",
    },
    footnote: {
      fontSize: 12,
      lineHeight: 17,
    },
    footnoteLink: {
      textDecorationLine: "underline",
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
      flex: 1,
      paddingRight: 12,
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
      gap: 12,
    },
    modalActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 8,
    },
  });
}
