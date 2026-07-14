import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type ComponentType,
  type RefObject,
} from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import RNWebView from "react-native-webview";
import type { WebViewMessageEvent, WebViewProps } from "react-native-webview";

// react-native-webview types currently break under React 19 (`props: never`).
const WebView = RNWebView as unknown as ComponentType<
  WebViewProps & { ref?: RefObject<{ postMessage: (msg: string) => void } | null> }
>;

export type OsmMapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type OsmMapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  color: string;
  radius: number;
};

export type OsmMapViewRef = {
  animateToRegion: (region: OsmMapRegion, _durationMs?: number) => void;
};

type Props = {
  style?: StyleProp<ViewStyle>;
  initialRegion: OsmMapRegion;
  markers?: OsmMapMarker[];
  /** When false, pan/zoom are locked (same idea as our “Tap to use map” overlay). */
  interactionEnabled?: boolean;
  /** Single pin for the project location picker. */
  pickPoint?: { latitude: number; longitude: number } | null;
  pickMode?: boolean;
  onMarkerPress?: (id: string) => void;
  onPick?: (latitude: number, longitude: number) => void;
};

function regionToZoom(latitudeDelta: number) {
  const safe = Math.max(latitudeDelta, 0.01);
  return Math.max(1, Math.min(18, Math.round(Math.log2(360 / safe))));
}

function buildHtml(options: {
  region: OsmMapRegion;
  markers: OsmMapMarker[];
  interactionEnabled: boolean;
  pickMode: boolean;
  pickPoint: { latitude: number; longitude: number } | null;
}) {
  const payload = JSON.stringify({
    center: [options.region.latitude, options.region.longitude],
    zoom: regionToZoom(options.region.latitudeDelta),
    markers: options.markers,
    interactionEnabled: options.interactionEnabled,
    pickMode: options.pickMode,
    pickPoint: options.pickPoint,
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #e8eef5; }
    .leaflet-control-attribution { font-size: 10px; }
    .crm-pin { border-radius: 999px; border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,.35); }
    .crm-pin-halo { border-radius: 999px; opacity: 0.25; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const boot = ${payload};
    const map = L.map('map', {
      zoomControl: false,
      attributionControl: true,
      dragging: boot.interactionEnabled,
      touchZoom: boot.interactionEnabled,
      scrollWheelZoom: boot.interactionEnabled,
      doubleClickZoom: boot.interactionEnabled,
      boxZoom: false,
      keyboard: false,
    }).setView(boot.center, boot.zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const markerLayer = L.layerGroup().addTo(map);
    let pickMarker = null;

    function post(type, data) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type, ...data }));
      }
    }

    function circleIcon(color, radius) {
      const outer = (radius + 5) * 2;
      const inner = radius * 2;
      return L.divIcon({
        className: '',
        iconSize: [outer, outer],
        iconAnchor: [outer / 2, outer / 2],
        html:
          '<div style="position:relative;width:' + outer + 'px;height:' + outer + 'px;">' +
            '<div class="crm-pin-halo" style="position:absolute;inset:0;background:' + color + ';"></div>' +
            '<div class="crm-pin" style="position:absolute;left:50%;top:50%;width:' + inner + 'px;height:' + inner +
              'px;margin-left:-' + (inner / 2) + 'px;margin-top:-' + (inner / 2) + 'px;background:' + color + ';"></div>' +
          '</div>',
      });
    }

    function setMarkers(items) {
      markerLayer.clearLayers();
      (items || []).forEach(function (item) {
        const m = L.marker([item.latitude, item.longitude], {
          icon: circleIcon(item.color || '#E30613', item.radius || 6),
        });
        m.on('click', function () { post('markerPress', { id: item.id }); });
        m.addTo(markerLayer);
      });
    }

    function setPickPoint(point) {
      if (pickMarker) {
        map.removeLayer(pickMarker);
        pickMarker = null;
      }
      if (!point) return;
      pickMarker = L.marker([point.latitude, point.longitude], { draggable: boot.pickMode });
      if (boot.pickMode) {
        pickMarker.on('dragend', function (event) {
          const ll = event.target.getLatLng();
          post('pick', { latitude: ll.lat, longitude: ll.lng });
        });
      }
      pickMarker.addTo(map);
    }

    function setInteraction(enabled) {
      const on = !!enabled;
      if (on) {
        map.dragging.enable();
        map.touchZoom.enable();
        map.scrollWheelZoom.enable();
        map.doubleClickZoom.enable();
      } else {
        map.dragging.disable();
        map.touchZoom.disable();
        map.scrollWheelZoom.disable();
        map.doubleClickZoom.disable();
      }
    }

    setMarkers(boot.markers);
    setPickPoint(boot.pickPoint);
    setInteraction(boot.interactionEnabled);

    if (boot.pickMode) {
      map.on('click', function (event) {
        post('pick', { latitude: event.latlng.lat, longitude: event.latlng.lng });
      });
    }

    function handleCommand(raw) {
      var msg;
      try { msg = JSON.parse(raw); } catch (e) { return; }
      if (!msg || !msg.type) return;
      if (msg.type === 'setMarkers') setMarkers(msg.markers || []);
      if (msg.type === 'setPickPoint') setPickPoint(msg.point || null);
      if (msg.type === 'setInteraction') setInteraction(msg.enabled);
      if (msg.type === 'animateToRegion' && msg.region) {
        var z = Math.max(1, Math.min(18, Math.round(Math.log2(360 / Math.max(msg.region.latitudeDelta, 0.01)))));
        map.setView([msg.region.latitude, msg.region.longitude], z, { animate: true });
      }
      if (msg.type === 'fitMarkers' && msg.markers && msg.markers.length) {
        var bounds = L.latLngBounds(msg.markers.map(function (m) {
          return [m.latitude, m.longitude];
        }));
        map.fitBounds(bounds.pad(0.2), { animate: true, maxZoom: 12 });
      }
    }

    document.addEventListener('message', function (event) { handleCommand(event.data); });
    window.addEventListener('message', function (event) { handleCommand(event.data); });

    post('ready', {});
  </script>
