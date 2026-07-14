import { useMemo } from "react";
import { Platform, StyleSheet, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT, type MapPressEvent } from "react-native-maps";

import { OsmMapView } from "@/components/map/OsmMapView";

const DEFAULT_LAT = 25.2048;
const DEFAULT_LNG = 55.2708;

export function LocationPickerMap({
  lat,
  lng,
  onPick,
  height = 240,
}: {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
  height?: number;
}) {
  const hasPoint = lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng);

  const region = useMemo(
    () => ({
      latitude: hasPoint ? lat! : DEFAULT_LAT,
      longitude: hasPoint ? lng! : DEFAULT_LNG,
      latitudeDelta: hasPoint ? 0.08 : 8,
      longitudeDelta: hasPoint ? 0.08 : 8,
    }),
    [hasPoint, lat, lng],
  );

  function handlePress(event: MapPressEvent) {
    onPick(event.nativeEvent.coordinate.latitude, event.nativeEvent.coordinate.longitude);
  }

  if (Platform.OS === "android") {
    return (
      <View style={[styles.wrap, { height }]}>
        <OsmMapView
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          pickMode
          pickPoint={hasPoint ? { latitude: lat!, longitude: lng! } : null}
          onPick={onPick}
          interactionEnabled
        />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        region={region}
        onPress={handlePress}
      >
        {hasPoint ? (
          <Marker
            coordinate={{ latitude: lat!, longitude: lng! }}
            draggable
            onDragEnd={(event) =>
              onPick(event.nativeEvent.coordinate.latitude, event.nativeEvent.coordinate.longitude)
            }
          />
        ) : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    overflow: "hidden",
  },
});
