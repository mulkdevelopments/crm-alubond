import { ChevronDown, ChevronRight } from "lucide-react-native";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { ThemeColors, useThemeColors } from "@/constants/theme";
import { groupProjectsByCustomer } from "@/lib/group-projects-by-customer";
import type { ApiProject } from "@/lib/api/projects-api";

type PipelineCustomerGroupListProps = {
  projects: ApiProject[];
  expandedCustomers: Record<string, boolean>;
  onToggleCustomer: (customer: string) => void;
  renderProject: (project: ApiProject) => React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function PipelineCustomerGroupList({
  projects,
  expandedCustomers,
  onToggleCustomer,
  renderProject,
  style,
}: PipelineCustomerGroupListProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const groups = groupProjectsByCustomer(projects);

  return (
    <View style={[styles.list, style]}>
      {groups.map((group) => {
        const expanded = Boolean(expandedCustomers[group.customer]);
        return (
          <View key={group.customer} style={styles.group}>
            <Pressable style={styles.header} onPress={() => onToggleCustomer(group.customer)}>
              {expanded ? (
                <ChevronDown size={14} color={colors.text3} strokeWidth={2.2} />
              ) : (
                <ChevronRight size={14} color={colors.text3} strokeWidth={2.2} />
              )}
              <Text style={styles.customerName} numberOfLines={1}>
                {group.customer}
              </Text>
              <Text style={styles.customerMeta}>
                {group.projects.length} project{group.projects.length === 1 ? "" : "s"}
              </Text>
            </Pressable>
            {expanded ? (
              <View style={styles.projects}>
                {group.projects.map((project) => (
                  <View key={project.id}>{renderProject(project)}</View>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    list: {
      gap: 10,
    },
    group: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      backgroundColor: colors.surface,
      overflow: "hidden",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    customerName: {
      flex: 1,
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    customerMeta: {
      fontSize: 11,
      color: colors.text3,
    },
    projects: {
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      padding: 10,
    },
  });
}
