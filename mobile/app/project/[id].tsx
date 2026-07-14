import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ScreenLoader } from "@/components/ScreenLoader";
import { colors } from "@/constants/theme";
import { createLocationPing } from "@/lib/api/auth-api";
import {
  createProjectActivity,
  createProjectStakeholder,
  deleteProject,
  getProject,
  listProjectActivities,
  listProjectStakeholders,
  uploadActivityAttachment,
  type ApiProject,
  type ProjectActivity,
  type ProjectStakeholder,
} from "@/lib/api/projects-api";
import { useAuth, canManageProjects } from "@/lib/auth/AuthContext";
import { formatProjectValue, formatStage } from "@/lib/utils";
import { formatSpecsSummary } from "@/lib/project-specs";
import { subscribeActivityComposer } from "@/lib/shell/activity-composer";

const ACTIVITY_TYPES: ProjectActivity["type"][] = ["note", "call", "visit", "email", "whatsapp"];

const STAKEHOLDER_ROLES: ProjectStakeholder["role"][] = [
  "Architect",
  "Consultant",
  "Contractor",
  "Fabricator",
  "Developer",
  "Other",
];

export default function ProjectDetailScreen() {
  const { id, composeActivity, projectIds: projectIdsParam } = useLocalSearchParams<{
    id: string;
    composeActivity?: string;
    projectIds?: string;
  }>();
  const router = useRouter();
  const { token, user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const messageRef = useRef<TextInput>(null);
  const activitySectionY = useRef(0);
  const canManage = canManageProjects(user?.role);
  const isAdmin = user?.role === "ADMIN";
  const [project, setProject] = useState<ApiProject | null>(null);
  const [activities, setActivities] = useState<ProjectActivity[]>([]);
  const [stakeholders, setStakeholders] = useState<ProjectStakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityType, setActivityType] = useState<ProjectActivity["type"]>("note");
  const [message, setMessage] = useState("");
  const [visitNotes, setVisitNotes] = useState("");
  const [stakeholderName, setStakeholderName] = useState("");
  const [stakeholderRole, setStakeholderRole] = useState<ProjectStakeholder["role"]>("Consultant");
  const [stakeholderOrg, setStakeholderOrg] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetProjectIds = useMemo(() => {
    if (typeof projectIdsParam === "string" && projectIdsParam.trim()) {
      const ids = projectIdsParam.split(",").map((entry) => entry.trim()).filter(Boolean);
      if (ids.length > 0) return ids;
    }
    return id ? [id] : [];
  }, [projectIdsParam, id]);
  const loggingToMultipleProjects = targetProjectIds.length > 1;

  const load = useCallback(async () => {
    if (!token || !id) return;
    const [projectData, activityData, stakeholderData] = await Promise.all([
      getProject(token, id),
      listProjectActivities(token, id),
      listProjectStakeholders(token, id),
    ]);
    setProject(projectData);
    setActivities(activityData);
    setStakeholders(stakeholderData);
  }, [token, id]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try { await load(); } finally { setLoading(false); }
    })();
  }, [load]);

  function focusActivityComposer() {
    scrollRef.current?.scrollTo({ y: Math.max(activitySectionY.current - 12, 0), animated: true });
    messageRef.current?.focus();
  }

  useEffect(() => {
    return subscribeActivityComposer(focusActivityComposer);
  }, []);

  useEffect(() => {
    if (composeActivity !== "1" || loading || !project) return;
    const timer = setTimeout(() => {
      focusActivityComposer();
      router.setParams({ composeActivity: "" });
    }, 250);
    return () => clearTimeout(timer);
  }, [composeActivity, loading, project, router]);

  async function onLogActivity() {
    if (!token || !id || !message.trim()) {
      setError("Enter an activity message.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let visitLocation: { lat: number; lng: number; accuracyM?: number | null } | undefined;
      if (activityType === "visit") {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          throw new Error("Location permission is required for visit logging.");
        }
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        visitLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyM: position.coords.accuracy,
        };
        await createLocationPing(token, {
          lat: visitLocation.lat,
          lng: visitLocation.lng,
          accuracyM: visitLocation.accuracyM ?? null,
        });
      }

      const activityPayload = {
        type: activityType,
        message: message.trim(),
        visitWhatHappened: activityType === "visit" ? visitNotes.trim() || message.trim() : undefined,
        visitLocation,
      };

      for (const projectId of targetProjectIds) {
        await createProjectActivity(token, projectId, activityPayload);
      }

      setMessage("");
      setVisitNotes("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log activity.");
    } finally {
      setSaving(false);
    }
  }

  async function onAttachFile() {
    if (!token || !id) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setSaving(true);
    try {
      const uploaded = await uploadActivityAttachment(token, {
        uri: asset.uri,
        name: asset.fileName ?? "attachment.jpg",
        mimeType: asset.mimeType ?? "image/jpeg",
      });
      await createProjectActivity(token, id, {
        type: "note",
        message: `Attachment: ${uploaded.name}`,
        attachments: [uploaded],
      });
      await load();
    } catch (err) {
      Alert.alert("Upload failed", err instanceof Error ? err.message : "Could not upload file.");
    } finally {
      setSaving(false);
    }
  }

  async function onAddStakeholder() {
    if (!token || !id || !stakeholderName.trim()) {
      setError("Enter a stakeholder name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createProjectStakeholder(token, id, {
        role: stakeholderRole,
        name: stakeholderName.trim(),
        organization: stakeholderOrg.trim() || null,
      });
      setStakeholderName("");
      setStakeholderOrg("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add stakeholder.");
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteProject() {
    if (!token || !id || !project || !isAdmin) return;
    Alert.alert(
      "Delete project",
      `Delete "${project.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void (async () => {
            await deleteProject(token, id);
            router.replace("/(tabs)/pipeline");
          })(),
        },
      ]
    );
  }

  if (loading || !project) return <ScreenLoader label="Loading project..." />;

  return (
    <>
      <Stack.Screen
        options={{
          title: project.name,
          headerRight: () => (
            <View style={styles.headerActions}>
              {canManage ? (
                <Pressable onPress={() => router.push({ pathname: "/project/form", params: { id } })} style={styles.headerBtn}>
                  <Ionicons name="create-outline" size={22} color={colors.brand} />
                </Pressable>
              ) : null}
              {isAdmin ? (
                <Pressable onPress={() => void onDeleteProject()} style={styles.headerBtn}>
                  <Ionicons name="trash-outline" size={22} color={colors.danger} />
                </Pressable>
              ) : null}
            </View>
          ),
        }}
      />
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={[styles.stage, project.stage === "Lost" && styles.stageLost]}>
            {formatStage(project.stage)}
          </Text>
          <Text style={styles.meta}>{project.city}, {project.country}</Text>
          <Text style={styles.meta}>{project.developer || "Customer TBD"}</Text>
          <Text style={styles.value}>{formatProjectValue(project, user?.role)}</Text>
          {project.itemQuantity > 0 ? (
            <Text style={styles.meta}>{project.itemQuantity.toLocaleString()} m²</Text>
          ) : null}
          {formatSpecsSummary(project) ? (
            <Text style={styles.meta}>{formatSpecsSummary(project)}</Text>
          ) : null}
          <Text style={styles.meta}>Manager: {project.managerName || "—"}</Text>
          <Text style={styles.meta}>Reps: {project.salesRepNames.join(", ") || "—"}</Text>
          <Text style={styles.meta}>Created by: {project.createdByName?.trim() || "Not recorded"}</Text>
        </View>

        {project.stage === "Lost" ? (
          <View style={styles.lossCard}>
            <Text style={styles.lossEyebrow}>Loss details</Text>
            <View style={styles.lossBlock}>
              <Text style={styles.lossLabel}>Reason</Text>
              <Text style={styles.lossReasonText}>{project.lossReason?.trim() || "Not recorded"}</Text>
            </View>
            <View style={[styles.lossBlock, styles.lossBlockLast]}>
              <Text style={styles.lossLabel}>Who won</Text>
              <Text style={styles.lossWinnerText}>{project.competitor?.trim() || "Not recorded"}</Text>
            </View>
          </View>
        ) : null}

        <View onLayout={(event) => { activitySectionY.current = event.nativeEvent.layout.y; }}>
          <Text style={styles.section}>Log activity</Text>
          {loggingToMultipleProjects ? (
            <Text style={styles.multiProjectHint}>
              This update will be logged to {targetProjectIds.length} projects.
            </Text>
          ) : null}
        </View>
        <View style={styles.typeRow}>
          {ACTIVITY_TYPES.map((type) => (
            <Pressable
              key={type}
              onPress={() => setActivityType(type)}
              style={[styles.typeChip, activityType === type && styles.typeChipActive]}
            >
              <Text style={[styles.typeChipText, activityType === type && styles.typeChipTextActive]}>
                {type}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          ref={messageRef}
          style={[styles.input, styles.textArea]}
          placeholder="What happened?"
          value={message}
          onChangeText={setMessage}
          multiline
        />
        {activityType === "visit" ? (
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Visit recap"
            value={visitNotes}
            onChangeText={setVisitNotes}
            multiline
          />
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={styles.button} onPress={() => void onLogActivity()} disabled={saving}>
          <Text style={styles.buttonText}>{saving ? "Saving..." : "Save activity"}</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => void onAttachFile()} disabled={saving}>
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>Add attachment</Text>
        </Pressable>

        <Text style={styles.section}>Stakeholders ({stakeholders.length})</Text>
        {stakeholders.map((person) => (
          <View key={person.id} style={styles.listItem}>
            <Text style={styles.listTitle}>{person.name}</Text>
            <Text style={styles.listMeta}>{person.role}{person.organization ? ` · ${person.organization}` : ""}</Text>
          </View>
        ))}

        <Text style={styles.section}>Add stakeholder</Text>
        <View style={styles.typeRow}>
          {STAKEHOLDER_ROLES.map((role) => (
            <Pressable
              key={role}
              onPress={() => setStakeholderRole(role)}
              style={[styles.typeChip, stakeholderRole === role && styles.typeChipActive]}
            >
              <Text style={[styles.typeChipText, stakeholderRole === role && styles.typeChipTextActive]}>{role}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput style={styles.input} placeholder="Name" value={stakeholderName} onChangeText={setStakeholderName} />
        <TextInput style={styles.input} placeholder="Organization (optional)" value={stakeholderOrg} onChangeText={setStakeholderOrg} />
        <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => void onAddStakeholder()} disabled={saving}>
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>Add stakeholder</Text>
        </Pressable>

        <Text style={styles.section}>Activity timeline</Text>
        {activities.map((activity) => (
          <View key={activity.id} style={styles.listItem}>
            <Text style={styles.listTitle}>{activity.type.toUpperCase()} · {activity.createdByName ?? "System"}</Text>
            <Text style={styles.listMeta}>{new Date(activity.createdAt).toLocaleString()}</Text>
            <Text style={styles.listBody}>{activity.message}</Text>
          </View>
        ))}
        {activities.length === 0 ? <Text style={styles.listMeta}>No activities yet.</Text> : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  stage: { fontSize: 13, fontWeight: "700", color: colors.brand },
  stageLost: { color: colors.danger },
  lossCard: {
    backgroundColor: "#FFF1F2",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.25)",
    padding: 16,
    marginBottom: 8,
  },
  lossEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#BE123C",
    marginBottom: 12,
  },
  lossBlock: {
    marginBottom: 12,
  },
  lossBlockLast: {
    marginBottom: 0,
  },
  lossLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9F1239",
    marginBottom: 4,
  },
  lossReasonText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#881337",
  },
  lossWinnerText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#881337",
  },
  meta: { marginTop: 6, fontSize: 13, color: colors.textMuted },
  value: { marginTop: 10, fontSize: 22, fontWeight: "800", color: colors.text },
  section: { marginTop: 24, marginBottom: 10, fontSize: 16, fontWeight: "700", color: colors.text },
  multiProjectHint: { marginBottom: 8, fontSize: 12, color: colors.textMuted },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  typeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  typeChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  typeChipText: { fontSize: 12, color: colors.textMuted, textTransform: "capitalize" },
  typeChipTextActive: { color: "#fff", fontWeight: "600" },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    marginBottom: 10,
  },
  textArea: { minHeight: 90, textAlignVertical: "top" },
  button: {
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButton: { marginTop: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  buttonText: { color: "#fff", fontWeight: "700" },
  secondaryButtonText: { color: colors.brand },
  error: { color: colors.danger, marginBottom: 8, fontSize: 13 },
  listItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  listTitle: { fontSize: 13, fontWeight: "700", color: colors.text },
  listMeta: { marginTop: 4, fontSize: 11, color: colors.textMuted },
  listBody: { marginTop: 6, fontSize: 13, color: colors.text },
  headerActions: { flexDirection: "row", alignItems: "center" },
  headerBtn: { paddingHorizontal: 8, paddingVertical: 4 },
});
