import { useMemo } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { ThemeColors, useThemeColors } from "@/constants/theme";

export type ConverterOption = {
  id: string;
  name: string;
  roleLabel: string;
};

export type WinPromptState = {
  convertedById: string;
  error: string | null;
  saving: boolean;
};

export function createWinPromptState(seed?: { convertedById?: string | null }): WinPromptState {
  return {
    convertedById: seed?.convertedById?.trim() ?? "",
    error: null,
    saving: false,
  };
}

export function buildConverterOptions(project: {
  salesRepIds: string[];
  salesRepNames: string[];
  managerId: string | null;
  managerName: string;
  regionalManagerId: string | null;
  regionalManagerName: string;
}): ConverterOption[] {
  const options: ConverterOption[] = [];
  const seen = new Set<string>();

  project.salesRepIds.forEach((id, index) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    options.push({
      id,
      name: project.salesRepNames[index]?.trim() || "Sales rep",
      roleLabel: "Sales rep",
    });
  });

  if (project.managerId && !seen.has(project.managerId)) {
    seen.add(project.managerId);
    options.push({
      id: project.managerId,
      name: project.managerName.trim() || "Manager",
      roleLabel: "Manager",
    });
  }

  if (project.regionalManagerId && !seen.has(project.regionalManagerId)) {
    seen.add(project.regionalManagerId);
    options.push({
      id: project.regionalManagerId,
      name: project.regionalManagerName.trim() || "Regional manager",
      roleLabel: "Regional manager",
    });
  }

  return options;
}

export function WinStagePrompt({
  visible,
  prompt,
  options,
  onChange,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  prompt: WinPromptState | null;
  options: ConverterOption[];
  onChange: (next: WinPromptState) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!prompt) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text1 }]}>Who converted this project?</Text>
          <Text style={[styles.subtitle, { color: colors.text2 }]}>
            Pick the person who gets the win on Field Team. Credit goes to one person only.
          </Text>

          <View style={styles.options}>
            {options.length === 0 ? (
              <Text style={{ color: colors.danger, fontSize: 13 }}>
                Assign at least one sales rep, manager, or regional manager before marking Won.
              </Text>
            ) : (
              options.map((option) => {
                const selected = prompt.convertedById === option.id;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => onChange({ ...prompt, convertedById: option.id, error: null })}
                    style={[
                      styles.option,
                      {
                        borderColor: selected ? colors.brand : colors.border,
                        backgroundColor: selected ? "rgba(227,6,19,0.08)" : colors.surface2,
                      },
                    ]}
                  >
                    <Text style={[styles.optionName, { color: colors.text1 }]}>{option.name}</Text>
                    <Text style={[styles.optionRole, { color: colors.text3 }]}>{option.roleLabel}</Text>
                  </Pressable>
                );
              })
            )}
          </View>

          {prompt.error ? <Text style={[styles.error, { color: colors.danger }]}>{prompt.error}</Text> : null}

          <View style={styles.actions}>
            <Pressable style={[styles.btn, { backgroundColor: colors.surface2 }]} onPress={onClose} disabled={prompt.saving}>
              <Text style={{ color: colors.text2, fontWeight: "600" }}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, { backgroundColor: colors.brand, opacity: options.length === 0 || prompt.saving ? 0.6 : 1 }]}
              onPress={onSubmit}
              disabled={prompt.saving || options.length === 0}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>
                {prompt.saving ? "Saving..." : "Save and move to Won"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(_colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "center",
      padding: 16,
    },
    sheet: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      gap: 10,
    },
    title: {
      fontSize: 16,
      fontWeight: "700",
    },
    subtitle: {
      fontSize: 13,
      lineHeight: 18,
    },
    options: {
      gap: 8,
      marginTop: 4,
    },
    option: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    optionName: {
      fontSize: 14,
      fontWeight: "700",
    },
    optionRole: {
      fontSize: 11,
      marginTop: 2,
    },
    error: {
      fontSize: 12,
    },
    actions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 8,
      marginTop: 4,
    },
    btn: {
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
  });
}
