import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Filter, Layers, Plus, Search } from "lucide-react-native";

import { OptionSheet } from "@/components/pipeline/OptionSheet";
import {
  CommercialStagePrompt,
  createCommercialPromptState,
  validateCommercialPrompt,
  type CommercialPromptState,
} from "@/components/pipeline/CommercialStagePrompt";
import {
  createLossPromptState,
  LossStagePrompt,
  type LossPromptState,
} from "@/components/pipeline/LossStagePrompt";
import {
  WinStagePrompt,
  buildConverterOptions,
  createWinPromptState,
  type WinPromptState,
} from "@/components/pipeline/WinStagePrompt";
import { PipelineProjectCard } from "@/components/pipeline/PipelineProjectCard";
import { PipelineCustomerGroupList } from "@/components/pipeline/PipelineCustomerGroupList";
import { EmptyState, ScreenLoader } from "@/components/ScreenLoader";
import { ThemeColors, useThemeColors } from "@/constants/theme";
import { listActiveCurrencies, type ActiveCurrencyItem } from "@/lib/api/master-data-api";
import {
  BUSINESS_DIVISIONS,
  normalizePipelineStage,
  PIPELINE_VISIBLE_STAGES,
  stageDotColor,
  stageTitle,
  type Stage,
} from "@/lib/constants/stages";
import {
  deleteProject,
  listProjects,
  updateProject,
  type ApiProject,
} from "@/lib/api/projects-api";
import { useAuth, canManageProjects, canSetBusinessDivision } from "@/lib/auth/AuthContext";
import {
  commercialSpecsComplete,
  formatProjectSpecs,
  requiresCommercialDetails,
} from "@/lib/project-specs";
import { effectiveValueLocal, formatAed, parseFormattedNumber } from "@/lib/utils";
import { validateLossPrompt } from "@/lib/loss-reasons";
import { groupProjectsByCustomer } from "@/lib/group-projects-by-customer";

type DivisionFilter = "ALL" | "UNASSIGNED" | (typeof BUSINESS_DIVISIONS)[number];

function matchesProjectQuery(project: ApiProject, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return (
    project.name.toLowerCase().includes(normalized) ||
    project.city.toLowerCase().includes(normalized) ||
    project.developer.toLowerCase().includes(normalized)
  );
}

function matchesBusinessDivisionFilter(project: ApiProject, filter: DivisionFilter) {
  if (filter === "ALL") return true;
  if (filter === "UNASSIGNED") return !project.businessDivision?.trim();
  return project.businessDivision === filter;
}

function normalizeProjects(projects: ApiProject[]) {
  return projects.map((project) => ({
    ...project,
    stage: normalizePipelineStage(project.stage),
  }));
}

