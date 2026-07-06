import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { X } from "lucide-react-native";

import { ThemeColors, useThemeColors } from "@/constants/theme";
import {
  getUserLocationAttendance,
  getUserLocationRoute,
  type UserListItem,
  type UserLocationRoute,
} from "@/lib/api/auth-api";
import { useAuth } from "@/lib/auth/AuthContext";
import { buildMonthCalendar, formatLocalDateKey, isUserLive, shiftMonth } from "@/lib/users";

export function UserAttendanceModal({
  user,
  visible,
  onClose,
}: {
  user: UserListItem | null;
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { token } = useAuth();

  const [attendanceMonth, setAttendanceMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [attendanceDays, setAttendanceDays] = useState<Array<{ date: string; activeMinutes: number; pingsCount: number }>>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [route, setRoute] = useState<UserLocationRoute | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayDateKey = useMemo(() => formatLocalDateKey(new Date()), []);
  const calendarCells = useMemo(
    () => buildMonthCalendar(attendanceMonth, attendanceDays),
    [attendanceMonth, attendanceDays],
  );
  const live = user ? isUserLive(user.lastLocationPingAt, user.isActive) : false;

  const loadMonth = useCallback(
    async (month: string) => {
      if (!token || !user) return;
      setAttendanceLoading(true);
      setError(null);
      setSelectedDate(null);
      setRoute(null);
      try {
        const data = await getUserLocationAttendance(token, user.id, month);
        setAttendanceDays(data.days);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load attendance.");
        setAttendanceDays([]);
      } finally {
        setAttendanceLoading(false);
      }
    },
    [token, user],
  );

  useEffect(() => {
    if (!visible || !user) return;
    setAttendanceMonth(new Date().toISOString().slice(0, 7));
    void loadMonth(new Date().toISOString().slice(0, 7));
  }, [visible, user, loadMonth]);

  async function loadRouteForDate(date: string) {
    if (!token || !user) return;
    setSelectedDate(date);
    setRouteLoading(true);
    setError(null);
    try {
      setRoute(await getUserLocationRoute(token, user.id, date));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load route.");
      setRoute(null);
    } finally {
      setRouteLoading(false);
    }
  }

  async function changeMonth(delta: number) {
    const nextMonth = shiftMonth(attendanceMonth, delta);
    setAttendanceMonth(nextMonth);
    await loadMonth(nextMonth);
  }

  if (!user) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.text }]}>Attendance & live route</Text>
              <Text style={[styles.subtitle, { color: colors.text3 }]}>
                {user.firstName} {user.lastName} · {user.email}
              </Text>
            </View>
            <Pressable
              style={[styles.closeButton, { backgroundColor: colors.surface2 }]}
              onPress={onClose}
              accessibilityLabel="Close attendance"
            >
              <X size={16} color={colors.text3} strokeWidth={2.2} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.monthRow}>
              <Pressable
                style={[styles.monthButton, { backgroundColor: colors.surface2, borderColor: colors.border }]}
                onPress={() => void changeMonth(-1)}
              >
                <Text style={[styles.monthButtonText, { color: colors.text }]}>Previous</Text>
              </Pressable>
              <Text style={[styles.monthLabel, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}>
                {new Date(`${attendanceMonth}-01T00:00:00`).toLocaleDateString("en-AE", {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
              <Pressable
                style={[styles.monthButton, { backgroundColor: colors.surface2, borderColor: colors.border }]}
                onPress={() => void changeMonth(1)}
              >
                <Text style={[styles.monthButtonText, { color: colors.text }]}>Next</Text>
              </Pressable>
            </View>

            <View style={styles.liveRow}>
              <View style={[styles.liveDot, { backgroundColor: live ? colors.success : colors.danger }]} />
              <Text style={[styles.liveText, { color: live ? colors.success : colors.danger }]}>
                {live ? "Live now" : "Offline"}
              </Text>
            </View>

            {attendanceLoading ? (
              <ActivityIndicator color={colors.brand} style={{ marginVertical: 24 }} />
            ) : (
              <View style={styles.calendarGrid}>
                {calendarCells.map((cell) => {
                  const selected = selectedDate === cell.date;
                  const today = cell.date === todayDateKey;
                  return (
                    <Pressable
                      key={cell.key}
                      disabled={!cell.date}
                      onPress={() => cell.date && void loadRouteForDate(cell.date)}
                      style={[
                        styles.calendarCell,
                        { borderColor: colors.border, backgroundColor: colors.surface2 },
                        !cell.date && styles.calendarCellEmpty,
                        today && { borderColor: colors.success, backgroundColor: "rgba(16, 185, 129, 0.1)" },
                        selected && { borderColor: colors.brand, backgroundColor: "rgba(227, 6, 19, 0.08)" },
                      ]}
                    >
                      <Text style={[styles.calendarDay, { color: colors.text }]}>{cell.dayLabel}</Text>
                      {cell.date ? (
                        <Text style={[styles.calendarMinutes, { color: colors.text2 }]}>{cell.activeMinutes}min</Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {selectedDate ? (
              <View style={[styles.routePanel, { borderColor: colors.border, backgroundColor: colors.surface2 }]}>
                <Text style={[styles.routeTitle, { color: colors.text }]}>Route on {selectedDate}</Text>
                {routeLoading ? (
                  <ActivityIndicator color={colors.brand} style={{ marginTop: 12 }} />
                ) : !route ? (
                  <Text style={[styles.routeEmpty, { color: colors.text3 }]}>No route data for selected date.</Text>
                ) : (
                  <View style={styles.routeBody}>
                    <Text style={[styles.routeMeta, { color: colors.text3 }]}>
                      {route.points.length} pings · {route.siteVisits.length} site visits · {route.assignedProjects.length} zones
                    </Text>
                    <Text style={[styles.sectionLabel, { color: colors.text }]}>Site visits</Text>
                    {route.siteVisits.length === 0 ? (
                      <Text style={[styles.routeEmpty, { color: colors.text3 }]}>No site visits detected.</Text>
                    ) : (
                      route.siteVisits.map((visit) => (
                        <View
                          key={`${visit.projectId}-${visit.visitedAt}`}
                          style={[styles.visitRow, { borderColor: colors.border, backgroundColor: colors.surface }]}
                        >
                          <Text style={[styles.visitName, { color: colors.text }]}>{visit.projectName}</Text>
                          <Text style={[styles.visitTime, { color: colors.text3 }]}>
                            {new Date(visit.visitedAt).toLocaleTimeString("en-AE")}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            ) : (
              <Text style={[styles.hint, { color: colors.text3 }]}>Select a date from the calendar to view route details.</Text>
            )}

            {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
          </ScrollView>
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
      justifyContent: "flex-end",
    },
    sheet: {
      maxHeight: "92%",
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderWidth: 1,
      overflow: "hidden",
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },
    headerText: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: -0.2,
    },
    subtitle: {
      marginTop: 4,
      fontSize: 12,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    content: {
      padding: 16,
      paddingBottom: 32,
      gap: 16,
    },
    monthRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    monthButton: {
      height: 36,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    monthButtonText: {
      fontSize: 12,
      fontWeight: "600",
    },
    monthLabel: {
      flex: 1,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      textAlign: "center",
      lineHeight: 34,
      fontSize: 13,
      fontWeight: "600",
      overflow: "hidden",
    },
    liveRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
    },
    liveText: {
      fontSize: 12,
      fontWeight: "600",
    },
    calendarGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    calendarCell: {
      width: "13%",
      minWidth: 42,
      flexGrow: 1,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 8,
      minHeight: 58,
    },
    calendarCellEmpty: {
      opacity: 0.35,
    },
    calendarDay: {
      fontSize: 16,
      fontWeight: "700",
      lineHeight: 18,
    },
    calendarMinutes: {
      marginTop: 4,
      fontSize: 10,
    },
    routePanel: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      gap: 8,
    },
    routeTitle: {
      fontSize: 14,
      fontWeight: "700",
    },
    routeMeta: {
      fontSize: 12,
    },
    routeBody: {
      gap: 8,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "700",
    },
    routeEmpty: {
      fontSize: 12,
    },
    visitRow: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    visitName: {
      fontSize: 12,
      fontWeight: "600",
    },
    visitTime: {
      marginTop: 2,
      fontSize: 11,
    },
    hint: {
      fontSize: 12,
      textAlign: "center",
    },
    error: {
      fontSize: 12,
    },
  });
}
