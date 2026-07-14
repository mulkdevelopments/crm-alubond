import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ThemeColors, useThemeColors } from "@/constants/theme";
import { groupProjectsByCustomer } from "@/lib/group-projects-by-customer";
import type { ApiProject } from "@/lib/api/projects-api";

type ActivityProjectPickerProps = {
  projects: ApiProject[];
  selectedIds: string[];
  onChange: (nextIds: string[]) => void;
};

function customerSelectionState(projectIds: string[], selectedIds: string[]) {
  const selectedCount = projectIds.filter((id) => selectedIds.includes(id)).length;
  if (selectedCount === 0) return "none" as const;
  if (selectedCount === projectIds.length) return "all" as const;
  return "partial" as const;
}

function projectMatchesQuery(project: ApiProject, query: string) {
  const haystack = [
    project.name,
    project.developer,
    project.city,
    project.country,
    project.stage,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function Checkbox({
  checked,
  partial,
  colors,
}: {
  checked: boolean;
  partial?: boolean;
  colors: ThemeColors;
}) {
  return (
    <View
      style={[
        checkboxStyles.checkbox,
        {
          borderColor: checked || partial ? colors.brand : colors.border,
          backgroundColor: checked ? colors.brand : partial ? "rgba(227, 6, 19, 0.18)" : "transparent",
        },
      ]}
    />
  );
}

export function ActivityProjectPicker({ projects, selectedIds, onChange }: ActivityProjectPickerProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [search, setSearch] = useState("");
  const groups = useMemo(() => groupProjectsByCustomer(projects), [projects]);
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});
  const normalizedSearch = search.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!normalizedSearch) return groups;
    return groups
      .map((group) => {
        const customerMatches = group.customer.toLowerCase().includes(normalizedSearch);
        const matchingProjects = group.projects.filter((project) =>
          projectMatchesQuery(project, normalizedSearch)
        );
        if (customerMatches) return group;
        if (matchingProjects.length === 0) return null;
        return { ...group, projects: matchingProjects };
      })
      .filter((group): group is (typeof groups)[number] => group !== null);
  }, [groups, normalizedSearch]);

  useEffect(() => {
    if (!normalizedSearch) return;
    setExpandedCustomers((prev) => {
      const next = { ...prev };
      for (const group of filteredGroups) {
        next[group.customer] = true;
      }
      return next;
    });
  }, [normalizedSearch, filteredGroups]);

  function toggleCustomerExpanded(customer: string) {
    setExpandedCustomers((prev) => ({ ...prev, [customer]: !prev[customer] }));
  }

  function toggleProject(projectId: string) {
    onChange(
      selectedIds.includes(projectId)
        ? selectedIds.filter((id) => id !== projectId)
        : [...selectedIds, projectId]
    );
  }

  function toggleCustomerProjects(projectIds: string[], checked: boolean) {
    if (checked) {
      onChange([...new Set([...selectedIds, ...projectIds])]);
      return;
    }
    onChange(selectedIds.filter((id) => !projectIds.includes(id)));
  }

  if (groups.length === 0) {
    return <Text style={styles.empty}>No projects available.</Text>;
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.searchWrap}>
        <Search size={14} color={colors.text3} strokeWidth={2.2} style={styles.searchIcon} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search projects or customers..."
          placeholderTextColor={colors.text3}
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
        {search ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => setSearch("")}
            style={styles.clearBtn}
          >
            <X size={14} color={colors.text3} strokeWidth={2.2} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
        {filteredGroups.length === 0 ? (
          <Text style={styles.empty}>No projects match your search.</Text>
        ) : (
          filteredGroups.map((group) => {
            const projectIds = group.projects.map((project) => project.id);
            const selection = customerSelectionState(projectIds, selectedIds);
            const expanded = normalizedSearch ? true : Boolean(expandedCustomers[group.customer]);

            return (
              <View key={group.customer} style={styles.group}>
                <View style={styles.groupHeader}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={expanded ? "Collapse projects" : "Expand projects"}
                    onPress={() => toggleCustomerExpanded(group.customer)}
                    style={styles.expandBtn}
                  >
                    {expanded ? (
                      <ChevronDown size={14} color={colors.text3} strokeWidth={2.2} />
                    ) : (
                      <ChevronRight size={14} color={colors.text3} strokeWidth={2.2} />
                    )}
                  </Pressable>
                  <Pressable
                    style={styles.groupHeaderMain}
                    onPress={() => toggleCustomerProjects(projectIds, selection !== "all")}
                  >
                    <Checkbox
                      checked={selection === "all"}
                      partial={selection === "partial"}
                      colors={colors}
                    />
                    <View style={styles.groupHeaderText}>
                      <Text style={styles.customerName} numberOfLines={1}>
                        {group.customer}
                      </Text>
                      <Text style={styles.customerMeta}>
                        {group.projects.length} project{group.projects.length === 1 ? "" : "s"}
                      </Text>
                    </View>
                  </Pressable>
                </View>
                {expanded ? (
                  <View style={styles.projectList}>
                    {group.projects.map((project) => {
                      const checked = selectedIds.includes(project.id);
                      return (
                        <Pressable
                          key={project.id}
                          style={styles.projectRow}
                          onPress={() => toggleProject(project.id)}
                        >
                          <Checkbox checked={checked} colors={colors} />
                          <View style={styles.projectText}>
                            <Text style={styles.projectName} numberOfLines={1}>
                              {project.name}
                            </Text>
                            <Text style={styles.projectMeta} numberOfLines={1}>
                              {project.city}
                              {project.stage ? ` · ${project.stage}` : ""}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrapper: {
      gap: 8,
    },
    searchWrap: {
      position: "relative",
      justifyContent: "center",
    },
    searchIcon: {
      position: "absolute",
      left: 10,
      zIndex: 1,
    },
    searchInput: {
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
      paddingLeft: 32,
      paddingRight: 32,
      fontSize: 13,
      color: colors.text,
    },
    clearBtn: {
      position: "absolute",
      right: 6,
      width: 24,
      height: 24,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 6,
    },
    list: {
      maxHeight: 320,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface2,
    },
    listContent: {
      padding: 8,
      gap: 8,
    },
    empty: {
      fontSize: 12,
      color: colors.text3,
      paddingHorizontal: 4,
      paddingVertical: 8,
    },
    group: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.surface,
      overflow: "hidden",
    },
    groupHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 6,
      paddingVertical: 8,
    },
    expandBtn: {
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 8,
    },
    groupHeaderMain: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      minWidth: 0,
    },
    groupHeaderText: {
      flex: 1,
      minWidth: 0,
    },
    customerName: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.text,
    },
    customerMeta: {
      marginTop: 1,
      fontSize: 11,
      color: colors.text3,
    },
    projectList: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: 8,
      paddingVertical: 6,
      gap: 4,
    },
    projectRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 6,
    },
    projectText: {
      flex: 1,
      minWidth: 0,
    },
    projectName: {
      fontSize: 13,
      color: colors.text,
    },
    projectMeta: {
      marginTop: 1,
      fontSize: 11,
      color: colors.text3,
    },
  });
}

const checkboxStyles = StyleSheet.create({
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    marginTop: 1,
  },
});
