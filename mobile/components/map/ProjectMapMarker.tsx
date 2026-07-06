import { StyleSheet, View } from "react-native";
import { Marker } from "react-native-maps";

import { markerColor, markerRadius } from "@/lib/map/stages";
import type { ApiProject } from "@/lib/api/projects-api";

export function ProjectMapMarker({
  project,
  onPress,
}: {
  project: ApiProject;
  onPress: () => void;
}) {
  const color = markerColor(project.stage);
  const radius = markerRadius(project.valueAed);
  const outerSize = (radius + 5) * 2;
  const innerSize = radius * 2;

  return (
    <Marker
      coordinate={{ latitude: project.lat, longitude: project.lng }}
      onPress={onPress}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
    >
      <View style={styles.wrap}>
        <View
          style={[
            styles.outer,
            {
              width: outerSize,
              height: outerSize,
              borderRadius: outerSize / 2,
              backgroundColor: color,
            },
          ]}
        />
        <View
          style={[
            styles.inner,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  outer: {
    opacity: 0.22,
  },
  inner: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    opacity: 0.92,
  },
});
