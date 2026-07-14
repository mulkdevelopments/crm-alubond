import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { usePathname, useRouter } from "expo-router";
import { Briefcase, ClipboardList, Plus, X } from "lucide-react-native";

import { ActivityProjectPicker } from "@/components/activity/ActivityProjectPicker";
import { ThemeColors, useThemeColors } from "@/constants/theme";
import { listProjects, type ApiProject } from "@/lib/api/projects-api";
import { useAuth, canManageProjects } from "@/lib/auth/AuthContext";
import { requestOpenActivityComposer } from "@/lib/shell/activity-composer";

export function QuickActivityFab({ bottom }: { bottom: number }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const pathname = usePathname();
  const router = useRouter();
  const { token, user } = useAuth();
  const canCreateProject = canManageProjects(user?.role);
  const [openChoice, setOpenChoice] = useState(false);
  const [openActivityPicker, setOpenActivityPicker] = useState(false);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const projectIdFromPath = useMemo(() => {
    const match = pathname?.match(/^\/project\/([^/]+)$/);
    if (!match || match[1] === "form") return null;
    return match[1];
  }, [pathname]);

  useEffect(() => {
    if (!openActivityPicker || !token) return;
    let cancelled = false;
    setLoadingProjects(true);
    setPickerError(null);
    void listProjects(token)
      .then((items) => {
        if (cancelled) return;
        setProjects(items);
        setSelectedProjectIds([]);
      })
      .catch((err) => {
        if (cancelled) return;
        setPickerError(err instanceof Error ? err.message : "Failed to load projects.");
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingProjects(false);
      });
    return () => {
      cancelled = true;
    };
  }, [openActivityPicker, token]);

  function closeAll() {
    setOpenChoice(false);
    setOpenActivityPicker(false);
    setPickerError(null);
  }

  function onQuickAddClick() {
    setOpenChoice(true);
  }

  function startActivityFlow() {
    setOpenChoice(false);
    if (projectIdFromPath) {
      requestOpenActivityComposer();
      return;
    }
    setOpenActivityPicker(true);
  }

  function startProjectFlow() {
    setOpenChoice(false);
    router.push("/project/form");
  }

  function openComposerForSelectedProjects() {
    if (selectedProjectIds.length === 0) {
      setPickerError("Select at least one project to continue.");
      return;
    }
    const [firstProjectId] = selectedProjectIds;
    setOpenActivityPicker(false);
    router.push({
      pathname: "/project/[id]",
      params: {
        id: firstProjectId,
        composeActivity: "1",
        projectIds: selectedProjectIds.join(","),
      },
    });
  }

  return (
    <>
      <Modal visible={openChoice} transparent animationType="fade" onRequestClose={closeAll}>
        <Pressable style={styles.overlay} onPress={closeAll}>
          <Pressable style={styles.dialog} onPress={(event) => event.stopPropagation()}>
            <View style={styles.dialogHeader}>
              <View style={styles.dialogHeaderText}>
                <Text style={styles.dialogTitle}>Quick add</Text>
                <Text style={styles.dialogSubtitle}>What would you like to create?</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={closeAll} style={styles.iconBtn}>
                <X size={16} color={colors.text2} strokeWidth={2.2} />
              </Pressable>
            </View>
            <View style={styles.choiceGrid}>
              {canCreateProject ? (
                <Pressable style={styles.choiceCard} onPress={startProjectFlow}>
                  <View style={styles.choiceIconWrap}>
                    <Briefcase size={20} color="#047857" strokeWidth={2.2} />
                  </View>
                  <Text style={styles.choiceTitle}>Project</Text>
                  <Text style={styles.choiceSubtitle}>Add a new pipeline project.</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={[styles.choiceCard, !canCreateProject && styles.choiceCardFull]}
                onPress={startActivityFlow}
              >
                <View style={styles.choiceIconWrap}>
                  <ClipboardList size={20} color="#047857" strokeWidth={2.2} />
                </View>
                <Text style={styles.choiceTitle}>Activity</Text>
                <Text style={styles.choiceSubtitle}>Log a call, visit, note, or update.</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={openActivityPicker} transparent animationType="fade" onRequestClose={closeAll}>
        <Pressable style={styles.overlay} onPress={closeAll}>
          <Pressable style={styles.dialog} onPress={(event) => event.stopPropagation()}>
            <View style={styles.dialogHeader}>
              <View style={styles.dialogHeaderText}>
                <Text style={styles.dialogTitle}>Log activity</Text>
                <Text style={styles.dialogSubtitle}>Select one or more projects grouped by customer.</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={closeAll} style={styles.iconBtn}>
                <X size={16} color={colors.text2} strokeWidth={2.2} />
              </Pressable>
            </View>
            <View style={styles.dialogBody}>
              {loadingProjects ? (
                <ActivityIndicator color={colors.brand} style={{ marginVertical: 12 }} />
              ) : (
                <ActivityProjectPicker
                  projects={projects}
                  selectedIds={selectedProjectIds}
                  onChange={setSelectedProjectIds}
                />
              )}
              {selectedProjectIds.length > 0 ? (
                <Text style={styles.selectionCount}>
                  {selectedProjectIds.length} project{selectedProjectIds.length === 1 ? "" : "s"} selected
                </Text>
              ) : null}
              {pickerError ? <Text style={styles.error}>{pickerError}</Text> : null}
              <View style={styles.dialogActions}>
                <Pressable style={styles.ghostBtn} onPress={closeAll}>
                  <Text style={styles.ghostBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryBtn, loadingProjects && styles.primaryBtnDisabled]}
                  onPress={openComposerForSelectedProjects}
                  disabled={loadingProjects || selectedProjectIds.length === 0}
                >
                  <Text style={styles.primaryBtnText}>{loadingProjects ? "Loading..." : "Continue"}</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quick add"
        onPress={onQuickAddClick}
        style={[styles.fab, { bottom }]}
      >
        <Plus size={20} color="#fff" strokeWidth={2.4} />
      </Pressable>
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    fab: {
      position: "absolute",
      right: 16,
      zIndex: 66,
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "#059669",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
    },
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    dialog: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      overflow: "hidden",
    },
    dialogHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    dialogHeaderText: { flex: 1 },
    dialogTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
    dialogSubtitle: { marginTop: 2, fontSize: 12, color: colors.text3 },
    iconBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    choiceGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      padding: 16,
    },
    choiceCard: {
      flex: 1,
      minWidth: "46%",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
      padding: 14,
    },
    choiceCardFull: {
      minWidth: "100%",
    },
    choiceIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: "rgba(5, 150, 105, 0.12)",
      alignItems: "center",
      justifyContent: "center",
    },
    choiceTitle: { marginTop: 12, fontSize: 14, fontWeight: "700", color: colors.text },
    choiceSubtitle: { marginTop: 4, fontSize: 12, color: colors.text3, lineHeight: 16 },
    dialogBody: { padding: 16, gap: 12 },
    selectionCount: { fontSize: 12, color: colors.text3 },
    error: { fontSize: 12, color: colors.danger },
    dialogActions: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 8,
    },
    ghostBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
    },
    ghostBtnText: { fontSize: 13, fontWeight: "600", color: colors.text2 },
    primaryBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.brand,
    },
    primaryBtnDisabled: { opacity: 0.7 },
    primaryBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  });
}
