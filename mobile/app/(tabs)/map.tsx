import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";

import { ScreenLoader } from "@/components/ScreenLoader";
import { colors } from "@/constants/theme";
import { listProjects, type ApiProject } from "@/lib/api/projects-api";
import { useAuth } from "@/lib/auth/AuthContext";
import { stageColor } from "@/lib/utils";

export default function MapScreen() {
  const { token } = useAuth();
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [stageFilter, setStageFilter] = useState<string>("All");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setProjects(await listProjects(token));
  }, [token]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try { await load(); } finally { setLoading(false); }
    })();
  }, [load]);

  const stages = useMemo(() => ["All", ...Array.from(new Set(projects.map((p) => p.stage)))], [projects]);
  const visible = useMemo(
    () => projects.filter((p) => (stageFilter === "All" ? true : p.stage === stageFilter) && p.lat && p.lng),
    [projects, stageFilter]
  );

  const region = useMemo(() => {
    if (visible.length === 0) {
      return { latitude: 25.2048, longitude: 55.2708, latitudeDelta: 8, longitudeDelta: 8 };
    }
    const lat = visible.reduce((sum, p) => sum + p.lat, 0) / visible.length;
    const lng = visible.reduce((sum, p) => sum + p.lng, 0) / visible.length;
    return { latitude: lat, longitude: lng, latitudeDelta: 4, longitudeDelta: 4 };
  }, [visible]);

  if (loading) return <ScreenLoader label="Loading map..." />;

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        {stages.slice(0, 6).map((stage) => (
          <Pressable
            key={stage}
            onPress={() => setStageFilter(stage)}
            style={[styles.chip, stageFilter === stage && styles.chipActive]}
          >
            <Text style={[styles.chipText, stageFilter === stage && styles.chipTextActive]}>{stage}</Text>
          </Pressable>
        ))}
      </View>
      <MapView style={styles.map} provider={PROVIDER_DEFAULT} initialRegion={region}>
        {visible.map((project) => (
          <Marker
            key={project.id}
            coordinate={{ latitude: project.lat, longitude: project.lng }}
            title={project.name}
            description={`${project.stage} · ${project.city}`}
            pinColor={stageColor(project.stage)}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 12 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontSize: 11, color: colors.textMuted },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  map: { flex: 1 },
});