</body>
</html>`;
}

export const OsmMapView = forwardRef<OsmMapViewRef, Props>(function OsmMapView(
  {
    style,
    initialRegion,
    markers = [],
    interactionEnabled = true,
    pickPoint = null,
    pickMode = false,
    onMarkerPress,
    onPick,
  },
  ref,
) {
  const webRef = useRef<{ postMessage: (msg: string) => void } | null>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef<string[]>([]);

  const html = useMemo(
    () =>
      buildHtml({
        region: initialRegion,
        markers,
        interactionEnabled,
        pickMode,
        pickPoint,
      }),
    // Initial document only — later updates go through postMessage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const send = useCallback((message: Record<string, unknown>) => {
    const payload = JSON.stringify(message);
    if (!readyRef.current) {
      pendingRef.current.push(payload);
      return;
    }
    webRef.current?.postMessage(payload);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      animateToRegion(region) {
        send({ type: "animateToRegion", region });
      },
    }),
    [send],
  );

  useEffect(() => {
    send({ type: "setMarkers", markers });
  }, [markers, send]);

  useEffect(() => {
    send({ type: "setPickPoint", point: pickPoint });
  }, [pickPoint, send]);

  useEffect(() => {
    send({ type: "setInteraction", enabled: interactionEnabled });
  }, [interactionEnabled, send]);

  useEffect(() => {
    send({ type: "animateToRegion", region: initialRegion });
  }, [initialRegion, send]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let msg: { type?: string; id?: string; latitude?: number; longitude?: number };
      try {
        msg = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }
      if (msg.type === "ready") {
        readyRef.current = true;
        const queued = pendingRef.current;
        pendingRef.current = [];
        for (const item of queued) webRef.current?.postMessage(item);
        return;
      }
      if (msg.type === "markerPress" && msg.id) onMarkerPress?.(msg.id);
      if (
        msg.type === "pick" &&
        typeof msg.latitude === "number" &&
        typeof msg.longitude === "number"
      ) {
        onPick?.(msg.latitude, msg.longitude);
      }
    },
    [onMarkerPress, onPick],
  );

  return (
    <View style={[styles.wrap, style]}>
      <WebView
        ref={webRef}
        style={styles.web}
        originWhitelist={["*"]}
        source={{ html }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        setSupportMultipleWindows={false}
        androidLayerType="hardware"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { overflow: "hidden" },
  web: { flex: 1, backgroundColor: "#e8eef5" },
});
