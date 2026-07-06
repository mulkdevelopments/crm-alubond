import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock3,
  Menu,
  Moon,
  Sun,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useOptionalAppShell } from "@/components/shell/AppShellContext";
import { ThemeColors, useThemeColors } from "@/constants/theme";
import { listUsers } from "@/lib/api/auth-api";
import { listFollowUps } from "@/lib/api/followups-api";
import { listProjects } from "@/lib/api/projects-api";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  formatCompactAedValue,
  relativeAgo,
  resolveTargetProgress,
  type TargetProgress,
} from "@/lib/shell/target-progress";
import { useOptionalThemePreference } from "@/lib/theme/ThemePreferenceContext";

type TopbarNotification = {
  id: string;
  title: string;
  description: string;
  whenIso: string;
  href: string;
  tone: "danger" | "warning" | "info";
};

export function AppTopBar() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const appShell = useOptionalAppShell();
  const { token, user } = useAuth();
  const themePreference = useOptionalThemePreference();
  const systemScheme = useColorScheme();
  const isDark = themePreference?.isDark ?? systemScheme === "dark";
  const toggleTheme = themePreference?.toggleTheme;

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [targetProgress, setTargetProgress] = useState<TargetProgress | null>(null);
  const [notifications, setNotifications] = useState<TopbarNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!token) {
      setTargetProgress(null);
      setNotifications([]);
      return;
    }

    let cancelled = false;
    async function loadHeaderData() {
      if (!token) return;
      const activeToken = token;
      setNotificationsLoading(true);
      setNotificationsError(null);
      try {
        const [followUps, projects, users] = await Promise.all([
          listFollowUps(activeToken),
          listProjects(activeToken),
          listUsers(activeToken),
        ]);
        if (cancelled) return;

        setTargetProgress(resolveTargetProgress(user?.id ?? null, user?.role ?? null, users, projects));

        const now = Date.now();
        const followUpNotifications: TopbarNotification[] = followUps
          .filter((item) => item.status === "Overdue" || item.status === "Due today")
          .slice(0, 8)
          .map((item) => ({
            id: `followup-${item.id}`,
            title: item.status === "Overdue" ? "Overdue follow-up" : "Follow-up due today",
            description: `${item.projectName} · ${item.contact} · ${item.channel}`,
            whenIso: item.updatedAt || item.dueAt,
            href: "/(tabs)/follow-ups",
            tone: item.status === "Overdue" ? "danger" : "warning",
          }));

        const recentProjectNotifications: TopbarNotification[] = projects
          .filter((project) => {
            const updatedMs = new Date(project.updatedAt).getTime();
            return Number.isFinite(updatedMs) && now - updatedMs <= 24 * 60 * 60 * 1000;
          })
          .slice(0, 6)
          .map((project) => ({
            id: `project-${project.id}`,
            title: `Project updated · ${project.stage}`,
            description: `${project.name} · ${project.city}, ${project.country}`,
            whenIso: project.updatedAt,
            href: `/project/${project.id}`,
            tone: "info",
          }));

        setNotifications(
          [...followUpNotifications, ...recentProjectNotifications]
            .sort((a, b) => new Date(b.whenIso).getTime() - new Date(a.whenIso).getTime())
            .slice(0, 12)
        );
      } catch (error) {
        if (!cancelled) {
          setNotificationsError(error instanceof Error ? error.message : "Could not load notifications");
        }
      } finally {
        if (!cancelled) setNotificationsLoading(false);
      }
    }

    void loadHeaderData();
    return () => {
      cancelled = true;
    };
  }, [token, user?.id, user?.role]);

  const unreadCount = notifications.length;

  return (
    <>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.left}>
          <Pressable
            onPress={() => appShell?.toggleMenu()}
            style={styles.iconButton}
            accessibilityLabel="Open menu"
          >
            <Menu size={20} color={colors.text} strokeWidth={2.2} />
          </Pressable>

          <View style={styles.progressCard}>
            {targetProgress ? (
              <>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel} numberOfLines={1}>
                    {targetProgress.label}
                  </Text>
                  <Text style={styles.progressValue}>
                    AED {formatCompactAedValue(targetProgress.achievedAed)} /{" "}
                    {formatCompactAedValue(targetProgress.targetAed)}
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(100, Math.max(2, targetProgress.percent))}%` },
                    ]}
                  />
                </View>
              </>
            ) : (
              <Text style={styles.progressEmpty}>Yearly target not configured</Text>
            )}
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => toggleTheme?.()}
            style={styles.iconButton}
            accessibilityLabel="Toggle theme"
          >
            {isDark ? (
              <Sun size={16} color={colors.text2} strokeWidth={2.2} />
            ) : (
              <Moon size={16} color={colors.text2} strokeWidth={2.2} />
            )}
          </Pressable>

          <Pressable
            onPress={() => setNotificationsOpen(true)}
            style={styles.iconButton}
            accessibilityLabel="Notifications"
          >
            <Bell size={16} color={colors.text2} strokeWidth={2.2} />
            {unreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            ) : (
              <View style={styles.badgeDot} />
            )}
          </Pressable>
        </View>
      </View>

      <Modal
        visible={notificationsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setNotificationsOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setNotificationsOpen(false)}>
          <Pressable style={styles.notificationPanel} onPress={(event) => event.stopPropagation()}>
            <View style={styles.notificationHeader}>
              <Text style={styles.notificationTitle}>Notifications</Text>
              <Pressable onPress={() => setNotificationsOpen(false)}>
                <Text style={styles.markRead}>Close</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.notificationList}>
              {notificationsLoading ? (
                <Text style={styles.notificationEmpty}>Loading notifications...</Text>
              ) : notificationsError ? (
                <Text style={[styles.notificationEmpty, { color: colors.danger }]}>
                  {notificationsError}
                </Text>
              ) : notifications.length === 0 ? (
                <Text style={styles.notificationEmpty}>No new alerts.</Text>
              ) : (
                notifications.map((item) => {
                  const ToneIcon =
                    item.tone === "danger"
                      ? AlertTriangle
                      : item.tone === "warning"
                        ? Clock3
                        : CheckCircle2;
                  const toneColor =
                    item.tone === "danger" ? "#e11d48" : item.tone === "warning" ? "#d97706" : "#059669";

                  return (
                    <Pressable
                      key={item.id}
                      style={styles.notificationItem}
                      onPress={() => {
                        setNotificationsOpen(false);
                        router.push(item.href as never);
                      }}
                    >
                      <ToneIcon size={14} color={toneColor} strokeWidth={2.2} />
                      <View style={styles.notificationBody}>
                        <Text style={styles.notificationItemTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.notificationItemDescription} numberOfLines={1}>
                          {item.description}
                        </Text>
                        <Text style={styles.notificationItemWhen}>
                          {relativeAgo(item.whenIso, nowMs)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      minHeight: 64,
      paddingHorizontal: 16,
      paddingBottom: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    left: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    progressCard: {
      flex: 1,
      minHeight: 40,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
      paddingHorizontal: 12,
      paddingVertical: 6,
      justifyContent: "center",
    },
    progressHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    progressLabel: {
      flex: 1,
      fontSize: 10,
      textTransform: "uppercase",
      letterSpacing: 1,
      color: colors.text3,
    },
    progressValue: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.text,
    },
    progressTrack: {
      marginTop: 4,
      height: 6,
      borderRadius: 999,
      backgroundColor: colors.surface,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: colors.brand,
      borderRadius: 999,
    },
    progressEmpty: {
      fontSize: 12,
      color: colors.text3,
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    badge: {
      position: "absolute",
      top: 2,
      right: 2,
      minWidth: 16,
      height: 16,
      borderRadius: 999,
      backgroundColor: "#e11d48",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    badgeText: {
      color: "#fff",
      fontSize: 10,
      fontWeight: "600",
    },
    badgeDot: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 6,
      height: 6,
      borderRadius: 999,
      backgroundColor: colors.brand,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.25)",
      justifyContent: "flex-start",
      alignItems: "flex-end",
      paddingTop: 72,
      paddingHorizontal: 16,
    },
    notificationPanel: {
      width: 360,
      maxWidth: "100%",
      maxHeight: 420,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      overflow: "hidden",
    },
    notificationHeader: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    notificationTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    markRead: {
      fontSize: 11,
      color: colors.brandDark,
      fontWeight: "500",
    },
    notificationList: {
      maxHeight: 340,
    },
    notificationEmpty: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 12,
      color: colors.text3,
    },
    notificationItem: {
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    notificationBody: {
      flex: 1,
      minWidth: 0,
    },
    notificationItemTitle: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.text,
    },
    notificationItemDescription: {
      fontSize: 11,
      color: colors.text3,
    },
    notificationItemWhen: {
      marginTop: 2,
      fontSize: 10,
      color: colors.text3,
    },
  });
}