export default function PipelineScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { token, user } = useAuth();

  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [mobileStage, setMobileStage] = useState<Stage>("Lead Identified");
  const [divisionFilter, setDivisionFilter] = useState<DivisionFilter>("ALL");
  const [divisionSheetOpen, setDivisionSheetOpen] = useState(false);
  const [stageMoveProject, setStageMoveProject] = useState<ApiProject | null>(null);
  const [commercialPrompt, setCommercialPrompt] = useState<{
    project: ApiProject;
    prompt: CommercialPromptState;
  } | null>(null);
  const [lossPrompt, setLossPrompt] = useState<{
    project: ApiProject;
    prompt: LossPromptState;
  } | null>(null);
  const [winPrompt, setWinPrompt] = useState<{
    project: ApiProject;
    commercial: {
      value: number;
      currencyCode: string;
      itemQuantity: number;
      specThickness: string;
      specCore: string;
      specPaintType: string;
    };
    prompt: WinPromptState;
  } | null>(null);
  const [groupByCustomer, setGroupByCustomer] = useState(false);
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});
  const [currencies, setCurrencies] = useState<ActiveCurrencyItem[]>([]);

  const canCreate = canManageProjects(user?.role);
  const canSetDivision = canSetBusinessDivision(user);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    const items = await listProjects(token);
    setProjects(normalizeProjects(items));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void listActiveCurrencies(token)
      .then(setCurrencies)
      .catch(() => setCurrencies([{ code: "AED", name: "UAE Dirham", rateToAed: 1 }]));
  }, [token]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load projects.");
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const visibleProjects = useMemo(() => {
    return projects.filter((project) =>
      canSetDivision ? matchesBusinessDivisionFilter(project, divisionFilter) : true,
    );
  }, [projects, canSetDivision, divisionFilter]);

  const stageItems = useMemo(() => {
    return visibleProjects
      .filter((project) => project.stage === mobileStage)
      .filter((project) => matchesProjectQuery(project, query));
  }, [visibleProjects, mobileStage, query]);

  const stageTotal = useMemo(() => {
    return visibleProjects
      .filter((project) => project.stage === mobileStage)
      .reduce((sum, project) => sum + project.valueAed, 0);
  }, [visibleProjects, mobileStage]);

  useEffect(() => {
    if (!groupByCustomer || !query.trim()) return;
    setExpandedCustomers((prev) => {
      const next = { ...prev };
      for (const group of groupProjectsByCustomer(stageItems)) {
        next[group.customer] = true;
      }
      return next;
    });
  }, [groupByCustomer, query, stageItems]);

  function toggleCustomerExpanded(customer: string) {
    setExpandedCustomers((prev) => ({ ...prev, [customer]: !prev[customer] }));
  }

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh pipeline.");
    } finally {
      setRefreshing(false);
    }
  }

  function onTrash(project: ApiProject) {
    if (!token) return;
    Alert.alert(
      "Move to trash",
      `Move "${project.name}" to trash? You can restore it later from Trash.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Move to trash",
          style: "destructive",
          onPress: () =>
            void (async () => {
              try {
                await deleteProject(token, project.id);
                await load();
              } catch (err) {
                Alert.alert("Trash failed", err instanceof Error ? err.message : "Please try again.");
              }
            })(),
        },
      ],
    );
  }

  async function persistStageChange(
    project: ApiProject,
    nextStage: Stage,
    commercial: {
      value: number;
      currencyCode: string;
      itemQuantity: number;
      specThickness: string;
      specCore: string;
      specPaintType: string;
    },
    convertedById?: string | null,
  ) {
    if (!token) return;

    const nextDaysInStage = project.stage === nextStage ? project.daysInStage : 1;
    const itemName = commercialSpecsComplete(
      commercial.specThickness,
      commercial.specCore,
      commercial.specPaintType,
    )
      ? formatProjectSpecs(commercial.specThickness, commercial.specCore, commercial.specPaintType)
      : project.itemName;
    const nextConvertedById = nextStage === "Won" ? convertedById ?? project.convertedById : null;
    const nextConvertedByName =
      nextStage === "Won"
        ? buildConverterOptions(project).find((option) => option.id === nextConvertedById)?.name ??
          project.convertedByName
        : null;

    setProjects((current) =>
      current.map((entry) =>
        entry.id === project.id
          ? {
              ...entry,
              stage: nextStage,
              daysInStage: nextDaysInStage,
              valueLocal: commercial.value,
              currencyCode: commercial.currencyCode,
              itemQuantity: commercial.itemQuantity,
              specThickness: commercial.specThickness,
              specCore: commercial.specCore,
              specPaintType: commercial.specPaintType,
              itemName,
              convertedById: nextConvertedById,
              convertedByName: nextConvertedByName,
            }
          : entry,
      ),
    );

    await updateProject(token, project.id, {
      name: project.name,
      city: project.city,
      country: project.country,
      developer: project.developer,
      businessDivision: project.businessDivision,
      stage: nextStage,
      valueLocal: commercial.value,
      currencyCode: commercial.currencyCode,
      itemName,
      itemQuantity: commercial.itemQuantity,
      specThickness: commercial.specThickness,
      specCore: commercial.specCore,
      specPaintType: commercial.specPaintType,
      lat: project.lat,
      lng: project.lng,
      probability: project.probability,
      daysInStage: nextDaysInStage,
      competitor: project.competitor,
      lossReason: project.lossReason,
      regionalManagerId: project.regionalManagerId,
      managerId: project.managerId,
      salesRepIds: project.salesRepIds,
      convertedById: nextConvertedById,
    });
  }

  function requestStageChange(project: ApiProject, nextStage: Stage) {
    if (project.stage === nextStage) return;

    if (nextStage === "Lost") {
      setLossPrompt({
        project,
        prompt: createLossPromptState({ lossReason: project.lossReason, competitor: project.competitor }),
      });
      return;
    }

    if (requiresCommercialDetails(nextStage)) {
      setCommercialPrompt({
        project,
        prompt: createCommercialPromptState(nextStage, project),
      });
      return;
    }

    void persistStageChange(project, nextStage, {
      value: effectiveValueLocal(project),
      currencyCode: project.currencyCode || "AED",
      itemQuantity: project.itemQuantity,
      specThickness: project.specThickness,
      specCore: project.specCore,
      specPaintType: project.specPaintType,
    }).catch((err) => {
      void load();
      Alert.alert("Stage update failed", err instanceof Error ? err.message : "Please try again.");
    });
  }

  async function persistLossStageChange(
    project: ApiProject,
    loss: { lossReason: string; competitor: string | null },
  ) {
    if (!token) return;
    const nextStage: Stage = "Lost";
    const nextDaysInStage = project.stage === nextStage ? project.daysInStage : 1;
    const itemName =
      commercialSpecsComplete(project.specThickness ?? "", project.specCore ?? "", project.specPaintType ?? "")
        ? formatProjectSpecs(project.specThickness ?? "", project.specCore ?? "", project.specPaintType ?? "")
        : project.itemName;

    setProjects((current) =>
      current.map((entry) =>
        entry.id === project.id
          ? {
              ...entry,
              stage: nextStage,
              daysInStage: nextDaysInStage,
              probability: 0,
              lossReason: loss.lossReason,
              competitor: loss.competitor,
            }
          : entry,
      ),
    );

    await updateProject(token, project.id, {
      name: project.name,
      city: project.city,
      country: project.country,
      developer: project.developer,
      businessDivision: project.businessDivision,
      stage: nextStage,
      valueLocal: effectiveValueLocal(project),
      currencyCode: project.currencyCode || "AED",
      itemName,
      itemQuantity: project.itemQuantity,
      specThickness: project.specThickness,
      specCore: project.specCore,
      specPaintType: project.specPaintType,
      lat: project.lat,
      lng: project.lng,
      probability: 0,
      daysInStage: nextDaysInStage,
      competitor: loss.competitor,
      lossReason: loss.lossReason,
      regionalManagerId: project.regionalManagerId,
      managerId: project.managerId,
      salesRepIds: project.salesRepIds,
    });
  }

  async function submitLossPrompt() {
    if (!lossPrompt) return;

    const validationError = validateLossPrompt(lossPrompt.prompt);
    if (validationError) {
      setLossPrompt({
        ...lossPrompt,
        prompt: { ...lossPrompt.prompt, error: validationError },
      });
      return;
    }

    const lossReason = lossPrompt.prompt.reason.trim();
    const competitor = lossPrompt.prompt.winner.trim() || null;

    setLossPrompt({
      ...lossPrompt,
      prompt: { ...lossPrompt.prompt, error: null, saving: true },
    });

    try {
      await persistLossStageChange(lossPrompt.project, { lossReason, competitor });
      setLossPrompt(null);
    } catch {
      setLossPrompt({
        ...lossPrompt,
        prompt: {
          ...lossPrompt.prompt,
          saving: false,
          error: "Failed to update stage. Please retry.",
        },
      });
    }
  }

  async function submitCommercialPrompt() {
    if (!commercialPrompt) return;

    const validationError = validateCommercialPrompt(commercialPrompt.prompt);
    if (validationError) {
      setCommercialPrompt({
        ...commercialPrompt,
        prompt: { ...commercialPrompt.prompt, error: validationError },
      });
      return;
    }

    const commercial = {
      value: parseFormattedNumber(commercialPrompt.prompt.value),
      currencyCode: commercialPrompt.prompt.currencyCode,
      itemQuantity: parseFormattedNumber(commercialPrompt.prompt.itemQuantity),
      specThickness: commercialPrompt.prompt.specThickness,
      specCore: commercialPrompt.prompt.specCore,
      specPaintType: commercialPrompt.prompt.specPaintType,
    };

    if (commercialPrompt.prompt.targetStage === "Won") {
      const options = buildConverterOptions(commercialPrompt.project);
      if (options.length === 0) {
        setCommercialPrompt({
          ...commercialPrompt,
          prompt: {
            ...commercialPrompt.prompt,
            error: "Assign a sales rep, manager, or regional manager before marking Won.",
          },
        });
        return;
      }
      const project = commercialPrompt.project;
      setCommercialPrompt(null);
      setWinPrompt({
        project,
        commercial,
        prompt: createWinPromptState({
          convertedById:
            project.convertedById && options.some((option) => option.id === project.convertedById)
              ? project.convertedById
              : options.length === 1
                ? options[0]!.id
                : null,
        }),
      });
      return;
    }

    setCommercialPrompt({
      ...commercialPrompt,
      prompt: { ...commercialPrompt.prompt, error: null, saving: true },
    });

    try {
      await persistStageChange(commercialPrompt.project, commercialPrompt.prompt.targetStage, commercial);
      setCommercialPrompt(null);
    } catch {
      setCommercialPrompt({
        ...commercialPrompt,
        prompt: {
          ...commercialPrompt.prompt,
          saving: false,
          error: "Failed to update stage. Please retry.",
        },
      });
    }
  }

  async function submitWinPrompt() {
    if (!winPrompt) return;
    if (!winPrompt.prompt.convertedById) {
      setWinPrompt({
        ...winPrompt,
        prompt: { ...winPrompt.prompt, error: "Select who converted this project." },
      });
      return;
    }

    setWinPrompt({
      ...winPrompt,
      prompt: { ...winPrompt.prompt, error: null, saving: true },
    });

    try {
      await persistStageChange(winPrompt.project, "Won", winPrompt.commercial, winPrompt.prompt.convertedById);
      setWinPrompt(null);
    } catch (err) {
      setWinPrompt({
        ...winPrompt,
        prompt: {
          ...winPrompt.prompt,
          saving: false,
          error: err instanceof Error ? err.message : "Failed to update stage. Please retry.",
        },
      });
    }
  }

  const divisionOptions = useMemo(
    () => [
      { value: "ALL", label: "All divisions" },
      { value: "UNASSIGNED", label: "Unassigned" },
      ...BUSINESS_DIVISIONS.map((division) => ({ value: division, label: division })),
    ],
    [],
  );

  const stageMoveOptions = useMemo(
    () => PIPELINE_VISIBLE_STAGES.map((stage) => ({ value: stage, label: stageTitle(stage) })),
    [],
  );

  if (loading) return <ScreenLoader label="Loading pipeline..." />;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.toolbar}>
          <View style={[styles.searchWrap, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
            <Search size={16} color={colors.text3} strokeWidth={2.2} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search…"
              placeholderTextColor={colors.text3}
              style={[styles.searchInput, { color: colors.text }]}
            />
          </View>

          <Pressable
            style={[
              styles.iconBtn,
              {
                backgroundColor: groupByCustomer ? colors.brand : colors.surface2,
                borderColor: groupByCustomer ? colors.brand : colors.border,
              },
            ]}
            onPress={() => setGroupByCustomer((prev) => !prev)}
            accessibilityRole="button"
            accessibilityState={{ selected: groupByCustomer }}
            accessibilityLabel={groupByCustomer ? "Ungroup by customer" : "Group by customer"}
          >
            <Layers size={16} color={groupByCustomer ? "#fff" : colors.text3} strokeWidth={2.2} />
          </Pressable>

          {canSetDivision ? (
            <Pressable
              style={[
                styles.iconBtn,
                {
                  backgroundColor: divisionFilter !== "ALL" ? colors.brand : colors.surface2,
                  borderColor: divisionFilter !== "ALL" ? colors.brand : colors.border,
                },
              ]}
              onPress={() => setDivisionSheetOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Filter by business division"
            >
              <Filter
                size={16}
                color={divisionFilter !== "ALL" ? "#fff" : colors.text3}
                strokeWidth={2.2}
              />
            </Pressable>
          ) : null}

          {canCreate ? (
            <Pressable
              style={[styles.addButton, { backgroundColor: colors.brand }]}
              onPress={() => router.push("/project/form")}
            >
              <Plus size={16} color="#fff" strokeWidth={2.4} />
              <Text style={styles.addButtonText}>Add</Text>
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stageRow}
          style={styles.stageScroll}
        >
          {PIPELINE_VISIBLE_STAGES.map((stage) => {
            const count = visibleProjects.filter((project) => project.stage === stage).length;
            const active = mobileStage === stage;
            return (
              <Pressable
                key={stage}
                style={[
                  styles.stagePill,
                  {
                    backgroundColor: active ? colors.brand : colors.surface,
                    borderColor: active ? colors.brand : colors.border,
                  },
                ]}
                onPress={() => setMobileStage(stage)}
              >
                <View
                  style={[
                    styles.stageDot,
                    { backgroundColor: active ? "#fff" : stageDotColor(stage) },
                  ]}
                />
                <Text style={[styles.stagePillText, { color: active ? "#fff" : colors.text2 }]}>
                  {stageTitle(stage)}
                </Text>
                <Text style={[styles.stageCount, { color: active ? "rgba(255,255,255,0.9)" : colors.text3 }]}>
                  {count}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[styles.stageValueCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.stageValueLabel, { color: colors.text3 }]}>Stage value</Text>
          <Text style={[styles.stageValueAmount, { color: colors.text }]}>{formatAed(stageTotal, true)}</Text>
        </View>

        {error ? (
          <View style={[styles.errorBanner, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text>
          </View>
        ) : null}

        {stageItems.length === 0 ? (
          <View style={[styles.emptyStage, { borderColor: colors.border }]}>
            <Text style={[styles.emptyStageText, { color: colors.text3 }]}>
              No projects in {stageTitle(mobileStage)}.
            </Text>
          </View>
        ) : groupByCustomer ? (
          <PipelineCustomerGroupList
            projects={stageItems}
            expandedCustomers={expandedCustomers}
            onToggleCustomer={toggleCustomerExpanded}
            renderProject={(project) => (
              <PipelineProjectCard
                project={project}
                viewerRole={user?.role}
                canEdit={canCreate}
                canTrash={canCreate}
                showCustomer={false}
                onPress={() => router.push(`/project/${project.id}`)}
                onEdit={() => router.push(`/project/form?id=${project.id}`)}
                onTrash={() => onTrash(project)}
                onMoveStagePress={() => setStageMoveProject(project)}
                stageMovesEnabled={true}
              />
            )}
          />
        ) : (
          <View style={styles.list}>
            {stageItems.map((project) => (
              <PipelineProjectCard
                key={project.id}
                project={project}
                viewerRole={user?.role}
                canEdit={canCreate}
                canTrash={canCreate}
                onPress={() => router.push(`/project/${project.id}`)}
                onEdit={() => router.push(`/project/form?id=${project.id}`)}
                onTrash={() => onTrash(project)}
                onMoveStagePress={() => setStageMoveProject(project)}
                stageMovesEnabled={true}
              />
            ))}
          </View>
        )}

        {!error && projects.length === 0 ? (
          <EmptyState title="No projects yet" subtitle="Create your first project to start building pipeline." />
        ) : null}
      </ScrollView>

      <OptionSheet
        visible={divisionSheetOpen}
        title="Filter by business division"
        options={divisionOptions}
        selectedValue={divisionFilter}
        onSelect={(value) => setDivisionFilter(value as DivisionFilter)}
        onClose={() => setDivisionSheetOpen(false)}
      />

      <OptionSheet
        visible={Boolean(stageMoveProject)}
        title={stageMoveProject ? `Move ${stageMoveProject.name}` : "Move stage"}
        options={stageMoveOptions}
        selectedValue={stageMoveProject?.stage}
        onSelect={(value) => {
          if (!stageMoveProject) return;
          const project = stageMoveProject;
          setStageMoveProject(null);
          requestStageChange(project, value as Stage);
        }}
        onClose={() => setStageMoveProject(null)}
      />

      <CommercialStagePrompt
        visible={Boolean(commercialPrompt)}
        prompt={commercialPrompt?.prompt ?? null}
        currencies={currencies}
        onChange={(prompt) => {
          if (commercialPrompt) {
            setCommercialPrompt({ ...commercialPrompt, prompt });
          }
        }}
        onClose={() => {
          if (commercialPrompt?.prompt.saving) return;
          setCommercialPrompt(null);
        }}
        onSubmit={() => void submitCommercialPrompt()}
      />

      <LossStagePrompt
        visible={Boolean(lossPrompt)}
        prompt={lossPrompt?.prompt ?? null}
        onChange={(prompt) => {
          if (lossPrompt) {
            setLossPrompt({ ...lossPrompt, prompt });
          }
        }}
        onClose={() => {
          if (lossPrompt?.prompt.saving) return;
          setLossPrompt(null);
        }}
        onSubmit={() => void submitLossPrompt()}
      />

      <WinStagePrompt
        visible={Boolean(winPrompt)}
        prompt={winPrompt?.prompt ?? null}
        options={winPrompt ? buildConverterOptions(winPrompt.project) : []}
        onChange={(prompt) => {
          if (winPrompt) {
            setWinPrompt({ ...winPrompt, prompt });
          }
        }}
        onClose={() => {
          if (winPrompt?.prompt.saving) return;
          setWinPrompt(null);
        }}
        onSubmit={() => void submitWinPrompt()}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 24,
      paddingBottom: 120,
      gap: 12,
    },
    toolbar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    searchWrap: {
      flex: 1,
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
      paddingVertical: 0,
    },
    addButton: {
      height: 40,
      borderRadius: 12,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    addButtonText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "700",
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    moveToggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    moveToggleCopy: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    moveToggleTextWrap: {
      flex: 1,
    },
    moveToggleTitle: {
      fontSize: 13,
      fontWeight: "700",
    },
    moveToggleHint: {
      marginTop: 2,
      fontSize: 11,
      lineHeight: 15,
    },
    stageScroll: {
      marginHorizontal: -16,
    },
    stageRow: {
      paddingHorizontal: 16,
      gap: 8,
    },
    stagePill: {
      height: 32,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    stageDot: {
      width: 6,
      height: 6,
      borderRadius: 999,
    },
    stagePillText: {
      fontSize: 12,
      fontWeight: "600",
    },
    stageCount: {
      fontSize: 10,
      fontWeight: "700",
    },
    stageValueCard: {
      borderRadius: 16,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    stageValueLabel: {
      fontSize: 11,
    },
    stageValueAmount: {
      marginTop: 2,
      fontSize: 14,
      fontWeight: "700",
    },
    errorBanner: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
    },
    list: {
      gap: 8,
    },
    emptyStage: {
      borderWidth: 1,
      borderStyle: "dashed",
      borderRadius: 12,
      paddingVertical: 32,
      alignItems: "center",
    },
    emptyStageText: {
      fontSize: 12,
    },
  });
}
